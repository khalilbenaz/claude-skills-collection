---
name: agent-langgraph-designer
description: Conception de graphes d'agents avec LangGraph pour workflows complexes et stateful. Gestion d'état partagé, edges conditionnels, persistance et human-in-the-loop. Se déclenche avec "LangGraph", "graph agent", "state machine agent", "agent graph", "conditional edges", "checkpointer", "agent workflow stateful", "langgraph workflow", "graph workflow". Also triggers on "LangGraph graph", "stateful agent workflow", "LangGraph nodes".
---

# LangGraph Designer — Graphes d'Agents Stateful

## Quand utiliser ce skill

LangGraph est pertinent quand **au moins une** de ces conditions est vraie :
- Le workflow n'est pas linéaire (branches, cycles, retry)
- L'état doit persister entre plusieurs appels ou sessions
- Une validation humaine doit interrompre l'exécution
- Plusieurs agents spécialisés doivent se coordonner

**Alternatives** : LangChain LCEL pour les pipelines linéaires simples, CrewAI si tu veux une abstraction haut niveau sans gérer le state manuellement.

---

## Workflow en étapes

### 1. Installation et imports

```bash
pip install langgraph>=0.3.0 langchain-openai>=0.2.0
# Persistance PostgreSQL (prod) :
pip install langgraph-checkpoint-postgres psycopg[binary]
```

```python
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, BaseMessage
from typing import TypedDict, Annotated
import operator
```

### 2. Définir le State (TypedDict)

Le State est le schéma partagé entre tous les nœuds. **Règle critique : toujours annoter les listes avec un reducer.**

```python
from langgraph.graph.message import add_messages  # reducer officiel pour messages

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]  # append, déduplique par id
    iteration_count: int        # compteur anti-boucle infinie
    final_answer: str | None
```

Critères de choix du reducer :
| Besoin | Reducer |
|--------|---------|
| Accumuler des messages | `add_messages` |
| Accumuler une liste générique | `operator.add` |
| Remplacer la valeur | Aucun (défaut) |
| Valeur max/min | `lambda a, b: max(a, b)` |

Raccourci pour chatbots purs : `from langgraph.graph import MessagesState` (hérite déjà de `add_messages`).

### 3. Créer les nœuds

Un nœud est une **fonction pure** : reçoit le state complet, retourne un dict partiel (seules les clés modifiées).

```python
llm = ChatOpenAI(model="gpt-4o", temperature=0)
llm_with_tools = llm.bind_tools(tools)

def agent_node(state: AgentState) -> dict:
    response = llm_with_tools.invoke(state["messages"])
    return {
        "messages": [response],
        "iteration_count": state["iteration_count"] + 1,
    }

# ToolNode gère automatiquement l'exécution des tool_calls
tool_node = ToolNode(tools)
```

### 4. Construire le graphe et les edges

```python
builder = StateGraph(AgentState)

# Ajout des nœuds
builder.add_node("agent", agent_node)
builder.add_node("tools", tool_node)

# Edges
builder.add_edge(START, "agent")

# Conditional edge : tools_condition vérifie si des tool_calls sont présents
builder.add_conditional_edges(
    "agent",
    tools_condition,           # retourne "tools" ou END
)
builder.add_edge("tools", "agent")  # cycle : retour à l'agent
```

Conditional edge personnalisé :

```python
MAX_ITER = 10

def router(state: AgentState) -> str:
    if state["iteration_count"] >= MAX_ITER:
        return END                          # garde-fou anti-boucle
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END

builder.add_conditional_edges(
    "agent",
    router,
    {"tools": "tools", END: END},  # mapping explicite (optionnel mais lisible)
)
```

### 5. Compiler avec checkpointer

```python
# Dev / tests
memory = MemorySaver()
app = builder.compile(checkpointer=memory)

# SQLite (local, persist entre process)
from langgraph.checkpoint.sqlite import SqliteSaver
with SqliteSaver.from_conn_string("app.db") as cp:
    app = builder.compile(checkpointer=cp)

# PostgreSQL (production)
from langgraph.checkpoint.postgres import PostgresSaver
with PostgresSaver.from_conn_string(os.environ["DATABASE_URL"]) as cp:
    cp.setup()   # crée les tables si besoin
    app = builder.compile(checkpointer=cp)
```

Chaque run utilise un `thread_id` pour isoler les sessions :

```python
config = {"configurable": {"thread_id": "user-abc-session-1"}}
result = app.invoke({"messages": [HumanMessage(content="...")], "iteration_count": 0}, config=config)
```

### 6. Human-in-the-loop (HIL)

```python
# Interrompre avant un nœud critique
app = builder.compile(checkpointer=memory, interrupt_before=["executor"])

# Lancer jusqu'à l'interruption
app.invoke(initial_state, config=config)

# Inspecter et modifier le state
current = app.get_state(config)
print(current.values["plan"])

# Corriger si besoin
app.update_state(config, {"plan": ["étape 1 modifiée", "étape 2"]})

# Reprendre (None = continuer depuis le point d'interruption)
final = app.invoke(None, config=config)
```

### 7. Streaming

```python
# Token par token (UIs chat)
async for chunk, metadata in app.astream(inputs, config=config, stream_mode="messages"):
    if metadata.get("langgraph_node") == "agent":
        print(chunk.content, end="", flush=True)

# Deltas d'état (progression)
for update in app.stream(inputs, config=config, stream_mode="updates"):
    node_name, state_delta = next(iter(update.items()))
    print(f"[{node_name}] {state_delta}")
```

### 8. Sub-graphs et Multi-agent

```python
# Compiler un sous-graphe et l'utiliser comme nœud
sub_app = sub_builder.compile()
main_builder.add_node("specialist", sub_app)

# Pattern Supervisor : router vers agents spécialisés
def supervisor_router(state) -> str:
    # Le LLM décide quel agent appeler
    return state["next_agent"]  # "researcher" | "coder" | END

main_builder.add_conditional_edges("supervisor", supervisor_router)
```

---

## Exemples complets

### Agent ReAct minimal avec persistance

```python
import os
from typing import TypedDict, Annotated
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    iteration_count: int

@tool
def calculator(expression: str) -> str:
    """Évalue une expression mathématique Python sûre."""
    try:
        return str(eval(expression, {"__builtins__": {}}))
    except Exception as e:
        return f"Erreur: {e}"

tools = [calculator]
llm = ChatOpenAI(model="gpt-4o", temperature=0).bind_tools(tools)

MAX_ITER = 8

def agent(state: State) -> dict:
    return {"messages": [llm.invoke(state["messages"])], "iteration_count": state["iteration_count"] + 1}

def should_continue(state: State) -> str:
    if state["iteration_count"] >= MAX_ITER:
        return END
    return tools_condition(state)

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", should_continue)
builder.add_edge("tools", "agent")

app = builder.compile(checkpointer=MemorySaver())

config = {"configurable": {"thread_id": "demo-1"}}
r = app.invoke({"messages": [HumanMessage("Combien font 1337 * 42 ?")], "iteration_count": 0}, config)
print(r["messages"][-1].content)
```

### Visualiser le graphe (debug local)

```python
# Générer un PNG du graphe (nécessite pygraphviz ou pillow)
from IPython.display import Image
Image(app.get_graph().draw_mermaid_png())

# Afficher en Mermaid (texte, pas de dépendances)
print(app.get_graph().draw_mermaid())
```

---

## Garde-fous / Anti-patterns / Pièges

**Reducer manquant sur les listes** — Sans `Annotated[list, add_messages]`, chaque nœud remplace la liste entière. Résultat : l'historique de messages disparaît après le premier nœud. Toujours annoter.

**Boucle infinie** — Un cycle `agent → tools → agent` sans condition de sortie tourne indéfiniment si le LLM appelle toujours un tool. Ajouter `iteration_count` + seuil dans chaque router conditionnel.

**Réutilisation du thread_id** — Partager un `thread_id` entre utilisateurs différents mélange les states. Générer un UUID par session utilisateur : `thread_id = str(uuid.uuid4())`.

**Muter le state directement** — Ne jamais faire `state["messages"].append(...)` dans un nœud. Toujours retourner un dict partiel : `return {"messages": [new_msg]}`.

**MemorySaver en production** — `MemorySaver` est in-process et non partageable. Utiliser `PostgresSaver` (ou Redis via un plugin custom) dès qu'il y a plusieurs workers ou que la persistance doit survivre aux redémarrages.

**Oublier `cp.setup()`** — Avec `PostgresSaver`, appeler `.setup()` une fois avant de compiler pour créer les tables de checkpoint. Sans ça, le premier invoke lève une exception.

**Sub-graph sans checkpointer partagé** — Un sous-graphe compilé sans checkpointer ne persiste pas son état entre les appels. Passer le checkpointer du graphe parent si la persistance est nécessaire dans le sous-graphe.

---

## Bonnes pratiques 2026

- **`interrupt_before` plutôt que `interrupt_after`** : interrompre avant l'action critique (écriture DB, envoi email) permet de valider et d'annuler sans effet de bord.
- **Structured output pour le routing** : utiliser `llm.with_structured_output(RouteSchema)` dans les nœuds de décision plutôt que de parser du texte libre — évite les erreurs de parsing.
- **LangSmith tracing** : activer `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY` dès le développement pour déboguer les runs complexes avec une UI dédiée.
- **LangGraph Studio** : outil de debug local indispensable — visualise le graphe, inspecte le state nœud par nœud, rejoue des runs. Lancer avec `langgraph dev` (nécessite `langgraph.json`).
- **Tester les nœuds isolément** : chaque nœud étant une fonction pure, les unit tests sont directs — passer un state dict en entrée, asserter le dict de sortie.
- **Versionner le schéma du State** : si le schéma évolue, les checkpoints persistés peuvent être incompatibles. Prévoir une migration ou inclure un champ `schema_version` dans le State.


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
