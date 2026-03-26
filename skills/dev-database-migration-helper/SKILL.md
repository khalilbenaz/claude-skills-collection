---
name: dev-database-migration-helper
description: Gestion des migrations de bases de données et changements de schéma. Se déclenche avec "migration", "database migration", "changer le schéma", "EF migrations", "Flyway", "Liquibase", "ALTER TABLE", "zero downtime migration".
---

# Database Migration Helper

## Workflow
1. Analyser le changement requis : caractériser précisément l'opération (ajout de colonne nullable/non-nullable, suppression, renommage, changement de type, ajout d'index, data migration, splitting/merging de tables) et évaluer l'impact sur le code existant.
2. Définir la stratégie de migration : choisir entre expand-contract (pattern pour zero-downtime), blue-green deployment (bascule d'environnement), migration backward compatible (ancien et nouveau code peuvent coexister) ou migration avec fenêtre de maintenance si inévitable.
3. Écrire la migration avec l'outil adapté à la stack : EF Core Migrations (dotnet ef migrations add), Flyway (fichiers SQL versionnés V1__desc.sql), Liquibase (XML/YAML/JSON changelogs), Alembic (Python/SQLAlchemy), Knex.js (Node.js), ou SQL brut avec scripts versionnés.
4. Gérer les données existantes : rédiger les scripts de transformation (data migration), configurer les valeurs par défaut pour les nouvelles colonnes non-nullables, prévoir le backfill des données historiques en batch pour éviter les locks tables prolongés.
5. Implémenter le zero-downtime en 2 phases : Phase 1 — déployer la migration additive (nouvelle colonne, nouvel index) sans retirer l'ancien schéma, déployer le code compatible double-écriture ; Phase 2 — une fois le trafic migré, supprimer les anciennes colonnes/tables en toute sécurité.
6. Préparer la rollback strategy : écrire systématiquement la migration inverse (Down() en EF Core, undo scripts en Flyway), tester le rollback en staging, documenter les snapshots DB et les procédures de point-in-time recovery selon le cloud provider.
7. Tester la migration en staging : utiliser des données réalistes (dump anonymisé de prod), mesurer la durée d'exécution, identifier les table locks et les blocking queries (pg_locks, sys.dm_exec_requests), valider les performances post-migration avec EXPLAIN ANALYZE.
8. Exécuter et monitorer en production : planifier l'exécution en période de faible charge si nécessaire, surveiller les locks actifs, suivre la progression des opérations longues (ALTER TABLE sur grandes tables), valider l'intégrité des données et les contraintes post-migration.

## Règles
- Toujours tester les migrations sur un environnement staging avec des données représentatives avant la production.
- Privilégier les migrations backward compatible et le pattern expand-contract pour tout changement sur une table à fort trafic.
- Fournir systématiquement le script de rollback avec chaque migration.
- Adapter les exemples de code à l'ORM/outil de migration de la stack de l'utilisateur.
- Pour les grandes tables (> 1M lignes), proposer des stratégies de migration online (pt-online-schema-change, gh-ost pour MySQL ; CREATE INDEX CONCURRENTLY pour PostgreSQL).
