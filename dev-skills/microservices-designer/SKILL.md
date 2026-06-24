---
name: microservices-designer
description: Conception et découpage d'architecture microservices — DDD, bounded contexts, patterns de communication, migration de monolithe. À utiliser pour concevoir ou migrer vers des microservices. Se déclenche avec "microservices", "découpage", "bounded context", "service mesh", "décomposition monolithe", "architecture distribuée".
---

# Microservices Designer

## Workflow en 8 étapes

### 1. Cartographier le domaine (Event Storming / DDD)
- Réunir les experts métier et tech ; lister tous les **domain events** (faits métier passés).
- Regrouper en **bounded contexts** : chaque contexte a son propre modèle, son langage ubiquitaire.
- Classer : core domain (avantage concurrentiel), supporting, generic (candidat à l'externalisation/SaaS).

```
Exemple — e-commerce :
  Core      : Catalogue, Commande, Pricing
  Supporting: Notification, Inventaire
  Generic   : Paiement (Stripe), Auth (Keycloak)
```

### 2. Définir les services (règle de taille)
Critères de découpage — un service par bounded context SI :
- ≥ 2 équipes différentes ont besoin de déployer indépendamment
- La scalabilité requise diffère significativement (ex: Catalogue ×10 vs Commande ×2)
- Les exigences de sécurité/compliance diffèrent (PCI-DSS isolé)

Signaux de sur-découpage : appels synchrones en chaîne > 3 sauts, transactions distribuées partout, équipe < 5 devs.

### 3. Définir les contrats d'API
- **REST** : OpenAPI 3.1, versionning via URL (`/v1/`) ou `Accept: application/vnd.api+json;version=2`
- **gRPC** : Protobuf `.proto` versionné, backward-compatible (ne jamais supprimer un field)
- **Events** : AsyncAPI 3.0, schema registry (Confluent, AWS Glue)

```yaml
# asyncapi snippet — OrderCreated
channels:
  order.created:
    publish:
      message:
        payload:
          type: object
          properties:
            orderId: { type: string, format: uuid }
            total:   { type: number }
          required: [orderId, total]
```

### 4. Choisir le pattern de communication

| Besoin | Pattern | Outil |
|---|---|---|
| Requête/réponse immédiate | REST / gRPC | Axios, Feign, grpc-go |
| Faible couplage, tolérance à la latence | Message async | Kafka, RabbitMQ, Azure SB |
| Workflow long multi-services | Saga orchestrée | Temporal, MassTransit Saga |
| Cohérence éventuelle acceptable | Saga chorégraphiée | Events Kafka + handlers |
| Agrégation de données cross-services | GraphQL federation | Apollo Federation v2 |

**Règle** : préférer l'asynchrone par défaut ; n'utiliser le synchrone que pour les cas UX qui exigent une réponse immédiate.

### 5. Données — database per service

```
❌ Service A ──┐
               ├── shared DB   (couplage fort, migration impossible indépendamment)
❌ Service B ──┘

✅ Service A ── DB A (Postgres)
✅ Service B ── DB B (MongoDB)
✅ Service C ── DB C (Redis)
```

Patterns avancés :
- **CQRS** : séparer Command model (write) et Query model (read-optimized, répliqué via events)
- **Event Sourcing** : stocker les events bruts (EventStoreDB, Kafka compacted topic) ; reconstruire l'état à la demande
- **Saga** : chaque step publie un event de succès ou compensation en cas d'échec

### 6. Résilience — checklist obligatoire

```csharp
// .NET — Polly v8 (2026)
services.AddHttpClient<IOrderClient, OrderClient>()
    .AddResilienceHandler("order-pipeline", builder =>
    {
        builder.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            BackoffType = DelayBackoffType.Exponential
        });
        builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            SamplingDuration = TimeSpan.FromSeconds(30),
            FailureRatio = 0.5
        });
        builder.AddTimeout(TimeSpan.FromSeconds(5));
    });
```

- **Bulkhead** : thread pool séparé par dépendance critique
- **Fallback** : retourner une réponse dégradée plutôt qu'une erreur 500
- **Idempotency key** : toujours sur les endpoints mutatifs (`Idempotency-Key: <uuid>`)

### 7. Observabilité — stack minimale 2026

```
Traces  → OpenTelemetry SDK → Jaeger / Tempo
Métriques → Prometheus → Grafana
Logs    → structured JSON → Loki / ELK
Alertes → Alertmanager / PagerDuty
```

```python
# Python — OTel auto-instrumentation FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)
```

Règles :
- **Correlation ID** propagé dans tous les headers (`traceparent` W3C standard)
- Health checks : `/healthz/live` (process up) + `/healthz/ready` (dépendances OK)
- SLO défini par service : ex. p99 < 200 ms, error rate < 0.1 %

### 8. Migration d'un monolithe — Strangler Fig

```
Phase 1 : Façade devant le monolithe (reverse proxy / API Gateway)
Phase 2 : Extraire Service X derrière la façade, redirections progressives
Phase 3 : Supprimer le code correspondant du monolithe
Phase 4 : Répéter par service, jamais de big bang
```

Outils : Kong / YARP en façade, feature flags pour basculer le trafic, canary deployment (1 % → 10 % → 100 %).

---

## Anti-patterns & pièges

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| Distributed monolith | Déploiement coordonné obligatoire | Revoir les bounded contexts |
| Nano-services | > 20 services, équipe < 5 devs | Fusionner les services trop fins |
| Shared DB | Migration impossible, couplage fort | Database per service + events |
| Appels synchrones en cascade | Latence additive, failure amplification | Async + cache local |
| Pas d'idempotence | Doublons en cas de retry | Idempotency key systématique |
| Contrats implicites | Breaking changes non détectés | Contract testing (Pact) en CI |

---

## Critères de décision — monolithe vs microservices

```
Microservices recommandés si ≥ 3 critères :
  ☐ Équipes > 2 squads avec ownership distinct
  ☐ Exigences de scalabilité très différentes par domaine
  ☐ Besoin de déploiements indépendants fréquents (> 2×/semaine par domaine)
  ☐ Technologies différentes justifiées par domaine
  ☐ Compliance / isolation sécurité obligatoire par périmètre

Sinon : Modulith d'abord (modules bien isolés dans un monolithe),
        migration service par service quand un critère se déclenche.
```

---

## Bonnes pratiques 2026

- **Service mesh** (Istio, Linkerd, Dapr) : mTLS automatique, observabilité L7, traffic management sans code applicatif.
- **GitOps** : un repo par service, ArgoCD/Flux pour les déploiements Kubernetes.
- **Contract testing** avec Pact en CI : valider que producer et consumer restent compatibles avant merge.
- **Platform engineering** : fournir un Internal Developer Portal (Backstage) avec templates de service pré-configurés (OTel, health, Dockerfile, CI).
- Chaque ADR dans `docs/adr/NNNN-titre.md` (format Nygard) ; lier depuis le README du service.
