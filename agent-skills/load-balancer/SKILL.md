---
name: load-balancer
description: Distribution de charge entre sous-agents avec routing intelligent et optimization des ressources. Se déclenche avec "load balancer agent", "distribution charge", "agent load balancing", "répartir tâches", "agent routing", "balance agents", "parallel agents distribution".
---

# Agent Load Balancer

## Quand utiliser ce skill

Utiliser ce skill lorsque plusieurs sous-agents traitent des tâches en parallèle et qu'une distribution naïve ne suffit pas : agents aux capacités hétérogènes, spécialisations différentes, coûts variables, ou contraintes de SLA. Indispensable dans les architectures à haute disponibilité et dans les systèmes sensibles aux coûts.

## Critères de choix de la stratégie

| Situation | Stratégie recommandée |
|---|---|
| Agents homogènes, charge uniforme | `round-robin` |
| Agents homogènes, tâches longues variables | `least-connections` |
| Agents de capacités différentes | `weighted` |
| Agents spécialisés (code, résumé, analyse…) | `capability-based` |
| Multi-modèles (Haiku + Sonnet + Opus) | `cost-based` |
| Contexte utilisateur persistant | `sticky session` + TTL |

## Workflow

### 1. Profiler les agents disponibles

Avant tout routing, établir un profil par agent :

```python
from dataclasses import dataclass, field
import statistics

@dataclass
class AgentProfile:
    id: str
    capabilities: list[str]        # ex: ["code", "research", "summarize"]
    model: str                      # ex: "claude-3-5-sonnet"
    cost_per_1k_tokens: float       # ex: 0.003
    weight: float = 1.0
    active_tasks: int = 0
    total_tasks: int = 0
    error_count: int = 0
    latencies: list[float] = field(default_factory=list)
    healthy: bool = True
    canary_traffic_pct: float = 100.0

    @property
    def avg_latency(self) -> float:
        return statistics.mean(self.latencies[-20:]) if self.latencies else 0.0

    @property
    def error_rate(self) -> float:
        return self.error_count / max(self.total_tasks, 1)
```

**Checklist profil agent :**
- [ ] Capabilities déclarées (types de tâches maîtrisées)
- [ ] Modèle LLM et coût/1k tokens
- [ ] Poids relatif (pour weighted routing)
- [ ] Limites connues (context window, rate limits)

### 2. Implémenter le routeur central

```python
import random
from enum import Enum
from typing import Optional

class RoutingStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED = "weighted"
    CAPABILITY_BASED = "capability_based"
    COST_BASED = "cost_based"

class AgentLoadBalancer:
    def __init__(self, strategy: RoutingStrategy = RoutingStrategy.LEAST_CONNECTIONS):
        self.strategy = strategy
        self.agents: list[AgentProfile] = []
        self._rr_index: int = 0
        self._affinities: dict[str, tuple[str, float]] = {}  # session_id → (agent_id, timestamp)
        self._affinity_ttl: int = 300  # secondes

    def register(self, agent: AgentProfile):
        self.agents.append(agent)

    def _healthy_agents(self, capability: str = None) -> list[AgentProfile]:
        candidates = [a for a in self.agents if a.healthy]
        if capability:
            candidates = [a for a in candidates if capability in a.capabilities]
        # Filtrer selon le pourcentage canary
        candidates = [a for a in candidates if random.random() * 100 <= a.canary_traffic_pct]
        return candidates

    def route(
        self,
        task_type: str = None,
        session_id: str = None,
        priority: str = "normal",
        max_cost_per_1k: float = None,
    ) -> Optional[AgentProfile]:
        import time
        # Sticky session — vérifier TTL
        if session_id and session_id in self._affinities:
            agent_id, ts = self._affinities[session_id]
            if time.time() - ts < self._affinity_ttl:
                agent = next((a for a in self.agents if a.id == agent_id and a.healthy), None)
                if agent:
                    return agent
            else:
                del self._affinities[session_id]

        candidates = self._healthy_agents(capability=task_type)
        if max_cost_per_1k:
            candidates = [a for a in candidates if a.cost_per_1k_tokens <= max_cost_per_1k]
        if not candidates:
            return None

        selected = self._apply_strategy(candidates, priority)
        if session_id and selected:
            self._affinities[session_id] = (selected.id, time.time())
        return selected

    def _apply_strategy(self, candidates: list[AgentProfile], priority: str) -> AgentProfile:
        if self.strategy == RoutingStrategy.ROUND_ROBIN:
            agent = candidates[self._rr_index % len(candidates)]
            self._rr_index += 1
            return agent
        elif self.strategy == RoutingStrategy.LEAST_CONNECTIONS:
            return min(candidates, key=lambda a: a.active_tasks)
        elif self.strategy == RoutingStrategy.WEIGHTED:
            total = sum(a.weight for a in candidates)
            r = random.uniform(0, total)
            cumul = 0
            for a in candidates:
                cumul += a.weight
                if r <= cumul:
                    return a
            return candidates[-1]
        elif self.strategy == RoutingStrategy.CAPABILITY_BASED:
            return min(candidates, key=lambda a: (a.error_rate, a.avg_latency))
        elif self.strategy == RoutingStrategy.COST_BASED:
            if priority == "urgent":
                return min(candidates, key=lambda a: a.avg_latency)
            return min(candidates, key=lambda a: a.cost_per_1k_tokens)
        return random.choice(candidates)
```

### 3. Implémenter le health monitoring

```python
    def mark_unhealthy(self, agent_id: str, recovery_pct: float = 5.0):
        """Exclure un agent et préparer sa réintroduction à 5% du trafic."""
        for a in self.agents:
            if a.id == agent_id:
                a.healthy = False
                a.canary_traffic_pct = recovery_pct

    def reintroduce(self, agent_id: str, target_pct: float = 100.0):
        """Réintroduction progressive : appeler d'abord à 10%, puis 50%, puis 100%."""
        for a in self.agents:
            if a.id == agent_id:
                a.healthy = True
                a.canary_traffic_pct = target_pct
```

**Séquence de réintroduction recommandée :**
```
mark_unhealthy(id, recovery_pct=0)    # exclure
# ... attendre rétablissement ...
reintroduce(id, target_pct=5)         # 5% canary — observer les erreurs
# après 2 min sans erreur
reintroduce(id, target_pct=25)
# après 5 min sans erreur
reintroduce(id, target_pct=100)       # trafic complet
```

### 4. Configurer les niveaux de priorité

```python
PRIORITY_CONFIG = {
    "urgent": {
        "strategy_override": RoutingStrategy.CAPABILITY_BASED,  # ignorer le coût
        "max_queue_depth": 1,
        "timeout_s": 10,
    },
    "normal": {
        "strategy_override": None,  # utiliser la stratégie par défaut
        "max_queue_depth": 10,
        "timeout_s": 60,
    },
    "low": {
        "strategy_override": RoutingStrategy.COST_BASED,  # maximiser l'économie
        "max_queue_depth": 100,
        "timeout_s": 300,
    },
}
```

**Aging anti-famine** : incrémenter la priorité des tâches `low` après 5 minutes en attente pour éviter la famine.

### 5. Exposer les métriques et rebalancer

```python
    def metrics(self) -> list[dict]:
        return [{
            "id": a.id,
            "model": a.model,
            "active_tasks": a.active_tasks,
            "avg_latency_s": round(a.avg_latency, 3),
            "error_rate": round(a.error_rate, 3),
            "cost_per_1k": a.cost_per_1k_tokens,
            "healthy": a.healthy,
            "traffic_pct": a.canary_traffic_pct,
        } for a in self.agents]
```

**Seuils d'alerte :**
- Un agent reçoit > 70% du trafic total → rebalancer les poids
- `error_rate` > 0.05 sur 20 dernières tâches → mark_unhealthy
- `avg_latency` > 2x la médiane du pool → réduire le poids de 50%

### 6. Exemple d'usage complet

```python
lb = AgentLoadBalancer(strategy=RoutingStrategy.COST_BASED)

lb.register(AgentProfile(
    id="agent-haiku-1",
    capabilities=["summarize", "classify", "research"],
    model="claude-3-haiku",
    cost_per_1k_tokens=0.00025,
    weight=2.0,
))
lb.register(AgentProfile(
    id="agent-sonnet-1",
    capabilities=["code", "research", "analysis", "summarize"],
    model="claude-3-5-sonnet",
    cost_per_1k_tokens=0.003,
    weight=1.0,
))

# Résumé — router vers le moins cher capable
agent = lb.route(task_type="summarize", max_cost_per_1k=0.001)
# → agent-haiku-1

# Code urgent — ignorer le coût, prioriser la latence
agent = lb.route(task_type="code", priority="urgent")
# → agent-sonnet-1

# Session utilisateur — affinité persistante 5 min
agent = lb.route(task_type="research", session_id="user-42")
```

## Architecture — vue d'ensemble

```
  Tâches entrantes (urgent / normal / low)
               │
               ▼
  ┌────────────────────────────┐
  │      Load Balancer         │
  │  Strategy Engine           │
  │  ├─ round-robin            │
  │  ├─ least-connections      │
  │  ├─ weighted               │
  │  ├─ capability-based       │
  │  └─ cost-based ◄── max_cost│
  │  Affinity Table            │
  │  └─ session_id → agent_id  │
  │  Health Monitor            │
  │  └─ canary reintroduction  │
  └────────┬───────────────────┘
           │ route()
    ┌──────┼──────────────┐
    ▼      ▼              ▼
 Agent A  Agent B      Agent C
 haiku   sonnet       sonnet
 cheap   powerful     canary(5%)
 2 tasks  1 task      0 tasks
```

## Comparaison frameworks

| Critère | LangGraph | CrewAI | Custom Python |
|---|---|---|---|
| Routing natif | Non (manuel) | Partiel | Total contrôle |
| Weighted routing | Non | Non | Manuel |
| Cost-aware | Non | Non | Manuel |
| Sticky sessions + TTL | Non | Non | Manuel |
| Canary reintroduction | Non | Non | Manuel |

→ Pour un load balancing avancé (cost-aware, canary, sticky), l'implémentation custom est toujours nécessaire même avec LangGraph/CrewAI.

## Garde-fous et anti-patterns

**Round-robin sur agents hétérogènes** — Envoyer autant de tâches à Haiku qu'à Sonnet ignore leurs capacités. Résultat : file saturée côté agent puissant, sous-utilisation du modèle simple. Utiliser `weighted` ou `capability-based` dès que les agents diffèrent.

**Pas de health check actif** — Se reposer uniquement sur les erreurs passées (passif) laisse passer plusieurs échecs avant d'exclure un agent. Ajouter un health probe actif (ping/noop toutes les 30s) pour détecter les pannes silencieuses.

**Cost-based sans fallback latence** — Router uniquement sur le coût concentre les tâches sur le modèle le moins cher qui peut aussi être le plus lent. Pour `priority="urgent"`, le critère de routing doit basculer sur la latence.

**Sticky sessions sans TTL** — Une affinité sans expiration lie un utilisateur à un agent devenu unhealthy ou surchargé. Toujours associer un TTL explicite (défaut : 300s) et un fallback vers le pool général.

**Réintroduction brutale après incident** — Remettre un agent à 100% immédiatement après rétablissement peut le saturer à nouveau. Toujours passer par la séquence canary 5% → 25% → 100%.

**Pool trop grand sans monitoring** — Au-delà de 10 agents, le déséquilibre de charge devient difficile à détecter sans métriques. Exposer systématiquement les métriques par agent et alerter si un agent reçoit > 70% du trafic.

## Bonnes pratiques 2026

1. **Stratégie configurable à l'exécution** — Permettre de basculer la stratégie sans redéploiement (variable d'environnement ou feature flag).
2. **Cost-aware routing par défaut** dans tout système multi-modèles — économies typiques de 60-80% en routant les tâches simples vers des modèles légers.
3. **Métriques p50/p95/p99 par agent** — Les médianes masquent les outliers ; surveiller le p95 pour détecter les agents lents avant qu'ils dégradent le SLA.
4. **Circuit breaker intégré** — Si un agent dépasse 5% d'error_rate sur les 20 dernières tâches, l'exclure automatiquement sans intervention humaine.
5. **Tester le rebalancing** — Injecter des pannes simulées (chaos testing) pour valider que le load balancer redistribue correctement sans perte de tâches.
