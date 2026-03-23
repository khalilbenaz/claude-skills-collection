---
name: data-validation-helper
description: Validation et qualité des données dans les pipelines. Se déclenche avec "data quality", "validation des données", "data contract", "schema validation", "Great Expectations", "données incorrectes", "data testing".
---

# Data Validation Helper

## Workflow
1. **Définition des attentes** — Spécifier pour chaque colonne les règles métier : type attendu, plage de valeurs (min/max), format (regex, date pattern), contrainte de nullabilité, unicité, valeurs autorisées (enum), et cardinalité ; documenter les règles dans un format exploitable (YAML, JSON, code).
2. **Schema validation** — Valider la structure des données à l'entrée du pipeline avec JSON Schema (APIs), Avro/Protobuf (streaming Kafka), Pydantic (Python objects) ou pandera (DataFrames) ; échouer tôt sur les violations de schéma avant toute transformation coûteuse.
3. **Data quality checks** — Évaluer les cinq dimensions de qualité : complétude (% de non-nulls), exactitude (valeurs dans les plages attendues), cohérence (relations inter-colonnes), fraîcheur (timestamp de dernière mise à jour), et unicité (doublons) ; calculer des scores de qualité agrégés.
4. **Framework setup** — Configurer le framework adapté : Great Expectations (expectations suites, checkpoints, data docs), dbt tests (schema.yml : not_null, unique, accepted_values, relationships), Soda (SodaCL déclaratif), pandera (schemas DataFrames Python) ou des validateurs custom avec pytest.
5. **Tests statistiques** — Comparer les distributions actuelles à une référence (KS test, chi-squared) ; détecter les anomalies statistiques (z-score, IQR, isolation forest) ; surveiller les dérives de métriques agrégées (moyenne, std, percentiles) sur les fenêtres temporelles.
6. **Data contracts** — Formaliser les accords producteur-consommateur (schéma, SLA de fraîcheur, volumétrie attendue) ; utiliser un schema registry (Confluent Schema Registry, AWS Glue) pour les topics Kafka ; gérer les breaking changes avec versioning et période de dépréciation.
7. **Intégration pipeline** — Insérer des validation gates à chaque étape critique ; router les données invalides vers une zone de quarantaine (dead letter queue, table bad_data) pour inspection sans bloquer le pipeline complet ; déclencher des alertes Slack/PagerDuty sur dépassement du seuil d'erreur acceptable.
8. **Reporting et dashboards** — Construire des dashboards de qualité (score global, évolution temporelle, top violations) avec les data docs Great Expectations, Metabase, ou Grafana ; suivre les SLA de qualité ; générer des rapports automatiques post-exécution pour les équipes data et métier.

## Règles
- Fournis des exemples de code concrets (Great Expectations checkpoint, dbt test YAML, pandera schema Python) adaptés aux outils de l'utilisateur.
- Valide toujours le schéma en entrée de pipeline avant d'engager des transformations coûteuses (fail fast).
- Ne bloque pas entièrement le pipeline sur des erreurs non critiques : distingue les violations bloquantes (types incorrects) des warnings (outliers acceptables).
- Priorise la qualité des données sur la quantité : 95% de données valides traités correctement valent mieux que 100% de données douteuses.
- Pense toujours à l'idempotence des validateurs : un recheck sur les mêmes données doit produire les mêmes résultats.
