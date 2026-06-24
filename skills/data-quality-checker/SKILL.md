---
name: data-quality-checker
description: Vérification de la qualité des données — complétude, cohérence, unicité, validité et fraîcheur. À utiliser quand l'utilisateur doit valider des données, détecter des anomalies ou mettre en place des contrôles qualité sur des pipelines de données. Se déclenche aussi avec "qualité des données", "data quality", "données manquantes", "doublons", "validation de données", "anomalie données", "contrôle qualité data".
---

# Vérificateur de Qualité des Données

## Workflow en 5 étapes

### 1. Profiler les données

Avant tout check, explorer la structure et la distribution réelle.

```sql
-- Profil rapide d'une table (PostgreSQL / SQL Server compatible)
SELECT
    column_name,
    data_type,
    COUNT(*)                                                        AS total_rows,
    SUM(CASE WHEN column_name IS NULL THEN 1 ELSE 0 END)           AS null_count,
    COUNT(DISTINCT column_name)                                     AS distinct_count
FROM information_schema.columns
WHERE table_name = 'orders'
GROUP BY column_name, data_type;
```

```python
# Profil pandas — snapshot en 3 lignes
import pandas as pd
df = pd.read_sql("SELECT * FROM orders LIMIT 500000", con=engine)
print(df.describe(include="all"))
print(df.isnull().mean().sort_values(ascending=False))  # taux nullité par col
```

### 2. Définir les règles de qualité

Chaque règle doit avoir : **dimension**, **seuil warning**, **seuil error**, **justification métier**.

| Dimension | Question | Seuil warning | Seuil error |
|-----------|----------|---------------|-------------|
| **Complétude** | Valeurs NULL ? | > 1 % | > 5 % |
| **Unicité** | Doublons ? | > 0 | > 0 (clés primaires) |
| **Validité** | Format/plage respectés ? | > 0,5 % invalides | > 2 % |
| **Cohérence** | Jointures orphelines ? | > 0 | > 0 (FK obligatoires) |
| **Fraîcheur** | Données périmées ? | > 12 h | > 24 h |
| **Volume** | Nombre de lignes anormal ? | ± 20 % vs veille | ± 50 % |

### 3. Implémenter les checks SQL

#### Complétude
```sql
-- Taux de nullité multi-colonnes (SQL Server / PostgreSQL)
SELECT
    col,
    COUNT(*)                                                                 AS total,
    SUM(CASE WHEN val IS NULL THEN 1 ELSE 0 END)                            AS nulls,
    ROUND(100.0 * SUM(CASE WHEN val IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) AS null_pct
FROM (
    SELECT 'email'  AS col, email  AS val FROM customers UNION ALL
    SELECT 'phone'  AS col, phone  AS val FROM customers UNION ALL
    SELECT 'status' AS col, status AS val FROM customers
) t
GROUP BY col
ORDER BY null_pct DESC;
```

#### Unicité
```sql
-- Doublons sur clé composite
SELECT order_id, customer_id, COUNT(*) AS nb
FROM orders
GROUP BY order_id, customer_id
HAVING COUNT(*) > 1
ORDER BY nb DESC;
```

#### Validité
```sql
-- Valeurs hors plage / enum invalide
SELECT COUNT(*) AS invalid_rows
FROM orders
WHERE amount    <= 0
   OR amount    > 999999
   OR order_date > CURRENT_DATE
   OR status    NOT IN ('pending','processing','completed','cancelled');

-- Format email (PostgreSQL)
SELECT email FROM customers
WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
```

#### Cohérence (intégrité référentielle)
```sql
-- Commandes orphelines (sans client)
SELECT o.order_id, o.customer_id
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE c.id IS NULL;

-- Incohérence logique : date livraison avant date commande
SELECT order_id, order_date, delivery_date
FROM orders
WHERE delivery_date < order_date;
```

#### Fraîcheur
```sql
-- Alerte si table non alimentée depuis N heures
SELECT
    'orders'                                                            AS tbl,
    MAX(updated_at)                                                     AS last_update,
    DATEDIFF(MINUTE, MAX(updated_at), GETUTCDATE())                     AS minutes_lag
FROM orders
HAVING DATEDIFF(MINUTE, MAX(updated_at), GETUTCDATE()) > 60;
-- PostgreSQL : remplacer DATEDIFF(...) par EXTRACT(EPOCH FROM (NOW()-MAX(updated_at)))/60
```

#### Anomalie de volume
```sql
-- Comparer le volume du jour J vs J-1
SELECT
    CAST(created_at AS DATE) AS day,
    COUNT(*)                  AS row_count,
    LAG(COUNT(*)) OVER (ORDER BY CAST(created_at AS DATE)) AS prev_day,
    ROUND(100.0 * (COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY CAST(created_at AS DATE)))
          / NULLIF(LAG(COUNT(*)) OVER (ORDER BY CAST(created_at AS DATE)), 0), 1) AS pct_change
FROM orders
GROUP BY CAST(created_at AS DATE)
ORDER BY day DESC;
```

### 4. Automatiser avec un framework

#### Great Expectations (Python)
```bash
pip install great_expectations
great_expectations init
```

```python
import great_expectations as gx

context = gx.get_context()
ds = context.sources.add_pandas("orders_ds")
da = ds.add_dataframe_asset("orders")
batch = da.add_batch_definition_whole_dataframe("batch").get_batch(
    batch_parameters={"dataframe": df}
)

suite = context.add_expectation_suite("orders_suite")
suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="customer_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeUnique(column="order_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(
    column="amount", min_value=0.01, max_value=999999.99
))
suite.add_expectation(gx.expectations.ExpectTableRowCountToBeBetween(
    min_value=1000, max_value=10_000_000
))

results = batch.validate(suite)
print(results.success)  # False = au moins une règle KO
```

#### dbt tests (si stack dbt)
```yaml
# models/schema.yml
models:
  - name: orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: amount
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0.01
              max_value: 999999
      - name: status
        tests:
          - accepted_values:
              values: ['pending','processing','completed','cancelled']
      - name: customer_id
        tests:
          - relationships:
              to: ref('customers')
              field: id
```

```bash
dbt test --select orders  # lancer les checks
dbt test --select orders --store-failures  # stocker les lignes KO dans la BDD
```

### 5. Monitorer et alerter

- Stocker les résultats dans une **table de métriques qualité** (date, table, dimension, valeur, statut).
- Brancher un dashboard (Grafana, Metabase) sur cette table.
- Déclencher une alerte (Slack, email, PagerDuty) si `statut = ERROR`.

```sql
-- Table de suivi recommandée
CREATE TABLE dq_metrics (
    run_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    table_name     VARCHAR(100),
    dimension      VARCHAR(50),   -- completeness / uniqueness / validity / ...
    metric_name    VARCHAR(100),
    metric_value   DECIMAL(18,4),
    threshold_warn DECIMAL(18,4),
    threshold_err  DECIMAL(18,4),
    status         VARCHAR(10)    -- OK / WARN / ERROR
);
```

## Garde-fous et anti-patterns

| Piège | Bonne pratique |
|-------|---------------|
| Checker seulement en amont (ingestion) | Checker aussi **après** les transformations |
| Seuils identiques pour toutes les colonnes | Adapter les seuils au **contexte métier** (email optionnel ≠ FK obligatoire) |
| Bloquer le pipeline sur tout KO | Distinguer **warning** (log + continue) vs **error** (arrêt pipeline) |
| Ignorer les valeurs vides `""` vs NULL | Traiter les deux : `IS NULL OR TRIM(col) = ''` |
| Checks ponctuels sans historique | Stocker les métriques pour détecter les **dérives graduelles** |
| Valider uniquement le schéma | Valider aussi les **distributions** (z-score, percentiles) |
| Checks trop lents sur grande table | Utiliser le **sampling** sur > 100 M lignes (`TABLESAMPLE 1 PERCENT`) |

## Critères de choix d'outil

| Contexte | Outil recommandé |
|----------|-----------------|
| Stack Python/Pandas ad hoc | Great Expectations |
| Pipeline dbt existant | dbt tests + dbt-utils |
| SQL pur, sans dépendance | Requêtes custom + table `dq_metrics` |
| Scala/Spark | Deequ (AWS) ou spark-dq |
| Cloud AWS | AWS Glue Data Quality |
| Cloud Azure | Azure Purview / DQ rules |


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
