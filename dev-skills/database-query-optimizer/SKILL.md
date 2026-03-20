---
name: database-query-optimizer
description: Analyse et optimise des requêtes SQL ou NoSQL pour améliorer les performances. À utiliser quand l'utilisateur a une requête lente ou veut optimiser sa base de données. Se déclenche aussi avec "requête lente", "optimiser SQL", "EXPLAIN", "index", "performance DB", "N+1", ou toute question d'optimisation de requêtes.
---

# Database Query Optimizer

## Étape 1 — Analyse
- Type de base (PostgreSQL, MySQL, MongoDB, SQLite…)
- La requête complète
- Schéma des tables (colonnes, types, index existants)
- Volume de données approximatif
- Temps d'exécution actuel

## Étape 2 — Diagnostic
Identifie : full table scans, index manquants, jointures coûteuses, sous-requêtes évitables, SELECT * inutile, problèmes N+1.

## Étape 3 — Optimisations
Pour chaque optimisation :
- Requête optimisée avec code
- Explication du gain
- Index à créer (avec CREATE INDEX)
- Impact estimé (significatif/modéré/mineur)

## Étape 4 — Bonnes pratiques
Pagination efficace, dénormalisation si justifiée, caching, partitioning.

## Étape 5 — Vérification
EXPLAIN ANALYZE avant/après, métriques à comparer, tests de charge.
