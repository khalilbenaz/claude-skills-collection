---
name: agent-hierarchy-designer
description: Design de hiérarchies d'agents multi-niveaux (orchestrateur → managers → workers → sous-agents spécialisés). Se déclenche avec "hiérarchie agent", "agent hierarchy", "manager agent", "worker agent", "arbre d'agents", "organisation agents", "agent tree", "niveaux d'agents".
---

# Agent Hierarchy Designer

## Quand utiliser ce skill
Utiliser ce skill lorsqu'une tâche complexe nécessite plusieurs couches d'agents avec des responsabilités distinctes : stratégie, coordination et exécution. Il est particulièrement adapté quand le nombre d'agents devient trop grand pour être coordonné par un seul orchestrateur, ou quand les domaines d'exécution sont suffisamment distincts pour justifier des managers spécialisés.

## Workflow

1. **Analyse de la complexité (besoin d'une hiérarchie ?)**
   - Un seul agent suffit si la tâche est linéaire, sans parallélisme et sans spécialisation requise
   - Une hiérarchie est justifiée si : nombre d'agents > 5, domaines hétérogènes, ou charge variable
   - Critères de décision : couplage des sous-tâches, diversité des outils, niveau d'autonomie requis
   - Coût d'une hiérarchie : latence accrue, complexité de débogage, overhead de coordination

2. **Design des niveaux (architecture de la pyramide)**
   - **Niveau 1 — Orchestrateur** : vision globale, stratégie, décision finale, 1 seul agent
   - **Niveau 2 — Managers** : coordination d'un domaine (recherche, écriture, validation), 2-5 agents
   - **Niveau 3 — Specialists** : exécution experte dans une niche précise, 3-10 agents
   - **Niveau 4 — Workers** : tâches atomiques répétitives, pool dynamique
   - Règle : ne jamais dépasser 4 niveaux pour garder le système déboguable
   ```
   Orchestrateur
   ├── Manager Recherche
   │   ├── Specialist Web
   │   └── Specialist Base de données
   ├── Manager Rédaction
   │   ├── Worker Draft
   │   └── Worker Révision
   └── Manager Validation
       └── Specialist Fact-checker
   ```

3. **Rôle et responsabilités de chaque niveau**
   - `Orchestrateur` : décompose la mission globale, assigne aux managers, agrège les résultats finaux
   - `Manager` : reçoit un objectif de domaine, le décompose en tâches pour ses specialists/workers
   - `Specialist` : expertise profonde dans un outil ou domaine, peut utiliser des APIs spécifiques
   - `Worker` : exécution d'une tâche atomique sans prise de décision complexe
   ```python
   class AgentRole:
       ORCHESTRATOR = "orchestrator"   # Stratégie + agrégation finale
       MANAGER = "manager"             # Coordination de domaine
       SPECIALIST = "specialist"       # Expertise métier
       WORKER = "worker"               # Exécution atomique
   ```

4. **Communication inter-niveaux**
   - `Top-down` : l'orchestrateur envoie des objectifs de haut niveau aux managers
   - `Bottom-up` : les workers remontent les résultats et erreurs vers leur manager
   - `Lateral` : coordination entre agents du même niveau (rare, encadrée par le manager)
   - Protocole : messages structurés avec `sender_id`, `receiver_id`, `message_type`, `payload`
   ```python
   class AgentMessage(BaseModel):
       msg_id: str
       sender_id: str
       receiver_id: str
       message_type: str  # "task" | "result" | "error" | "status"
       payload: dict
       timestamp: float
       trace_id: str  # Pour suivre toute la chaîne
   ```

5. **Scope et autorité par niveau**
   - `Orchestrateur` : peut créer/détruire des managers, accès à toutes les ressources
   - `Manager` : peut créer des workers dans son domaine, budget limité de tokens/API calls
   - `Specialist` : peut utiliser ses outils dédiés, pas de création de sous-agents
   - `Worker` : scope minimal, outils restreints, durée de vie courte
   - Définir explicitement ce que chaque niveau peut décider seul vs ce qu'il doit escalader

6. **Delegation rules (règles de délégation formalisées)**
   - Un manager ne crée des sous-agents que si la tâche dépasse sa capacité individuelle
   - Limite de profondeur : max 2 niveaux de délégation depuis un manager
   - Budget token propagé depuis l'orchestrateur : chaque niveau reçoit une fraction du budget total
   ```python
   class DelegationBudget:
       def __init__(self, total_tokens: int, max_depth: int = 3):
           self.total = total_tokens
           self.max_depth = max_depth

       def allocate_to_child(self, parent_budget: int, num_children: int) -> int:
           # Réserver 20% pour le parent, distribuer 80% entre enfants
           child_budget = int(parent_budget * 0.8 / num_children)
           return max(child_budget, 1000)  # Minimum 1000 tokens par enfant
   ```

7. **Supervision pattern (contrôle de la hiérarchie)**
   - Chaque manager supervise ses directs reports via health checks périodiques
   - Performance monitoring : taux de succès, temps d'exécution, qualité des outputs
   - Un manager peut remplacer un worker défaillant en instanciant un nouveau depuis le pool
   ```python
   class ManagerAgent:
       async def supervise_workers(self):
           while self.active:
               for worker in self.workers:
                   health = await worker.health_check()
                   if not health.ok:
                       await self.replace_worker(worker)
               await asyncio.sleep(5)  # Check toutes les 5 secondes
   ```

8. **Dynamic hierarchy (adaptabilité de la structure)**
   - Auto-scaling : ajouter des workers si la file d'attente dépasse un seuil
   - Pruning : supprimer les agents inactifs depuis plus de X secondes pour économiser les ressources
   - Promotion : un worker très performant peut être promu specialist si nécessaire
   - Merge : fusionner deux managers sous-utilisés en un seul pour réduire l'overhead
   ```python
   class HierarchyScaler:
       def scale_up(self, manager, task_queue_size: int):
           if task_queue_size > manager.worker_count * 3:
               new_worker = manager.spawn_worker()
               manager.workers.append(new_worker)

       def scale_down(self, manager):
           idle = [w for w in manager.workers if w.idle_since > 30]
           for worker in idle[:-1]:  # Garder au moins 1 worker
               worker.terminate()
   ```

9. **Implémentation concrète**
   - **LangGraph Supervisor** : pattern natif pour orchestrer des sous-agents avec un nœud supervisor
   - **CrewAI Hierarchical** : `Process.hierarchical` avec `manager_llm` dédié
   - **AutoGen Nested Chats** : `GroupChatManager` imbriqués pour simuler les niveaux
   ```python
   # LangGraph supervisor pattern
   from langgraph.prebuilt import create_react_agent
   from langgraph_supervisor import create_supervisor

   research_agent = create_react_agent(model, [search_tool], name="researcher")
   writer_agent = create_react_agent(model, [write_tool], name="writer")

   supervisor = create_supervisor(
       agents=[research_agent, writer_agent],
       model=model,
       prompt="Coordonne la recherche et la rédaction."
   )
   ```

   ```python
   # CrewAI hierarchical
   from crewai import Crew, Process

   crew = Crew(
       agents=[manager, researcher, writer, validator],
       tasks=[task1, task2, task3],
       process=Process.hierarchical,
       manager_llm=ChatOpenAI(model="gpt-4o"),
       verbose=True
   )
   ```

10. **Visualisation et debug de la hiérarchie**
    - Générer une `hierarchy map` en DOT/Graphviz pour visualiser la structure
    - Task flow visualization : tracer chaque message entre agents avec le `trace_id`
    - Bottleneck detection : identifier quel agent ou niveau ralentit l'ensemble
    ```python
    def generate_hierarchy_map(orchestrator) -> str:
        lines = ["digraph G {"]
        def traverse(agent, parent=None):
            if parent:
                lines.append(f'  "{parent.id}" -> "{agent.id}";')
            for child in agent.children:
                traverse(child, agent)
        traverse(orchestrator)
        lines.append("}")
        return "\n".join(lines)
    ```

## Anti-patterns

- **Trop de niveaux** : une hiérarchie de 5+ niveaux multiplie la latence et rend le débogage cauchemardesque. Au-delà de 4 niveaux, refactoriser en aplatissant ou en regroupant des responsabilités.
- **Manager qui fait le travail des workers** : un manager qui exécute des tâches atomiques lui-même crée un goulot d'étranglement et annule le bénéfice de la parallélisation. Les managers délèguent, ils n'exécutent pas.
- **Pas de feedback bottom-up** : une hiérarchie sans remontée d'information est aveugle. L'orchestrateur doit toujours savoir l'état de progression de chaque niveau, même grossièrement.
- **Hiérarchie rigide sans adaptabilité** : une structure figée ne peut pas absorber les pics de charge ou les pannes partielles. Prévoir le scaling horizontal des workers et la promotion/dégradation dynamique des agents.

## Règles

1. **Maximum 4 niveaux** dans toute hiérarchie d'agents pour garantir la maintenabilité et la lisibilité du système.
2. **Chaque agent a un seul manager direct** (pas de double hiérarchie) pour éviter les conflits d'instructions et les deadlocks.
3. **Les communications respectent la hiérarchie** : un worker ne contacte pas directement l'orchestrateur — il passe par son manager.
4. **Chaque niveau dispose d'un budget explicite** (tokens, API calls, temps) alloué par son parent pour prévenir les dépassements de coût.
5. **La hiérarchie est documentée et versionnée** : tout changement de structure (ajout d'un niveau, nouveau manager) fait l'objet d'un changelog pour faciliter le débogage en production.


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
