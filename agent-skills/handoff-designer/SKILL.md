---
name: handoff-designer
description: Design de handoffs fluides entre agents — transfert de contexte, d'état et de responsabilité. Se déclenche avec "handoff", "transfert agent", "agent handoff", "passer la main", "relay agent", "agent transition", "changement d'agent", "routing entre agents". Also triggers on "transfer context between agents", "agent escalation flow".
---

# Agent Handoff Designer

## Quand utiliser ce skill

Un handoff est nécessaire dans quatre situations :

| Situation | Signal | Agent cible |
|---|---|---|
| **Capability boundary** | Outil ou connaissance manquant | Spécialiste équipé |
| **Spécialisation** | Sous-tâche mieux traitée ailleurs | Agent optimisé |
| **Escalation** | Risque ou complexité dépassant le seuil | Agent senior / humain |
| **Load balancing** | Queue saturée | Instance parallèle |

Décision : si l'agent courant peut compléter la tâche avec une qualité ≥ 80 % sans outil supplémentaire, **ne pas handoff** — le coût de transition n'est pas justifié.

---

## Workflow en étapes

### 1. Évaluer le déclenchement

```python
from enum import Enum

class HandoffReason(Enum):
    CAPABILITY_BOUNDARY = "capability_boundary"
    SPECIALIZATION      = "specialization"
    ESCALATION          = "escalation"
    LOAD_BALANCING      = "load_balancing"

def should_handoff(task: dict, agent_caps: list[str]) -> tuple[bool, HandoffReason | None]:
    missing = [c for c in task.get("required_capabilities", []) if c not in agent_caps]
    if missing:
        return True, HandoffReason.CAPABILITY_BOUNDARY
    if task.get("risk_level", 0) > 7:
        return True, HandoffReason.ESCALATION
    return False, None
```

Critères de seuil recommandés : `risk_level > 7`, `complexity_score > 8`, `sentiment_score < 0.3`.

---

### 2. Packager le contexte (≤ 2 000 tokens)

Contenu obligatoire du `HandoffContext` :

```python
from dataclasses import dataclass, field
from typing import Any
import uuid

@dataclass
class HandoffContext:
    correlation_id: str          # inchangé sur toute la chaîne
    source_agent: str
    target_agent: str
    handoff_reason: str
    conversation_summary: str    # 5–10 phrases max
    user_intent: str             # reformulé explicitement
    key_facts: dict[str, Any]    # entités, montants, références
    task_progress: dict          # {"step": 3, "total": 7, "completed": [...]}
    user_preferences: dict       # langue, ton, contraintes détectées
    context_ref: str             # clé du snapshot complet dans le state store
    hop_count: int = 0
    handoff_chain: list[str] = field(default_factory=list)

def package_context(history: list, source: str, target: str, reason: str) -> HandoffContext:
    summary  = summarize_conversation(history)     # appel LLM interne
    facts    = extract_key_facts(history)
    ref      = store_context_snapshot(history)     # Redis / DynamoDB / mémoire partagée
    return HandoffContext(
        correlation_id=str(uuid.uuid4()),
        source_agent=source, target_agent=target,
        handoff_reason=reason,
        conversation_summary=summary,
        user_intent=detect_intent(history),
        key_facts=facts,
        task_progress={},
        user_preferences={},
        context_ref=ref,
        handoff_chain=[source],
    )
```

**Règle de taille** : résumé + faits = max 2 000 tokens. Le transcript complet va dans le state store, pas dans le package.

---

### 3. Exécuter le protocole (avec ACK obligatoire)

```python
import asyncio

MAX_HOPS     = 5
TIMEOUT_S    = 5.0
RETRY_DELAY  = 2.0

async def execute_handoff(
    source_agent,
    target_agent,
    ctx: HandoffContext,
) -> dict:
    # Garde anti-boucle
    if ctx.hop_count >= MAX_HOPS:
        return {"success": False, "reason": "max_hops_exceeded"}
    if target_agent.id in ctx.handoff_chain:
        return {"success": False, "reason": "cycle_detected"}

    ctx.hop_count += 1
    ctx.handoff_chain.append(target_agent.id)

    for attempt in range(2):            # 1 essai + 1 retry
        try:
            ack = await asyncio.wait_for(
                target_agent.notify_handoff(ctx), timeout=TIMEOUT_S
            )
            if ack.get("ready"):
                source_agent.set_state("standby")
                return {"success": True, "target": target_agent.id}
        except asyncio.TimeoutError:
            if attempt == 0:
                await asyncio.sleep(RETRY_DELAY)

    # Fallback hiérarchique
    alt = find_alternative_agent(target_agent.id)
    if alt:
        return await execute_handoff(source_agent, alt, ctx)

    source_agent.set_state("active")    # return-to-sender
    return {"success": False, "reason": "target_unavailable"}
```

Séquence obligatoire : **notify → ACK ready → switch source → confirm orchestrateur**. Ne jamais passer en `standby` sans ACK.

---

### 4. Routing conditionnel

Définis les règles dans une table pure (testable unitairement) :

```python
ROUTING_RULES = [
    {"cond": lambda c: c.get("intent") == "billing",        "target": "billing_agent"},
    {"cond": lambda c: c.get("sentiment_score", 1.0) < 0.3, "target": "escalation_agent"},
    {"cond": lambda c: c.get("complexity_score", 0) > 8,    "target": "senior_agent"},
    {"cond": lambda c: c.get("language") == "ar",           "target": "arabic_specialist"},
]

def route_handoff(context: dict) -> str:
    for rule in ROUTING_RULES:
        if rule["cond"](context):
            return rule["target"]
    return "default_agent"
```

**LangGraph (2026)** — utilise `Command(goto="node", update={...})` dans le nœud source :

```python
from langgraph.types import Command

def billing_router(state):
    if state["intent"] == "billing":
        return Command(goto="billing_node", update={"ctx": package_context(...)})
    return Command(goto="default_node")
```

**OpenAI Assistants** — partage le `thread_id`, annule le run courant, démarre un run sur l'assistant cible :

```python
client.beta.threads.runs.cancel(thread_id=tid, run_id=rid)
new_run = client.beta.threads.runs.create(thread_id=tid, assistant_id=TARGET_ASST_ID)
```

**CrewAI** — `Agent.delegate(task, agent=target_agent)` + inject le contexte dans la description de la tâche.

**Google A2A (2026)** — expose un `AgentCard` avec `capabilities`, envoie un `Task` JSON via POST `/tasks/send` avec `metadata.handoff_context`.

---

### 5. UX transparente côté utilisateur

L'agent récepteur doit **toujours** :

1. S'introduire brièvement : _"Je prends en charge votre demande depuis [Agent A]."_
2. Démontrer le contexte : _"Je vois que vous recherchez une facture pour le mois de mars…"_
3. Ne pas reposer une question déjà répondue — vérifier `key_facts` avant toute question.
4. Si une info manque, expliquer pourquoi : _"J'ai besoin de votre numéro client car il n'est pas encore dans le dossier."_

Message de transition UI (optionnel) :

```json
{ "type": "system_event", "event": "handoff_started",
  "message": "Transfert vers le spécialiste Facturation en cours…",
  "target_agent": "billing_agent" }
```

---

### 6. Chaînes multi-hop

À chaque hop :
- Incrémenter `hop_count`, bloquer si `>= MAX_HOPS`.
- **Accumuler** les résumés (pas re-résumer le résumé — perte de signal garanti).
- Conserver le `correlation_id` original pour le tracing distribué.
- Stocker un snapshot immutable dans le state store (`ctx_snap_{hop}.json`).

```python
def accumulate_summary(existing: str, new_segment: str) -> str:
    # Concatène avec séparateur de hop — ne pas re-résumer
    return f"{existing}\n---hop---\n{new_segment}"
```

---

### 7. Métriques à suivre

| Métrique | Calcul | Seuil alerte |
|---|---|---|
| Taux de succès | handoffs réussis / total | < 95 % |
| Context loss score | éval LLM du contexte reçu (0–1) | < 0.8 |
| Latence de transition | fin agent A → 1er message agent B | > 3 s |
| Fréquence de retry | retries / total handoffs | > 10 % |
| Task completion post-handoff | tâches complétées après handoff | < 80 % |

---

## Garde-fous et anti-patterns

**Boucle infinie (A → B → A)** — Sans détection de cycle, deux agents se renvoient la tâche indéfiniment. Fix : vérifier `target in handoff_chain` avant d'exécuter.

**Handoff sans ACK** — Switcher l'agent source avant que la cible soit prête provoque des messages perdus. Fix : ACK `ready: true` obligatoire, sinon fallback.

**Contexte tronqué à l'intent seul** — L'agent récepteur ne sait pas ce qui a déjà été répondu et refait les mêmes questions. Fix : packager `key_facts` + `task_progress` systématiquement.

**Re-résumer le résumé à chaque hop** — Chaque compression successive perd de l'information jusqu'à rendre le contexte inutilisable. Fix : accumulation par concaténation, re-résumé seulement au hop 1.

**Handoff silencieux sans fallback** — Si la cible ne répond pas et qu'il n'y a pas de return-to-sender, la tâche est perdue. Fix : toujours implémenter le chemin `return-to-sender` comme dernier recours.

**Over-handoff** — Créer des handoffs pour chaque micro-tâche gonfle la latence et le bruit de logs. Fix : handoff seulement si la tâche ne peut pas être complétée à ≥ 80 % par l'agent courant.

**Contexte package > 2 000 tokens** — Surcharger l'agent récepteur ralentit son inference et noie les faits clés. Fix : le transcript complet va dans le state store, le package ne contient que le résumé structuré.

---

## Règles non-négociables

1. **HandoffContext obligatoire** — Aucun handoff sans résumé + intent + key_facts, même minimal.
2. **ACK avant switch** — Source reste `active` jusqu'à réception du `ready: true`.
3. **MAX_HOPS = 5** — Au-delà : escalade superviseur ou humain, jamais de boucle supplémentaire.
4. **correlation_id inchangé** — Permet le tracing end-to-end sur toute la chaîne.
5. **Documente le trade-off** — Contexte minimal = latence réduite, risque context loss élevé. Contexte riche = fiabilité élevée, latence +. Choix explicite selon le SLA.
