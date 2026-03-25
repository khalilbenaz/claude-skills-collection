---
name: agent-message-protocol
description: Design de protocoles de communication entre agents et sous-agents — formats de messages, routing et delivery. Se déclenche avec "protocole agent", "message protocol", "communication agent", "agent messaging", "inter-agent communication", "message format agent", "agent API interne".
---

# Agent Message Protocol

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois concevoir ou implémenter un système de communication structuré entre plusieurs agents ou sous-agents. Il s'applique aussi bien aux architectures mono-processus (event bus local) qu'aux systèmes distribués (Redis Streams, RabbitMQ). Indispensable dès que deux agents ou plus doivent s'échanger des tâches, des résultats ou des signaux de contrôle de façon fiable et traçable.

## Workflow

1. **Définir le format de message standard** — Chaque message doit comporter : `message_id` (UUID), `sender` (identifiant de l'agent émetteur), `recipient` (identifiant de l'agent cible ou `"broadcast"`), `type` (voir étape 2), `payload` (données utiles sérialisées), `timestamp` (ISO 8601 UTC), `correlation_id` (pour relier requête et réponse) et `schema_version` (pour la compatibilité).

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
    type: str = ""           # task_request | task_result | status_update | error | heartbeat | control
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    correlation_id: str | None = None
    schema_version: str = "1.0"
```

2. **Typer les messages** — Utilise des types distincts pour chaque usage : `task_request` (demande d'exécution), `task_result` (résultat d'une tâche), `status_update` (progression, pourcentage), `error` (échec avec code et message), `heartbeat` (signal de vie périodique) et `control` (pause, reprise, annulation). Chaque type doit avoir un schéma de `payload` documenté et validé.

3. **Choisir le routing pattern** — Sélectionne le modèle adapté à ton architecture : **direct** (un émetteur, un destinataire connu), **broadcast** (un émetteur, tous les agents abonnés), **topic-based** (abonnement par topic, ex. `"results.summarizer"`), **content-based** (le routeur inspecte le payload pour décider du destinataire). Le content-based routing est le plus flexible mais le plus coûteux en CPU.

```python
class MessageRouter:
    def __init__(self):
        self._topic_subscribers: dict[str, list] = {}

    def subscribe(self, topic: str, handler):
        self._topic_subscribers.setdefault(topic, []).append(handler)

    def route(self, message: AgentMessage):
        if message.recipient == "broadcast":
            for handlers in self._topic_subscribers.values():
                for h in handlers:
                    h(message)
        else:
            for h in self._topic_subscribers.get(message.recipient, []):
                h(message)
```

4. **Garantir la delivery** — Choisis la garantie adaptée au contexte : **at-most-once** (fire-and-forget, acceptable pour les heartbeats), **at-least-once** (retry automatique, nécessite idempotency côté récepteur), **exactly-once** (idempotency key + deduplication store, obligatoire pour les mutations financières ou critiques). Implémente les idempotency keys en stockant les `message_id` déjà traités dans un set ou Redis avec TTL.

5. **Ordonner les messages** — Selon le besoin : **FIFO** simple avec une `deque` ou une queue Redis LIFO, **priority queue** (`heapq` Python, priorité 0–9), **causal ordering** via vector clocks (chaque agent maintient un vecteur d'horloge logique), **timestamp-based** (attention aux dérives d'horloge dans les systèmes distribués). Pour la plupart des cas, FIFO avec priorité suffit.

6. **Sérialiser et versionner** — Préfère **JSON** pour la lisibilité et le debugging, **MessagePack** pour la performance, **Protobuf** pour les contrats stricts entre équipes. Inclure toujours `schema_version` dans chaque message. Maintenir la **backward compatibility** : ajouter des champs optionnels, ne jamais supprimer de champs sans version bump. Utilise `pydantic` pour la validation automatique des schémas.

```python
from pydantic import BaseModel, Field

class TaskRequestPayload(BaseModel):
    task_id: str
    task_type: str
    input_data: dict
    deadline_seconds: int | None = None
    priority: int = Field(default=5, ge=0, le=9)
```

7. **Implémenter ACK/NACK** — Tout message de type `task_request` doit recevoir un accusé de réception explicite. L'émetteur attend un `ACK` (message reçu et accepté) ou `NACK` (refus avec raison). Si aucun ACK n'est reçu dans le délai `ack_timeout_seconds`, l'émetteur doit re-router ou escalader. Stocke les messages en attente d'ACK dans un dictionnaire `pending_acks[correlation_id]`.

8. **Structurer les messages d'erreur** — Un message de type `error` doit contenir : `error_code` (string normalisé, ex. `"TIMEOUT"`, `"VALIDATION_FAILED"`), `error_message` (description humaine), `stack_trace` (optionnel, pour debugging), `retry_hint` (booléen indiquant si le retry est possible), `retry_after_seconds` (délai suggéré), `fallback_suggestion` (action alternative recommandée).

9. **Choisir le middleware** — Pour un **agent in-process** : `asyncio.Queue` Python suffit. Pour **multi-process local** : Redis Streams (`XADD`/`XREAD`) ou RabbitMQ (topics, dead-letter queues). Pour **distribué** : Kafka pour le volume élevé. Implémente toujours une **dead-letter queue** (DLQ) où atterrissent les messages non traités après N retries.

```python
import redis.asyncio as aioredis

async def publish_message(r: aioredis.Redis, stream: str, message: AgentMessage):
    await r.xadd(stream, {"data": message.model_dump_json()}, maxlen=10_000)

async def consume_messages(r: aioredis.Redis, stream: str, group: str, consumer: str):
    await r.xgroup_create(stream, group, id="0", mkstream=True)
    while True:
        results = await r.xreadgroup(group, consumer, {stream: ">"}, count=10, block=1000)
        for _, messages in results:
            for msg_id, fields in messages:
                yield msg_id, fields
                await r.xack(stream, group, msg_id)
```

10. **Monitorer le système de messagerie** — Expose les métriques suivantes : **throughput** (messages/seconde par type), **latence** (temps entre emission et traitement, percentiles p50/p95/p99), **dead-letter count** (messages en DLQ), **pending queue depth** (messages en attente d'ACK), **consumer lag** (retard d'un agent sur le flux). Utilise `prometheus_client` ou des logs structurés JSON pour l'ingestion dans un dashboard.

## Anti-patterns

- **Messages sans `correlation_id`** — Sans cet identifiant, il est impossible de relier une réponse à sa requête dans un flux asynchrone. Tout échange requête/réponse doit utiliser le même `correlation_id`.
- **Fire-and-forget pour les tâches critiques** — Ne jamais envoyer un `task_request` sans attendre d'ACK lorsque la tâche a des effets de bord (écriture en base, appel API externe). L'absence d'ACK doit déclencher un retry ou une alerte.
- **Absence de schema versioning** — Déployer deux versions d'un agent avec des formats de payload incompatibles provoque des erreurs silencieuses difficiles à diagnostiquer. Toujours inclure `schema_version` et valider côté récepteur.
- **Payloads trop volumineux** — Inclure le contexte conversationnel entier dans chaque message explose la taille des messages et dégrade les performances. Stocke le contexte dans un state store partagé et passe uniquement une `context_ref` (identifiant de référence) dans le payload.

## Règles

1. **Un message = un type = un schéma** — Chaque type de message possède un schéma de payload documenté et validé. Ne jamais réutiliser le même type pour des sémantiques différentes.
2. **Toujours inclure `correlation_id` dans les réponses** — Le `correlation_id` de la réponse est identique au `message_id` de la requête originale. C'est la base du pattern request/reply asynchrone.
3. **Idempotence obligatoire pour at-least-once** — Tout handler de message doit être idempotent : traiter le même message deux fois ne doit pas produire d'effets différents. Utilise le `message_id` comme clé de déduplication.
4. **Documente les trade-offs de delivery** — At-most-once est rapide mais perd des messages. Exactly-once est sûr mais coûteux. Choisis explicitement et documente la décision dans l'architecture.
5. **Adapte au framework** — LangGraph : utilise les `Command` objects et le state graph. CrewAI : exploite le mécanisme de `tool` return. AutoGen : utilise les `GroupChat` messages. Pour du custom, implémente un `MessageBus` Python avec `asyncio.Queue` et un dispatcher.
