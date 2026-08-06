---
name: postgres-expert
description: Administration et optimisation PostgreSQL — diagnostic de performance, indexation, partitioning, tuning mémoire, VACUUM, backup/restore, JSONB, réplication. Se déclenche avec "PostgreSQL", "Postgres", "pg_stat", "JSONB", "partitioning", "VACUUM", "pg_dump. Also triggers on "PostgreSQL performance", "Postgres index", "EXPLAIN ANALYZE", "table partitioning".
---

# PostgreSQL Expert

## Workflow

### 1. Recueillir le contexte obligatoire
Avant toute recommandation, collecter :
```sql
SELECT version();                         -- version exacte (ex: 16.3)
SHOW shared_buffers;                      -- mémoire allouée
SHOW work_mem;
SELECT pg_size_pretty(pg_database_size(current_database()));
```
- Workload : OLTP (latence < 5 ms), OLAP (scan massif), mixte ?
- RAM totale du serveur, SSD ou HDD, réplication active ?

### 2. Diagnostiquer les performances
```sql
-- Top requêtes lentes (nécessite pg_stat_statements activé)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

-- Tables avec beaucoup de dead tuples (candidat VACUUM)
SELECT relname, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / nullif(n_live_tup,0)*100,1) AS bloat_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Requête lente : toujours EXPLAIN complet
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <votre requête>;
```

Critères d'action :
| Signal | Seuil | Action |
|--------|-------|--------|
| `mean_exec_time` | > 100 ms | Analyser plan + index |
| `bloat_pct` | > 20 % | VACUUM FULL ou pg_repack |
| `cache_hit_ratio` | < 99 % | Augmenter `shared_buffers` |
| `seq_scan` élevé | > 1 k/min sur grande table | Créer un index |

```sql
-- Ratio de cache hits (doit être > 99 %)
SELECT sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read),0) AS cache_hit_ratio
FROM pg_statio_user_tables;
```

### 3. Indexation — choisir le bon type
| Type | Cas d'usage |
|------|-------------|
| B-tree (défaut) | `=`, `<`, `>`, `BETWEEN`, `LIKE 'abc%'` |
| GIN | JSONB, tableaux, full-text (`tsvector`) |
| GiST | Géométrie, plages (`tsrange`) |
| BRIN | Colonnes ordonnées naturellement (logs, séries temporelles) — très compact |
| Hash | `=` uniquement, rarement utile vs B-tree |

```sql
-- Index couvrant (évite un heap fetch)
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status) INCLUDE (created_at, total);

-- Index partiel (réduit taille, cible les lignes actives)
CREATE INDEX CONCURRENTLY idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Index GIN sur JSONB
CREATE INDEX CONCURRENTLY idx_events_payload ON events USING GIN (payload jsonb_path_ops);
```
Toujours utiliser `CONCURRENTLY` en production (pas de verrou table).

### 4. Partitioning
Disponible nativement depuis PG 10 (partitioning déclaratif).

```sql
-- Partition par range sur une date (OLAP, logs, IoT)
CREATE TABLE events (
    id BIGSERIAL,
    occurred_at TIMESTAMPTZ NOT NULL,
    payload JSONB
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2025 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Activer partition pruning (défaut ON depuis PG 11)
SET enable_partition_pruning = on;
```

Critères de choix :
- **RANGE** : dates, IDs croissants → purge par `DROP TABLE partition` O(1)
- **LIST** : régions, statuts finis (< 50 valeurs)
- **HASH** : distribution uniforme sans sémantique de plage

### 5. Tuning mémoire (postgresql.conf)
Formules de référence pour un serveur dédié PostgreSQL :

```ini
shared_buffers = 25% RAM          # ex: 8 GB sur 32 GB
effective_cache_size = 75% RAM    # indice pour le planner
work_mem = RAM / (max_connections * 4)  # max 256 MB ; attention aux sorts parallèles
maintenance_work_mem = 1–4 GB     # VACUUM, CREATE INDEX
wal_buffers = 64 MB               # ou -1 (auto)
max_wal_size = 2 GB               # réduit fréquence checkpoints
checkpoint_completion_target = 0.9

# Parallélisme (PG 9.6+)
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
```

> Appliquer via `ALTER SYSTEM SET param = val;` + `SELECT pg_reload_conf();` (sans redémarrage pour la plupart).

### 6. VACUUM et autovacuum
```sql
-- Forcer un VACUUM ANALYZE sur une table critique
VACUUM (ANALYZE, VERBOSE) ma_table;

-- VACUUM FULL (bloquant ! utiliser pg_repack en production)
-- pg_repack -t ma_table -d mabase

-- Ajuster autovacuum par table (évite de le désactiver globalement)
ALTER TABLE ma_table SET (
    autovacuum_vacuum_scale_factor = 0.01,   -- déclencher à 1 % de dead tuples
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_delay = 2         -- ms, réduire l'impact I/O
);
```

### 7. Backup et restore
```bash
# Dump logique (texte / format custom)
pg_dump -Fc -Z 5 -d mabase -f mabase_$(date +%Y%m%d).dump

# Restore
pg_restore -d mabase_restore --no-owner --no-acl mabase_20260624.dump

# Backup physique (streaming, recommandé production)
pg_basebackup -h localhost -U replicator -D /mnt/backup/base -Ft -z -Xs -P

# Point-in-time recovery : activer WAL archivage
archive_mode = on
archive_command = 'cp %p /mnt/wal_archive/%f'
```

Stratégie recommandée : `pgBackRest` pour la gestion des WAL, rétention et restore PITR automatisés.

### 8. JSONB — bonnes pratiques 2026
```sql
-- Extraire une valeur
SELECT payload->>'user_id', payload#>>'{address,city}' FROM events;

-- Filtrer avec index GIN (jsonb_path_ops plus compact)
SELECT * FROM events WHERE payload @> '{"status": "active"}';

-- JSON Path (PG 12+)
SELECT * FROM events WHERE payload @? '$.items[*] ? (@.price > 100)';

-- Agréger du JSONB
SELECT jsonb_agg(payload) FROM events WHERE occurred_at > now() - interval '1 day';
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Alternative |
|---|---|---|
| `SELECT *` sur grande table | Scan complet + overhead réseau | Sélectionner les colonnes nécessaires |
| Index sur colonne de faible cardinalité (`boolean`) | Index inutilisé, overhead write | Index partiel ou pas d'index |
| `VACUUM FULL` en production sans pg_repack | Lock exclusif, downtime | `pg_repack` (online) |
| Désactiver `autovacuum` globalement | Transaction ID wraparound (DB forcée read-only) | Ajuster `autovacuum_*` par table |
| `work_mem` trop élevé × max_connections | OOM | Calculer par opération, pas par connexion |
| `EXPLAIN` sans `ANALYZE` | Plan estimé, pas réel | `EXPLAIN (ANALYZE, BUFFERS)` toujours |
| Connexions persistantes non poolées | Overhead process, verrous | PgBouncer en mode transaction pooling |
| Index sans `CONCURRENTLY` en production | Lock table bloquant les écritures | Toujours `CREATE INDEX CONCURRENTLY` |
| Ignorer `pg_stat_replication` en réplication | Lag non détecté | Monitorer `write_lag`, `flush_lag`, `replay_lag` |

## Checklist opérationnelle rapide

```sql
-- Taille des tables et indexes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total,
       pg_size_pretty(pg_relation_size(relid)) AS table_only
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;

-- Locks actifs suspects
SELECT pid, wait_event_type, wait_event, state, left(query,80)
FROM pg_stat_activity WHERE wait_event IS NOT NULL AND state != 'idle';

-- Vérifier le lag de réplication
SELECT client_addr, write_lag, flush_lag, replay_lag FROM pg_stat_replication;
```
