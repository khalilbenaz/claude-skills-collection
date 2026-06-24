---
name: kafka-patterns
description: Patterns Apache Kafka — topics, partitions, consumer groups, exactly-once semantics et Kafka Streams. Se déclenche avec "Kafka", "Apache Kafka", "topic Kafka", "consumer group", "Kafka Streams", "event streaming".
---

# Kafka Patterns

## Workflow

### 1. Concevoir la topologie des topics

- Nommer les topics par domaine + type d'événement : `orders.created`, `payments.processed`, `inventory.updated`
- **Calcul des partitions** : `partitions = débit_cible_MB/s ÷ débit_par_partition_MB/s` (typiquement 10–20 MB/s par partition)
- Règle pratique : commencer avec `max(producteurs_parallèles, consommateurs_parallèles)` partitions
- Rétention selon le cas : time-based (`retention.ms=604800000` = 7j), size-based (`retention.bytes`), ou compaction pour les changelogs (KTable)

```bash
# Créer un topic avec 12 partitions, réplication 3, rétention 7 jours
kafka-topics.sh --bootstrap-server broker:9092 \
  --create --topic orders.created \
  --partitions 12 --replication-factor 3 \
  --config retention.ms=604800000

# Lister / décrire
kafka-topics.sh --bootstrap-server broker:9092 --describe --topic orders.created
```

### 2. Définir le schéma des messages

- Avro (compact, Schema Registry natif) > Protobuf > JSON Schema selon l'éco-système
- Enregistrer dans Confluent Schema Registry avec compatibilité `BACKWARD` par défaut
- Inclure les champs obligatoires : `event_id` (UUID), `event_type`, `occurred_at` (ISO-8601), `source`, `correlation_id`

```json
// Avro schema — orders.created
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "event_id", "type": "string"},
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "amount_cents", "type": "long"},
    {"name": "occurred_at", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
```

### 3. Configurer les producers

Choisir les garanties selon le besoin :

| Cas | `acks` | `enable.idempotence` | `transactional.id` |
|-----|--------|----------------------|--------------------|
| Fire-and-forget (logs) | `0` | false | — |
| At-least-once (défaut) | `all` | false | — |
| Exactly-once | `all` | true | `txn-{service}-{instance}` |

```java
// Producer Java — exactly-once
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker:9092");
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "txn-orders-1");
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");
props.put(ProducerConfig.LINGER_MS_CONFIG, 5);        // batching
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);   // 64 KB

KafkaProducer<String, OrderCreated> producer = new KafkaProducer<>(props);
producer.initTransactions();

producer.beginTransaction();
producer.send(new ProducerRecord<>("orders.created", order.getId(), event));
producer.commitTransaction();
```

### 4. Concevoir les consumer groups

- Un consumer group par cas d'usage logique (pas par microservice)
- Commit offset **après** traitement réussi, jamais avant
- `max.poll.records` : réduire si le traitement par batch est lent (défaut 500)
- `session.timeout.ms` > temps max de traitement d'un batch

```java
// Consumer Java — commit manuel
props.put(ConsumerConfig.GROUP_ID_CONFIG, "orders-billing-service");
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

while (true) {
    ConsumerRecords<String, OrderCreated> records = consumer.poll(Duration.ofMillis(500));
    for (ConsumerRecord<String, OrderCreated> record : records) {
        process(record.value());
    }
    consumer.commitSync(); // après traitement complet
}
```

### 5. Patterns de traitement distribué

**Dead Letter Topic (DLT)** — isoler les messages non traitables :
```
topic-principal → traitement → erreur → topic-principal.DLT
```

**Saga choreography** — chaque service publie des events, les autres réagissent :
```
orders.created → payment-service → payments.processed → inventory-service → inventory.reserved
                                 ↘ payments.failed   → orders.cancelled
```

**CDC avec Debezium** — capturer les changements base de données :
```json
// connector config (Postgres)
{
  "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
  "database.hostname": "postgres",
  "database.dbname": "mydb",
  "table.include.list": "public.orders",
  "topic.prefix": "cdc"
}
```

**Claim Check** — payload > 1 MB : stocker dans S3/Blob, publier seulement la référence :
```json
{"event_id": "...", "payload_ref": "s3://bucket/events/abc123.json"}
```

### 6. Kafka Streams — traitements stateful

```java
StreamsBuilder builder = new StreamsBuilder();

// Comptage par client sur fenêtre de 1h (hopping)
KStream<String, OrderCreated> orders = builder.stream("orders.created");
orders
  .groupByKey()
  .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofHours(1)))
  .count(Materialized.as("orders-per-customer"))
  .toStream()
  .to("orders.count-per-customer-1h");

// Stream-Table join
KTable<String, CustomerProfile> profiles = builder.table("customers.profiles");
orders.join(profiles,
    (order, profile) -> enrich(order, profile),
    Joined.with(Serdes.String(), orderSerde, profileSerde))
  .to("orders.enriched");
```

### 7. Exactly-once semantics (EOS)

Configuration minimale pour EOS dans Kafka Streams :

```java
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
props.put(StreamsConfig.REPLICATION_FACTOR_CONFIG, 3);
props.put(StreamsConfig.NUM_STANDBY_REPLICAS_CONFIG, 1);
```

Pour les consumers en boucle read-process-write :
- `isolation.level=read_committed` côté consumer
- Transactions produceur-consumer atomiques avec `sendOffsetsToTransaction()`

### 8. Monitoring & alertes

Métriques critiques à surveiller :

| Métrique | Outil | Seuil d'alerte |
|----------|-------|----------------|
| `kafka.consumer.lag` | JMX / Prometheus | > 10 000 msgs |
| `under-replicated-partitions` | Kafka MBean | > 0 |
| `records-error-rate` | Kafka MBean | > 0 |
| Latence end-to-end | OpenTelemetry | > SLA défini |

```bash
# Consumer lag via CLI
kafka-consumer-groups.sh --bootstrap-server broker:9092 \
  --describe --group orders-billing-service

# Reset offset en cas d'incident (dry-run)
kafka-consumer-groups.sh --bootstrap-server broker:9092 \
  --group orders-billing-service --topic orders.created \
  --reset-offsets --to-earliest --dry-run
```

## Critères de décision

| Besoin | Choix |
|--------|-------|
| Traitement stateless simple | Consumer KafkaConsumer |
| Aggregation / join / windowing | Kafka Streams ou ksqlDB |
| SQL déclaratif sur streams | ksqlDB |
| CDC depuis base relationnelle | Debezium + Kafka Connect |
| Garantie exactement-une-fois | EOS (`EXACTLY_ONCE_V2`) |
| Payload volumineux (> 1 MB) | Claim Check pattern |

## Garde-fous / Anti-patterns / Pièges

- **Ne pas réduire les partitions** : impossible sans recréer le topic ; sur-provisionner légèrement au départ.
- **Auto-commit activé + traitement lent** : risque de perte de messages si le consumer crash après commit mais avant traitement. Toujours `enable.auto.commit=false`.
- **Un seul topic pour tout** : casse l'isolation, le scaling et la rétention différenciée. Un topic par type d'événement.
- **Consumer group partagé entre envs** (dev/prod sur le même cluster) : les offsets se mélangent. Utiliser des clusters ou des `group.id` stricts par environnement.
- **Pas de DLT** : un message poison bloque tout le consumer group indéfiniment. Toujours prévoir `topic.DLT`.
- **Rebalancing fréquent** : souvent dû à `max.poll.interval.ms` trop court ou traitement trop lent. Augmenter `max.poll.interval.ms` ou réduire `max.poll.records`.
- **Schema sans compatibilité** : un changement de schéma casse les consumers existants. Toujours tester avec `kafka-schema-registry-test-compatibility`.
- **`acks=1` sur topics critiques** : perte de données si le leader crashe avant réplication. Utiliser `acks=all` + `min.insync.replicas=2`.
