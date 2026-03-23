---
name: agent-conflict-resolver
description: Résolution de conflits entre agents ou sous-agents quand les résultats sont contradictoires. Se déclenche avec "conflit agent", "agent conflict", "résultats contradictoires", "agent disagreement", "contradiction agents", "arbitrage agent", "résoudre conflit agents".
---

# Agent Conflict Resolver

## Quand utiliser ce skill
Utilise ce skill lorsque deux agents ou plus ont produit des résultats contradictoires, incompatibles ou mutuellement exclusifs sur la même question ou la même tâche. Cela arrive typiquement dans les architectures multi-agents parallèles où plusieurs agents traitent la même entrée, dans les pipelines avec validation croisée, ou lorsqu'un agent de vérification contredit le résultat d'un agent de production. L'objectif est de résoudre le conflit de façon traçable et d'alimenter un feedback loop pour prévenir les futurs conflits.

## Workflow

1. **Détecter le conflit automatiquement** — Implémente une couche de détection qui compare les outputs des agents après chaque étape parallèle. Types de conflits à détecter : **contradiction directe** (agent A dit "vrai", agent B dit "faux"), **incohérence numérique** (agent A retourne 1500€, agent B retourne 2300€ pour le même calcul), **inconsistance logique** (les deux conclusions ne peuvent pas être vraies simultanément), **conflit de priorité** (agent A recommande action X, agent B recommande action Y incompatible avec X).

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class ConflictDetectionResult:
    has_conflict: bool
    conflict_type: str  # "direct_contradiction" | "numerical_inconsistency" | "logical_conflict" | "priority_conflict"
    severity: str       # "critical" | "major" | "minor"
    agent_a: str
    agent_b: str
    output_a: Any
    output_b: Any
    description: str

def detect_conflict(output_a: Any, agent_a: str, output_b: Any, agent_b: str) -> ConflictDetectionResult:
    # Détection numérique
    if isinstance(output_a, (int, float)) and isinstance(output_b, (int, float)):
        diff_pct = abs(output_a - output_b) / max(abs(output_a), abs(output_b), 1)
        if diff_pct > 0.10:  # >10% d'écart
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
    return ConflictDetectionResult(has_conflict=False, conflict_type="none", severity="none",
                                    agent_a=agent_a, agent_b=agent_b,
                                    output_a=output_a, output_b=output_b, description="")
```

2. **Classifier le conflit** — Évalue deux dimensions : **nature** (factuel vs opinion — un conflit factuel a une réponse vérifiable, un conflit d'opinion nécessite un jugement) et **criticité** (critique : la décision est irréversible ou à fort impact ; majeur : peut être corrigé mais coûteux ; mineur : acceptable de prendre l'un ou l'autre). Cette classification détermine la stratégie de résolution. Un conflit factuel critique nécessite une vérification externe. Un conflit d'opinion mineur peut se résoudre par majority vote.

3. **Rassembler les preuves** — Avant de résoudre, demande à chaque agent impliqué de **justifier son résultat** : fournir les sources utilisées, le raisonnement étape par étape (chain-of-thought), le score de confiance auto-évalué (0.0–1.0) et les hypothèses ou limites reconnues. Cette étape est critique : souvent, la justification révèle qu'un agent a utilisé des données périmées ou a fait une hypothèse erronée, ce qui simplifie la résolution.

```python
async def gather_evidence(conflict: ConflictDetectionResult, agents: dict) -> dict:
    evidence_a = await agents[conflict.agent_a].justify(
        output=conflict.output_a,
        prompt="Explique ton raisonnement étape par étape, liste tes sources, donne ton score de confiance (0-1) et identifie tes hypothèses."
    )
    evidence_b = await agents[conflict.agent_b].justify(
        output=conflict.output_b,
        prompt="Explique ton raisonnement étape par étape, liste tes sources, donne ton score de confiance (0-1) et identifie tes hypothèses."
    )
    return {
        "agent_a": {"output": conflict.output_a, "evidence": evidence_a},
        "agent_b": {"output": conflict.output_b, "evidence": evidence_b}
    }
```

4. **Appliquer la stratégie de résolution adaptée** — Sélectionne selon le type de conflit : **source verification** (conflit factuel → vérifier avec une source externe authoritative), **authority-based** (l'agent avec la plus haute expertise sur ce domaine gagne), **recency-based** (l'agent avec les données les plus récentes gagne, pour les informations temporelles), **majority vote** (si N>2 agents et majorité claire), **arbitration** (agent arbitre neutre, voir étape 5). Applique toujours la stratégie la moins coûteuse en premier.

```python
class ConflictResolutionStrategy:
    @staticmethod
    def source_verification(conflict, evidence: dict, external_source) -> dict:
        ground_truth = external_source.lookup(conflict.output_a, conflict.output_b)
        winner = "agent_a" if ground_truth == conflict.output_a else "agent_b"
        return {"winner": winner, "method": "source_verification", "ground_truth": ground_truth}

    @staticmethod
    def confidence_based(evidence: dict) -> dict:
        conf_a = evidence["agent_a"]["evidence"].get("confidence", 0.5)
        conf_b = evidence["agent_b"]["evidence"].get("confidence", 0.5)
        if abs(conf_a - conf_b) < 0.1:
            return {"winner": None, "method": "confidence_tie", "needs_escalation": True}
        winner = "agent_a" if conf_a > conf_b else "agent_b"
        return {"winner": winner, "method": "confidence_based", "confidence_delta": abs(conf_a - conf_b)}
```

5. **Utiliser un agent arbitre (LLM-as-judge)** — Lorsque les stratégies déterministes ne suffisent pas, invoque un **agent arbitre neutre** : un LLM avec un prompt structuré d'évaluation qui reçoit les deux outputs et leurs justifications, applique des critères d'évaluation explicites (exactitude, cohérence, sourcing, raisonnement), et produit un verdict motivé. L'arbitre ne doit pas être l'un des agents en conflit. Utilise un modèle plus puissant que les agents en conflit si possible.

```python
ARBITRATOR_PROMPT = """Tu es un arbitre neutre. Voici deux réponses contradictoires à la même question.

Question: {question}

Réponse A (de {agent_a}): {output_a}
Justification A: {evidence_a}

Réponse B (de {agent_b}): {output_b}
Justification B: {evidence_b}

Évalue selon ces critères :
1. Exactitude factuelle (sources vérifiables)
2. Cohérence du raisonnement
3. Complétude de la réponse
4. Score de confiance déclaré

Détermine quelle réponse est la plus fiable, explique ton raisonnement, et fournis un score de confiance dans ta décision (0-1).
Réponds en JSON : {{"winner": "A"|"B"|"neither", "reasoning": "...", "confidence": 0.0-1.0}}
"""
```

6. **Appliquer la stratégie de merge** — Certains conflits ne sont pas de vraies contradictions mais des **résultats complémentaires** : l'agent A a traité une partie du problème, l'agent B une autre. Dans ce cas, merge les outputs plutôt que de choisir un gagnant. Stratégies de merge : **union** (conserver toutes les informations non contradictoires), **intersection** (conserver uniquement les informations partagées), **weighted merge** (chaque champ est pris de l'agent avec la plus haute confiance sur ce champ), **synthesis** (appeler un LLM pour synthétiser les deux en une réponse cohérente).

7. **Définir les règles d'escalation** — Escalade obligatoire si : `confidence_in_resolution < 0.5` (l'arbitre lui-même est incertain), conflit de **criticité critique** sans résolution déterministe, conflit **persistant** (même après arbitrage un agent conteste), ou conflit impliquant des **données sensibles** (financières, médicales, légales). L'escalation vers un superviseur humain doit inclure le résumé du conflit, les deux positions et les preuves rassemblées.

```python
def should_escalate(resolution_result: dict, conflict: ConflictDetectionResult) -> bool:
    return (
        resolution_result.get("confidence", 1.0) < 0.5 or
        conflict.severity == "critical" and resolution_result.get("method") != "source_verification" or
        resolution_result.get("needs_escalation", False)
    )
```

8. **Logger la résolution** — Chaque résolution de conflit doit être documentée : `conflict_id`, `timestamp`, `agents_involved`, `conflict_type`, `severity`, `outputs_in_conflict`, `evidence_gathered`, `resolution_strategy_used`, `resolution_result`, `winner`, `reasoning`, `confidence_in_resolution`, `escalated` (booléen), `resolution_duration_ms`. Ces logs constituent une base de données précieuse pour analyser les patterns de conflits récurrents.

9. **Prévenir les futurs conflits** — Analyse les logs de conflits pour identifier les causes racines : **instructions ambiguës** (les deux agents avaient raison selon leur interprétation → clarifier les prompts), **scopes qui se chevauchent** (deux agents traitent la même sous-tâche → mieux décomposer), **données inconsistantes** (les agents utilisaient des versions différentes de la même donnée → state store partagé), **manque de contexte** (un agent manquait d'information → améliorer le context packaging).

10. **Alimenter le feedback loop** — Le résultat de chaque résolution doit informer les futurs dispatches : si l'agent A perd systématiquement sur les questions de type X, réduire sa priorité pour ce type ou mettre à jour son prompt. Implémenter un **performance tracker** par agent et par type de tâche. Utiliser ces métriques dans le routing conditionnel pour favoriser les agents avec le meilleur track record.

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

## Anti-patterns

- **Toujours prendre le premier résultat** — Dans un pipeline parallèle, le premier agent à répondre n'est pas nécessairement le plus fiable. La vitesse ne corrèle pas avec la qualité. Toujours vérifier la présence de conflits avant d'accepter un résultat.
- **Ignorer les conflits mineurs** — Les conflits classifiés comme "mineurs" révèlent souvent des problèmes systémiques (prompts ambigus, données inconsistantes) qui deviennent critiques si non traités. Logger et analyser tous les conflits, même résolus par défaut.
- **Boucle de re-resolution infinie** — Si l'arbitre contredit lui-même l'un des agents, ne pas relancer un nouveau cycle d'arbitrage indéfiniment. Maximum 2 rounds d'arbitrage, puis escalation humaine obligatoire.
- **Absence de logging** — Résoudre un conflit sans le documenter prive le système de la possibilité d'apprendre et de prévenir les récurrences. Chaque résolution, même triviale, doit être loggée.

## Règles

1. **Détection automatique obligatoire** — Tout output produit en parallèle par plusieurs agents doit passer par une couche de détection de conflits avant d'être utilisé. Ne jamais merger des résultats sans vérification.
2. **Stratégie déterministe d'abord** — Tente toujours la résolution déterministe (vérification de source, confiance, autorité) avant de recourir à l'arbitrage LLM, plus coûteux et moins prévisible.
3. **L'arbitre est neutre** — L'agent arbitre ne doit jamais être l'un des agents en conflit. Utilise un agent dédié ou un modèle distinct pour l'arbitrage.
4. **Documente les trade-offs** — La résolution par confiance est rapide mais peut être biaisée. La vérification externe est fiable mais lente. L'arbitrage LLM est flexible mais coûteux. Choisis et documente explicitement.
5. **Adapte au framework** — LangGraph : node de détection + conditional resolution branches. CrewAI : task de validation croisée. AutoGen : agent `ConflictResolver` dans le GroupChat. Custom : middleware de comparaison après `asyncio.gather`.
