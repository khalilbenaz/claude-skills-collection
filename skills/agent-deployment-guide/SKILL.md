---
name: agent-deployment-guide
description: Déploiement d'agents IA en production avec scalabilité et fiabilité. Se déclenche avec "déployer agent", "agent en production", "agent API", "hosting agent", "agent scaling", "agent infrastructure", "servir un agent", "agent cloud". Also triggers on "deploy an agent", "agent in production", "agent hosting".
---

# Agent Deployment Guide

## Quand utiliser ce skill

Passage d'un agent fonctionnel en local vers un déploiement production fiable et scalable. Couvre API synchrone, worker asynchrone, webhook, tâche planifiée, streaming temps réel. Applicable sur AWS, Azure, GCP, ou infrastructure on-premise.

---

## Étape 1 — Choisir le pattern de déploiement

| Pattern | Quand l'utiliser | Latence max | Exemple |
|---|---|---|---|
| API synchrone (FastAPI) | Usage interactif, réponse < 30s | 29s | Chatbot, Q&A |
| Worker async (Celery/Bull) | Tâches longues, batch | Illimité | Analyse de docs, rapport |
| Webhook handler | Événements externes (GitHub, Slack) | 3s (ACK) | Bot Slack, CI/CD agent |
| Scheduled agent (cron) | Récurrent, pas de déclencheur externe | N/A | Rapport hebdo, cleanup |
| Streaming SSE/WebSocket | UX conversationnelle temps réel | < 1s TTFB | Assistant interactif |

**Critère décisif** : si la réponse prend > 30s → worker async + polling/webhook. Sinon → API synchrone.

---

## Étape 2 — Containeriser l'agent

```dockerfile
# Dockerfile multi-stage (léger et sécurisé)
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .
# Pas de root en prod
RUN useradd -m appuser && chown -R appuser /app
USER appuser
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]
```

Points critiques :
- Tag Docker **immutable** (`image:v1.2.3`), jamais `latest` en prod
- Secrets → volume/secret manager, jamais `COPY .env` dans l'image
- Model weights → volume monté ou téléchargement S3 au démarrage, pas dans l'image

---

## Étape 3 — Wrapper API robuste

```python
# main.py — FastAPI avec health checks et streaming
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import asyncio, uuid, os

app = FastAPI()

class AgentRequest(BaseModel):
    message: str = Field(..., max_length=4000)
    conversation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

@app.get("/health")   # liveness probe
async def health(): return {"status": "ok"}

@app.get("/ready")    # readiness probe
async def ready():
    # Vérifier dépendances critiques
    try:
        await check_llm_api()  # ping minimal
        await check_redis()
    except Exception as e:
        raise HTTPException(503, detail=str(e))
    return {"status": "ready"}

@app.post("/run")
async def run_agent(req: AgentRequest):
    async def stream():
        async for chunk in agent.run_stream(req.message, req.conversation_id):
            yield f"data: {chunk}\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream")
```

---

## Étape 4 — State management externalisé (obligatoire)

Toute l'état doit vivre **hors du processus** pour permettre le scaling horizontal.

```python
import redis.asyncio as redis
import json

r = redis.from_url(os.environ["REDIS_URL"])

async def save_thread(conversation_id: str, messages: list):
    await r.setex(
        f"thread:{conversation_id}",
        86400,  # TTL 24h
        json.dumps(messages)
    )

async def load_thread(conversation_id: str) -> list:
    data = await r.get(f"thread:{conversation_id}")
    return json.loads(data) if data else []
```

- **Redis** : sessions courtes, cache tool results (TTL court)
- **PostgreSQL** : historique long terme, audit trail, facturation
- **Ne jamais** stocker l'état dans une variable globale ou en mémoire d'instance

---

## Étape 5 — Worker async pour tâches longues

```python
# tasks.py — Celery worker
from celery import Celery
app_celery = Celery("agent", broker=os.environ["REDIS_URL"])

@app_celery.task(bind=True, max_retries=3, default_retry_delay=60)
def run_long_agent(self, task_id: str, payload: dict):
    try:
        result = agent.run(payload)
        save_result(task_id, result)
    except Exception as exc:
        self.retry(exc=exc)

# Endpoint de soumission
@app.post("/submit")
async def submit(req: AgentRequest):
    task_id = str(uuid.uuid4())
    run_long_agent.delay(task_id, req.dict())
    return {"task_id": task_id, "status_url": f"/status/{task_id}"}

@app.get("/status/{task_id}")
async def status(task_id: str):
    result = get_result(task_id)  # Redis ou DB
    return result or {"status": "pending"}
```

---

## Étape 6 — Scaling et résilience

**Auto-scaling Kubernetes (HPA) :**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agent
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

**Circuit breaker avec tenacity :**
```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(httpx.HTTPError)
)
async def call_llm(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(LLM_ENDPOINT, json={"prompt": prompt})
        response.raise_for_status()
        return response.json()["text"]
```

---

## Étape 7 — Secrets et configuration

```bash
# AWS Secrets Manager — récupération au démarrage
aws secretsmanager get-secret-value \
  --secret-id prod/agent/anthropic-key \
  --query SecretString --output text

# Kubernetes Secret (injecter en env, pas en fichier)
kubectl create secret generic agent-secrets \
  --from-literal=ANTHROPIC_API_KEY=sk-...

# Dans le pod spec
envFrom:
  - secretRef:
      name: agent-secrets
```

Règle : `.env` uniquement en dev local. En prod → secret manager ou Kubernetes Secrets.

---

## Étape 8 — Rollback et canary release

```bash
# Rollback immédiat Kubernetes
kubectl rollout undo deployment/agent
kubectl rollout status deployment/agent

# Canary : 10% vers v2, 90% vers v1 (nginx ingress)
# Annoter l'ingress canary :
kubectl annotate ingress agent-canary \
  nginx.ingress.kubernetes.io/canary="true" \
  nginx.ingress.kubernetes.io/canary-weight="10"
```

---

## Étape 9 — Observabilité minimale obligatoire (dès J1)

```python
# Prometheus metrics — instrumenter dès le début
from prometheus_client import Counter, Histogram, generate_latest
import time

REQUEST_COUNT = Counter("agent_requests_total", "Total requests", ["status"])
REQUEST_LATENCY = Histogram("agent_request_duration_seconds", "Latency")
LLM_COST = Counter("agent_llm_tokens_total", "Tokens used", ["model"])

@app.middleware("http")
async def metrics_middleware(request, call_next):
    start = time.time()
    response = await call_next(request)
    REQUEST_LATENCY.observe(time.time() - start)
    REQUEST_COUNT.labels(status=response.status_code).inc()
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

Métriques indispensables : latence p50/p95/p99, taux d'erreur, tokens LLM consommés, coût/requête, queue depth.

---

## Garde-fous — Anti-patterns et pièges courants

| Piège | Symptôme | Remède |
|---|---|---|
| État en mémoire d'instance | Erreurs aléatoires après scaling | Externaliser tout dans Redis/DB |
| Tag `latest` en prod | Rollback impossible | Tags immutables `v1.2.3` |
| Timeout LLM trop long | Workers bloqués, queue saturée | Timeout 25-28s max, retry avec backoff |
| Secrets dans l'image Docker | Fuite si image partagée | Secret manager + injection runtime |
| Cold start Lambda/Cloud Run sans warmup | Latence p99 catastrophique | Min instances = 1, ou warmup ping |
| Pas de readiness probe | Traffic vers pods non-prêts | `/ready` vérifie TOUTES les dépendances |
| Scaling sur CPU uniquement | Queue déborde, CPU stable | Ajouter métrique custom (queue depth) |
| Réponse synchrone > 30s | Timeouts client, retries en cascade | Passer en worker async + polling |
| Rate limit LLM API non géré | `429` en cascade, panne totale | Retry exponentiel + circuit breaker |

---

## Checklist de mise en production

- [ ] Image Docker avec tag immutable, multi-stage, non-root
- [ ] Secrets via secret manager (pas en dur, pas dans l'image)
- [ ] `/health` et `/ready` implémentés et configurés dans Kubernetes/cloud
- [ ] State 100% externalisé (Redis + DB)
- [ ] Retry + circuit breaker sur les appels LLM API
- [ ] HPA configuré avec métriques pertinentes
- [ ] Métriques Prometheus exposées + dashboard Grafana
- [ ] Rollback testé en staging avant chaque mise en prod
- [ ] Canary ou blue/green pour les releases majeures
- [ ] Alertes sur taux d'erreur > 1% et latence p95 > SLA


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
