---
name: agent-multi-agent-orchestrator
description: Conception de systèmes multi-agents avec patterns d'orchestration (supervisor, swarm, hierarchy, voting). Coordination entre agents spécialisés. Se déclenche avec "multi-agent", "orchestration", "supervisor agent", "swarm", "agent coordination", "agent hierarchy", "agents qui collaborent", "répartir entre agents".
---

# Multi-Agent Orchestrator

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois concevoir un système où plusieurs agents IA collaborent pour résoudre une tâche complexe. Il s'applique dès qu'une tâche bénéficie d'une décomposition en sous-tâches spécialisées, d'un routage intelligent entre agents, ou d'un mécanisme de consensus/vote. Idéal pour les architectures supervisor/worker, les pipelines de recherche parallèle et les systèmes de débat multi-agents.

## Workflow

1. **Analyse du problème** — Décompose la tâche principale en sous-tâches atomiques et indépendantes. Identifie les spécialisations requises (recherche, rédaction, validation, exécution de code, etc.) et les dépendances entre sous-tâches pour déterminer ce qui peut s'exécuter en parallèle.

2. **Design des agents** — Définis le rôle, les capabilities et les limites de chaque agent. Rédige un system prompt spécialisé pour chacun. Maintiens des agents focused (un agent = une responsabilité claire) plutôt que des agents généraux.

3. **Pattern de coordination** — Choisis le pattern adapté : `supervisor/router` (un agent central distribue et consolide), `peer-to-peer` (agents qui se contactent directement), `hierarchical` (niveaux d'agents), `swarm` (agents autonomes avec règles locales), `debate` (agents contradicteurs + arbitre).

4. **Communication inter-agents** — Implémente le mécanisme d'échange : shared state (dictionnaire commun), message passing (queue de messages), blackboard (tableau d'affichage partagé), ou event-based (pub/sub). Standardise le format des messages entre agents.

5. **Routing et dispatch** — Implémente la logique de sélection d'agent : semantic routing (embedding de la requête vs profils agents), intent classification (LLM classifier), capability matching (tags/métadonnées). Exemple en Python :
   ```python
   def route_task(task: str, agents: list[Agent]) -> Agent:
       scores = [(agent, cosine_sim(embed(task), agent.embedding)) for agent in agents]
       return max(scores, key=lambda x: x[1])[0]
   ```

6. **Gestion des conflits** — Prévois une stratégie quand des agents produisent des résultats contradictoires : vote majoritaire, vote pondéré par confiance, consensus LLM (un agent arbitre), priority rules (agent de référence), ou escalade humaine. Documente les règles de tie-breaking.

7. **State management partagé** — Maintiens un état global (task graph, statut de chaque sous-tâche, résultats intermédiaires, contexte de conversation). Utilise un objet thread-safe en mémoire pour les systèmes synchrones, Redis ou une base de données pour les systèmes distribués.

8. **Error handling distribué** — Gère les pannes d'agents : timeout avec valeur par défaut, retry exponentiel, circuit breaker (désactiver un agent défaillant), fallback vers un agent généraliste. Loggue chaque erreur avec l'identifiant d'agent, la tâche et le contexte.
   ```python
   async def safe_agent_call(agent, task, retries=3):
       for attempt in range(retries):
           try:
               return await asyncio.wait_for(agent.run(task), timeout=30)
           except asyncio.TimeoutError:
               if attempt == retries - 1:
                   return agent.fallback_response(task)
   ```

9. **Scaling** — Exécute les agents indépendants en parallèle (`asyncio.gather` ou `ThreadPoolExecutor`). Implémente un agent pool pour réutiliser les instances coûteuses. Utilise une queue de travail (Celery, RQ) pour les tâches longues en arrière-plan.

10. **Monitoring** — Instrumente chaque agent : temps d'exécution, taux de réussite, coût en tokens, nombre de retries, fréquence d'utilisation. Identifie les goulots d'étranglement (agent le plus lent) et les agents sous-utilisés. Mets en place des alertes sur les taux d'erreur.

## Règles

- **Un agent = une responsabilité** : un agent trop généraliste dégrade la qualité ; préfère la composition à la complexité interne.
- **Anti-pattern — cascade de dépendances** : évite les chaînes linéaires A→B→C→D où chaque échec bloque tout ; prévois toujours un fallback ou une exécution parallèle quand possible.
- **Idempotence** : les appels d'agents doivent être idempotents pour permettre les retries sans effets de bord.
- **Transparence des coûts** : chaque invocation d'agent a un coût en tokens/argent ; implante un budget global et interromps le workflow si le budget est dépassé.
- **Testabilité** : chaque agent doit être testable en isolation avec des inputs/outputs mockés, indépendamment de l'orchestrateur.
