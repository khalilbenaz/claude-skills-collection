---
name: mysql-tuner
description: Optimisation MySQL/MariaDB incluant slow query log, stratégie d'index, tuning InnoDB et réplication. Se déclenche avec "MySQL", "MariaDB", "slow query", "InnoDB", "MySQL tuning", "requête MySQL lente"
---

# MySQL Tuner

## Workflow
1. **Analyser les slow queries** — Activer et examiner le slow query log (`long_query_time`, `log_slow_extra`). Utiliser `pt-query-digest` ou `mysqldumpslow` pour identifier les requêtes les plus coûteuses par fréquence, durée et rows examined.
2. **Auditer les index existants** — Exécuter `EXPLAIN ANALYZE` sur les requêtes problématiques. Identifier les full table scans, les filesort et les temporary tables. Vérifier les index inutilisés avec `sys.schema_unused_indexes`.
3. **Concevoir une stratégie d'indexation** — Créer des index composites en respectant la règle du leftmost prefix. Évaluer les covering indexes pour les requêtes fréquentes. Utiliser `pt-index-usage` pour valider l'utilité de chaque index.
4. **Tuner les paramètres InnoDB** — Ajuster `innodb_buffer_pool_size` (70-80% de la RAM disponible), `innodb_log_file_size`, `innodb_flush_log_at_trx_commit`, `innodb_io_capacity` en fonction du profil de charge (lecture vs écriture).
5. **Optimiser la configuration serveur** — Configurer `max_connections`, `thread_cache_size`, `table_open_cache`, `query_cache` (désactivé en MySQL 8+). Ajuster `tmp_table_size` et `max_heap_table_size` pour réduire les tables temporaires sur disque.
6. **Configurer la réplication** — Mettre en place la réplication source-replica (GTID-based). Configurer `semi-synchronous replication` pour la durabilité. Distribuer les lectures sur les replicas avec ProxySQL ou MySQL Router.
7. **Mettre en place le monitoring** — Déployer des métriques avec Percona Monitoring and Management (PMM) ou Prometheus + mysqld_exporter. Surveiller les indicateurs clés : QPS, threads running, buffer pool hit ratio, replication lag.
8. **Planifier la maintenance** — Configurer `OPTIMIZE TABLE` pour les tables fragmentées, `ANALYZE TABLE` pour les statistiques d'index. Planifier les purges de données anciennes avec partitionnement ou archivage automatisé.

## Règles
- Toujours tester les modifications de configuration sur un environnement de staging avant la production, et ne changer qu'un paramètre à la fois pour mesurer l'impact.
- Ne jamais ajouter d'index sans vérifier l'impact sur les performances d'écriture (INSERT/UPDATE/DELETE) via des benchmarks réalistes.
- Toujours utiliser GTID pour la réplication afin de simplifier le failover et éviter les incohérences de position binlog.
- Préférer `EXPLAIN ANALYZE` (MySQL 8.0.18+) à `EXPLAIN` seul pour obtenir les temps d'exécution réels et non estimés.
- Ne jamais augmenter `max_connections` sans ajuster proportionnellement la mémoire allouée par connexion (`sort_buffer_size`, `join_buffer_size`).
