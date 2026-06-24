---
name: agent-supervisor-builder
description: Construction d'agents superviseurs qui contrôlent, monitent et corrigent des sous-agents en temps réel. Se déclenche avec "supervisor agent", "agent superviseur", "contrôler sous-agents", "manager agent", "agent oversight", "superviser agents", "agent controller".
---

# Agent Supervisor Builder

## Quand utiliser ce skill

Utiliser ce skill quand une architecture multi-agents requiert une couche de contrôle active : garantie qualité dynamique, interruption d'un agent défaillant, redistribution de charge, escalade humaine. Indispensable dès que deux sous-agents ou plus s'exécutent en parallèle ou en chaîne avec des SLAs à respecter.

---

## Critères de décision — quel pattern choisir ?

| Besoin | Pattern recommandé |
|---|---|
| Délégation simple, un agent à la fois | `create_supervisor` LangGraph (step 9) |
| Équipe hiérarchique avec rôles fixes | CrewAI `Process.hierarchical` |
| Intervenir en cours d'exécution | Monitor + CorrectionLoop (steps 3-5) |
| Failover automatique + retry | InterventionRules + LoadBalancer (steps 4, 7) |
| Escalade humaine obligatoire | EscalationManager (step 6) |

---

## Workflow

### 1. Définir les actions du supervisor

Commencer par énumérer toutes les actions possibles avant d'écrire une ligne de logique :

```python
from enum import Enum

class SupervisorAction(Enum):
    DISPATCH   = "dispatch"    # Assigner une tâche à un sous-agent
    MONITOR    = "monitor"     # Surveiller la progression
    INTERVENE  = "intervene"   # Envoyer une correction en cours d'exécution
    REDIRECT   = "redirect"    # Réassigner vers un autre sous-agent
    TERMINATE  = "terminate"   # Arrêter un agent défaillant
    ESCALATE   = "escalate"    # Remonter à un humain ou orchestrateur supérieur
    APPROVE    = "approve"     # Valider un output avant livraison
```

### 2. Routing intelligent — choisir le bon sous-agent

Classifier l'intention, scorer les capacités, fallback vers le plus généraliste.

```python
class IntelligentRouter:
    def __init__(self, agents: list):
        self.agents = {a.id: a for a in agents}

    def route(self, request: str) -> str:
        intent = self._classify_intent(request)
        best = max(
            self.agents.values(),
            key=lambda a: self._score(a, intent)
        )
        return best.id

    def _classify_intent(self, request: str) -> dict:
        # Appel LLM léger (gpt-4o-mini suffit pour la classification)
        prompt = f"Classifie: '{request}'. JSON: task_type, domain, complexity(low|med|high)"
        return llm.invoke(prompt, response_format="json")

    def _score(self, agent, intent: dict) -> float:
        return (
            1.0 * (intent["task_type"] in agent.capabilities) +
            0.5 * (intent["domain"] in agent.domains) +
            0.3 * (agent.complexity_level >= intent["complexity"])
        )
```

**Décision** : si le score max < 0.5, logger un warning et router vers l'agent généraliste. Ne jamais bloquer.

### 3. Monitoring en temps réel

Streamer les outputs des sous-agents et détecter les signaux d'alerte à la volée.

```python
class AgentMonitor:
    def __init__(self):
        self.states: dict[str, dict] = {}

    async def watch(self, agent_id: str, agent):
        state = {
            "start_time": time.time(),
            "tokens_used": 0,
            "last_chunk": "",
            "alerts": []
        }
        self.states[agent_id] = state
        async for chunk in agent.stream_output():
            state["tokens_used"] += count_tokens(chunk)
            state["last_chunk"] = chunk[-300:]
            alert = self._check(state, chunk)
            if alert:
                state["alerts"].append(alert)
                yield alert   # Le supervisor réagit immédiatement
```

Métriques à tracker obligatoirement : `elapsed_seconds`, `tokens_used`, `quality_score` (scoring LLM léger toutes les N secondes), `topic_drift_score`.

### 4. Règles d'intervention — seuils quantitatifs

Tout seuil doit être un nombre. Aucun jugement subjectif non formalisé.

```python
class InterventionRules:
    def __init__(self, config: dict):
        self.max_time    = config.get("max_time", 120)       # secondes
        self.max_tokens  = config.get("max_tokens", 4000)
        self.quality_min = config.get("quality_min", 0.6)    # 0.0–1.0
        self.drift_max   = config.get("drift_max", 0.5)

    def check(self, state: dict, task: dict) -> tuple[bool, str]:
        elapsed = time.time() - state["start_time"]
        if elapsed > self.max_time:
            return True, "timeout"
        if state["tokens_used"] > self.max_tokens:
            return True, "budget_exceeded"
        if state.get("quality_score", 1.0) < self.quality_min:
            return True, "quality_below_threshold"
        if self._drift(state["last_chunk"], task["objective"]) > self.drift_max:
            return True, "off_topic"
        return False, ""
```

Valeurs de départ recommandées (à calibrer sur vos données) :

| Paramètre | Valeur initiale | Ajuster si... |
|---|---|---|
| `max_time` | 120 s | tâches longues → 300 s |
| `max_tokens` | 4 000 | tâches volumineuses → 8 000 |
| `quality_min` | 0.6 | domaine critique → 0.75 |
| `drift_max` | 0.5 | sujets larges → 0.7 |

### 5. Correction loop — feedback et redirection

Limiter `max_corrections` à 3. Au-delà → redirection automatique sans exception.

```python
class CorrectionLoop:
    def __init__(self, max_corrections: int = 3):
        self.counts: dict[str, int] = {}
        self.max = max_corrections

    async def correct(self, agent_id: str, issue: str, ctx: dict) -> str:
        n = self.counts.get(agent_id, 0)
        if n >= self.max:
            return "redirect"   # Déléguer à un autre agent
        prompt = self._prompt(issue, ctx)
        await agent_registry[agent_id].inject(prompt)
        self.counts[agent_id] = n + 1
        return "corrected"

    def _prompt(self, issue: str, ctx: dict) -> str:
        return {
            "off_topic":              f"CORRECTION: Recentre-toi sur l'objectif: {ctx['objective']}",
            "quality_below_threshold": f"CORRECTION: Ajoute des détails sur: {ctx.get('weak_points', 'la réponse')}",
            "timeout":                 "CORRECTION: Finalise avec ce que tu as déjà produit.",
            "budget_exceeded":         "CORRECTION: Conclus en 3 phrases maximum."
        }.get(issue, f"CORRECTION: Améliore ta réponse pour mieux répondre à: {ctx.get('objective', 'l'objectif initial')}")
```

### 6. Escalade — quand le supervisor est dépassé

```python
class EscalationManager:
    def __init__(self, webhook_url: str, orchestrator=None):
        self.webhook = webhook_url
        self.orchestrator = orchestrator

    async def escalate(self, reason: str, ctx: dict, to: str = "human"):
        payload = {
            "reason": reason,
            "agent_id": ctx["agent_id"],
            "task": ctx["task"],
            "attempts": ctx["correction_count"],
            "last_output": ctx["last_output"][:500],   # Tronquer pour le webhook
            "timestamp": datetime.utcnow().isoformat()
        }
        if to == "human":
            await httpx.AsyncClient().post(self.webhook, json=payload)
        elif to == "orchestrator" and self.orchestrator:
            await self.orchestrator.handle_escalation(payload)
```

Règle : toujours définir `webhook_url` en variable d'environnement (`SUPERVISOR_ESCALATION_WEBHOOK`), jamais en dur.

### 7. Load balancing — distribution équitable

```python
import heapq

class LoadBalancer:
    def __init__(self):
        self.loads: dict[str, int] = {}    # agent_id → tâches actives
        self.queue: list = []              # min-heap (priority, task)

    def push(self, task, priority: int = 5):
        heapq.heappush(self.queue, (-priority, time.time(), task))

    def least_loaded(self, capability: str) -> str:
        eligible = [
            (load, aid)
            for aid, load in self.loads.items()
            if capability in agents[aid].capabilities
        ]
        if not eligible:
            raise ValueError(f"Aucun agent disponible pour: {capability}")
        return min(eligible)[1]

    def mark_done(self, agent_id: str):
        self.loads[agent_id] = max(0, self.loads.get(agent_id, 0) - 1)
```

### 8. State management — persister l'état du supervisor

```python
class SupervisorState:
    def __init__(self, backend: str = "memory"):
        self.backend = backend
        self.data = {
            "active_tasks": {},
            "agent_statuses": {},
            "metrics": {"dispatched": 0, "completed": 0, "failed": 0, "interventions": 0}
        }

    def update_agent(self, agent_id: str, status: str, task_id: str = None):
        entry = {"status": status, "task": task_id, "ts": time.time()}
        self.data["agent_statuses"][agent_id] = entry
        if self.backend == "redis":
            redis_client.hset("supervisor:agents", agent_id, json.dumps(entry))

    def record_intervention(self):
        self.data["metrics"]["interventions"] += 1
```

Backends supportés : `memory` (dev/test), `redis` (prod), `postgres` (audit long terme).

### 9. Implémentation concrète — LangGraph et CrewAI

**LangGraph (recommandé 2026, package `langgraph-supervisor`) :**

```python
from langgraph_supervisor import create_supervisor
from langgraph.prebuilt import create_react_agent

search_agent = create_react_agent(
    model, tools=[search_tool], name="search_agent",
    prompt="Tu es expert en recherche d'informations."
)
code_agent = create_react_agent(
    model, tools=[code_tool], name="code_agent",
    prompt="Tu es expert en développement Python."
)

supervisor = create_supervisor(
    agents=[search_agent, code_agent],
    model=model,
    prompt=(
        "Tu es le supervisor. Délègue:\n"
        "- Recherche → search_agent\n"
        "- Code → code_agent\n"
        "Valide la qualité avant de retourner le résultat."
    ),
    output_mode="last_message"   # ou "full_history" pour audit
)

result = supervisor.invoke({"messages": [{"role": "user", "content": "..."}]})
```

**CrewAI (Process.hierarchical) :**

```python
from crewai import Agent, Crew, Process
from langchain_openai import ChatOpenAI

manager = Agent(
    role="Supervisor Manager",
    goal="Coordonner les agents et garantir la qualité des outputs",
    backstory="Tu supervises une équipe d'agents spécialisés.",
    llm=ChatOpenAI(model="gpt-4o")
)
researcher = Agent(role="Researcher", goal="Rechercher des informations précises", ...)
writer     = Agent(role="Writer", goal="Rédiger des contenus de qualité", ...)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.hierarchical,
    manager_agent=manager,
    verbose=True
)
result = crew.kickoff()
```

**AutoGen (pattern GroupChat avec admin) :**

```python
import autogen

supervisor_llm = {"config_list": [{"model": "gpt-4o"}]}

supervisor = autogen.AssistantAgent("supervisor", llm_config=supervisor_llm,
    system_message="Tu coordonnes les agents. Valide chaque output avant de passer à l'étape suivante.")
researcher = autogen.AssistantAgent("researcher", llm_config=supervisor_llm)
user_proxy = autogen.UserProxyAgent("user", human_input_mode="NEVER",
    max_consecutive_auto_reply=10, code_execution_config={"use_docker": False})

chat = autogen.GroupChat(agents=[supervisor, researcher, user_proxy], messages=[], max_round=15)
manager = autogen.GroupChatManager(groupchat=chat, llm_config=supervisor_llm)
user_proxy.initiate_chat(manager, message="Lance la recherche sur X.")
```

### 10. Reporting — métriques de session

```python
class SupervisorReporter:
    def report(self, state: dict) -> dict:
        m = state["metrics"]
        total = max(m["dispatched"], 1)
        return {
            "success_rate":       round(m["completed"] / total, 3),
            "intervention_rate":  round(m["interventions"] / total, 3),
            "failure_rate":       round(m["failed"] / total, 3),
            "top_failure_reasons": self._top_reasons(state)
        }

    def _top_reasons(self, state: dict) -> list[dict]:
        from collections import Counter
        reasons = [a["reason"] for a in state.get("intervention_log", [])]
        return [{"reason": r, "count": c} for r, c in Counter(reasons).most_common(5)]
```

---

## Anti-patterns / Pièges

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| **Supervisor qui micro-manage** (correction toutes les 5 s) | Perturbe l'exécution, dégrade la qualité | Définir des seuils quantitatifs, laisser tourner entre les checks |
| **Pas de `max_corrections`** | Boucle infinie, blocage total | Plafonner à 3, escalade automatique au-delà |
| **Supervisor sans `TERMINATE`** | Impossible d'arrêter un agent bloqué en prod | `TERMINATE` + `REDIRECT` sont obligatoires avant toute mise en prod |
| **Seuils subjectifs ("si la qualité est mauvaise")** | Imprévisible, impossible à déboguer | Chaque déclencheur est un nombre (score, temps, tokens) |
| **État en mémoire seule en prod** | Perte totale au redémarrage | Redis ou Postgres dès que le supervisor tourne > 1 h |
| **Escalade vers humain sans contexte** | L'opérateur ne comprend pas le problème | Toujours inclure `last_output`, `attempts`, `task` dans le payload |
| **Supervisor qui exécute les tâches lui-même** | Couplage fort, testabilité nulle | Son rôle = coordonner uniquement ; mode dégradé explicitement documenté |

---

## Bonnes pratiques 2026

1. **Seuils numériques obligatoires** — aucune intervention sans déclencheur quantifiable.
2. **Dernier recours défini** — si `max_corrections` atteint et redirection impossible → escalade humaine, jamais de boucle silencieuse.
3. **Logs structurés pour chaque intervention** : `{agent_id, reason, action, result, timestamp}` — base de l'amélioration continue des règles.
4. **Health check du supervisor lui-même** — exposer `/health` ou équivalent ; un supervisor muet doit déclencher une alerte externe.
5. **Tester les chemins d'escalade en staging** avant la prod — simuler un agent qui timeout, un agent qui dérive, un agent qui dépasse le budget.
6. **Versioner la config des seuils** séparément du code — permet d'ajuster sans redéploiement.


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
