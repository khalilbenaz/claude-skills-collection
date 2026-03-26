---
name: dev-data-pipeline-builder
description: Conception de pipelines de données robustes et scalables. Se déclenche avec "data pipeline", "pipeline de données", "batch processing", "stream processing", "Apache Spark", "Airflow", "dbt", "data engineering".
---

# Data Pipeline Builder

## Workflow
1. **Analyse des sources de données** — Identifier les formats (CSV, JSON, Parquet, Avro), volumes (Mo à To), fréquence de mise à jour, et qualité initiale des données ; documenter les contraintes de latence et de SLA.
2. **Choix de l'architecture** — Évaluer batch vs streaming vs architecture lambda/kappa selon les besoins de fraîcheur ; décider entre ELT (transformation dans le warehouse) et ETL (transformation avant chargement).
3. **Orchestration** — Choisir et configurer l'outil d'orchestration : Apache Airflow (DAGs Python), Dagster (asset-based), Prefect (flow/task), Azure Data Factory (cloud-native) ou dbt Cloud selon l'écosystème existant.
4. **Ingestion** — Mettre en place les connecteurs source (JDBC, REST, Kafka) ; implémenter le Change Data Capture (CDC avec Debezium) pour les bases relationnelles, l'API polling avec pagination, ou les file watchers pour les dépôts de fichiers.
5. **Transformation** — Appliquer les transformations avec SQL/dbt (models, tests, snapshots), Apache Spark (PySpark) ou Pandas selon le volume ; intégrer des data quality checks à chaque étape (contraintes de schéma, plages de valeurs, unicité).
6. **Storage layer** — Structurer le stockage en data lake (S3/ADLS/GCS avec Delta Lake ou Iceberg), data warehouse (Snowflake, BigQuery, Redshift) ou lakehouse ; définir la stratégie de partitioning (par date, région) et de compactage.
7. **Monitoring et alerting** — Suivre la fraîcheur des données (data freshness SLA), la santé du pipeline (taux d'erreur, durée d'exécution), les métriques de qualité (null rate, anomalies) ; configurer des alertes PagerDuty/Slack sur dépassement de seuils.
8. **Scalabilité et résilience** — Garantir l'idempotence de chaque étape (upsert plutôt qu'insert, checksums) ; implémenter les retry avec backoff exponentiel, le backfill pour le replay historique, et gérer l'évolution de schéma (schema evolution avec compatibilité backward/forward).

## Règles
- Fournis des exemples SQL et Python concrets adaptés aux outils mentionnés par l'utilisateur (Airflow DAG, dbt model, PySpark job).
- Priorise toujours l'idempotence : chaque pipeline doit pouvoir être relancé sans dupliquer ni corrompre les données.
- Documente la lineage des données (origine → transformations → destination) pour la traçabilité et le debugging.
- Intègre des data quality checks natifs à chaque étape de transformation, pas uniquement en fin de pipeline.
- Adapte la granularité de l'architecture au contexte : un pipeline simple mérite une solution simple avant d'introduire Spark ou Kafka.
