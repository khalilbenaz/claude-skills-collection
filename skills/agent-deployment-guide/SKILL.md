---
name: agent-deployment-guide
description: Déploiement d'agents IA en production avec scalabilité et fiabilité. Se déclenche avec "déployer agent", "agent en production", "agent API", "hosting agent", "agent scaling", "agent infrastructure", "servir un agent", "agent cloud".
---

# Agent Deployment Guide

## Quand utiliser ce skill

Utilise ce skill lorsque l'utilisateur souhaite passer d'un agent fonctionnel en local à un déploiement production fiable et scalable. Couvre tous les patterns de déploiement : API synchrone, worker asynchrone, webhook, tâche planifiée, ou streaming temps réel. Applicable sur AWS, Azure, GCP, ou infrastructure on-premise.

## Workflow

1. **Architecture de déploiement** — Choisir le pattern adapté au use case :
   - API synchrone (FastAPI) : réponses < 30s, usage interactif
   - Worker async (Celery/Bull) : tâches longues, > 30s
   - Webhook handler : déclenché par événements externes (GitHub, Slack, Stripe)
   - Scheduled agent (cron) : rapports périodiques, maintenance automatisée
   - Real-time streaming : UI conversationnelle, SSE ou WebSocket

2. **Containerisation** — Créer un `Dockerfile` optimisé pour l'agent :
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```
   Gérer les model weights séparément (volume ou S3), ne jamais inclure de secrets dans l'image.

3. **API wrapping** — Encapsuler l'agent dans une API robuste :
   - Input validation avec Pydantic (schéma strict, limites de taille)
   - Gestion async native (`async def`, streaming avec `StreamingResponse`)
   - Endpoint de santé `/health` et `/ready`
   - Timeout configurables par type de requête
   - Idempotency keys pour éviter les doubles exécutions

4. **Queue et async processing** — Pour les tâches longues :
   - Celery + Redis/RabbitMQ (Python)
   - Bull + Redis (Node.js)
   - Azure Service Bus / AWS SQS / GCP Pub/Sub (cloud-native)
   - Pattern : soumettre la tâche → retourner un `task_id` → polling ou webhook de complétion

5. **Scaling** — Configurer la scalabilité :
   - Horizontal scaling : plusieurs instances stateless, load balancer (nginx, ALB, Traefik)
   - Auto-scaling : HPA Kubernetes basé CPU/mémoire ou métriques custom (queue depth)
   - Connection pooling vers les APIs LLM (httpx avec limites, retry exponentiel)
   - Rate limiting par utilisateur en amont (API Gateway, nginx)

6. **State management en production** — Persister l'état de l'agent :
   - Redis pour sessions courtes et thread cache (TTL 24h)
   - PostgreSQL pour historique de conversations et audit trail
   - Pattern : `conversation_id` unique par session, stockage structuré des messages
   - Ne jamais stocker l'état en mémoire d'instance (incompatible avec scaling horizontal)

7. **Health checks et readiness** — Implémenter des probes robustes :
   - `/health` (liveness) : répond 200 si le processus est vivant
   - `/ready` (readiness) : vérifie connexion LLM API, Redis, base de données
   - Graceful shutdown : terminer les requêtes en cours avant d'arrêter (SIGTERM handler)
   - Timeouts Kubernetes : `initialDelaySeconds`, `periodSeconds`, `failureThreshold`

8. **Environnements** — Gérer le cycle de vie dev → staging → prod :
   - Feature flags (LaunchDarkly, Unleash) pour activer les nouveaux comportements progressivement
   - A/B deployment : router X% du trafic vers la nouvelle version
   - Canary release : déploiement progressif avec rollback automatique sur erreur
   - Config par environnement via variables d'environnement, jamais en dur dans le code

9. **Secrets et config** — Gestion sécurisée des credentials :
   - AWS Secrets Manager / Azure Key Vault / GCP Secret Manager pour les clés API
   - Rotation automatique des clés LLM (stratégie multi-clé avec failover)
   - `.env` uniquement en dev local, jamais en production
   - Injecter via Kubernetes Secrets ou Docker secrets, pas en variable d'environnement plain text

10. **Rollback et recovery** — Assurer la résilience :
    - Versioning des déploiements (tags Docker immutables, pas `latest`)
    - Rollback instantané : `kubectl rollout undo` ou équivalent cloud
    - Circuit breaker (tenacity, pybreaker) : couper le trafic si le LLM API échoue
    - Fallback behavior : réponse dégradée lisible si l'agent est indisponible

## Règles

- Fournis des exemples de code et configuration concrets adaptés au cloud provider de l'utilisateur (AWS, Azure, GCP).
- Priorise la sécurité et la fiabilité : ne jamais exposer de secrets, toujours implémenter des timeouts.
- Documente les pièges courants : cold starts, state en mémoire, timeouts LLM API, coûts de scaling.
- Impose le stateless design pour toutes les instances : toute l'état doit être externalisé.
- Inclure systématiquement les métriques de base (latence, erreurs, coût) dès le déploiement initial.


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
