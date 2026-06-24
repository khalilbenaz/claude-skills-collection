---
name: data-data-governance-guide
description: Gouvernance des données incluant catalogues, lineage, qualité, ownership, politiques et metadata management. Se déclenche avec "data governance", "gouvernance données", "data catalog", "data lineage", "metadata", "data ownership"
---

# Data Governance Guide

## Étape 1 — Poser le cadre organisationnel

Avant tout outil, définir les rôles et la charte de gouvernance.

| Rôle | Périmètre | Exemple concret |
|---|---|---|
| **Data Owner** | Responsabilité métier & budget | CFO pour les données financières |
| **Data Steward** | Qualité, définitions, règles | Analyste BI du domaine |
| **Data Custodian** | Stockage, sécurité, accès technique | DBA / Data Engineer |
| **Data Consumer** | Utilisation conforme aux politiques | Analyste, Data Scientist |

Charte minimale (artefact à créer dès le kick-off) :
```
1. Périmètre couvert (domaines métier)
2. Instances de décision (Data Governance Council — cadence mensuelle)
3. Processus d'escalade qualité
4. Politique de classification des données
5. Indicateurs de succès (KPIs)
```

**Critère de passage :** chaque dataset critique a un Data Owner nommé et joignable.

---

## Étape 2 — Déployer le Data Catalog

**Choix de l'outil selon le contexte :**

| Contexte | Outil recommandé |
|---|---|
| Open-source / budget limité | **DataHub** (LinkedIn), Apache Atlas |
| Cloud AWS | **AWS Glue Data Catalog** + DataHub |
| Cloud Azure | **Microsoft Purview** |
| Cloud GCP | **Dataplex** |
| Enterprise avec budget | Collibra, Alation |
| Stack dbt | **dbt Docs** + Elementary |

**Ingestion automatique avec DataHub :**
```bash
pip install acryl-datahub

# Crawler PostgreSQL
datahub ingest -c postgres_recipe.yaml
```

```yaml
# postgres_recipe.yaml
source:
  type: postgres
  config:
    host_port: "localhost:5432"
    database: "my_db"
    username: "datahub"
    password: "${POSTGRES_PASSWORD}"
    include_tables: true
    profile_patterns:
      allow: ["public.*"]

sink:
  type: datahub-rest
  config:
    server: "http://datahub-gms:8080"
```

**Métadonnées minimales obligatoires par dataset :**
- Description métier (en langage non-technique)
- Data Owner + Data Steward
- Niveau de classification (public / interne / confidentiel / restreint)
- Schéma avec descriptions des colonnes
- Fréquence de mise à jour + SLA de fraîcheur
- Tags domaine métier

---

## Étape 3 — Cartographier le Data Lineage

**Avec dbt (lineage automatique) :**
```bash
dbt docs generate
dbt docs serve  # UI interactive avec graphe de lineage
```

**Lineage programmatique via DataHub SDK :**
```python
from datahub.emitter.mce_builder import make_dataset_urn
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import DatasetLineageTypeClass, UpstreamClass, UpstreamLineageClass

emitter = DatahubRestEmitter("http://datahub-gms:8080")

upstream_lineage = UpstreamLineageClass(
    upstreams=[
        UpstreamClass(
            dataset=make_dataset_urn("postgres", "prod.orders"),
            type=DatasetLineageTypeClass.TRANSFORMED,
        )
    ]
)
# émettre vers DataHub
```

**Règle critique :** avant toute modification de schéma, exécuter l'analyse d'impact :
```bash
# dbt — lister les modèles dépendants d'une colonne supprimée
dbt ls --select "orders+"  # tout ce qui dépend de 'orders'
```

---

## Étape 4 — Qualité des données (Data Quality)

**Framework Great Expectations — setup rapide :**
```bash
pip install great-expectations
great_expectations init
great_expectations suite new
```

**Expectations copiables :**
```python
import great_expectations as gx

context = gx.get_context()
ds = context.sources.add_pandas("my_ds")
da = ds.add_dataframe_asset("orders")
batch = da.add_batch_definition_whole_dataframe("batch").get_batch()

suite = context.suites.add(gx.ExpectationSuite(name="orders_suite"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="order_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(column="amount", min_value=0))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeUnique(column="order_id"))
```

**Tests dbt (intégrer dans le pipeline CI/CD) :**
```yaml
# models/orders.yml
models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - not_null
          - unique
      - name: status
        tests:
          - accepted_values:
              values: ['pending', 'shipped', 'delivered', 'cancelled']
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('customers')
              field: id
```

**Dimensions de qualité à mesurer :**

| Dimension | Mesure | Seuil acceptable |
|---|---|---|
| Complétude | % champs non-null sur colonnes critiques | > 99 % |
| Unicité | % de doublons sur clés primaires | 0 % |
| Exactitude | % de valeurs dans les plages attendues | > 98 % |
| Fraîcheur | Écart vs SLA de mise à jour | < 1 heure (transactionnel) |
| Cohérence | Intégrité référentielle cross-datasets | 100 % |

---

## Étape 5 — Classification et protection des données

**Niveaux de classification :**
```
PUBLIC      → données accessibles librement (ex : tarifs publics)
INTERNAL    → usage interne uniquement (ex : rapports de vente)
CONFIDENTIAL → accès restreint par rôle (ex : données RH)
RESTRICTED  → chiffrement + audit log + accès nominatif (ex : données PII, PCI)
```

**Masquage PII avec Python (anonymisation one-way) :**
```python
import hashlib

def mask_email(email: str) -> str:
    """Pseudonymisation RGPD-compatible par hachage."""
    return hashlib.sha256(email.lower().encode()).hexdigest()[:16] + "@masked.local"

def mask_phone(phone: str) -> str:
    return phone[:3] + "****" + phone[-2:]
```

**Politique de rétention (modèle) :**
```
Données transactionnelles    : 7 ans (obligations légales)
Logs applicatifs             : 90 jours
Données de session           : 30 jours
Données marketing / cookies  : 13 mois (RGPD)
Données RH                   : durée du contrat + 5 ans
```

---

## Étape 6 — Data Contracts

Un data contract formalise le SLA entre un producteur et ses consommateurs.

```yaml
# data_contract_orders.yaml
id: orders-v2
version: "2.1.0"
owner: team-commerce
domain: commerce

schema:
  - name: order_id
    type: integer
    required: true
    unique: true
  - name: amount
    type: float
    required: true
    minimum: 0

sla:
  freshness: 15min          # délai max entre source et destination
  availability: 99.9%
  completeness: 99%

contact:
  owner: commerce@company.com
  slack: "#team-commerce-data"
```

Outils : **Soda Data Contracts**, **OpenDataContracts** (spec open-source), **dbt contracts** (dbt Core 1.5+).

```yaml
# dbt model contract
models:
  - name: orders
    config:
      contract:
        enforced: true
    columns:
      - name: order_id
        data_type: integer
        constraints:
          - type: not_null
          - type: unique
```

---

## Étape 7 — KPIs de gouvernance (tableau de bord mensuel)

```sql
-- Couverture catalogue (% datasets documentés)
SELECT
    COUNT(*) FILTER (WHERE description IS NOT NULL AND owner IS NOT NULL) * 100.0 / COUNT(*) AS coverage_pct
FROM catalog.datasets;

-- Score qualité global (agrégat de toutes les suites GE)
SELECT
    suite_name,
    AVG(success_percent) AS avg_quality_score
FROM data_quality.run_results
WHERE run_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY suite_name
ORDER BY avg_quality_score ASC;
```

**KPIs cibles :**
- Couverture catalogue : > 80 % des datasets critiques documentés
- Score qualité global : > 95 %
- Incidents de qualité non détectés en production : 0
- Temps moyen de résolution d'un incident qualité : < 4 h

---

## Anti-patterns / Pièges

**Gouvernance top-down sans adhésion terrain** — Si les équipes data ne voient pas la valeur, le catalogue devient obsolète en 3 mois. Impliquer les Data Stewards dès le départ, montrer les gains concrets (moins d'incidents, moins de questions répétées).

**Tout cataloguer d'un coup** — Commencer par les 20-30 datasets les plus critiques (80 % de la valeur), pas par l'exhaustivité. Prioriser par usage business réel.

**Qualité sans ownership** — Une alerte de qualité sans responsable assigné n'est jamais corrigée. Chaque règle de qualité doit avoir un Data Steward notifié automatiquement.

**Data lineage manuel** — Le lineage documenté à la main est toujours faux à J+30. Utiliser uniquement des outils qui capturent le lineage automatiquement (dbt, Airflow, Spark listeners, OpenLineage).

**Politique de rétention sans suppression effective** — Écrire la politique sans automatiser la suppression est un risque RGPD. Implémenter les jobs de purge dès le départ, pas après.

**Classification à la main à grande échelle** — Au-delà de 100 datasets, utiliser des outils de découverte automatique (AWS Macie, Microsoft Purview scanner, Google DLP) pour détecter PII/PHI/PCI.

---

## Bonnes pratiques 2026

- **OpenLineage** comme standard de lineage inter-outils (Airflow, Spark, dbt supportent nativement le format Marquez/OpenLineage).
- **dbt Mesh** pour la gouvernance inter-domaines : chaque domaine expose des `public models` avec contrats enforced, les autres domaines ne consomment qu'au travers de ces interfaces stables.
- **Data Mesh organisationnel** : gouvernance fédérée avec standards centraux (catalog, qualité, classification) mais ownership décentralisé par domaine métier.
- **Shift-left quality** : les contrôles de qualité s'exécutent dans la CI/CD avant merge, pas seulement en production.
- **Policies-as-code** : versionner les politiques d'accès (ex : Apache Ranger policies en YAML dans Git) pour auditabilité et rollback.


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
