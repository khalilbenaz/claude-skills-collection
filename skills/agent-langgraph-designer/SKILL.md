---
name: agent-langgraph-designer
description: Conception de graphes d'agents avec LangGraph pour workflows complexes et stateful. Gestion d'état partagé, edges conditionnels, persistance et human-in-the-loop. Se déclenche avec "LangGraph", "graph agent", "state machine agent", "agent graph", "conditional edges", "checkpointer", "agent workflow stateful", "langgraph workflow", "graph workflow".
---

# LangGraph Designer — Graphes d'Agents Stateful

## Quand utiliser ce skill

Utiliser ce skill quand l'utilisateur a besoin d'un workflow d'agent avec un contrôle fin du flux d'exécution : branchements conditionnels, cycles (l'agent peut revenir en arrière), persistance d'état entre sessions, ou interruptions pour validation humaine. LangGraph est préférable à LangChain LCEL ou CrewAI quand le workflow n'est pas strictement linéaire et que l'état doit être géré explicitement. Idéal pour : agents ReAct complexes, pipelines Plan-and-Execute, workflows avec retry logic, chatbots avec mémoire persistante.

## Workflow

1. **Concepts fondamentaux de LangGraph**
   - `StateGraph` : le graphe principal qui orchestre les nœuds et transitions
   - `Node` : une fonction Python qui reçoit le state et retourne un state modifié
   - `Edge` : connexion directe entre deux nœuds (toujours exécutée)
   - `Conditional Edge` : connexion avec une fonction de routing qui choisit le prochain nœud
   - `START` et `END` : nœuds spéciaux pour l'entrée et la sortie du graphe
   - Installation : `pip install langgraph==0.2.70 langchain-openai==0.2.14`

2. **Définition du State (TypedDict)**
   - Le State est le schéma partagé entre tous les nœuds :
     ```python
     from typing import TypedDict, Annotated
     import operator

     class AgentState(TypedDict):
         messages: Annotated[list, operator.add]  # reducer: append
         next_step: str
         iteration_count: int
         final_answer: str | None
     ```
   - `Annotated[list, operator.add]` : reducer qui **ajoute** au lieu de **remplacer** (crucial pour les messages)
   - Sans reducer, chaque nœud **remplace** la valeur (comportement par défaut)
   - Utiliser `MessagesState` (classe prête à l'emploi) pour les applications de chat

3. **Création des nœuds**
   - Un nœud est une fonction synchrone ou async qui reçoit le state et retourne un dict partiel :
     ```python
     from langchain_openai import ChatOpenAI
     from langchain_core.messages import SystemMessage

     llm = ChatOpenAI(model="gpt-4o", temperature=0)

     def agent_node(state: AgentState) -> dict:
         messages = state["messages"]
         response = llm.invoke(messages)
         return {"messages": [response]}  # sera ajouté grâce au reducer

     def tool_node(state: AgentState) -> dict:
         # Exécution des tool calls du dernier message
         last_message = state["messages"][-1]
         results = execute_tools(last_message.tool_calls)
         return {"messages": results}
     ```
   - Les nœuds ne retournent que les **clés modifiées** du state (partial update)

4. **Configuration des edges**
   - Edge simple : `graph.add_edge("node_a", "node_b")`
   - Edge depuis START : `graph.add_edge(START, "first_node")`
   - Edge vers END : `graph.add_edge("last_node", END)`
   - Conditional edge :
     ```python
     def should_continue(state: AgentState) -> str:
         last_message = state["messages"][-1]
         if hasattr(last_message, "tool_calls") and last_message.tool_calls:
             return "tools"  # continuer avec les outils
         return END         # terminer

     graph.add_conditional_edges(
         "agent",
         should_continue,
         {"tools": "tool_node", END: END},
     )
     ```

5. **Persistence et checkpointing**
   - Permet de reprendre un graphe depuis n'importe quel point :
     ```python
     from langgraph.checkpoint.sqlite import SqliteSaver
     from langgraph.checkpoint.memory import MemorySaver

     # En mémoire (dev/test)
     memory = MemorySaver()

     # SQLite (persistance locale)
     with SqliteSaver.from_conn_string("checkpoints.db") as checkpointer:
         app = graph.compile(checkpointer=checkpointer)

     # Chaque run nécessite un thread_id unique
     config = {"configurable": {"thread_id": "session-user-123"}}
     result = app.invoke({"messages": [...]}, config=config)
     ```
   - `PostgresSaver` pour la production à grande échelle (nécessite `psycopg`)

6. **Human-in-the-loop (HIL)**
   - Interrompre **avant** un nœud : `graph.compile(interrupt_before=["human_review"])`
   - Interrompre **après** un nœud : `graph.compile(interrupt_after=["agent"])`
   - Reprendre avec modification du state :
     ```python
     # Lancer jusqu'à l'interruption
     app.invoke(inputs, config=config)

     # Inspecter le state actuel
     current_state = app.get_state(config)
     print(current_state.values)

     # Modifier le state si nécessaire
     app.update_state(config, {"next_step": "approved"})

     # Reprendre l'exécution (None = continuer depuis l'interruption)
     app.invoke(None, config=config)
     ```

7. **Sub-graphs et composition**
   - Un graphe peut être utilisé comme nœud dans un graphe parent :
     ```python
     sub_app = sub_graph.compile()
     main_graph.add_node("subprocess", sub_app)
     ```
   - **Multi-agent supervisor** : un agent superviseur route vers des agents spécialisés (sous-graphes)
   - **Graph as tool** : compiler un graphe et l'encapsuler comme tool LangChain
   - Les sous-graphes héritent du checkpointer parent si partagé

8. **Streaming**
   - Mode `"values"` : retourne l'état complet après chaque nœud
   - Mode `"updates"` : retourne seulement les deltas après chaque nœud (plus efficace)
   - Mode `"messages"` : streaming token par token des messages LLM
     ```python
     async for chunk in app.astream(inputs, config=config, stream_mode="messages"):
         if chunk[1].get("langgraph_node") == "agent":
             print(chunk[0].content, end="", flush=True)
     ```
   - Combiner plusieurs modes : `stream_mode=["updates", "messages"]`

9. **Patterns architecturaux**
   - **ReAct Agent** : nœud agent → conditional edge (tools ou END) → nœud tools → retour agent
   - **Plan-and-Execute** : nœud planner → nœud executor (loop) → nœud replanner → END
   - **Reflection** : nœud génération → nœud critique → nœud révision (N tours max)
   - **Multi-agent Supervisor** : nœud supervisor → conditional edges vers agents spécialisés → retour supervisor
   - **Map-Reduce** : fan-out vers nœuds parallèles → nœud agrégation (avec `Send` API)

10. **Déploiement**
    - **LangGraph Platform** (anciennement LangGraph Cloud) : hébergement managé avec API, UI Studio, persistence intégrée
    - **Self-hosted** : `langgraph up` avec Docker Compose (nécessite LangSmith API key)
    - **FastAPI wrapper** : exposer le graphe comme API REST avec streaming SSE
    - **LangGraph Studio** : interface de debug locale pour visualiser et inspecter les graphes

## Exemples de code

### Agent ReAct avec outils et persistance

```python
import os
from typing import TypedDict, Annotated
import operator
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode

os.environ["OPENAI_API_KEY"] = "votre-clé"

# --- State ---
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]

# --- Outils ---
@tool
def calculator(expression: str) -> str:
    """Évalue une expression mathématique Python."""
    try:
        result = eval(expression, {"__builtins__": {}})
        return f"Résultat : {result}"
    except Exception as e:
        return f"Erreur : {e}"

@tool
def get_current_date() -> str:
    """Retourne la date et l'heure actuelles."""
    from datetime import datetime
    return datetime.now().strftime("Nous sommes le %d/%m/%Y à %H:%M")

tools = [calculator, get_current_date]
tool_node = ToolNode(tools)  # nœud prêt à l'emploi pour exécuter les tools

# --- LLM avec tools ---
llm = ChatOpenAI(model="gpt-4o", temperature=0)
llm_with_tools = llm.bind_tools(tools)

# --- Nœuds ---
def agent(state: AgentState) -> dict:
    """Nœud agent principal : appelle le LLM."""
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def should_continue(state: AgentState) -> str:
    """Routing : continuer avec les outils ou terminer."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# --- Construction du graphe ---
builder = StateGraph(AgentState)

builder.add_node("agent", agent)
builder.add_node("tools", tool_node)

builder.add_edge(START, "agent")
builder.add_conditional_edges(
    "agent",
    should_continue,
    {"tools": "tools", END: END},
)
builder.add_edge("tools", "agent")  # retour vers l'agent après les tools

# Compilation avec checkpointer pour la persistance
memory = MemorySaver()
app = builder.compile(checkpointer=memory)

# --- Utilisation ---
if __name__ == "__main__":
    config = {"configurable": {"thread_id": "conversation-1"}}

    # Tour 1
    result = app.invoke(
        {"messages": [HumanMessage(content="Quelle est la date aujourd'hui ?")]},
        config=config,
    )
    print(result["messages"][-1].content)

    # Tour 2 — le contexte est mémorisé grâce au thread_id
    result = app.invoke(
        {"messages": [HumanMessage(content="Et combien font 1337 * 42 ?")]},
        config=config,
    )
    print(result["messages"][-1].content)

    # Inspecter l'historique complet
    state = app.get_state(config)
    print(f"\nNombre de messages dans la session : {len(state.values['messages'])}")
```

### Workflow Plan-and-Execute avec human-in-the-loop

```python
from typing import TypedDict, Annotated, List
import operator
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

llm = ChatOpenAI(model="gpt-4o", temperature=0)

class PlanState(TypedDict):
    objective: str
    plan: List[str]
    completed_steps: Annotated[List[str], operator.add]
    current_step_index: int
    result: str
    human_approved: bool

def planner(state: PlanState) -> dict:
    """Génère un plan d'action détaillé."""
    response = llm.invoke([
        SystemMessage(content="Vous êtes un planificateur expert. Créez un plan en 3-5 étapes numérotées."),
        HumanMessage(content=f"Objectif : {state['objective']}"),
    ])
    # Parser le plan (simplification — en prod, utiliser structured output)
    steps = [line.strip() for line in response.content.split("\n") if line.strip().startswith(tuple("123456789"))]
    return {"plan": steps, "current_step_index": 0}

def executor(state: PlanState) -> dict:
    """Exécute l'étape courante du plan."""
    if state["current_step_index"] >= len(state["plan"]):
        return {"result": "Toutes les étapes sont complétées."}

    current_step = state["plan"][state["current_step_index"]]
    response = llm.invoke([
        SystemMessage(content="Exécutez cette étape de manière concrète et détaillée."),
        HumanMessage(content=f"Étape : {current_step}\nObjectif global : {state['objective']}"),
    ])
    return {
        "completed_steps": [f"Étape {state['current_step_index']+1}: {response.content}"],
        "current_step_index": state["current_step_index"] + 1,
    }

def should_continue_plan(state: PlanState) -> str:
    """Continue le plan ou termine."""
    if state["current_step_index"] >= len(state["plan"]):
        return "synthesize"
    return "executor"

def synthesizer(state: PlanState) -> dict:
    """Synthétise les résultats de toutes les étapes."""
    all_steps = "\n".join(state["completed_steps"])
    response = llm.invoke([
        SystemMessage(content="Synthétisez les résultats en une réponse cohérente."),
        HumanMessage(content=f"Objectif : {state['objective']}\n\nÉtapes complétées :\n{all_steps}"),
    ])
    return {"result": response.content}

# Construction du graphe
builder = StateGraph(PlanState)
builder.add_node("planner", planner)
builder.add_node("executor", executor)
builder.add_node("synthesizer", synthesizer)

builder.add_edge(START, "planner")
# Interruption après le planning pour validation humaine
builder.add_edge("planner", "executor")
builder.add_conditional_edges("executor", should_continue_plan)
builder.add_edge("synthesizer", END)

memory = MemorySaver()
# interrupt_after=["planner"] : pause après le plan pour validation
app = builder.compile(checkpointer=memory, interrupt_after=["planner"])

if __name__ == "__main__":
    config = {"configurable": {"thread_id": "plan-exec-1"}}
    initial_state = {"objective": "Créer une stratégie marketing pour un SaaS B2B", "human_approved": False}

    # Phase 1 : génération du plan (s'arrête après le planner)
    app.invoke(initial_state, config=config)
    state = app.get_state(config)
    print("Plan généré :")
    for i, step in enumerate(state.values["plan"], 1):
        print(f"  {i}. {step}")

    # Validation humaine (ici automatique pour l'exemple)
    user_input = input("\nApprouver ce plan ? (o/n) : ")
    if user_input.lower() == "o":
        # Reprendre l'exécution
        final = app.invoke(None, config=config)
        print("\n=== RÉSULTAT FINAL ===")
        print(final["result"])
    else:
        print("Plan rejeté. Modifier l'objectif et relancer.")
```

## Règles

1. **Toujours définir un reducer pour les listes** — Sans `Annotated[list, operator.add]`, chaque nœud **remplace** la liste entière au lieu d'y ajouter. C'est l'erreur la plus fréquente avec LangGraph. Pour les messages, utiliser `MessagesState` ou `Annotated[list[BaseMessage], add_messages]`.

2. **Utiliser `thread_id` unique par conversation** — Le checkpointer utilise le `thread_id` pour isoler les sessions. Toujours générer un UUID par utilisateur/session en production. Ne jamais réutiliser le même thread_id pour des conversations différentes.

3. **Limiter les cycles avec un compteur d'itérations** — Les graphes avec des cycles peuvent boucler indéfiniment. Toujours inclure un `iteration_count` dans le state et une condition de sortie dans le conditional edge : `if state["iteration_count"] >= MAX_ITER: return END`.

4. **Préférer `stream_mode="updates"` pour les UIs temps réel** — Le mode `"values"` retourne l'état complet à chaque nœud (verbeux). `"updates"` ne retourne que les changements, ce qui est plus efficace pour les interfaces utilisateur qui affichent la progression.

5. **Tester avec LangGraph Studio avant de déployer** — LangGraph Studio offre une visualisation interactive du graphe, des breakpoints et l'inspection du state nœud par nœud. C'est l'outil de debug indispensable avant tout déploiement en production.
