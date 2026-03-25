---
name: elasticsearch-guide
description: Recherche et analyse avec Elasticsearch et la stack ELK. Se déclenche avec "Elasticsearch", "Elastic", "Kibana", "full-text search", "recherche plein texte", "ELK"
---

# Elasticsearch Guide

## Workflow
1. **Analyser le besoin de recherche** — Identifier le type de recherche requis (full-text, structurée, géospatiale, auto-complétion) et les exigences de pertinence, latence et volume de données.
2. **Concevoir les mappings** — Définir les types de champs (text, keyword, nested, date, geo_point), les analyseurs personnalisés (tokenizers, filters) et les multi-fields selon les besoins de recherche et d'agrégation.
3. **Configurer les index** — Définir le nombre de shards et replicas, les templates d'index, les ILM policies (Index Lifecycle Management) et les alias pour gérer le cycle de vie des données.
4. **Construire les requêtes** — Utiliser les query types appropriés (match, multi_match, bool, nested, function_score) et combiner queries et filters pour optimiser la pertinence et les performances.
5. **Implémenter les agrégations** — Construire les agrégations (terms, date_histogram, nested, pipeline) pour l'analytique et les tableaux de bord Kibana.
6. **Optimiser les performances** — Tuner les paramètres de recherche (routing, preference), optimiser les mappings (doc_values, norms, index: false), et dimensionner le cluster selon le débit requis.
7. **Monitorer le cluster** — Suivre la santé du cluster (vert/jaune/rouge), les métriques JVM, l'utilisation disque, les taux de rejet de threads et les requêtes lentes via les API _cat et _cluster.

## Règles
- Toujours définir un mapping explicite avant d'indexer des données ; ne jamais s'appuyer sur le mapping dynamique en production.
- Utiliser le type keyword pour les champs d'agrégation et de filtrage exact, et le type text uniquement pour la recherche full-text.
- Ne jamais dépasser 50 Go par shard pour maintenir des performances optimales ; planifier le nombre de shards en fonction du volume de données prévu.
- Toujours utiliser des alias d'index pour permettre la réindexation sans interruption de service (zero-downtime reindexing).
- Séparer les noeuds master, data et coordinating dans les clusters de production pour garantir la stabilité et la scalabilité.
