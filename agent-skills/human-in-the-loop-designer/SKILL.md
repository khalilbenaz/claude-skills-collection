---
name: human-in-the-loop-designer
description: Design de systèmes human-in-the-loop pour agents IA avec approbation, correction et escalade. Se déclenche avec "human in the loop", "HITL", "approbation humaine", "validation humaine", "escalade agent", "agent supervisé", "intervention humaine", "approval workflow".
---

# Human-in-the-Loop Designer

## Quand utiliser ce skill

Intègre un point de contrôle humain dès qu'une action de l'agent est :
- **Irréversible** : suppression de données, envoi d'email, paiement, déploiement en production
- **Coûteuse** : action dont le coût de correction dépasse le coût de la validation
- **Réglementairement obligatoire** : conformité financière, médicale, légale
- **Hors-distribution** : tâche inédite ou contexte jamais rencontré par l'agent
- **À faible confiance** : score de confiance de l'agent sous le seuil calibré

## Étape 1 — Cartographier les points de décision

Parcours le workflow de l'agent, identifie chaque nœud d'action, et classe-le :

| Catégorie | Exemples | Mode HITL recommandé |
|-----------|----------|----------------------|
| Irréversible + haut risque | Suppression DB, virement, envoi en masse | `approval gate` systématique |
| Réversible + impact modéré | Brouillon d'email, mise à jour de ticket | `exception escalation` (si doute) |
| Basse criticité, haute fréquence | Catégorisation, tagging, résumé | `shadow mode` puis autonomie progressive |
| Obligation légale | Signature, validation KYC | `approval gate` systématique + audit trail |

## Étape 2 — Choisir le pattern HITL

### `approval gate` — bloquer jusqu'à approbation explicite
```python
# LangGraph interrupt pattern (SDK 0.2+)
from langgraph.types import interrupt, Command

def human_approval_node(state: AgentState):
    payload = {
        "action": state["proposed_action"],
        "context": state["context"],
        "risk_level": state["risk_level"],
        "estimated_impact": state["impact_summary"],
    }
    decision = interrupt(payload)  # suspend le graph, reprend après résumption
    if decision["approved"]:
        return {"approved_action": state["proposed_action"]}
    return {"approved_action": decision.get("correction", "__abort__")}
```

### `confidence threshold` — escalade automatique selon le score
```python
HIGH_RISK_THRESHOLD = 0.7   # ex : coût normalisé 0..1
CONFIDENCE_THRESHOLD = 0.82  # calibrer empiriquement

def should_escalate(task: Task, confidence: float) -> bool:
    risk = task.estimated_cost_normalized * (1 - task.reversibility)
    return risk > HIGH_RISK_THRESHOLD or confidence < CONFIDENCE_THRESHOLD
```

### `correction loop` — l'agent propose, l'humain corrige, l'agent continue
```python
def apply_human_correction(agent_output: str, correction: str, task_id: str) -> str:
    feedback_store.save({
        "task_id": task_id,
        "agent_output": agent_output,
        "human_correction": correction,
        "ts": datetime.utcnow().isoformat(),
    })
    return correction  # l'agent continue avec la version validée
```

### `exception escalation` — l'agent agit seul, escalade uniquement sur cas limite
```python
try:
    result = agent.execute(task)
except UncertaintyException as e:
    notify_human(task, e.reason)
    result = await wait_for_human_decision(task.id, timeout_s=3600)
```

### `shadow mode` — recommandation sans exécution, pour établir la confiance
```python
if phase == "shadow":
    log_recommendation(agent_output)
    return human_decides(task)   # humain garde la main
elif phase == "supervised":
    return approval_gate(agent_output)
else:
    return agent_output          # autonomie établie
```

## Étape 3 — Concevoir l'UX de validation

Règle d'or : **l'humain ne doit pas chercher l'information, elle doit lui être livrée**.

Structure d'une notification HITL minimale :
```
[HITL] Action requérant approbation
Agent       : payment-agent v2.1
Action      : Virement 4 850 € → IBAN FR76...3421
Déclencheur : Facture #INV-2026-0789 (PDF joint)
Risque      : ÉLEVÉ — irréversible sous 10 min
Contexte    : Client Acme Corp, contrat C-4421 actif
Impact      : Solde après opération : 12 340 €

[Approuver ✓]  [Corriger ✎]  [Rejeter ✗]
Expire dans : 47 min
```

Checklist UX :
- [ ] Diff view pour les modifications (avant / après)
- [ ] Résumé de l'impact en une phrase
- [ ] Bouton "Annuler" si une action a déjà été partiellement exécutée
- [ ] Compte à rebours visible (SLA)
- [ ] Champ commentaire libre pour le rejet (alimente le feedback)

## Étape 4 — Implémenter le canal d'approbation

### Slack (boutons interactifs)
```python
# Utilise slack_sdk + Block Kit
blocks = [
    {"type": "section", "text": {"type": "mrkdwn", "text": f"*Action* : {action_summary}"}},
    {"type": "actions", "elements": [
        {"type": "button", "text": {"type": "plain_text", "text": "Approuver"}, "value": "approve", "style": "primary"},
        {"type": "button", "text": {"type": "plain_text", "text": "Rejeter"}, "value": "reject", "style": "danger"},
    ]},
]
client.chat_postMessage(channel=APPROVER_CHANNEL, blocks=blocks, text=action_summary)
```

### Email (lien magique one-time)
```python
token = secrets.token_urlsafe(32)
redis.setex(f"hitl:{token}", 3600, json.dumps({"task_id": task_id, "action": action}))
approve_url = f"https://app.example.com/hitl/approve?token={token}"
reject_url  = f"https://app.example.com/hitl/reject?token={token}"
send_email(approver_email, subject="[Action requise]", body=render_template(approve_url, reject_url))
```

### Webhook callback (approche API-first)
```python
# L'agent POST une demande et attend un callback
response = requests.post("/api/hitl/requests", json={
    "task_id": task_id, "action": action, "callback_url": f"{BASE_URL}/resume/{task_id}"
})
# Le endpoint /resume/{task_id} reprend le graph suspendu
```

## Étape 5 — Gérer la dégradation et les timeouts

```python
async def wait_for_decision(task_id: str, timeout_s: int = 1800) -> Decision:
    try:
        return await asyncio.wait_for(decision_queue.get(task_id), timeout=timeout_s)
    except asyncio.TimeoutError:
        match TIMEOUT_POLICY:
            case "safe_default":  return Decision(approved=False, reason="timeout")
            case "escalate_up":   return await notify_supervisor(task_id)
            case "abort":         raise AgentAbortError(f"HITL timeout for {task_id}")
```

Politiques de timeout recommandées selon l'urgence :

| Urgence | Timeout | Politique |
|---------|---------|-----------|
| Critique (paiement) | 30 min | `escalate_up` |
| Modérée (email) | 4 h | `safe_default` (ne pas envoyer) |
| Faible (rapport) | 24 h | `abort` + log |

## Étape 6 — Audit trail

Chaque décision HITL doit produire un enregistrement **immuable** :
```python
@dataclass
class HITLAuditRecord:
    task_id: str
    agent_version: str
    proposed_action: str
    decision: Literal["approved", "rejected", "corrected", "timeout"]
    corrected_action: str | None
    approver_id: str
    approver_comment: str | None
    ts_requested: datetime
    ts_decided: datetime
    workflow_outcome: str   # ce qui s'est passé ensuite
```

Stocke dans un log append-only (ex : fichier JSONL, table SQL INSERT-only, Kafka topic).

## Étape 7 — Métriques et calibration continue

| Métrique | Formule | Signal d'alerte |
|----------|---------|-----------------|
| `approval_rate` | approbations / total | < 70 % → agent se dégrade |
| `correction_rate` | corrections / escalades | > 30 % → seuils trop bas |
| `escalation_rate` | escalades / actions totales | > 20 % → faux positifs, coût humain élevé |
| `human_response_time` | médiane ts_decided - ts_requested | > SLA → revoir le canal |
| `false_positive_rate` | escalades approuvées sans correction | > 50 % → relâcher les seuils |

Automatise un rapport hebdomadaire pour calibrer les seuils `CONFIDENCE_THRESHOLD` et `HIGH_RISK_THRESHOLD`.

## Anti-patterns et pièges

- **Approbation sans contexte** : demander "Approuver ?" sans résumé génère des clics aveugles et annule l'intérêt du HITL. Toujours fournir action + impact + lien de contexte.
- **HITL synchrone bloquant le thread principal** : en production, le graph doit être suspendu et sérialisé (ex : Redis, DB) — ne jamais bloquer un thread avec un `sleep` ou `input()`.
- **Pas de chemin de refus** : teste systématiquement le scénario "l'humain rejette" — le workflow doit être aussi robuste que le cas nominal.
- **Notifications sans SLA** : sans timeout explicite et politique de dégradation, une approbation non répondue bloque indéfiniment le workflow.
- **Boucle fermée sans apprentissage** : logguer sans jamais relire les corrections ne sert à rien ; planifie une revue mensuelle des corrections pour affiner les prompts ou les seuils.
- **Escalader trop tôt** : un HITL sur chaque action tue l'autonomie et épuise les humains ; commence conservateur, puis relâche progressivement à mesure que la confiance s'établit.
- **Un seul approbateur** : prévoir un fallback (superviseur, groupe) si l'approbateur principal est absent — surtout pour les actions sensibles.
