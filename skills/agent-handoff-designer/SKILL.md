---
name: agent-handoff-designer
description: Design de handoffs fluides entre agents — transfert de contexte, d'état et de responsabilité. Se déclenche avec "handoff", "transfert agent", "agent handoff", "passer la main", "relay agent", "agent transition", "changement d'agent", "routing entre agents".
---

# Agent Handoff Designer

## Quand utiliser ce skill
Utilise ce skill lorsqu'un agent doit transférer la responsabilité d'une tâche ou d'une conversation à un autre agent spécialisé. Cela s'applique aux cas de routing basé sur les capacités (un agent généraliste délègue à un spécialiste), d'escalade (transfert vers un agent de niveau supérieur ou vers un humain), et de chaînes de traitement (pipeline A → B → C). L'objectif est que l'utilisateur et le système ne perçoivent aucune rupture.

## Workflow

1. **Identifier quand déclencher un handoff** — Quatre situations justifient un handoff : **capability boundary** (l'agent courant n'a pas les outils ou la connaissance pour continuer), **spécialisation** (un autre agent est optimisé pour cette sous-tâche), **escalation** (la complexité ou le risque dépasse le seuil de l'agent courant), **load balancing** (l'agent courant est saturé). Définis des règles explicites (`intent_router.yaml` ou fonction Python) pour chaque condition.

```python
from enum import Enum

class HandoffReason(Enum):
    CAPABILITY_BOUNDARY = "capability_boundary"
    SPECIALIZATION = "specialization"
    ESCALATION = "escalation"
    LOAD_BALANCING = "load_balancing"

def should_handoff(agent_id: str, task: dict, agent_capabilities: dict) -> tuple[bool, HandoffReason | None]:
    required_caps = task.get("required_capabilities", [])
    available_caps = agent_capabilities.get(agent_id, [])
    missing = [c for c in required_caps if c not in available_caps]
    if missing:
        return True, HandoffReason.CAPABILITY_BOUNDARY
    if task.get("risk_level", 0) > 7:
        return True, HandoffReason.ESCALATION
    return False, None
```

2. **Packager le contexte** — Avant le handoff, l'agent émetteur doit synthétiser : un **résumé de la conversation** (5–10 phrases max), les **faits clés extraits** (entités nommées, valeurs critiques, décisions prises), l'**intent utilisateur** reformulé, les **entités** (noms, dates, montants, références), le **progrès accompli** (pourcentage, étapes terminées), et les **contraintes ou préférences utilisateur** détectées. Limite la taille du context package à 2 000 tokens pour ne pas surcharger l'agent récepteur.

3. **Transférer l'état** — Le state transfer doit inclure : l'historique conversationnel résumé (pas le transcript complet), les données extraites structurées, la progression de la tâche (`task_progress: {"step": 3, "total": 7, "completed": ["collect_info", "validate"]}`), les préférences utilisateur détectées et les variables de contexte techniques (IDs de session, références externes). Stocke ces données dans un state store partagé référencé par un `context_ref`.

```python
from dataclasses import dataclass, field
from typing import Any

@dataclass
class HandoffContext:
    conversation_summary: str
    key_facts: dict[str, Any]
    user_intent: str
    entities: dict[str, Any]
    task_progress: dict[str, Any]
    user_preferences: dict[str, Any]
    context_ref: str  # clé dans le state store partagé
    handoff_reason: str
    source_agent: str
    target_agent: str

def package_context(conversation_history: list, agent_id: str) -> HandoffContext:
    # Appel LLM pour résumer et extraire les faits clés
    summary = summarize_conversation(conversation_history)
    facts = extract_key_facts(conversation_history)
    return HandoffContext(
        conversation_summary=summary,
        key_facts=facts,
        user_intent=detect_intent(conversation_history),
        entities=extract_entities(conversation_history),
        task_progress={},
        user_preferences={},
        context_ref=store_context(conversation_history),
        handoff_reason="",
        source_agent=agent_id,
        target_agent=""
    )
```

4. **Exécuter le protocole de handoff** — Séquence en 4 étapes : **(a)** notifier l'agent cible avec le context package, **(b)** attendre la confirmation de readiness (ACK avec `ready: true`), **(c)** effectuer le switch (l'agent émetteur passe en mode `inactive` ou `standby`), **(d)** confirmer le handoff complété à l'orchestrateur. Ne jamais switcher sans avoir reçu le `ready` de l'agent cible. Timeout recommandé : 5 secondes, puis fallback.

5. **Assurer une UX transparente** — L'utilisateur ne doit pas répéter ce qu'il a déjà dit. L'agent récepteur doit **s'introduire brièvement** ("Je prends en charge votre demande depuis [Agent A]..."), **démontrer qu'il a le contexte** en reprenant un fait clé, et **ne pas poser de questions déjà répondues**. Si une info manque, précise pourquoi elle est nécessaire. Génère un message de transition optionnel côté UI : "Transfert vers le spécialiste X en cours…"

6. **Gérer l'échec du handoff** — Si l'agent cible ne répond pas dans le timeout : **(a) retry** une fois après 2 secondes, **(b) alternative agent** si un agent de même capacité est disponible, **(c) return to sender** : l'agent original reprend la main avec une capacité dégradée, **(d) human escalation** : créer un ticket de support avec le contexte complet. Log chaque tentative échouée avec horodatage et raison.

```python
import asyncio

async def execute_handoff(source_agent, target_agent_id: str, context: HandoffContext, timeout: float = 5.0):
    try:
        ack = await asyncio.wait_for(
            target_agent.notify_handoff(context),
            timeout=timeout
        )
        if ack.get("ready"):
            source_agent.set_state("standby")
            return {"success": True, "target": target_agent_id}
    except asyncio.TimeoutError:
        pass
    # Fallback
    alternative = find_alternative_agent(target_agent_id)
    if alternative:
        return await execute_handoff(source_agent, alternative, context, timeout)
    source_agent.set_state("active")  # Return to sender
    return {"success": False, "reason": "target_unavailable"}
```

7. **Gérer les chaînes multi-hop** — Dans une chaîne A → B → C, chaque étape doit : **incrémenter un compteur de hops** (bloquer si `hop_count > MAX_HOPS`, recommandé : 5), **accumuler les résumés** de chaque agent (pas re-résumer indéfiniment), **maintenir le `correlation_id` original**, et **tracker la chaîne** dans un `handoff_chain: ["agent_A", "agent_B"]`. Préviens la dégradation du contexte en stockant les snapshots à chaque hop dans le state store.

8. **Implémenter le routing conditionnel** — Définis les règles de handoff dans une table de routing : si `intent == "billing"` → `billing_agent`, si `sentiment_score < 0.3` → `escalation_agent`, si `language == "ar"` → `arabic_specialist`. Implémente ce routing engine comme une fonction pure testable. Dans LangGraph, utilise les conditional edges. Dans CrewAI, utilise les `Task` routing conditions.

```python
ROUTING_RULES = [
    {"condition": lambda ctx: ctx["intent"] == "billing", "target": "billing_agent"},
    {"condition": lambda ctx: ctx.get("sentiment_score", 1.0) < 0.3, "target": "escalation_agent"},
    {"condition": lambda ctx: ctx.get("complexity_score", 0) > 8, "target": "senior_agent"},
]

def route_handoff(context: dict) -> str:
    for rule in ROUTING_RULES:
        if rule["condition"](context):
            return rule["target"]
    return "default_agent"
```

9. **Mesurer la qualité des handoffs** — Métriques essentielles : **fréquence** (handoffs/heure, par agent source), **taux de succès** (handoffs sans retry / total), **context loss score** (évaluation LLM de la qualité du contexte transféré, 0–1), **satisfaction utilisateur post-handoff** (feedback implicite via task completion rate), **temps moyen de transition** (délai entre fin agent A et premier message agent B).

10. **Implémenter selon le framework** — **LangGraph** : utilise `Command(goto="target_node")` avec le state mis à jour. **OpenAI Assistants** : `client.beta.threads.runs.cancel()` + nouveau run sur un autre assistant avec le thread partagé. **CrewAI** : délégation via `Agent.delegate()`. **AutoGen** : `GroupChatManager` avec `speaker_selection_method="auto"`. **Custom** : implémente un `HandoffOrchestrator` qui gère le cycle de vie complet.

## Anti-patterns

- **Perdre le contexte au handoff** — Transférer uniquement l'intent sans les faits clés force l'utilisateur à tout répéter. Packager toujours un contexte structuré complet avant le handoff.
- **Boucle de handoff infinie (A→B→A)** — Sans limite de hops ni détection de cycles, deux agents peuvent se renvoyer la tâche indéfiniment. Implémente `max_hops` et une vérification de la `handoff_chain` pour détecter les cycles.
- **Handoff sans confirmation de readiness** — Switcher vers un agent cible qui n'est pas disponible ou pas prêt provoque des messages perdus. Toujours attendre l'ACK `ready: true` avant le switch.
- **Forcer l'utilisateur à répéter** — Si l'agent récepteur pose des questions déjà répondues, l'expérience utilisateur est dégradée et la confiance dans le système est perdue. Vérifier le contexte reçu avant de générer la première réponse.

## Règles

1. **Le contexte package est obligatoire** — Aucun handoff ne peut s'effectuer sans un `HandoffContext` valide. Même pour un handoff simple, le résumé et l'intent sont le minimum requis.
2. **Confirmation avant switch** — L'agent émetteur ne passe jamais en mode `inactive` sans avoir reçu le `ready: true` de l'agent cible dans le délai imparti.
3. **Max hops = 5 par défaut** — Toute chaîne de handoff dépassant 5 étapes doit être interrompue et escaladée vers un superviseur ou un humain.
4. **Documente les trade-offs** — Un handoff rapide (contexte minimal) réduit la latence mais augmente le risque de context loss. Un handoff complet (contexte riche) est plus fiable mais plus lent. Choisis explicitement selon le SLA.
5. **Adapte au framework utilisateur** — LangGraph, CrewAI, AutoGen et les architectures custom ont chacun leurs primitives de handoff. Utilise les patterns natifs du framework pour réduire la complexité.
