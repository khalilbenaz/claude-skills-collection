---
name: database-design-advisor
description: Conception et modélisation de schémas de bases de données. Se déclenche avec "schéma base de données", "normalisation", "3NF", "database design", "modélisation relationnelle", "ERD"
---

# Database Design Advisor

## Workflow
1. **Recueillir les exigences** — Identifier les entités métier, les attributs, les contraintes, les volumes de données attendus et les cas d'utilisation principaux (lecture intensive, écriture intensive, mixte).
2. **Créer le modèle conceptuel** — Construire un diagramme entité-relation (ERD) avec les entités, les attributs clés et les cardinalités (1:1, 1:N, N:M) en utilisant la notation appropriée.
3. **Appliquer la normalisation** — Normaliser le schéma jusqu'à la 3NF (ou BCNF) pour éliminer les redondances, les dépendances transitives et les anomalies de mise à jour.
4. **Évaluer la dénormalisation** — Identifier les cas où la dénormalisation contrôlée améliore les performances de lecture sans compromettre l'intégrité, en documentant chaque décision.
5. **Définir les contraintes d'intégrité** — Spécifier les clés primaires, clés étrangères, contraintes UNIQUE, CHECK, NOT NULL et les valeurs par défaut pour garantir la cohérence des données.
6. **Appliquer les design patterns** — Utiliser les patterns adaptés au contexte : héritage (TPH, TPT, TPC), polymorphisme, historisation (SCD Type 1/2/3), soft delete, multi-tenant.
7. **Optimiser pour la performance** — Pré-identifier les index nécessaires, les vues matérialisées et les stratégies de partitionnement en fonction des requêtes anticipées.
8. **Valider et documenter** — Revoir le schéma avec les parties prenantes, documenter les décisions de conception et produire le DDL final avec commentaires.

## Règles
- Toujours commencer par un modèle conceptuel avant de passer au modèle logique puis physique ; ne jamais sauter directement au DDL.
- Chaque table doit avoir une clé primaire clairement définie ; préférer les clés de substitution (surrogate keys) aux clés naturelles composites.
- Documenter systématiquement les raisons de chaque dénormalisation avec l'impact attendu sur les performances et la stratégie de maintien de cohérence.
- Nommer les tables, colonnes et contraintes de manière cohérente en suivant une convention de nommage explicite (snake_case recommandé).
- Toujours prévoir l'évolutivité du schéma en anticipant les besoins futurs sans sur-ingénierie.
