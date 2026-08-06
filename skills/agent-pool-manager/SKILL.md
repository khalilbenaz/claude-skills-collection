---
name: agent-pool-manager
description: Gestion de pools de sous-agents pré-instanciés pour performance et réutilisation. Se déclenche avec "pool agent", "agent pool", "pool de sous-agents", "pre-allocated agents", "agent reuse", "warm agents", "agent cache", "worker pool agents". Couvre sizing, checkout/checkin, state reset, health monitoring, auto-scaling et routing multi-pool. Also triggers on "reuse agent instances".
---

# Agent Pool Manager

## Quand utiliser un pool d'agents

| Situation | Pool recommandé ? |
|---|---|
| Latence de cold-start > 500 ms (chargement modèle, init tools) | Oui |
| Rafales de tâches homogènes (même type d'agent) | Oui |
| Tâches ponctuelles, types variés et imprévisibles | Non |
| Budget CPU/mémoire contraint, peu de concurrence | Non — instancier à la demande |
| SLA strict sur le temps de réponse (< 200 ms P95) | Oui |

**Règle rapide :** si le coût de warm-up dépasse 20 % du temps de traitement moyen d'une tâche, un pool est rentable.

---

## Workflow en 10 étapes

### 1. Définir la topologie du pool

Choisir entre pool **statique** (taille fixe, simple, prévisible) et pool **dynamique** (auto-scaling, plus complexe).

- Pool statique : cas d'usage à charge constante, environnements embarqués.
- Pool dynamique : SaaS, charges variables, pics prévisibles ou non.

Identifier les types d'agents et leur proportion :
```
researcher_pool : min=3, max=10
coder_pool      : min=2, max=8
reviewer_pool   : min=1, max=4
```

### 2. Initialiser le pool au démarrage

Pré-créer `min_size` agents, effectuer un health check avant de les marquer `available`.

```python
async def initialize(self):
    for _ in range(self.min_size):
        agent = await self._create_agent()
        if await agent.ping():          # health check initial
            self._all_agents[agent.id] = agent
            await self._available.put(agent)
        else:
            await agent.destroy()       # ne pas injecter un agent cassé
    print(f"[POOL:{self.agent_type}] {self._available.qsize()} agents prêts")
```

### 3. Checkout avec timeout obligatoire

Ne jamais attendre indéfiniment. Lever une exception explicite plutôt que bloquer.

```python
async def _checkout(self, timeout: float = 5.0) -> PooledAgent:
    try:
        agent = await asyncio.wait_for(self._available.get(), timeout=timeout)
    except asyncio.TimeoutError:
        raise PoolExhaustedError(
            f"Aucun agent {self.agent_type} disponible après {timeout}s "
            f"(pool size={len(self._all_agents)}, waiters={self._waiters})"
        )
    agent.status = "busy"
    agent.use_count += 1
    return agent
```

### 4. Context manager — retour garanti

```python
@asynccontextmanager
async def borrow(self, timeout: float = 5.0):
    self._waiters += 1
    agent = await self._checkout(timeout=timeout)
    self._waiters -= 1
    try:
        yield agent
    finally:
        await self._checkin(agent)   # retour même si exception

# Usage
async with pool.borrow(timeout=3.0) as agent:
    result = await agent.run(task)
```

### 5. State reset complet avant checkin

Un agent retourné doit être **indiscernable** d'un agent neuf.

```python
def reset_state(self):
    self.conversation_history.clear()   # historique LLM
    self.memory.flush()                 # mémoire éphémère
    self.tool_cache.clear()             # cache des tools
    self.context_vars = {}              # variables de session
    self.status = "available"
    self.last_used = datetime.utcnow()
```

Checkin avec remplacement automatique si l'agent est usé :

```python
async def _checkin(self, agent: PooledAgent):
    agent.reset_state()
    if agent.use_count >= agent.max_uses or not await agent.ping():
        del self._all_agents[agent.id]
        fresh = await self._create_agent()
        self._all_agents[fresh.id] = fresh
        await self._available.put(fresh)
    else:
        await self._available.put(agent)
```

### 6. Sizing — calibrer min/max

```
min_size = ceil(avg_concurrent_tasks * 1.2)   # marge 20 %
max_size = ceil(peak_concurrent_tasks * 1.5)  # marge 50 % pour pics
max_uses = 50  # refresh préventif — ajuster selon dégradation observée
```

Calibrer avec des mesures réelles : lancer un test de charge, observer `utilization` et `avg_wait_ms`.

### 7. Health monitoring périodique

```python
async def _health_loop(self, interval: float = 30.0):
    while True:
        await asyncio.sleep(interval)
        for agent_id, agent in list(self._all_agents.items()):
            if agent.status == "available" and not await agent.ping():
                self._all_agents.pop(agent_id, None)
                fresh = await self._create_agent()
                self._all_agents[fresh.id] = fresh
                await self._available.put(fresh)
                print(f"[HEALTH] Agent {agent_id} remplacé (unhealthy)")
```

### 8. Auto-scaling dynamique

```python
async def _autoscale_loop(self, interval: float = 10.0):
    while True:
        await asyncio.sleep(interval)
        m = self.metrics()
        # Scale-up : file d'attente non vide ET pool non saturé
        if m["waiters"] > 0 and m["total"] < self.max_size:
            fresh = await self._create_agent()
            self._all_agents[fresh.id] = fresh
            await self._available.put(fresh)
        # Scale-down : utilisation < 20 % ET au-dessus du min
        elif m["utilization"] < 0.2 and m["total"] > self.min_size:
            try:
                agent = self._available.get_nowait()
                del self._all_agents[agent.id]
                await agent.destroy()
            except asyncio.QueueEmpty:
                pass
```

### 9. Router multi-pool

```python
class PoolRouter:
    def __init__(self):
        self._pools: dict[str, AgentPool] = {}

    def register(self, pool: AgentPool) -> "PoolRouter":
        self._pools[pool.agent_type] = pool
        return self

    def borrow(self, task_type: str, timeout: float = 5.0):
        pool = self._pools.get(task_type)
        if not pool:
            raise ValueError(f"Aucun pool enregistré pour: {task_type!r}")
        return pool.borrow(timeout=timeout)

# Mise en place
router = PoolRouter()
router.register(AgentPool("researcher", min_size=3, max_size=10))
router.register(AgentPool("coder",      min_size=2, max_size=8))
router.register(AgentPool("reviewer",   min_size=1, max_size=4))

async with router.borrow("coder") as agent:
    result = await agent.run(task)
```

### 10. Métriques à exposer

```python
def metrics(self) -> dict:
    busy = sum(1 for a in self._all_agents.values() if a.status == "busy")
    total = len(self._all_agents)
    return {
        "type": self.agent_type,
        "total": total,
        "busy": busy,
        "available": total - busy,
        "utilization_pct": round(busy / max(total, 1) * 100, 1),
        "waiters": self._waiters,
        "avg_use_count": sum(a.use_count for a in self._all_agents.values()) / max(total, 1),
    }
```

Exposer via Prometheus (`/metrics`), Datadog, ou simple log périodique. Alerter si `waiters > 0` pendant plus de 10 s.

---

## Architecture

```
Tâches entrantes
      │
      ▼
┌─────────────┐
│ Pool Router │  routing par task_type
└──────┬──────┘
       ├─────────────────────┐
       ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ researcher   │     │  coder pool  │
│ [A][A][B][A] │     │  [A][B][A]   │
│ min=3 max=10 │     │  min=2 max=8 │
└──────┬───────┘     └──────────────┘
       │  checkout → execute → reset → checkin
       ▼
  Health Monitor  (ping toutes les 30 s, remplace si KO)
  Auto-Scaler     (ajuste total selon waiters / utilization)

  A = available   B = busy
```

---

## Comparatif framework

| Critère | LangGraph | CrewAI | Custom asyncio |
|---|---|---|---|
| Pool natif | Non | Non | `asyncio.Queue` |
| State reset automatique | Non | Non | Manuel (total contrôle) |
| Auto-scaling | Non | Non | Manuel / HPA K8s |
| Health check intégré | Non | Non | Manuel |
| Multi-pool routing | Non | Partiel | Total |

---

## Garde-fous et anti-patterns

**Pool trop grand (idle cost)**
Maintenir 50 agents sans charge coûte en mémoire et en tokens d'initialisation. Calibrer `min_size` au strict nécessaire ; l'auto-scaler gère les pics.

**State reset incomplet**
Si l'historique de conversation persiste, l'agent "se souvient" de la tâche précédente. Résultat : fuites de données entre clients, hallucinations contextuelles. Le reset doit couvrir : historique LLM, mémoire, cache tools, variables session.

**Timeout absent sur checkout**
Sans timeout, une tâche bloque indéfiniment si le pool est saturé. Toujours `asyncio.wait_for(queue.get(), timeout=N)` et lever `PoolExhaustedError`.

**Pool monotype pour tâches hétérogènes**
Un pool d'agents généralistes sous-performe face à des pools spécialisés. La spécialisation améliore la qualité, réduit le prompt overhead et permet un sizing indépendant.

**Pas de refresh après N utilisations**
Les agents LLM accumulent un état interne subtil (cache KV) et peuvent dégrader sur la durée. Définir `max_uses` (50–200 selon le type) et remplacer proactivement.

**Health check trop fréquent**
Un ping toutes les secondes sur 50 agents génère du bruit et consomme les quotas API. Intervalle recommandé : 30–60 s en production, 5 s en dev.

---

## Bonnes pratiques 2026

- **Graceful shutdown** : à l'arrêt, attendre que tous les agents `busy` terminent leur tâche avant de détruire le pool (`await asyncio.gather(*[a.finish() for a in busy_agents])`).
- **Circuit breaker** : si le taux d'agents unhealthy dépasse 50 %, passer en mode dégradé (instanciation à la demande) plutôt que crasher.
- **Observabilité** : tagger chaque tâche avec l'`agent_id` qui l'a traitée pour corréler les anomalies de qualité avec des agents spécifiques.
- **Séparation des pools par environnement** : ne jamais partager un pool entre prod et staging ; les agents peuvent conserver du contexte cross-env en mémoire partagée.
- **Tests de pool** : tester le comportement sous saturation (`max_size` agents tous busy) dès le CI — vérifier que `PoolExhaustedError` est levée proprement, jamais un deadlock.


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
