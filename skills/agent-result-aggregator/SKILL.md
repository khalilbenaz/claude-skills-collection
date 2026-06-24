---
name: agent-result-aggregator
description: Agrégation et synthèse des résultats de multiples sous-agents en un résultat cohérent. Se déclenche avec "agréger résultats", "fusionner résultats", "combiner outputs", "agent aggregator", "merge results", "synthèse multi-agent", "consolider résultats agents".
---

# Agent Result Aggregator

## Quand l'utiliser

| Situation | Pattern recommandé |
|---|---|
| Chaque agent couvre une partie distincte | Fusion complémentaire |
| Plusieurs agents traitent la même question | Déduplication + ranking |
| Les agents aboutissent à des conclusions différentes | Résolution de conflits |
| Un agent a échoué / timeout | Fallback sur résultats partiels |

---

## Workflow en 7 étapes

### 1. Définir le schéma de sortie avant tout

Spécifier le contrat du résultat final **avant** de lancer les sous-agents.

```python
from pydantic import BaseModel
from typing import Any

class AggregatedResult(BaseModel):
    summary: str
    details: dict[str, Any]
    sources: list[dict]      # {agent_id, confidence, status}
    confidence: float        # min des confidences individuelles, pas la moyenne
    conflicts_resolved: list[dict]
    metadata: dict           # nb_agents, success_rate, duration_ms
```

**Critère de décision :** si le schéma change après l'agrégation, l'étape est trop tardive.

---

### 2. Collecter en parallèle avec timeout strict

```python
import asyncio

async def collect(agents: list, timeout: int = 60) -> list:
    tasks = [asyncio.wait_for(a.get_result(), timeout=timeout) for a in agents]
    raw = await asyncio.gather(*tasks, return_exceptions=True)
    return [
        {"agent_id": agents[i].id, "status": "failed", "data": None, "confidence": 0.0}
        if isinstance(r, Exception)
        else {"agent_id": agents[i].id, "status": "complete", "data": r, "confidence": r.confidence}
        for i, r in enumerate(raw)
    ]
```

**Règle :** ne jamais bloquer sur un agent lent. Timeout = SLA de l'agent le plus lent × 1,5.

---

### 3. Valider et scorer chaque résultat

Catégories : `valid` · `partial` · `invalid` · `empty`

```python
def validate(result: dict, required_fields: list[str]) -> dict:
    if result["status"] == "failed":
        return {"category": "empty", "score": 0.0}
    data = result.get("data") or {}
    missing = [f for f in required_fields if f not in data]
    if missing:
        return {"category": "partial", "score": 0.4, "missing": missing}
    confidence_bonus = result.get("confidence", 0) * 0.3
    return {"category": "valid", "score": 0.7 + confidence_bonus}
```

Exclure les résultats `invalid` de l'agrégation. Inclure les `partial` avec flag explicite.

---

### 4. Déduplication

**Exact** (données structurées) : hash SHA-256 du JSON canonique.

```python
import hashlib, json

def dedup_exact(results: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for r in results:
        h = hashlib.sha256(json.dumps(r["data"], sort_keys=True).encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            out.append(r)
    return out
```

**Sémantique** (texte libre) : embeddings + seuil cosinus 0.92. Ne conserver que les résultats dont la similarité avec tous les éléments déjà gardés est < 0.92.

---

### 5. Résoudre les conflits

Choisir la stratégie selon le contexte :

| Stratégie | Quand l'utiliser |
|---|---|
| `voting` | 3+ agents, données factuelles binaires |
| `confidence` | Agents avec scores de confiance fiables |
| `llm_arbitration` | Résultats nuancés, texte, jugement qualitatif |
| `human_escalation` | Conflit critique, impact métier élevé |

```python
def resolve_conflict(field: str, candidates: list[tuple[float, Any]], strategy: str) -> Any:
    # candidates : [(confidence, value), ...]
    if strategy == "confidence":
        return max(candidates, key=lambda x: x[0])[1]
    if strategy == "voting":
        from collections import Counter
        return Counter(v for _, v in candidates).most_common(1)[0][0]
    if strategy == "llm_arbitration":
        prompt = f"Champ '{field}' — choisir la meilleure valeur parmi : {candidates}. Justifier."
        return llm.invoke(prompt)
    raise ValueError(f"human_escalation required for field={field}")
```

Documenter chaque conflit résolu dans `conflicts_resolved` pour l'audit.

---

### 6. Ranking et synthèse

**Scorer** chaque résultat :

```python
def score(result: dict, validation: dict) -> float:
    return (
        result.get("confidence", 0) * 0.4 +
        validation["score"]          * 0.4 +
        (1.0 if result["status"] == "complete" else 0.3) * 0.2
    )
```

**Synthèse LLM** (résultats textuels ou complexes) :

```python
def synthesize(ranked: list[dict], output_format: str) -> str:
    context = "\n\n".join(
        f"[Agent {r['agent_id']}, confiance={r['confidence']:.2f}]\n{r['data']}"
        for r in ranked[:5]  # Top 5 uniquement
    )
    return llm.invoke(
        f"Synthétise en un {output_format} cohérent. "
        f"Résous contradictions, élimine répétitions.\n\n{context}"
    )
```

**Confiance globale = min des confidences individuelles** (maillon le plus faible), pas la moyenne.

---

### 7. QA final + formatage

```python
def qa_check(result: AggregatedResult) -> list[str]:
    issues = []
    if not result.summary or len(result.summary) < 30:
        issues.append("Résumé absent ou trop court")
    if not result.sources:
        issues.append("Aucune attribution de source")
    if result.confidence < 0.3:
        issues.append("Confiance globale trop basse (< 0.3)")
    unresolved = [c for c in result.conflicts_resolved if not c.get("resolved")]
    if unresolved:
        issues.append(f"{len(unresolved)} conflit(s) non résolu(s)")
    return issues
```

Formats de sortie selon le consommateur :

| Mode | Usage |
|---|---|
| `json` | API, agent suivant dans le pipeline |
| `markdown` | Rapport humain |
| `summary_only` | Notification, résumé exécutif |

---

## Garde-fous / Anti-patterns

**Concaténer sans synthétiser** — empiler les outputs bruts produit un résultat redondant et incohérent. Toujours passer par une étape de déduplication + synthèse.

**Moyenne des confidences** — masque un agent peu fiable. Utiliser le minimum.

**Ignorer les conflits** — deux affirmations contradictoires dans l'output final invalident l'ensemble. Chaque conflit doit être résolu ET documenté.

**Résultat non auditable** — sans attribution `agent_id → information`, impossible de déboguer une erreur en production. Conserver le `SourceTracker` même en mode summary.

**Schema défini après l'agrégation** — conduit à reformater après coup et perd des informations. Définir le contrat en premier.

**Top-K trop grand** — passer 20 résultats au LLM de synthèse dilue le signal et explose les tokens. Limiter à 5-7 résultats triés.

---

## Checklist opérationnelle

```
[ ] Schéma AggregatedResult défini avant le lancement des agents
[ ] Timeout configuré par agent (pas global)
[ ] Résultats partiels inclus avec flag, pas ignorés
[ ] Déduplication appliquée avant résolution de conflits
[ ] Stratégie de conflit choisie et documentée
[ ] Confiance = min(confidences), pas moyenne
[ ] QA check exécuté avant livraison
[ ] Attribution source conservée dans le résultat final
```


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
