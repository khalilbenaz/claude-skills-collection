---
name: agent-pipeline-composer
description: Composition de pipelines de sous-agents où la sortie d'un agent alimente l'entrée du suivant. Se déclenche avec "pipeline agent", "chaîne d'agents", "agent chain", "agent pipeline", "sequential agents", "workflow agents", "ETL agent", "agent DAG", "composer agents".
---

# Agent Pipeline Composer

## Quand utiliser ce skill

Utiliser ce skill lorsqu'une tâche complexe doit être décomposée en étapes séquentielles ou parallèles, chaque étape étant assurée par un sous-agent spécialisé dont le résultat alimente directement l'étape suivante. Ce skill est adapté aux workflows de type ETL (Extract-Transform-Load), aux pipelines de traitement de contenu (recherche → analyse → rédaction → révision) et à toute architecture où les dépendances entre étapes forment un graphe orienté acyclique (DAG). Il est également pertinent pour les systèmes où la reprise sur erreur en cours de pipeline est critique.

## Workflow

1. **Conception du pipeline** — Choisir la topologie adaptée à la tâche : `linear` (chaîne séquentielle A→B→C), `DAG` (graphe avec dépendances multiples), `conditional branch` (if/else selon le résultat d'un stage), `loop` (itérer jusqu'à satisfaction d'un critère), `map-reduce` (fan-out vers N agents, fan-in pour agréger).

2. **Définition des stages** — Chaque stage est un sous-agent avec un schéma d'entrée et de sortie défini explicitement (types, format, champs obligatoires). La définition du schéma est le contrat entre les stages ; un schéma flou est la principale source de bugs de pipeline.

3. **Data flow** — Définir les transformations entre les stages : mapping des champs de sortie vers les champs d'entrée, transformations intermédiaires (parsing, filtrage, enrichissement), validation du format avant transmission au stage suivant.

4. **Stages parallèles** — Implémenter le fan-out (distribuer le même input à N agents en parallèle) et le fan-in (attendre la complétion de tous les agents parallèles et agréger leurs sorties avant de continuer). Utiliser `asyncio.gather` ou équivalent.

5. **Conditional branching** — Après un stage de décision, router vers différentes branches du pipeline selon le résultat. Implémenter `switch/case` sur les sorties des agents pour une logique de branchement lisible et extensible.

6. **Error handling par stage** — Chaque stage définit sa propre politique d'erreur : `retry` (relancer le stage), `skip` (passer au stage suivant avec une valeur par défaut), `default_value` (injecter une valeur de remplacement), `pipeline_abort` (arrêter tout), `partial_completion` (continuer avec les données disponibles).

7. **Checkpoint et resumability** — Persister l'état du pipeline après chaque stage complété (fichier JSON, base de données, Redis). En cas de crash, reprendre à partir du dernier checkpoint valide sans ré-exécuter les stages déjà terminés.

8. **Stream processing** — Pour les pipelines à haute performance, ne pas attendre la complétion totale d'un stage avant d'alimenter le suivant. Utiliser des générateurs Python ou des queues asyncio pour faire transiter les tokens ou les chunks au fil de leur production.

9. **Pipeline versioning** — Versionner les définitions de pipeline (v1, v2, v3). Permettre l'A/B testing entre deux versions de pipeline sur un même jeu de données. Implémenter le rollback vers une version stable en cas de régression.

10. **Monitoring** — Mesurer la latence par stage pour identifier les goulots d'étranglement. Calculer le throughput global du pipeline. Visualiser le flux sous forme de graphe avec les états en temps réel (pending, running, done, failed).

```python
# Exemple d'implémentation Python — Pipeline Composer avec DAG, checkpoints et streaming
import asyncio
import json
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Optional
from pathlib import Path
from enum import Enum


class StageStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"


class ErrorPolicy(Enum):
    RETRY = "retry"
    SKIP = "skip"
    DEFAULT_VALUE = "default_value"
    ABORT = "abort"
    PARTIAL = "partial"


@dataclass
class StageResult:
    stage_id: str
    status: StageStatus
    output: Any = None
    error: Optional[str] = None
    latency_s: float = 0.0
    started_at: float = field(default_factory=time.time)


@dataclass
class StageDefinition:
    id: str
    name: str
    agent_fn: Callable           # fonction async qui exécute le sous-agent
    depends_on: list[str] = field(default_factory=list)  # IDs des stages précédents
    error_policy: ErrorPolicy = ErrorPolicy.RETRY
    default_value: Any = None
    timeout_seconds: float = 60.0
    input_mapping: dict = field(default_factory=dict)  # output_key → input_key


class PipelineCheckpoint:
    def __init__(self, run_id: str, checkpoint_dir: str = "/tmp/pipeline_checkpoints"):
        self.run_id = run_id
        self.path = Path(checkpoint_dir) / f"{run_id}.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.state: dict[str, StageResult] = {}
        self._load()

    def _load(self):
        if self.path.exists():
            raw = json.loads(self.path.read_text())
            self.state = {
                k: StageResult(
                    stage_id=v["stage_id"],
                    status=StageStatus(v["status"]),
                    output=v.get("output"),
                    error=v.get("error"),
                    latency_s=v.get("latency_s", 0),
                )
                for k, v in raw.items()
            }
            print(f"[CHECKPOINT] Reprise depuis checkpoint — {len(self.state)} stages restaurés")

    def save(self, result: StageResult):
        self.state[result.stage_id] = result
        serializable = {
            k: {
                "stage_id": v.stage_id,
                "status": v.status.value,
                "output": v.output,
                "error": v.error,
                "latency_s": v.latency_s,
            }
            for k, v in self.state.items()
        }
        self.path.write_text(json.dumps(serializable, indent=2, default=str))

    def is_completed(self, stage_id: str) -> bool:
        return (
            stage_id in self.state
            and self.state[stage_id].status == StageStatus.DONE
        )

    def get_output(self, stage_id: str) -> Any:
        return self.state.get(stage_id, StageResult(stage_id, StageStatus.PENDING)).output


class PipelineComposer:
    def __init__(self, pipeline_id: str, version: str = "v1"):
        self.pipeline_id = pipeline_id
        self.version = version
        self.stages: dict[str, StageDefinition] = {}
        self.results: dict[str, StageResult] = {}

    def add_stage(self, stage: StageDefinition) -> "PipelineComposer":
        self.stages[stage.id] = stage
        return self  # fluent interface

    def _resolve_input(self, stage: StageDefinition) -> dict:
        """Construire l'input d'un stage depuis les outputs des stages précédents."""
        resolved = {}
        for dep_id in stage.depends_on:
            dep_output = self.results.get(dep_id, StageResult(dep_id, StageStatus.PENDING)).output
            if isinstance(dep_output, dict):
                resolved.update(dep_output)
            else:
                resolved[dep_id] = dep_output
        # Appliquer le mapping explicite
        for out_key, in_key in stage.input_mapping.items():
            if out_key in resolved:
                resolved[in_key] = resolved.pop(out_key)
        return resolved

    async def _run_stage(
        self,
        stage: StageDefinition,
        checkpoint: PipelineCheckpoint
    ) -> StageResult:
        # Skip si déjà complété (reprise depuis checkpoint)
        if checkpoint.is_completed(stage.id):
            print(f"[SKIP] Stage '{stage.id}' déjà complété — skip")
            return checkpoint.state[stage.id]

        input_data = self._resolve_input(stage)
        start = time.time()
        result = StageResult(stage_id=stage.id, status=StageStatus.RUNNING)

        try:
            output = await asyncio.wait_for(
                stage.agent_fn(**input_data),
                timeout=stage.timeout_seconds
            )
            result.status = StageStatus.DONE
            result.output = output
        except Exception as e:
            result.error = str(e)
            print(f"[ERROR] Stage '{stage.id}' échoué: {e}")

            if stage.error_policy == ErrorPolicy.ABORT:
                result.status = StageStatus.FAILED
                raise
            elif stage.error_policy == ErrorPolicy.SKIP:
                result.status = StageStatus.SKIPPED
                result.output = None
            elif stage.error_policy == ErrorPolicy.DEFAULT_VALUE:
                result.status = StageStatus.DONE
                result.output = stage.default_value
            elif stage.error_policy == ErrorPolicy.PARTIAL:
                result.status = StageStatus.DONE
                result.output = {"partial": True, "error": str(e)}

        result.latency_s = time.time() - start
        self.results[stage.id] = result
        checkpoint.save(result)
        print(f"[STAGE] '{stage.id}' → {result.status.value} ({result.latency_s:.2f}s)")
        return result

    def _topological_sort(self) -> list[list[str]]:
        """Retourner les stages groupés par niveau de parallélisme."""
        in_degree = {sid: 0 for sid in self.stages}
        for stage in self.stages.values():
            for dep in stage.depends_on:
                in_degree[stage.id] = in_degree.get(stage.id, 0) + 1

        levels = []
        remaining = set(self.stages.keys())
        completed = set()

        while remaining:
            ready = [
                sid for sid in remaining
                if all(dep in completed for dep in self.stages[sid].depends_on)
            ]
            if not ready:
                raise ValueError("Cycle détecté dans le DAG du pipeline")
            levels.append(ready)
            completed.update(ready)
            remaining -= set(ready)

        return levels

    async def run(self, run_id: str = None) -> dict[str, StageResult]:
        """Exécuter le pipeline avec parallélisme et reprise depuis checkpoint."""
        run_id = run_id or f"{self.pipeline_id}-{int(time.time())}"
        checkpoint = PipelineCheckpoint(run_id)

        print(f"[PIPELINE] Démarrage {self.pipeline_id} ({self.version}) — run_id={run_id}")
        levels = self._topological_sort()

        for level_idx, level_stages in enumerate(levels):
            print(f"[LEVEL {level_idx}] Stages parallèles: {level_stages}")
            tasks = [
                self._run_stage(self.stages[sid], checkpoint)
                for sid in level_stages
            ]
            await asyncio.gather(*tasks)

        print(f"[PIPELINE] Terminé — {len(self.results)} stages exécutés")
        return self.results

    def bottleneck_report(self) -> list[dict]:
        """Identifier les goulots d'étranglement."""
        return sorted(
            [{"stage": sid, "latency_s": r.latency_s} for sid, r in self.results.items()],
            key=lambda x: x["latency_s"],
            reverse=True,
        )


# Usage — Pipeline de traitement de contenu
async def research_agent(topic: str) -> dict:
    await asyncio.sleep(0.1)  # simuler l'appel LLM
    return {"raw_research": f"Résultats de recherche sur: {topic}", "sources": 5}

async def analysis_agent(raw_research: str, sources: int) -> dict:
    await asyncio.sleep(0.1)
    return {"analysis": f"Analyse de: {raw_research[:50]}...", "confidence": 0.87}

async def writing_agent(analysis: str, confidence: float) -> dict:
    await asyncio.sleep(0.1)
    return {"draft": f"Article basé sur: {analysis[:50]}...", "words": 500}

async def review_agent(draft: str) -> dict:
    await asyncio.sleep(0.05)
    return {"final": draft, "approved": True, "revision_count": 1}


async def main():
    pipeline = PipelineComposer("content-pipeline", version="v2")
    
    (pipeline
        .add_stage(StageDefinition(
            id="research", name="Recherche", agent_fn=research_agent,
            depends_on=[], timeout_seconds=30,
            input_mapping={}
        ))
        .add_stage(StageDefinition(
            id="analysis", name="Analyse", agent_fn=analysis_agent,
            depends_on=["research"], timeout_seconds=45,
        ))
        .add_stage(StageDefinition(
            id="writing", name="Rédaction", agent_fn=writing_agent,
            depends_on=["analysis"], timeout_seconds=60,
        ))
        .add_stage(StageDefinition(
            id="review", name="Révision", agent_fn=review_agent,
            depends_on=["writing"], timeout_seconds=30,
            error_policy=ErrorPolicy.DEFAULT_VALUE,
            default_value={"final": "Article non révisé", "approved": False},
        ))
    )

    # Injecter l'input initial dans le premier stage
    pipeline.stages["research"].agent_fn = lambda: research_agent("intelligence artificielle")
    
    results = await pipeline.run(run_id="content-run-001")
    print("\n=== Rapport de bottlenecks ===")
    for item in pipeline.bottleneck_report():
        print(f"  {item['stage']}: {item['latency_s']:.3f}s")
```

```
Architecture — Pipeline Composer (DAG)

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
    (si confidence>0.8) (si confidence<=0.8)
            │
    Checkpoint ──► JSON sur disque
            │
          Output

  Chaque flèche = data flow (output → input mapping)
  Chaque stage = agent indépendant avec timeout et error policy
```

**Comparaison LangGraph vs CrewAI vs Custom :**

| Critère | LangGraph | CrewAI | Custom Python |
|---|---|---|---|
| DAG natif | Oui (StateGraph) | Non (séquentiel) | asyncio.gather |
| Checkpoints | Oui (built-in) | Non | Manuel (JSON/Redis) |
| Conditional branching | Oui (edges) | Limité | Manuel |
| Stream processing | Oui (streaming) | Non | asyncio generators |
| Pipeline versioning | Non | Non | Manuel |
| Bottleneck detection | Non | Non | Manuel |

## Anti-patterns

- **Pipeline sans checkpoint** — Un pipeline de 10 stages qui crashe au stage 9 et recommence depuis le début est un gaspillage coûteux. Les checkpoints sont non-négociables pour les pipelines longs.
- **Pas de validation entre les stages** — Transmettre un output malformé au stage suivant sans validation produit des erreurs cryptiques difficiles à déboguer. Valider le schéma de sortie à chaque frontière entre stages.
- **Stage trop couplé au précédent** — Un stage qui suppose un format d'entrée très spécifique est difficile à réutiliser et à tester isolément. Définir des schémas d'interface clairs et utiliser le mapping explicite.
- **Pas de timeout par stage** — Un stage qui tourne indéfiniment bloque tout le pipeline. Chaque stage doit avoir un timeout configuré, avec une politique d'erreur explicite pour le cas dépassement.

## Règles

1. **Chaque stage doit avoir un schéma d'entrée et de sortie explicitement documenté** — c'est le contrat du pipeline ; tout changement de schéma doit être versionné.
2. **Toujours implémenter des checkpoints** après chaque stage complété pour permettre la reprise sans ré-exécution des stages réussis.
3. **Les stages sans dépendances communes doivent s'exécuter en parallèle** (fan-out) pour minimiser la latence totale du pipeline.
4. **Chaque stage définit sa propre politique d'erreur** — le pipeline ne doit pas avoir une politique globale unique ; certains stages sont critiques (abort), d'autres sont optionnels (skip avec default_value).
5. **Mesurer et exposer la latence par stage** pour identifier les goulots d'étranglement et décider où investir en optimisation (cache, modèle plus rapide, parallélisation).
