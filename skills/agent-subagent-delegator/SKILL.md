---
name: agent-subagent-delegator
description: Conception de systèmes de délégation parent-agent → sous-agents avec dispatch intelligent, suivi des tâches et agrégation des résultats. Se déclenche avec "sous-agent", "subagent", "délégation agent", "agent parent", "dispatch agent", "agent qui délègue", "spawner sous-agent", "delegate task".
---

# Subagent Delegator

## Quand utiliser ce skill
Utiliser ce skill lorsqu'un agent parent doit distribuer du travail à des sous-agents spécialisés pour paralléliser l'exécution ou isoler des responsabilités. Il s'applique aussi quand la tâche principale est trop vaste pour un seul agent et nécessite un mécanisme de dispatch, de suivi et de collecte de résultats structurés.

## Workflow

1. **Architecture de délégation (parent-child model)**
   - Définir clairement qui est le parent (orchestrateur) et qui sont les enfants (exécuteurs)
   - Déterminer le scope de chaque sous-agent : domaine métier, outil, API ou type de tâche
   - Exemple de structure : `ParentAgent → [ResearchAgent, WriterAgent, ValidatorAgent]`
   - Documenter les responsabilités et frontières de chaque sous-agent

2. **Interface de délégation (task definition schema)**
   - Définir un schéma de tâche standardisé que tout sous-agent peut recevoir
   - Champs obligatoires : `objective`, `context`, `constraints`, `output_format`, `timeout`
   ```python
   from pydantic import BaseModel
   from typing import Optional, Dict, Any

   class TaskDefinition(BaseModel):
       task_id: str
       objective: str
       context: Dict[str, Any]
       constraints: list[str]
       output_format: str  # "json" | "text" | "structured"
       timeout: int  # secondes
       priority: int = 1
       retry_limit: int = 3
   ```

3. **Dispatch strategy (stratégie de routage)**
   - `round-robin` : distribuer cycliquement entre agents disponibles
   - `capability-based` : router selon les capacités déclarées de chaque sous-agent
   - `load-based` : envoyer au sous-agent avec la file d'attente la plus courte
   - `semantic routing` : classifier la tâche et choisir l'agent le plus adapté
   ```python
   def route_task(task: TaskDefinition, agents: list) -> str:
       # Semantic routing avec embeddings
       task_embedding = embed(task.objective)
       scores = [(a.id, cosine_sim(task_embedding, a.capability_embedding)) for a in agents]
       return max(scores, key=lambda x: x[1])[0]
   ```

4. **Spawn de sous-agents (instanciation dynamique)**
   - `dynamic creation` : créer un sous-agent à la demande, détruire après usage
   - `pool pre-allocated` : maintenir un pool de sous-agents prêts à recevoir des tâches
   - `lazy instantiation` : instancier seulement si la charge dépasse un seuil
   ```python
   class AgentPool:
       def __init__(self, agent_class, pool_size=5):
           self.pool = [agent_class() for _ in range(pool_size)]
           self.busy = set()

       def acquire(self):
           available = [a for a in self.pool if a.id not in self.busy]
           if not available:
               return self._spawn_temporary()
           agent = available[0]
           self.busy.add(agent.id)
           return agent
   ```

5. **Communication parent ↔ sous-agent**
   - Task assignment : envoi de `TaskDefinition` via queue ou appel direct
   - Progress reporting : le sous-agent publie son avancement (`0-100%` ou états discrets)
   - Result return : retour structuré via `TaskResult` avec statut, données, erreurs
   - Error escalation : le sous-agent signale les erreurs non-récupérables au parent
   ```python
   class TaskResult(BaseModel):
       task_id: str
       agent_id: str
       status: str  # "success" | "partial" | "failed"
       data: Any
       errors: list[str] = []
       execution_time: float
       confidence: float = 1.0
   ```

6. **Monitoring des sous-agents**
   - Status tracking : maintenir un registre `{agent_id: status, last_update, current_task}`
   - Heartbeat : chaque sous-agent envoie un signal toutes les N secondes
   - Timeout detection : si pas de heartbeat après `timeout`, marquer comme `unresponsive`
   - Kill signal : envoyer `SIGTERM` logique pour interrompre proprement
   ```python
   import asyncio
   from datetime import datetime, timedelta

   class AgentMonitor:
       def __init__(self, timeout_seconds=30):
           self.heartbeats = {}
           self.timeout = timedelta(seconds=timeout_seconds)

       async def check_health(self, agent_id: str) -> bool:
           last = self.heartbeats.get(agent_id)
           if not last or datetime.now() - last > self.timeout:
               return False
           return True
   ```

7. **Résultat handling (collecte et validation)**
   - Aggregation : collecter tous les `TaskResult` une fois la file épuisée
   - Validation : vérifier le schema, la complétude et la cohérence de chaque résultat
   - Retry on failure : re-dispatcher les tâches échouées (max `retry_limit` fois)
   - Partial results : accepter des résultats partiels si le timeout est atteint
   ```python
   async def collect_results(tasks: list, timeout: int) -> list[TaskResult]:
       results = await asyncio.gather(
           *[agent.execute(task) for task, agent in tasks],
           return_exceptions=True
       )
       return [r for r in results if not isinstance(r, Exception)]
   ```

8. **Cleanup et lifecycle management**
   - Termination : appeler `agent.shutdown()` après chaque tâche pour libérer les ressources
   - Resource cleanup : fermer les connexions DB, API, file handles ouverts par le sous-agent
   - Memory management : garbage collect les objets lourds (embeddings, modèles chargés)
   - Pool housekeeping : retirer les agents défaillants du pool et les remplacer

9. **Error propagation (gestion des pannes)**
   - Échec récupérable : retry automatique avec backoff exponentiel (`1s, 2s, 4s, 8s`)
   - Échec non-récupérable : escalade au parent avec le contexte complet de l'erreur
   - Fallback : si tous les retries échouent, activer un agent de fallback dégradé
   - Dead letter queue : archiver les tâches définitivement échouées pour audit
   ```python
   async def execute_with_retry(agent, task: TaskDefinition) -> TaskResult:
       for attempt in range(task.retry_limit):
           try:
               return await asyncio.wait_for(agent.run(task), timeout=task.timeout)
           except Exception as e:
               if attempt == task.retry_limit - 1:
                   raise
               await asyncio.sleep(2 ** attempt)
   ```

10. **Patterns de délégation avancés**
    - `fan-out/fan-in` : distribuer la même tâche à plusieurs agents, agréger les meilleurs résultats
    - `pipeline` : chaque sous-agent traite la sortie du précédent (A → B → C)
    - `recursive delegation` : un sous-agent peut lui-même déléguer à des sous-sous-agents
    - `conditional delegation` : choisir le sous-agent selon une condition évaluée au runtime
    ```python
    # Fan-out/fan-in avec LangGraph
    from langgraph.graph import StateGraph

    def fan_out(state):
        return {
            "research_task": state["query"],
            "analysis_task": state["query"],
        }

    def fan_in(research_result, analysis_result):
        return {"final": merge(research_result, analysis_result)}
    ```

## Anti-patterns

- **Déléguer sans objectif clair** : un sous-agent qui reçoit une tâche vague produira des résultats inutilisables. Toujours définir `objective`, `constraints` et `output_format` explicitement avant de dispatcher.
- **Sous-agent sans timeout** : un sous-agent bloqué peut paralyser tout le système. Chaque tâche doit avoir un timeout strict, et le parent doit savoir gérer un `TimeoutError`.
- **Pas de validation des résultats** : accepter aveuglément la sortie d'un sous-agent sans vérifier le schema ou la cohérence peut propager silencieusement des erreurs. Valider systématiquement avec Pydantic ou un schéma JSON.
- **Chaîne de délégation trop profonde** : dépasser 3-4 niveaux de délégation récursive rend le débogage impossible et augmente la latence. Limiter la profondeur et aplatir la hiérarchie si possible.

## Règles

1. **Chaque tâche déléguée doit avoir un ID unique** pour le traçage de bout en bout dans les logs et le monitoring.
2. **Le parent reste responsable** de la cohérence du résultat final — il ne peut pas déléguer sa responsabilité de validation.
3. **Toujours implémenter un circuit breaker** : si un sous-agent échoue N fois consécutives, le mettre en quarantaine automatiquement.
4. **Favoriser l'idempotence** : les tâches déléguées doivent pouvoir être rejouées sans effet de bord si le retry est nécessaire.
5. **Documenter les contrats d'interface** : chaque sous-agent expose un `capability manifest` décrivant ce qu'il peut faire, ses inputs attendus et ses outputs garantis.


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
