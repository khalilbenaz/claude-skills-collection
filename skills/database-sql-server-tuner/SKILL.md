---
name: database-sql-server-tuner
description: Optimisation et administration SQL Server. Se déclenche avec "SQL Server", "SSMS", "execution plan", "index SQL Server", "Always On", "tempdb. Also triggers on "SQL Server performance", "T-SQL tuning", "execution plan analysis".
---

# SQL Server Tuner

## Workflow en étapes

### 1. Baseline — Collecter les informations système

Avant tout diagnostic, fixer le contexte :

```sql
-- Version, édition, mémoire configurée
SELECT @@VERSION;
SELECT name, value_in_use FROM sys.configurations
WHERE name IN ('max server memory (MB)', 'cost threshold for parallelism',
               'max degree of parallelism', 'optimize for ad hoc workloads');

-- Taille et état de chaque base
SELECT name, state_desc, log_reuse_wait_desc,
       CAST(size * 8.0 / 1024 AS INT) AS size_MB
FROM sys.databases ORDER BY size DESC;
```

### 2. Identifier les goulets — Wait Stats

**Point d'entrée systématique** : les wait stats expliquent 80 % des lenteurs.

```sql
-- Top 10 waits (hors idle)
SELECT TOP 10 wait_type,
       waiting_tasks_count,
       CAST(wait_time_ms / 1000.0 AS DECIMAL(10,2)) AS wait_sec,
       CAST(signal_wait_time_ms * 100.0 / wait_time_ms AS DECIMAL(5,2)) AS pct_signal
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN (
    'SLEEP_TASK','BROKER_TO_FLUSH','BROKER_EVENTHANDLER','WAITFOR',
    'SLEEP_DBSTARTUP','DISPATCHER_QUEUE_SEMAPHORE','XE_TIMER_EVENT',
    'SQLTRACE_BUFFER_FLUSH','CLR_QUANTUM_TASK','HADR_WORK_QUEUE',
    'LOGMGR_QUEUE','REQUEST_FOR_DEADLOCK_SEARCH','SNI_HTTP_ACCEPT',
    'ONDEMAND_TASK_MANAGER','SERVER_IDLE_CHECK','SLEEP_MASTERDBREADY',
    'FT_IFTS_SCHEDULER_IDLE_WAIT','XE_DISPATCHER_WAIT','ASYNC_NETWORK_IO',
    'SLEEP_TEMPDBSTARTUP','DBMIRROR_EVENTS_QUEUE')
ORDER BY wait_time_ms DESC;
```

**Critères de décision rapide :**

| Wait type | Cause probable | Action |
|---|---|---|
| `PAGEIOLATCH_SH/EX` | I/O disque, manque de mémoire | Augmenter `max server memory`, vérifier PLE |
| `LCK_M_*` | Contention de verrous | Analyser requêtes bloquantes, envisager RCSI |
| `CXPACKET / CXCONSUMER` | Parallelisme excessif | Ajuster MAXDOP, `cost threshold` |
| `RESOURCE_SEMAPHORE` | Pression mémoire sur grants | Requêtes avec sort/hash coûteux, revoir index |
| `WRITELOG` | I/O log lent | Déplacer LDF sur SSD dédié |

### 3. Identifier les requêtes coûteuses

```sql
-- Top requêtes par CPU total (Query Store, SQL 2016+)
SELECT TOP 20
    qsq.query_id,
    SUBSTRING(qsqt.query_sql_text, 1, 200) AS sql_text,
    SUM(qsrs.count_executions) AS executions,
    CAST(SUM(qsrs.avg_cpu_time * qsrs.count_executions) / 1e6 AS DECIMAL(10,2)) AS total_cpu_sec,
    CAST(AVG(qsrs.avg_duration) / 1e6 AS DECIMAL(10,4)) AS avg_dur_sec
FROM sys.query_store_query qsq
JOIN sys.query_store_query_text qsqt ON qsq.query_text_id = qsqt.query_text_id
JOIN sys.query_store_plan qsp ON qsq.query_id = qsp.query_id
JOIN sys.query_store_runtime_stats qsrs ON qsp.plan_id = qsrs.plan_id
GROUP BY qsq.query_id, qsqt.query_sql_text
ORDER BY total_cpu_sec DESC;

-- Alternative : DMV en temps réel (pas de persistence)
SELECT TOP 20
    total_worker_time / execution_count AS avg_cpu_us,
    execution_count,
    total_elapsed_time / execution_count AS avg_dur_us,
    SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
        ((CASE statement_end_offset WHEN -1 THEN DATALENGTH(st.text)
          ELSE qs.statement_end_offset END - qs.statement_start_offset)/2)+1) AS stmt
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
ORDER BY avg_cpu_us DESC;
```

### 4. Optimiser les index

**Processus décisionnel :**

1. Vérifier les index manquants signalés :
```sql
SELECT TOP 20
    migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans) AS score,
    mid.statement AS table_name,
    mid.equality_columns, mid.inequality_columns, mid.included_columns
FROM sys.dm_db_missing_index_group_stats migs
JOIN sys.dm_db_missing_index_groups mig ON migs.group_handle = mig.index_group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
ORDER BY score DESC;
```

2. Repérer les index inutilisés (candidats à la suppression) :
```sql
SELECT OBJECT_NAME(i.object_id) AS table_name, i.name AS index_name,
       i.type_desc, ius.user_seeks, ius.user_scans, ius.user_lookups, ius.user_updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats ius
    ON i.object_id = ius.object_id AND i.index_id = ius.index_id
    AND ius.database_id = DB_ID()
WHERE OBJECTPROPERTY(i.object_id,'IsUserTable') = 1
  AND i.type_desc <> 'HEAP'
  AND (ius.user_seeks IS NULL OR ius.user_seeks + ius.user_scans + ius.user_lookups = 0)
ORDER BY ISNULL(ius.user_updates, 0) DESC;
```

3. **Critère création index** : score > 100 000 ET ratio seeks/scans > 10. Préférer un index couvrant (INCLUDE) plutôt que plusieurs index partiels.

4. **Columnstore** : envisager un index columnstore non-clustered sur les tables > 10 M lignes accédées en analytique.

### 5. Tuner les requêtes

Pièges fréquents à éliminer en priorité :

- **Implicit conversion** : `WHERE VarcharCol = 123` → force un scan. Typer correctement.
- **Functions on indexed columns** : `WHERE YEAR(DateCol) = 2025` → non SARGable. Réécrire en range.
- **SELECT \*** : ramène des colonnes inutiles, bloque les index couvrants.
- **N+1 loops** : remplacer par un JOIN ou une table-valued parameter.

```sql
-- Réécriture SARGable
-- Avant (non-SARGable)
WHERE CONVERT(DATE, CreatedAt) = '2025-01-01'
-- Après
WHERE CreatedAt >= '2025-01-01' AND CreatedAt < '2025-01-02'
```

### 6. Configurer tempdb

```sql
-- Nombre de fichiers recommandé : MIN(nb_CPU_logiques, 8), taille pré-allouée identique
-- SQL Server 2019+ : activer optimisation metadata en mémoire
ALTER SERVER CONFIGURATION SET MEMORY_OPTIMIZED TEMPDB_METADATA = ON;
-- Vérifier la fragmentation tempdb
SELECT file_id, name, physical_name, size * 8 / 1024 AS size_MB
FROM tempdb.sys.database_files;
```

**Règle** : tous les fichiers de données tempdb doivent avoir la même taille initiale et le même autogrowth pour éviter la contention sur l'allocation.

### 7. RCSI / Isolation levels

Activer RCSI sur les bases OLTP pour réduire la contention lecture/écriture sans changer le code applicatif :

```sql
-- Vérifier l'état
SELECT name, is_read_committed_snapshot_on FROM sys.databases;
-- Activer (nécessite accès exclusif momentané)
ALTER DATABASE [MaBase] SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK AFTER 5 SECONDS;
```

### 8. Maintenance planifiée

```sql
-- Rebuild si fragmentation > 30%, reorganize entre 10% et 30%
SELECT OBJECT_NAME(ips.object_id) AS table_name, i.name, ips.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 10 AND ips.page_count > 1000
ORDER BY avg_fragmentation_in_percent DESC;
```

**Fréquences recommandées :**

| Opération | Fréquence | Remarque |
|---|---|---|
| Rebuild index | Hebdo (nuit) | Online si édition Enterprise |
| Update statistics | Après rebuild + quotidien si changement > 20 % | `WITH FULLSCAN` sur tables clés |
| DBCC CHECKDB | Hebdo off-peak | Jamais skipper ; alerter sur erreur |
| Backup full | Quotidien | Tester la restauration |

---

## Garde-fous et anti-patterns

- **Ne jamais** ajouter un index sans mesurer l'impact sur les INSERT/UPDATE/DELETE (overhead écriture + espace).
- **Ne jamais** appliquer un hint de requête (`NOLOCK`, `FORCESEEK`) sans comprendre ses effets secondaires ; `NOLOCK` = lectures sales, données fantômes.
- **Éviter** les curseurs et boucles WHILE sur de gros volumes ; préférer les opérations set-based ou les TVP.
- **Ne pas** augmenter `max server memory` à 100 % de la RAM physique ; laisser au moins 4 Go pour l'OS (plus sur serveurs > 64 Go).
- **Ne jamais** désactiver `auto update statistics` sans un plan de mise à jour manuel rigoureux.
- **Toujours** capturer le plan d'exécution **réel** (actual), pas estimé : les card-estimations incorrectes sont invisibles sur le plan estimé.
- **Tester** tout changement (index, config, réécriture) en pré-production avec une charge représentative avant passage en prod.

## Bonnes pratiques 2026

- **Query Store activé** sur toutes les bases de production (SQL 2016+) ; mode `READ_WRITE`, rétention 30 jours minimum.
- **Intelligent Query Processing (IQP)** : utiliser le compatibility level 150+ pour bénéficier de l'adaptive joins, batch mode on rowstore, memory grant feedback.
- **Accelerated Database Recovery (ADR)** : activer sur les bases avec longues transactions pour réduire le temps de recovery.
- **Ledger tables** (SQL 2022) pour les tables d'audit à intégrité garantie sans overhead applicatif.
- **Monitoring** : alerter sur PLE < 300 s, batch requests/sec chute > 30 %, wait stats PAGEIOLATCH croissants.


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
