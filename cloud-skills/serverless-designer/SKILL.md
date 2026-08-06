---
name: serverless-designer
description: Conception d'architectures serverless couvrant Functions, event-driven, cold start et patterns avancés. Se déclenche avec "serverless", "functions as a service", "FaaS", "cold start", "event-driven serverless", "Azure Functions", "Lambda. Also triggers on "serverless architecture", "event-driven functions", "cold start optimization".
---

# Serverless Designer

## Workflow

### 1. Évaluer l'adéquation serverless

Appliquer la grille de décision avant tout design :

| Critère | Serverless ✅ | Conteneur/VM ❌ |
|---|---|---|
| Durée d'exécution | < 15 min (Lambda), < 10 min (AZ Func) | Longue durée / streaming |
| Trafic | Très variable, spiky | Stable et prévisible |
| Cold start toléré | Oui (< 2 s acceptable) | Non (latence < 50 ms requise) |
| État local requis | Non | Oui (session, cache local) |
| Charge réseau | Faible à modérée | Très haute (> 10 K req/s en continu) |

Si 3 critères ou plus sont dans la colonne droite, proposer un déploiement conteneurisé (ECS/AKS/Cloud Run).

### 2. Cartographier les déclencheurs

Lister tous les événements et associer chaque source à une fonction :

```
HTTP/REST      → API Gateway + Lambda / Azure APIM + Function
File upload    → S3 Event / Blob Trigger
Message queue  → SQS / Service Bus → fonction consumer
Timer/CRON     → EventBridge Scheduler / Timer Trigger
Stream         → Kinesis / Event Hub → fonction par batch
Auth event     → Cognito / AAD B2C → Pre/Post trigger
```

Documenter le schéma de l'événement d'entrée dès cette étape pour éviter les surprises au déploiement.

### 3. Découper les fonctions (SRP)

- 1 fonction = 1 responsabilité = 1 déclencheur
- Timeout explicite (ne jamais laisser le défaut)
- Taille de payload max définie (ex. 6 MB Lambda, 100 MB AZ Functions)
- Extraire la logique métier dans des modules testables indépendamment du handler

```python
# Handler thin — délègue à un module testable
def handler(event, context):
    payload = parse_event(event)          # module pur
    result = process_order(payload)       # logique métier
    return format_response(result)        # module pur
```

### 4. Choisir plateforme et runtime

**Comparatif 2026 rapide :**

| Plateforme | Runtime top | Timeout max | Cold start typique |
|---|---|---|---|
| AWS Lambda | Python 3.12, Node 22, Java 21 | 15 min | 200 ms–1 s (SnapStart Java) |
| Azure Functions v4 | .NET 8 Isolated, Node 20 | 10 min (Consumption) | 300 ms–2 s |
| Google Cloud Functions 2nd gen | Python 3.12, Go 1.22 | 60 min | 100–500 ms |
| Cloudflare Workers | JS/TS (V8 Isolates) | 30 s CPU | < 5 ms (pas de cold start) |

Cloudflare Workers = meilleur choix si latence critique et logique légère.
AWS Lambda SnapStart = meilleur choix Java/JVM pour éliminer le cold start.

### 5. Gérer l'état et la persistance

Les fonctions sont stateless — tout état doit être externalisé :

```
Session courte     → ElastiCache (Redis) / Azure Cache for Redis
Données structurées → DynamoDB / Cosmos DB (mode serverless)
Fichiers           → S3 / Azure Blob Storage
État de workflow   → Step Functions / Durable Functions
Compteurs atomiques → DynamoDB atomic increment / Redis INCR
```

Pattern recommandé — idempotence :
```python
# Utiliser un idempotency_key pour éviter les doubles traitements
def process(event):
    key = event["idempotency_key"]
    if cache.exists(key):
        return cache.get(key)
    result = do_work(event)
    cache.set(key, result, ttl=3600)
    return result
```

### 6. Optimiser le cold start

**Techniques classées par impact :**

1. **Provisioned Concurrency (Lambda) / Premium Plan (AZ Func)** — élimine le cold start sur les fonctions critiques
   ```bash
   aws lambda put-provisioned-concurrency-config \
     --function-name my-api \
     --qualifier prod \
     --provisioned-concurrent-executions 10
   ```

2. **Réduire la taille du package** — ne bundler que le strict nécessaire
   ```bash
   # Lambda — vérifier la taille réelle
   zip -r function.zip . --exclude "*.test.*" "node_modules/.cache/*"
   du -sh function.zip   # cible < 5 MB décompressé
   ```

3. **Lazy loading des clients lourds** — initialiser hors handler mais avec import paresseux
   ```python
   _db_client = None
   def get_db():
       global _db_client
       if _db_client is None:
           _db_client = boto3.resource("dynamodb")
       return _db_client
   ```

4. **SnapStart (Java Lambda)** — snapshot post-init, restore ~100 ms
5. **Cloudflare Workers / Fastly Compute** — V8 Isolates, pas de cold start

### 7. Choisir le pattern d'orchestration

```
Séquence simple       → Step Functions Express / Durable Functions Activity Chain
Compensation (saga)   → Step Functions Standard + compensating transactions
Fan-out / fan-in      → SNS → N Lambdas → SQS aggregator
Longue durée          → Durable Functions Orchestrator (stateful)
Event choreography    → EventBridge / Event Grid (pas de coordinateur central)
```

**Orchestration vs Choreography :**
- Orchestration (Step Functions) : visibilité totale, debugging facile, couplage fort au moteur
- Choreography (EventBridge) : découplé, scalable, mais flux difficile à tracer → ajouter tracing distribué (X-Ray / OpenTelemetry)

### 8. Sécurité

```
- IAM least privilege par fonction (pas de AdministratorAccess)
- Secrets dans Secrets Manager / Key Vault — jamais en variable d'env plaintext
- VPC endpoint si accès RDS/interne (attention cold start accru ~500 ms)
- Validation du schéma d'entrée dès le handler (ex. Pydantic, Zod)
- Activer Lambda function URL auth type IAM si pas d'API Gateway
```

### 9. Observabilité

Triad minimal obligatoire :
- **Logs structurés JSON** avec correlation ID injecté depuis l'événement
- **Métriques custom** : durée métier, taux d'erreur, taille payload
- **Tracing distribué** : AWS X-Ray / Azure App Insights / OpenTelemetry

```python
import json, logging
logger = logging.getLogger()
logger.setLevel("INFO")

def handler(event, context):
    logger.info(json.dumps({
        "correlation_id": event.get("headers", {}).get("x-correlation-id"),
        "action": "order_processing",
        "order_id": event["order_id"]
    }))
```

## Garde-fous / Anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| Fonction monolithique (> 500 lignes) | Impossible à tester, cold start long | Découper par responsabilité |
| Appels synchrones chaînés (Lambda → Lambda direct) | Couplage fort, timeout cumulé | Passer par une queue SQS/SNS |
| Connexions DB ouvertes dans le handler | Pool épuisé, connexions orphelines | RDS Proxy / Cosmos serverless / client hors handler |
| Pas de DLQ sur les consumers async | Perte silencieuse de messages | DLQ systématique + alerte CloudWatch |
| Variables d'env avec secrets plaintext | Exposition dans logs/console | Secrets Manager + cache en mémoire |
| Timeout trop long sans circuit-breaker | Coût et latence incontrôlés | Timeout agressif + retry avec backoff exponentiel |
| Fan-out sans throttling | Throttling DynamoDB/RDS en aval | SQS batch + reserved concurrency |

## Bonnes pratiques 2026

- **Adopt ARM64 (Graviton3 / Ampere)** sur Lambda et Cloud Run — 20 % moins cher, souvent plus rapide
- **Lambda function URLs** remplacent souvent API Gateway pour les APIs simples (< 1 M req/jour)
- **Azure Container Apps** = alternative si > 10 min d'exécution nécessaire tout en gardant le modèle serverless
- **Cold start budget** : définir un SLO explicite (ex. p99 < 2 s) et monitorer via CloudWatch Insights
- **Infrastructure as Code obligatoire** : SAM (AWS), Bicep (Azure), Terraform pour la reproductibilité
  ```bash
  # Déploiement SAM
  sam build && sam deploy --guided

  # Azure Functions Core Tools
  func azure functionapp publish <app-name> --python
  ```
- **Tests locaux avant déploiement** : `sam local invoke`, `func start`, Vitest/Jest pour les handlers purs
