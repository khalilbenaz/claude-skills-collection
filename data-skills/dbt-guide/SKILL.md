---
name: dbt-guide
description: Transformation de données avec dbt — models, tests, sources, macros et documentation automatisée. Se déclenche avec "dbt", "data build tool", "dbt model", "dbt test", "transformation de données dbt". Also triggers on "dbt models", "dbt tests", "transform data with dbt".
---

# Guide dbt

## Workflow

### 1. Initialiser et structurer le projet

```bash
dbt init mon_projet        # crée le squelette
cd mon_projet
dbt debug                  # vérifie la connexion au warehouse
```

Arborescence cible :
```
models/
  staging/         ← nettoyage source, renommage, cast ; materialisation = view
  intermediate/    ← jointures, logique métier complexe ; materialisation = view ou ephemeral
  marts/           ← modèles finaux consommables ; materialisation = table
macros/
tests/
seeds/
snapshots/
```

`dbt_project.yml` — materialisations par dossier :
```yaml
models:
  mon_projet:
    staging:
      +materialized: view
      +schema: staging
    intermediate:
      +materialized: view
    marts:
      +materialized: table
      +schema: marts
```

---

### 2. Déclarer les sources

```yaml
# models/staging/sources.yml
version: 2
sources:
  - name: raw_crm
    schema: raw
    freshness:
      warn_after: {count: 12, period: hour}
      error_after: {count: 24, period: hour}
    loaded_at_field: _loaded_at
    tables:
      - name: orders
        description: "Commandes brutes issues du CRM"
        columns:
          - name: order_id
            tests: [unique, not_null]
```

Référencer dans un modèle :
```sql
select * from {{ source('raw_crm', 'orders') }}
```

Tester la fraîcheur :
```bash
dbt source freshness
```

---

### 3. Développer les modèles

**Staging — un modèle par table source, préfixe `stg_` :**
```sql
-- models/staging/stg_orders.sql
with source as (
    select * from {{ source('raw_crm', 'orders') }}
),
renamed as (
    select
        order_id::varchar      as order_id,
        customer_id::int       as customer_id,
        created_at::timestamp  as created_at,
        status::varchar        as status
    from source
)
select * from renamed
```

**Mart — utilise `ref()` pour chaque dépendance :**
```sql
-- models/marts/fct_orders.sql
with orders as (
    select * from {{ ref('stg_orders') }}
),
customers as (
    select * from {{ ref('stg_customers') }}
)
select
    o.order_id,
    o.created_at,
    c.customer_name,
    o.status
from orders o
left join customers c on o.customer_id = c.customer_id
```

**Critères de choix de materialisation :**

| Cas | Materialisation recommandée |
|-----|----------------------------|
| Nettoyage léger / peu consommé | `view` |
| Rapport BI / dashboard | `table` |
| Table > 10M lignes avec clé temporelle | `incremental` |
| Sous-requête intermédiaire réutilisée | `ephemeral` |
| Suivi de changements type SCD2 | `snapshot` |

**Modèle incrémental :**
```sql
-- models/marts/fct_events.sql
{{ config(materialized='incremental', unique_key='event_id') }}

select * from {{ ref('stg_events') }}

{% if is_incremental() %}
  where event_at > (select max(event_at) from {{ this }})
{% endif %}
```

---

### 4. Tester les données

Fichier YAML associé à chaque modèle :
```yaml
# models/marts/fct_orders.yml
version: 2
models:
  - name: fct_orders
    description: "Faits commandes enrichis"
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: status
        tests:
          - accepted_values:
              values: ['pending', 'confirmed', 'shipped', 'cancelled']
      - name: customer_id
        tests:
          - relationships:
              to: ref('stg_customers')
              field: customer_id
```

Test custom SQL dans `tests/` :
```sql
-- tests/assert_no_negative_amount.sql
select order_id
from {{ ref('fct_orders') }}
where amount < 0
```

Commandes :
```bash
dbt test                          # tous les tests
dbt test --select fct_orders      # tests d'un modèle
dbt test --store-failures         # stocker les lignes en erreur dans le warehouse
```

---

### 5. Créer des macros

```sql
-- macros/generate_surrogate_key.sql
{% macro generate_surrogate_key(fields) %}
    {{ dbt_utils.generate_surrogate_key(fields) }}
{% endmacro %}

-- macros/audit_columns.sql
{% macro audit_columns() %}
    current_timestamp as dbt_loaded_at,
    '{{ invocation_id }}' as dbt_run_id
{% endmacro %}
```

Usage dans un modèle :
```sql
select
    {{ generate_surrogate_key(['order_id', 'customer_id']) }} as sk_order,
    order_id,
    {{ audit_columns() }}
from {{ ref('stg_orders') }}
```

---

### 6. Documenter

```yaml
models:
  - name: fct_orders
    description: >
      Faits commandes joints avec les clients.
      Utilisé par le dashboard Revenue dans Metabase.
    columns:
      - name: order_id
        description: "Identifiant unique de la commande (source CRM)"
```

```bash
dbt docs generate   # génère catalog.json
dbt docs serve      # ouvre le site sur localhost:8080
```

---

### 7. CI/CD et environnements

`profiles.yml` — deux targets :
```yaml
mon_projet:
  target: dev
  outputs:
    dev:
      type: snowflake
      schema: "dbt_{{ env_var('DBT_USER', 'dev') }}"
      ...
    prod:
      type: snowflake
      schema: marts
      ...
```

Pipeline CI (GitHub Actions) :
```yaml
- run: dbt build --target prod --select state:modified+  # uniquement les modèles modifiés et leurs dépendants
- run: dbt test  --target prod --select state:modified+
```

```bash
dbt build           # compile + run + test en une commande
dbt build --select +fct_orders   # modèle + tous ses ancêtres
dbt run --exclude tag:slow       # exclure les modèles lourds
```

---

## Anti-patterns / Pièges

| Piège | Correction |
|-------|-----------|
| `select *` en mart sans liste explicite | Lister les colonnes exposées, ça évite les régressions silencieuses |
| Table en dur dans un modèle SQL | Toujours `{{ ref() }}` ou `{{ source() }}` |
| Pas de `unique_key` sur un incrémental | Crée des doublons à chaque run ; définir `unique_key` obligatoirement |
| Tests YAML uniquement sur la PK | Tester aussi les FK (`relationships`), les valeurs acceptées et les colonnes NOT NULL métier |
| Incrémental sans stratégie full refresh | Ajouter `+full_refresh: false` en dev seulement ; prévoir `dbt run --full-refresh` planifié |
| Modèles staging qui joinent plusieurs sources | Un modèle staging = une source ; les jointures vont en `intermediate/` |
| Documentation rédigée après-coup | Écrire description + tests en même temps que le modèle, sinon jamais fait |
| `dbt run` en prod sans `dbt test` | Utiliser `dbt build` qui enchaîne les deux et stoppe à la première erreur |

---

## Bonnes pratiques 2026

- **dbt Core ≥ 1.8** : utiliser `dbt_project.yml` v10 et les groupes de modèles pour les accès (`access: private/protected/public`).
- **Contrats de modèle** (`contract: {enforced: true}`) sur les marts exposés — casse le build si le schéma dévie.
- **Unit tests dbt** (natif depuis 1.8) pour tester la logique SQL sans données réelles :
  ```yaml
  unit_tests:
    - name: test_order_total
      model: fct_orders
      given:
        - input: ref('stg_orders')
          rows: [{order_id: 1, amount: 100}, {order_id: 2, amount: 0}]
      expect:
        rows: [{order_id: 1, total: 100}]
  ```
- **dbt-utils** et **dbt-expectations** : packages standards pour tests avancés (`expect_column_values_to_be_between`, `expression_is_true`, etc.).
- **Semantic Layer dbt** : définir les métriques dans `metrics:` pour exposer des KPIs cohérents aux outils BI.
- **Sélecteur `state:modified+`** en CI : ne rebuilder que ce qui a changé, réduit les coûts warehouse jusqu'à 80 %.
