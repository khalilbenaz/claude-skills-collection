---
name: agent-load-balancer
description: Distribution de charge entre sous-agents avec routing intelligent et optimization des ressources. Se déclenche avec "load balancer agent", "distribution charge", "agent load balancing", "répartir tâches", "agent routing", "balance agents", "parallel agents distribution".
---

# Agent Load Balancer

## Quand utiliser ce skill

Utiliser ce skill lorsque plusieurs sous-agents doivent traiter des tâches en parallèle et qu'une distribution naïve (round-robin) ne suffit pas — par exemple quand les agents ont des capacités hétérogènes, des spécialisations différentes ou des coûts variables. Ce skill est essentiel dans les architectures à haute disponibilité où la charge doit être absorbée sans dégradation du service, et dans les systèmes sensibles aux coûts où le routing vers le modèle le moins cher capable de gérer la tâche est primordial.

## Workflow

1. **Routing strategies** — Choisir la stratégie adaptée au contexte : `round-robin` (distribution circulaire simple), `least-connections` (router vers l'agent le moins chargé), `weighted` (agents plus capables reçoivent plus de tâches), `capability-based` (router selon les compétences déclarées), `cost-based` (minimiser le coût par tâche).

2. **Agent capability profiling** — Construire un profil de performance pour chaque agent : types de tâches maîtrisées, historique de performance (latence moyenne, taux de succès), spécialisation déclarée, modèle LLM sous-jacent, limitations connues.

3. **Load detection** — Mesurer en temps réel la charge de chaque agent : profondeur de la file d'attente, temps de réponse moyen, taux d'erreur récent, consommation de tokens. Ces signaux alimentent les décisions de routing dynamique.

4. **Dynamic routing** — Adapter le routing en continu selon les métriques collectées. Un agent dont le temps de réponse augmente subitement reçoit moins de nouvelles tâches. Un agent qui vient d'être libéré remonte dans la priorité de sélection.

5. **Priority queuing** — Implémenter des niveaux de priorité : `urgent` (SLA strict, routing vers les agents les plus rapides disponibles), `normal` (distribution standard), `low` (traitement en différé, agents économiques). Éviter la famine des tâches basse priorité avec un aging mécanisme.

6. **Affinity et sticky sessions** — Certaines tâches bénéficient d'être traitées par le même agent (cohérence de contexte pour un même utilisateur, continuité d'une conversation). Implémenter l'affinité avec un TTL configurable pour éviter les sessions périmées.

7. **Geographic / latency routing** — Dans les architectures distribuées, router vers l'agent le plus proche géographiquement ou vers le endpoint de modèle avec la latence la plus faible. Utiliser des health probes actifs pour mesurer la latence réelle.

8. **Cost-aware routing** — Implémenter une hiérarchie de modèles : si la tâche peut être résolue par un modèle économique (Haiku, GPT-4o-mini), ne pas router vers un modèle premium. Définir des critères de qualification de la complexité de la tâche.

9. **Health-based routing** — Exclure automatiquement les agents unhealthy du pool de routing. Réintroduire progressivement un agent rétabli (canary release : 5% du trafic, puis 25%, puis 100%) pour éviter de le saturer immédiatement.

10. **Métriques et optimisation** — Exposer et analyser : distribution de latence (p50, p95, p99), distribution des coûts, débit global, déséquilibre de charge entre agents. Rebalancer le routage si un agent reçoit systématiquement 80% du trafic.

```python
# Exemple d'implémentation Python — Agent Load Balancer
import random
import time
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import statistics


class RoutingStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED = "weighted"
    CAPABILITY_BASED = "capability_based"
    COST_BASED = "cost_based"


@dataclass
class AgentProfile:
    id: str
    capabilities: list[str]           # ex: ["code", "research", "summarize"]
    model: str                         # ex: "claude-3-5-sonnet"
    cost_per_1k_tokens: float          # ex: 0.003
    weight: float = 1.0               # pour weighted routing
    active_tasks: int = 0
    total_tasks: int = 0
    error_count: int = 0
    latencies: list[float] = field(default_factory=list)
    healthy: bool = True
    canary_traffic_pct: float = 100.0  # % du trafic reçu (pour réintroduction progressive)

    @property
    def avg_latency(self) -> float:
        return statistics.mean(self.latencies[-20:]) if self.latencies else 0.0

    @property
    def error_rate(self) -> float:
        return self.error_count / max(self.total_tasks, 1)

    def record_task_start(self):
        self.active_tasks += 1
        self.total_tasks += 1

    def record_task_end(self, latency: float, success: bool):
        self.active_tasks = max(0, self.active_tasks - 1)
        self.latencies.append(latency)
        if not success:
            self.error_count += 1


class AgentLoadBalancer:
    def __init__(self, strategy: RoutingStrategy = RoutingStrategy.LEAST_CONNECTIONS):
        self.strategy = strategy
        self.agents: list[AgentProfile] = []
        self._rr_index: int = 0                # index pour round-robin
        self._affinities: dict[str, str] = {}  # session_id → agent_id
        self._affinity_ttl: int = 300          # secondes

    def register(self, agent: AgentProfile):
        self.agents.append(agent)

    def _healthy_agents(self, capability: str = None) -> list[AgentProfile]:
        candidates = [a for a in self.agents if a.healthy]
        if capability:
            candidates = [a for a in candidates if capability in a.capabilities]
        # Appliquer le traffic percentage (canary)
        candidates = [
            a for a in candidates
            if random.random() * 100 <= a.canary_traffic_pct
        ]
        return candidates

    def route(
        self,
        task_type: str = None,
        session_id: str = None,
        priority: str = "normal",
        max_cost_per_1k: float = None,
    ) -> Optional[AgentProfile]:
        """Sélectionner l'agent optimal selon la stratégie configurée."""
        
        # Sticky session (affinité)
        if session_id and session_id in self._affinities:
            agent_id = self._affinities[session_id]
            agent = next((a for a in self.agents if a.id == agent_id and a.healthy), None)
            if agent:
                return agent

        candidates = self._healthy_agents(capability=task_type)
        
        # Filtre coût
        if max_cost_per_1k:
            candidates = [a for a in candidates if a.cost_per_1k_tokens <= max_cost_per_1k]

        if not candidates:
            return None

        # Appliquer la stratégie
        selected = self._apply_strategy(candidates, priority)

        # Enregistrer l'affinité si session_id fourni
        if session_id and selected:
            self._affinities[session_id] = selected.id

        return selected

    def _apply_strategy(
        self, candidates: list[AgentProfile], priority: str
    ) -> AgentProfile:
        if self.strategy == RoutingStrategy.ROUND_ROBIN:
            agent = candidates[self._rr_index % len(candidates)]
            self._rr_index += 1
            return agent

        elif self.strategy == RoutingStrategy.LEAST_CONNECTIONS:
            return min(candidates, key=lambda a: a.active_tasks)

        elif self.strategy == RoutingStrategy.WEIGHTED:
            total_weight = sum(a.weight for a in candidates)
            r = random.uniform(0, total_weight)
            cumulative = 0
            for agent in candidates:
                cumulative += agent.weight
                if r <= cumulative:
                    return agent
            return candidates[-1]

        elif self.strategy == RoutingStrategy.CAPABILITY_BASED:
            # Trier par taux de succès et latence
            return min(
                candidates,
                key=lambda a: (a.error_rate, a.avg_latency)
            )

        elif self.strategy == RoutingStrategy.COST_BASED:
            # Modèle le moins cher d'abord
            if priority == "urgent":
                # Pour urgent : prioriser la latence, pas le coût
                return min(candidates, key=lambda a: a.avg_latency)
            return min(candidates, key=lambda a: a.cost_per_1k_tokens)

        return random.choice(candidates)

    def mark_unhealthy(self, agent_id: str, recovery_pct: float = 5.0):
        """Exclure un agent et préparer sa réintroduction progressive."""
        for agent in self.agents:
            if agent.id == agent_id:
                agent.healthy = False
                agent.canary_traffic_pct = recovery_pct
                print(f"[LB] Agent {agent_id} marqué unhealthy")

    def reintroduce(self, agent_id: str, target_pct: float = 100.0):
        """Réintroduire progressivement un agent rétabli."""
        for agent in self.agents:
            if agent.id == agent_id:
                agent.healthy = True
                agent.canary_traffic_pct = target_pct
                print(f"[LB] Agent {agent_id} réintroduit à {target_pct}% du trafic")

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


# Usage
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

# Router une tâche de résumé (préférer le modèle le moins cher)
agent = lb.route(task_type="summarize", max_cost_per_1k=0.001)
print(f"Tâche routée vers: {agent.id} ({agent.model})")

# Tâche urgente de code (prioriser la performance)
agent_urgent = lb.route(task_type="code", priority="urgent")
print(f"Tâche urgente routée vers: {agent_urgent.id}")
```

```
Architecture — Agent Load Balancer

  Tâches entrantes (priorité: urgent/normal/low)
               │
               ▼
  ┌────────────────────────┐
  │    Load Balancer       │
  │  ┌──────────────────┐  │
  │  │ Strategy Engine  │  │
  │  │ round-robin      │  │
  │  │ least-conn       │  │
  │  │ weighted         │  │
  │  │ capability       │  │
  │  │ cost-based  ◄────┼──┼── max_cost_per_1k
  │  └──────────────────┘  │
  │  ┌──────────────────┐  │
  │  │ Affinity Table   │  │ ← session_id → agent_id
  │  └──────────────────┘  │
  │  ┌──────────────────┐  │
  │  │ Health Monitor   │  │
  │  └──────────────────┘  │
  └────────┬───────────────┘
           │ route()
    ┌──────┼──────────────┐
    ▼      ▼              ▼
 Agent A  Agent B      Agent C
 haiku   sonnet       sonnet
 cheap   powerful     canary(5%)
 2 tasks  1 task      0 tasks

  Métriques → rebalancing automatique
```

**Comparaison LangGraph vs CrewAI vs Custom :**

| Critère | LangGraph | CrewAI | Custom Python |
|---|---|---|---|
| Routing natif | Non (manuel) | Partiel (task routing) | Total contrôle |
| Weighted routing | Non | Non | Manuel |
| Cost-aware | Non | Non | Manuel |
| Sticky sessions | Non | Non | Manuel |
| Canary reintroduction | Non | Non | Manuel |

## Anti-patterns

- **Round-robin pour des agents de capacités différentes** — Envoyer autant de tâches à un agent Haiku qu'à un agent Sonnet ignorant leurs différences de performance ; résultat : surcharge de l'agent puissant, sous-utilisation du simple.
- **Pas de health check** — Continuer à router des tâches vers un agent unhealthy garantit des échecs en cascade. Un health check passif (observation des erreurs) ou actif (ping périodique) est indispensable.
- **Ignorer la latence** — Router uniquement sur le coût peut concentrer les tâches sur le modèle le moins cher qui est aussi le plus lent ; pour les tâches urgentes, la latence doit primer.
- **Sticky sessions sans timeout** — Une affinité qui ne expire jamais peut lier un utilisateur à un agent devenu unhealthy ou surchargé ; toujours associer un TTL aux sessions d'affinité.

## Règles

1. **La stratégie de routing doit être configurable à l'exécution** — ne pas hardcoder une seule stratégie ; permettre de basculer entre les stratégies selon le contexte (coût, performance, urgence).
2. **Tout agent unhealthy doit être exclu immédiatement** et réintroduit progressivement (canary release) pour éviter de saturer un agent fraîchement rétabli.
3. **Implémenter le cost-aware routing par défaut** — dans les systèmes multi-modèles, router automatiquement vers le modèle le moins cher capable de traiter la tâche réduit significativement les coûts.
4. **Mesurer et exposer les métriques de distribution** (p50, p95, p99 latency par agent, déséquilibre de charge) pour permettre le rebalancing et le dimensionnement du pool.
5. **Les sticky sessions doivent avoir un TTL explicite** — documenter la durée d'affinité et la stratégie de fallback quand l'agent affine devient indisponible.


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
