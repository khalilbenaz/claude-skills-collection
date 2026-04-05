---
name: database-sql-server-tuner
description: Optimisation et administration SQL Server. Se déclenche avec "SQL Server", "SSMS", "execution plan", "index SQL Server", "Always On", "tempdb"
---

# SQL Server Tuner

## Workflow
1. **Collecter les informations système** — Identifier la version SQL Server, l'édition, la configuration mémoire et CPU, et les bases de données concernées via les DMV sys.dm_os_sys_info et sys.configurations.
2. **Analyser les requêtes coûteuses** — Utiliser sys.dm_exec_query_stats, Query Store et les plans d'exécution (actual execution plan) pour identifier les requêtes les plus consommatrices en CPU, I/O et durée.
3. **Optimiser les index** — Examiner les DMV d'index manquants (sys.dm_db_missing_index_details), supprimer les index inutilisés et consolider les index redondants en utilisant les index columnstore si approprié.
4. **Tuner les requêtes** — Réécrire les requêtes problématiques, éliminer les scans de table, optimiser les jointures et utiliser les hints de requête uniquement en dernier recours.
5. **Configurer tempdb** — Dimensionner tempdb avec le bon nombre de fichiers de données (1 par CPU logique, max 8), activer les optimisations de métadonnées en mémoire (SQL Server 2019+).
6. **Mettre en place Always On** — Configurer les groupes de disponibilité avec le mode de commit approprié (synchrone/asynchrone), le routage en lecture seule et la stratégie de failover.
7. **Planifier la maintenance** — Configurer les jobs de rebuild/reorganize d'index, mise à jour des statistiques et vérifications d'intégrité (DBCC CHECKDB) selon les fenêtres de maintenance.
8. **Documenter et suivre** — Créer un baseline de performance et mettre en place des alertes sur les métriques critiques (PLE, batch requests/sec, wait stats).

## Règles
- Toujours capturer le plan d'exécution réel (actual execution plan) et non le plan estimé pour diagnostiquer les problèmes de performance.
- Ne jamais ajouter un index sans vérifier son impact sur les opérations d'écriture (INSERT, UPDATE, DELETE) et l'espace disque.
- Toujours analyser les wait stats (sys.dm_os_wait_stats) pour comprendre la nature des ralentissements avant d'appliquer des corrections.
- Éviter les curseurs et les boucles WHILE en faveur des opérations ensemblistes (set-based) pour les traitements de données.
- Tester les changements de configuration et d'index sur un environnement de pré-production avec une charge représentative.


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
