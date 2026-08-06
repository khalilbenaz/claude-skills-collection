---
name: cassandra-guide
description: Modélisation et administration Apache Cassandra incluant partition keys, clustering, compaction, réplication et tuning opérationnel. Se déclenche avec "Cassandra", "Apache Cassandra", "partition key", "CQL", "NoSQL distribué. Also triggers on "Cassandra data model", "partition key design", "wide column store".
---

# Cassandra Guide

## 1. Modéliser par les requêtes (Query-Driven Design)

Cassandra n'est pas relationnel : **le schéma découle des requêtes, pas l'inverse.**

**Étapes :**
1. Lister exhaustivement les patterns de requête de l'application.
2. Créer **une table par requête** — la dénormalisation est normale et attendue.
3. Choisir la `partition key` pour distribuer uniformément les données entre nœuds.
4. Choisir les `clustering columns` pour le tri intra-partition et les filtres de range.

**Critères de choix de partition key :**
- Cardinalité élevée → distribution uniforme (évite les "hot partitions").
- Pas de colonne nullable ni à faible cardinalité (statut booléen, enum à 3 valeurs).
- Si une seule colonne ne suffit pas, utilisez une clé composite : `PRIMARY KEY ((user_id, month), event_time)`.

```cql
-- Table events par utilisateur et mois (bucketing temporel)
CREATE TABLE events_by_user (
    user_id    UUID,
    month      TEXT,          -- ex. '2026-06'
    event_time TIMEUUID,
    payload    TEXT,
    PRIMARY KEY ((user_id, month), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);
```

## 2. Concevoir le schéma CQL

**Types recommandés :**
- `UUID` / `TIMEUUID` pour les identifiants (TIMEUUID = ordonné chronologiquement).
- `FROZEN<map<text,text>>` pour les structures imbriquées immuables.
- `TEXT` plutôt que `VARCHAR` (identiques, TEXT préféré par convention).
- `COUNTER` uniquement dans des tables dédiées (non mixable avec d'autres colonnes writables).

**User Defined Types (UDT) :**
```cql
CREATE TYPE address (
    street TEXT,
    city   TEXT,
    zip    TEXT
);

CREATE TABLE customers (
    id      UUID PRIMARY KEY,
    name    TEXT,
    address FROZEN<address>
);
```

**Materialized Views — attention :**
- Utiles pour les requêtes secondaires, mais coût d'écriture doublé.
- En production haute charge, préférer des tables de lookup manuelles + batch logged.

## 3. Configurer la réplication

| Contexte | Stratégie | Config |
|---|---|---|
| Dev / single DC | `SimpleStrategy` | `replication_factor: 1` |
| Prod single DC | `SimpleStrategy` | `replication_factor: 3` |
| Prod multi-DC | `NetworkTopologyStrategy` | RF par DC (`dc1: 3, dc2: 3`) |

```cql
-- Keyspace production multi-datacenter
CREATE KEYSPACE myapp
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'dc1': 3,
    'dc2': 3
};
```

**Consistency levels en production :**
- Lectures/écritures intra-DC : `LOCAL_QUORUM` (RF=3 → 2 nœuds suffisent).
- Réplication inter-DC asynchrone → ne jamais utiliser `QUORUM` global si latence inter-DC > 50 ms.
- Opérations critiques (paiement, audit) : `EACH_QUORUM` ou double-write applicatif.

## 4. Choisir la stratégie de compaction

| Cas d'usage | Stratégie | Pourquoi |
|---|---|---|
| Écritures massives, lectures rares | `STCS` (SizeTiered) | Défaut, peu de IOPS, favorise l'ingestion |
| Lectures fréquentes, updates | `LCS` (Leveled) | Moins de SSTables à lire, CPU + IOPS plus élevé |
| Time-series, TTL uniforme | `TWCS` (TimeWindow) | Expire des fenêtres entières, zéro amplification |

```cql
ALTER TABLE events_by_user
WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 1
};
```

**Règle TWCS :** fenêtre = granularité des TTL. Si TTL = 30 jours → fenêtre de 1 jour max.

## 5. Gérer le cluster (opérations courantes)

```bash
# État du cluster
nodetool status

# Réparation d'un nœud (priorité : anti-entropy)
nodetool repair -pr keyspace_name

# Nettoyage après ajout d'un nœud (supprime les données dont le nœud n'est plus responsable)
nodetool cleanup keyspace_name

# Décommissionner proprement un nœud
nodetool decommission

# Compaction forcée d'une table
nodetool compact keyspace_name table_name

# Vider les tombstones (flush mémoire → SSTables)
nodetool flush keyspace_name
```

**Réparations :** utiliser [cassandra-reaper](http://cassandra-reaper.io/) pour orchestrer les repairs en production — ne jamais lancer `nodetool repair` sur tous les nœuds simultanément.

## 6. Implémenter les requêtes (bonnes pratiques client)

```python
# Driver Python — prepared statement + paging
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy

cluster = Cluster(
    ['node1', 'node2'],
    load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='dc1')
)
session = cluster.connect('myapp')

# Prepared statement (parse côté serveur une seule fois)
stmt = session.prepare(
    "SELECT * FROM events_by_user WHERE user_id=? AND month=? LIMIT 100"
)
stmt.consistency_level = ConsistencyLevel.LOCAL_QUORUM

# Pagination
rows = session.execute(stmt, [user_id, '2026-06'], timeout=5.0)
for row in rows:
    process(row)
```

**Règles impératives :**
- Toujours utiliser des `prepared statements`.
- `ALLOW FILTERING` → interdit en production (scan complet de partition ou de cluster).
- `IN` sur partition key → requêtes fan-out, à limiter à < 10 valeurs.
- Limiter la taille des collections (`LIST`, `SET`, `MAP`) à < 1 000 éléments.

## 7. Monitorer le cluster

**Métriques critiques à surveiller (JMX → Prometheus via `cassandra-exporter` ou `jmx_exporter`) :**

| Métrique | Seuil d'alerte |
|---|---|
| `ReadLatency` P99 | > 10 ms |
| `WriteLatency` P99 | > 5 ms |
| `PendingCompactions` | > 32 par nœud |
| `DroppedMutations` | > 0 |
| GC pause (G1GC) | > 500 ms |
| Partition size (`EstimatedPartitionSizeHistogram`) | > 50 MB |
| Tombstone warnings dans les logs | > 1 000 par requête |

```yaml
# Alerte Prometheus — dropped mutations
- alert: CassandraDroppedMutations
  expr: rate(cassandra_droppedmessage_dropped_total{message_type="MUTATION"}[5m]) > 0
  for: 2m
  labels:
    severity: critical
```

## 8. Anti-patterns et pièges

| Piège | Conséquence | Remède |
|---|---|---|
| Partition > 100 MB | Read timeout, GC pressure | Bucketing temporel ou clé composite |
| DELETE massifs sans TTL | Accumulation de tombstones | Utiliser `TTL` à l'insertion, TWCS |
| `SELECT *` sans `LIMIT` | Full-partition scan | Toujours paginer ou limiter |
| Secondary index sur colonne haute cardinalité | Scatter-gather sur tout le cluster | Table de lookup dédiée |
| RF=1 en prod | Perte de données à la moindre panne | RF ≥ 3 obligatoire |
| Repair jamais exécuté | Données "zombies" (résurrection après `gc_grace_seconds`) | Repair automatisé toutes les 72 h max |
| Batch non-logged inter-partitions | Performance dégradée, coordination overhead | Batch uniquement intra-partition ou via driver async |
| Schéma créé avant de connaître les requêtes | Refonte coûteuse | Query-driven modeling dès le départ |

## 9. Planification de capacité

- **Taille d'une partition :** `nb_rows × avg_row_size × RF`. Cible < 50 MB, hard limit 100 MB.
- **Nombre de nœuds :** `(throughput_cible × RF) / throughput_par_nœud`. Nœud standard = 10-30k writes/s.
- **Stockage par nœud :** 1-4 TB SSD NVMe recommandé. Éviter HDD pour LCS.
- **Heap JVM :** 8 GB max (G1GC). Au-delà → GC pressure. Laisser le reste à l'OS pour le page cache.

```bash
# Estimer la taille réelle des partitions
nodetool tablehistograms keyspace_name table_name
# → colonne "Partition Size" → vérifier le P99
```
