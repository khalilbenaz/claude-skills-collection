---
name: ai-workflow-orchestrator
description: Orchestration de workflows IA complexes avec chaînes et pipelines. Se déclenche avec "workflow IA", "LangChain", "LangGraph", "pipeline IA", "chaîne de prompts", "orchestration LLM", "AI pipeline", "multi-step AI".
---

# AI Workflow Orchestrator

## Workflow

1. **Décomposition du workflow** — Analyser la tâche complexe et la décomposer en étapes atomiques avec des inputs/outputs clairement définis. Identifier les **dépendances** (quelles étapes dépendent d'autres ?), les **opportunités de parallélisme** (étapes indépendantes pouvant s'exécuter simultanément), et les **points de décision** (conditions qui déterminent le chemin d'exécution). Créer un DAG (Directed Acyclic Graph) visuel avant de coder — économise des heures de débogage.

   ```
   Exemple : pipeline d'analyse de document
   [Chargement] → [Extraction info] ─┬─ [Résumé]      ─┐
                                      ├─ [Entités NER]  ├─ [Rapport final]
                                      └─ [Sentiment]   ─┘
   ```

2. **Choix du framework** — Évaluer selon la complexité : **LangChain LCEL** (chaînes simples à modérées, bonne DX, vaste écosystème), **LangGraph** (workflows avec état, cycles, conditions, agents — idéal pour les cas complexes), **Haystack** (orienté search/RAG, pipelines déclaratifs), **Semantic Kernel** (Microsoft, bien intégré avec Azure, .NET/Python), **custom** (contrôle total, zéro dépendance, recommandé pour les équipes expérimentées). Éviter la sur-ingénierie : un script Python avec des appels LLM séquentiels suffit souvent.

3. **Design des chaînes** — Implémenter les patterns selon le besoin : **Sequential** (A → B → C, pipeline linéaire), **Parallel** (A → [B || C || D] → E, fan-out/fan-in), **Conditional** (router selon le contenu de l'output), **Map-Reduce** (traiter N documents indépendamment, puis aggréger). Utiliser LCEL (`|` operator) pour la composition déclarative — chaque étape est une `Runnable` testable individuellement.

   ```python
   from langchain_core.runnables import RunnableParallel, RunnableLambda
   from langchain_openai import ChatOpenAI
   
   llm = ChatOpenAI(model="gpt-4o-mini")
   
   # Parallel : résumé + extraction en simultané
   parallel_chain = RunnableParallel({
       "summary": summarize_prompt | llm,
       "entities": extract_prompt | llm,
       "sentiment": sentiment_prompt | llm
   })
   
   # Sequential : analyse puis rapport
   full_pipeline = parallel_chain | merge_results | report_prompt | llm
   result = full_pipeline.invoke({"document": text})
   ```

4. **State management** — Définir un objet d'état global typé (TypedDict ou Pydantic) qui circule à travers le workflow. Chaque nœud lit l'état, effectue son traitement, et met à jour les champs pertinents. Avec **LangGraph**, l'état est automatiquement persisté à chaque nœud — permet le replay et la reprise après erreur.

   ```python
   from langgraph.graph import StateGraph, END
   from typing import TypedDict, List
   
   class WorkflowState(TypedDict):
       document: str
       summary: str
       entities: List[str]
       final_report: str
       error: str | None
       step: str
   
   def summarize_node(state: WorkflowState) -> WorkflowState:
       summary = summarize_chain.invoke({"text": state["document"]})
       return {**state, "summary": summary, "step": "summarized"}
   
   graph = StateGraph(WorkflowState)
   graph.add_node("summarize", summarize_node)
   graph.add_node("extract_entities", entities_node)
   graph.add_edge("summarize", "extract_entities")
   ```

5. **Error handling et recovery** — Implémenter des **retry** par nœud (erreurs transitoires), des **fallback chains** (modèle de secours si le premier échoue), et des **checkpoints** pour reprendre depuis le dernier état valide. Les nœuds critiques (appels API externes, actions irréversibles) doivent avoir un **human-in-the-loop** — LangGraph supporte nativement les interruptions et reprises (`interrupt_before`, `interrupt_after`).

   ```python
   from langgraph.checkpoint.sqlite import SqliteSaver
   
   # Persistance de l'état pour recovery
   checkpointer = SqliteSaver.from_conn_string(":memory:")
   app = graph.compile(checkpointer=checkpointer,
                       interrupt_before=["send_email"])  # Pause avant action critique
   
   # Reprendre après approbation humaine
   config = {"configurable": {"thread_id": "run-001"}}
   app.invoke(initial_state, config)
   # ... attendre approbation ...
   app.invoke(None, config)  # Reprendre
   ```

6. **Observabilité** — Tracer chaque nœud du workflow avec : durée d'exécution, tokens consommés, coût, input/output. Utiliser **LangSmith** (natif LangChain/LangGraph), **Phoenix (Arize)** (open-source, excellente UI), ou **OpenTelemetry** pour une approche agnostique. Configurer des alertes sur les métriques clés (latence > 30s, coût > $0.10/run, taux d'erreur > 5%).

   ```python
   import os
   os.environ["LANGCHAIN_TRACING_V2"] = "true"
   os.environ["LANGCHAIN_API_KEY"] = "ls_..."
   os.environ["LANGCHAIN_PROJECT"] = "my-workflow"
   # Toutes les exécutions LangChain/LangGraph sont automatiquement tracées
   
   # Phoenix (alternative open-source)
   import phoenix as px
   from phoenix.otel import register
   tracer_provider = register(project_name="my-workflow")
   ```

7. **Optimisation** — **Prompt caching** : activer le caching Anthropic/OpenAI sur les préfixes longs (system prompts, documents). **Batch processing** : regrouper les requêtes indépendantes (map-reduce) en batch OpenAI API (-50% coût). **Async execution** : utiliser `ainvoke()` et `asyncio.gather()` pour les étapes parallèles — divise la latence par le nombre de branches. **Streaming** : propager le streaming jusqu'au client pour l'UX.

   ```python
   import asyncio
   
   async def run_parallel_nodes(state: WorkflowState):
       # Exécuter en parallèle au lieu de séquentiel
       summary_task = summarize_chain.ainvoke({"text": state["document"]})
       entities_task = extract_chain.ainvoke({"text": state["document"]})
       summary, entities = await asyncio.gather(summary_task, entities_task)
       return {**state, "summary": summary, "entities": entities}
   ```

8. **Déploiement** — Exposer le workflow comme **API REST** (FastAPI + endpoint async), **webhook** (déclenché par des événements externes), ou **tâche planifiée** (Celery, APScheduler, Cloud Scheduler). Pour la scalabilité : containeriser avec Docker, orchestrer avec Kubernetes, utiliser des queues de messages (Redis, RabbitMQ) pour les workloads batch. **LangServe** (déprécié) ou **LangGraph Cloud** pour un déploiement managé.

   ```python
   from fastapi import FastAPI, BackgroundTasks
   from pydantic import BaseModel
   
   app = FastAPI()
   
   class WorkflowRequest(BaseModel):
       document: str
       webhook_url: str | None = None
   
   @app.post("/workflows/analyze")
   async def trigger_workflow(req: WorkflowRequest, bg: BackgroundTasks):
       run_id = str(uuid.uuid4())
       bg.add_task(run_workflow_async, run_id, req.document, req.webhook_url)
       return {"run_id": run_id, "status": "started"}
   
   @app.get("/workflows/{run_id}")
   async def get_status(run_id: str):
       return await get_run_status(run_id)
   ```

## Règles

- **Commencer simple, complexifier si nécessaire** : un pipeline séquentiel en 50 lignes de Python natif est souvent plus maintenable qu'une architecture LangGraph complexe — n'ajouter un framework que quand la complexité le justifie vraiment.
- **Chaque nœud doit être testable isolément** : définir des interfaces d'input/output claires, créer des tests unitaires pour chaque nœud avant d'assembler le workflow — déboguer un workflow monolithique est un cauchemar.
- **Toujours implémenter les checkpoints** : un workflow de 10 minutes qui échoue à l'étape 9 doit pouvoir reprendre depuis l'étape 9, pas depuis le début — économise du temps et de l'argent.
- **Loguer l'état complet à chaque transition** : en cas d'erreur en production, l'état au moment de la défaillance est la seule information de débogage disponible — ne pas lésiner sur les logs structurés.
- **Définir des SLAs clairs** : timeout par nœud, coût maximum par run, temps de réponse cible — sans ces limites, un workflow peut consommer des ressources indéfiniment en cas de dysfonctionnement.
