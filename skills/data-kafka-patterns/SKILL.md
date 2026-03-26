---
name: data-kafka-patterns
description: Patterns Apache Kafka — topics, partitions, consumer groups, exactly-once semantics et Kafka Streams. Se déclenche avec "Kafka", "Apache Kafka", "topic Kafka", "consumer group", "Kafka Streams", "event streaming".
---

# Kafka Patterns

## Workflow

1. **Concevoir la topologie des topics** — Définir les topics en fonction des domaines métier (events, commands, changelog), choisir le nombre de partitions en fonction du débit cible et du parallélisme des consumers, et configurer la rétention (time-based, size-based, compaction).

2. **Définir le schéma des messages** — Concevoir les événements avec un format structuré (Avro, Protobuf ou JSON Schema), enregistrer les schémas dans un Schema Registry, définir les règles de compatibilité (backward, forward, full), et inclure les métadonnées standard (event_id, timestamp, source, correlation_id).

3. **Implémenter les producers** — Configurer les producers avec les garanties de livraison adaptées (`acks=all` pour la durabilité, `idempotence=true` pour éviter les doublons), le partitionnement par clé métier, le batching et la compression pour optimiser le débit.

4. **Concevoir les consumer groups** — Organiser les consumers en groupes logiques, gérer les offsets (auto-commit vs commit manuel), implémenter le rebalancing gracieux, et configurer les paramètres de performance (`max.poll.records`, `fetch.min.bytes`, `session.timeout.ms`).

5. **Implémenter les patterns de traitement** — Appliquer les patterns adaptés au besoin : Event Sourcing (journal d'événements comme source de vérité), CQRS (séparation lecture/écriture), Saga (transactions distribuées), et CDC (Change Data Capture avec Debezium).

6. **Configurer Kafka Streams ou ksqlDB** — Développer les traitements de streaming avec Kafka Streams (KStream, KTable, joins, windowing, aggregations) ou ksqlDB pour les transformations déclaratives en SQL, les materialized views et les stream-table joins.

7. **Assurer l'exactly-once semantics** — Configurer les transactions Kafka pour le traitement exactly-once : `enable.idempotence`, `transactional.id` pour les producers, `isolation.level=read_committed` pour les consumers, et les transactions Kafka Streams.

8. **Monitorer et opérer** — Surveiller les métriques clés : consumer lag, throughput par partition, latence end-to-end, taille des topics. Configurer les alertes sur le lag excessif, les erreurs de sérialisation, et les rebalancing fréquents. Utiliser Kafka UI ou Confluent Control Center.

## Règles

- Choisis le nombre de partitions en fonction du débit cible — c'est le facteur limitant du parallélisme et il ne peut pas être réduit après création du topic.
- Utilise toujours un Schema Registry avec des règles de compatibilité pour éviter les breaking changes dans les formats de messages.
- Implémente la gestion des erreurs avec un dead letter topic pour les messages non traitables plutôt que de bloquer le consumer group.
- Ne stocke jamais de payloads volumineux dans Kafka — utilise le pattern Claim Check (référence vers un stockage externe) pour les données dépassant 1 MB.
- Monitore le consumer lag comme métrique principale de santé — un lag croissant indique un problème de capacité ou de traitement.
