---
name: agent-pipeline-composer
description: Composition de pipelines de sous-agents où la sortie d'un agent alimente l'entrée du suivant. Se déclenche avec "pipeline agent", "chaîne d'agents", "agent chain", "agent pipeline", "sequential agents", "workflow agents", "ETL agent", "agent DAG", "composer agents". Also triggers on "chain agents", "output of one agent into another".
---

# Agent Pipeline Composer

## Quand utiliser ce skill

Ce skill est adapté lorsqu'une tâche complexe doit être décomposée en étapes séquentielles ou parallèles, chaque étape étant assurée par un sous-agent spécialisé dont le résultat alimente directement l'étape suivante.

**Cas d'usage typiques :**
- Pipelines ETL : Extract (scraping/API) → Transform (parsing/enrichissement) → Load (DB/fichier)
- Traitement de contenu : Recherche → Analyse → Rédaction → Révision → Publication
- Qualification de leads : Enrichissement → Scoring → Segmentation → Routage CRM
- Traitement de documents : OCR → NLP → Extraction → Validation → Stockage

**Ne pas utiliser si :** les étapes n'ont pas de dépendances de données entre elles (utiliser un pool d'agents parallèles indépendants à la place).

---

## Étapes de conception

### 1. Choisir la topologie

| Topologie | Quand l'utiliser | Structure |
|---|---|---|
| `linear` | Étapes strictement séquentielles, chaque output = input du suivant | A → B → C |
| `DAG` | Dépendances multiples, parallélisme possible | A → (B ‖ C) → D |
| `conditional branch` | Routing selon le résultat d'une étape | A → if X then B else C |
| `map-reduce` | Même traitement sur N items, puis agrégation | A → [B₁‖B₂‖B₃] → C |
| `loop` | Itérer jusqu'à un critère de satisfaction (qualité, score) | A → B → if OK then fin else A |

### 2. Définir les schémas d'interface

**Chaque stage** doit avoir un contrat explicite. C'est la source n°1 de bugs quand il est flou.

```python
from pydantic import BaseModel

class ResearchOutput(BaseModel):
    raw_text: str
    sources: list[str]
    confidence: float  # 0.0 – 1.0

class AnalysisInput(BaseModel):
    raw_text: str       # mappé depuis ResearchOutput.raw_text
    sources: list[str]  # mappé depuis ResearchOutput.sources

class AnalysisOutput(BaseModel):
    summary: str
    key_points: list[str]
    confidence: float
```

Valider à chaque frontière entre stages (`model.model_validate(output_dict)`) — erreur de parsing = bug de mapping attrapé immédiatement, pas deux stages plus loin.

### 3. Implémenter le data flow

Définir le mapping explicite `output_key → input_key` quand les noms diffèrent entre stages :

```python
StageDefinition(
    id="analysis",
    depends_on=["research"],
    input_mapping={"raw_text": "text", "sources": "refs"},  # renommage
)
```

### 4. Parallélisme (fan-out / fan-in)

```python
# Fan-out : lancer B et C en parallèle dès que A est terminé
results = await asyncio.gather(
    run_stage(stage_b, input=stage_a_output),
    run_stage(stage_c, input=stage_a_output),
)
# Fan-in : D reçoit les outputs de B ET C
stage_d_input = merge(results[0], results[1])
```

Règle : tout stage dont toutes les dépendances sont disponibles **doit** être lancé en parallèle.

### 5. Conditional branching

```python
async def route(analysis_output: AnalysisOutput) -> str:
    if analysis_output.confidence > 0.8:
        return "review"       # → stage review complet
    else:
        return "fast_publish" # → publication directe sans review

next_stage_id = await route(output)
await run_stage(stages[next_stage_id], input=output)
```

### 6. Error handling par stage

Chaque stage définit sa politique individuellement — pas de politique globale unique :

| Politique | Quand l'utiliser |
|---|---|
| `RETRY` (3x, backoff exp.) | Stage LLM flaky, appel API temporairement indisponible |
| `SKIP` | Stage optionnel (enrichissement, traduction) |
| `DEFAULT_VALUE` | Stage non-critique avec valeur de repli acceptable |
| `ABORT` | Stage critique sans lequel le pipeline n'a aucun sens |
| `PARTIAL` | Stage qui peut retourner un résultat incomplet utilisable |

```python
# Retry avec backoff exponentiel
async def run_with_retry(fn, max_retries=3, base_delay=1.0):
    for attempt in range(max_retries):
        try:
            return await fn()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(base_delay * (2 ** attempt))
```

### 7. Checkpoints et reprise

**Non-négociable** pour tout pipeline de plus de 3 stages ou dont l'exécution dépasse 30 secondes.

```python
import json
from pathlib import Path

class Checkpoint:
    def __init__(self, run_id: str, path: str = "/tmp/pipeline"):
        self.path = Path(path) / f"{run_id}.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.state: dict = json.loads(self.path.read_text()) if self.path.exists() else {}

    def is_done(self, stage_id: str) -> bool:
        return self.state.get(stage_id, {}).get("status") == "done"

    def save(self, stage_id: str, output: dict):
        self.state[stage_id] = {"status": "done", "output": output}
        self.path.write_text(json.dumps(self.state, indent=2, default=str))

    def get_output(self, stage_id: str) -> dict:
        return self.state[stage_id]["output"]

# Dans l'exécuteur :
if checkpoint.is_done(stage.id):
    print(f"[SKIP] {stage.id} déjà complété — reprise depuis checkpoint")
    return checkpoint.get_output(stage.id)
```

### 8. Stream processing (pipelines haute performance)

Ne pas attendre la complétion totale d'un stage avant d'alimenter le suivant :

```python
# Générateur : le stage aval reçoit les chunks au fil de leur production
async def streaming_pipeline(items: list):
    async def producer():
        for item in items:
            result = await process_item(item)
            yield result

    async for chunk in producer():
        await consumer_stage(chunk)
```

Pertinent pour : génération de texte LLM token-by-token, traitement de fichiers volumineux ligne par ligne.

### 9. Versioning du pipeline

```python
PIPELINE_VERSIONS = {
    "v1": build_pipeline_v1,
    "v2": build_pipeline_v2,  # nouvelle version avec stage supplémentaire
}

# A/B test : 20% du trafic sur v2
import random
version = "v2" if random.random() < 0.2 else "v1"
pipeline = PIPELINE_VERSIONS[version]()
```

Toujours nommer les runs avec la version : `run_id = f"{pipeline_id}-{version}-{timestamp}`.

### 10. Monitoring et détection des goulots

```python
def bottleneck_report(results: dict[str, StageResult]) -> None:
    sorted_stages = sorted(results.items(), key=lambda x: x[1].latency_s, reverse=True)
    print("\n=== Bottlenecks ===")
    for stage_id, result in sorted_stages:
        bar = "█" * int(result.latency_s * 10)
        print(f"  {stage_id:20s} {result.latency_s:6.2f}s  {bar}")
```

Métriques clés à exposer : latence par stage, throughput global (items/s), taux d'erreur par stage, nombre de retries.

---

## Architecture DAG — Diagramme de référence

```
  Input ──► [Stage A: Research]
                    │
            ┌───────┴───────┐   ← fan-out (parallèle)
            ▼               ▼
    [Stage B: Analysis] [Stage C: Translate]
            │               │
            └───────┬───────┘   ← fan-in (attendre les 2)
                    │
            [Stage D: Writing]
                    │
            ┌───────┴───────┐   ← conditional branch
            ▼               ▼
    [Stage E: Review]  [Stage F: FastPublish]
    (confidence>0.8)   (confidence≤0.8)
            │
    Checkpoint ──► JSON / Redis
            │
          Output

  Chaque flèche = data flow (output → input mapping)
  Chaque stage = agent indépendant avec timeout + error policy
```

---

## Comparaison LangGraph vs CrewAI vs Custom Python

| Critère | LangGraph | CrewAI | Custom asyncio |
|---|---|---|---|
| DAG natif | Oui (StateGraph) | Non (séquentiel) | `asyncio.gather` |
| Checkpoints | Oui (built-in) | Non | Manuel (JSON/Redis) |
| Conditional branching | Oui (edges conditionnels) | Limité | Manuel |
| Stream processing | Oui | Non | Générateurs async |
| Overhead infra | Moyen | Faible | Nul |
| Courbe d'apprentissage | Élevée | Faible | Nulle |
| Pipeline versioning | Non | Non | Manuel |

**Recommandation 2026 :** LangGraph si le projet utilise déjà LangChain et nécessite des checkpoints natifs. Custom asyncio pour les pipelines simples (<6 stages) ou dans des projets sans dépendances LLM framework.

---

## Anti-patterns et pièges

- **Pipeline sans checkpoint** — Un pipeline de 10 stages qui crashe au stage 9 et recommence depuis zéro est un gaspillage coûteux et risqué. Checkpoints non-négociables dès 3+ stages ou 30+ secondes d'exécution.
- **Schémas d'interface flous** — Passer un `dict` générique entre stages sans valider le format produit des `KeyError` cryptiques trois stages plus loin. Utiliser Pydantic pour valider à chaque frontière.
- **Stage trop couplé** — Un stage qui suppose le format exact du précédent est impossible à tester isolément et à réutiliser. Définir des `InputModel`/`OutputModel` indépendants et un mapping explicite.
- **Pas de timeout par stage** — Un appel LLM qui ne répond plus bloque tout le pipeline. Chaque stage : `asyncio.wait_for(fn(), timeout=N)`.
- **Politique d'erreur globale** — `abort_on_any_error=True` est trop strict ; `ignore_all_errors=True` est trop permissif. Chaque stage doit avoir sa politique selon son caractère critique ou optionnel.
- **Fan-out oublié** — Exécuter en séquence des stages sans dépendances communes multiplie inutilement la latence. Toujours analyser le DAG pour identifier les niveaux parallélisables.
- **Logs insuffisants** — Sans `stage_id`, `run_id`, `latency_s` et `status` dans chaque log, le débogage en production est très difficile. Logger systématiquement ces 4 champs à chaque transition de stage.

---

## Règles non-négociables

1. **Schéma explicite à chaque frontière** — `InputModel` et `OutputModel` Pydantic pour chaque stage ; tout changement de schéma = bump de version du pipeline.
2. **Checkpoints après chaque stage** — Persistance sur disque ou Redis pour permettre la reprise sans ré-exécution des stages réussis.
3. **Parallélisme systématique** — Les stages dont toutes les dépendances sont disponibles s'exécutent en parallèle (`asyncio.gather`).
4. **Politique d'erreur par stage** — Jamais de politique globale unique ; chaque stage déclare `error_policy` selon son caractère critique.
5. **Timeout obligatoire** — `timeout_seconds` configuré sur chaque stage, jamais de `None` en production.
6. **Monitoring par stage** — Latence, statut et throughput exposés pour identifier les goulots d'étranglement et prioriser les optimisations.


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
