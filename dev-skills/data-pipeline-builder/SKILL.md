---
name: data-pipeline-builder
description: Conception de pipelines de données robustes et scalables. Se déclenche avec "data pipeline", "pipeline de données", "batch processing", "stream processing", "Apache Spark", "Airflow", "dbt", "data engineering".
---

# Data Pipeline Builder

## 1. Analyser les sources et les besoins

Avant d'écrire une ligne de code, poser ces questions :

| Critère | Options | Impact |
|---|---|---|
| Volume | Ko–Mo / Go / To+ | Pandas vs Spark vs DuckDB |
| Fréquence | Batch horaire/journalier / Near-real-time / Streaming | Airflow vs Flink/Kafka |
| Fraîcheur acceptable | > 1h / 15 min / < 1 min | Batch / micro-batch / streaming pur |
| Qualité source | Propre / semi-structurée / dirty | Niveau de validation nécessaire |
| Format | CSV, JSON, Parquet, Avro, CDC | Connecteur et schéma evolution |

**Règle** : ne pas sur-architecturer. Un fichier CSV quotidien de 10 Mo → DuckDB + script Python, pas Spark.

---

## 2. Choisir l'architecture

```
Données fraîcheur > 1h   → Batch (Airflow + dbt + Warehouse)
Fraîcheur 1–15 min       → Micro-batch (Spark Structured Streaming / Flink)
Fraîcheur < 1 min        → Streaming pur (Kafka + Flink / Kafka Streams)
Transformations lourdes  → ELT (charger raw, transformer dans le warehouse)
Données sensibles/EDW    → ETL (transformer avant chargement)
```

**Architecture lambda** = batch + streaming en parallèle → complexité élevée, préférer **kappa** (streaming seul avec replay) quand le streaming couvre tous les cas.

---

## 3. Ingestion

### CDC avec Debezium (PostgreSQL → Kafka)
```yaml
# docker-compose snippet
debezium:
  image: debezium/connect:2.5
  environment:
    BOOTSTRAP_SERVERS: kafka:9092
    GROUP_ID: debezium-group
    CONFIG_STORAGE_TOPIC: debezium.configs
    OFFSET_STORAGE_TOPIC: debezium.offsets
```

```bash
# Enregistrer un connecteur PostgreSQL
curl -X POST http://localhost:8083/connectors -H 'Content-Type: application/json' -d '{
  "name": "pg-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "replicator",
    "database.password": "secret",
    "database.dbname": "mydb",
    "table.include.list": "public.orders",
    "plugin.name": "pgoutput"
  }
}'
```

### API polling avec pagination
```python
def fetch_all_pages(base_url: str, headers: dict) -> list[dict]:
    results, page = [], 1
    while True:
        r = requests.get(base_url, params={"page": page, "per_page": 100}, headers=headers)
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        results.extend(data)
        page += 1
    return results
```

---

## 4. Transformation

### dbt — modèle incrémental (pattern recommandé 2026)
```sql
-- models/orders_enriched.sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    on_schema_change='append_new_columns'
) }}

SELECT
    o.order_id,
    o.created_at,
    c.country,
    SUM(oi.amount) AS total_amount
FROM {{ ref('stg_orders') }} o
JOIN {{ ref('stg_customers') }} c ON c.customer_id = o.customer_id
JOIN {{ ref('stg_order_items') }} oi ON oi.order_id = o.order_id
{% if is_incremental() %}
WHERE o.created_at > (SELECT MAX(created_at) FROM {{ this }})
{% endif %}
GROUP BY 1, 2, 3
```

```bash
dbt run --select orders_enriched --vars '{"start_date": "2026-01-01"}'
dbt test --select orders_enriched  # great_expectations intégré via dbt-expectations
```

### PySpark — lecture Parquet partitionné
```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, to_date

spark = SparkSession.builder.appName("orders-etl").getOrCreate()

df = (
    spark.read.parquet("s3a://datalake/raw/orders/")
    .filter(col("_date") >= "2026-01-01")          # partition pruning
    .withColumn("order_date", to_date("created_at"))
    .dropDuplicates(["order_id"])                   # idempotence
)

(
    df.write
    .mode("overwrite")
    .partitionBy("order_date")
    .parquet("s3a://datalake/processed/orders/")
)
```

---

## 5. Orchestration

### Airflow DAG — pattern recommandé
```python
from airflow.decorators import dag, task
from airflow.utils.dates import days_ago
from pendulum import datetime

@dag(
    schedule="0 6 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["orders", "daily"],
)
def orders_pipeline():

    @task(retries=3, retry_delay=timedelta(minutes=5))
    def extract():
        return fetch_all_pages(...)

    @task
    def transform(raw: list) -> None:
        # appel dbt ou PySpark
        pass

    @task
    def validate() -> None:
        # data quality checks
        pass

    extract_result = extract()
    transform_result = transform(extract_result)
    validate()  # déclenché après transform

orders_pipeline()
```

**Critères de choix d'orchestrateur** :
- **Airflow** : équipe Python, DAGs complexes, large écosystème, self-hosted ou MWAA/Composer
- **Dagster** : asset-based lineage, observabilité native, TDD des assets
- **Prefect** : déploiement léger, serverless-friendly, API intuitive
- **Azure Data Factory** : écosystème Azure uniquement, drag-and-drop + ARM templates

---

## 6. Data Quality intégrée

Ne pas valider uniquement en fin de pipeline — insérer les checks à chaque étape.

```python
# Avec Great Expectations
import great_expectations as gx

context = gx.get_context()
batch = context.sources.pandas_default.read_dataframe(df)

suite = context.add_expectation_suite("orders_suite")
batch.expect_column_values_to_not_be_null("order_id")
batch.expect_column_values_to_be_between("total_amount", min_value=0, max_value=1_000_000)
batch.expect_column_values_to_be_unique("order_id")

results = context.run_checkpoint("orders_checkpoint")
if not results["success"]:
    raise ValueError(f"Data quality failed: {results}")
```

---

## 7. Storage layer

| Besoin | Solution |
|---|---|
| Data lake open format | Delta Lake (Databricks/OSS) ou Apache Iceberg |
| Analytique cloud scale | BigQuery, Snowflake, Redshift |
| Analytique locale/mid-scale | DuckDB (fichiers Parquet locaux ou S3) |
| Lakehouse | Delta Lake sur S3/ADLS + Spark ou Trino |

**Partitioning** : toujours partitionner par date en premier (colonne la plus filtrée). Éviter plus de 10 000 partitions — risque de small files problem.

**Compactage** (Delta Lake) :
```python
from delta.tables import DeltaTable
DeltaTable.forPath(spark, "s3a://datalake/processed/orders/").optimize().executeCompaction()
```

---

## 8. Monitoring et alerting

```python
# Mesure de fraîcheur — à exposer dans Prometheus/Datadog
from datetime import datetime, timedelta

def check_freshness(table: str, max_delay: timedelta) -> bool:
    last_updated = get_max_timestamp(table)  # requête warehouse
    return datetime.utcnow() - last_updated < max_delay
```

Métriques clés à suivre :
- **Data freshness** : délai depuis la dernière mise à jour vs SLA
- **Row count delta** : variation anormale (+/- 20 %) → alerte
- **Null rate** par colonne critique
- **Durée d'exécution** : dépassement de P95 → alerte Slack/PagerDuty
- **Coût de compute** : budget alert sur BigQuery slots ou EMR

---

## 9. Idempotence et résilience

```python
# Upsert idempotent avec DuckDB
conn.execute("""
    INSERT OR REPLACE INTO orders SELECT * FROM staging_orders
    WHERE order_id NOT IN (SELECT order_id FROM orders WHERE updated_at >= ?)
""", [run_date])
```

- **Backfill** : toujours prévoir `--start-date` / `--end-date` pour rejouer l'historique
- **Retry avec backoff** : `retries=3, retry_exponential_backoff=True` dans Airflow
- **Schema evolution** : Iceberg/Delta Lake gèrent `ADD COLUMN` sans réécriture ; documenter la compatibilité backward/forward dans les ADRs
- **Dead-letter queue** : messages Kafka non traitables → topic `*.dlq` pour traitement manuel

---

## Garde-fous et anti-patterns

| Anti-pattern | Problème | Alternative |
|---|---|---|
| `SELECT *` en production | Rupture si schéma change | Lister explicitement les colonnes |
| Insert sans déduplication | Doublons silencieux | `MERGE` / `INSERT OR REPLACE` / `unique_key` dbt |
| Transformation dans l'ingestion | Perte du raw, non-rejouable | Toujours stocker le raw avant de transformer |
| Timeouts sans retry | Perte silencieuse de données | Retry + dead-letter queue |
| Partitions trop fines | Small files → lenteur de lecture | Compaction + partitioning par jour/semaine |
| Secrets dans le code | Fuite de credentials | Vault, AWS Secrets Manager, Airflow Connections |
| Pipeline monolithique | Impossible à déboguer | Découper en tâches atomiques testables |
| Pas de lineage | Debugging aveugle | dbt lineage, OpenLineage/Marquez, Dagster assets |
