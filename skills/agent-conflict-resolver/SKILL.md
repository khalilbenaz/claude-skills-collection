---
name: agent-conflict-resolver
description: Résolution de conflits entre agents ou sous-agents quand les résultats sont contradictoires, avec workflow de détection, arbitrage, merge et feedback loop. Se déclenche avec "conflit agent", "agent conflict", "résultats contradictoires", "agent disagreement", "contradiction agents", "arbitrage agent", "résoudre conflit agents".
---

# Agent Conflict Resolver

## Quand utiliser ce skill

Utilise ce skill quand deux agents ou plus ont produit des résultats contradictoires, incompatibles ou mutuellement exclusifs sur la même question ou tâche. Typiquement : pipelines parallèles, validation croisée, ou agent de vérification qui contredit l'agent de production.

**Conditions de déclenchement concrètes :**
- Agent A retourne `True`, agent B retourne `False` sur le même prédicat
- Deux agents calculent des montants différents pour la même transaction
- Deux agents recommandent des actions incompatibles (ex. : "accepter" vs "rejeter")
- Un agent de vérification invalide le résultat d'un agent de génération
- N agents en majorité vs minorité sur une classification

---

## Workflow en 10 étapes

### 1. Détecter le conflit

Implémente une couche de comparaison après chaque `gather` parallèle. Classe chaque conflit par **type** et **sévérité** avant toute action.

| Type | Exemple | Sévérité par défaut |
|---|---|---|
| `direct_contradiction` | True vs False | critical |
| `numerical_inconsistency` | 1500€ vs 2300€ (>10%) | major |
| `logical_conflict` | Deux conclusions mutuellement exclusives | major |
| `priority_conflict` | Action X incompatible avec action Y | minor → critical selon domaine |

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class ConflictDetectionResult:
    has_conflict: bool
    conflict_type: str   # "direct_contradiction" | "numerical_inconsistency" | "logical_conflict" | "priority_conflict"
    severity: str        # "critical" | "major" | "minor"
    agent_a: str
    agent_b: str
    output_a: Any
    output_b: Any
    description: str

def detect_conflict(output_a: Any, agent_a: str, output_b: Any, agent_b: str) -> ConflictDetectionResult:
    # Détection numérique
    if isinstance(output_a, (int, float)) and isinstance(output_b, (int, float)):
        diff_pct = abs(output_a - output_b) / max(abs(output_a), abs(output_b), 1)
        if diff_pct > 0.10:
            return ConflictDetectionResult(
                has_conflict=True, conflict_type="numerical_inconsistency",
                severity="major" if diff_pct > 0.30 else "minor",
                agent_a=agent_a, agent_b=agent_b,
                output_a=output_a, output_b=output_b,
                description=f"Écart de {diff_pct:.1%} entre {agent_a} et {agent_b}"
            )
    # Détection booléenne
    if isinstance(output_a, bool) and isinstance(output_b, bool) and output_a != output_b:
        return ConflictDetectionResult(
            has_conflict=True, conflict_type="direct_contradiction", severity="critical",
            agent_a=agent_a, agent_b=agent_b, output_a=output_a, output_b=output_b,
            description=f"{agent_a} dit {output_a}, {agent_b} dit {output_b}"
        )
    return ConflictDetectionResult(
        has_conflict=False, conflict_type="none", severity="none",
        agent_a=agent_a, agent_b=agent_b, output_a=output_a, output_b=output_b, description=""
    )
```

---

### 2. Classifier le conflit — matrice de décision

Croise **nature** × **criticité** pour choisir la stratégie :

| | Factuel (réponse vérifiable) | Opinion (jugement) |
|---|---|---|
| **Critical** | Vérification source externe obligatoire | Arbitre neutre + escalation humaine |
| **Major** | Confidence-based ou source externe | Arbitre neutre LLM |
| **Minor** | Confidence-based | Majority vote (si N≥3) ou default |

---

### 3. Rassembler les preuves

Demande à chaque agent impliqué de **justifier son résultat** : sources, chain-of-thought, score de confiance (0–1), hypothèses. Cette étape révèle souvent la cause (données périmées, hypothèse erronée) et simplifie la résolution.

```python
async def gather_evidence(conflict: ConflictDetectionResult, agents: dict) -> dict:
    prompt = (
        "Explique ton raisonnement étape par étape, liste tes sources, "
        "donne ton score de confiance (0–1) et identifie tes hypothèses."
    )
    evidence_a = await agents[conflict.agent_a].justify(output=conflict.output_a, prompt=prompt)
    evidence_b = await agents[conflict.agent_b].justify(output=conflict.output_b, prompt=prompt)
    return {
        "agent_a": {"output": conflict.output_a, "evidence": evidence_a},
        "agent_b": {"output": conflict.output_b, "evidence": evidence_b},
    }
```

---

### 4. Appliquer la stratégie déterministe (coût minimal, toujours en premier)

| Stratégie | Quand l'appliquer | Coût |
|---|---|---|
| `source_verification` | Conflit factuel + source externe disponible | Moyen |
| `recency_based` | Données temporelles (prix, statuts, stocks) | Faible |
| `authority_based` | Un agent est spécialisé dans ce domaine | Faible |
| `confidence_based` | Écart de confiance > 0.1 | Faible |
| `majority_vote` | N ≥ 3 agents, majorité nette | Faible |

```python
class ConflictResolutionStrategy:
    @staticmethod
    def confidence_based(evidence: dict) -> dict:
        conf_a = evidence["agent_a"]["evidence"].get("confidence", 0.5)
        conf_b = evidence["agent_b"]["evidence"].get("confidence", 0.5)
        if abs(conf_a - conf_b) < 0.1:
            return {"winner": None, "method": "confidence_tie", "needs_escalation": True}
        winner = "agent_a" if conf_a > conf_b else "agent_b"
        return {"winner": winner, "method": "confidence_based", "confidence_delta": abs(conf_a - conf_b)}

    @staticmethod
    def source_verification(conflict: ConflictDetectionResult, external_source) -> dict:
        ground_truth = external_source.lookup(conflict.output_a, conflict.output_b)
        winner = "agent_a" if ground_truth == conflict.output_a else "agent_b"
        return {"winner": winner, "method": "source_verification", "ground_truth": ground_truth}
```

---

### 5. Arbitrage LLM (fallback si déterministe insuffisant)

L'arbitre doit être **neutre** (pas un agent en conflit), idéalement un modèle plus puissant. Maximum **2 rounds** d'arbitrage — si le conflit persiste, escalation humaine obligatoire.

```python
ARBITRATOR_PROMPT = """Tu es un arbitre neutre. Voici deux réponses contradictoires à la même question.

Question : {question}

Réponse A (de {agent_a}) : {output_a}
Justification A : {evidence_a}

Réponse B (de {agent_b}) : {output_b}
Justification B : {evidence_b}

Critères d'évaluation :
1. Exactitude factuelle (sources vérifiables)
2. Cohérence du raisonnement
3. Complétude de la réponse
4. Score de confiance déclaré

Réponds en JSON strict :
{{"winner": "A"|"B"|"neither", "reasoning": "...", "confidence": 0.0-1.0}}
"""
```

---

### 6. Merge si les résultats sont complémentaires

Certains conflits sont de faux positifs : les agents ont traité des sous-ensembles du problème. Dans ce cas, **merge** plutôt que choisir.

| Stratégie merge | Quand | Exemple |
|---|---|---|
| `union` | Informations non contradictoires | Listes de recommandations |
| `intersection` | Conserver uniquement le consensus | Entités extraites par NER |
| `weighted_merge` | Chaque champ pris de l'agent avec la plus haute confiance | Structures JSON partielles |
| `synthesis` | LLM synthétise les deux en réponse cohérente | Résumés textuels |

```python
async def weighted_merge(evidence: dict, llm) -> dict:
    """Prend chaque champ de l'agent le plus confiant sur ce champ."""
    merged = {}
    for field in set(evidence["agent_a"]["output"]) | set(evidence["agent_b"]["output"]):
        conf_a = evidence["agent_a"]["evidence"].get(f"confidence_{field}", 0.5)
        conf_b = evidence["agent_b"]["evidence"].get(f"confidence_{field}", 0.5)
        source = evidence["agent_a"]["output"] if conf_a >= conf_b else evidence["agent_b"]["output"]
        merged[field] = source.get(field)
    return merged
```

---

### 7. Règles d'escalation humaine

Escalation obligatoire si l'une de ces conditions est vraie :

```python
def should_escalate(resolution: dict, conflict: ConflictDetectionResult) -> bool:
    return (
        resolution.get("confidence", 1.0) < 0.5 or               # Arbitre incertain
        (conflict.severity == "critical"
         and resolution.get("method") != "source_verification") or  # Critique sans vérif externe
        resolution.get("needs_escalation", False) or               # Tie sur confiance
        resolution.get("arbitration_round", 0) >= 2               # Boucle d'arbitrage
    )
```

Le payload d'escalation doit inclure : résumé du conflit, les deux outputs, les preuves, la stratégie tentée et le score de confiance de la résolution.

---

### 8. Logger chaque résolution

Champs obligatoires dans le log :

```json
{
  "conflict_id": "uuid",
  "timestamp": "ISO8601",
  "agents_involved": ["agent_a", "agent_b"],
  "conflict_type": "numerical_inconsistency",
  "severity": "major",
  "resolution_strategy": "confidence_based",
  "winner": "agent_a",
  "confidence_in_resolution": 0.82,
  "escalated": false,
  "resolution_duration_ms": 340
}
```

Ces logs sont la matière première de l'analyse causale et du feedback loop.

---

### 9. Analyser les causes racines (post-résolution)

Regrouper les conflits par type de cause pour identifier les correctifs systémiques :

| Cause racine | Signal dans les logs | Correctif |
|---|---|---|
| Instructions ambiguës | Même type de conflit récurrent sur même tâche | Clarifier le prompt système |
| Scopes qui se chevauchent | Deux agents traitent la même sous-tâche | Mieux décomposer le plan |
| Données inconsistantes | Agents utilisent des versions différentes | State store partagé + version tagging |
| Manque de contexte | Agent perd systématiquement sur un type | Enrichir le context packaging |

---

### 10. Feedback loop — ajuster le routing

```python
class AgentPerformanceTracker:
    def __init__(self):
        self.wins: dict[str, int] = {}
        self.losses: dict[str, int] = {}
        self.by_task_type: dict[str, dict[str, int]] = {}

    def record_resolution(self, winner: str, loser: str, task_type: str):
        self.wins[winner] = self.wins.get(winner, 0) + 1
        self.losses[loser] = self.losses.get(loser, 0) + 1
        self.by_task_type.setdefault(task_type, {})
        self.by_task_type[task_type][winner] = self.by_task_type[task_type].get(winner, 0) + 1

    def win_rate(self, agent_id: str) -> float:
        wins = self.wins.get(agent_id, 0)
        losses = self.losses.get(agent_id, 0)
        total = wins + losses
        return wins / total if total > 0 else 0.5
```

Si `win_rate(agent_id) < 0.4` sur un type de tâche → réduire la priorité de dispatch pour ce type ou mettre à jour son prompt.

---

## Anti-patterns et pièges

| Anti-pattern | Risque | Correctif |
|---|---|---|
| Prendre le premier résultat (fastest-wins) | Le plus rapide n'est pas le plus fiable | Toujours comparer après gather |
| Ignorer les conflits "mineurs" | Révèlent des problèmes systémiques, deviennent critiques | Logger et analyser tous |
| Boucle d'arbitrage infinie | Coût exponentiel, pas de convergence | Max 2 rounds, puis escalation |
| Arbitre = agent en conflit | Biais inévitable | Toujours un agent tiers ou modèle distinct |
| Résolution sans logging | Aucun apprentissage possible | Logger systématiquement, même les triviaux |
| Merge aveugle | Produit des incohérences silencieuses | Valider la cohérence du résultat mergé |
| Score de confiance auto-déclaré comme oracle | Les agents sur-évaluent souvent leur confiance | Pondérer avec le win_rate historique |

---

## Adaptation par framework

| Framework | Point d'intégration recommandé |
|---|---|
| **LangGraph** | Node `conflict_detector` + branches conditionnelles `resolve` / `escalate` |
| **CrewAI** | Task de validation croisée après les tasks parallèles |
| **AutoGen** | Agent `ConflictResolver` dans le `GroupChat` avec rôle d'arbitre |
| **Custom asyncio** | Middleware de comparaison après `asyncio.gather(*agent_tasks)` |
| **LangChain LCEL** | Branche `RunnableBranch` avec condition de conflit |

---

## Règles non négociables

1. **Détection systématique** — Tout output parallèle passe par la couche de détection. Pas d'exception.
2. **Déterministe d'abord** — Source externe > confiance > autorité > vote > arbitre LLM. Dans cet ordre.
3. **Arbitre neutre** — Jamais un des agents en conflit. Jamais.
4. **2 rounds max** — Au-delà, l'incertitude est trop haute pour être résolue algorithmiquement.
5. **Logger tout** — Même les conflits résolus en 50 ms par confiance. Le pattern émerge des logs.


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
