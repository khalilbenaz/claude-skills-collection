---
name: ai-workflow-orchestrator
description: Orchestration de workflows IA complexes avec chaînes et pipelines. Se déclenche avec "workflow IA", "LangChain", "LangGraph", "pipeline IA", "chaîne de prompts", "orchestration LLM", "AI pipeline", "multi-step AI".
---

# AI Workflow Orchestrator

## Critères de décision : quel framework choisir ?

| Complexité | Pattern | Framework recommandé |
|---|---|---|
| 1–3 étapes linéaires | Séquentiel simple | Python natif ou LCEL |
| Fan-out / fan-in sans état | Parallèle sans mémoire | LCEL `RunnableParallel` |
| Boucles, conditions, état persistant | Agent / cycle | **LangGraph** |
| RAG + retrieval hybride | Search pipeline | Haystack |
| Stack Azure / .NET | Intégration Microsoft | Semantic Kernel |
| Contrôle total, zéro dépendance | Custom | Script async pur |

> Règle d'or : n'ajouter un framework que quand la complexité le justifie. 50 lignes de Python natif > architecture LangGraph mal comprise.

---

## Workflow en étapes

### 1. Décomposer en DAG avant de coder

Identifier pour chaque étape : input attendu, output produit, dépendances. Dessiner un DAG — économise des heures de débogage.

```
Pipeline d'analyse de document :
[Chargement] → [Extraction] ─┬─ [Résumé]      ─┐
                               ├─ [Entités NER]  ├─ [Rapport final]
                               └─ [Sentiment]   ─┘
```

Questions à poser : quelles étapes sont **indépendantes** (candidats au parallélisme) ? Quelles étapes nécessitent un **état partagé** ? Y a-t-il des **points de décision** conditionnels ?

---

### 2. Implémenter les patterns de chaînes

**Séquentiel (LCEL `|` operator)**
```python
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")
pipeline = extract_prompt | llm | parse_output | report_prompt | llm
result = pipeline.invoke({"document": text})
```

**Parallèle (fan-out / fan-in)**
```python
from langchain_core.runnables import RunnableParallel

parallel = RunnableParallel({
    "summary":   summarize_prompt | llm,
    "entities":  extract_prompt   | llm,
    "sentiment": sentiment_prompt | llm,
})
full = parallel | merge_results | report_prompt | llm
result = full.invoke({"document": text})
```

**Map-Reduce (N documents)**
```python
from langchain_core.runnables import RunnableLambda
import asyncio

async def map_reduce(docs: list[str]) -> str:
    summaries = await asyncio.gather(*[
        summarize_chain.ainvoke({"text": d}) for d in docs
    ])
    return await aggregate_chain.ainvoke({"summaries": summaries})
```

---

### 3. Gérer l'état avec LangGraph

Définir un `TypedDict` typé qui circule à travers tous les nœuds. Chaque nœud retourne uniquement les champs qu'il modifie (merge partiel).

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

class WorkflowState(TypedDict):
    document: str
    summary: str
    entities: list[str]
    report: str
    error: str | None
    step: str

def summarize_node(state: WorkflowState) -> dict:
    summary = summarize_chain.invoke({"text": state["document"]})
    return {"summary": summary, "step": "summarized"}

def route_after_summary(state: WorkflowState) -> str:
    if state.get("error"):
        return "handle_error"
    return "extract_entities"

graph = StateGraph(WorkflowState)
graph.add_node("summarize", summarize_node)
graph.add_node("extract_entities", entities_node)
graph.add_node("handle_error", error_node)
graph.set_entry_point("summarize")
graph.add_conditional_edges("summarize", route_after_summary)
graph.add_edge("extract_entities", END)
app = graph.compile()
```

---

### 4. Error handling, retry et checkpoints

**Retry par nœud (erreurs transitoires)**
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def call_llm_with_retry(prompt: str) -> str:
    return llm.invoke(prompt)
```

**Fallback chain (modèle de secours)**
```python
primary   = ChatOpenAI(model="gpt-4o")
fallback  = ChatOpenAI(model="gpt-4o-mini")
safe_llm  = primary.with_fallbacks([fallback])
```

**Checkpoints LangGraph (reprise après crash)**
```python
from langgraph.checkpoint.sqlite import SqliteSaver

checkpointer = SqliteSaver.from_conn_string("checkpoints.db")
app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["send_email"],   # pause avant action irréversible
)

config = {"configurable": {"thread_id": "run-001"}}
app.invoke(initial_state, config)     # déclenche, s'arrête avant send_email
# ... approbation humaine ...
app.invoke(None, config)              # reprend depuis le checkpoint
```

---

### 5. Observabilité : tracer chaque nœud

**LangSmith (natif, 0 code supplémentaire)**
```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY="ls_..."
export LANGCHAIN_PROJECT="my-workflow"
# Toutes les exécutions sont automatiquement tracées
```

**Phoenix / Arize (open-source)**
```python
import phoenix as px
from phoenix.otel import register
tracer_provider = register(project_name="my-workflow", endpoint="http://localhost:6006/v1/traces")
```

**Métriques à surveiller**
- Latence par nœud > 30 s → alerte
- Coût par run > $0.10 → alerte
- Taux d'erreur par nœud > 5 % → alerte
- Tokens totaux / run → suivi budget

---

### 6. Optimiser latence et coût

**Async pour les branches parallèles**
```python
import asyncio

async def parallel_analysis(doc: str) -> dict:
    summary, entities = await asyncio.gather(
        summarize_chain.ainvoke({"text": doc}),
        extract_chain.ainvoke({"text": doc}),
    )
    return {"summary": summary, "entities": entities}
```

**Prompt caching Anthropic (économie ~90 % sur les tokens en cache)**
```python
from anthropic import Anthropic

client = Anthropic()
response = client.messages.create(
    model="claude-opus-4-5",
    system=[{"type": "text", "text": long_system_prompt,
             "cache_control": {"type": "ephemeral"}}],
    messages=[{"role": "user", "content": user_query}],
    max_tokens=1024,
)
```

**Batch API OpenAI (-50 % coût, latence différée acceptable)**
```python
# Soumettre un batch de requêtes indépendantes
client.batches.create(
    input_file_id=file_id,
    endpoint="/v1/chat/completions",
    completion_window="24h",
)
```

---

### 7. Exposer le workflow comme service

```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import uuid

app = FastAPI()

class WorkflowRequest(BaseModel):
    document: str
    webhook_url: str | None = None

@app.post("/workflows/analyze")
async def trigger(req: WorkflowRequest, bg: BackgroundTasks):
    run_id = str(uuid.uuid4())
    bg.add_task(run_workflow_async, run_id, req.document, req.webhook_url)
    return {"run_id": run_id, "status": "queued"}

@app.get("/workflows/{run_id}")
async def status(run_id: str):
    return await get_run_status(run_id)
```

Pour la scalabilité : Celery + Redis pour les workloads batch, Docker + Kubernetes pour le déploiement, LangGraph Platform pour un déploiement managé avec UI.

---

## Anti-patterns et garde-fous

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| Sur-ingénierie dès le départ | LangGraph pour 2 appels LLM | Commencer avec LCEL ou Python natif |
| Nœuds non testables isolément | Impossible à déboguer | Interface input/output claire + test unitaire par nœud |
| Pas de checkpoints | Crash à l'étape 9 = tout recommencer | `SqliteSaver` ou `PostgresSaver` dès la phase dev |
| État mutable partagé sans verrou | Race condition en async | TypedDict immutable, retourner un dict partiel |
| Pas de timeout par nœud | Un nœud bloqué immobilise tout le workflow | `asyncio.wait_for(node(), timeout=30)` |
| Loguer uniquement les erreurs | Debug impossible en prod | Logger l'état complet à chaque transition (JSON structuré) |
| Pas de limite de coût | Un bug boucle indéfiniment | Compteur de tokens cumulés + guard dans la condition de sortie |
| Human-in-the-loop absent sur actions irréversibles | Email envoyé, paiement débité par erreur | `interrupt_before` sur tout nœud à effet de bord externe |

---

## Bonnes pratiques 2026

- **Contract-first** : définir le `TypedDict` d'état avant d'écrire les nœuds ; le schéma est la documentation vivante du workflow.
- **Idempotence** : chaque nœud doit pouvoir être rejoué sans effet de bord (clé de déduplication, upsert plutôt qu'insert).
- **SLA par nœud** : timeout, budget tokens, nombre max de retries — explicites dans le code, pas implicites.
- **Feature flags** : activer/désactiver des branches du workflow en production sans redéploiement.
- **Versioning d'état** : quand le schéma `TypedDict` change, migrer les checkpoints existants (`state_schema_version` dans l'état).
- **Tests de régression** : capturer des traces LangSmith réelles, les rejouer en CI pour détecter les dérives de comportement LLM.
