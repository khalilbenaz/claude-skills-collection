---
name: dev-database-query-optimizer
description: Analyse et optimise des requêtes SQL ou NoSQL pour améliorer les performances. À utiliser quand l'utilisateur a une requête lente ou veut optimiser sa base de données. Se déclenche aussi avec "requête lente", "optimiser SQL", "EXPLAIN", "index", "performance DB", "N+1", ou toute question d'optimisation de requêtes.
---

# Database Query Optimizer

## Étape 1 — Collecte d'informations

Demande systématiquement (ne suppose rien) :

- **SGBD et version** : PostgreSQL 16, MySQL 8, SQL Server 2022, MongoDB 7, SQLite…
- **Requête complète** (pas un résumé, le SQL brut)
- **Schéma** : colonnes, types, index existants (`\d table` PG, `SHOW CREATE TABLE` MySQL)
- **Volume** : lignes dans les tables concernées (ordre de grandeur suffit)
- **Temps mesuré** : durée actuelle, cible souhaitée, outil de mesure
- **Contexte d'exécution** : fréquence, OLTP vs OLAP, connexions concurrentes

---

## Étape 2 — Diagnostic avec EXPLAIN

### PostgreSQL / MySQL / SQLite
```sql
-- PostgreSQL : plan + exécution réelle
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <requête>;

-- MySQL
EXPLAIN FORMAT=JSON <requête>;
SHOW STATUS LIKE 'Last_Query_Cost';

-- SQL Server
SET STATISTICS IO, TIME ON;
<requête>;
-- ou via SSMS : Query > Include Actual Execution Plan
```

### Signaux d'alarme dans le plan
| Signal | Signification | Priorité |
|---|---|---|
| `Seq Scan` sur grande table | Pas d'index utilisable | Critique |
| `Hash Join` + rows estimés très faux | Statistiques obsolètes | Élevée |
| `Nested Loop` × millions de rows | Potentiel N+1 ou jointure cartésienne | Critique |
| `Sort` sans `Index Scan` | Manque d'index sur ORDER BY | Modérée |
| `cost=...` très élevé vs actual rows faibles | Mauvaise estimation selectivité | Élevée |
| `rows=1` partout mais slow | Problème réseau / lock / cache miss | Variable |

### Mettre à jour les statistiques
```sql
-- PostgreSQL
ANALYZE table_name;
-- MySQL
ANALYZE TABLE table_name;
-- SQL Server
UPDATE STATISTICS table_name;
```

---

## Étape 3 — Optimisations concrètes

### 3.1 Index manquants

```sql
-- Créer un index couvrant (covering index) : évite un table lookup
CREATE INDEX CONCURRENTLY idx_orders_user_status
  ON orders (user_id, status)
  INCLUDE (created_at, total_amount);  -- PostgreSQL 11+

-- Index partiel : si requête filtre toujours sur une valeur
CREATE INDEX idx_orders_pending
  ON orders (created_at)
  WHERE status = 'pending';

-- Index composite : ordre des colonnes = sélectivité décroissante
-- Bon : (user_id, status)   -- user_id très sélectif
-- Mauvais : (status, user_id) -- status peu sélectif en tête
```

### 3.2 Réécriture de requêtes

```sql
-- Eviter SELECT * (ramène des colonnes inutiles, bloque les covering index)
-- AVANT
SELECT * FROM orders WHERE user_id = 42;
-- APRÈS
SELECT id, status, total_amount, created_at FROM orders WHERE user_id = 42;

-- Remplacer NOT IN par NOT EXISTS (NULL-safe + souvent plus rapide)
-- AVANT
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM orders);
-- APRÈS
SELECT u.id FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- Pagination efficace : OFFSET lent sur grandes tables
-- AVANT (O(offset) : parcourt toutes les lignes)
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;
-- APRÈS (keyset pagination : O(1))
SELECT * FROM orders WHERE id > :last_seen_id ORDER BY id LIMIT 20;

-- Eviter les fonctions sur colonnes indexées en prédicat
-- AVANT (casse l'index)
WHERE LOWER(email) = 'foo@bar.com'
-- APRÈS (index fonctionnel ou normalisation à l'insertion)
WHERE email = 'foo@bar.com'   -- si données stockées en minuscules
```

### 3.3 Problème N+1

```sql
-- Symptôme : N requêtes SELECT user WHERE id=X lancées en boucle
-- Fix ORM : eager loading
-- Django
orders = Order.objects.select_related('user').prefetch_related('items').all()
-- Rails
Order.includes(:user, :items)
-- Prisma
prisma.order.findMany({ include: { user: true, items: true } })

-- Fix SQL pur : une seule requête avec jointure
SELECT o.id, u.name, i.product_id
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN order_items i ON i.order_id = o.id
WHERE o.status = 'pending';
```

### 3.4 Agrégations et CTEs

```sql
-- Pré-filtrer avant d'agréger
-- AVANT
SELECT user_id, COUNT(*) FROM orders GROUP BY user_id HAVING status = 'done';
-- APRÈS
SELECT user_id, COUNT(*) FROM orders WHERE status = 'done' GROUP BY user_id;

-- CTE vs sous-requête : en PostgreSQL, CTE est une "optimization fence" (< PG 12)
-- Préférer subquery si pas besoin de réutiliser, ou MATERIALIZED/NOT MATERIALIZED
WITH recent AS NOT MATERIALIZED (
  SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT user_id, COUNT(*) FROM recent GROUP BY user_id;
```

---

## Étape 4 — Stratégies avancées

### Caching
- **Query cache** : déconseillé MySQL 8+ (supprimé), utiliser Redis/Memcached applicatif
- **Materialized views** : requêtes OLAP lourdes exécutées en tâche de fond
  ```sql
  CREATE MATERIALIZED VIEW daily_revenue AS
    SELECT DATE(created_at), SUM(total_amount) FROM orders GROUP BY 1;
  -- Rafraîchir périodiquement
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;
  ```

### Partitioning (tables > 50M lignes)
```sql
-- PostgreSQL : partition par range sur date
CREATE TABLE orders (created_at DATE, ...) PARTITION BY RANGE (created_at);
CREATE TABLE orders_2025 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Connection pooling
- PgBouncer (PostgreSQL), ProxySQL (MySQL) : éviter l'overhead de connexion
- Configurer `pool_mode = transaction` pour OLTP

---

## Étape 5 — Vérification et mesure

```sql
-- Mesurer avant/après avec le même jeu de données
-- PostgreSQL : pg_stat_statements
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

-- Comparer les plans
EXPLAIN (ANALYZE, BUFFERS) <requête_avant>;
EXPLAIN (ANALYZE, BUFFERS) <requête_après>;
```

**Métriques à comparer** :
- Temps d'exécution moyen (p50 / p95 / p99)
- `shared_hit` vs `shared_read` (cache disque vs RAM)
- Nombre de rows scannées vs retournées
- Nombre de lock waits

---

## Garde-fous / Anti-patterns / Pièges

- **Ne pas créer d'index en masse** : chaque index ralentit INSERT/UPDATE/DELETE. Cibler les requêtes > 100ms ou fréquence élevée.
- **EXPLAIN sans ANALYZE** : montre le plan estimé, pas réel. Toujours utiliser `EXPLAIN ANALYZE` pour diagnostiquer.
- **Optimiser sans mesurer** : noter le temps baseline avant toute modification.
- **Index sur colonne de faible cardinalité** (booléen, statut 3 valeurs) : inefficace sauf index partiel.
- **OR dans WHERE** : peut empêcher l'usage d'index. Réécrire en UNION ALL si possible.
- **DISTINCT comme palliatif** : souvent masque un problème de jointure qui produit des doublons.
- **Dénormalisation prématurée** : mesurer d'abord, dénormaliser seulement si le gain est prouvé.
- **`SELECT 1` dans EXISTS** : équivalent à `SELECT *` côté optimiseur depuis PG 9+, mais rester explicite par convention.
- **Ne jamais tuner en production sans rollback plan** : `DROP INDEX CONCURRENTLY` si régression.


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
