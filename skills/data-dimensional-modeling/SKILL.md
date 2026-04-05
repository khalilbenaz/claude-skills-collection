---
name: data-dimensional-modeling
description: Modélisation dimensionnelle pour le data warehousing — schéma en étoile, flocon, tables de faits et dimensions, slowly changing dimensions. À utiliser quand l'utilisateur conçoit un data warehouse, modélise des faits/dimensions ou met en place du reporting analytique. Se déclenche aussi avec "schéma en étoile", "star schema", "table de faits", "dimension", "data warehouse", "SCD", "slowly changing dimension", "modélisation dimensionnelle".
---

# Modélisation Dimensionnelle

## Workflow

1. **Identifier le processus métier** : ventes, commandes, trafic web.
2. **Définir le grain** : le niveau de détail le plus fin (1 ligne = ?).
3. **Concevoir les dimensions** : qui, quoi, où, quand, comment.
4. **Concevoir les faits** : mesures quantitatives liées aux dimensions.

## Schéma en étoile

```
              ┌──────────────┐
              │  dim_product  │
              └──────┬───────┘
                     │
┌──────────────┐     │     ┌──────────────┐
│  dim_customer ├────┼─────┤  dim_store    │
└──────────────┘     │     └──────────────┘
                     │
              ┌──────┴───────┐
              │  fact_sales   │
              └──────┬───────┘
                     │
              ┌──────┴───────┐
              │  dim_date     │
              └──────────────┘
```

### Table de faits

```sql
CREATE TABLE fact_sales (
    sale_key BIGINT IDENTITY PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),

    -- Mesures
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Clés dégénérées
    invoice_number VARCHAR(50),
    line_number INT
);
```

### Dimension Date

```sql
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,        -- Format YYYYMMDD
    full_date DATE NOT NULL,
    day_of_week INT NOT NULL,
    day_name VARCHAR(10) NOT NULL,
    day_of_month INT NOT NULL,
    week_of_year INT NOT NULL,
    month_number INT NOT NULL,
    month_name VARCHAR(10) NOT NULL,
    quarter INT NOT NULL,
    year INT NOT NULL,
    is_weekend BIT NOT NULL,
    is_holiday BIT NOT NULL,
    fiscal_year INT,
    fiscal_quarter INT
);
```

## Slowly Changing Dimensions (SCD)

| Type | Principe | Usage |
|------|----------|-------|
| **Type 1** | Écraser l'ancienne valeur | Corrections, données non historisées |
| **Type 2** | Nouvelle ligne + dates de validité | Historique complet |
| **Type 3** | Colonne ancienne + nouvelle valeur | Historique limité (1 changement) |

### SCD Type 2

```sql
CREATE TABLE dim_customer (
    customer_key INT IDENTITY PRIMARY KEY,  -- Surrogate key
    customer_id VARCHAR(50) NOT NULL,       -- Business key
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    city VARCHAR(100),
    segment VARCHAR(50),

    -- Colonnes SCD Type 2
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL DEFAULT '9999-12-31',
    is_current BIT NOT NULL DEFAULT 1
);

-- Mise à jour SCD Type 2
-- 1. Expirer l'enregistrement actuel
UPDATE dim_customer
SET expiration_date = GETDATE(), is_current = 0
WHERE customer_id = 'CUST-123' AND is_current = 1;

-- 2. Insérer la nouvelle version
INSERT INTO dim_customer (customer_id, name, email, city, segment, effective_date)
VALUES ('CUST-123', 'Jean Dupont', 'jean@new.com', 'Lyon', 'Premium', GETDATE());
```

## Types de tables de faits

| Type | Grain | Exemple |
|------|-------|---------|
| **Transactionnelle** | 1 ligne par événement | Ventes, clics |
| **Snapshot périodique** | 1 ligne par période | Solde mensuel, stock quotidien |
| **Snapshot cumulatif** | 1 ligne par cycle de vie | Pipeline de commande (créée → livrée) |
| **Sans faits** | Intersections sans mesure | Présence à un événement |

## Règles
- Chaque table de faits doit avoir un **grain clairement défini**.
- Les dimensions doivent utiliser des **surrogate keys** (pas les business keys).
- La **dimension Date** est obligatoire et doit être pré-remplie.
- Les mesures dans les faits doivent être **additives** quand possible.
- Documenter le type de SCD choisi pour chaque attribut de dimension.


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
