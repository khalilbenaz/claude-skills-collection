---
name: consensus-builder
description: Mécanismes de consensus et de vote entre agents pour prendre des décisions collectives fiables. Se déclenche avec "consensus agent", "vote agents", "décision collective", "agent voting", "multi-agent decision", "majority vote", "agent debate", "agent deliberation". Also triggers on "agent consensus", "majority vote between agents".
---

# Agent Consensus Builder

## Quand utiliser ce skill

| Critère | Utilise le consensus | N'utilise PAS le consensus |
|---|---|---|
| Nature de la question | Incertaine, subjective, multicritère | Factuelle, vérifiable, calculable |
| Conséquences d'erreur | Irréversibles ou coûteuses | Faibles, corrigeables facilement |
| Perspectives | Plusieurs angles utiles (risque, UX, technique) | Un seul expert suffit |
| Latence | Acceptable (>2s) | Critique (<500ms) |
| Budget tokens | Disponible (N × appels) | Contraint |

**Règle rapide** : si `grep -r "answer" knowledge_base` trouve la réponse, pas besoin de consensus. Si la décision dépend de valeurs ou de jugement, le consensus ajoute de la valeur.

---

## Workflow en 10 étapes

### 1. Qualifier la décision

Avant de lancer quoi que ce soit, score la décision sur 3 axes (0–3 chacun) :

```python
def consensus_necessity_score(decision: dict) -> int:
    score = 0
    if decision["is_reversible"] is False: score += 2
    if decision["uncertainty"] == "high": score += 2
    if decision["perspectives_needed"] > 1: score += 1
    # score >= 3 → consensus justifié
    # score < 3 → agent unique suffisant
    return score
```

### 2. Définir la question et les options AVANT de lancer les agents

Format standard à passer à chaque agent :

```python
CONSENSUS_PROMPT_TEMPLATE = """
Tu es un agent spécialisé en {role}.
Question : {question}
Options disponibles : {options}
Contexte : {context}

Réponds en JSON :
{{
  "choice": "<une des options>",
  "confidence": <float 0.0-1.0>,
  "rationale": "<explication concise>",
  "risks": ["<risque 1>", "<risque 2>"]
}}
"""
```

### 3. Choisir la méthode de vote

| Méthode | Usage | Quand | Seuil typique |
|---|---|---|---|
| Majority vote | Binaire simple | Décision oui/non | >50% |
| Supermajority | Décision risquée | Rollback, suppression de données | ≥66% |
| Weighted vote | Agents spécialisés | Agent expert > généraliste | Poids définis a priori |
| Confidence-weighted | Agents incertains | Analyse de sentiments, prévisions | Score agrégé |
| Borda count | N > 2 options | Choix d'architecture, priorisation | Premier rang |

```python
from collections import Counter
from typing import Any

def majority_vote(votes: list[str]) -> str:
    counts = Counter(votes)
    winner, count = counts.most_common(1)[0]
    return winner if count > len(votes) / 2 else "no_consensus"

def confidence_weighted_consensus(votes: list[dict[str, Any]]) -> dict:
    # votes = [{"choice": "A", "confidence": 0.8}, ...]
    scores: dict[str, float] = {}
    for v in votes:
        scores[v["choice"]] = scores.get(v["choice"], 0) + v["confidence"]
    total = sum(scores.values())
    normalized = {k: round(v / total, 3) for k, v in scores.items()}
    winner = max(normalized, key=normalized.get)
    return {"winner": winner, "scores": normalized, "strength": normalized[winner]}

def borda_count(rankings: list[list[str]]) -> str:
    # rankings = [["A","B","C"], ["B","A","C"], ...]
    n = len(rankings[0])
    scores: dict[str, int] = {}
    for ranking in rankings:
        for i, option in enumerate(ranking):
            scores[option] = scores.get(option, 0) + (n - i - 1)
    return max(scores, key=scores.get)
```

### 4. Assurer la diversité d'opinion (critique)

Sans diversité, le consensus amplifie les biais. Minimum 2 axes de différenciation :

```python
AGENT_CONFIGS = [
    {"role": "risk_analyst",   "temperature": 0.2, "framing": "Quels sont les risques ?"},
    {"role": "optimist",       "temperature": 0.7, "framing": "Quels sont les gains potentiels ?"},
    {"role": "devils_advocate","temperature": 0.5, "framing": "Pourquoi cette option échouerait-elle ?"},
    {"role": "neutral_analyst","temperature": 0.3, "framing": "Évalue objectivement chaque option."},
]
# Règle : jamais 2 agents avec le même role + temperature + framing
```

### 5. Lancer les agents en parallèle (Round 1)

```python
import asyncio

async def run_vote(agents: list, question: str, options: list[str]) -> list[dict]:
    tasks = [agent.vote(question, options) for agent in agents]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    # Filtrer les erreurs sans bloquer le vote
    valid = [r for r in results if isinstance(r, dict)]
    if len(valid) < len(agents) // 2 + 1:
        raise RuntimeError("Trop d'agents en échec pour un consensus fiable")
    return valid
```

### 6. Débat structuré (si no_consensus au Round 1)

3 rounds maximum. Au-delà, pas de valeur ajoutée.

```python
async def run_debate(agents: list, question: str, options: list[str]) -> dict:
    # Round 1 : positions initiales (parallèle)
    positions = await run_vote(agents, question, options)

    # Round 2 : cross-examination (chaque agent voit les autres)
    critiques = await asyncio.gather(*[
        agent.critique(question, positions, own_idx=i)
        for i, agent in enumerate(agents)
    ])

    # Round 3 : vote final avec toutes les informations
    final_votes = await asyncio.gather(*[
        agent.final_vote(question, options, positions, critiques)
        for agent in agents
    ])
    return {"votes": final_votes, "positions": positions, "critiques": critiques}
```

### 7. Résoudre les deadlocks

Priorité décroissante :

1. **Tiebreaker déterministe** : option la plus conservatrice/sûre gagne (pas de hasard)
2. **Moderator agent** : agent supplémentaire invoqué avec le dossier complet (temperature=0.0)
3. **Escalation humaine** : présenter les options avec pro/contra à un humain
4. **Random + logging explicite** : dernier recours, jamais silencieux

```python
def resolve_deadlock(votes: list[str], options: list[str], safety_order: list[str]) -> str:
    """safety_order = options classées de la plus sûre à la plus risquée"""
    counts = Counter(votes)
    max_count = max(counts.values())
    tied = [o for o, c in counts.items() if c == max_count]
    # Préférer l'option la plus sûre parmi les ex-aequo
    for safe_option in safety_order:
        if safe_option in tied:
            return safe_option
    return tied[0]  # fallback
```

**Prévention** : utilise toujours un nombre **impair** d'agents votants (3, 5, 7).

### 8. Valider le consensus et générer le minority report

```python
def validate_consensus(votes: list[dict], winner: str) -> dict:
    total = len(votes)
    winner_votes = [v for v in votes if v["choice"] == winner]
    minority_votes = [v for v in votes if v["choice"] != winner]
    strength = len(winner_votes) / total

    return {
        "winner": winner,
        "consensus_strength": round(strength, 3),
        "is_strong": strength >= 0.66,
        "requires_human_review": strength < 0.51,
        "minority_report": {
            "options": list({v["choice"] for v in minority_votes}),
            "rationales": [v.get("rationale") for v in minority_votes],
            "risks_raised": [r for v in minority_votes for r in v.get("risks", [])],
        },
    }
```

### 9. Optimiser les coûts avec l'escalade progressive

```python
async def adaptive_consensus(agents_pool: list, question: str, options: list) -> dict:
    # Étape 1 : vote rapide avec 2 agents (modèle léger possible)
    quick_votes = await run_vote(agents_pool[:2], question, options)
    result = confidence_weighted_consensus(quick_votes)
    if result["strength"] >= 0.85:
        return {**result, "method": "quick_vote", "agents_used": 2}

    # Étape 2 : vote étendu si pas de consensus fort
    full_votes = await run_vote(agents_pool, question, options)
    result = confidence_weighted_consensus(full_votes)
    if result["strength"] >= 0.66:
        return {**result, "method": "full_vote", "agents_used": len(agents_pool)}

    # Étape 3 : débat structuré si toujours pas de consensus
    debate_result = await run_debate(agents_pool, question, options)
    final = confidence_weighted_consensus(debate_result["votes"])
    return {**final, "method": "full_debate", "agents_used": len(agents_pool)}
```

### 10. Audit trail obligatoire

```python
import time

def build_audit_log(session_id: str, question: str, options: list,
                    agents_config: list, result: dict, duration_ms: int) -> dict:
    return {
        "session_id": session_id,
        "timestamp": time.time(),
        "question": question,
        "options": options,
        "agents": agents_config,           # roles, temperatures, framings
        "method": result["method"],
        "winner": result["winner"],
        "consensus_strength": result["strength"],
        "minority_report": result.get("minority_report"),
        "duration_ms": duration_ms,
    }
# Stocke en base ou fichier JSON — indispensable pour débugger les désaccords récurrents
```

---

## Intégration par framework

| Framework | Pattern recommandé |
|---|---|
| **LangGraph** | Nodes parallèles (`fan-out`) → nœud d'agrégation conditionnel |
| **AutoGen** | `GroupChat` avec `speaker_selection="round_robin"`, `GroupChatManager` comme modérateur |
| **CrewAI** | `Crew` avec agents aux rôles distincts, `Process.hierarchical` pour le modérateur |
| **Custom asyncio** | `asyncio.gather` + fonctions d'agrégation ci-dessus |

---

## Anti-patterns et pièges

| Anti-pattern | Pourquoi c'est un problème | Correctif |
|---|---|---|
| Agents identiques (même prompt+temp) | Redondance, pas de diversité, amplifie les biais | Différencier rôle, température, framing |
| Consensus sur faits vérifiables | Hallucinations collectives amplifiées | Chercher la réponse avec des outils |
| Ignorer le minority report | Risques critiques souvent portés par la minorité | Logger et présenter les dissenting opinions |
| >3 rounds de débat | Convergence nulle, coûts exponentiels | Limite stricte à 3 rounds |
| Ajuster le seuil après le vote | Biais de confirmation, résultat non fiable | Définir le seuil avant de lancer |
| Nombre pair d'agents | Deadlock structurel fréquent | Toujours 3, 5 ou 7 agents |
| Agents tous avec confidence=1.0 | Le weighted vote perd tout intérêt | Forcer les agents à exprimer leur incertitude |

---

## Règles non négociables

1. **Diversité obligatoire** — Minimum 2 axes de différenciation entre agents (rôle, température, framing, contexte partiel). Sans ça, n'utilise qu'un seul agent.
2. **Seuil défini avant le vote** — Jamais rétroactivement. Documente-le dans l'audit trail.
3. **Minority report toujours produit** — Même si le consensus est fort à 90%.
4. **Nombre impair d'agents** — 3 minimum pour un vote significatif, 5 pour les décisions critiques.
5. **Coût justifié** — Chaque agent supplémentaire = N × coût. Commence par 2 agents, escalade seulement si nécessaire.
