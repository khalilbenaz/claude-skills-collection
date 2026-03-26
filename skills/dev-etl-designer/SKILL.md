---
name: dev-etl-designer
description: Conception de processus ETL/ELT pour l'intégration de données. Se déclenche avec "ETL", "ELT", "extraction", "transformation", "load", "data integration", "data warehouse", "SSIS", "Talend", "Informatica".
---

# ETL Designer

## Workflow
1. **Analyse des sources et destinations** — Inventorier les systèmes sources (SGBD relationnels, APIs REST/GraphQL, fichiers plats CSV/JSON/XML, applications SaaS) et les destinations (data warehouse, data lake, data mart) ; documenter les contraintes de volume, latence, fenêtres de maintenance et accès réseau.
2. **Choix ETL vs ELT** — Évaluer les trade-offs : ETL (transformation avant chargement, adapté aux destinations peu puissantes, données sensibles masquées tôt) vs ELT (chargement brut puis transformation dans le warehouse, exploite la puissance de BigQuery/Snowflake/Redshift, plus flexible pour l'exploration) ; documenter la décision.
3. **Extraction** — Implémenter la stratégie d'extraction : full load (snapshot complet, simple mais coûteux), incremental (delta sur timestamp ou ID croissant), CDC Change Data Capture (Debezium, Oracle GoldenGate, AWS DMS pour capturer INSERT/UPDATE/DELETE) ; gérer la pagination API (curseur, offset, link headers).
4. **Transformation** — Appliquer les règles métier : nettoyage (trim, normalisation des casses, formats de dates), déduplication (window functions SQL, hash comparison), enrichissement (lookup tables, API calls), agrégation (groupby, rollup), et application des règles métier (mapping de codes, calcul de KPIs).
5. **Loading strategy** — Choisir le mode de chargement adapté : full refresh (troncature + rechargement, simple mais coûteux), upsert/merge (INSERT ... ON CONFLICT, MERGE SQL), Slowly Changing Dimensions type 1 (écrasement) ou type 2 (historisation avec validity dates), append-only pour les événements immuables.
6. **Error handling** — Implémenter une gestion d'erreurs robuste : retry avec backoff exponentiel sur les erreurs transitoires (timeout réseau), dead letter queue ou table d'erreurs pour les enregistrements invalides, data quarantine avec contexte d'erreur complet, logging structuré (JSON) et table de réconciliation pour audit.
7. **Performance** — Optimiser l'exécution : parallélisation des extractions (multithreading, Spark partitions), partitioning des données en transit et destination, bulk loading (COPY command Snowflake/Redshift, BigQuery load jobs), stratégie d'indexing sur les colonnes de jointure et de filtre, compression des fichiers intermédiaires.
8. **Scheduling et monitoring** — Orchestrer avec un scheduler (Airflow, Dagster, dbt Cloud, SSIS) ; définir des SLA de fraîcheur et déclencher des alertes en cas de dépassement ; suivre la data lineage (origine → destination avec timestamps) ; mesurer les volumes chargés pour détecter les anomalies de volumétrie.

## Règles
- Fournis des exemples SQL et Python concrets (requête MERGE, Airflow DAG, script d'extraction paginée) adaptés aux outils mentionnés par l'utilisateur.
- Garantis l'idempotence de chaque étape : relancer un job ETL ne doit jamais dupliquer les données ni corrompre la destination.
- Intègre systématiquement un mécanisme de reconciliation (comptage source vs destination) pour valider chaque chargement.
- Priorise la traçabilité : chaque enregistrement chargé doit conserver sa source, son timestamp d'extraction et l'ID du job ETL.
- Adapte la complexité à l'usage : un ETL nocturne simple mérite une solution légère (Python + cron) avant d'investir dans une infrastructure distribuée.
