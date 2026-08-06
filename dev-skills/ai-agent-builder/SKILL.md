---
name: ai-agent-builder
description: Conception et implémentation d'agents IA autonomes avec outils, mémoire et orchestration. Se déclenche avec "agent IA", "AI agent", "autonomous agent", "tool use", "function calling", "agent framework", "LangChain agent", "CrewAI", "AutoGen", "agent loop", "ReAct". Also triggers on "build an AI agent", "agent with tools and memory".
---

# AI Agent Builder

## Critères de choix du pattern

| Complexité | Pattern recommandé | Framework |
|---|---|---|
| Tâche unique, 1-5 outils | ReAct (Reasoning + Acting) | LangChain, SDK natif |
| Tâche longue multi-étapes | Plan-and-Execute | LangGraph |
| Exploration de solutions alternatives | Tree of Thoughts | LangGraph + custom |
| Équipe de spécialistes | Multi-agent orchestré | CrewAI, AutoGen, LangGraph |
| Workflow avec état persistant et branchements | Stateful graph | LangGraph |

Règle de base : commencer par ReAct. Passer à Plan-and-Execute si l'agent doit coordonner plus de 5 étapes séquentielles. Passer au multi-agent si les domaines de compétence sont orthogonaux (ex : code + recherche + rédaction).

## Workflow en étapes

### 1. Rédiger le system prompt de l'agent

Structure minimale :
```
Tu es [RÔLE]. Tu [OBJECTIF PRINCIPAL].
Règles :
- Tu réponds uniquement sur [DOMAINE].
- Tu n'inventes pas de données.
- Si tu manques d'information, utilise l'outil [NOM_OUTIL] avant de répondre.
Finalisation : quand tu as la réponse, utilise l'outil `final_answer`.
```

Inclure : rôle, périmètre, règles de refus, format de sortie attendu, condition d'arrêt explicite.

### 2. Définir les outils (tool schemas)

Format Anthropic (compatible aussi OpenAI avec adaptation mineure) :
```python
tools = [
    {
        "name": "search_web",
        "description": "Recherche des informations récentes sur le web. Utiliser si la question porte sur des faits susceptibles d'avoir changé récemment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Requête de recherche optimisée"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "run_python",
        "description": "Exécute du code Python et retourne stdout + stderr. Utiliser pour calculs, transformations de données.",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Code Python à exécuter"}
            },
            "required": ["code"]
        }
    }
]
```

Bonnes pratiques outil :
- Description orientée **quand utiliser**, pas seulement **ce que ça fait**
- Toujours retourner `{"success": bool, "result": ..., "error": str | None}`
- Timeout par outil (ex : 30s web, 10s DB, 60s code)
- Idempotent ou documenté comme non-idempotent

### 3. Implémenter la boucle agent

Boucle ReAct minimaliste avec Anthropic SDK :
```python
import anthropic

client = anthropic.Anthropic()

async def agent_loop(task: str, tools: list, max_iter: int = 15) -> str:
    messages = [{"role": "user", "content": task}]

    for iteration in range(max_iter):
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            tools=tools,
            messages=messages
        )

        # Arrêt naturel
        if response.stop_reason == "end_turn":
            return next(b.text for b in response.content if hasattr(b, "text"))

        # Exécution des outils
        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": str(result)
                    })
            messages.append({"role": "user", "content": tool_results})

    return f"[TIMEOUT] Max itérations ({max_iter}) atteintes sans réponse finale."

async def execute_tool(name: str, args: dict) -> dict:
    try:
        handler = TOOL_REGISTRY[name]
        return {"success": True, "result": await handler(**args)}
    except Exception as e:
        return {"success": False, "result": None, "error": str(e)}
```

### 4. Mémoire — choisir la couche adaptée

| Besoin | Solution |
|---|---|
| Contexte de session (< 200k tokens) | Passer tout le fil dans `messages` |
| Historique long / multi-session | Résumé LLM + vector store (pgvector, Chroma) |
| Faits persistants sur l'utilisateur/projet | mem0, Zep, ou table SQL simple |
| Cache de résultats d'outils | Redis avec TTL |

Mémoire avec résumé automatique (LangChain) :
```python
from langchain.memory import ConversationSummaryBufferMemory
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-sonnet-4-5")
memory = ConversationSummaryBufferMemory(
    llm=llm,
    max_token_limit=3000,
    return_messages=True
)
```

### 5. Multi-agent avec LangGraph

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    task: str
    plan: list[str]
    results: Annotated[list, operator.add]
    final_answer: str

def orchestrator_node(state: AgentState) -> AgentState:
    # Décompose la tâche en sous-tâches
    plan = decompose_task(state["task"])
    return {"plan": plan}

def worker_node(state: AgentState) -> AgentState:
    # Exécute la prochaine sous-tâche
    result = execute_subtask(state["plan"][0])
    return {"results": [result], "plan": state["plan"][1:]}

def should_continue(state: AgentState) -> str:
    return "worker" if state["plan"] else "synthesizer"

graph = StateGraph(AgentState)
graph.add_node("orchestrator", orchestrator_node)
graph.add_node("worker", worker_node)
graph.add_conditional_edges("worker", should_continue, {"worker": "worker", "synthesizer": END})
```

### 6. Monitoring et observabilité

LangSmith (tracing complet) :
```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=ls__...
export LANGCHAIN_PROJECT=mon-agent-prod
```

Avec le décorateur `@traceable` :
```python
from langsmith import traceable

@traceable(run_type="chain", name="agent_loop")
async def run_agent(task: str) -> str:
    return await agent_loop(task, tools)
```

Métriques à tracker :
- Taux de succès des tâches (objectif : > 90%)
- Itérations moyennes par tâche (signal de complexité ou de boucle)
- Coût moyen par tâche (tokens * prix modèle)
- Taux d'erreur par outil (identifier les outils fragiles)
- Latence P95 (pour les agents synchrones)

## Garde-fous et sécurité

```python
HIGH_RISK_TOOLS = {"send_email", "delete_file", "execute_sql_write", "deploy"}

async def safe_execute_tool(name: str, args: dict) -> dict:
    # Human-in-the-loop pour actions irréversibles
    if name in HIGH_RISK_TOOLS:
        confirmation = await ask_human(
            f"L'agent veut exécuter `{name}` avec les args : {args}\nConfirmer ? [o/N]"
        )
        if not confirmation:
            return {"success": False, "error": "Action refusée par l'opérateur"}

    # Rate limiting
    if rate_limiter.is_exceeded(name):
        return {"success": False, "error": "Rate limit dépassé pour cet outil"}

    return await execute_tool(name, args)
```

Checklist sécurité avant mise en prod :
- [ ] `max_iterations` défini (recommandé : 10-20)
- [ ] `max_cost_usd` par session (ex : 0.50$)
- [ ] Timeout par outil (évite les blocages)
- [ ] Validation des inputs outils (types, longueur max)
- [ ] Human-in-the-loop sur toute action irréversible
- [ ] Logs de toutes les décisions et appels d'outils
- [ ] Pas de secrets dans les prompts ou tool results

## Anti-patterns à éviter

| Anti-pattern | Impact | Correctif |
|---|---|---|
| Pas de `max_iterations` | Boucle infinie, coût incontrôlé | Toujours borner la boucle |
| Outil qui lève une exception raw | L'agent crashe ou hallucine | `try/except` systématique, retourner `{"success": false}` |
| Trop d'outils (> 15) | L'agent choisit mal | Limiter à 7±2 par rôle, regrouper par domaine |
| System prompt flou sur la condition d'arrêt | L'agent ne sait jamais quand s'arrêter | Définir explicitement `final_answer` ou un outil de finalisation |
| Multi-agent sans protocole de message | Messages incompréhensibles entre agents | Définir un format JSON structuré pour chaque échange inter-agent |
| Mémoire illimitée dans les messages | Context window explosée, coût élevé | Sliding window + résumé automatique |
| Outil non-idempotent appelé plusieurs fois | Effets de bord multiples | Documenter, détecter les appels répétés |

## Bonnes pratiques 2026

- **Prefer native SDK over framework** : pour les agents simples, l'Anthropic SDK directement est plus maintenable que LangChain. Utiliser LangGraph uniquement si le workflow est un graphe réel.
- **Structured outputs** : forcer le format de réponse finale avec un tool `final_answer` plutôt que de parser du texte libre.
- **Prompt caching** : utiliser `cache_control: {"type": "ephemeral"}` sur les blocs statiques (system prompt, tools) pour réduire les coûts de 70-90% sur les agents longue durée.
- **Model routing** : utiliser `claude-haiku-3-5` pour les sous-tâches de classification/routing, `claude-sonnet-4-5` pour le raisonnement principal.
- **Parallel tool calls** : Anthropic retourne plusieurs `tool_use` dans un seul message — les exécuter en parallèle avec `asyncio.gather()`.
- **Eval-driven development** : créer un dataset de 20-50 cas de test représentatifs avant de déployer. Relancer les evals à chaque modification du system prompt ou des outils.
