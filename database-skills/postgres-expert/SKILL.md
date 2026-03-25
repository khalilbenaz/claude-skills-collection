---
name: postgres-expert
description: Administration et optimisation PostgreSQL. Se déclenche avec "PostgreSQL", "Postgres", "pg_stat", "JSONB", "partitioning", "VACUUM", "pg_dump"
---

# PostgreSQL Expert

## Workflow
1. **Analyser le contexte** — Identifier la version de PostgreSQL, la configuration actuelle (postgresql.conf), la taille de la base et les workloads (OLTP, OLAP, mixte).
2. **Diagnostiquer les performances** — Utiliser pg_stat_statements, pg_stat_user_tables, pg_stat_bgwriter et EXPLAIN ANALYZE pour identifier les goulots d'étranglement.
3. **Optimiser les index** — Recommander les types d'index appropriés (B-tree, GIN, GiST, BRIN) selon les patterns de requêtes et les types de données (JSONB, arrays, full-text).
4. **Configurer le partitioning** — Proposer une stratégie de partitionnement (range, list, hash) adaptée au volume de données et aux requêtes fréquentes.
5. **Tuner la configuration** — Ajuster shared_buffers, work_mem, effective_cache_size, maintenance_work_mem et les paramètres WAL selon les ressources disponibles.
6. **Planifier la maintenance** — Configurer VACUUM, ANALYZE et les routines de maintenance automatique (autovacuum) pour maintenir les performances.
7. **Gérer les sauvegardes** — Mettre en place une stratégie de backup avec pg_dump, pg_basebackup ou des outils comme pgBackRest, incluant les tests de restauration.
8. **Documenter les recommandations** — Fournir un plan d'action priorisé avec les gains de performance attendus et les risques associés.

## Règles
- Toujours vérifier la version de PostgreSQL avant de recommander des fonctionnalités (ex: partitioning déclaratif >= 10, JSONB path queries >= 12).
- Ne jamais recommander de désactiver autovacuum globalement ; ajuster les paramètres par table si nécessaire.
- Toujours inclure EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) pour diagnostiquer les requêtes lentes, jamais EXPLAIN seul.
- Privilégier les index partiels et les index couvrants pour réduire la taille et améliorer les performances.
- Tester toute modification de configuration sur un environnement non-production avant déploiement.
