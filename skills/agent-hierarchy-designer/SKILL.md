---
name: agent-hierarchy-designer
description: Design de hiérarchies d'agents multi-niveaux (orchestrateur → managers → workers → sous-agents spécialisés). Se déclenche avec "hiérarchie agent", "agent hierarchy", "manager agent", "worker agent", "arbre d'agents", "organisation agents", "agent tree", "niveaux d'agents". Also triggers on "supervisor worker agents", "multi-level agents".
---

# Agent Hierarchy Designer

## 1. Décider si une hiérarchie est justifiée

| Signal | Action |
|---|---|
| Tâche linéaire, < 5 agents, domaine homogène | Agent unique ou flat pipeline — pas de hiérarchie |
| 5–15 agents, 2–3 domaines distincts | Hiérarchie 2 niveaux (orchestrateur + workers) |
| > 15 agents, domaines hétérogènes, charge variable | Hiérarchie 3 niveaux avec managers intermédiaires |
| Sous-tâches complètement isolées | Préférer une orchestration par événements plutôt qu'une pyramide |

Coût réel d'une hiérarchie : +30–50 % de latence, débogage exponentiellement plus complexe, surface d'erreur plus large. N'ajouter un niveau que si le gain de parallélisme ou de spécialisation le justifie clairement.

## 2. Définir les niveaux et leur rôle

```
Orchestrateur  (1 seul)
├── Manager A  (domaine : recherche)
│   ├── Specialist Web
│   └── Specialist BDD
├── Manager B  (domaine : rédaction)
│   ├── Worker Draft
│   └── Worker Révision
└── Manager C  (domaine : validation)
    └── Specialist Fact-checker
```

Règle absolue : **maximum 4 niveaux**. Au-delà, le gain de spécialisation ne compense plus le coût de coordination.

| Niveau | Rôle unique | Peut créer des agents ? | Portée des outils |
|---|---|---|---|
| Orchestrateur | Stratégie, décomposition, agrégation finale | Oui (managers) | Toutes ressources |
| Manager | Coordination d'un domaine, allocation de budget | Oui (workers dans son domaine) | Ressources du domaine |
| Specialist | Expertise profonde dans une niche | Non | Outils spécialisés seulement |
| Worker | Exécution atomique, sans décision complexe | Non | Scope minimal |

## 3. Formaliser les responsabilités (prompt système de chaque niveau)

Chaque agent reçoit un system prompt qui précise **exactement** :
- Son rôle et ses limites d'autorité
- Ce qu'il peut décider seul vs ce qu'il doit escalader
- Le format des messages entrants et sortants
- Son budget token/API calls

```python
ORCHESTRATOR_PROMPT = """
Tu es l'orchestrateur. Tu reçois un objectif global.
1. Décompose en sous-objectifs par domaine.
2. Assigne chaque sous-objectif à un manager via un message JSON.
3. Attends les résultats, agrège, et produis la réponse finale.
Tu NE réalises pas de tâche atomique toi-même.
Budget max : {budget_tokens} tokens pour toute la session.
"""

MANAGER_PROMPT = """
Tu es le manager du domaine {domain}.
Tu reçois un sous-objectif. Décompose-le en tâches atomiques.
Assigne chaque tâche à un worker. Supervise et agrège les résultats.
Budget alloué : {child_budget} tokens. Escalade si insuffisant.
"""
```

## 4. Protocole de communication inter-niveaux

- **Top-down** : l'orchestrateur envoie des objectifs de haut niveau aux managers uniquement.
- **Bottom-up** : les workers remontent résultats et erreurs vers leur manager direct (jamais directement à l'orchestrateur).
- **Lateral** : interdit entre niveaux différents ; toléré entre agents du même manager si le manager l'autorise explicitement.

```python
from pydantic import BaseModel

class AgentMessage(BaseModel):
    msg_id: str
    trace_id: str          # Trace bout-en-bout (propagé depuis l'orchestrateur)
    sender_id: str
    receiver_id: str
    message_type: str      # "task" | "result" | "error" | "status" | "escalate"
    payload: dict
    budget_remaining: int  # Budget restant transmis à chaque message
    depth: int             # Niveau hiérarchique du sender (0 = orchestrateur)
```

## 5. Budget et délégation (éviter les dépassements de coût)

```python
class BudgetAllocator:
    PARENT_RESERVE = 0.20  # Le parent garde 20% pour son propre traitement

    def allocate(self, parent_budget: int, num_children: int) -> int:
        available = int(parent_budget * (1 - self.PARENT_RESERVE))
        per_child = available // num_children
        return max(per_child, 1_000)  # Minimum viable par enfant

# Exemple : budget total 100k tokens, 3 managers
# Manager reçoit : 100_000 * 0.8 / 3 = ~26_666 tokens chacun
# Chaque manager applique la même règle pour ses workers
```

Règle : si un agent atteint 80 % de son budget sans résultat, il émet un message `escalate` vers son manager plutôt que de continuer.

## 6. Supervision et health checks

```python
import asyncio

class ManagerAgent:
    async def supervise(self):
        while self.active:
            for worker in self.workers:
                status = await worker.ping(timeout=3)
                if status.failed or status.stalled:
                    await self.replace_worker(worker)
                    self.log_event("worker_replaced", worker.id)
            await asyncio.sleep(5)

    async def replace_worker(self, failed_worker):
        self.workers.remove(failed_worker)
        new_worker = self.spawn_worker(spec=failed_worker.spec)
        self.workers.append(new_worker)
```

Métriques minimales à collecter par manager :
- Taux de succès des workers (cible > 95 %)
- Temps moyen de traitement par tâche
- Nombre d'escalades vers l'orchestrateur

## 7. Scaling dynamique

```python
class HierarchyScaler:
    SCALE_UP_RATIO = 3    # Ajouter un worker si queue > workers * 3
    IDLE_TIMEOUT_S = 30   # Supprimer un worker inactif depuis 30s

    def scale_up(self, manager):
        if len(manager.task_queue) > len(manager.workers) * self.SCALE_UP_RATIO:
            manager.workers.append(manager.spawn_worker())

    def scale_down(self, manager):
        idle = [w for w in manager.workers if w.idle_since > self.IDLE_TIMEOUT_S]
        for w in idle[:-1]:  # Garder au moins 1 worker actif
            w.terminate()
```

## 8. Implémentation par framework (2026)

**LangGraph Supervisor** (recommandé pour hiérarchies dynamiques) :
```python
from langgraph.prebuilt import create_react_agent
from langgraph_supervisor import create_supervisor

research = create_react_agent(model, [web_search, db_query], name="researcher")
writer   = create_react_agent(model, [write_doc], name="writer")

supervisor = create_supervisor(
    agents=[research, writer],
    model=model,
    prompt="Coordonne la recherche et la rédaction. Agrège les résultats."
)
result = supervisor.invoke({"messages": [{"role": "user", "content": task}]})
```

**CrewAI Hierarchical Process** (recommandé pour équipes à rôles fixes) :
```python
from crewai import Crew, Process

crew = Crew(
    agents=[manager_agent, researcher, writer, validator],
    tasks=[research_task, write_task, validate_task],
    process=Process.hierarchical,
    manager_llm=ChatOpenAI(model="gpt-4o"),
)
result = crew.kickoff()
```

**AutoGen GroupChatManager imbriqués** (pour hiérarchies à 3+ niveaux) :
```python
from autogen import GroupChat, GroupChatManager

inner_group = GroupChat(agents=[worker1, worker2], messages=[], max_round=5)
inner_mgr   = GroupChatManager(groupchat=inner_group, llm_config=llm_cfg)

outer_group = GroupChat(agents=[orchestrator, inner_mgr], messages=[], max_round=10)
outer_mgr   = GroupChatManager(groupchat=outer_group, llm_config=llm_cfg)
```

## 9. Visualisation et debug

```python
def to_dot(orchestrator) -> str:
    """Génère un graphe Graphviz de la hiérarchie courante."""
    lines = ['digraph AgentTree {', '  rankdir=TB;']
    def walk(agent, parent=None):
        label = f'{agent.role}\\n{agent.id[:8]}'
        lines.append(f'  "{agent.id}" [label="{label}"];')
        if parent:
            lines.append(f'  "{parent.id}" -> "{agent.id}";')
        for child in getattr(agent, 'children', []):
            walk(child, agent)
    walk(orchestrator)
    lines.append('}')
    return '\n'.join(lines)

# Rendre le graphe : echo "$(python gen_dot.py)" | dot -Tsvg -o hierarchy.svg
```

Pour le débogage en production : propager un `trace_id` unique depuis l'orchestrateur dans chaque message. Filtrer les logs par `trace_id` pour reconstituer la chaîne complète d'une exécution.

## Anti-patterns / Pièges

- **Hiérarchie pour une tâche simple** : si la tâche peut tenir en < 5 agents flat, la hiérarchie ajoute de la latence sans valeur. Vérifier d'abord si un flat pipeline suffit.
- **Manager qui exécute des tâches atomiques** : le manager devient un goulot d'étranglement et annule le bénéfice du parallélisme. Les managers délèguent exclusivement.
- **Pas de feedback bottom-up** : sans remontée d'état, l'orchestrateur est aveugle. Même un simple `status: running` toutes les 30 s est indispensable.
- **Budget non propagé** : un agent sans contrainte de budget peut monopoliser les ressources et bloquer les autres. Toujours transmettre le budget restant dans chaque message.
- **Communication latérale non encadrée** : un worker qui contacte directement un autre worker hors de son domaine crée des dépendances cachées impossibles à tracer. Tout flux latéral passe par le manager commun.
- **5+ niveaux** : la latence cumulée (chaque niveau = 1+ LLM call) rend la hiérarchie inacceptablement lente. Aplatir ou regrouper des responsabilités.

## Règles non négociables

1. **Maximum 4 niveaux** dans toute hiérarchie.
2. **Un seul manager direct par agent** (pas de double hiérarchie).
3. **Communications respectent la chaîne** : un worker remonte vers son manager, jamais directement à l'orchestrateur.
4. **Budget explicite à chaque niveau**, transmis par le parent.
5. **Chaque agent a un system prompt distinct** définissant son scope et ses limites d'escalade.
6. **Trace ID bout-en-bout** pour chaque exécution (observabilité non optionnelle en production).


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
