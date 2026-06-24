---
name: dev-data-validation-helper
description: Validation et qualité des données dans les pipelines. Se déclenche avec "data quality", "validation des données", "data contract", "schema validation", "Great Expectations", "données incorrectes", "data testing".
---

# Data Validation Helper

## Workflow en 8 étapes

### 1. Inventaire et règles métier
- Lister chaque colonne : type attendu, nullabilité, plage (min/max), format (regex, pattern date), unicité, enum de valeurs autorisées.
- Documenter dans un fichier versionné (`expectations.yaml`, `schema.yaml` ou `conftest.py`).
- Critère clé : distinguer **règle bloquante** (type incorrect, PK dupliquée) de **warning tolerable** (outlier statistique, valeur rare).

### 2. Schema validation — fail fast

**JSON Schema (API REST) :**
```python
from jsonschema import validate, ValidationError

schema = {
    "type": "object",
    "properties": {
        "user_id": {"type": "integer"},
        "email":   {"type": "string", "format": "email"},
        "amount":  {"type": "number",  "minimum": 0}
    },
    "required": ["user_id", "email", "amount"]
}

try:
    validate(instance=payload, schema=schema)
except ValidationError as e:
    raise ValueError(f"Payload invalide : {e.message}")
```

**Pydantic v2 (Python objects) :**
```python
from pydantic import BaseModel, field_validator
from decimal import Decimal

class Transaction(BaseModel):
    user_id: int
    amount: Decimal
    currency: str

    @field_validator("currency")
    @classmethod
    def check_currency(cls, v: str) -> str:
        if v not in {"TND", "EUR", "USD"}:
            raise ValueError(f"Devise inconnue : {v}")
        return v
```

**Pandera (DataFrames) :**
```python
import pandera as pa

schema = pa.DataFrameSchema({
    "user_id": pa.Column(int,  nullable=False),
    "amount":  pa.Column(float, pa.Check.ge(0)),
    "status":  pa.Column(str,  pa.Check.isin(["pending","done","failed"]))
})

validated_df = schema.validate(df, lazy=True)  # lazy=True collecte toutes les erreurs
```

### 3. Dimensions de qualité à mesurer

| Dimension     | Métrique cible       | Requête type                                      |
|---------------|----------------------|---------------------------------------------------|
| Complétude    | % non-null ≥ 99 %    | `COUNT(*) - COUNT(col) > 0`                       |
| Unicité       | doublons = 0         | `COUNT(*) != COUNT(DISTINCT id)`                  |
| Exactitude    | valeurs dans plage   | `amount < 0 OR amount > 1e7`                      |
| Fraîcheur     | lag ≤ SLA            | `MAX(updated_at) < NOW() - INTERVAL '2 hours'`    |
| Cohérence     | FK valide            | `t.status = 'paid' AND t.paid_at IS NULL`         |

### 4. Framework — choix selon contexte

| Contexte                   | Outil recommandé           | Raison                                    |
|----------------------------|----------------------------|-------------------------------------------|
| SQL/dbt                    | **dbt tests**              | natif dans le DAG, zéro overhead          |
| DataFrame Python           | **pandera**                | typage fort, intégration pytest           |
| Pipeline de données riche  | **Great Expectations**     | data docs, checkpoints réutilisables      |
| Déclaratif simple          | **Soda Core**              | SodaCL lisible par les non-développeurs   |
| Kafka / Avro               | **Confluent Schema Registry** | enforcement côté broker               |

**dbt schema.yml :**
```yaml
models:
  - name: transactions
    columns:
      - name: id
        tests: [not_null, unique]
      - name: status
        tests:
          - accepted_values:
              values: ["pending", "done", "failed"]
      - name: user_id
        tests:
          - relationships:
              to: ref('users')
              field: id
```

**Great Expectations — checkpoint minimal :**
```python
import great_expectations as gx

context = gx.get_context()
batch = context.sources.pandas_default.read_dataframe(df)
suite  = context.add_expectation_suite("transactions_suite")

batch.expect_column_values_to_not_be_null("user_id")
batch.expect_column_values_to_be_between("amount", min_value=0, max_value=1_000_000)
batch.expect_column_values_to_be_in_set("status", ["pending","done","failed"])

result = context.run_checkpoint(checkpoint_name="daily_check")
if not result["success"]:
    raise RuntimeError("Checkpoint GE échoué — données en quarantaine.")
```

### 5. Tests statistiques et détection de dérive

```python
from scipy.stats import ks_2samp
import numpy as np

# Comparer la distribution actuelle vs référence (baseline)
stat, p_value = ks_2samp(baseline_amounts, current_amounts)
if p_value < 0.05:
    alert(f"Dérive détectée sur 'amount' (KS p={p_value:.4f})")

# Outliers IQR
q1, q3 = np.percentile(df["amount"], [25, 75])
iqr = q3 - q1
outliers = df[(df["amount"] < q1 - 1.5 * iqr) | (df["amount"] > q3 + 1.5 * iqr)]
```

Surveillance en continu : calculer les percentiles p50/p95/p99 par fenêtre temporelle et alerter si la variation dépasse ±20 % de la baseline glissante.

### 6. Data contracts

Structure minimale d'un contrat (YAML versionné dans le repo) :
```yaml
contract_version: "1.2.0"
producer: "payment-service"
consumer: "analytics-pipeline"
schema_ref: "schemas/transactions_v3.avsc"
sla:
  freshness_minutes: 30
  completeness_pct: 99.5
  max_duplicates: 0
breaking_change_policy: "deprecation 30 jours, migration guide obligatoire"
```

Utiliser le **Schema Registry** (Confluent ou AWS Glue) pour enforcer côté broker :
```bash
# Vérifier la compatibilité avant deploy
curl -X POST http://schema-registry:8081/compatibility/subjects/transactions-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "<nouveau_schema_json_escaped>"}'
```

### 7. Intégration pipeline — quarantaine et alertes

```python
valid_rows   = df[validation_mask]
invalid_rows = df[~validation_mask].assign(quarantine_reason=error_series)

# Route vers dead-letter table
invalid_rows.to_sql("bad_data", engine, if_exists="append", index=False)

# Alerte si taux d'erreur dépasse le seuil
error_rate = len(invalid_rows) / len(df)
if error_rate > 0.02:   # seuil bloquant : 2 %
    raise PipelineError(f"Taux d'erreur critique : {error_rate:.1%}")
elif error_rate > 0.001: # warning : 0.1 %
    send_slack_alert(f"⚠️ Taux d'erreur : {error_rate:.1%} — vérifier bad_data")
```

### 8. Reporting et suivi

- **Great Expectations Data Docs** : générer avec `context.build_data_docs()`, exposer via S3 ou pages Git.
- **Grafana** : stocker les métriques de qualité dans Prometheus/InfluxDB, dashboards par pipeline.
- **dbt artifacts** : `manifest.json` + `run_results.json` → alimentation d'un catalogue (DataHub, Atlan).
- KPI à suivre : score de qualité global (%), volumétrie par statut (valid/quarantine/error), évolution sur 30 jours, top 5 violations par colonne.

---

## Garde-fous et anti-patterns

| Anti-pattern                                         | Conséquence                          | Correction                                    |
|------------------------------------------------------|--------------------------------------|-----------------------------------------------|
| Valider uniquement en fin de pipeline                | Transformations coûteuses sur des données invalides | Valider à chaque étape d'ingestion  |
| `raise` immédiat à la première erreur (`strict`)     | Perte de visibilité sur le volume total de violations | `lazy=True` dans pandera, `--store-failures` dans dbt |
| Thresholds figés en dur dans le code                 | Faux positifs/négatifs au fil du temps | Externaliser dans un fichier de config versionné |
| Ignorer la dead-letter queue                         | Données perdues, non-conformité       | Processer + alerter systématiquement           |
| Pas de versioning de schéma                          | Breaking change silencieux            | Semantic versioning + backward-compat policy   |
| Valider la structure mais pas la sémantique          | `amount=0.0` valide techniquement mais absurde métier | Ajouter des règles métier explicites  |
| Validateur non idempotent                            | Résultats inconsistants sur re-run    | Garantir que re-valider les mêmes données = mêmes résultats |

## Bonnes pratiques 2026

- **Contract-first** : définir le contrat avant d'écrire le pipeline, pas après.
- **Shift-left** : valider dès l'API d'ingestion (Pydantic), pas seulement dans le warehouse.
- **Observabilité data** : traiter la qualité comme un SLO — budget d'erreur, alertes PagerDuty si dépassement.
- **Tests de non-régression** : rejouer les jeux de données historiques après chaque changement de schéma.
- **LLM-assisted validation (2025+)** : utiliser un LLM pour générer des règles candidats depuis un échantillon de données, valider manuellement avant promotion en production.


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
