---
name: agent-spawner
description: Création dynamique de sous-agents à la volée avec configuration, lifecycle management et resource allocation. Se déclenche avec "spawner", "créer agent dynamiquement", "spawn agent", "agent factory", "agent dynamique", "instancier agent", "agent à la volée", "dynamic agent creation". Also triggers on "spawn subagents", "create agents on the fly".
---

# Agent Spawner

## Quand utiliser ce skill

| Condition | Spawner requis ? |
|---|---|
| Nombre d'agents inconnu à l'avance | Oui |
| Agents identiques, volume variable | Oui (+ pool-manager) |
| Agents fixes et connus en design-time | Non — câbler statiquement |
| Besoin de parallélisme homogène | Préférer `agent-pool-manager` |
| Types d'agents différents selon le contexte | Oui |

## Workflow en étapes

### 1. Concevoir les templates d'agents

Chaque template encode une spécialisation. Définir au minimum :

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class AgentTemplate:
    name: str                          # identifiant du gabarit
    system_prompt: str                 # supporte les placeholders {domain}, {task}…
    tools: list[str]                   # liste des tools autorisés
    model: str = "claude-sonnet-4-5"   # modèle par défaut
    max_tokens: int = 4096
    timeout_seconds: int = 120
```

Exemples de templates courants :
- `researcher` — `search_web`, `fetch_url`, modèle léger (haiku)
- `coder` — `bash`, `read_file`, `write_file`, modèle puissant (sonnet/opus)
- `reviewer` — lecture seule, modèle sonnet
- `summarizer` — aucun tool, haiku suffit

### 2. Critères de décision : quel modèle choisir ?

| Criticité / Complexité | Modèle recommandé |
|---|---|
| Analyse simple, résumé | `claude-haiku-4` |
| Tâche de code standard | `claude-sonnet-4-5` |
| Raisonnement multi-étapes, debugging | `claude-opus-4` |
| Réponses temps-réel < 2 s | `claude-haiku-4` |

Règle : **ne jamais utiliser opus pour les agents répétitifs à fort volume** — le coût est 10–20× celui de haiku.

### 3. Implémenter la factory

```python
import uuid
from datetime import datetime, timezone

@dataclass
class AgentInstance:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    template_name: str = ""
    status: str = "created"   # created | running | done | failed | terminated
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    parent_id: Optional[str] = None
    result: Optional[str] = None
    error: Optional[str] = None

class AgentFactory:
    _templates: dict[str, AgentTemplate] = {}
    _registry: dict[str, AgentInstance] = {}
    _max_concurrent: int = 10

    @classmethod
    def register_template(cls, t: AgentTemplate) -> None:
        cls._templates[t.name] = t

    @classmethod
    def spawn(cls, template_name: str, context: dict, parent_id: str | None = None) -> AgentInstance:
        running = sum(1 for a in cls._registry.values() if a.status == "running")
        if running >= cls._max_concurrent:
            raise RuntimeError(f"Limite {cls._max_concurrent} agents concurrents atteinte")

        tpl = cls._templates[template_name]
        agent = AgentInstance(template_name=template_name, parent_id=parent_id)
        cls._registry[agent.id] = agent

        enriched_prompt = tpl.system_prompt.format(**context)
        agent.status = "running"
        print(f"[SPAWN] {agent.id} ({template_name}) parent={parent_id} at {agent.created_at.isoformat()}")
        return agent

    @classmethod
    def terminate(cls, agent_id: str, result: str | None = None, error: str | None = None) -> None:
        if a := cls._registry.get(agent_id):
            a.status = "failed" if error else "terminated"
            a.result, a.error = result, error

    @classmethod
    def gc(cls, timeout_s: int = 300) -> list[str]:
        """Libère les agents bloqués en 'running' depuis trop longtemps."""
        now = datetime.now(timezone.utc)
        stale = [
            a.id for a in cls._registry.values()
            if a.status == "running" and (now - a.created_at).total_seconds() > timeout_s
        ]
        for aid in stale:
            cls.terminate(aid, error="GC timeout")
        return stale

    @classmethod
    def active(cls) -> list[AgentInstance]:
        return [a for a in cls._registry.values() if a.status == "running"]
```

### 4. Utilisation concrète

```python
# Enregistrer les templates une seule fois au démarrage
AgentFactory.register_template(AgentTemplate(
    name="researcher",
    system_prompt="Expert en {domain}. Analyse : {task}",
    tools=["search_web", "fetch_url"],
    model="claude-haiku-4",
))

AgentFactory.register_template(AgentTemplate(
    name="coder",
    system_prompt="Tu codes en {language}. Tâche : {task}",
    tools=["bash", "read_file", "write_file"],
    model="claude-sonnet-4-5",
    timeout_seconds=300,
))

# Spawn depuis un orchestrateur
parent_id = "orchestrator-001"

r = AgentFactory.spawn("researcher", {"domain": "finance", "task": "analyse Q1 2026"}, parent_id)
c = AgentFactory.spawn("coder",      {"language": "Python", "task": "générer rapport PDF"}, parent_id)

# ... exécution asynchrone ...

AgentFactory.terminate(r.id, result="Données collectées")
AgentFactory.terminate(c.id, result="rapport.pdf généré")

# Nettoyage périodique
stale = AgentFactory.gc(timeout_s=180)
print(f"Agents nettoyés par GC : {stale}")
```

### 5. Agent registry — schéma minimal

```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "template":  "researcher",
  "parent_id": "orchestrator-001",
  "status":    "running",
  "created_at":"2026-06-24T10:00:00Z",
  "model":     "claude-haiku-4",
  "tools":     ["search_web", "fetch_url"],
  "result":    null,
  "error":     null
}
```

Stocker en mémoire pour les sessions courtes ; Redis ou un store distribué pour la production.

### 6. Lifecycle et logging

```
create → initialize → running → done/failed → terminated
```

Chaque transition doit émettre un événement structuré (JSON) :

```json
{"event":"SPAWN","agent_id":"…","template":"coder","ts":"2026-06-24T10:01:00Z"}
{"event":"TERMINATE","agent_id":"…","status":"done","duration_s":42,"ts":"…"}
{"event":"GC","agent_id":"…","reason":"timeout","ts":"…"}
```

### 7. Rate limiting et quotas

- Fixer `max_concurrent` **avant** le premier spawn (jamais illimité).
- Implémenter une file d'attente si le plafond est atteint plutôt que de lever une exception sèche en production.
- Surveiller le budget cumulé : `total_tokens_used` par session.

```python
from collections import deque

class BoundedFactory(AgentFactory):
    _queue: deque = deque()

    @classmethod
    def spawn_or_queue(cls, template_name, context, parent_id=None):
        try:
            return cls.spawn(template_name, context, parent_id)
        except RuntimeError:
            cls._queue.append((template_name, context, parent_id))
            print(f"[QUEUE] En attente — {len(cls._queue)} tâches en file")
            return None
```

## Architecture

```
Parent Agent
    │
    ▼
AgentFactory
┌─────────────────────────────────┐
│  Templates Registry             │
│  [researcher] [coder] [reviewer]│
└────────────┬────────────────────┘
             │ spawn(template, context, parent_id)
             ▼
Agent Registry (UUID → AgentInstance)
┌──────────┬──────────┬──────────┐
│ Agent A  │ Agent B  │ Agent C  │
│ running  │ done     │ running  │
└──────────┴──────────┴──────────┘
             │
             ├─ Rate Limiter (max_concurrent)
             ├─ GC (timeout → terminated)
             └─ Logger (events JSON)
```

## Anti-patterns / pièges

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Spawn illimité | Quota API explosé en secondes | `max_concurrent` obligatoire |
| Pas de `parent_id` | Agents orphelins, résultats perdus | Toujours passer le parent |
| Pas de GC | Registre pollué, faux "running" | `gc()` périodique (cron ou après chaque batch) |
| Opus pour tous les agents | Coût ×15 inutile | Haiku pour tâches simples, Sonnet par défaut |
| Recréer au lieu de réutiliser | Overhead de warm-up | Pooling si agents homogènes (voir `agent-pool-manager`) |
| Timeout absent | Agent bloqué indéfiniment | `timeout_seconds` dans chaque template |
| Contexte non validé avant spawn | `KeyError` au format du prompt | Valider les clés du context avant `.spawn()` |

## Bonnes pratiques 2026

1. **Immutabilité après spawn** — modèle, tools et timeout sont figés à la création ; ne jamais les modifier en cours d'exécution.
2. **Un UUID par agent, lié au parent** — indispensable pour le tracing distribué (OpenTelemetry, Langfuse…).
3. **Templates versionnés** — nommer les templates avec une version (`researcher_v2`) pour permettre le rollback sans downtime.
4. **Graceful shutdown** — à l'arrêt du système, drainer la file et attendre `done/failed` sur tous les agents `running` avant de couper.
5. **Séparation registre / exécution** — le registre ne doit jamais contenir la logique métier ; il est un index de statuts.
6. **Tests de charge** — simuler le burst (N spawns simultanés) avant la mise en production pour calibrer `max_concurrent` et le timeout GC.


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
