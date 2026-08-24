---
name: rabbitmq-patterns-guide
description: Patterns RabbitMQ — exchanges (direct, topic, fanout, headers), routing keys, dead letter, TTL, quorum queues, acks et intégration MassTransit/.NET. Spécifique à RabbitMQ. Se déclenche avec "RabbitMQ", "exchange", "routing key", "dead letter", "MassTransit", "AMQP", "quorum queue", "prefetch". Also triggers on "RabbitMQ exchange", "dead letter queue", "AMQP routing".
---

# Guide des Patterns RabbitMQ

## Workflow en 4 étapes

1. **Identifier le pattern** : point-à-point (work queue), pub/sub (fanout), routing ciblé (direct/topic), RPC ou Saga.
2. **Concevoir la topologie** : choisir le type d'exchange, nommer les queues et les routing keys, prévoir les DLX dès le départ.
3. **Implémenter** : producteur avec confirm mode, consumer avec ACK manuel et idempotence.
4. **Fiabiliser** : configurer retry + dead letter, activer la persistence, mettre en place le monitoring.

---

## Critères de choix d'exchange

| Exchange | Routing | Choisir quand… |
|----------|---------|----------------|
| **Direct** | Routing key exacte | File de commandes ciblées, work queues |
| **Fanout** | Broadcast toutes queues | Notification multi-services, cache invalidation |
| **Topic** | Pattern `*.order.#` | Routing par catégorie/domaine flexible |
| **Headers** | Attributs headers | Critères multiples sans modifier la routing key |

Règle : si tu te retrouves à créer plusieurs Direct exchanges pour le même producteur, passe en Topic.

---

## Patterns fondamentaux

### 1. Work Queue (répartition de charge)

```
Producer → [exchange direct] → [queue:jobs] → Consumer 1
                                             → Consumer 2
```

```bash
# CLI — déclarer la queue durable
rabbitmqadmin declare queue name=jobs durable=true arguments='{"x-dead-letter-exchange":"dlx.jobs"}'
```

```csharp
// Producteur : confirm mode obligatoire pour ne pas perdre de messages
var factory = new ConnectionFactory { HostName = "localhost" };
using var connection = await factory.CreateConnectionAsync();
using var channel = await connection.CreateChannelAsync();

await channel.QueueDeclareAsync("jobs", durable: true, exclusive: false, autoDelete: false);
await channel.ConfirmSelectAsync();

var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));
var props = new BasicProperties { Persistent = true };
await channel.BasicPublishAsync("", "jobs", props, body);
await channel.WaitForConfirmsOrDieAsync(); // lève une exception si NACK
```

- `prefetchCount = 1` : chaque consumer reçoit un message à la fois → répartition équitable.
- ACK manuel après traitement réussi ; NACK + requeue=false si l'erreur est définitive.

### 2. Pub/Sub (fanout, diffusion d'événements)

```
Producer → [exchange:events.fanout] → [queue:svc-A] → Consumer A
                                    → [queue:svc-B] → Consumer B
```

Chaque service crée sa propre queue et la bind à l'exchange. L'exchange copie le message vers toutes les queues liées.

### 3. Topic Routing

```
Producer → [exchange:domain.topic]
    routing key "order.created.fr"  → queue:orders-fr
    routing key "payment.failed.*"  → queue:alerts
    routing key "#.audit"           → queue:audit-all
```

- `*` = exactement un mot.
- `#` = zéro ou plusieurs mots.

### 4. RPC (requête / réponse synchrone via RabbitMQ)

À éviter si possible (couplage temporel). Préférer un pattern saga asynchrone.
Si nécessaire : le producteur envoie dans une queue avec `reply_to` = queue de réponse temporaire et `correlation_id` = UUID. Le consumer publie la réponse dans `reply_to`.

---

## Intégration MassTransit (.NET)

### Configuration complète

```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<OrderCreatedConsumer>();
    x.AddConsumer<PaymentFailedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq://localhost", h =>
        {
            h.Username("guest");
            h.Password("guest");
            // Heartbeat pour détecter les connexions mortes
            h.RequestedHeartbeat = TimeSpan.FromSeconds(30);
        });

        cfg.ReceiveEndpoint("order-service", e =>
        {
            e.PrefetchCount = 16;

            // Retry immédiat (erreurs réseau, DB transitoire)
            e.UseMessageRetry(r => r.Intervals(
                TimeSpan.FromSeconds(1),
                TimeSpan.FromSeconds(5),
                TimeSpan.FromSeconds(30)));

            // Relivraison différée (dépendance externe lente)
            e.UseDelayedRedelivery(r => r.Intervals(
                TimeSpan.FromMinutes(1),
                TimeSpan.FromMinutes(5),
                TimeSpan.FromMinutes(30)));

            e.ConfigureConsumer<OrderCreatedConsumer>(context);
        });

        cfg.ConfigureEndpoints(context);
    });
});
```

### Consumer idempotent

```csharp
public class OrderCreatedConsumer : IConsumer<OrderCreated>
{
    private readonly IOrderRepository _repo;

    public OrderCreatedConsumer(IOrderRepository repo) => _repo = repo;

    public async Task Consume(ConsumeContext<OrderCreated> context)
    {
        // Idempotence : court-circuit si déjà traité
        if (await _repo.ExistsAsync(context.Message.OrderId))
            return;

        await _repo.ProcessOrderAsync(context.Message);

        // Publier l'événement suivant dans la même transaction logique
        await context.Publish(new OrderProcessed
        {
            OrderId = context.Message.OrderId,
            ProcessedAt = DateTime.UtcNow
        });
    }
}
```

### Contrats de messages

```csharp
// Événement : passé accompli, immutable, versioable
public record OrderCreated
{
    public Guid OrderId { get; init; }
    public string CustomerId { get; init; } = default!;
    public decimal Amount { get; init; }
    public DateTime CreatedAt { get; init; }
    public int SchemaVersion { get; init; } = 1; // versionning explicite
}

// Commande : impératif, un seul consommateur cible
public record ProcessPayment
{
    public Guid PaymentId { get; init; }
    public Guid OrderId { get; init; }
    public decimal Amount { get; init; }
}
```

---

## Dead Letter & Retry

### Flux de retry recommandé

```
Message → Queue principale → Consumer
              ↓ NACK (erreur transitoire)
         Retry immédiat x3 (1s / 5s / 30s)
              ↓ encore en échec
         Delayed redelivery x3 (1min / 5min / 30min)
              ↓ encore en échec
         Dead Letter Queue (DLQ) → alerte Slack/PagerDuty
```

### Déclarer la DLX manuellement

```bash
# Exchange DLX + queue DLQ
rabbitmqadmin declare exchange name=dlx.orders type=direct durable=true
rabbitmqadmin declare queue name=dlq.orders durable=true
rabbitmqadmin declare binding source=dlx.orders destination=dlq.orders routing_key=orders

# Queue principale avec DLX attaché
rabbitmqadmin declare queue name=orders durable=true \
  arguments='{"x-dead-letter-exchange":"dlx.orders","x-message-ttl":86400000}'
```

---

## Monitoring & opérations

| Métrique | Seuil d'alerte | Action corrective |
|----------|---------------|-------------------|
| Queue depth | > 10 000 | Ajouter des consumers / investiguer lenteur |
| Consumer lag | > 5 min | Profiler le consumer, check DB |
| DLQ count | > 0 | Analyser le message en erreur, rejouer si corrigé |
| Connection drops | > 1/h | Vérifier heartbeat, pare-feu, timeouts load balancer |
| Memory usage broker | > 80 % | Activer flow control, purger ou scaler |
| Unacked messages | Stables > 5 min | Consumer bloqué ou crash → redémarrer |

```bash
# Rejouer les messages de la DLQ vers la queue principale (shovel one-shot)
rabbitmqctl set_parameter shovel replay \
  '{"src-protocol":"amqp091","src-uri":"amqp://","src-queue":"dlq.orders",
    "dest-protocol":"amqp091","dest-uri":"amqp://","dest-queue":"orders",
    "src-delete-after":"queue-length"}'
```

---

## Anti-patterns et pièges

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| ACK avant traitement | Perte de messages en cas de crash | ACK uniquement après persistance réussie |
| Queue non durable | Messages perdus au redémarrage broker | `durable=true` + messages persistent |
| Pas de DLX | Messages disparus silencieusement | Toujours lier une DLX à chaque queue |
| Consumer non idempotent | Traitements en double après retry | Clé d'idempotence en base ou cache distribué |
| Trop de prefetchCount | Consumer submergé, mémoire OOM | Commencer à 1, augmenter prudemment |
| Exchange fanout pour commandes | Plusieurs services traitent la même commande | Fanout = événements uniquement ; commande → direct |
| Stocker l'état dans le message | Messages géants, versioning cauchemar | Ne passer que des IDs, requêter la source |
| RPC via RabbitMQ à grande échelle | Couplage temporel, timeouts en cascade | Remplacer par saga / choreography asynchrone |
| Pas de heartbeat configuré | Connexions zombies non détectées | `RequestedHeartbeat = 30s` côté client |
| Connexion partagée entre threads | Race conditions, channel errors | Une connexion par process, un channel par thread |

---

## Bonnes pratiques 2026

- **Quorum queues** en production : remplacent les mirrored queues (dépréciées) pour la haute disponibilité.
  ```bash
  rabbitmqadmin declare queue name=orders durable=true \
    arguments='{"x-queue-type":"quorum","x-dead-letter-exchange":"dlx.orders"}'
  ```
- **Lazy queues** (`x-queue-mode: lazy`) pour les queues volumineuses à faible débit — stocke sur disque, préserve la RAM.
- **Vhost par domaine** : isoler orders, payments, notifications dans des vhosts séparés.
- **Connection pooling** côté client : une connexion TCP, plusieurs channels (légers).
- **Schema Registry** ou versionning explicite des contrats (`SchemaVersion`) pour éviter les désynchronisations inter-services.
- **Outbox pattern** côté producteur : persister l'événement dans la même transaction DB, puis le publier de manière asynchrone — garantit l'exactly-once emission sans XA.
- **Consumer scaling horizontal** : stateless + idempotent = ajout de replicas sans interruption.
