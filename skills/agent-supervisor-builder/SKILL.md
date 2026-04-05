---
name: agent-supervisor-builder
description: Construction d'agents superviseurs qui contrôlent, monitent et corrigent des sous-agents en temps réel. Se déclenche avec "supervisor agent", "agent superviseur", "contrôler sous-agents", "manager agent", "agent oversight", "superviser agents", "agent controller".
---

# Agent Supervisor Builder

## Quand utiliser ce skill
Utiliser ce skill lors de la construction d'un agent qui doit coordonner et superviser d'autres agents en temps réel, avec la capacité d'intervenir, de rediriger ou d'interrompre leur exécution. Indispensable dans les architectures multi-agents où la qualité des outputs des sous-agents doit être garantie dynamiquement.

## Workflow

1. **Définir le rôle du supervisor**
   - `Dispatch` : recevoir une requête entrante et choisir le bon sous-agent pour l'exécuter
   - `Monitor` : surveiller la progression et la qualité de l'exécution en temps réel
   - `Intervene` : interrompre un sous-agent qui dérive, dépasse son budget ou produit du mauvais travail
   - `Redirect` : réassigner la tâche à un autre sous-agent ou modifier les instructions
   - `Terminate` : arrêter définitivement un sous-agent défaillant et en lancer un nouveau
   ```python
   from enum import Enum

   class SupervisorAction(Enum):
       DISPATCH = "dispatch"
       MONITOR = "monitor"
       INTERVENE = "intervene"
       REDIRECT = "redirect"
       TERMINATE = "terminate"
       ESCALATE = "escalate"
       APPROVE = "approve"
   ```

2. **Routing intelligent (choisir le bon sous-agent)**
   - Classifier l'intention de la requête : type de tâche, domaine, complexité
   - Mapper l'intention aux capacités de chaque sous-agent (`capability manifest`)
   - Fallback : si aucun agent ne matche parfaitement, choisir le plus généraliste
   ```python
   class IntelligentRouter:
       def __init__(self, agents: list):
           self.agents = {a.id: a for a in agents}
           self.capability_index = self._build_index(agents)

       def route(self, request: str) -> str:
           # Classification de l'intention
           intent = self._classify_intent(request)
           # Matching avec les capacités
           best_agent = max(
               self.agents.values(),
               key=lambda a: self._capability_score(a, intent)
           )
           return best_agent.id

       def _classify_intent(self, request: str) -> dict:
           prompt = f"Classifie cette requête: '{request}'. Retourne: task_type, domain, complexity (low/med/high)"
           return llm.invoke(prompt, response_format="json")

       def _capability_score(self, agent, intent: dict) -> float:
           return sum([
               1.0 if intent["task_type"] in agent.capabilities else 0.0,
               0.5 if intent["domain"] in agent.domains else 0.0,
               0.3 if agent.complexity_level >= intent["complexity"] else 0.0
           ])
   ```

3. **Monitoring en temps réel (observabilité des sous-agents)**
   - Souscrire au flux de progression de chaque sous-agent actif (output streaming)
   - Tracker les métriques clés : temps écoulé, tokens consommés, qualité estimée de l'output
   - Détecter les signaux d'alerte : hallucination, boucle, hors-sujet, dépassement de budget
   ```python
   class AgentMonitor:
       def __init__(self):
           self.agent_states = {}

       async def stream_monitor(self, agent_id: str, task_id: str):
           state = {
               "start_time": time.time(),
               "tokens_used": 0,
               "progress": 0.0,
               "last_output_sample": "",
               "alerts": []
           }
           self.agent_states[agent_id] = state
           async for chunk in agent.stream_output():
               state["tokens_used"] += count_tokens(chunk)
               state["last_output_sample"] = chunk[-200:]  # Garder les 200 derniers chars
               alert = self._check_for_issues(state, chunk)
               if alert:
                   state["alerts"].append(alert)
                   yield alert  # Notifier le supervisor immédiatement
   ```

4. **Intervention rules (critères d'intervention précis)**
   - `Timeout` : le sous-agent dépasse le temps alloué → intervention obligatoire
   - `Quality threshold` : le score de qualité estimé tombe sous un seuil → feedback et correction
   - `Off-topic` : le sous-agent dérive du sujet initial → remise sur les rails ou redirection
   - `Error detected` : exception, hallucination détectée, contradiction → arrêt et analyse
   - `Budget exceeded` : dépassement du quota de tokens → interruption propre
   ```python
   class InterventionRules:
       def __init__(self, config: dict):
           self.max_execution_time = config.get("max_time", 120)
           self.quality_threshold = config.get("quality_min", 0.6)
           self.max_tokens = config.get("max_tokens", 4000)
           self.topic_drift_threshold = config.get("drift_max", 0.5)

       def should_intervene(self, state: dict, task: dict) -> tuple[bool, str]:
           elapsed = time.time() - state["start_time"]
           if elapsed > self.max_execution_time:
               return True, "timeout"
           if state["tokens_used"] > self.max_tokens:
               return True, "budget_exceeded"
           if state.get("quality_score", 1.0) < self.quality_threshold:
               return True, "quality_below_threshold"
           if self._detect_topic_drift(state["last_output_sample"], task["objective"]):
               return True, "off_topic"
           return False, ""
   ```

5. **Correction loop (feedback et redirection)**
   - Envoyer un message de correction au sous-agent en cours d'exécution
   - Injecter un contexte supplémentaire pour le remettre sur la bonne voie
   - Si la correction ne suffit pas après N tentatives, passer à la redirection vers un autre agent
   ```python
   class CorrectionLoop:
       def __init__(self, max_corrections: int = 3):
           self.correction_counts = {}
           self.max_corrections = max_corrections

       async def correct(self, agent_id: str, issue_type: str, context: dict) -> str:
           count = self.correction_counts.get(agent_id, 0)
           if count >= self.max_corrections:
               return "redirect"   # Trop de corrections → rediriger vers un autre agent
           correction_prompt = self._build_correction_prompt(issue_type, context)
           await agent.inject_correction(correction_prompt)
           self.correction_counts[agent_id] = count + 1
           return "corrected"

       def _build_correction_prompt(self, issue_type: str, context: dict) -> str:
           prompts = {
               "off_topic": f"ATTENTION: Tu t'écartes du sujet. Objectif initial: {context['objective']}. Recentre-toi.",
               "quality_below_threshold": f"La qualité n'est pas suffisante. Ajoute plus de détails sur: {context['weak_points']}",
               "timeout": "Finalise rapidement ta réponse avec ce que tu as déjà produit."
           }
           return prompts.get(issue_type, "Corrige ta réponse pour mieux répondre à l'objectif.")
   ```

6. **Escalation (quand le supervisor est dépassé)**
   - Définir les cas où le supervisor lui-même ne peut pas résoudre le problème
   - Escalade humaine : notifier un opérateur humain via webhook, Slack, email
   - Escalade vers un agent supérieur : remonter à l'orchestrateur avec le contexte complet
   ```python
   class EscalationManager:
       async def escalate(self, reason: str, context: dict, to: str = "human"):
           escalation_payload = {
               "reason": reason,
               "failed_agent": context["agent_id"],
               "task": context["task"],
               "attempts": context["correction_count"],
               "last_output": context["last_output"],
               "timestamp": datetime.now().isoformat()
           }
           if to == "human":
               await self._notify_human(escalation_payload)
           elif to == "orchestrator":
               await orchestrator.handle_escalation(escalation_payload)

       async def _notify_human(self, payload: dict):
           # Webhook, email, Slack...
           await webhook_client.post(url=ESCALATION_WEBHOOK, json=payload)
   ```

7. **Load balancing (distribution équitable des tâches)**
   - Maintenir un registre de la charge de chaque sous-agent : tâches en cours, temps moyen
   - Implémenter une file d'attente prioritaire : tâches urgentes passent devant
   - Éviter la concentration : si un agent est saturé, router vers un agent équivalent disponible
   ```python
   import heapq

   class LoadBalancer:
       def __init__(self):
           self.agent_loads = {}   # agent_id -> nombre de tâches actives
           self.task_queue = []    # (priority, task) — min-heap

       def add_task(self, task, priority: int = 5):
           heapq.heappush(self.task_queue, (-priority, task))  # Négatif pour max-heap

       def get_least_loaded_agent(self, required_capability: str) -> str:
           eligible = [
               (load, agent_id)
               for agent_id, load in self.agent_loads.items()
               if required_capability in agents[agent_id].capabilities
           ]
           return min(eligible, key=lambda x: x[0])[1]
   ```

8. **State management (gestion de l'état du supervisor)**
   - Maintenir un dashboard en mémoire de l'état de tous les sous-agents
   - Persister l'état pour survivre aux redémarrages (Redis, base de données)
   - Gérer la conversation state : quelle tâche est en cours, quel contexte a été partagé
   ```python
   class SupervisorStateManager:
       def __init__(self, backend="memory"):
           self.backend = backend
           self.state = {
               "active_tasks": {},
               "agent_statuses": {},
               "conversation_history": [],
               "metrics": {"dispatched": 0, "completed": 0, "failed": 0, "interventions": 0}
           }

       def update_agent_status(self, agent_id: str, status: str, task_id: str = None):
           self.state["agent_statuses"][agent_id] = {
               "status": status,
               "current_task": task_id,
               "last_updated": time.time()
           }
           if self.backend == "redis":
               redis_client.hset("supervisor:agents", agent_id, json.dumps(self.state["agent_statuses"][agent_id]))
   ```

9. **Implémentation concrète (LangGraph, CrewAI, AutoGen)**
   ```python
   # LangGraph Supervisor Pattern
   from langgraph_supervisor import create_supervisor
   from langgraph.prebuilt import create_react_agent

   search_agent = create_react_agent(model, tools=[search_tool], name="search_agent",
                                     prompt="Tu es un expert en recherche d'informations.")
   code_agent = create_react_agent(model, tools=[code_tool], name="code_agent",
                                   prompt="Tu es un expert en développement Python.")

   supervisor = create_supervisor(
       agents=[search_agent, code_agent],
       model=model,
       prompt="""Tu es le supervisor. Analyse chaque requête et délègue:
       - Questions de recherche → search_agent
       - Tâches de code → code_agent
       Vérifie la qualité des résultats avant de les retourner.""",
       output_mode="last_message"  # ou "full_history"
   )
   result = supervisor.invoke({"messages": [{"role": "user", "content": "Recherche puis code..."}]})
   ```

   ```python
   # CrewAI Manager avec Process.hierarchical
   from crewai import Agent, Task, Crew, Process
   from langchain_openai import ChatOpenAI

   manager = Agent(
       role="Supervisor Manager",
       goal="Coordonner les agents et garantir la qualité des outputs",
       backstory="Tu supervises une équipe d'agents spécialisés.",
       llm=ChatOpenAI(model="gpt-4o")
   )
   researcher = Agent(role="Researcher", goal="Rechercher des informations précises", ...)
   writer = Agent(role="Writer", goal="Rédiger des contenus de qualité", ...)

   crew = Crew(
       agents=[researcher, writer],
       tasks=[research_task, writing_task],
       process=Process.hierarchical,
       manager_agent=manager,
       verbose=True
   )
   ```

10. **Reporting (métriques et dashboards)**
    - Générer des rapports de performance à la fin de chaque session supervisée
    - Métriques clés : taux de complétion, nombre d'interventions, temps moyen par tâche, coût total
    - Identifier les patterns d'échec récurrents pour améliorer les règles d'intervention
    ```python
    class SupervisorReporter:
        def generate_report(self, state: dict) -> dict:
            metrics = state["metrics"]
            return {
                "session_summary": {
                    "total_tasks": metrics["dispatched"],
                    "success_rate": metrics["completed"] / max(metrics["dispatched"], 1),
                    "intervention_rate": metrics["interventions"] / max(metrics["dispatched"], 1),
                    "failure_rate": metrics["failed"] / max(metrics["dispatched"], 1)
                },
                "agent_performance": {
                    agent_id: {
                        "tasks_completed": data.get("completed", 0),
                        "avg_quality": data.get("avg_quality", 0.0),
                        "interventions_received": data.get("interventions", 0)
                    }
                    for agent_id, data in state.get("agent_stats", {}).items()
                },
                "top_failure_reasons": self._count_failure_reasons(state)
            }
    ```

## Anti-patterns

- **Supervisor qui micro-manage** : un supervisor qui envoie des corrections toutes les 5 secondes perturbe l'exécution du sous-agent et dégrade la qualité. Définir des critères d'intervention clairs et laisser le sous-agent travailler sans interférence tant que ces critères ne sont pas franchis.
- **Pas de critères d'intervention clairs** : un supervisor qui intervient "à l'intuition" sans règles définies est imprévisible et difficile à déboguer. Chaque type d'intervention doit avoir un déclencheur quantifiable (temps, tokens, score de qualité).
- **Supervisor sans pouvoir de kill/restart** : un supervisor qui ne peut qu'observer sans pouvoir interrompre un agent défaillant est inutile. Implémenter obligatoirement les actions `TERMINATE` et `REDIRECT` avant de mettre en production.
- **Boucle infinie d'interventions** : un supervisor qui intervient, le sous-agent se remet en route, puis déclenche à nouveau l'intervention dans une boucle sans fin bloque tout le système. Toujours imposer une limite `max_corrections` avec escalade automatique si dépassée.

## Règles

1. **Définir les règles d'intervention de manière quantitative** (seuils numériques) avant de déployer le supervisor — jamais de jugement subjectif non formalisé.
2. **Tout superviseur doit avoir une action de dernier recours** : si toutes les corrections et redirections échouent, l'escalade (humaine ou vers l'orchestrateur) est obligatoire.
3. **Le supervisor ne doit jamais exécuter les tâches lui-même** sauf en mode dégradé explicite — son rôle est de coordonner, pas de produire.
4. **Chaque intervention est loggée** avec le motif, le contexte, l'action prise et le résultat, pour permettre l'audit et l'amélioration continue des règles.
5. **Le supervisor maintient une limite de correction par agent par tâche** : au-delà de `max_corrections` (recommandé : 3), l'agent est marqué comme `problematic` et la tâche est réassignée.


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
