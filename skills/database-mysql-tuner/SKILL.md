---
name: database-mysql-tuner
description: Optimisation MySQL/MariaDB incluant slow query log, stratégie d'index, tuning InnoDB, réplication et monitoring. Se déclenche avec "MySQL", "MariaDB", "slow query", "InnoDB", "MySQL tuning", "requête MySQL lente"
---

# MySQL Tuner

## Workflow

### 1. Activer et analyser le slow query log

```ini
# my.cnf / my.ini
slow_query_log        = 1
slow_query_log_file   = /var/log/mysql/slow.log
long_query_time       = 1        # secondes ; descendre à 0.5 en prod chargée
log_slow_extra        = 1        # MySQL 8.0.14+ : rows_examined, tmp_tables…
log_queries_not_using_indexes = 1
```

Analyser avec `pt-query-digest` (Percona Toolkit) :

```bash
pt-query-digest /var/log/mysql/slow.log \
  --limit 20 \
  --output report \
  > /tmp/digest.txt
```

Critères de triage : rank par **rows_examined / rows_sent** (ratio > 100 = suspect), puis par durée totale cumulée.

---

### 2. Auditer les index existants

```sql
-- Requêtes sans index en production (MySQL 8+)
SELECT * FROM sys.statements_with_full_table_scans
ORDER BY no_index_used_count DESC LIMIT 20;

-- Index jamais utilisés
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema NOT IN ('mysql','information_schema','performance_schema');

-- Doublons d'index
SELECT * FROM sys.schema_redundant_indexes;
```

`EXPLAIN ANALYZE` sur toute requête suspecte (MySQL 8.0.18+) :

```sql
EXPLAIN ANALYZE
SELECT u.id, o.total
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.status = 'active' AND o.created_at > '2026-01-01';
```

Signaux d'alerte dans le plan : `Full table scan`, `Using filesort`, `Using temporary`, `rows_examined` >> `rows_returned`.

---

### 3. Concevoir la stratégie d'indexation

**Règle du leftmost prefix** — l'index `(a, b, c)` couvre `WHERE a=?`, `WHERE a=? AND b=?`, mais pas `WHERE b=?`.

**Critères de décision :**

| Cas | Solution |
|-----|----------|
| Filtre sur colonne haute cardinalité | Index simple |
| Filtre multi-colonnes fréquent | Index composite (sélectivité décroissante en tête) |
| SELECT ne lit que quelques colonnes | Covering index `(col_filtre, col1_select, col2_select)` |
| LIKE 'prefix%' | Index B-Tree classique (OK) |
| LIKE '%suffix' | Full-text index ou Elasticsearch |
| JSON path fréquent | Generated column + index |

```sql
-- Covering index exemple
ALTER TABLE orders
  ADD INDEX idx_orders_user_date_total (user_id, created_at, total);

-- Index sur colonne générée (JSON)
ALTER TABLE events
  ADD COLUMN event_type VARCHAR(50) GENERATED ALWAYS AS (data->>'$.type') STORED,
  ADD INDEX idx_event_type (event_type);
```

Avant tout ajout, mesurer l'impact write :

```bash
sysbench oltp_write_only --db-driver=mysql --mysql-db=bench \
  --mysql-user=root --tables=10 --table-size=100000 prepare
sysbench oltp_write_only ... run
```

---

### 4. Tuner les paramètres InnoDB

```ini
# Règle de base : 70-80 % de la RAM dédiée MySQL
innodb_buffer_pool_size      = 12G          # ex. serveur 16 Go
innodb_buffer_pool_instances = 8            # 1 par Go, max 64
innodb_log_file_size         = 1G           # viser 1 heure de redo log
innodb_flush_log_at_trx_commit = 1          # 0/2 = perf + risque perte données
innodb_io_capacity           = 2000         # SSD NVMe ; 200 pour HDD
innodb_io_capacity_max       = 4000
innodb_read_io_threads       = 8
innodb_write_io_threads      = 8
innodb_flush_method          = O_DIRECT     # évite double buffering OS
```

Vérifier le **buffer pool hit ratio** (cible > 99 %) :

```sql
SELECT (1 - (
  SELECT variable_value FROM performance_schema.global_status WHERE variable_name='Innodb_buffer_pool_reads'
) / (
  SELECT variable_value FROM performance_schema.global_status WHERE variable_name='Innodb_buffer_pool_read_requests'
)) * 100 AS hit_ratio_pct;
```

---

### 5. Optimiser la configuration serveur

```ini
max_connections        = 300        # jamais > RAM / mémoire_par_connexion
thread_cache_size      = 50
table_open_cache       = 4000
table_definition_cache = 2000
tmp_table_size         = 64M        # tables temp en mémoire
max_heap_table_size    = 64M
join_buffer_size       = 4M         # par thread — ne pas exagérer
sort_buffer_size       = 4M         # idem
# MySQL 8+ : query_cache supprimé — ne pas tenter de l'activer
```

Estimer la mémoire totale avant d'ajuster `max_connections` :

```
mémoire_max = innodb_buffer_pool_size
            + (max_connections × (sort_buffer_size + join_buffer_size + read_buffer_size + …))
```

---

### 6. Configurer la réplication (GTID)

```ini
# Source
server_id               = 1
log_bin                 = /var/log/mysql/binlog
gtid_mode               = ON
enforce_gtid_consistency = ON
binlog_format           = ROW
sync_binlog             = 1

# Replica
server_id               = 2
relay_log               = /var/log/mysql/relaylog
read_only               = ON
replica_preserve_commit_order = ON   # MySQL 8.0+
```

Démarrer la réplication :

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.1.10',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='xxx',
  SOURCE_AUTO_POSITION=1;    -- GTID
START REPLICA;
SHOW REPLICA STATUS\G        -- vérifier Seconds_Behind_Source = 0
```

Distribuer les lectures avec **ProxySQL** :

```sql
-- ProxySQL admin
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup)
VALUES (10, 1, '^SELECT', 20);  -- hostgroup 20 = replicas
LOAD MYSQL QUERY RULES TO RUNTIME;
```

---

### 7. Monitoring

Métriques clés à surveiller (Prometheus + mysqld_exporter ou PMM) :

| Métrique | Seuil alerte |
|----------|-------------|
| `mysql_global_status_threads_running` | > 30 |
| Buffer pool hit ratio | < 99 % |
| `mysql_global_status_slow_queries` (rate) | hausse soudaine |
| Replication lag (`Seconds_Behind_Source`) | > 30 s |
| `mysql_global_status_aborted_connects` | > 0 croissant |

```bash
# mysqld_exporter (Prometheus)
docker run -d -p 9104:9104 \
  -e DATA_SOURCE_NAME="exporter:xxx@tcp(localhost:3306)/" \
  prom/mysqld-exporter
```

---

### 8. Maintenance planifiée

```sql
-- Fragmentation des tables (InnoDB — rarement nécessaire, préférer ALTER ... ENGINE=InnoDB)
SELECT table_name, data_free/1024/1024 AS free_mb
FROM information_schema.tables
WHERE table_schema = 'mydb' AND data_free > 100*1024*1024
ORDER BY data_free DESC;

-- Reconstruire proprement sans lock (pt-online-schema-change)
-- pt-osc --alter "ENGINE=InnoDB" D=mydb,t=big_table --execute

-- Statistiques d'index
ANALYZE TABLE orders;
```

Archivage automatique des vieilles données : préférer le **partitionnement par RANGE** sur `created_at` + `ALTER TABLE ... DROP PARTITION`.

---

## Garde-fous / Anti-patterns / Pièges

- **Ne jamais toucher `innodb_log_file_size` à chaud** — nécessite un arrêt propre + suppression des anciens iblogfile* sous MySQL 5.x ; MySQL 8 gère ça dynamiquement.
- **`query_cache` désactivé en MySQL 8+** — toute tentative de l'activer lève une erreur ; utiliser ProxySQL query cache ou un cache applicatif (Redis).
- **`max_connections` × buffers_par_connexion** peut dépasser la RAM et tuer le serveur par OOM. Toujours calculer avant d'augmenter.
- **Index sur colonnes de faible cardinalité** (ex. `status` avec 3 valeurs) inutile sauf en composite. L'optimiseur préférera un full scan.
- **`OPTIMIZE TABLE` sur InnoDB** = rebuild complet + lock en 5.x ; utiliser `pt-online-schema-change` ou `gh-ost` en production.
- **Réplication sans `sync_binlog=1`** : risque de binlog corrompu en crash, GTID devient incohérent.
- **Ne jamais modifier plusieurs paramètres simultanément** — isoler chaque changement pour mesurer son effet réel.
- **`EXPLAIN` sans `ANALYZE`** affiche des estimations qui peuvent être très éloignées de la réalité (histogrammes périmés).

## Bonnes pratiques 2026

- Utiliser **MySQL 8.4 LTS** ou **MariaDB 11.x** ; éviter les branches EOL.
- Activer les **histogrammes de colonnes** (`ANALYZE TABLE … UPDATE HISTOGRAM ON col`) pour les colonnes non-indexées dans les filtres.
- Préférer **`gh-ost`** à `pt-osc` pour les ALTER sans verrou sur MySQL 8+ (meilleure gestion des GTID).
- Déployer **ProxySQL 2.x** avec multiplexage de connexions pour réduire la pression sur `max_connections`.
- Activer **`performance_schema`** en production (overhead < 1 % depuis MySQL 5.7) : indispensable pour diagnostiquer les mutex, waits et top statements.


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
