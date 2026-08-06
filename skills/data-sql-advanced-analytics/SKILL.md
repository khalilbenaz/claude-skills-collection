---
name: data-sql-advanced-analytics
description: Requêtes SQL avancées pour l'analytique — window functions, CTEs récursives, pivots et optimisation de requêtes complexes. À utiliser quand l'utilisateur écrit des requêtes analytiques, utilise des fonctions de fenêtrage ou optimise des requêtes SQL lourdes. Se déclenche aussi avec "window function", "CTE récursive", "requête analytique", "PARTITION BY", "ROW_NUMBER", "RANK", "LAG", "LEAD", "pivot SQL". Also triggers on "recursive CTE", "advanced SQL query".
---

# SQL Avancé pour l'Analytique

## Workflow

1. **Identifier le besoin** : classement, comparaison temporelle, agrégation cumulative, hiérarchie, pivot.
2. **Choisir la construction** :
   - Classement/comparaison dans une partition → window function
   - Hiérarchie ou récursion → CTE récursive
   - Rotation lignes/colonnes → PIVOT / CASE WHEN
   - Calcul réutilisé plusieurs fois → CTE non-récursive ou vue matérialisée
3. **Écrire la requête** : CTEs avant la requête principale, window functions dans le SELECT.
4. **Valider le plan d'exécution** : `EXPLAIN ANALYZE` (PG) / `SET STATISTICS IO ON` (SQL Server).
5. **Optimiser** : index couvrants, matérialisation, partitionnement.

---

## Window Functions

### Critères de choix

| Besoin | Fonction |
|---|---|
| Rang sans ex-aequo | `ROW_NUMBER()` |
| Rang avec ex-aequo, sauts | `RANK()` |
| Rang avec ex-aequo, continu | `DENSE_RANK()` |
| Découper en N groupes égaux | `NTILE(N)` |
| Valeur N lignes avant/après | `LAG(col, N)` / `LEAD(col, N)` |
| Cumul depuis le début | `SUM() OVER (ORDER BY ... ROWS UNBOUNDED PRECEDING)` |
| Moyenne mobile | `AVG() OVER (ROWS BETWEEN N PRECEDING AND CURRENT ROW)` |
| Premier/dernier de la partition | `FIRST_VALUE()` / `LAST_VALUE()` + frame explicite |

### Classement dans une partition

```sql
SELECT
    product_name,
    category,
    total_sales,
    ROW_NUMBER()  OVER (PARTITION BY category ORDER BY total_sales DESC) AS rn,
    RANK()        OVER (PARTITION BY category ORDER BY total_sales DESC) AS rnk,
    DENSE_RANK()  OVER (PARTITION BY category ORDER BY total_sales DESC) AS dense_rnk,
    NTILE(4)      OVER (PARTITION BY category ORDER BY total_sales DESC) AS quartile
FROM products;
```

### Comparaison temporelle et cumul

```sql
SELECT
    month,
    revenue,
    LAG(revenue, 1)  OVER (ORDER BY month)                                           AS prev_month,
    revenue - LAG(revenue, 1) OVER (ORDER BY month)                                  AS mom_delta,
    LEAD(revenue, 1) OVER (ORDER BY month)                                            AS next_month,
    AVG(revenue)     OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)  AS ma_3m,
    SUM(revenue)     OVER (ORDER BY month ROWS UNBOUNDED PRECEDING)                  AS cumul
FROM monthly_sales;
```

### FIRST_VALUE / LAST_VALUE — frame obligatoire

```sql
-- Sans "ROWS UNBOUNDED FOLLOWING", LAST_VALUE retourne la ligne courante, pas la dernière !
SELECT DISTINCT
    customer_id,
    FIRST_VALUE(product_name) OVER w AS first_purchase,
    LAST_VALUE(product_name)  OVER w AS last_purchase
FROM orders
WINDOW w AS (
    PARTITION BY customer_id ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
);
```

### Dédoublonnage par partition (pattern courant)

```sql
-- Garder la ligne la plus récente par customer_id
WITH ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) AS rn
    FROM orders
)
SELECT * FROM ranked WHERE rn = 1;
```

---

## CTEs

### CTE non-récursive — clarifier les étapes

```sql
WITH
revenue_by_month AS (
    SELECT DATE_TRUNC('month', order_date) AS month, SUM(amount) AS revenue
    FROM orders
    GROUP BY 1
),
ranked AS (
    SELECT *, RANK() OVER (ORDER BY revenue DESC) AS rnk
    FROM revenue_by_month
)
SELECT * FROM ranked WHERE rnk <= 5;
```

### CTE récursive — hiérarchie

```sql
WITH RECURSIVE org_tree AS (
    -- Ancre : nœud racine
    SELECT id, name, manager_id, 1 AS depth, CAST(name AS TEXT) AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Récursion
    SELECT e.id, e.name, e.manager_id, ot.depth + 1, ot.path || ' > ' || e.name
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
    WHERE ot.depth < 10   -- garde-fou anti-cycle
)
SELECT * FROM org_tree ORDER BY path;
```

---

## Pivot / Unpivot

### CASE WHEN (portable sur tous les SGBD)

```sql
SELECT
    product_name,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 1  THEN amount ELSE 0 END) AS jan,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 2  THEN amount ELSE 0 END) AS feb,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 3  THEN amount ELSE 0 END) AS mar
FROM sales
GROUP BY product_name;
```

### PIVOT natif SQL Server

```sql
SELECT product_name, [1] AS jan, [2] AS feb, [3] AS mar
FROM (
    SELECT product_name, MONTH(sale_date) AS m, amount FROM sales
) src
PIVOT (SUM(amount) FOR m IN ([1],[2],[3])) pvt;
```

### Unpivot — colonnes → lignes

```sql
SELECT product_name, month_name, revenue
FROM monthly_pivot
UNPIVOT (revenue FOR month_name IN (jan, feb, mar)) u;
```

---

## Optimisation

### Lire le plan d'exécution

```sql
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <votre requête>;

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
-- puis exécuter la requête, lire "logical reads"
```

Signaux d'alarme : `Hash Join` sur très grandes tables, `Sort` sur colonnes non indexées, `Nested Loop` avec `Index Scan` répété.

### Index couvrants pour l'analytique

```sql
-- Couvre PARTITION BY + ORDER BY + colonnes SELECT
CREATE INDEX idx_sales_analytics
ON sales (category, sale_date)
INCLUDE (amount, product_id);

-- Index partiel pour réduire la taille
CREATE INDEX idx_active_orders
ON orders (customer_id, order_date)
WHERE status = 'active';
```

### Matérialisation

```sql
-- PostgreSQL : vue matérialisée + refresh
CREATE MATERIALIZED VIEW mv_monthly_revenue AS
    SELECT DATE_TRUNC('month', order_date) AS month, SUM(amount) AS revenue
    FROM orders GROUP BY 1;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;

-- SQL Server : indexed view (requiert WITH SCHEMABINDING)
CREATE VIEW dbo.vw_monthly_revenue WITH SCHEMABINDING AS
    SELECT DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1) AS month,
           SUM(amount) AS revenue, COUNT_BIG(*) AS cnt
    FROM dbo.orders GROUP BY DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1);

CREATE UNIQUE CLUSTERED INDEX ix_mv ON dbo.vw_monthly_revenue (month);
```

---

## Garde-fous / Anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| `LAST_VALUE` sans frame explicite | Retourne la ligne courante, pas la dernière | Ajouter `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` |
| CTE récursive sans limite de profondeur | Boucle infinie sur données cycliques | Ajouter `WHERE depth < N` ou `MAXRECURSION N` (SQL Server) |
| Window function dans `WHERE` | Erreur syntaxique | Encapsuler dans une CTE ou sous-requête, filtrer ensuite |
| `SELECT DISTINCT` + window function | Résultats incohérents si le DISTINCT s'applique avant | Utiliser une CTE intermédiaire |
| Pivot dynamique côté SQL | Colonnes inconnues à compile-time | Générer le SQL en application ou via `STRING_AGG` + `EXEC` |
| Trop de window functions sur le même `OVER` non nommé | Recalcul répété | Factoriser avec `WINDOW w AS (...)` (PostgreSQL) ou CTE |
| Requête analytique sur table non partitionnée (milliards de lignes) | Full scan coûteux | Ajouter un filtre de date, ou partitionner la table |

---

## Bonnes pratiques 2026

- **Nommer les fenêtres** avec `WINDOW w AS (...)` quand la même clause est réutilisée (lisibilité + plan partagé sur PostgreSQL 16+).
- **Documenter chaque CTE** avec un commentaire d'une ligne sur son rôle.
- **Éviter les CTEs pour remplacer des index** : une CTE n'est pas automatiquement matérialisée (SQL Server l'inline souvent) ; préférer une table temporaire si la CTE est jointurée plusieurs fois.
- **Tester sur un sous-ensemble** avant d'exécuter sur toute la table (`WHERE order_date >= CURRENT_DATE - INTERVAL '7 days'`).
- **Séparer les étapes** : calcul → classement → filtrage, une CTE par étape.
- Sur SQL Server : utiliser `ROWS` plutôt que `RANGE` dans le frame — `RANGE` est plus lent car il gère les ex-aequo dynamiquement.


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
