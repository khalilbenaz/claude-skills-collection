---
name: dynamodb-guide
description: Modélisation et requêtes DynamoDB incluant single-table design, GSI, LSI, capacity modes et streams. Se déclenche avec "DynamoDB", "NoSQL AWS", "single-table design", "GSI", "partition key"
---

# DynamoDB Guide

## Workflow
1. **Identifier les access patterns** — Lister exhaustivement tous les patterns d'accès de l'application (queries, scans, gets). Documenter chaque pattern avec ses paramètres de filtrage, tri et projection. Prioriser par fréquence et criticité.
2. **Concevoir le single-table design** — Modéliser toutes les entités dans une seule table en utilisant des clés génériques (PK, SK). Définir les préfixes d'entité (ex: `USER#`, `ORDER#`, `PRODUCT#`). Mapper chaque access pattern sur une combinaison PK/SK.
3. **Définir les index secondaires** — Créer des GSI (Global Secondary Index) pour les access patterns qui ne correspondent pas à la clé primaire. Utiliser des LSI (Local Secondary Index) quand un tri alternatif est nécessaire sur la même partition. Limiter le nombre de GSI (max 20).
4. **Choisir le mode de capacité** — Sélectionner entre On-Demand (trafic imprévisible, démarrage) et Provisioned (trafic stable, coût optimisé). Configurer l'auto-scaling avec des seuils de target utilization à 70% pour le mode provisionné.
5. **Implémenter les opérations** — Utiliser `Query` plutôt que `Scan` systématiquement. Implémenter la pagination avec `ExclusiveStartKey`. Utiliser `TransactWriteItems` pour les écritures atomiques multi-items. Appliquer des condition expressions pour l'optimistic locking.
6. **Configurer DynamoDB Streams** — Activer les streams pour le CDC (Change Data Capture). Connecter à Lambda pour les projections, la synchronisation vers Elasticsearch/OpenSearch ou l'invalidation de cache. Choisir le view type approprié (NEW_IMAGE, OLD_IMAGE, BOTH).
7. **Optimiser les coûts et performances** — Compresser les attributs volumineux. Utiliser le DAX (DynamoDB Accelerator) pour les lectures intensives. Implémenter le TTL pour l'expiration automatique des données. Surveiller les throttled requests et les hot partitions.
8. **Tester et valider** — Utiliser DynamoDB Local pour les tests unitaires. Valider chaque access pattern avec NoSQL Workbench. Simuler la charge avec des scripts de load testing pour vérifier la distribution des partitions.

## Règles
- Toujours concevoir le modèle de données à partir des access patterns et jamais à partir du modèle relationnel existant pour éviter les anti-patterns.
- Ne jamais utiliser `Scan` en production pour des tables volumineuses ; toujours préférer `Query` avec une clé de partition bien définie.
- Distribuer uniformément les écritures sur les partitions en choisissant des partition keys à haute cardinalité pour éviter les hot partitions.
- Toujours activer le Point-in-Time Recovery (PITR) et les backups automatiques pour la protection des données en production.
- Limiter la taille des items à moins de 100 KB (max 400 KB) en externalisant les données volumineuses vers S3 avec une référence dans DynamoDB.
