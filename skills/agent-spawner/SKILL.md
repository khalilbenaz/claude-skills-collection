---
name: agent-spawner
description: Création dynamique de sous-agents à la volée avec configuration, lifecycle management et resource allocation. Se déclenche avec "spawner", "créer agent dynamiquement", "spawn agent", "agent factory", "agent dynamique", "instancier agent", "agent à la volée", "dynamic agent creation".
---

# Agent Spawner

## Quand utiliser ce skill

Utiliser ce skill lorsqu'une tâche nécessite la création dynamique de sous-agents spécialisés pendant l'exécution — par exemple quand la complexité d'une requête dépasse les capacités d'un agent unique ou que des traitements parallèles indépendants sont requis. Ce skill est adapté aux architectures multi-agents où le nombre et le type d'agents ne peuvent pas être déterminés à l'avance. Il convient également aux systèmes de type "agent factory" où des gabarits réutilisables doivent être instanciés avec des configurations contextuelles différentes.

## Workflow

1. **Définir les templates d'agents** — Créer des gabarits réutilisables (system prompt, tools autorisés, modèle LLM, contraintes, timeout). Chaque template définit une spécialisation : `ResearcherTemplate`, `CoderTemplate`, `ReviewerTemplate`, etc.

2. **Identifier le déclencheur de spawn** — Évaluer les conditions qui justifient la création d'un nouvel agent : complexité de la tâche, besoin de spécialisation, parallélisme requis, manque de compétence de l'agent courant.

3. **Configuration dynamique** — Injecter le contexte spécifique dans le template sélectionné : données d'entrée, instructions particulières, tools adaptés à la tâche, sélection du modèle selon le budget disponible.

4. **Resource allocation** — Allouer les ressources avant le spawn : budget tokens, timeout maximal, liste des tools accessibles, niveau de permission, modèle LLM (premium vs économique selon la criticité).

5. **Lifecycle management** — Piloter l'agent à travers les phases `create → initialize → execute → report → terminate`. Chaque transition doit être loggée avec un timestamp et l'état résultant.

6. **Agent registry** — Enregistrer chaque agent spawné dans un registre central : identifiant unique (UUID), statut courant, heure de création, référence au parent, tâche assignée, métriques d'utilisation.

7. **Agents éphémères vs persistants** — Distinguer les agents one-shot (créés pour une tâche unique puis détruits) des agents persistants (maintenus entre les tâches pour réduire le warm-up). Adapter la stratégie selon le coût et la fréquence d'utilisation.

8. **Rate limiting** — Enforcer les limites : nombre maximal d'agents concurrents, cadence de spawn (agents/seconde), budget total alloué à l'ensemble du pool, file d'attente si le plafond est atteint.

9. **Cleanup et garbage collection** — Terminer les agents inactifs après un timeout, libérer les ressources allouées, archiver les logs de résultats, supprimer les entrées du registre pour les agents terminés.

10. **Factory patterns** — Implémenter des patterns reconnus : `AgentFactory` (création centralisée), `Builder` (configuration étape par étape), héritage de templates, composition de capacités pour créer des agents hybrides.

```python
# Exemple d'implémentation Python — AgentFactory
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class AgentTemplate:
    name: str
    system_prompt: str
    tools: list[str]
    model: str = "claude-3-5-sonnet"
    max_tokens: int = 4096
    timeout_seconds: int = 120

@dataclass
class AgentInstance:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    template_name: str = ""
    status: str = "created"  # created | running | done | failed | terminated
    created_at: datetime = field(default_factory=datetime.utcnow)
    parent_id: Optional[str] = None
    result: Optional[str] = None

class AgentFactory:
    _templates: dict[str, AgentTemplate] = {}
    _registry: dict[str, AgentInstance] = {}
    _max_concurrent: int = 10

    @classmethod
    def register_template(cls, template: AgentTemplate):
        cls._templates[template.name] = template

    @classmethod
    def spawn(cls, template_name: str, context: dict, parent_id: str = None) -> AgentInstance:
        if len([a for a in cls._registry.values() if a.status == "running"]) >= cls._max_concurrent:
            raise RuntimeError("Max concurrent agents reached — task queued")
        
        template = cls._templates[template_name]
        agent = AgentInstance(template_name=template_name, parent_id=parent_id)
        cls._registry[agent.id] = agent
        
        # Injecter le contexte dans le system prompt
        enriched_prompt = template.system_prompt.format(**context)
        agent.status = "running"
        
        print(f"[SPAWN] Agent {agent.id} ({template_name}) créé à {agent.created_at}")
        return agent

    @classmethod
    def terminate(cls, agent_id: str, result: str = None):
        if agent_id in cls._registry:
            cls._registry[agent_id].status = "terminated"
            cls._registry[agent_id].result = result
            print(f"[TERMINATE] Agent {agent_id} terminé.")

    @classmethod
    def active_agents(cls) -> list[AgentInstance]:
        return [a for a in cls._registry.values() if a.status == "running"]

# Usage
researcher_tpl = AgentTemplate(
    name="researcher",
    system_prompt="Tu es un chercheur expert en {domain}. Analyse: {task}",
    tools=["search_web", "fetch_url"],
    model="claude-3-5-haiku"
)
AgentFactory.register_template(researcher_tpl)

agent = AgentFactory.spawn("researcher", {"domain": "IA", "task": "LLM benchmarks 2025"})
AgentFactory.terminate(agent.id, result="Rapport de recherche complet")
```

```
Architecture — Agent Spawner

  Parent Agent
      │
      ▼
  AgentFactory
  ┌─────────────────────────────────┐
  │  Templates Registry             │
  │  ┌─────────┐ ┌───────────────┐  │
  │  │Coder    │ │ Researcher    │  │
  │  │Template │ │ Template      │  │
  │  └─────────┘ └───────────────┘  │
  └────────────┬────────────────────┘
               │ spawn()
               ▼
  Agent Registry (UUID → AgentInstance)
  ┌──────────┬──────────┬──────────┐
  │ Agent A  │ Agent B  │ Agent C  │
  │ running  │ done     │ running  │
  └──────────┴──────────┴──────────┘
               │
               ▼
  Rate Limiter → max_concurrent=10
  GC → terminate idle agents
```

**Comparaison LangGraph vs CrewAI vs Custom :**

| Critère | LangGraph | CrewAI | Custom Python |
|---|---|---|---|
| Spawn dynamique | Via `Send()` API | `Agent()` instanciation | Total contrôle |
| Templates | Nodes réutilisables | `Agent` configs | Dataclasses |
| Registry | State graph | Crew internal | Dict custom |
| Rate limiting | Manuel | Manuel | Manuel |
| Lifecycle | Graph states | Task lifecycle | Manuel |

## Anti-patterns

- **Spawn sans limite** — Ne jamais créer des agents sans plafond de concurrence. Un burst de 100 agents simultanés peut saturer les quotas API et exploser le budget en quelques secondes.
- **Pas de cleanup** — Les agents qui restent en état `running` sans surveillance consomment des ressources et polluent le registre. Toujours implémenter un timeout et un garbage collector.
- **Agents orphelins** — Spawner un agent sans référence au parent empêche la remontée des résultats et le suivi des erreurs. Toujours passer `parent_id` au moment du spawn.
- **Recréer au lieu de réutiliser** — Spawner un nouvel agent pour chaque micro-tâche est inefficace. Préférer la réutilisation via un pool (voir `agent-pool-manager`) quand les agents sont identiques.

## Règles

1. **Tout agent spawné doit avoir un identifiant unique** (UUID) enregistré dans le registre central dès sa création, avec référence au parent.
2. **Le resource budget doit être défini avant le spawn** — modèle, max_tokens, timeout et tools sont immuables après instanciation.
3. **Enforcer un plafond de concurrence** — `max_concurrent_agents` doit être configuré explicitement ; ne jamais le laisser à l'infini.
4. **Le lifecycle complet doit être loggé** — chaque transition d'état (create → running → done/failed → terminated) doit être tracée avec timestamp.
5. **Fournir des templates pour toutes les spécialisations courantes** — ne pas hardcoder les configurations ; utiliser le pattern Factory pour permettre l'extension sans modification du code core.


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
