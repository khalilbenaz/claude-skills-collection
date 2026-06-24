---
name: agent-message-protocol
description: Design de protocoles de communication entre agents et sous-agents — formats de messages, routing, delivery guarantees, ACK/NACK, versioning et middleware. Se déclenche avec "protocole agent", "message protocol", "communication agent", "agent messaging", "inter-agent communication", "message format agent", "agent API interne".
---

# Agent Message Protocol

## Quand utiliser ce skill

Utilise ce skill dès que deux agents ou plus doivent s'échanger des tâches, des résultats ou des signaux de contrôle de façon fiable et traçable — qu'il s'agisse d'une architecture mono-processus (event bus local) ou distribuée (Redis Streams, RabbitMQ, Kafka).

---

## Workflow en 10 étapes

### 1. Définir le format de message standard

Tout message doit contenir ces champs minimaux :

| Champ | Type | Description |
|---|---|---|
| `message_id` | UUID v4 | Identifiant unique du message |
| `sender` | string | ID de l'agent émetteur |
| `recipient` | string | ID de l'agent cible ou `"broadcast"` |
| `type` | enum | `task_request` / `task_result` / `status_update` / `error` / `heartbeat` / `control` |
| `payload` | dict | Données utiles sérialisées |
| `timestamp` | ISO 8601 UTC | Heure d'émission |
| `correlation_id` | UUID v4 | Relie requête et réponse |
| `schema_version` | string | Ex. `"1.2"` — pour la compatibilité |

```python
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Any

@dataclass
class AgentMessage:
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender: str = ""
    recipient: str = ""
    type: str = ""  # task_request | task_result | status_update | error | heartbeat | control
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    correlation_id: str | None = None
    schema_version: str = "1.0"
```

### 2. Typer les messages — un type = un schéma

Chaque type possède un schéma de `payload` documenté et validé via Pydantic :

```python
from pydantic import BaseModel, Field

class TaskRequestPayload(BaseModel):
    task_id: str
    task_type: str
    input_data: dict
    priority: int = Field(default=5, ge=0, le=9)
    deadline_seconds: int | None = None

class TaskResultPayload(BaseModel):
    task_id: str
    status: str  # "success" | "partial" | "failed"
    output_data: dict
    duration_ms: int

class ErrorPayload(BaseModel):
    error_code: str          # "TIMEOUT" | "VALIDATION_FAILED" | "AGENT_UNAVAILABLE"
    error_message: str
    retry_hint: bool
    retry_after_seconds: int | None = None
    fallback_suggestion: str | None = None
    stack_trace: str | None = None  # debug only, masquer en prod
```

**Ne jamais réutiliser un type pour deux sémantiques différentes.** Si le payload diverge, crée un nouveau type.

### 3. Choisir le routing pattern

| Pattern | Quand l'utiliser | Coût |
|---|---|---|
| **Direct** | Destinataire connu statiquement | Très faible |
| **Broadcast** | Signal à tous les agents (ex. shutdown) | Faible |
| **Topic-based** | Abonnement par catégorie (`results.summarizer`) | Moyen |
| **Content-based** | Le routeur inspecte le payload pour décider | Élevé (CPU) |

```python
class MessageRouter:
    def __init__(self):
        self._handlers: dict[str, list] = {}

    def subscribe(self, topic: str, handler):
        self._handlers.setdefault(topic, []).append(handler)

    def route(self, message: AgentMessage):
        targets = (
            [h for hs in self._handlers.values() for h in hs]
            if message.recipient == "broadcast"
            else self._handlers.get(message.recipient, [])
        )
        for h in targets:
            h(message)
```

**Critère de décision** : préfère topic-based si les agents changent fréquemment ; content-based uniquement si la destination dépend de données dans le payload.

### 4. Garantir la delivery

| Garantie | Usage typique | Contrainte côté récepteur |
|---|---|---|
| **At-most-once** | Heartbeats, métriques | Aucune |
| **At-least-once** | Résultats de tâches | Handler idempotent obligatoire |
| **Exactly-once** | Mutations financières, critiques | Idempotency key + dedup store |

Implémentation de la déduplication (at-least-once → exactly-once) :

```python
import redis.asyncio as aioredis

async def is_duplicate(r: aioredis.Redis, message_id: str, ttl: int = 3600) -> bool:
    key = f"processed:{message_id}"
    was_set = await r.set(key, "1", nx=True, ex=ttl)
    return was_set is None  # None = clé déjà existante = doublon
```

### 5. Ordonner les messages

- **FIFO** : `asyncio.Queue` ou `deque` — couvre 80 % des cas.
- **Priority queue** : `asyncio.PriorityQueue` avec priorité 0–9 (0 = urgent).
- **Causal ordering** : vector clocks (chaque agent maintient un vecteur logique). À réserver aux systèmes fortement distribués.
- **Timestamp-based** : éviter en distribué (dérives d'horloge NTP).

```python
import asyncio

# Priority queue : tuple (priorité, AgentMessage)
pq: asyncio.PriorityQueue = asyncio.PriorityQueue()
await pq.put((2, message_normal))
await pq.put((0, message_urgent))  # traité en premier
```

### 6. Sérialiser et versionner

| Format | Avantage | Inconvénient |
|---|---|---|
| **JSON** | Lisible, debug facile | Verbeux |
| **MessagePack** | ~2× plus compact que JSON | Moins lisible |
| **Protobuf** | Contrat strict, multi-langues | Tooling plus lourd |

Règles de compatibilité :
- **Ajouter** des champs optionnels → backward compatible.
- **Supprimer** un champ → version bump obligatoire (`schema_version`).
- **Renommer** un champ → jamais sans version bump.

```python
# Validation à la réception
def parse_message(raw: dict) -> AgentMessage:
    version = raw.get("schema_version", "1.0")
    if version != "1.0":
        raise ValueError(f"Unsupported schema version: {version}")
    return AgentMessage(**raw)
```

### 7. Implémenter ACK / NACK

Tout `task_request` doit recevoir un accusé explicite. L'émetteur maintient un dictionnaire `pending_acks` :

```python
import asyncio
from typing import Callable

class AckTracker:
    def __init__(self, timeout: float = 5.0):
        self._pending: dict[str, asyncio.Future] = {}
        self._timeout = timeout

    def expect(self, correlation_id: str) -> asyncio.Future:
        fut = asyncio.get_event_loop().create_future()
        self._pending[correlation_id] = fut
        return fut

    def acknowledge(self, correlation_id: str, result: dict):
        fut = self._pending.pop(correlation_id, None)
        if fut and not fut.done():
            fut.set_result(result)

    async def wait(self, correlation_id: str) -> dict:
        fut = self.expect(correlation_id)
        try:
            return await asyncio.wait_for(fut, timeout=self._timeout)
        except asyncio.TimeoutError:
            self._pending.pop(correlation_id, None)
            raise TimeoutError(f"No ACK received for {correlation_id}")
```

**NACK** → l'agent récepteur renvoie un message `error` avec `error_code="NACK"` et `retry_hint=True/False`.

### 8. Choisir le middleware

| Contexte | Solution recommandée | Snippet clé |
|---|---|---|
| In-process, async | `asyncio.Queue` | `queue = asyncio.Queue(maxsize=1000)` |
| Multi-process local | Redis Streams | `XADD` / `XREADGROUP` |
| Distribué modéré | RabbitMQ (topics + DLQ) | Exchange type `topic` |
| Volume élevé | Kafka / Redpanda | Consumer groups, partitions |

```python
# Redis Streams — publish / consume
async def publish(r: aioredis.Redis, stream: str, msg: AgentMessage):
    await r.xadd(stream, {"data": msg.model_dump_json()}, maxlen=10_000)

async def consume(r: aioredis.Redis, stream: str, group: str, consumer: str):
    try:
        await r.xgroup_create(stream, group, id="0", mkstream=True)
    except Exception:
        pass  # groupe déjà existant
    while True:
        results = await r.xreadgroup(group, consumer, {stream: ">"}, count=10, block=1000)
        for _, messages in results:
            for msg_id, fields in messages:
                yield msg_id, AgentMessage(**json.loads(fields[b"data"]))
                await r.xack(stream, group, msg_id)
```

**Dead-Letter Queue (DLQ)** : tout message non traité après N retries (max 3) doit atterrir dans une DLQ séparée pour analyse post-mortem.

```python
MAX_RETRIES = 3
DLQ_STREAM = "agents:dlq"

async def process_with_retry(r, stream, group, consumer, handler):
    async for msg_id, message in consume(r, stream, group, consumer):
        retries = int(message.payload.get("_retries", 0))
        try:
            await handler(message)
        except Exception as e:
            if retries >= MAX_RETRIES:
                message.payload["_error"] = str(e)
                await publish(r, DLQ_STREAM, message)
            else:
                message.payload["_retries"] = retries + 1
                await publish(r, stream, message)
```

### 9. Structurer les messages d'erreur

```python
# Exemple complet d'un message d'erreur bien formé
error_msg = AgentMessage(
    sender="agent-ocr",
    recipient="agent-orchestrator",
    type="error",
    correlation_id="<id-du-task_request-original>",
    payload=ErrorPayload(
        error_code="VALIDATION_FAILED",
        error_message="Champ 'document_type' manquant dans input_data",
        retry_hint=False,
        fallback_suggestion="Utiliser agent-fallback-ocr avec paramètres par défaut",
    ).model_dump(),
)
```

### 10. Monitorer le système de messagerie

Métriques minimales à exposer (Prometheus ou logs JSON structurés) :

| Métrique | Description |
|---|---|
| `msg_throughput{type}` | Messages/seconde par type |
| `msg_latency_ms{p50,p95,p99}` | Délai émission → traitement |
| `msg_dlq_count` | Messages en DLQ (alarme si > 0) |
| `msg_pending_acks` | Messages en attente d'ACK |
| `consumer_lag{agent}` | Retard d'un agent sur le flux |

```python
from prometheus_client import Counter, Histogram

messages_processed = Counter("agent_messages_total", "Total messages", ["type", "status"])
processing_latency = Histogram("agent_message_latency_seconds", "Latency", ["type"])

# Dans le handler
with processing_latency.labels(type=message.type).time():
    await handler(message)
messages_processed.labels(type=message.type, status="success").inc()
```

---

## Anti-patterns et pièges

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| **Messages sans `correlation_id`** | Impossible de relier réponse à requête en async | Toujours copier le `message_id` de la requête dans `correlation_id` de la réponse |
| **Fire-and-forget pour tâches critiques** | Mutations perdues sans trace | Attendre ACK ; déclencher retry ou alerte si timeout |
| **Absence de `schema_version`** | Erreurs silencieuses lors d'un déploiement mixte | Inclure dès le premier message ; valider côté récepteur |
| **Payloads trop volumineux** (contexte LLM complet) | Dégradation des performances, explosion mémoire | Stocker le contexte dans un state store ; passer uniquement une `context_ref` |
| **Handler non idempotent en at-least-once** | Effets de bord doublés (double paiement, double écriture) | Déduplication via `message_id` dans Redis/DB avant traitement |
| **Pas de DLQ** | Messages perdus sans visibilité | Configurer DLQ dès le départ, monitorer son contenu |
| **Types de messages ambigus** | Logique conditionnelle complexe côté récepteur | Un type = un schéma = un handler ; jamais de `if payload.get("mode")` pour bifurquer |

---

## Bonnes pratiques 2026

- **Contract-first** : définis et versionne les schémas Pydantic/Protobuf dans un repo partagé avant de coder les agents. Les agents consomment le package de schémas, pas des dicts libres.
- **Observability as code** : les spans OpenTelemetry doivent propager `trace_id` dans chaque message (champ `telemetry.trace_id`). Permet le tracing distribué de bout en bout entre agents.
- **Graceful degradation** : si le middleware est indisponible, l'agent doit basculer sur une queue locale en mémoire (buffer temporaire), pas tomber en erreur fatale.
- **Backpressure** : limite la taille des queues (`maxsize` ou `maxlen` Redis). Un agent lent ne doit pas faire exploser la mémoire de l'émetteur.
- **Adapte au framework** :
  - **LangGraph** → `Command` objects + state graph nativement.
  - **CrewAI** → retours de `tool` comme messages structurés.
  - **AutoGen** → `GroupChat` + `ConversableAgent` avec `reply_func` personnalisés.
  - **Custom** → `MessageBus` + `asyncio.Queue` + dispatcher centralisé.


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
