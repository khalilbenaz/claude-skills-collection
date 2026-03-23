---
name: agent-task-decomposer
description: Décomposition automatique de tâches complexes en sous-tâches pour distribution aux sous-agents. Se déclenche avec "décomposer tâche", "task decomposition", "découper en sous-tâches", "diviser le travail", "plan d'exécution agent", "agent planner", "work breakdown agent".
---

# Agent Task Decomposer

## Quand utiliser ce skill
Utiliser ce skill lorsqu'une tâche principale est trop vaste ou trop hétérogène pour être confiée à un seul agent. Il s'applique dès que la parallélisation peut accélérer l'exécution, ou lorsque différentes parties d'une tâche requièrent des compétences ou outils distincts. Indispensable avant tout dispatch vers des sous-agents.

## Workflow

1. **Analyse de la tâche principale**
   - Identifier l'objectif final précis : quel livrable, quel format, quelle qualité attendue
   - Recenser les contraintes : deadline, budget tokens, outils disponibles, données d'entrée
   - Comprendre le contexte : quelle connaissance préalable est nécessaire, quels sont les risques
   - Poser les questions de clarification si l'objectif est ambigu avant de décomposer
   ```python
   class TaskAnalysis(BaseModel):
       objective: str
       expected_output: str
       constraints: list[str]
       available_tools: list[str]
       deadline_seconds: Optional[int]
       context: dict
   ```

2. **Stratégie de décomposition (choisir le bon modèle)**
   - `sequential` : les sous-tâches s'enchaînent, chacune dépend de la précédente (pipeline)
   - `parallel` : toutes les sous-tâches sont indépendantes, exécutées simultanément
   - `tree` : une tâche se décompose récursivement en branches, réunies à la racine
   - `DAG (Directed Acyclic Graph)` : graphe de dépendances complexe, certaines tâches parallèles, d'autres séquentielles
   ```python
   from enum import Enum

   class DecompositionStrategy(Enum):
       SEQUENTIAL = "sequential"
       PARALLEL = "parallel"
       TREE = "tree"
       DAG = "dag"

   def choose_strategy(task: TaskAnalysis) -> DecompositionStrategy:
       if all_independent(task.subtasks):
           return DecompositionStrategy.PARALLEL
       elif has_complex_dependencies(task.subtasks):
           return DecompositionStrategy.DAG
       else:
           return DecompositionStrategy.SEQUENTIAL
   ```

3. **Identification des sous-tâches (atomicité et complétude)**
   - Chaque sous-tâche doit être **atomique** : réalisable par un seul agent sans sous-décomposition
   - Chaque sous-tâche doit être **complète** : produire un livrable intermédiaire utilisable
   - Chaque sous-tâche doit être **indépendante** autant que possible pour maximiser le parallélisme
   - Nommer chaque sous-tâche avec un verbe d'action : `rechercher_sources`, `rédiger_intro`, `valider_faits`
   ```python
   class SubTask(BaseModel):
       subtask_id: str
       name: str
       description: str
       required_inputs: list[str]   # IDs des sous-tâches dont ce résultat dépend
       expected_output: str
       required_capability: str     # "search" | "write" | "code" | "validate"
       complexity: str              # "low" | "medium" | "high"
   ```

4. **Modélisation des dépendances (DAG ordering)**
   - Construire un graphe orienté : nœuds = sous-tâches, arêtes = dépendances
   - Vérifier l'absence de cycles (sinon deadlock assuré)
   - Calculer le **chemin critique** : la chaîne de sous-tâches la plus longue, qui définit la durée totale
   - Identifier les sous-tâches qui peuvent être parallélisées (pas de dépendances communes)
   ```python
   import networkx as nx

   def build_dependency_graph(subtasks: list[SubTask]) -> nx.DiGraph:
       G = nx.DiGraph()
       for task in subtasks:
           G.add_node(task.subtask_id)
           for dep in task.required_inputs:
               G.add_edge(dep, task.subtask_id)
       if not nx.is_directed_acyclic_graph(G):
           raise ValueError("Cycle détecté dans les dépendances !")
       return G

   def get_execution_order(G: nx.DiGraph) -> list[list[str]]:
       # Retourne des batches de tâches exécutables en parallèle
       return list(nx.topological_generations(G))
   ```

5. **Estimation de complexité par sous-tâche**
   - `low` : tâche simple, modèle léger suffisant (ex: GPT-4o-mini), durée < 10s
   - `medium` : raisonnement modéré, modèle standard (ex: GPT-4o), durée 10-60s
   - `high` : complexité élevée, modèle premium (ex: o3, Claude Opus), durée > 60s
   - Estimation du coût token pour allouer le budget de manière optimale
   ```python
   def estimate_complexity(subtask: SubTask) -> dict:
       base_tokens = {
           "low": 500,
           "medium": 2000,
           "high": 8000
       }
       return {
           "model": select_model(subtask.complexity),
           "estimated_tokens": base_tokens[subtask.complexity],
           "timeout": {"low": 15, "medium": 60, "high": 180}[subtask.complexity]
       }
   ```

6. **Assignment aux sous-agents (matching capacités/tâches)**
   - Mapper chaque sous-tâche à l'agent le plus qualifié selon `required_capability`
   - Appliquer le load balancing : ne pas surcharger un seul agent si d'autres sont disponibles
   - Respecter la spécialisation : envoyer les tâches de code au `CodeAgent`, de recherche au `SearchAgent`
   ```python
   class TaskAssigner:
       def assign(self, subtasks: list[SubTask], agents: list) -> dict:
           assignments = {}
           capability_map = self._build_capability_map(agents)
           for task in subtasks:
               eligible = capability_map.get(task.required_capability, [])
               if not eligible:
                   raise ValueError(f"Aucun agent pour la capacité : {task.required_capability}")
               # Load balancing : prendre l'agent avec le moins de tâches assignées
               agent = min(eligible, key=lambda a: len(assignments.get(a.id, [])))
               assignments.setdefault(agent.id, []).append(task)
           return assignments
   ```

7. **Execution plan generation (plan d'exécution)**
   - Générer un plan d'exécution avec : ordre des batches, agents assignés, timeouts
   - Calculer le parallelisme maximal : combien de sous-tâches peuvent s'exécuter simultanément
   - Identifier le chemin critique pour prioriser les tâches les plus bloquantes
   ```python
   class ExecutionPlan(BaseModel):
       plan_id: str
       batches: list[list[str]]       # Groupes de subtask_ids exécutables en parallèle
       assignments: dict[str, str]    # subtask_id -> agent_id
       critical_path: list[str]       # Chemin le plus long
       estimated_total_time: float
       estimated_total_cost: float

   def generate_plan(subtasks, graph, assignments) -> ExecutionPlan:
       batches = list(nx.topological_generations(graph))
       critical = nx.dag_longest_path(graph)
       return ExecutionPlan(
           plan_id=uuid4().hex,
           batches=batches,
           assignments=assignments,
           critical_path=critical,
           estimated_total_time=sum(estimate_complexity(t)["timeout"] for t in critical)
       )
   ```

8. **Checkpoint et validation intermédiaire**
   - Avant de passer au batch suivant, valider les résultats du batch précédent
   - Vérifier : format conforme, données complètes, pas d'erreurs silencieuses
   - Si une sous-tâche critique échoue, décider : retry, fallback, ou arrêt du plan
   ```python
   async def execute_with_checkpoints(plan: ExecutionPlan, agents: dict):
       results = {}
       for batch in plan.batches:
           batch_results = await execute_parallel_batch(batch, agents, results)
           # Valider avant de continuer
           for task_id, result in batch_results.items():
               if not validate_intermediate_result(result):
                   await handle_failure(task_id, plan, agents, results)
           results.update(batch_results)
       return results
   ```

9. **Re-planning dynamique (adaptation en temps réel)**
   - Si une sous-tâche échoue et que le retry ne suffit pas, re-décomposer cette partie
   - Si une sous-tâche prend trop de temps, diviser en sous-tâches plus petites à la volée
   - Si le contexte change (nouvelles informations), mettre à jour le plan et notifier les agents concernés
   ```python
   class DynamicReplanner:
       def replan_on_failure(self, failed_task: SubTask, plan: ExecutionPlan) -> ExecutionPlan:
           # Décomposer plus finement la tâche échouée
           finer_subtasks = decompose_further(failed_task)
           # Supprimer la tâche originale et insérer les nouvelles
           updated_plan = insert_subtasks(plan, failed_task.subtask_id, finer_subtasks)
           return updated_plan
   ```

10. **Visualisation du plan (Gantt et dependency graph)**
    - Générer une représentation visuelle pour valider le plan avant exécution
    - Gantt-like : afficher les batches sur une timeline avec les durées estimées
    - Dependency graph : DOT format pour Graphviz ou Mermaid pour affichage dans Markdown
    ```python
    def to_mermaid(plan: ExecutionPlan, subtasks: dict) -> str:
        lines = ["graph TD"]
        for task_id, task in subtasks.items():
            lines.append(f'  {task_id}["{task.name}"]')
            for dep in task.required_inputs:
                lines.append(f'  {dep} --> {task_id}')
        return "\n".join(lines)
    ```

## Anti-patterns

- **Sous-tâches trop couplées** : des sous-tâches qui partagent un état mutable ou des effets de bord empêchent la parallélisation et créent des race conditions. Chaque sous-tâche doit opérer sur ses propres données.
- **Décomposition trop fine** : découper en dizaines de micro-tâches génère plus d'overhead de coordination que de gain en parallélisme. Une bonne granularité signifie que chaque sous-tâche prend au moins 5-10 secondes à exécuter.
- **Pas de dépendances modélisées** : ignorer les dépendances et tout exécuter en parallèle cause des résultats incohérents quand une tâche utilise le résultat d'une autre qui n'est pas encore terminée.
- **Plan rigide sans adaptation** : un plan d'exécution figé qui ne peut pas être modifié en cas d'échec ou de nouvelle information conduit à l'échec total de la mission au moindre imprévu.

## Règles

1. **Valider le DAG avant exécution** : détecter les cycles et les dépendances manquantes avant de lancer quoi que ce soit pour éviter les deadlocks et les erreurs de runtime.
2. **Chaque sous-tâche produit un livrable vérifiable** : sans output mesurable, impossible de détecter un échec silencieux ou de construire sur le résultat.
3. **Toujours calculer le chemin critique** et prioriser son exécution pour minimiser le temps total d'exécution.
4. **Prévoir systématiquement un plan de fallback** pour chaque sous-tâche sur le chemin critique — une alternative moins optimale mais fonctionnelle en cas d'échec.
5. **Documenter les hypothèses de décomposition** : expliquer pourquoi telle tâche a été découpée de cette façon, pour faciliter le re-planning si le contexte change.
