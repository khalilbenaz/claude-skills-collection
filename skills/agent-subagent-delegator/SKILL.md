---
name: agent-subagent-delegator
description: Conception de systèmes de délégation parent-agent → sous-agents avec dispatch intelligent, suivi des tâches et agrégation des résultats. Se déclenche avec "sous-agent", "subagent", "délégation agent", "agent parent", "dispatch agent", "agent qui délègue", "spawner sous-agent", "delegate task". Also triggers on "delegate to subagents", "task dispatch to agents", "parent agent delegation".
---

# Subagent Delegator

## Quand utiliser ce skill

| Situation | Action |
|---|---|
| Tâche décomposable en sous-tâches indépendantes | Déléguer en parallèle (fan-out) |
| Domaines métier distincts (research / write / validate) | Sous-agents spécialisés |
| Tâche trop longue pour un seul contexte LLM | Pipeline séquentiel A → B → C |
| Besoin de résultats redondants/comparés | Fan-out + voting |
| Charge variable, agents réutilisables | Pool pré-alloué |

Ne pas déléguer si la tâche tient en 1-2 appels directs : la coordination coûte plus que le gain.

---

## 1. Définir le contrat d'interface avant tout

Avant de coder la logique de dispatch, figer les types d'entrée/sortie. Tout le reste en dépend.

```python
from pydantic import BaseModel
from typing import Any, Literal

class TaskDefinition(BaseModel):
    task_id: str                          # UUID unique, tracé de bout en bout
    objective: str                        # Ce que le sous-agent DOIT produire (1 phrase)
    context: dict[str, Any]              # Données nécessaires (pas le world state entier)
    constraints: list[str]               # Ce qui est interdit ou imposé
    output_format: Literal["json", "text", "structured"]
    timeout: int = 30                     # Secondes — toujours explicite
    priority: int = 1
    retry_limit: int = 3

class TaskResult(BaseModel):
    task_id: str
    agent_id: str
    status: Literal["success", "partial", "failed"]
    data: Any
    errors: list[str] = []
    execution_time: float
    confidence: float = 1.0              # 0.0-1.0, utile pour le fan-in
```

Règle : le `context` ne contient que ce dont le sous-agent a besoin — pas le state global complet. Surcharger le contexte = latence + hallucination.

---

## 2. Choisir la stratégie de dispatch

```
Tâches identiques, N agents disponibles  →  round-robin
Agents avec capacités différentes        →  capability-based (manifest)
Charge en temps réel connue              →  load-based (queue size)
Tâches sémantiquement variées            →  semantic routing (embeddings)
```

Exemple — capability-based avec manifest déclaratif :

```python
# Chaque sous-agent déclare son manifest au démarrage
AGENT_MANIFESTS = {
    "research-agent": {"domains": ["web_search", "doc_retrieval"], "max_tokens": 4000},
    "writer-agent":   {"domains": ["text_generation", "summarization"], "max_tokens": 8000},
    "validator-agent":{"domains": ["fact_check", "schema_validation"], "max_tokens": 2000},
}

def route_task(task: TaskDefinition) -> str:
    """Retourne l'agent_id le plus adapté à la tâche."""
    keyword = task.objective.split()[0].lower()
    for agent_id, manifest in AGENT_MANIFESTS.items():
        if any(keyword in d for d in manifest["domains"]):
            return agent_id
    return "default-agent"
```

Pour le semantic routing (charge plus élevée, pertinent si > 10 types de tâches) :

```python
import numpy as np

def semantic_route(task: TaskDefinition, agents: list, embed_fn) -> str:
    task_vec = embed_fn(task.objective)
    scores = {
        a.id: float(np.dot(task_vec, a.capability_embedding))
        for a in agents
    }
    return max(scores, key=scores.get)
```

---

## 3. Instancier les sous-agents (lifecycle)

**Option A — dynamic (tâche unique, isolation totale) :**
```python
async def delegate_once(task: TaskDefinition, agent_class) -> TaskResult:
    agent = agent_class()
    try:
        return await execute_with_retry(agent, task)
    finally:
        await agent.shutdown()
```

**Option B — pool pré-alloué (haute fréquence, latence faible) :**
```python
import asyncio

class AgentPool:
    def __init__(self, agent_class, size: int = 5):
        self._pool = asyncio.Queue()
        for _ in range(size):
            self._pool.put_nowait(agent_class())

    async def acquire(self):
        return await self._pool.get()

    async def release(self, agent):
        await self._pool.put(agent)

    async def run(self, task: TaskDefinition) -> TaskResult:
        agent = await self.acquire()
        try:
            return await execute_with_retry(agent, task)
        finally:
            await self.release(agent)
```

Choisir dynamic si chaque tâche nécessite un état propre. Choisir pool si les agents sont stateless ou quasi-stateless.

---

## 4. Patterns de délégation

### Fan-out / Fan-in (parallèle + agrégation)
```python
async def fan_out(tasks: list[TaskDefinition], pool: AgentPool) -> list[TaskResult]:
    return await asyncio.gather(*[pool.run(t) for t in tasks], return_exceptions=True)

def fan_in(results: list[TaskResult], strategy: str = "best_confidence") -> TaskResult:
    valid = [r for r in results if isinstance(r, TaskResult) and r.status == "success"]
    if strategy == "best_confidence":
        return max(valid, key=lambda r: r.confidence)
    if strategy == "merge":
        merged_data = [r.data for r in valid]
        return valid[0].model_copy(update={"data": merged_data})
    raise ValueError(f"Unknown strategy: {strategy}")
```

### Pipeline séquentiel (A → B → C)
```python
async def pipeline(initial_input: Any, stages: list[tuple]) -> TaskResult:
    """stages = [(agent, task_factory_fn), ...]"""
    result = initial_input
    for agent, make_task in stages:
        task = make_task(result)           # construit la TaskDefinition à partir du résultat précédent
        task_result = await execute_with_retry(agent, task)
        if task_result.status == "failed":
            raise RuntimeError(f"Pipeline failed at stage {agent.id}: {task_result.errors}")
        result = task_result.data
    return task_result
```

### LangGraph — fan-out déclaratif
```python
from langgraph.graph import StateGraph, END

def build_delegation_graph():
    graph = StateGraph(dict)
    graph.add_node("dispatch",  dispatch_node)
    graph.add_node("research",  research_node)
    graph.add_node("write",     write_node)
    graph.add_node("aggregate", aggregate_node)
    graph.add_edge("dispatch",  "research")
    graph.add_edge("dispatch",  "write")
    graph.add_edge("research",  "aggregate")
    graph.add_edge("write",     "aggregate")
    graph.add_edge("aggregate", END)
    return graph.compile()
```

---

## 5. Retry, circuit breaker et error propagation

```python
async def execute_with_retry(agent, task: TaskDefinition) -> TaskResult:
    """Backoff exponentiel : 1s, 2s, 4s, 8s..."""
    last_exc = None
    for attempt in range(task.retry_limit):
        try:
            return await asyncio.wait_for(agent.run(task), timeout=task.timeout)
        except asyncio.TimeoutError:
            last_exc = TimeoutError(f"Agent {agent.id} timed out after {task.timeout}s")
        except Exception as e:
            last_exc = e
        if attempt < task.retry_limit - 1:
            await asyncio.sleep(2 ** attempt)
    # Escalade au parent : retourner un TaskResult failed plutôt que lever
    return TaskResult(
        task_id=task.task_id, agent_id=agent.id,
        status="failed", data=None,
        errors=[str(last_exc)], execution_time=0.0,
    )
```

Circuit breaker minimal :
```python
from collections import defaultdict

_failures: dict[str, int] = defaultdict(int)
CIRCUIT_THRESHOLD = 5

def is_healthy(agent_id: str) -> bool:
    return _failures[agent_id] < CIRCUIT_THRESHOLD

def record_failure(agent_id: str):
    _failures[agent_id] += 1

def reset_circuit(agent_id: str):
    _failures[agent_id] = 0
```

Décision d'escalade :
- Échec récupérable (timeout réseau, rate-limit) → retry avec backoff
- Échec non-récupérable (données invalides, erreur métier) → `status="failed"`, escalade immédiate
- Agent en quarantaine (circuit ouvert) → fallback sur agent de remplacement ou résultat partiel

---

## 6. Monitoring et heartbeat

```python
from datetime import datetime, timedelta

class AgentMonitor:
    def __init__(self, timeout_s: int = 30):
        self._last_seen: dict[str, datetime] = {}
        self._threshold = timedelta(seconds=timeout_s)

    def heartbeat(self, agent_id: str):
        self._last_seen[agent_id] = datetime.utcnow()

    def is_alive(self, agent_id: str) -> bool:
        last = self._last_seen.get(agent_id)
        return bool(last and datetime.utcnow() - last < self._threshold)

    def dead_agents(self) -> list[str]:
        return [aid for aid in self._last_seen if not self.is_alive(aid)]
```

Log minimum à émettre par le parent à chaque délégation :
```
[DELEGATE] task_id=<uuid> agent=<id> objective="..." timeout=30
[RESULT]   task_id=<uuid> agent=<id> status=success exec=1.2s confidence=0.95
[RETRY]    task_id=<uuid> agent=<id> attempt=2/3 error="TimeoutError"
[ESCALATE] task_id=<uuid> agent=<id> status=failed errors=[...]
```

---

## 7. Capability manifest (contrat de sous-agent)

Chaque sous-agent expose son manifest. Le parent l'utilise pour le routing et la validation.

```python
MANIFEST = {
    "agent_id": "research-agent-v2",
    "version": "2.1.0",
    "domains": ["web_search", "doc_retrieval", "summarization"],
    "input_schema": {
        "query": "str",
        "max_results": "int",
        "language": "str",
    },
    "output_schema": {
        "summary": "str",
        "sources": "list[str]",
        "confidence": "float",
    },
    "constraints": {
        "max_timeout": 60,
        "max_context_tokens": 4000,
    },
}
```

---

## Anti-patterns et pièges

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Objective vague ("fais quelque chose avec ça") | Résultat inutilisable | 1 phrase précise + output_format explicite |
| Aucun timeout sur la tâche | Agent bloqué = système gelé | `timeout` obligatoire, même si généreux |
| Passer le state global en contexte | Hallucination, tokens gaspillés | Ne passer que les données strictement nécessaires |
| Délégation récursive > 3 niveaux | Débogage impossible, latence | Aplatir la hiérarchie, max 2-3 niveaux |
| Résultat accepté sans validation | Erreurs silencieuses propagées | Valider le schema avec Pydantic avant usage |
| Sous-agent stateful dans un pool | Race condition, état corrompu | Réinitialiser l'état à chaque `acquire()` |
| Retry infini sans circuit breaker | Cascade de pannes | Threshold + quarantaine automatique |
| task_id non unique | Tracing impossible | Générer avec `uuid.uuid4()` côté parent |

---

## Bonnes pratiques 2026

- **Idempotence obligatoire** : une tâche rejouée ne doit pas créer de doublon (utiliser `task_id` comme clé d'idempotence côté sous-agent).
- **Tracing distribué** : propager un `trace_id` parent dans chaque `TaskDefinition` pour relier les spans dans OpenTelemetry/Langfuse.
- **Résultats partiels acceptables** : si le fan-out produit 7/10 résultats avant timeout, agréger les 7 plutôt que tout rejeter.
- **Observabilité first** : émettre des métriques (durée, taux d'échec, retries) dès le départ — difficile à ajouter après.
- **Tester le chaos** : simuler des timeouts et des pannes de sous-agents en CI pour valider le circuit breaker et les fallbacks.
- **Versionner les manifests** : quand le contrat d'interface change, bumper la version et maintenir la rétrocompatibilité le temps de la migration.


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
