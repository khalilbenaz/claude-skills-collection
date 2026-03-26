---
name: database-cassandra-guide
description: Modélisation et administration Apache Cassandra incluant partition keys, clustering, compaction et réplication. Se déclenche avec "Cassandra", "Apache Cassandra", "partition key", "CQL", "NoSQL distribué"
---

# Cassandra Guide

## Workflow
1. **Modéliser par les requêtes** — Lister tous les patterns de requêtes de l'application. Créer une table par requête (query-driven modeling). Définir les partition keys pour distribuer uniformément les données et les clustering columns pour le tri intra-partition.
2. **Concevoir le schéma CQL** — Définir les types de données appropriés (UUID, TIMEUUID, TEXT, FROZEN). Utiliser les User Defined Types (UDT) pour les données imbriquées. Créer des materialized views ou des tables de dénormalisation pour les requêtes secondaires.
3. **Configurer la réplication** — Choisir la stratégie de réplication : `SimpleStrategy` (développement) ou `NetworkTopologyStrategy` (production multi-datacenter). Définir le replication factor (RF=3 minimum en production). Configurer les consistency levels par requête (QUORUM, LOCAL_QUORUM).
4. **Optimiser la compaction** — Sélectionner la stratégie de compaction adaptée : SizeTieredCompactionStrategy (STCS) pour les écritures intensives, LeveledCompactionStrategy (LCS) pour les lectures intensives, TimeWindowCompactionStrategy (TWCS) pour les time-series.
5. **Gérer le cluster** — Configurer `nodetool` pour les opérations de maintenance (repair, cleanup, compact). Planifier les réparations régulières avec `cassandra-reaper`. Gérer l'ajout et le retrait de noeuds avec `nodetool decommission` et `nodetool bootstrap`.
6. **Implémenter les requêtes** — Utiliser les prepared statements systématiquement pour les performances et la sécurité. Implémenter la pagination avec le paging state. Éviter les requêtes ALLOW FILTERING et les IN sur les partition keys.
7. **Monitorer le cluster** — Déployer les métriques JMX vers Prometheus avec `cassandra-exporter`. Surveiller les indicateurs critiques : latence P99, pending compactions, dropped mutations, GC pauses, partition size.
8. **Planifier la capacité** — Estimer la taille des partitions (max 100 MB recommandé). Calculer le stockage nécessaire avec le replication factor. Prévoir le nombre de noeuds en fonction du throughput cible et du ratio lecture/écriture.

## Règles
- Ne jamais dépasser 100 MB par partition ; utiliser le bucketing temporel ou un identifiant composite pour fragmenter les partitions volumineuses.
- Toujours utiliser `LOCAL_QUORUM` en production multi-datacenter pour garantir la consistance sans impacter la latence inter-datacenter.
- Ne jamais utiliser des secondary indexes Cassandra sur des colonnes à haute cardinalité ; préférer la création de tables de lookup dédiées.
- Exécuter `nodetool repair` régulièrement (au moins tous les `gc_grace_seconds`) pour éviter la résurrection de données supprimées (tombstone).
- Toujours tester les migrations de schéma en rolling fashion, noeud par noeud, pour éviter les interruptions de service.
