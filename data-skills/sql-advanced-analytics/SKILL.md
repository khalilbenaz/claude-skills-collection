---
name: sql-advanced-analytics
description: Requêtes SQL avancées pour l'analytique — window functions, CTEs récursives, pivots et optimisation de requêtes complexes. À utiliser quand l'utilisateur écrit des requêtes analytiques, utilise des fonctions de fenêtrage ou optimise des requêtes SQL lourdes. Se déclenche aussi avec "window function", "CTE récursive", "requête analytique", "PARTITION BY", "ROW_NUMBER", "RANK", "LAG", "LEAD", "pivot SQL".
---

# SQL Avancé pour l'Analytique

## Workflow

1. **Comprendre le besoin analytique** : classement, comparaison temporelle, agrégation cumulative.
2. **Choisir les fonctions** : window functions, CTEs, pivots.
3. **Écrire la requête** : lisibilité et performance.
4. **Optimiser** : plan d'exécution, index, matérialisation.

## Window Functions

### Classement

```sql
-- Classement des produits par ventes dans chaque catégorie
SELECT
    product_name,
    category,
    total_sales,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_sales DESC) AS rank,
    RANK() OVER (PARTITION BY category ORDER BY total_sales DESC) AS rank_with_ties,
    DENSE_RANK() OVER (PARTITION BY category ORDER BY total_sales DESC) AS dense_rank,
    NTILE(4) OVER (PARTITION BY category ORDER BY total_sales DESC) AS quartile
FROM products;
```

### Comparaison temporelle

```sql
-- Ventes vs mois précédent + moyenne mobile
SELECT
    month,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY month) AS prev_month,
    revenue - LAG(revenue, 1) OVER (ORDER BY month) AS month_over_month,
    LEAD(revenue, 1) OVER (ORDER BY month) AS next_month,
    AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3m,
    SUM(revenue) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS cumulative_revenue
FROM monthly_sales;
```

### Agrégation avec FIRST_VALUE / LAST_VALUE

```sql
-- Premier et dernier achat de chaque client
SELECT DISTINCT
    customer_id,
    FIRST_VALUE(product_name) OVER (
        PARTITION BY customer_id ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_purchase,
    LAST_VALUE(product_name) OVER (
        PARTITION BY customer_id ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_purchase
FROM orders;
```

## CTEs récursives

```sql
-- Hiérarchie organisationnelle
WITH RECURSIVE org_tree AS (
    -- Ancre : le CEO
    SELECT id, name, manager_id, 1 AS level, name AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Récursion : les subordonnés
    SELECT e.id, e.name, e.manager_id, ot.level + 1,
           ot.path || ' > ' || e.name
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree ORDER BY path;
```

## Pivot / Unpivot

```sql
-- Pivot : lignes → colonnes (ventes mensuelles par produit)
SELECT
    product_name,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 1 THEN amount ELSE 0 END) AS jan,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 2 THEN amount ELSE 0 END) AS feb,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 3 THEN amount ELSE 0 END) AS mar
FROM sales
GROUP BY product_name;
```

## Optimisation

### Index pour les requêtes analytiques

```sql
-- Index couvrant pour éviter les lookups
CREATE INDEX idx_sales_analytics
ON sales (category, sale_date)
INCLUDE (amount, product_id);

-- Index partiel pour les requêtes filtrées
CREATE INDEX idx_active_orders
ON orders (customer_id, order_date)
WHERE status = 'active';
```

## Règles
- Toujours spécifier le **frame** des window functions (`ROWS BETWEEN ...`) pour éviter les résultats inattendus.
- Préférer les **CTEs** aux sous-requêtes imbriquées pour la lisibilité.
- Vérifier le **plan d'exécution** pour les requêtes analytiques sur de gros volumes.
- Matérialiser les résultats dans des **vues matérialisées** si la requête est exécutée fréquemment.
