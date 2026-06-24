---
name: elasticsearch-guide
description: Recherche et analyse avec Elasticsearch et la stack ELK. Se déclenche avec "Elasticsearch", "Elastic", "Kibana", "full-text search", "recherche plein texte", "ELK"
---

# Elasticsearch Guide

## Workflow

### 1. Analyser le besoin

Avant tout mapping ou requête, répondre à ces questions :

| Question | Impact |
|---|---|
| Full-text ou filtrage exact ? | `text` vs `keyword` |
| Données temporelles (logs, métriques) ? | ILM + data streams |
| Volume par jour / rétention ? | Nombre de shards, rollover |
| Latence cible (<100ms / <1s) ? | Replicas, routing, cache |
| Agrégations nécessaires ? | `doc_values: true`, `fielddata` à éviter |

---

### 2. Concevoir le mapping

**Toujours définir un mapping explicite** — ne jamais laisser Elasticsearch inférer en production.

```json
PUT /produits
{
  "mappings": {
    "properties": {
      "titre":        { "type": "text", "analyzer": "french",
                        "fields": { "raw": { "type": "keyword" } } },
      "categorie":    { "type": "keyword" },
      "prix":         { "type": "scaled_float", "scaling_factor": 100 },
      "created_at":   { "type": "date", "format": "strict_date_optional_time" },
      "tags":         { "type": "keyword" },
      "description":  { "type": "text", "index": false, "doc_values": false }
    }
  }
}
```

**Critères de décision des types :**

- `text` → recherche full-text (tokenisé, analysé)
- `keyword` → filtres, agrégations, tri exact (`categorie`, `status`, `id`)
- `nested` → tableaux d'objets avec relations internes (éviter si possible, coûteux)
- `flattened` → JSON dynamique avec structure inconnue, moindre coût que `nested`
- `scaled_float` → montants monétaires (éviter `float` pour les arrondis)

---

### 3. Configurer l'index et l'ILM

```json
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot":    { "actions": { "rollover": { "max_size": "50gb", "max_age": "7d" } } },
      "warm":   { "min_age": "7d",  "actions": { "shrink": { "number_of_shards": 1 }, "forcemerge": { "max_num_segments": 1 } } },
      "cold":   { "min_age": "30d", "actions": { "freeze": {} } },
      "delete": { "min_age": "90d", "actions": { "delete": {} } }
    }
  }
}
```

**Règle de sizing des shards :**
- Cible : **20–50 Go par shard**
- Nombre de shards primaires = volume total estimé / 40 Go (arrondi supérieur)
- Ne jamais sur-sharder : 1 shard suffit pour < 40 Go de données finales

**Alias obligatoire pour zero-downtime reindex :**

```bash
POST _aliases
{
  "actions": [
    { "add": { "index": "produits-v2", "alias": "produits", "is_write_index": true } },
    { "remove": { "index": "produits-v1", "alias": "produits" } }
  ]
}
```

---

### 4. Construire les requêtes

**Cas courants :**

```json
// Full-text avec boost et filtre
GET /produits/_search
{
  "query": {
    "bool": {
      "must":   [{ "multi_match": { "query": "chaussure running", "fields": ["titre^3", "description"] } }],
      "filter": [{ "term": { "categorie": "sport" } }, { "range": { "prix": { "lte": 150 } } }]
    }
  },
  "sort": [{ "_score": "desc" }, { "created_at": "desc" }]
}
```

```json
// Auto-complétion avec search_as_you_type
GET /produits/_search
{
  "query": {
    "multi_match": {
      "query": "chaus",
      "type": "bool_prefix",
      "fields": ["titre", "titre._2gram", "titre._3gram"]
    }
  }
}
```

```json
// Agrégation : top catégories + prix moyen
GET /produits/_search
{
  "size": 0,
  "aggs": {
    "par_categorie": {
      "terms": { "field": "categorie", "size": 10 },
      "aggs": {
        "prix_moyen": { "avg": { "field": "prix" } }
      }
    }
  }
}
```

**Règle `filter` vs `query` :**
- `filter` → pas de scoring, mis en cache → **toujours utiliser pour les conditions binaires** (term, range, exists)
- `must` / `should` → scoring pertinence → uniquement pour le full-text

---

### 5. Réindexation sans downtime

```bash
# 1. Créer le nouvel index avec le mapping corrigé
PUT /produits-v2 { ... }

# 2. Réindexer
POST _reindex?wait_for_completion=false
{
  "source": { "index": "produits-v1" },
  "dest":   { "index": "produits-v2" }
}

# 3. Suivre la tâche
GET _tasks/<task_id>

# 4. Basculer l'alias (voir étape 3)
```

---

### 6. Optimiser les performances

**Index settings pour la production :**

```json
PUT /produits/_settings
{
  "index": {
    "refresh_interval": "30s",        // augmenter si ingestion intensive
    "number_of_replicas": 1,
    "translog.durability": "async",   // OK si perte de quelques secondes acceptable
    "translog.sync_interval": "5s"
  }
}
```

**Désactiver ce qui n'est pas utilisé :**

```json
// Dans le mapping
"description": { "type": "text", "norms": false }          // si pas besoin de scoring par longueur
"identifiant": { "type": "keyword", "doc_values": false }   // si jamais agrégé/trié
```

**Bulk indexing :**

```bash
curl -X POST "localhost:9200/_bulk" -H 'Content-Type: application/json' --data-binary @data.ndjson
# Taille recommandée : 5–15 Mo par batch, 500–1000 docs
```

---

### 7. Monitorer le cluster

```bash
# Santé globale
GET _cluster/health?pretty

# Shards non alloués (rouge/jaune)
GET _cluster/allocation/explain

# Noeuds et utilisation disque
GET _cat/nodes?v&h=name,heap.percent,disk.used_percent,load_1m

# Requêtes lentes (slow log)
PUT /produits/_settings
{
  "index.search.slowlog.threshold.query.warn": "2s",
  "index.search.slowlog.threshold.fetch.warn": "1s"
}

# Thread pools (rejects = problème de charge)
GET _cat/thread_pool?v&h=name,active,queue,rejected
```

---

## Anti-patterns et pièges

| Piège | Conséquence | Correction |
|---|---|---|
| Mapping dynamique en prod | Types inférés incorrectement, impossible à changer | Mapping explicite toujours |
| `fielddata: true` sur `text` | Explosion mémoire heap | Utiliser `keyword` pour les agrégations |
| Trop de shards (over-sharding) | Surcharge CPU/mémoire, latence accrue | 1 shard/40 Go, shrink en warm |
| `_source: false` sans réflexion | Impossible de réindexer, pas de highlight | Ne désactiver que si cas extrême |
| `nested` partout | Requêtes très lentes, explosion du doc count | Préférer `flattened` ou dénormaliser |
| `size: 10000` sans pagination | OOM, timeout | Utiliser `search_after` + `pit` |
| Pas d'alias | Réindexation avec coupure de service | Alias dès le départ, toujours |
| `refresh_interval: 1s` en ingestion bulk | Trop de segments, I/O élevé | Passer à `30s` ou `-1` pendant le bulk |

---

## Bonnes pratiques 2026

- **Data streams** pour tout ce qui est time-series (logs, métriques) — remplace les index alias + ILM manuels.
- **ESQL** (Elasticsearch Query Language) disponible depuis 8.11 : syntaxe SQL-like pour l'analytique, plus lisible que le DSL JSON.
- **Semantic search** : utiliser `semantic_text` (8.12+) avec un modèle ELSER pour la recherche sémantique native sans infra vectorielle externe.
- **k-NN search** : `dense_vector` + `knn` query pour la recherche par similarité (embeddings). Dimensionner HNSW (`m`, `ef_construction`) selon le recall cible.
- Toujours tester les requêtes avec `_explain` et `profile: true` avant mise en production.
- Snapshots automatiques vers S3/Azure Blob : politique de snapshot au minimum quotidienne en production.
