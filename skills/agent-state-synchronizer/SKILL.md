---
name: agent-state-synchronizer
description: Synchronisation d'état entre agents et sous-agents travaillant en parallèle sur un état partagé. Se déclenche avec "synchronisation agent", "état partagé", "shared state", "agent sync", "concurrent agents", "state management multi-agent", "parallel agent state".
---

# Agent State Synchronizer

## Quand utiliser ce skill
Utilise ce skill lorsque plusieurs agents ou sous-agents accèdent et modifient un état partagé en parallèle. Cela s'applique aux architectures où des agents collectent, transforment et agrègent des données simultanément, aux workflows où des agents ont besoin de savoir ce que font les autres (coordination), et aux systèmes qui doivent récupérer un état cohérent après une panne. Sans synchronisation explicite, les agents écrivent des données incohérentes, se font écraser mutuellement et produisent des résultats imprévisibles.

## Workflow

1. **Concevoir le shared state** — Commence par définir précisément **ce qui est partagé** : pas tout l'état de chaque agent, seulement les données nécessaires à la coordination. Critères de design : **granularité** (fine-grained : chaque champ est un objet séparé avec son propre locking ; coarse-grained : un seul objet verrouillé en entier), **schéma** (défini avec Pydantic ou TypedDict, versionné), **ownership** (qui peut écrire quoi : un état `READ_ALL / WRITE_OWN` réduit les conflits). Minimise l'état partagé : ce qui peut rester local à un agent doit rester local.

```python
from pydantic import BaseModel
from typing import Any
from datetime import datetime

class SharedState(BaseModel):
    version: int = 0
    schema_version: str = "1.0"
    task_assignments: dict[str, str] = {}      # task_id → agent_id
    task_results: dict[str, Any] = {}           # task_id → result
    agent_status: dict[str, str] = {}           # agent_id → "idle"|"working"|"done"|"error"
    global_context: dict[str, Any] = {}         # données partagées en lecture seule
    last_updated: datetime = datetime.utcnow()
    last_updated_by: str = ""
```

2. **Choisir le state store** — Selon les contraintes de l'architecture : **dict Python en mémoire** (mono-processus, pas de persistance, ultra-rapide), **Redis** (multi-processus, persistance optionnelle, atomic operations avec MULTI/EXEC), **PostgreSQL** (persistance forte, transactions ACID, SELECT FOR UPDATE pour le locking), **event log** (append-only, reconstruit l'état depuis les events, excellente auditabilité), **vector store** (si l'état inclut des embeddings ou des données sémantiques). Pour la plupart des multi-agent systems en développement, commence avec Redis.

```python
import redis.asyncio as aioredis
import json

class RedisStateStore:
    def __init__(self, redis_url: str, key_prefix: str = "agent_state"):
        self.r = aioredis.from_url(redis_url)
        self.prefix = key_prefix

    async def get(self, state_key: str) -> dict | None:
        data = await self.r.get(f"{self.prefix}:{state_key}")
        return json.loads(data) if data else None

    async def set(self, state_key: str, state: dict, ttl: int | None = None):
        serialized = json.dumps(state, default=str)
        if ttl:
            await self.r.setex(f"{self.prefix}:{state_key}", ttl, serialized)
        else:
            await self.r.set(f"{self.prefix}:{state_key}", serialized)

    async def atomic_update(self, state_key: str, update_fn) -> dict:
        key = f"{self.prefix}:{state_key}"
        async with self.r.pipeline(transaction=True) as pipe:
            await pipe.watch(key)
            current = json.loads(await pipe.get(key) or "{}")
            updated = update_fn(current)
            pipe.multi()
            pipe.set(key, json.dumps(updated, default=str))
            await pipe.execute()
        return updated
```

3. **Choisir le modèle de concurrence** — **Optimistic locking** (chaque agent lit la version courante, calcule sa mise à jour, et écrit seulement si la version n'a pas changé entre-temps — idéal pour les conflits rares), **Pessimistic locking** (l'agent acquiert un verrou exclusif avant de lire et d'écrire — idéal pour les conflits fréquents ou les mutations critiques), **CRDT** (Conflict-free Replicated Data Types : structures de données qui mergent automatiquement sans conflit — idéal pour les compteurs, sets, et états append-only), **Event sourcing** (aucun état mutable partagé, seulement des events immuables — le plus robuste mais le plus complexe).

```python
import asyncio

class OptimisticLockStateManager:
    """Optimistic locking avec retry automatique."""

    def __init__(self, store: RedisStateStore, max_retries: int = 3):
        self.store = store
        self.max_retries = max_retries

    async def update(self, key: str, agent_id: str, update_fn, retry_delay: float = 0.1) -> dict:
        for attempt in range(self.max_retries):
            state = await self.store.get(key) or {}
            current_version = state.get("version", 0)
            new_state = update_fn(state)
            new_state["version"] = current_version + 1
            new_state["last_updated_by"] = agent_id
            try:
                # Écriture atomique conditionnelle via Redis WATCH
                saved = await self.store.atomic_update(key, lambda _: new_state)
                return saved
            except Exception:  # Version conflict
                await asyncio.sleep(retry_delay * (2 ** attempt))  # exponential backoff
        raise RuntimeError(f"Impossible de mettre à jour l'état après {self.max_retries} tentatives")
```

4. **Définir les patterns Read/Write** — Distingue les agents **lecteurs** (read-only, peuvent travailler sur un snapshot, pas besoin de locking fort) des agents **écrivains** (modifient l'état, nécessitent une synchronisation). Patterns recommandés : **read replicas** (les agents lecteurs lisent depuis un replica local mis à jour périodiquement, les agents écrivains écrivent sur le master), **write quorum** (un write n'est validé que si N/2+1 agents confirment, pour la haute disponibilité), **single writer** (un seul agent peut écrire à la fois, simplifie drastiquement la synchronisation).

5. **Résoudre les conflits d'écriture** — Quand deux agents ont modifié le même champ : **last-write-wins (LWW)** (le timestamp le plus récent gagne — simple mais peut perdre des données), **merge functions** (définir une fonction de merge par champ : `max()` pour les compteurs, `union()` pour les sets, `LLM synthesis` pour le texte), **manual resolution** (mettre le champ en état `CONFLICT` et déclencher le skill `agent-conflict-resolver`), **vector clocks** (chaque agent maintient un vecteur d'horloge logique pour détecter les relations causales entre les mises à jour).

```python
from typing import Callable

MERGE_FUNCTIONS: dict[str, Callable] = {
    "counter": max,
    "set_field": lambda a, b: list(set(a) | set(b)),
    "list_append": lambda a, b: a + [x for x in b if x not in a],
    "overwrite": lambda a, b: b,  # last-write-wins
}

def merge_states(state_a: dict, state_b: dict, field_policies: dict[str, str]) -> dict:
    merged = {}
    all_keys = set(state_a) | set(state_b)
    for key in all_keys:
        if key not in state_a:
            merged[key] = state_b[key]
        elif key not in state_b:
            merged[key] = state_a[key]
        else:
            policy = field_policies.get(key, "overwrite")
            merge_fn = MERGE_FUNCTIONS[policy]
            merged[key] = merge_fn(state_a[key], state_b[key])
    return merged
```

6. **Implémenter la sync event-driven** — Plutôt que du polling (chaque agent vérifie l'état toutes les N secondes), utilise un système d'événements : quand l'état change, le state store publie un event sur un channel (`state.changed:{key}`), les agents abonnés reçoivent la notification et peuvent réagir. Avec Redis : `PUBLISH/SUBSCRIBE` ou Redis Streams. Avantages : réactivité immédiate, moins de charge sur le state store, consistance éventuelle naturelle.

```python
import asyncio

class EventDrivenStateSync:
    def __init__(self, redis_url: str):
        self.r = aioredis.from_url(redis_url)
        self._subscribers: dict[str, list[Callable]] = {}

    async def subscribe(self, state_key: str, callback):
        self._subscribers.setdefault(state_key, []).append(callback)
        async with self.r.pubsub() as pubsub:
            await pubsub.subscribe(f"state.changed:{state_key}")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    new_state = json.loads(message["data"])
                    for cb in self._subscribers.get(state_key, []):
                        await cb(new_state)

    async def publish_change(self, state_key: str, new_state: dict):
        await self.r.publish(f"state.changed:{state_key}", json.dumps(new_state, default=str))
```

7. **Implémenter snapshots et checkpoints** — Pour la résilience : **periodic snapshot** (sauvegarder l'état complet toutes les N secondes ou N opérations), **checkpoint on milestone** (snapshot à chaque étape clé du workflow), **rollback capability** (garder les N derniers snapshots pour permettre de revenir en arrière), **point-in-time recovery** (reconstruire l'état à n'importe quel instant depuis les snapshots + events intercalaires). Stocke les snapshots avec un timestamp et une version dans le state store.

```python
import hashlib

class StateCheckpointer:
    def __init__(self, store: RedisStateStore, max_snapshots: int = 10):
        self.store = store
        self.max_snapshots = max_snapshots

    async def checkpoint(self, state_key: str, state: dict) -> str:
        snap_id = f"{state_key}:snap:{state['version']}"
        await self.store.set(snap_id, state, ttl=86400 * 7)  # 7 jours
        # Maintenir la liste des snapshots
        snap_list_key = f"{state_key}:snapshots"
        snap_list = await self.store.get(snap_list_key) or []
        snap_list.append(snap_id)
        if len(snap_list) > self.max_snapshots:
            oldest = snap_list.pop(0)
            # Supprimer l'ancien snapshot (optionnel selon la politique)
        await self.store.set(snap_list_key, snap_list)
        return snap_id

    async def rollback(self, state_key: str, version: int) -> dict | None:
        snap_id = f"{state_key}:snap:{version}"
        return await self.store.get(snap_id)
```

8. **Gérer la partition tolerance** — Que faire quand un agent perd la connexion au state store ? Options : **read from local cache** (l'agent continue avec sa dernière version locale, en mode dégradé), **fail-fast** (l'agent s'arrête et signale l'erreur — safe pour les opérations critiques), **write to local buffer** (l'agent accumule ses mises à jour localement et les rejoue dès que la connexion est restaurée, avec gestion des conflits), **circuit breaker** (après N échecs consécutifs, basculer en mode dégradé automatiquement). Documente explicitement le comportement choisi.

```python
from datetime import datetime, timedelta

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: float = 30.0):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time: datetime | None = None
        self.state = "closed"  # closed | open | half-open

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

    def record_success(self):
        self.failure_count = 0
        self.state = "closed"

    def can_attempt(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
            if elapsed > self.recovery_timeout:
                self.state = "half-open"
                return True
        return self.state == "half-open"
```

9. **Optimiser les performances** — Techniques d'optimisation : **cache local par agent** (chaque agent maintient un cache LRU des champs qu'il lit fréquemment, invalidé par events), **batch writes** (grouper plusieurs mises à jour en une seule transaction Redis MULTI/EXEC), **lazy sync** (ne synchroniser que les champs modifiés, pas l'état complet), **compression** (compresser les gros états avec `zlib` ou `lz4` avant stockage), **TTL adaptatif** (les états inactifs expirent automatiquement pour limiter la taille du state store).

10. **Monitorer la synchronisation** — Métriques essentielles : **state size** (taille en bytes de l'état global, évolution dans le temps), **sync latency** (délai entre une écriture et sa visibilité par les autres agents, p50/p95), **conflict rate** (nombre de conflits d'écriture par minute), **stale reads** (pourcentage de lectures qui récupèrent une version périmée), **snapshot frequency** (fréquence des checkpoints), **recovery time** (temps pour restaurer l'état depuis un snapshot). Alerte si `conflict_rate > 10/min` ou `sync_latency_p95 > 500ms`.

## Anti-patterns

- **État global sans locking** — Permettre à tous les agents d'écrire librement dans un dict partagé sans synchronisation produit des race conditions et des corruptions silencieuses. Toute écriture partagée doit passer par un mécanisme de contrôle de concurrence.
- **Chaque agent avec sa propre copie sans sync** — Si chaque agent maintient une copie locale de l'état sans mécanisme de synchronisation, le système diverge progressivement et produit des résultats incohérents. Définir clairement ce qui est local vs partagé.
- **State qui grossit sans limite** — Un state store qui accumule indéfiniment des données finit par dégrader les performances de toutes les opérations. Implémenter des TTL, des politiques d'archivage et de pruning dès le départ.
- **Absence de snapshot/rollback** — Sans capacité de rollback, une corruption de l'état partagé ou une erreur d'un agent peut rendre le système entier irrécupérable. Toujours implémenter les checkpoints, même sommaires.

## Règles

1. **Minimise l'état partagé** — Seules les données nécessaires à la coordination inter-agents doivent être dans le state store partagé. Tout ce qui peut rester local à un agent doit rester local. Moins d'état partagé = moins de conflits = meilleures performances.
2. **Définis les policies d'écriture par champ** — Chaque champ de l'état partagé doit avoir une politique de merge explicite (last-write-wins, max, union, etc.). Sans politique définie, les conflits sont résolus de façon arbitraire.
3. **Circuit breaker obligatoire** — Tout accès au state store externe doit être protégé par un circuit breaker. La perte de connexion au state store ne doit pas faire crasher tous les agents simultanément.
4. **Documente les trade-offs de consistance** — Consistance forte (toutes les lectures voient la dernière écriture) est lente. Consistance éventuelle est rapide mais produit des stale reads. Choisis et documente explicitement le niveau de consistance requis par chaque champ.
5. **Adapte au framework** — LangGraph : utilise le `State` object natif avec reducers pour les champs partagés. CrewAI : `shared_memory` ou outil de lecture/écriture partagé. AutoGen : `ConversableAgent` avec shared context. Custom : `asyncio.Lock` pour l'in-process, Redis pour le multi-process.


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
