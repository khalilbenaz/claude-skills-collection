---
name: agent-pool-manager
description: Gestion de pools de sous-agents pré-instanciés pour performance et réutilisation. Se déclenche avec "pool agent", "agent pool", "pool de sous-agents", "pre-allocated agents", "agent reuse", "warm agents", "agent cache", "worker pool agents".
---

# Agent Pool Manager

## Quand utiliser ce skill

Utiliser ce skill lorsque la latence de création d'agents est inacceptable et que des agents "chauds" (pré-initialisés) sont nécessaires pour répondre rapidement à des requêtes entrantes. Ce skill est particulièrement adapté aux systèmes à fort débit où les mêmes types d'agents sont sollicités en rafale. Il convient également aux architectures où le coût de warm-up (chargement du modèle, initialisation des tools) est significatif et doit être amorti sur plusieurs exécutions.

## Workflow

1. **Conception du pool** — Définir la topologie : taille fixe (pool statique, prévisible) vs taille dynamique (auto-scaling selon la charge). Identifier les types d'agents à maintenir dans le pool et leur proportion relative (ex : 60% researchers, 30% coders, 10% reviewers).

2. **Initialisation du pool** — Pré-créer les agents au démarrage du système : charger les modèles, préparer les outils, initialiser les connexions. Effectuer un health check initial sur chaque agent avant de le marquer `available`.

3. **Checkout / Checkin** — Implémenter le mécanisme d'emprunt : un consommateur réclame un agent (`checkout`), l'utilise pour sa tâche, puis le retourne au pool (`checkin`). Utiliser un pattern de context manager (`with pool.borrow() as agent`) pour garantir le retour automatique.

4. **State reset** — Avant de remettre un agent dans le pool, effacer intégralement son état : historique de conversation, variables de session, cache mémoire, résultats intermédiaires. Un agent retourné doit être indiscernable d'un agent fraîchement créé.

5. **Pool sizing** — Définir `min_size` (agents toujours disponibles) et `max_size` (plafond absolu). Déclencher le scale-up quand la queue d'attente dépasse un seuil ; déclencher le scale-down quand l'utilisation reste sous un pourcentage pendant un intervalle donné.

6. **Health monitoring** — Vérifier périodiquement l'état de santé de chaque agent avec une sonde légère (ping). Remplacer silencieusement les agents unhealthy. Effectuer un refresh complet des agents qui ont dépassé un nombre maximal d'utilisations pour éviter la dégradation progressive.

7. **Pools spécialisés** — Maintenir des pools distincts par spécialisation : `coder_pool`, `researcher_pool`, `reviewer_pool`. Implémenter un router qui sélectionne le bon pool selon le type de tâche entrante.

8. **Queue management** — Gérer la file d'attente des tâches en attente d'un agent disponible : priorité configurable (urgente, normale, basse), politique FIFO par défaut, fair scheduling pour éviter la famine des tâches basse priorité.

9. **Métriques** — Collecter et exposer : taux d'utilisation du pool, temps d'attente moyen, débit (tâches/seconde), taux de réutilisation, coût par tâche. Ces métriques pilotent les décisions d'auto-scaling.

10. **Auto-scaling** — Implémenter le scaling prédictif : scale-up proactif en fonction des patterns de charge historiques (ex : pic du lundi matin), scale-down progressif la nuit. Comparer le coût du warm-up vs le coût de maintien d'agents idle.

```python
# Exemple d'implémentation Python — Agent Pool avec context manager
import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

@dataclass
class PooledAgent:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: str = ""
    status: str = "available"  # available | busy | unhealthy
    use_count: int = 0
    last_used: Optional[datetime] = None
    max_uses: int = 50  # refresh après 50 utilisations

    def reset_state(self):
        """Effacer l'état entre les utilisations."""
        self.status = "available"
        self.last_used = datetime.utcnow()
        # Ici : vider l'historique LLM, reset les tools, etc.
        print(f"[RESET] Agent {self.id} réinitialisé")

    def is_healthy(self) -> bool:
        return self.use_count < self.max_uses and self.status != "unhealthy"


class AgentPool:
    def __init__(self, agent_type: str, min_size: int = 2, max_size: int = 10):
        self.agent_type = agent_type
        self.min_size = min_size
        self.max_size = max_size
        self._available: asyncio.Queue = asyncio.Queue()
        self._all_agents: dict[str, PooledAgent] = {}
        self._waiters: int = 0

    async def initialize(self):
        """Pré-remplir le pool au démarrage."""
        for _ in range(self.min_size):
            agent = PooledAgent(agent_type=self.agent_type)
            self._all_agents[agent.id] = agent
            await self._available.put(agent)
        print(f"[POOL] {self.agent_type} pool initialisé avec {self.min_size} agents")

    @asynccontextmanager
    async def borrow(self):
        """Emprunter un agent — retour automatique à la fin du bloc."""
        self._waiters += 1
        agent = await self._checkout()
        self._waiters -= 1
        try:
            yield agent
        finally:
            await self._checkin(agent)

    async def _checkout(self) -> PooledAgent:
        # Scale-up si nécessaire
        current_size = len(self._all_agents)
        if self._available.empty() and current_size < self.max_size:
            new_agent = PooledAgent(agent_type=self.agent_type)
            self._all_agents[new_agent.id] = new_agent
            await self._available.put(new_agent)
            print(f"[SCALE-UP] Nouvel agent {new_agent.id} ajouté au pool")

        agent = await self._available.get()
        agent.status = "busy"
        agent.use_count += 1
        return agent

    async def _checkin(self, agent: PooledAgent):
        if agent.is_healthy():
            agent.reset_state()
            await self._available.put(agent)
        else:
            # Remplacer l'agent usé
            del self._all_agents[agent.id]
            fresh = PooledAgent(agent_type=self.agent_type)
            self._all_agents[fresh.id] = fresh
            await self._available.put(fresh)
            print(f"[REFRESH] Agent {agent.id} remplacé par {fresh.id}")

    def metrics(self) -> dict:
        busy = sum(1 for a in self._all_agents.values() if a.status == "busy")
        available = sum(1 for a in self._all_agents.values() if a.status == "available")
        return {
            "type": self.agent_type,
            "total": len(self._all_agents),
            "busy": busy,
            "available": available,
            "utilization": busy / max(len(self._all_agents), 1),
            "waiters": self._waiters,
        }


# Pool router multi-spécialisation
class PoolRouter:
    def __init__(self):
        self.pools: dict[str, AgentPool] = {}

    def register(self, pool: AgentPool):
        self.pools[pool.agent_type] = pool

    async def route(self, task_type: str):
        pool = self.pools.get(task_type)
        if not pool:
            raise ValueError(f"Aucun pool pour le type: {task_type}")
        return pool.borrow()

# Usage
async def main():
    router = PoolRouter()
    researcher_pool = AgentPool("researcher", min_size=3, max_size=8)
    coder_pool = AgentPool("coder", min_size=2, max_size=6)
    
    await researcher_pool.initialize()
    await coder_pool.initialize()
    
    router.register(researcher_pool)
    router.register(coder_pool)

    async with researcher_pool.borrow() as agent:
        print(f"Utilisation de l'agent {agent.id}")
        # ... exécuter la tâche ...

    print(researcher_pool.metrics())
```

```
Architecture — Agent Pool Manager

  Tâches entrantes
        │
        ▼
  ┌─────────────┐
  │ Pool Router │ ← routing par type de tâche
  └──────┬──────┘
         │
    ┌────┴──────────────────────┐
    │                           │
    ▼                           ▼
┌──────────────┐        ┌──────────────┐
│ Researcher   │        │  Coder Pool  │
│    Pool      │        │              │
│ [A][A][B][A] │        │  [A][B][A]   │
│ min=3 max=8  │        │  min=2 max=6 │
└──────────────┘        └──────────────┘
       │
  checkout/checkin
  state reset après usage

  A = available  B = busy

  Health Monitor → remplace agents unhealthy
  Auto-scaler   → ajuste min/max selon métriques
```

**Comparaison LangGraph vs CrewAI vs Custom :**

| Critère | LangGraph | CrewAI | Custom Python |
|---|---|---|---|
| Pool natif | Non (manuel) | Non (manuel) | asyncio.Queue |
| State reset | Graph reset | Non natif | Manuel |
| Auto-scaling | Non | Non | Manuel / K8s |
| Health check | Non | Non | Manuel |
| Multi-pool routing | Non | Partiel | Total contrôle |

## Anti-patterns

- **Pool trop grand** — Maintenir 50 agents idle coûte cher même sans tâche. Calibrer `min_size` au minimum nécessaire ; laisser l'auto-scaling gérer les pics.
- **Pas de reset entre les utilisations** — Un agent qui garde l'historique d'une conversation précédente peut "contaminer" la tâche suivante avec du contexte irrelevant ou confidentiel.
- **Timeout infini sur le checkout** — Si tous les agents sont occupés, une tâche qui attend indéfiniment bloque le thread. Toujours définir un `timeout` et lever une exception explicite.
- **Pool monotype pour des tâches variées** — Un seul pool d'agents généralistes sous-performe face à des pools spécialisés. La spécialisation améliore la qualité et réduit le temps de traitement.

## Règles

1. **Toujours reset l'état complet d'un agent avant de le retourner au pool** — contexte, mémoire, cache, historique : rien ne doit persister d'une tâche à l'autre.
2. **Définir `min_size` et `max_size` explicitement** — ne jamais laisser le pool croître sans plafond ; documenter la justification de chaque valeur.
3. **Implémenter le pattern context manager** (`with pool.borrow() as agent`) — garantit le retour de l'agent même en cas d'exception.
4. **Refresher les agents après `max_uses` utilisations** — les agents LLM peuvent dégrader subtilement leurs performances après de nombreuses interactions ; le refresh préventif évite ce problème.
5. **Exposer les métriques du pool en temps réel** — utilisation, temps d'attente, throughput : ces données sont indispensables pour dimensionner correctement le pool.
