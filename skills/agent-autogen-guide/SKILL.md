---
name: agent-autogen-guide
description: Développement d'agents conversationnels avec Microsoft AutoGen. Création de group chats, agents spécialisés et workflows multi-agents avec exécution de code. Se déclenche avec "AutoGen", "Microsoft AutoGen", "autogen agent", "group chat agent", "ConversableAgent", "AssistantAgent", "UserProxyAgent", "coding agent", "agents qui conversent".
---

# AutoGen Guide — Agents Conversationnels Microsoft

## Quand utiliser AutoGen

| Cas d'usage | AutoGen adapté ? |
|---|---|
| Résolution itérative de code (écrire → tester → corriger) | Oui — c'est le point fort |
| Workflow multi-agents avec rôles spécialisés (PM, Dev, Reviewer) | Oui |
| Pipeline linéaire simple sans feedback loop | Non — préférer LangChain Chains ou CrewAI |
| RAG statique sans agent qui décide | Non — préférer LlamaIndex |
| Orchestration déterministe sans LLM entre les étapes | Non — préférer Temporal ou Prefect |

**Critère de décision clé :** AutoGen brille quand les agents doivent *débattre, itérer et se corriger mutuellement*. Si le flow est linéaire et prévisible, c'est sur-dimensionné.

---

## Workflow en étapes

### 1. Installation

```bash
# AutoGen v0.2 stable (API historique, la plus documentée)
pip install pyautogen==0.2.38

# AutoGen v0.4+ (nouvelle API agentchat — recommandée pour nouveaux projets 2026)
pip install autogen-agentchat autogen-ext[openai,docker]

# Interface no-code AutoGen Studio
pip install autogenstudio
```

Vérifier : `python -c "import autogen; print(autogen.__version__)"`

---

### 2. Configuration du LLM

```python
import os

# Option 1 : dict inline
config_list = [
    {"model": "gpt-4o",      "api_key": os.environ["OPENAI_API_KEY"]},
    {"model": "gpt-4o-mini", "api_key": os.environ["OPENAI_API_KEY"]},  # fallback
]

# Option 2 : depuis fichier JSON (recommandé pour multi-env)
# config_list = autogen.config_list_from_json("OAI_CONFIG_LIST")

llm_config = {
    "config_list": config_list,
    "temperature": 0,
    "cache_seed": None,  # None en prod, un entier (42) en dev pour reproductibilité
    "timeout": 120,
}
```

**Azure OpenAI :**
```python
config_list = [{
    "model": "gpt-4o",
    "api_type": "azure",
    "api_key": os.environ["AZURE_OPENAI_KEY"],
    "base_url": "https://<resource>.openai.azure.com/",
    "api_version": "2024-08-01-preview",
}]
```

---

### 3. Agents de base — choisir le bon type

| Type | LLM | Exécute du code | Usage typique |
|---|---|---|---|
| `AssistantAgent` | Oui | Non | Génération de code, raisonnement, synthèse |
| `UserProxyAgent` | Optionnel | Oui | Exécution de code, point d'entrée humain |
| `ConversableAgent` | Configurable | Configurable | Classe de base — hériter pour cas custom |

```python
import autogen

assistant = autogen.AssistantAgent(
    name="assistant",
    system_message=(
        "Expert Python. Écris du code pour résoudre le problème. "
        "Vérifie les résultats. Dis TERMINATE quand terminé."
    ),
    llm_config=llm_config,
)

user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",             # "ALWAYS" | "NEVER" | "TERMINATE"
    max_consecutive_auto_reply=10,        # filet de sécurité anti-boucle
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
    code_execution_config=False,          # désactivé ici, voir étape 4 pour l'activer
)
```

---

### 4. Exécution de code — choisir l'executor

```python
from autogen.coding import LocalCommandLineCodeExecutor, DockerCommandLineCodeExecutor

# DEV uniquement — risque sécurité (exécution arbitraire sur la machine hôte)
executor_dev = LocalCommandLineCodeExecutor(
    work_dir="./workspace",
    timeout=60,
)

# PRODUCTION — exécution isolée dans un container Docker
executor_prod = DockerCommandLineCodeExecutor(
    image="python:3.12-slim",
    work_dir="./workspace",
    timeout=120,
)

# Injecter dans UserProxyAgent
user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    code_execution_config={"executor": executor_prod},
)
```

---

### 5. Group Chat — plusieurs agents qui collaborent

```python
groupchat = autogen.GroupChat(
    agents=[user_proxy, agent_a, agent_b, agent_c],
    messages=[],
    max_round=20,
    speaker_selection_method="auto",  # LLM choisit le prochain speaker
    # Optionnel : contraindre les transitions pour un flow déterministe
    allowed_or_disallowed_speaker_transitions={
        user_proxy:  [agent_a],
        agent_a:     [agent_b],
        agent_b:     [agent_c, agent_a],
        agent_c:     [agent_a, user_proxy],
    },
    speaker_transitions_type="allowed",
)

manager = autogen.GroupChatManager(
    groupchat=groupchat,
    llm_config=llm_config,  # le manager a besoin de son propre LLM pour choisir le speaker
)

user_proxy.initiate_chat(manager, message="Construis une API REST sécurisée FastAPI...")
```

**`speaker_selection_method` :**
- `"auto"` — LLM choisit (flexible, coûteux en tokens)
- `"round_robin"` — tour à tour (déterministe, prévisible)
- `"random"` — aléatoire (rarement utile)
- `lambda agents, msgs, groupchat: agents[idx]` — fonction custom

---

### 6. Tool use (function calling)

```python
from autogen import register_function

def search_docs(query: str, top_k: int = 5) -> list[dict]:
    """Recherche dans la base de docs interne."""
    # ... logique de recherche
    return [{"title": "...", "content": "..."}]

register_function(
    search_docs,
    caller=assistant,     # agent LLM qui décide d'appeler l'outil
    executor=user_proxy,  # agent qui exécute réellement la fonction
    name="search_docs",
    description="Recherche des documents internes par requête sémantique.",
)
```

---

### 7. Nested chats — sous-conversations encapsulées

```python
# Un agent peut déléguer une sous-tâche à une autre paire d'agents
# et récupérer le résultat comme un seul message dans la conversation principale

assistant.register_nested_chats(
    [
        {
            "recipient": critic_agent,
            "message": lambda recipient, messages, sender, config: (
                f"Critique ce code :\n{messages[-1]['content']}"
            ),
            "max_turns": 3,
            "summary_method": "last_msg",
        }
    ],
    trigger=user_proxy,  # déclenché quand user_proxy envoie un message à assistant
)
```

---

### 8. AutoGen v0.4+ — nouvelle API agentchat

```python
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.teams import RoundRobinGroupChat, SelectorGroupChat
from autogen_ext.models.openai import OpenAIChatCompletionClient
import asyncio

model_client = OpenAIChatCompletionClient(model="gpt-4o")

writer = AssistantAgent("writer", model_client=model_client,
    system_message="Tu rédiges du contenu clair et concis.")
reviewer = AssistantAgent("reviewer", model_client=model_client,
    system_message="Tu révises et corriges le texte. Dis APPROVE si c'est bon.")

team = RoundRobinGroupChat([writer, reviewer], max_turns=6)

async def main():
    result = await team.run(task="Rédige un README pour une librairie Python de cache Redis.")
    print(result.messages[-1].content)

asyncio.run(main())
```

---

## Exemple complet — Coding Agent

```python
import os
import autogen
from autogen.coding import DockerCommandLineCodeExecutor

config_list = [{"model": "gpt-4o", "api_key": os.environ["OPENAI_API_KEY"]}]
llm_config = {"config_list": config_list, "temperature": 0, "cache_seed": None}

assistant = autogen.AssistantAgent(
    name="assistant",
    system_message=(
        "Expert Python. Pour chaque problème : écris le code, "
        "analyse les erreurs d'exécution et corrige. "
        "Dis TERMINATE uniquement quand le résultat est vérifié."
    ),
    llm_config=llm_config,
)

user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=12,
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
    code_execution_config={
        "executor": DockerCommandLineCodeExecutor(
            image="python:3.12-slim",
            work_dir="./workspace",
            timeout=90,
        )
    },
)

if __name__ == "__main__":
    result = user_proxy.initiate_chat(
        assistant,
        message=(
            "Télécharge les données AAPL via yfinance pour les 30 derniers jours, "
            "calcule la moyenne mobile 7j et 21j, trace le graphique avec matplotlib, "
            "sauvegarde en PNG et affiche le chemin du fichier."
        ),
    )
```

---

## Garde-fous et anti-patterns

### Pièges fréquents

| Piège | Symptôme | Correctif |
|---|---|---|
| Pas de `is_termination_msg` | Boucle infinie, coûts explosifs | Toujours définir la lambda + mot-clé dans le `system_message` |
| `cache_seed` non-nul en prod | Réponses figées, résultats obsolètes | `cache_seed=None` en production |
| `LocalCommandLineCodeExecutor` en prod | Exécution arbitraire sur le serveur | `DockerCommandLineCodeExecutor` obligatoire |
| `max_round` trop élevé | Conversations qui dérivent, tokens gaspillés | Commencer à 10-15, augmenter au besoin |
| `system_message` vagues | Agents qui s'interrompent, responsabilités floues | 1 rôle = 1 agent, instructions précises sur quand intervenir |
| Trop d'agents dans le GroupChat | Sélection de speaker chaotique, latence | ≤5 agents par GroupChat, décomposer en sous-groupes si nécessaire |
| Oublier le LLM du GroupChatManager | `AttributeError` ou sélection impossible | `GroupChatManager` a toujours son propre `llm_config` |

### Anti-patterns à éviter

- **Ne pas mettre un agent LLM pour chaque micro-tâche** : si une tâche est déterministe (appel API, requête SQL), utiliser un tool ou une fonction Python, pas un agent entier.
- **Ne pas ignorer `chat_result.cost`** : surveiller le coût total via `result.cost` après chaque `initiate_chat`.
- **Ne pas mixer v0.2 et v0.4 dans le même projet** : les deux API sont incompatibles, choisir l'une ou l'autre.
- **Ne pas exposer `LocalCommandLineCodeExecutor` via une API web publique** : injection de commandes garantie.

### Bonnes pratiques 2026

- Utiliser **AutoGen v0.4+** pour les nouveaux projets (API async, meilleure testabilité, support Swarm).
- Activer **OpenTelemetry** pour tracer les conversations en production : `autogen.runtime_logging.start(logger_type="file", config={"filename": "run.log"})`.
- Tester les agents en isolation avant le GroupChat : `agent.generate_reply(messages=[{"role": "user", "content": "..."}])`.
- Définir des **timeouts réseau** dans `llm_config` (`"timeout": 60`) pour éviter les blocages silencieux.
- Utiliser **`summary_method="reflection_with_llm"`** sur `initiate_chat` pour obtenir un résumé exploitable de la conversation.


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
