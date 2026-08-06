---
name: agent-multi-agent-orchestrator
description: Conception de systèmes multi-agents avec patterns d'orchestration (supervisor, swarm, hierarchy, voting). Coordination entre agents spécialisés, routing sémantique, gestion d'état distribué, error handling. Se déclenche avec "multi-agent", "orchestration", "supervisor agent", "swarm", "agent coordination", "agent hierarchy", "agents qui collaborent", "répartir entre agents". Also triggers on "multi-agent system", "orchestrate agents", "supervisor pattern".
---

# Multi-Agent Orchestrator

## Quand utiliser ce skill

Utilise ce skill dès qu'une tâche gagne à être décomposée en sous-tâches spécialisées et exécutées par des agents distincts : pipelines de recherche parallèle, systèmes supervisor/worker, débats multi-agents, workflows ETL IA, etc.

**Seuil de déclenchement** — un seul agent suffit si la tâche est linéaire et tient en un contexte. Passe en multi-agent si :
- la tâche nécessite des spécialisations différentes (recherche + rédaction + validation),
- des sous-tâches peuvent s'exécuter en parallèle,
- la fenêtre de contexte d'un agent unique serait saturée.

---

## Choix du pattern (critères de décision)

| Pattern | Quand l'utiliser | Complexité |
|---|---|---|
| **Supervisor / Router** | Tâche décomposable en N sous-tâches distinctes ; résultats à consolider | Faible |
| **Pipeline séquentiel** | Sous-tâches avec dépendances strictes A→B→C | Faible |
| **Parallel fan-out** | Sous-tâches indépendantes, latence critique | Moyenne |
| **Hiérarchique** | Organisation de type chef de projet → équipes → exécutants | Moyenne |
| **Swarm** | Exploration large, diversité de solutions, pas de dépendances | Haute |
| **Debate / Voting** | Décisions à fort enjeu, besoin de consensus ou de validation croisée | Haute |

---

## Workflow en étapes

### 1. Décomposition de la tâche

Identifie les sous-tâches atomiques et leurs dépendances. Produis un graphe orienté (DAG) avant tout code.

```
tâche principale
├── sous-tâche A (indépendante)
├── sous-tâche B (indépendante)
└── sous-tâche C (dépend de A + B)
```

Règle : si deux sous-tâches n'ont aucune dépendance, elles doivent s'exécuter en parallèle.

### 2. Définition des agents

Un agent = un rôle unique + un system prompt ciblé. Évite les agents "couteau suisse".

```python
AGENTS = {
    "researcher": Agent(
        system="Tu es un agent de recherche. Tu extrais des faits vérifiables. "
               "Retourne TOUJOURS un JSON {facts: [], sources: []}.",
        tools=[web_search, fetch_url],
    ),
    "writer": Agent(
        system="Tu es un rédacteur. Tu transformes des faits structurés en prose claire.",
        tools=[],
    ),
    "validator": Agent(
        system="Tu es un agent de validation. Tu détectes les affirmations non sourcées.",
        tools=[],
    ),
}
```

### 3. Routing sémantique

Pour router dynamiquement une requête vers l'agent le plus adapté :

```python
import numpy as np

def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def route(task: str, agents: dict[str, Agent]) -> Agent:
    task_vec = embed(task)
    scores = {
        name: cosine_sim(task_vec, agent.profile_embedding)
        for name, agent in agents.items()
    }
    best = max(scores, key=scores.get)
    return agents[best]
```

Alternative légère : classification d'intention via LLM avec un prompt de routing dédié.

### 4. Exécution parallèle

```python
import asyncio

async def run_parallel(tasks: list[tuple[Agent, str]]) -> list[str]:
    coros = [agent.run(task) for agent, task in tasks]
    return await asyncio.gather(*coros, return_exceptions=True)

# Usage
results = await run_parallel([
    (agents["researcher"], "Recherche les faits sur X"),
    (agents["researcher"], "Recherche les faits sur Y"),
])
```

Pour des workers synchrones lourds, utilise `concurrent.futures.ThreadPoolExecutor`.

### 5. État partagé

Centralise l'état dans un objet mutable accessible à tous les agents de l'orchestrateur :

```python
from dataclasses import dataclass, field

@dataclass
class WorkflowState:
    task_id: str
    inputs: dict = field(default_factory=dict)
    results: dict = field(default_factory=dict)   # {agent_name: output}
    errors: list = field(default_factory=list)
    token_budget_used: int = 0
    token_budget_max: int = 50_000
```

Pour un système distribué : Redis (HSET par `task_id`) ou une table SQL.

### 6. Error handling et résilience

```python
async def safe_call(agent: Agent, task: str, retries: int = 3) -> str:
    backoff = 1
    for attempt in range(retries):
        try:
            return await asyncio.wait_for(agent.run(task), timeout=30)
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            state.errors.append({"agent": agent.name, "error": str(e), "task": task})
        await asyncio.sleep(backoff)
        backoff *= 2
    return agent.fallback_response(task)   # réponse dégradée
```

Stratégies de fallback (par ordre de préférence) :
1. Retry avec backoff exponentiel
2. Agent de remplacement (généraliste)
3. Valeur par défaut documentée
4. Escalade humaine (webhook / notification)

### 7. Consolidation et vote

Quand plusieurs agents produisent des réponses concurrentes :

```python
def majority_vote(responses: list[str], arbitrator: Agent) -> str:
    if len(set(responses)) == 1:
        return responses[0]
    # Désaccord → arbitrage LLM
    prompt = f"Voici {len(responses)} réponses d'agents. Choisis la plus correcte et justifie.\n\n"
    for i, r in enumerate(responses, 1):
        prompt += f"Agent {i}: {r}\n"
    return arbitrator.run(prompt)
```

Vote pondéré : attribue un poids de confiance à chaque agent selon son historique (`success_rate`, latence, spécialisation).

### 8. Budget tokens et coût

```python
def check_budget(state: WorkflowState, agent: Agent, estimated_tokens: int):
    if state.token_budget_used + estimated_tokens > state.token_budget_max:
        raise BudgetExceededError(
            f"Budget {state.token_budget_max} tokens atteint après {state.token_budget_used}"
        )
```

Règle : définis un budget global par workflow, pas par agent. Loggue chaque appel avec son coût réel.

### 9. Monitoring

Instrumente chaque agent call :

```python
import time

async def instrumented_call(agent, task, state):
    t0 = time.perf_counter()
    result = await safe_call(agent, task)
    elapsed = time.perf_counter() - t0
    metrics.record(agent=agent.name, latency=elapsed, tokens=result.usage.total_tokens)
    return result
```

Métriques clés à suivre : latence p50/p95, taux de retry, taux d'erreur, coût par workflow, agent le plus sollicité.

---

## Garde-fous et anti-patterns

| Anti-pattern | Symptôme | Correctif |
|---|---|---|
| **Cascade linéaire** | Un agent lent bloque tout | Fan-out parallèle + timeout par étape |
| **Agent trop généraliste** | Qualité médiocre sur toutes les tâches | Diviser en agents spécialisés |
| **Contexte non partagé** | Agents qui se répètent ou se contredisent | State centralisé, passé explicitement |
| **Pas d'idempotence** | Retries créent des effets de bord | Rendre chaque appel idempotent (ID de tâche unique) |
| **Boucle infinie agent→agent** | Stack overflow ou coût infini | Limite de profondeur (`max_depth=5`) + détection de cycle |
| **Absence de fallback** | Panne d'un agent = panne totale | Fallback systématique + circuit breaker |
| **Confiance aveugle** | Hallucinations propagées | Agent validateur indépendant obligatoire |

---

## Bonnes pratiques 2026

- **Contrats d'interface** : définit un schéma JSON strict pour chaque output d'agent (Pydantic, JSON Schema). Les agents en aval valident l'input avant de l'utiliser.
- **Observabilité distribuée** : trace chaque appel avec un `trace_id` propagé (OpenTelemetry). Indispensable pour déboguer les chaînes longues.
- **Tests d'isolation** : chaque agent doit être testable seul avec des inputs mockés. Un test d'intégration couvre le workflow complet avec des LLM stubs.
- **Versioning d'agents** : versionne les system prompts comme du code (git). Un changement de prompt = une nouvelle version d'agent, pas un patch silencieux.
- **Human-in-the-loop ciblé** : n'interromps l'humain qu'aux points de décision critique (validation finale, escalade budget), jamais en milieu de workflow.


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
