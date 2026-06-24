---
name: mongodb-guide
description: Modélisation et requêtes MongoDB. Se déclenche avec "MongoDB", "Mongo", "NoSQL", "aggregation pipeline", "sharding", "replica set"
---

# MongoDB Guide

## Workflow

### 1. Analyser les patterns d'accès

Avant tout schéma, lister les requêtes réelles : quelles entités sont lues ensemble ? À quelle fréquence ? Ratio lecture/écriture ?

Critères de décision **embed vs reference** :

| Critère | Embed | Reference |
|---|---|---|
| Données toujours lues ensemble | ✅ | ❌ |
| Taille du tableau bornée (<100 éléments) | ✅ | ❌ |
| Données partagées entre plusieurs parents | ❌ | ✅ |
| Mise à jour fréquente de sous-documents | ❌ | ✅ |
| Document proche de 16 Mo | ❌ | ✅ |

### 2. Concevoir le schéma

**Patterns courants :**

- **Subset** : n'embarquer que les N derniers éléments (ex. 10 derniers avis)
- **Computed** : stocker un agrégat précalculé (total, moyenne) mis à jour à l'écriture
- **Bucket** : regrouper des séries temporelles par période (ex. mesures IoT par heure)
- **Extended Reference** : dupliquer les champs les plus lus du document référencé
- **Outlier** : gérer les documents « hors-norme » via un flag + collection overflow

Exemple schéma **Computed** (compteur dénormalisé) :
```js
// À l'écriture d'un avis :
db.products.updateOne(
  { _id: productId },
  {
    $push: { latestReviews: { $each: [review], $slice: -10 } },
    $inc: { reviewCount: 1, ratingSum: review.rating }
  }
)
// reviewCount et ratingSum toujours à jour, aucun $lookup nécessaire
```

### 3. Construire les aggregation pipelines

Règles d'ordre obligatoires :
1. `$match` le plus tôt possible (utilise les index)
2. `$project` / `$unset` pour réduire la taille des documents en transit
3. `$sort` + `$limit` avant `$lookup` pour limiter les jointures

```js
db.orders.aggregate([
  { $match: { status: "shipped", createdAt: { $gte: ISODate("2026-01-01") } } },
  { $project: { customerId: 1, totalAmount: 1, _id: 0 } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$totalAmount" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 20 },
  { $lookup: {
      from: "customers",
      localField: "_id",
      foreignField: "_id",
      as: "customer",
      pipeline: [{ $project: { name: 1, email: 1 } }]
  }},
  { $unwind: "$customer" }
])
```

Stages utiles souvent oubliés :
- `$facet` : plusieurs agrégations en une passe
- `$setWindowFields` : calculs de type window function (rang, cumul)
- `$merge` : écriture du résultat dans une collection (matérialisation)

### 4. Créer les index (règle ESR)

Construire les index composés dans l'ordre **Equality → Sort → Range** :

```js
// Requête : status = "active" AND createdAt >= X ORDER BY score DESC
db.users.createIndex({ status: 1, score: -1, createdAt: 1 })
//                     ^Equality   ^Sort       ^Range
```

Types d'index et cas d'usage :

```js
// Multikey (tableau) — index sur chaque élément du tableau
db.products.createIndex({ tags: 1 })

// Text — recherche full-text avec scoring
db.articles.createIndex({ title: "text", body: "text" }, { weights: { title: 3 } })

// Partiel — indexer uniquement un sous-ensemble de documents
db.orders.createIndex({ userId: 1 }, { partialFilterExpression: { status: "active" } })

// TTL — suppression automatique après expiration
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Wildcard — champs dynamiques inconnus
db.metrics.createIndex({ "attributes.$**": 1 })
```

Valider avant déploiement :
```js
db.orders.find({ status: "shipped" }).explain("executionStats")
// Vérifier : IXSCAN (pas COLLSCAN), totalDocsExamined ≈ nReturned
```

### 5. Configurer le replica set

```js
// Initialisation
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 0, hidden: true, votes: 1 }
  ]
})

// Lecture depuis les secondaires (lecture éventuelle acceptable)
db.getMongo().setReadPref("secondaryPreferred")

// Write concern fort pour données critiques
db.orders.insertOne(doc, { writeConcern: { w: "majority", wtimeout: 5000 } })
```

### 6. Configurer le sharding

Critères pour la shard key :
- **Cardinalité haute** : éviter les clés booléennes ou à faible distribution
- **Distribution uniforme** : éviter les hotspots (ex. timestamp seul)
- **Alignée avec les requêtes** : la shard key doit être dans les filtres les plus fréquents

```js
// Activer le sharding sur une base
sh.enableSharding("mydb")

// Shard key composée (userId + timestamp) — bonne distribution + requêtes ciblées
sh.shardCollection("mydb.events", { userId: 1, createdAt: 1 })

// Vérifier la distribution des chunks
db.adminCommand({ listShards: 1 })
sh.status()
```

### 7. Monitorer et diagnostiquer

```bash
# Opérations en cours et verrous
mongosh --eval "db.currentOp({ active: true, secs_running: { \$gt: 5 } })"

# Statistiques temps réel
mongostat --uri "mongodb://user:pass@host:27017"
mongotop --uri "mongodb://user:pass@host:27017" 10

# Activer le profiler (level 2 = toutes les ops, 1 = slow queries)
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5).pretty()
```

## Garde-fous et anti-patterns

**Pièges fréquents :**

- **Tableaux non bornés** : un champ `comments: []` qui grandit à l'infini fait exploser la taille du document et dégrade les performances de mise à jour. Utiliser le pattern Subset ou une collection séparée.
- **$lookup systématique** : en MongoDB, `$lookup` n'est pas gratuit. Si vous faites des jointures sur toutes les requêtes, remettre en question le schéma (embed les données).
- **Index sur champ de faible cardinalité seul** : un index `{ isDeleted: 1 }` sur un booléen est inutile ; le combiner : `{ isDeleted: 1, createdAt: -1 }`.
- **Pas de writeConcern sur données critiques** : le défaut `w: 1` ne garantit pas la durabilité sur un replica set. Utiliser `w: "majority"` pour les transactions financières.
- **Transactions trop larges** : les transactions multi-documents ont un timeout de 60 s par défaut et génèrent des conflits sous charge. Réduire le périmètre ou repenser le modèle.
- **$where et $function en production** : évaluation JavaScript côté serveur, pas d'index, injection possible. Utiliser les opérateurs natifs.
- **Absence de schema validation** : sans JSON Schema, des documents malformés s'insèrent silencieusement. Définir des règles minimales.

```js
// Schema validation — exemple
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "createdAt"],
      properties: {
        email: { bsonType: "string", pattern: "^.+@.+$" },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationAction: "error"
})
```

## Bonnes pratiques 2026

- **Atlas Search** : préférer aux index `text` natifs pour la recherche full-text — meilleure pertinence, fuzzy search, facets, highlighting.
- **Queryable Encryption** : chiffrement côté client avec possibilité de requêter sur données chiffrées (MongoDB 8+) pour conformité PCI/HIPAA.
- **Time Series Collections** : utiliser `timeseries: { timeField, metaField, granularity }` pour les séries temporelles ; compression automatique et index optimisé.
- **Versioning de schéma** : ajouter un champ `schemaVersion: 1` dans chaque document et gérer la migration lazy (à la lecture) plutôt que batch.
- **Connection pooling** : configurer `maxPoolSize` selon le nombre de workers applicatifs ; ne jamais créer un nouveau `MongoClient` par requête.
- **Aggregation `$merge` planifiée** : matérialiser des vues complexes en collection pour éviter les re-calculs à chaque lecture (pattern CQRS léger).
