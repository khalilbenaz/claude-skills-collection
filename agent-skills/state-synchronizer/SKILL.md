---
name: state-synchronizer
description: Synchronisation d'état entre agents et sous-agents travaillant en parallèle sur un état partagé. Se déclenche avec "synchronisation agent", "état partagé", "shared state", "agent sync", "concurrent agents", "state management multi-agent", "parallel agent state".
---

# Agent State Synchronizer

## Quand utiliser ce skill

Utilise ce skill quand plusieurs agents accèdent et modifient un état commun en parallèle : collecte distribuée, workflows coordinés, récupération après panne. Sans synchronisation explicite : race conditions, écrasements silencieux, résultats non déterministes.

---

## Workflow en 8 étapes

### 1. Définir le shared state (schéma minimal)

Ne partager que ce qui est nécessaire à la **coordination** — pas l'état interne de chaque agent.

```python
from pydantic import BaseModel
from typing import Any
from datetime import datetime

class SharedState(BaseModel):
    version: int = 0
    schema_version: str = "1.0"
    task_assignments: dict[str, str] = {}   # task_id → agent_id
    task_results: dict[str, Any] = {}        # task_id → result
    agent_status: dict[str, str] = {}        # agent_id → "idle"|"working"|"done"|"error"
    global_context: dict[str, Any] = {}      # lecture seule pour tous
    last_updated: datetime = datetime.utcnow()
    last_updated_by: str = ""
```

**Critères de design :**
- `READ_ALL / WRITE_OWN` — chaque agent n'écrit que ses propres champs → moins de conflits.
- Fine-grained (un verrou par champ) vs coarse-grained (un seul verrou global) : préférer fine-grained sauf si les transactions multi-champs sont fréquentes.
- Versionner le schéma (`schema_version`) dès le départ pour faciliter les migrations.

---

### 2. Choisir le state store

| Store | Cas d'usage | Avantages | Limites |
|---|---|---|---|
| Dict Python | Mono-process, tests | Ultra-rapide, zéro infra | Pas de persistance, un seul process |
| Redis | Multi-process, dev/prod | Atomic ops, pub/sub, TTL natif | Consistance éventuelle par défaut |
| PostgreSQL | Persistance forte requise | ACID, `SELECT FOR UPDATE` | Plus lent, surcharge opérationnelle |
| Event log | Auditabilité, replay | Immuable, debuggable | Reconstruction de l'état coûteuse |

**Recommandation :** Redis pour la majorité des systèmes multi-agents en 2026.

```python
import redis.asyncio as aioredis
import json

class RedisStateStore:
    def __init__(self, redis_url: str, key_prefix: str = "agent_state"):
        self.r = aioredis.from_url(redis_url)
        self.prefix = key_prefix

    async def get(self, key: str) -> dict | None:
        data = await self.r.get(f"{self.prefix}:{key}")
        return json.loads(data) if data else None

    async def atomic_update(self, key: str, update_fn) -> dict:
        full_key = f"{self.prefix}:{key}"
        async with self.r.pipeline(transaction=True) as pipe:
            await pipe.watch(full_key)
            current = json.loads(await pipe.get(full_key) or "{}")
            updated = update_fn(current)
            pipe.multi()
            pipe.set(full_key, json.dumps(updated, default=str))
            await pipe.execute()
        return updated
```

---

### 3. Choisir le modèle de concurrence

| Modèle | Quand | Trade-off |
|---|---|---|
| Optimistic locking | Conflits rares (< 5 %) | Retry en cas de conflit, performant |
| Pessimistic locking | Conflits fréquents, mutations critiques | Sûr, mais risque de deadlock |
| CRDT | Compteurs, sets, états append-only | Merge automatique, complexe à implémenter |
| Event sourcing | Auditabilité maximale, replay | Robuste, reconstruit depuis les events |

```python
import asyncio

class OptimisticStateManager:
    def __init__(self, store: RedisStateStore, max_retries: int = 3):
        self.store = store
        self.max_retries = max_retries

    async def update(self, key: str, agent_id: str, update_fn, retry_delay: float = 0.1) -> dict:
        for attempt in range(self.max_retries):
            state = await self.store.get(key) or {}
            version = state.get("version", 0)
            new_state = update_fn(state)
            new_state.update({"version": version + 1, "last_updated_by": agent_id})
            try:
                return await self.store.atomic_update(key, lambda _: new_state)
            except Exception:
                await asyncio.sleep(retry_delay * (2 ** attempt))  # backoff exponentiel
        raise RuntimeError(f"Échec mise à jour état après {self.max_retries} tentatives")
```

---

### 4. Définir les politiques de merge par champ

Chaque champ doit avoir une politique explicite. Sans politique : résolution arbitraire → bugs silencieux.

```python
from typing import Callable

MERGE_POLICIES: dict[str, Callable] = {
    "counter":      max,
    "set_field":    lambda a, b: list(set(a) | set(b)),
    "list_append":  lambda a, b: a + [x for x in b if x not in a],
    "overwrite":    lambda a, b: b,   # last-write-wins
}

def merge_states(state_a: dict, state_b: dict, field_policies: dict[str, str]) -> dict:
    merged = {}
    for key in set(state_a) | set(state_b):
        if key not in state_a:
            merged[key] = state_b[key]
        elif key not in state_b:
            merged[key] = state_a[key]
        else:
            fn = MERGE_POLICIES.get(field_policies.get(key, "overwrite"), lambda a, b: b)
            merged[key] = fn(state_a[key], state_b[key])
    return merged
```

Si conflit non résolvable automatiquement → passer la main au skill `agent-conflict-resolver`.

---

### 5. Sync event-driven (éviter le polling)

Le polling toutes les N secondes charge inutilement le state store. Préférer pub/sub.

```python
class EventDrivenSync:
    def __init__(self, redis_url: str):
        self.r = aioredis.from_url(redis_url)

    async def publish(self, key: str, new_state: dict):
        await self.r.publish(f"state.changed:{key}", json.dumps(new_state, default=str))

    async def subscribe(self, key: str, callback):
        async with self.r.pubsub() as pubsub:
            await pubsub.subscribe(f"state.changed:{key}")
            async for msg in pubsub.listen():
                if msg["type"] == "message":
                    await callback(json.loads(msg["data"]))
```

Pour des besoins d'historique et de replay : utiliser **Redis Streams** (`XADD`/`XREAD`) plutôt que pub/sub simple.

---

### 6. Snapshots et rollback

```python
class StateCheckpointer:
    def __init__(self, store: RedisStateStore, max_snapshots: int = 10):
        self.store = store
        self.max_snapshots = max_snapshots

    async def checkpoint(self, key: str, state: dict) -> str:
        snap_id = f"{key}:snap:{state['version']}"
        await self.store.r.set(snap_id, json.dumps(state, default=str), ex=86400 * 7)
        snap_list_key = f"{key}:snapshots"
        snaps = await self.store.get(snap_list_key) or []
        snaps.append(snap_id)
        if len(snaps) > self.max_snapshots:
            snaps.pop(0)  # purger les plus anciens
        await self.store.r.set(snap_list_key, json.dumps(snaps))
        return snap_id

    async def rollback(self, key: str, version: int) -> dict | None:
        return await self.store.get(f"{key}:snap:{version}")
```

Déclencher un checkpoint : à chaque milestone workflow, après N opérations, ou en cas d'erreur agent.

---

### 7. Circuit breaker (protection panne state store)

```python
from datetime import datetime

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: float = 30.0):
        self.failures = 0
        self.threshold = failure_threshold
        self.timeout = recovery_timeout
        self.last_failure: datetime | None = None
        self.state = "closed"  # closed | open | half-open

    def record_failure(self):
        self.failures += 1
        self.last_failure = datetime.utcnow()
        if self.failures >= self.threshold:
            self.state = "open"

    def record_success(self):
        self.failures = 0
        self.state = "closed"

    def can_attempt(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open" and self.last_failure:
            elapsed = (datetime.utcnow() - self.last_failure).total_seconds()
            if elapsed > self.timeout:
                self.state = "half-open"
                return True
        return self.state == "half-open"
```

En mode `open` : lire depuis le cache local (mode dégradé documenté) ou fail-fast selon la criticité.

---

### 8. Monitoring et alertes

Métriques minimales à instrumenter :

| Métrique | Seuil d'alerte |
|---|---|
| `sync_latency_p95` | > 500 ms |
| `conflict_rate` | > 10 / min |
| `stale_read_ratio` | > 5 % |
| `state_size_bytes` | croissance > 10 % / heure |
| `circuit_breaker_open` | toute ouverture |

```python
# Exemple avec prometheus_client
from prometheus_client import Counter, Histogram

sync_latency = Histogram("agent_state_sync_latency_seconds", "Latence sync état", ["operation"])
conflict_count = Counter("agent_state_conflicts_total", "Conflits d'écriture", ["agent_id"])
```

---

## Adaptation aux frameworks

| Framework | Mécanisme natif |
|---|---|
| **LangGraph** | `State` object + reducers par champ (`operator.add`, custom) |
| **CrewAI** | `shared_memory` ou outil de lecture/écriture partagé |
| **AutoGen** | `ConversableAgent` avec `shared_context` dict |
| **Custom async** | `asyncio.Lock` (mono-process) ou Redis (multi-process) |

---

## Anti-patterns et pièges

- **Dict partagé sans verrou** — Race condition garantie en async. Toute écriture partagée passe par un mécanisme de contrôle de concurrence, même `asyncio.Lock` minimal.
- **Copie locale sans sync** — Chaque agent avec sa propre copie et aucun mécanisme de réconciliation : l'état diverge silencieusement. Définir explicitement ce qui est local vs partagé.
- **État qui grossit sans limite** — Pas de TTL, pas de pruning → dégradation progressive. Implémenter les politiques d'expiration dès le départ.
- **Pas de snapshot** — Une corruption ou une erreur agent rend le système irrécupérable. Checkpoints obligatoires, même sommaires.
- **Polling agressif** — Vérifier l'état toutes les 100 ms sur 20 agents = surcharge inutile. Pub/sub ou Redis Streams à la place.
- **Politiques de merge implicites** — Résolution de conflit sans politique définie = comportement non déterministe. Documenter la politique de chaque champ dans le schéma.
- **Circuit breaker absent** — La panne du state store cascade sur tous les agents simultanément. Circuit breaker obligatoire sur tout accès réseau au state store.
- **Consistance forte partout** — Forcer la consistance forte sur tous les champs ralentit inutilement le système. Évaluer champ par champ : certains acceptent la consistance éventuelle.
