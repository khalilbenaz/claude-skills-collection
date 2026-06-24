---
name: database-dynamodb-guide
description: Modélisation et requêtes DynamoDB incluant single-table design, GSI, LSI, capacity modes et streams. Se déclenche avec "DynamoDB", "NoSQL AWS", "single-table design", "GSI", "partition key"
---

# DynamoDB Guide

## 1. Identifier les access patterns (obligatoire en premier)

Avant tout schéma, lister **chaque pattern** : entité cible, clés de filtrage, tri, cardinalité, fréquence.

| Pattern | PK | SK | Index |
|---|---|---|---|
| Récupérer user par ID | `USER#<userId>` | `#PROFILE` | table |
| Commandes d'un user (par date) | `USER#<userId>` | `ORDER#<isoDate>` | table |
| Commandes par statut | `STATUS#<status>` | `<isoDate>` | GSI1 |
| Produits par catégorie | `CAT#<categoryId>` | `PRODUCT#<productId>` | GSI2 |

Règle : **ne jamais commencer par le modèle relationnel** ; partir exclusivement des patterns de lecture.

---

## 2. Concevoir le single-table design

```
Table: MyApp
PK (partition key): string
SK (sort key):      string
GSI1PK / GSI1SK:   attributs surchargés pour GSI1
entity_type:        "USER" | "ORDER" | "PRODUCT" (facilite les projections)
ttl:                epoch unix (optionnel, activation TTL côté table)
```

Préfixes d'entité conseillés : `USER#`, `ORDER#`, `PRODUCT#`, `SESSION#`, `STATUS#`.

Modèle overloaded key (un item = plusieurs types) :

```python
# Python (boto3) — créer un user
table.put_item(Item={
    "PK": f"USER#{user_id}",
    "SK": "#PROFILE",
    "entity_type": "USER",
    "email": email,
    "created_at": iso_now,
})

# Créer une commande liée à ce user
table.put_item(Item={
    "PK": f"USER#{user_id}",
    "SK": f"ORDER#{order_date}#{order_id}",
    "entity_type": "ORDER",
    "GSI1PK": f"STATUS#{status}",
    "GSI1SK": order_date,
    "amount": Decimal("99.90"),
})
```

---

## 3. Définir les index secondaires

**GSI (Global Secondary Index)** — clé de partition différente de la table principale, bonne pour les lookups cross-partition.

```bash
# Créer un GSI via AWS CLI
aws dynamodb update-table \
  --table-name MyApp \
  --attribute-definitions AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --global-secondary-index-updates '[{
    "Create": {
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName":"GSI1PK","KeyType":"HASH"},
        {"AttributeName":"GSI1SK","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"},
      "BillingMode": "PAY_PER_REQUEST"
    }
  }]'
```

**LSI (Local Secondary Index)** — même PK que la table, SK alternatif. Doit être déclaré **à la création** de la table, impossible d'en ajouter après.

Critères de choix :

| Besoin | Choix |
|---|---|
| Tri alternatif dans la même partition | LSI |
| Lookup sur une entité différente | GSI |
| Accès fortement cohérent | LSI (cohérence forte possible) |
| Scalabilité indépendante | GSI |

Limite : max 20 GSI par table, max 5 LSI par table.

---

## 4. Choisir le mode de capacité

| Critère | On-Demand | Provisioned + Auto-scaling |
|---|---|---|
| Trafic imprévisible / startup | ✅ | risque throttling |
| Charge stable et prévisible | trop cher | ✅ |
| Burst soudain | ✅ | configurer burst capacity |
| Contrôle budgétaire strict | difficile | ✅ |

```bash
# Passer en provisioned avec auto-scaling (target 70%)
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/MyApp" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --min-capacity 5 --max-capacity 1000

aws application-autoscaling put-scaling-policy \
  --policy-name "DynamoDBReadScaling" \
  --service-namespace dynamodb \
  --resource-id "table/MyApp" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
    '{"TargetValue":70.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"DynamoDBReadCapacityUtilization"}}'
```

---

## 5. Implémenter les opérations CRUD

```python
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("MyApp")

# Query (toujours préférer à Scan)
resp = table.query(
    KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("ORDER#"),
    ScanIndexForward=False,   # tri DESC
    Limit=20,
    ExclusiveStartKey=last_key,  # pagination
)
items, next_key = resp["Items"], resp.get("LastEvaluatedKey")

# Query sur GSI
resp = table.query(
    IndexName="GSI1",
    KeyConditionExpression=Key("GSI1PK").eq(f"STATUS#PENDING"),
)

# Écriture conditionnelle (optimistic locking)
table.put_item(
    Item={...},
    ConditionExpression=Attr("PK").not_exists(),  # insert only
)

# Transaction atomique (jusqu'à 100 items, 4 MB)
dynamodb.meta.client.transact_write(Items=[
    {"Put": {"TableName": "MyApp", "Item": {...}}},
    {"Update": {"TableName": "MyApp", "Key": {...},
                "UpdateExpression": "SET balance = balance - :amount",
                "ConditionExpression": "balance >= :amount",
                "ExpressionAttributeValues": {":amount": Decimal("50")}}},
])
```

---

## 6. Configurer DynamoDB Streams

```bash
# Activer le stream NEW_AND_OLD_IMAGES
aws dynamodb update-table \
  --table-name MyApp \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

Cas d'usage courants :
- **CDC → OpenSearch** : indexer les champs full-text via Lambda trigger
- **Invalidation de cache** : purger DAX/Redis sur modification
- **Audit log** : persister OLD_IMAGE dans S3/Glacier
- **Event sourcing** : publier dans EventBridge depuis Lambda

View types : `KEYS_ONLY` (minimal) | `NEW_IMAGE` | `OLD_IMAGE` | `NEW_AND_OLD_IMAGES` (audit complet).

---

## 7. Optimiser les coûts et performances

```python
# DAX (DynamoDB Accelerator) — microseconde latency, drop-in replacement
import amazondax
dax = amazondax.AmazonDaxClient(endpoints=["my-dax.xxx.dax-clusters.amazonaws.com:8111"])
table = dax.Table("MyApp")

# TTL — expiration automatique (epoch unix)
table.put_item(Item={
    "PK": f"SESSION#{session_id}",
    "SK": "#DATA",
    "ttl": int(time.time()) + 3600,  # expire dans 1h
    ...
})
```

Autres leviers :
- **Compression** : gzip les blobs JSON > 1 KB avant stockage, référencer les fichiers > 100 KB dans S3.
- **Batch operations** : `batch_get_item` (jusqu'à 100 items) et `batch_write_item` (25 items) réduisent les roundtrips.
- **Projection GSI** : préférer `INCLUDE` avec les attributs nécessaires plutôt que `ALL` pour réduire la RCU/WCU.

---

## 8. Tester et valider

```bash
# DynamoDB Local (Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# Pointer boto3 sur local
boto3.resource("dynamodb", endpoint_url="http://localhost:8000")

# NoSQL Workbench — visualiser le modèle et simuler les queries (GUI)
# Téléchargement : https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.settingup.html
```

Checklist de validation :
- [ ] Chaque access pattern résolu par `Query` (pas `Scan`)
- [ ] Distribution des PK vérifiée (pas de hot partition)
- [ ] PITR activé en production
- [ ] Alarmes CloudWatch sur `ThrottledRequests` et `SystemErrors`

---

## Garde-fous / anti-patterns / pièges

| Anti-pattern | Conséquence | Remède |
|---|---|---|
| `Scan` en production | Full table read, coûts explosifs | Remodéliser avec GSI |
| PK à faible cardinalité (ex: `status`) | Hot partition, throttling | Ajouter un suffixe de sharding `STATUS#<hash%10>` |
| Modéliser comme une BDD relationnelle | Jointures impossibles, Scans | Partir des access patterns |
| Item > 400 KB | Erreur `ItemSizeTooLarge` | Externaliser vers S3 |
| Trop de GSI (> 5-6) | Coûts WCU doublés, complexité | Fusionner via attributs surchargés |
| Lectures fortement cohérentes partout | 2x le coût en RCU | Utiliser eventual consistency sauf besoin strict |
| Ignorer `LastEvaluatedKey` | Résultats tronqués silencieux | Toujours paginer jusqu'à `null` |
| Transactions > 25 items (ancien quota) | Erreur — nouveau quota 100 items 4 MB | Vérifier version SDK et quota région |

---

## Bonnes pratiques 2026

- **Single-table design par défaut** sauf si équipes séparées ou domaines totalement indépendants.
- **`entity_type` attribute** sur chaque item : facilite le filtering, les projections Lambda, et le debugging.
- **Zero-ETL integration** : DynamoDB → Aurora/Redshift zero-ETL disponible dans la plupart des régions, éviter les pipelines custom.
- **DynamoDB import/export S3** : utiliser pour les migrations et les seeds de données en masse (pas de WCU consommées pour l'import).
- **Resource-based policies** (2024+) : préférer aux VPC endpoints seuls pour le contrôle d'accès inter-comptes.
- **PartiQL** : acceptable pour les requêtes ad-hoc et migrations, pas pour le code applicatif critique (moins performant que l'API native).


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
