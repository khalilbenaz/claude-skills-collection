---
name: event-driven-architect
description: Conception d'architectures événementielles avec messaging et event sourcing. Se déclenche avec "event driven", "événementiel", "RabbitMQ", "Kafka", "event sourcing", "CQRS", "message broker", "pub/sub", "async messaging". Also triggers on "event-driven architecture", "pub/sub design".
---

# Event-Driven Architect

## Workflow

### 1. Identifier les événements métier

Modéliser les faits immuables nommés **au passé** (verbe passé + sujet) :

```
OrderPlaced / PaymentProcessed / UserRegistered / ShipmentDispatched
```

Distinguer deux types :
- **Domain event** : interne à un bounded context (même déploiement possible).
- **Integration event** : traverse les frontières de service → passe obligatoirement par un broker.

Pratiquer l'**Event Storming** pour découvrir les événements avec les parties métier avant d'écrire la moindre ligne de code.

---

### 2. Choisir le broker

| Critère | RabbitMQ | Kafka | Azure Service Bus | Redis Streams |
|---|---|---|---|---|
| Débit | Moyen (50 k msg/s) | Très élevé (M msg/s) | Moyen | Faible-moyen |
| Rétention | Non (ack = supprimé) | Oui (configurable) | 14 jours max | Configurable |
| Ordering strict | Par queue | Par partition | Par session | Par stream |
| Rejeu | Non natif | Oui | Non natif | Oui |
| Complexité opé. | Faible | Élevée | Faible (SaaS) | Très faible |

**Règle de sélection :**
- Audit trail / event sourcing / gros débit → **Kafka**
- Workflow, saga, routing complexe → **RabbitMQ**
- Équipe Azure sans infra dédiée → **Azure Service Bus**
- Cache + messaging léger → **Redis Streams**

---

### 3. Topologie topics / queues

**RabbitMQ — exchange fanout + routing :**
```
Exchange: order.events (type: topic)
  → order.placed        → queue: billing.order-placed
  → order.placed        → queue: inventory.order-placed
  → order.cancelled     → queue: billing.order-cancelled
```

**Kafka — topics + partitions :**
```
Topic: order-events          (partitions: 12, replication: 3)
Topic: payment-events        (partitions: 6,  replication: 3)
Consumer group: billing-svc  → offset par partition géré par Kafka
```

Règle : **1 consumer group = 1 responsabilité**. Ne pas partager un group entre services différents.

---

### 4. Implémenter le pattern

#### Pub/Sub (découplage simple)

```csharp
// Producteur (.NET + MassTransit + RabbitMQ)
await _publishEndpoint.Publish(new OrderPlaced
{
    OrderId   = order.Id,
    CustomerId = order.CustomerId,
    OccurredAt = DateTimeOffset.UtcNow
});

// Consommateur
public class OrderPlacedConsumer : IConsumer<OrderPlaced>
{
    public async Task Consume(ConsumeContext<OrderPlaced> context)
    {
        // logique idempotente ici
    }
}
```

#### Outbox Pattern (cohérence sans saga)

```sql
-- Table outbox dans la même base que l'entité
CREATE TABLE outbox_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(200) NOT NULL,
    payload     JSONB        NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);
```

```csharp
// Dans la même transaction que la mutation métier
await db.OutboxMessages.AddAsync(new OutboxMessage
{
    Type    = nameof(OrderPlaced),
    Payload = JsonSerializer.Serialize(evt)
});
await db.SaveChangesAsync(); // atomique avec l'entité

// Worker séparé publie les messages non traités toutes les N secondes
```

#### Saga (orchestration de compensation)

```csharp
// MassTransit StateMachine
public class OrderSaga : MassTransitStateMachine<OrderSagaState>
{
    public State PaymentPending { get; private set; }
    public State Completed      { get; private set; }
    public State Compensating   { get; private set; }

    public OrderSaga()
    {
        Initially(
            When(OrderPlaced)
                .TransitionTo(PaymentPending)
                .Publish(ctx => new RequestPayment { OrderId = ctx.Saga.CorrelationId }));

        During(PaymentPending,
            When(PaymentFailed)
                .TransitionTo(Compensating)
                .Publish(ctx => new CancelOrder { OrderId = ctx.Saga.CorrelationId }));
    }
}
```

#### CQRS + Event Sourcing (audit total)

```csharp
// Aggregate reconstruit depuis les events
public class Order
{
    private readonly List<IDomainEvent> _events = new();

    public static Order Reconstitute(IEnumerable<IDomainEvent> history)
    {
        var order = new Order();
        foreach (var e in history) order.Apply(e);
        return order;
    }

    private void Apply(OrderPlaced e) { /* muter l'état */ }
}
```

---

### 5. Idempotence et ordering

**Idempotence :**
```csharp
// Vérifier si l'événement a déjà été traité (stocké dans DB ou cache Redis)
if (await _processedEvents.ExistsAsync(context.Message.EventId))
    return; // skip silencieux

await ProcessAsync(context.Message);
await _processedEvents.MarkAsync(context.Message.EventId, ttl: TimeSpan.FromDays(7));
```

**Ordering strict :** utiliser une clé de partition cohérente (`CustomerId`, `OrderId`) pour que les messages d'une même entité atterrissent dans la même partition Kafka ou la même queue RabbitMQ.

---

### 6. Error handling

```
Tentative 1 → échec → retry après 5 s
Tentative 2 → échec → retry après 30 s
Tentative 3 → échec → Dead Letter Queue (DLQ)
```

```csharp
// MassTransit retry + DLQ
cfg.ReceiveEndpoint("order-placed", ep =>
{
    ep.UseMessageRetry(r => r.Exponential(3, TimeSpan.FromSeconds(5),
                                             TimeSpan.FromSeconds(60),
                                             TimeSpan.FromSeconds(5)));
    ep.UseDeadLetterQueue("order-placed-dlq");
    ep.ConfigureConsumer<OrderPlacedConsumer>(context);
});
```

Alerter sur toute montée du DLQ (metric : `dlq_message_count > 0`).

---

### 7. Monitoring et observabilité

Métriques essentielles :
- **Consumer lag** (Kafka) : `kafka_consumer_lag_sum` — alerter si > seuil sur 5 min.
- **Queue depth** (RabbitMQ/ASB) : messages accumulés = consumer lent ou mort.
- **DLQ count** : tout message en DLQ = bug ou données invalides.
- **End-to-end latency** : temps entre publication et traitement (tracer via `CorrelationId`).

```csharp
// Injecter le CorrelationId dans le header de chaque message
Activity.Current?.SetTag("messaging.message_id", message.EventId.ToString());
Activity.Current?.SetTag("messaging.destination",  topicName);
```

---

### 8. Schema evolution

Stratégie recommandée : **backward + forward compatible** via **Confluent Schema Registry** (Avro) ou **JSON Schema** versioned.

Règles :
- **Ajouter** un champ optionnel → OK (backward compatible).
- **Supprimer** un champ → KO sans migration consommateurs.
- **Renommer** → créer un nouveau champ, déprécier l'ancien, supprimer après migration.

```json
// v1
{ "orderId": "...", "amount": 100 }

// v2 — ajout optionnel, rétrocompatible
{ "orderId": "...", "amount": 100, "currency": "TND" }
```

---

## Garde-fous / Anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| **Event as command** nommé `ProcessOrder` | Couplage fort, orchestration cachée | Renommer en `OrderPlaced` — le fait, pas l'ordre |
| **Payload trop gros** (embed entité complète) | Overhead réseau, couplage schéma | Stocker l'ID + champs essentiels ; consumer fetch si besoin |
| **Saga trop large** (10+ étapes) | Impossible à déboguer | Découper en sous-sagas ou passer à chorégraphie |
| **Pas d'idempotence** | Messages dupliqués → double facturation | EventId unique + table `processed_events` |
| **Topic générique** (`events`) | Impossible à scaler/monitorer | 1 topic par aggregate type ou domaine |
| **Consumer partage l'ORM** | Couplage DB inter-services | Consumer expose sa propre projection (read model) |
| **Ignorer le DLQ** | Perte de données silencieuse | Alertes + runbook de replay obligatoires |

---

## Critères pour adopter ou non l'EDA

**Adopter si :**
- Services distincts qui doivent réagir au même fait métier.
- Besoin d'audit trail complet / event sourcing.
- Pic de charge absorbable par queue (découplage producteur/consommateur).
- Intégration avec systèmes tiers asynchrones.

**Ne pas adopter si :**
- CRUD simple sans logique distribuée.
- Équipe < 5 devs sans expertise ops messaging.
- Latence < 10 ms requise (préférer appel REST synchrone).
- Pas de budget pour infrastructure broker + monitoring.
