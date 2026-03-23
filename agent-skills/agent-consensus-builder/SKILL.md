---
name: agent-consensus-builder
description: Mécanismes de consensus et de vote entre agents pour prendre des décisions collectives fiables. Se déclenche avec "consensus agent", "vote agents", "décision collective", "agent voting", "multi-agent decision", "majority vote", "agent debate", "agent deliberation".
---

# Agent Consensus Builder

## Quand utiliser ce skill
Utilise ce skill lorsqu'une décision critique ne peut pas être prise de façon fiable par un seul agent, notamment lorsque l'incertitude est élevée, que plusieurs perspectives sont nécessaires (analyse de risque, évaluation qualitative) ou que les conséquences d'une erreur sont significatives. Le consensus multi-agents augmente la robustesse en réduisant les biais d'un seul LLM. N'utilise pas le consensus pour les faits vérifiables : cherche simplement la réponse.

## Workflow

1. **Décider quand utiliser le consensus** — Le consensus est justifié si : la décision est **critique** (conséquences irréversibles ou coûteuses), il existe une **incertitude élevée** (pas de réponse factuellement vérifiable), **plusieurs perspectives** enrichissent l'analyse (technique, business, éthique), ou le système a déjà produit des **réponses contradictoires** sur des questions similaires. Ne pas utiliser pour : les faits (dates, calculs, données vérifiables), les décisions triviales, les situations où la latence est critique.

2. **Choisir la méthode de vote** — Selon la nature de la décision : **majority vote** (≥50%+1, décisions binaires simples), **supermajority** (≥66%, décisions risquées), **weighted vote** (chaque agent a un poids selon son expertise ou son historique de performance), **ranked choice voting** (Instant-Runoff, pour choisir entre N options), **approval voting** (chaque agent approuve toutes les options acceptables, prend l'option avec le plus d'approbations), **Borda count** (chaque agent classe les options, points attribués selon le rang).

```python
from collections import Counter
from typing import Any

def majority_vote(votes: list[str]) -> str:
    counts = Counter(votes)
    winner, count = counts.most_common(1)[0]
    return winner if count > len(votes) / 2 else "no_consensus"

def weighted_vote(votes: list[tuple[str, float]]) -> str:
    scores: dict[str, float] = {}
    for option, weight in votes:
        scores[option] = scores.get(option, 0) + weight
    return max(scores, key=scores.get)

def borda_count(rankings: list[list[str]]) -> str:
    n = len(rankings[0])
    scores: dict[str, int] = {}
    for ranking in rankings:
        for i, option in enumerate(ranking):
            scores[option] = scores.get(option, 0) + (n - i - 1)
    return max(scores, key=scores.get)
```

3. **Organiser le débat entre agents** — Le pattern de débat structuré en 3 rounds : **(a) Argumentation initiale** : chaque agent formule sa position et ses arguments (prompt distinct, réponses parallèles), **(b) Cross-examination** : chaque agent reçoit les arguments des autres et peut les critiquer ou nuancer sa position, **(c) Rebuttal et vote final** : chaque agent formule sa position finale après avoir entendu les contre-arguments. Un modérateur (agent supplémentaire ou règle déterministe) synthétise et appelle au vote.

```python
import asyncio

async def run_debate(agents: list, question: str, options: list[str]) -> dict:
    # Round 1 : positions initiales
    initial_positions = await asyncio.gather(*[
        agent.argue(question, options, round=1) for agent in agents
    ])
    # Round 2 : cross-examination
    critiques = await asyncio.gather(*[
        agent.critique(question, initial_positions, own_position=initial_positions[i])
        for i, agent in enumerate(agents)
    ])
    # Round 3 : vote final
    final_votes = await asyncio.gather(*[
        agent.final_vote(question, options, initial_positions, critiques)
        for agent in agents
    ])
    return {"votes": final_votes, "positions": initial_positions, "critiques": critiques}
```

4. **Implémenter le vote pondéré par confiance** — Chaque agent vote en fournissant non seulement son choix mais aussi un **score de confiance** (0.0–1.0). Le résultat final est calculé par **weighted aggregation** : `score(option) = Σ(confidence_i * vote_i_for_option)`. Un agent très incertain (confiance 0.3) influence moins le résultat qu'un agent certain (confiance 0.9). Normalise les scores de confiance si nécessaire.

```python
def confidence_weighted_consensus(
    votes: list[dict[str, Any]]  # [{"choice": "A", "confidence": 0.8}, ...]
) -> dict:
    option_scores: dict[str, float] = {}
    for vote in votes:
        choice = vote["choice"]
        confidence = vote["confidence"]
        option_scores[choice] = option_scores.get(choice, 0) + confidence
    total = sum(option_scores.values())
    normalized = {k: v / total for k, v in option_scores.items()}
    winner = max(normalized, key=normalized.get)
    return {"winner": winner, "scores": normalized, "confidence": normalized[winner]}
```

5. **Assurer la diversité d'opinion** — Pour que le consensus soit utile, les agents doivent avoir des perspectives différentes. Techniques : **prompts différents** (chaque agent reçoit un framing distinct : optimiste, pessimiste, technique, business), **températures différentes** (0.3 pour l'agent conservateur, 0.9 pour l'agent créatif), **rôles distincts** (avocat du diable, avocat de la proposition, analyste neutre), **données d'entrée partielles** (chaque agent voit un sous-ensemble différent du contexte). Sans diversité, le consensus amplifie les biais plutôt que de les corriger.

6. **Résoudre les deadlocks** — En cas d'égalité parfaite : **(a) tiebreaker par règle** : l'option la plus conservatrice/sûre gagne, **(b) moderator agent** : un agent supplémentaire est invoqué avec le dossier complet pour trancher, **(c) escalation humaine** : le choix est présenté à un humain avec les arguments pro/contra de chaque option, **(d) random avec logging** : dernier recours, documenté explicitement. Évite les deadlocks en choisissant un nombre impair d'agents votants.

7. **Valider le consensus et gérer la minorité** — Après le vote : vérifier la **cohérence interne** (le résultat est-il compatible avec les faits connus ?), générer un **minority report** (documenter les arguments de la minorité perdante), **logger les dissenting opinions** (elles peuvent être précieuses pour le debugging futur), et calculer un **consensus strength score** (ratio de votes pour le gagnant / total votes).

```python
def validate_consensus(votes: list[str], winner: str) -> dict:
    total = len(votes)
    winner_count = votes.count(winner)
    minority = [v for v in set(votes) if v != winner]
    return {
        "winner": winner,
        "consensus_strength": winner_count / total,
        "is_strong": winner_count / total >= 0.66,
        "minority_options": minority,
        "minority_count": total - winner_count,
        "requires_review": winner_count / total < 0.51
    }
```

8. **Implémenter techniquement** — Calls LLM parallèles avec `asyncio.gather` pour minimiser la latence. Chaque agent est un prompt distinct avec un rôle clair. Agrège les résultats avec les fonctions de vote ci-dessus. Pour les agents avec des prompts différents, utilise une factory : `create_agent(role="pessimist", temperature=0.3)`. Framework : LangGraph (nodes parallèles + aggregation node), LangChain (LCEL parallel branches), AutoGen (GroupChat avec prompts distincts).

9. **Optimiser les coûts** — Le consensus est coûteux (N appels LLM). Stratégies d'optimisation : **progressive escalation** (commencer avec 2 agents, escalader à 5 seulement si désaccord), **lightweight preliminary vote** (premier vote avec un modèle petit/rapide, débat complet seulement si pas de consensus), **caching** (si la même question a déjà obtenu un consensus fort, réutiliser), **scoring de nécessité** (déclencher le consensus complet uniquement si `uncertainty_score > 0.6`).

```python
async def adaptive_consensus(agents_pool: list, question: str, options: list) -> dict:
    # D'abord essayer avec 2 agents
    quick_result = await run_vote(agents_pool[:2], question, options)
    if quick_result["consensus_strength"] >= 0.9:
        return {**quick_result, "method": "quick_consensus"}
    # Escalade à N agents si pas de consensus fort
    full_result = await run_debate(agents_pool, question, options)
    return {**full_result, "method": "full_debate"}
```

10. **Maintenir un audit trail** — Chaque session de consensus doit produire un log structuré : `question`, `options`, `agents` (avec leurs rôles et configurations), `rounds` (arguments et votes à chaque round), `final_result` (gagnant, scores, méthode), `dissenting_opinions` (arguments de la minorité), `consensus_strength`, `timestamp`, `duration_ms`. Stocke ces logs pour analyse des patterns de désaccord et amélioration des prompts.

## Anti-patterns

- **Utiliser le consensus pour des faits vérifiables** — Si la question a une réponse factuelle (date, calcul, donnée de référence), le consensus ne fait qu'amplifier les hallucinations collectives. Cherche simplement la réponse avec les bons outils.
- **Tous les agents avec le même prompt** — Un consensus entre agents identiques ne produit pas de diversité d'opinion, juste de la redondance coûteuse. Chaque agent doit avoir un rôle, un framing ou une température distincts.
- **Ignorer les opinions minoritaires** — Les arguments de la minorité contiennent souvent des risques ou des nuances importants. Log toujours les dissenting opinions et présente-les dans le résultat.
- **Trop de rounds de délibération** — Un débat de plus de 3 rounds converge rarement vers de nouvelles informations et augmente exponentiellement les coûts. Limite à 2–3 rounds maximum.

## Règles

1. **Diversité obligatoire** — Un consensus multi-agents n'est valide que si les agents ont des perspectives distinctes (prompts, températures, rôles ou données d'entrée différents). Sinon, utilise un seul agent.
2. **Toujours produire un minority report** — Même quand le consensus est fort, documenter les arguments perdants. Ils peuvent révéler des risques non pris en compte par la majorité.
3. **Définir le seuil de consensus avant le vote** — Décide a priori si le gagnant doit atteindre 51%, 66% ou 100% des votes. Ne pas ajuster le seuil après avoir vu les résultats.
4. **Documente le trade-off coût/fiabilité** — Chaque agent supplémentaire réduit la variance mais multiplie les coûts. Justifie explicitement le nombre d'agents choisi dans la documentation de l'architecture.
5. **Adapte au framework** — LangGraph : nodes parallèles + conditional aggregation. AutoGen : GroupChat avec `speaker_selection="round_robin"`. CrewAI : crew avec agents aux rôles distincts. Custom : `asyncio.gather` + fonctions d'agrégation.
