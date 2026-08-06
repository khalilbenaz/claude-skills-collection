---
name: dimensional-modeling
description: Modélisation dimensionnelle pour le data warehousing — schéma en étoile, flocon, tables de faits et dimensions, slowly changing dimensions. À utiliser quand l'utilisateur conçoit un data warehouse, modélise des faits/dimensions ou met en place du reporting analytique. Se déclenche aussi avec "schéma en étoile", "star schema", "table de faits", "dimension", "data warehouse", "SCD", "slowly changing dimension", "modélisation dimensionnelle". Also triggers on "fact and dimension tables", "data warehouse modeling".
---

# Modélisation Dimensionnelle

## Workflow — 4 décisions dans l'ordre

### 1. Identifier le processus métier
Choisir UN processus à la fois (ventes, commandes, facturation, trafic web).
Ne pas mélanger deux processus dans une même table de faits à ce stade.

### 2. Définir le grain
La décision la plus critique. "1 ligne = ?" doit s'énoncer en une phrase.

| Grain | Exemple |
|-------|---------|
| Grain fin (transactionnel) | 1 ligne par ligne de commande |
| Grain moyen | 1 ligne par commande |
| Grain agrégé | 1 ligne par client par mois |

> Règle : toujours choisir le grain le plus fin techniquement supportable.
> Les agrégats peuvent toujours être calculés à la requête ; l'inverse est impossible.

### 3. Identifier les dimensions
Questions guides : Qui ? Quoi ? Où ? Quand ? Comment ?
Chaque dimension répond à l'une de ces questions pour décrire le fait.

### 4. Identifier les mesures (faits)
Ne retenir que les mesures numériques cohérentes avec le grain défini.
Classer chaque mesure : additive / semi-additive / non-additive.

| Additivité | Définition | Exemple |
|-----------|-----------|---------|
| **Additive** | Somme valide sur toutes dimensions | Quantité vendue, chiffre d'affaires |
| **Semi-additive** | Somme valide sur certaines dimensions seulement | Solde de compte (pas sur le temps) |
| **Non-additive** | Pas de somme utile | Taux, ratios, prix unitaire |

---

## Schéma en étoile — Structure SQL

```sql
-- Table de faits
CREATE TABLE fact_sales (
    sale_key        BIGINT IDENTITY PRIMARY KEY,
    date_key        INT NOT NULL REFERENCES dim_date(date_key),
    product_key     INT NOT NULL REFERENCES dim_product(product_key),
    customer_key    INT NOT NULL REFERENCES dim_customer(customer_key),
    store_key       INT NOT NULL REFERENCES dim_store(store_key),

    -- Mesures additives
    quantity        INT            NOT NULL,
    unit_price      DECIMAL(10,2)  NOT NULL,
    discount_amount DECIMAL(10,2)  NOT NULL DEFAULT 0,
    net_amount      DECIMAL(10,2)  NOT NULL,
    tax_amount      DECIMAL(10,2)  NOT NULL,
    total_amount    DECIMAL(10,2)  NOT NULL,

    -- Clés dégénérées (identifiants source sans dimension propre)
    invoice_number  VARCHAR(50),
    line_number     INT
);

-- Dimension Date (pré-remplie, jamais via ETL en temps réel)
CREATE TABLE dim_date (
    date_key      INT         PRIMARY KEY,  -- Format YYYYMMDD
    full_date     DATE        NOT NULL,
    day_of_week   INT         NOT NULL,     -- 1=Lundi ... 7=Dimanche
    day_name      VARCHAR(10) NOT NULL,
    day_of_month  INT         NOT NULL,
    week_of_year  INT         NOT NULL,
    month_number  INT         NOT NULL,
    month_name    VARCHAR(10) NOT NULL,
    quarter       INT         NOT NULL,
    year          INT         NOT NULL,
    is_weekend    BIT         NOT NULL,
    is_holiday    BIT         NOT NULL,
    fiscal_year   INT,
    fiscal_quarter INT
);
```

### Remplir dim_date en SQL (script one-shot)

```sql
-- Génère toutes les dates entre deux bornes
WITH dates AS (
    SELECT CAST('2010-01-01' AS DATE) AS d
    UNION ALL
    SELECT DATEADD(DAY, 1, d) FROM dates WHERE d < '2030-12-31'
)
INSERT INTO dim_date (date_key, full_date, day_of_week, day_name,
                      day_of_month, week_of_year, month_number, month_name,
                      quarter, year, is_weekend)
SELECT
    CONVERT(INT, FORMAT(d, 'yyyyMMdd')),
    d,
    DATEPART(WEEKDAY, d),
    DATENAME(WEEKDAY, d),
    DAY(d),
    DATEPART(WEEK, d),
    MONTH(d),
    DATENAME(MONTH, d),
    DATEPART(QUARTER, d),
    YEAR(d),
    CASE WHEN DATEPART(WEEKDAY, d) IN (1,7) THEN 1 ELSE 0 END
FROM dates
OPTION (MAXRECURSION 10000);
```

---

## Slowly Changing Dimensions (SCD)

### Critères de choix

| Type | Conserver l'historique ? | Volume delta | À utiliser si… |
|------|--------------------------|--------------|----------------|
| **Type 1** | Non | Faible | Correction d'erreur, attribut sans valeur analytique (ex: code postal format) |
| **Type 2** | Oui, complet | Moyen-élevé | Segment client, territoire vendeur, catégorie produit |
| **Type 3** | Partiel (1 seule transition) | Faible | Réorganisation connue à l'avance avec comparaison avant/après |
| **Type 4** (mini-dimension) | Oui, séparé | Attributs très volatils | Profil comportemental changeant fréquemment |
| **Type 6** (hybride 1+2+3) | Oui + snapshot courant | Complexe | Besoin de navigation historique ET valeur courante dénormalisée |

### SCD Type 2 — Pattern complet

```sql
CREATE TABLE dim_customer (
    customer_key   INT          IDENTITY PRIMARY KEY,  -- Surrogate key
    customer_id    VARCHAR(50)  NOT NULL,               -- Business key (NK)
    name           VARCHAR(200) NOT NULL,
    email          VARCHAR(200),
    city           VARCHAR(100),
    segment        VARCHAR(50),

    effective_date DATE         NOT NULL,
    expiration_date DATE        NOT NULL DEFAULT '9999-12-31',
    is_current     BIT          NOT NULL DEFAULT 1
);

-- ETL : mise à jour SCD Type 2
BEGIN TRANSACTION;

-- Étape 1 : expirer l'enregistrement actuel
UPDATE dim_customer
SET    expiration_date = CAST(GETDATE() AS DATE),
       is_current      = 0
WHERE  customer_id = 'CUST-123'
  AND  is_current  = 1;

-- Étape 2 : insérer la nouvelle version
INSERT INTO dim_customer (customer_id, name, email, city, segment, effective_date)
VALUES ('CUST-123', 'Jean Dupont', 'jean@new.com', 'Lyon', 'Premium', CAST(GETDATE() AS DATE));

COMMIT;

-- Requête sur une période historique
SELECT f.total_amount, c.segment
FROM   fact_sales f
JOIN   dim_customer c ON c.customer_key = f.customer_key
                      AND c.effective_date <= f.sale_date
                      AND f.sale_date < c.expiration_date;
```

---

## Types de tables de faits

| Type | Grain | Cas d'usage |
|------|-------|------------|
| **Transactionnelle** | 1 ligne par événement atomique | Ventes, clics, transactions |
| **Snapshot périodique** | 1 ligne par entité par période | Solde mensuel, stock fin de journée |
| **Snapshot cumulatif** | 1 ligne par cycle de vie | Pipeline commande (créée → validée → expédiée → livrée) |
| **Sans faits (factless)** | Intersection sans mesure | Présence à un événement, éligibilité à une promotion |

### Snapshot cumulatif — colonnes types

```sql
CREATE TABLE fact_order_pipeline (
    order_key         INT     PRIMARY KEY,
    order_id          VARCHAR(50),
    -- Une date_key par étape
    created_date_key  INT     REFERENCES dim_date(date_key),
    approved_date_key INT     REFERENCES dim_date(date_key),
    shipped_date_key  INT     REFERENCES dim_date(date_key),
    delivered_date_key INT    REFERENCES dim_date(date_key),
    -- Lag entre étapes (recalculé à chaque mise à jour)
    days_to_approve   INT,
    days_to_ship      INT,
    days_to_deliver   INT,
    order_amount      DECIMAL(12,2)
);
```

---

## Schéma flocon (snowflake) — quand l'utiliser

Normaliser une dimension (ex: `dim_product → dim_category → dim_department`) :
- **Pour** : réduit la redondance, cohérence de mise à jour.
- **Contre** : jointures supplémentaires, requêtes plus lentes, lisibilité dégradée.

> Règle 2026 : préférer le star schema sauf si le volume de la dimension est > 10M lignes et que les attributs normalisables sont très stables. Les outils BI modernes (Power BI, Tableau, Looker) sont optimisés star.

---

## Anti-patterns et garde-fous

| Anti-pattern | Symptôme | Correction |
|-------------|---------|-----------|
| **Grain mixte** | Mesures incomparables dans une même fact | Séparer en deux tables de faits |
| **Clé métier comme FK** | JOIN lent, problèmes SCD | Toujours utiliser les surrogate keys |
| **Dimension fourre-tout** | dim_misc, dim_attributes avec 80 colonnes | Décomposer en dimensions thématiques |
| **Mesure non-additive stockée brute** | Requêtes fausses (SUM de taux) | Stocker numérateur + dénominateur, calculer le ratio en vue |
| **SCD Type 2 sur tout** | Table de 100M lignes pour une dim de 10k clients | Choisir SCD Type 1 pour attributs sans valeur historique |
| **dim_date absente** | Filtres dates via CAST sur la fact | Toujours créer et pré-remplir dim_date |
| **NULL en FK** | Ruptures de jointure silencieuses | Créer une ligne "inconnu" (key = -1) dans chaque dimension |

---

## Bonnes pratiques 2026

- **Nommage** : préfixe `fact_` / `dim_` / `bridge_` ; clés avec suffixe `_key` ; business keys avec `_id` ou `_bk`.
- **Surrogate keys** : `INT IDENTITY` (OLTP < 2 milliards) ou `BIGINT` sinon. Ne jamais exposer la surrogate key aux utilisateurs BI.
- **Ligne "inconnu"** : insérer `customer_key = -1, customer_id = 'UNKNOWN'` dans chaque dimension pour absorber les NULLs ETL.
- **Date clé** : format `YYYYMMDD` comme `INT` — plus rapide pour les range scans que `DATE`.
- **Indexes** : clustered sur la PK de la fact ; columnstore non-clustered pour les agrégations analytiques (SQL Server / Synapse).
- **Partitionnement** : partitionner les grandes facts par `date_key` (partition par année ou trimestre).
- **Modèle bus** : définir une matrice bus (processus × dimension) avant de coder pour identifier les dimensions conformées réutilisables.
- **Tests de cohérence** : vérifier `COUNT(DISTINCT surrogate_key) = COUNT(*)` sur les dimensions et l'absence de NULLs sur les FKs de la fact après chaque chargement ETL.
