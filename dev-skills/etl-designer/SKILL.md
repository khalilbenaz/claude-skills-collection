---
name: etl-designer
description: Conception de processus ETL/ELT pour l'intégration de données. Se déclenche avec "ETL", "ELT", "extraction", "transformation", "load", "data integration", "data warehouse", "SSIS", "Talend", "Informatica". Also triggers on "ETL process", "ELT design", "data integration job".
---

# ETL Designer

## Workflow en étapes

### 1. Analyse des sources et destinations
- Inventorier chaque source : type (SGBD, API REST, fichier plat, Kafka, SaaS), volume moyen/max, fréquence de rafraîchissement, contraintes d'accès réseau, latence acceptable.
- Identifier la destination : data warehouse (Snowflake, BigQuery, Redshift, SQL Server DWH), data lake (S3, ADLS), data mart ou base opérationnelle.
- Consigner les SLA de fraîcheur (batch quotidien, quasi-temps-réel <5 min, streaming) et les fenêtres de maintenance source.

### 2. Choix ETL vs ELT

| Critère | ETL | ELT |
|---|---|---|
| Puissance de la destination | faible (on-prem DWH) | forte (Snowflake, BigQuery) |
| Données sensibles | masquage/anonymisation tôt | plus difficile à isoler |
| Flexibilité exploration | faible | forte (raw zone conservée) |
| Coût compute | moteur ETL dédié | warehouse paie la transformation |

**Décision à documenter** : justifier le choix dans un ADR ou un commentaire de pipeline.

### 3. Extraction

**Full load** — snapshot complet ; simple, utiliser quand la table source est petite (<1 M lignes) ou sans colonne de delta fiable.

**Incrémental par timestamp/ID** :
```sql
-- Extraction SQL incrémentale
SELECT *
FROM source_table
WHERE updated_at > :last_run_ts
  AND updated_at <= :current_run_ts
ORDER BY updated_at;
```

**CDC (Change Data Capture)** — Debezium sur PostgreSQL/MySQL/SQL Server, Oracle GoldenGate, AWS DMS. Capturer INSERT/UPDATE/DELETE sans polling. Nécessite que le WAL ou le binlog soit activé.

**Extraction API paginée (Python)** :
```python
def extract_all_pages(url, headers, page_size=200):
    results, cursor = [], None
    while True:
        params = {"limit": page_size, **({"cursor": cursor} if cursor else {})}
        r = requests.get(url, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        results.extend(data["items"])
        cursor = data.get("next_cursor")
        if not cursor:
            break
    return results
```

### 4. Transformation

Ordre recommandé :
1. **Nettoyage** — trim, normalisation casse, formats dates (ISO 8601), suppression des caractères invalides.
2. **Déduplication** — window function sur clé naturelle + `ROW_NUMBER()`.
3. **Enrichissement** — lookup tables, API tiers (géocodage, scoring).
4. **Mapping de codes** — table de correspondance versionnée en base ou fichier YAML.
5. **Calcul de KPIs** — uniquement en fin de chaîne, sur données propres.

```sql
-- Déduplication avec window function
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY updated_at DESC) AS rn
  FROM staging.orders
)
INSERT INTO dw.orders
SELECT * EXCLUDE (rn) FROM ranked WHERE rn = 1;
```

### 5. Stratégie de chargement (Loading)

| Mode | Quand l'utiliser | Snippet |
|---|---|---|
| Full refresh | petits référentiels, pas de SCD | `TRUNCATE + INSERT` |
| Upsert/Merge | tables transactionnelles, clé naturelle stable | `MERGE` SQL ou `INSERT … ON CONFLICT` |
| SCD Type 1 | on écrase, pas d'historique requis | UPDATE direct |
| SCD Type 2 | historisation obligatoire (audit, BI temps) | colonnes `valid_from`, `valid_to`, `is_current` |
| Append-only | événements immuables (logs, factures) | `INSERT` pur |

```sql
-- MERGE Snowflake / SQL Server
MERGE INTO dw.customers AS tgt
USING staging.customers AS src
  ON tgt.customer_id = src.customer_id
WHEN MATCHED THEN
  UPDATE SET tgt.email = src.email, tgt.updated_at = src.updated_at
WHEN NOT MATCHED THEN
  INSERT (customer_id, email, created_at, updated_at)
  VALUES (src.customer_id, src.email, src.created_at, src.updated_at);
```

### 6. Error handling & idempotence

- **Retry avec backoff exponentiel** sur erreurs transitoires (timeout, rate-limit 429).
- **Dead letter table** pour les enregistrements invalides : stocker la ligne brute + message d'erreur + timestamp + job_id.
- **Idempotence** : chaque run sur le même intervalle temporel doit produire exactement le même résultat — utiliser une fenêtre `[start_ts, end_ts[` explicite passée en paramètre.
- **Table de réconciliation** : compter source vs destination après chaque chargement.

```python
# Réconciliation source vs destination
def reconcile(src_count: int, dst_count: int, tolerance_pct: float = 0.01):
    diff_pct = abs(src_count - dst_count) / max(src_count, 1)
    if diff_pct > tolerance_pct:
        raise ValueError(f"Reconciliation failed: src={src_count}, dst={dst_count}, diff={diff_pct:.1%}")
```

### 7. Performance

- **Bulk loading** : préférer `COPY INTO` (Snowflake), `LOAD DATA INFILE` (MySQL), `bcp` ou `BULK INSERT` (SQL Server) aux `INSERT` ligne par ligne.
- **Partitionner** les fichiers intermédiaires (Parquet, ORC) par date ou entité avant chargement.
- **Paralléliser** l'extraction : diviser par partition, shard ou plage de dates ; utiliser `ThreadPoolExecutor` ou Spark.
- **Comprimer** les fichiers en transit (gzip, snappy) pour réduire le temps de transfert réseau.
- **Indexer** uniquement les colonnes de jointure et de filtre sur la table destination — pas d'index sur toutes les colonnes.

```python
# Chargement bulk Snowflake via connector
conn.cursor().execute(f"""
  COPY INTO {schema}.{table}
  FROM @my_stage/{filename}.parquet.gz
  FILE_FORMAT = (TYPE=PARQUET)
  PURGE = TRUE
""")
```

### 8. Orchestration & monitoring

**Outils** : Apache Airflow (DAG Python), Dagster (assets), dbt Cloud (scheduling dbt), Prefect, SSIS (on-prem legacy).

**DAG Airflow minimal** :
```python
from airflow.decorators import dag, task
from pendulum import datetime

@dag(schedule="0 3 * * *", start_date=datetime(2026, 1, 1), catchup=False)
def orders_etl():
    @task
    def extract(): ...

    @task
    def transform(raw): ...

    @task
    def load(clean): ...

    load(transform(extract()))

orders_etl()
```

**Monitoring obligatoire** :
- Durée d'exécution par étape (comparer à la baseline).
- Volumes extraits/chargés (alerte si ±20 % de la moyenne mobile).
- Data lineage tracé (outil : OpenLineage / Marquez, dbt docs).
- SLA de fraîcheur : alerter si la table destination n'est pas mise à jour dans la fenêtre attendue.

---

## Garde-fous & anti-patterns

| Anti-pattern | Problème | Solution |
|---|---|---|
| `SELECT *` en extraction sans schéma fixé | rupture silencieuse à l'ajout de colonnes | sélectionner les colonnes explicitement, versionner le schéma |
| Transformation dans la requête d'extraction | couplage fort, difficile à tester | séparer extraction brute et transformation |
| Chargement sans idempotence | doublons à chaque retry | fenêtre temporelle explicite + upsert ou truncate |
| Pas de dead letter | perte silencieuse d'enregistrements invalides | table d'erreurs systématique |
| ETL monolithique sans étapes atomiques | rollback impossible en cas d'échec partiel | découper en tâches redémarrables indépendamment |
| Secrets hard-codés dans le code | fuite de credentials | variables d'environnement ou vault (AWS Secrets Manager, Azure Key Vault) |
| Ignorer les fuseaux horaires | décalages silencieux autour du changement d'heure | stocker et transmettre en UTC, convertir en aval |

## Bonnes pratiques 2026

- **Contract-first** : définir un contrat de schéma (JSON Schema, Avro, Protobuf) entre source et pipeline ; valider dès l'extraction.
- **Data observability** : intégrer un outil comme Great Expectations ou Soda pour des tests de qualité automatisés à chaque run.
- **Metadata-driven ETL** : piloter les pipelines par configuration (YAML/DB) plutôt que par duplication de code.
- **Least privilege** : chaque job utilise un compte dédié avec droits minimaux (lecture seule sur la source, écriture uniquement sur le schéma de staging).
- **Gestion de la dette technique** : documenter les workarounds source (champs mal typés, encodages exotiques) dans un fichier `QUIRKS.md` versionné à côté du pipeline.
