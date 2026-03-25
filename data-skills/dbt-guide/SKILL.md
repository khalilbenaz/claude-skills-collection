---
name: dbt-guide
description: Transformation de données avec dbt — models, tests, sources, macros et documentation automatisée. Se déclenche avec "dbt", "data build tool", "dbt model", "dbt test", "transformation de données dbt".
---

# Guide dbt

## Workflow

1. **Structurer le projet dbt** — Organiser le projet avec la convention de couches : `staging/` (nettoyage des sources brutes, renommage, typage), `intermediate/` (jointures et transformations métier), `marts/` (modèles finaux orientés consommation). Configurer `dbt_project.yml` avec les materialization par défaut par dossier.

2. **Déclarer les sources** — Définir les sources de données brutes dans `sources.yml` avec le nom, le schéma, les tables, les descriptions, et les tests de freshness (`loaded_at_field`, `warn_after`, `error_after`). Référencer les sources avec `{{ source() }}` dans les modèles.

3. **Développer les modèles** — Écrire les modèles SQL avec les `ref()` pour les dépendances entre modèles, choisir la materialisation adaptée (`view`, `table`, `incremental`, `ephemeral`), et configurer les modèles incrémentaux avec `is_incremental()` et la stratégie de merge appropriée.

4. **Implémenter les tests** — Définir les tests de données dans les fichiers YAML : tests génériques (`unique`, `not_null`, `accepted_values`, `relationships`), tests custom en SQL dans `tests/`, et tests de source pour valider la qualité des données entrantes.

5. **Créer les macros** — Développer des macros Jinja réutilisables pour les patterns récurrents : génération de surrogate keys, pivot/unpivot, date spine, audit columns (created_at, updated_at), et logique métier partagée entre modèles.

6. **Documenter le projet** — Rédiger les descriptions des modèles et colonnes dans les fichiers YAML, générer le site de documentation avec `dbt docs generate` et `dbt docs serve`, et maintenir le lineage graph à jour pour la traçabilité des transformations.

7. **Configurer les environnements** — Séparer les configurations par environnement (dev, staging, prod) avec les profiles dbt, les target schemas distincts, et les variables d'environnement. Intégrer dbt dans le pipeline CI/CD avec `dbt build` et `dbt test`.

## Règles

- Respecte la convention de couches (staging → intermediate → marts) et ne référence jamais une source directement dans un modèle mart.
- Chaque modèle doit avoir au minimum un test `unique` et `not_null` sur sa clé primaire défini dans le fichier YAML associé.
- Documente chaque modèle et chaque colonne exposée aux consommateurs — la documentation est un livrable au même titre que le code.
- Utilise `ref()` et `source()` systématiquement pour les dépendances — jamais de noms de tables en dur dans les requêtes SQL.
- Privilégie les modèles incrémentaux pour les tables volumineuses et configure toujours une stratégie de full refresh de secours.
