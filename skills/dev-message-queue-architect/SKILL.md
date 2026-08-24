---
name: dev-message-queue-architect
description: Choix et dimensionnement d'un système de messaging — comparaison Kafka / Azure Service Bus / SQS / NATS, topologie, partitionnement, garanties de livraison, backpressure et reprise. Porte sur la sélection du broker ; RabbitMQ en détail a son propre skill. Se déclenche avec "message queue", "quel broker", "Kafka", "Azure Service Bus", "SQS", "NATS", "garantie de livraison", "partitionnement". Also triggers on "choose a message broker", "Kafka vs Service Bus", "delivery guarantees".
---

# Message Queue Architect

## Workflow

### 1. Qualifier le besoin

Avant de choisir un broker, répondre à ces questions :

| Question | Impact |
|---|---|
| Un seul consumer ou plusieurs ? | Point-to-point vs Pub/Sub |
| Rejouer les messages après coup ? | Kafka / event log ; RabbitMQ non |
| Volume cible (msg/s) ? | < 10k → RabbitMQ/ASB ; > 100k → Kafka |
| Latence acceptable ? | < 5 ms → NATS/Kafka ; > 100 ms → ASB OK |
| Cloud imposé ? | Azure → ASB ; AWS → SQS/SNS/MSK ; GCP → Pub/Sub |
| Ordre garanti requis ? | Kafka (par partition) ; ASB sessions ; RabbitMQ non natif |
| Durabilité longue (audit, analytics) ? | Kafka (retention configurable) |

### 2. Choisir le broker

```
RabbitMQ   → routing complexe, RPC async, on-prem, cas général < 50k msg/s
Kafka      → event streaming, replay, analytics, > 50k msg/s, multi-consumer
Azure ASB  → cloud Azure, sessions, dead letter auto, filtres SQL sur topics
NATS       → latence < 1 ms, IoT, microservices légers
SQS/SNS    → cloud AWS, simplicité opérationnelle, FIFO optionnel
```

### 3. Concevoir les topics/exchanges et queues

**Naming convention** (préfixer par domaine.action.version) :
```
orders.created.v1
payments.processed.v2
notifications.email.requested.v1
```

**RabbitMQ** — exchange topic + binding :
```bash
# Déclarer l'exchange et la queue, créer le binding
rabbitmqadmin declare exchange name=orders type=topic durable=true
rabbitmqadmin declare queue name=orders.processing durable=true
rabbitmqadmin declare binding source=orders \
  destination=orders.processing routing_key="orders.created.*"
```

**Kafka** — créer un topic avec partitions :
```bash
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic orders.created.v1 \
  --partitions 12 --replication-factor 3 \
  --config retention.ms=604800000   # 7 jours
```
Règle partitions : `nb_partitions >= nb_consumers_max` ; clé de partition = identifiant métier (orderId) pour garantir l'ordre par entité.

### 4. Définir l'enveloppe de message

```json
{
  "messageId": "uuid-v4",
  "correlationId": "uuid-parent",
  "timestamp": "2026-06-24T10:00:00Z",
  "type": "OrderCreated",
  "version": "1",
  "source": "order-service",
  "payload": { ... }
}
```

- **Command** : intention d'action, un seul handler, verbe impératif (`CreateOrder`)
- **Event** : fait passé, N handlers, passé composé (`OrderCreated`)
- **Document** : transfert de données brutes, pas de sémantique métier

### 5. Choisir la garantie de livraison

| Niveau | Mécanisme | Quand |
|---|---|---|
| At-most-once | fire & forget, no ack | métriques, logs non critiques |
| At-least-once | ack après traitement, idempotence consumer | cas général (défaut recommandé) |
| Exactly-once | Outbox Pattern + transaction DB | paiements, comptabilité |

**Outbox Pattern (C# / EF Core)** :
```csharp
// Dans la même transaction DB que la mutation métier
await _db.OutboxMessages.AddAsync(new OutboxMessage {
    Id = Guid.NewGuid(),
    Type = "OrderCreated",
    Payload = JsonSerializer.Serialize(orderCreatedEvent),
    CreatedAt = DateTime.UtcNow
});
await _db.SaveChangesAsync(); // atomique avec la commande métier

// Worker séparé publie l'Outbox et marque ProcessedAt
```

**Idempotence consumer (exemple)** :
```csharp
if (await _cache.ExistsAsync($"msg:{message.MessageId}")) return; // déjà traité
await ProcessAsync(message);
await _cache.SetAsync($"msg:{message.MessageId}", 1, TimeSpan.FromHours(24));
```

### 6. Configurer les erreurs et la DLQ

**RabbitMQ** — dead letter exchange :
```bash
rabbitmqadmin declare queue name=orders.processing \
  arguments='{"x-dead-letter-exchange":"orders.dlx","x-message-ttl":30000,"x-max-retries":3}'
```

**Stratégie de retry** : backoff exponentiel avec jitter
```
Tentative 1 : 1 s
Tentative 2 : 5 s
Tentative 3 : 30 s
Tentative 4 : 5 min → DLQ
```

**Azure Service Bus** — activer dead lettering :
```csharp
var options = new ServiceBusProcessorOptions {
    MaxConcurrentCalls = 4,
    AutoCompleteMessages = false,
    MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(5)
};
// Après N échecs, ASB déplace automatiquement en DLQ ($DeadLetterQueue)
```

### 7. Sérialisation

```
JSON     → lisibilité, débogage facile, interop universel ; payload +30-40 % vs binaire
Protobuf → typage fort, compact, idéal si volume > 10k msg/s ou bandwidth limité
Avro     → Kafka + Confluent Schema Registry, compatibilité schéma garantie
```

Toujours inclure `"version"` dans l'enveloppe ; ne jamais renommer un champ obligatoire (breaking change).

### 8. Monitoring et alertes

Métriques prioritaires :

| Métrique | Seuil d'alerte | Outil |
|---|---|---|
| Consumer lag (Kafka) | > 10 000 msgs pendant 5 min | kafka-consumer-groups / Grafana |
| Profondeur de queue | > 80 % capacité configurée | RabbitMQ Management API |
| DLQ depth | > 0 (toute erreur) | Prometheus alert |
| Throughput drop | -50 % vs baseline | Datadog / Grafana |
| Message age max | > SLA défini | Cloudwatch / Azure Monitor |

```bash
# Vérifier le lag Kafka
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group orders-consumer-group
```

---

## Anti-patterns et pièges

- **Pas d'idempotence** : en at-least-once, un message peut être livré 2× (redelivery après crash). Le consumer DOIT dédupliquer.
- **ACK avant traitement** : si le process plante après ACK, le message est perdu sans DLQ. Toujours ACK après succès du traitement.
- **Topics fourre-tout** : un topic `events` pour tout = impossible à scaler, à monitorer, à versionner indépendamment.
- **Message trop gros** : payload > 1 MB → stocker le payload en S3/Blob, mettre l'URL dans le message (Claim Check Pattern).
- **Consumer synchrone bloquant** : appel HTTP dans le handler de message = couplage fort et latence imprévisible. Préférer async/await + timeout strict.
- **Pas de schema registry** : changer un champ sans registry = casse silencieuse des consumers. Obligatoire dès que plusieurs équipes partagent un topic.
- **Retention Kafka trop courte** : 24 h par défaut. Pour le replay en incident, prévoir au moins 7 jours.
- **Fan-out non maîtrisé** : un event → 50 consumers sans rate limiting = surcharge en cascade. Limiter les consumers par topic ou utiliser un bus d'événements intermédiaire.

## Bonnes pratiques 2026

- Préférer le **schema-first** : définir le contrat Protobuf/Avro avant le code producer et consumer.
- Utiliser **CloudEvents** (CNCF) comme enveloppe standard pour l'interopérabilité multi-broker.
- **Kafka Streams / ksqlDB** pour les transformations en temps réel sans orchestrateur externe.
- **Azure Service Bus Premium** pour les sessions et la géo-redondance active-active (SLA 99,9 %).
- **Wasm-based consumers** (Kafka + Wasm plugins) pour le filtrage en-broker sans code serveur dédié.
- Tester les consumers avec **Testcontainers** (RabbitMQ/Kafka embarqué en CI) : zéro mock, vrai broker.
- Documenter chaque topic dans un **catalogue d'événements** (AsyncAPI spec) : déclenche la génération de code client.


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
