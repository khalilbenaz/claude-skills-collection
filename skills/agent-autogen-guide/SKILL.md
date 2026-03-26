---
name: agent-autogen-guide
description: Développement d'agents conversationnels avec Microsoft AutoGen. Création de group chats, agents spécialisés et workflows multi-agents avec exécution de code. Se déclenche avec "AutoGen", "Microsoft AutoGen", "autogen agent", "group chat agent", "ConversableAgent", "AssistantAgent", "UserProxyAgent", "coding agent", "agents qui conversent".
---

# AutoGen Guide — Agents Conversationnels Microsoft

## Quand utiliser ce skill

Utiliser ce skill quand l'utilisateur veut construire des agents qui conversent entre eux pour résoudre des problèmes complexes, notamment pour des systèmes de coding agents (génération et exécution de code automatique), des workflows de résolution de problèmes par discussion multi-agents, ou des pipelines où des agents spécialisés débattent et collaborent. AutoGen excelle pour les cas d'usage impliquant l'écriture et l'exécution de code Python dans une boucle.

## Workflow

1. **Installation et configuration initiale**
   - Installer : `pip install pyautogen==0.3.2` (ou `autogen-agentchat~=0.2` pour la v0.2 stable)
   - Pour AutoGen v0.4+ (nouvelle API) : `pip install autogen-agentchat autogen-ext[openai]`
   - Configurer les modèles via `OAI_CONFIG_LIST` (fichier JSON) ou dict Python :
     ```python
     config_list = [
         {"model": "gpt-4o", "api_key": os.environ["OPENAI_API_KEY"]},
         {"model": "gpt-4o-mini", "api_key": os.environ["OPENAI_API_KEY"]},
     ]
     ```
   - Variables d'env : `OPENAI_API_KEY`, optionnellement `OAI_CONFIG_LIST` (chemin fichier)

2. **Agents de base**
   - `AssistantAgent` : agent LLM qui génère des réponses et du code, ne l'exécute pas
   - `UserProxyAgent` : agent qui peut exécuter du code, simuler l'humain, orchestrer
   - `ConversableAgent` : classe de base, tous les agents en héritent
   - Paramètres clés : `name`, `system_message`, `llm_config`, `human_input_mode`, `max_consecutive_auto_reply`

3. **Configuration des LLMs (llm_config)**
   - Structure `llm_config` : `{"config_list": [...], "temperature": 0, "cache_seed": 42}`
   - `cache_seed` : met en cache les réponses LLM pour reproduire les résultats (mettre à `None` en prod)
   - Model routing : lister plusieurs modèles dans `config_list` — AutoGen essaie dans l'ordre en cas d'échec
   - `llm_config=False` sur `UserProxyAgent` pour désactiver le LLM (proxy pur)

4. **Group Chat — conversation multi-agents**
   - `GroupChat` : définit les agents participants, `max_round`, `speaker_selection_method`
   - `GroupChatManager` : orchestre le GroupChat, nécessite son propre `llm_config`
   - Méthodes de sélection du speaker : `"auto"` (LLM choisit), `"round_robin"`, `"random"`, ou une fonction custom
   - Contraindre les transitions : `allowed_or_disallowed_speaker_transitions` pour un flow déterministe

5. **Exécution de code (code_execution_config)**
   - Configuration sur `UserProxyAgent` :
     ```python
     code_execution_config={
         "executor": LocalCommandLineCodeExecutor(work_dir="coding"),
         "last_n_messages": 3,
     }
     ```
   - `LocalCommandLineCodeExecutor` : exécute localement (attention à la sécurité !)
   - `DockerCommandLineCodeExecutor` : exécution isolée dans Docker (recommandé en prod)
   - Désactiver l'exécution : `code_execution_config=False`

6. **Tool use — appels de fonctions**
   - Définir les fonctions et les enregistrer :
     ```python
     from autogen import register_function

     def get_weather(city: str) -> str:
         """Retourne la météo pour une ville."""
         return f"Météo pour {city}: ensoleillé, 22°C"

     register_function(
         get_weather,
         caller=assistant,    # agent qui appelle l'outil
         executor=user_proxy, # agent qui exécute l'outil
         name="get_weather",
         description="Obtenir la météo actuelle d'une ville",
     )
     ```
   - Les tools sont définis comme JSON Schema dans `llm_config["tools"]`

7. **Human-in-the-loop**
   - `human_input_mode="ALWAYS"` : demande input humain à chaque tour
   - `human_input_mode="NEVER"` : entièrement automatique (défaut pour automation)
   - `human_input_mode="TERMINATE"` : demande input seulement quand l'agent veut terminer
   - `is_termination_msg` : fonction lambda pour détecter le message de fin (ex: `lambda x: "TERMINATE" in x.get("content", "")`)
   - `max_consecutive_auto_reply=10` : stoppe automatiquement après N tours sans input humain

8. **Patterns avancés**
   - **Nested chats** : un agent peut initier une sous-conversation et en récupérer le résultat comme un seul message
   - **Teachable agents** : `TeachableAgent` — mémorise les enseignements de l'utilisateur via une base de données
   - **RAG agents** : `RetrieveAssistantAgent` + `RetrieveUserProxyAgent` pour la retrieval-augmented generation
   - **Society of Mind** : pattern où plusieurs chats indépendants alimentent un agent synthétiseur
   - **Swarm** (v0.4+) : orchestration légère avec `RoundRobinGroupChat`, `SelectorGroupChat`

9. **Gestion de l'état et historique**
   - Accéder à l'historique : `agent.chat_messages` (dict par agent interlocuteur)
   - Résumer la conversation : utiliser un agent dédié à la synthèse
   - Checkpointing : sauvegarder `chat_messages` en JSON pour reprendre une session
   - Resumabilité : réinitialiser avec `agent.reset()` ou injecter l'historique manuellement

10. **AutoGen Studio et déploiement**
    - `pip install autogenstudio` — interface GUI no-code pour créer des workflows
    - Lancement : `autogenstudio ui --port 8080`
    - API REST : AutoGen Studio expose un endpoint pour déclencher des workflows via HTTP
    - En production : wrapper FastAPI + gestion des sessions avec UUID de conversation
    - Monitoring : intégration OpenTelemetry disponible dans AutoGen v0.4+

## Exemples de code

### Système de coding agents : résolution automatique de problèmes Python

```python
import os
import autogen
from autogen.coding import LocalCommandLineCodeExecutor

# Configuration LLM
config_list = [{"model": "gpt-4o", "api_key": os.environ["OPENAI_API_KEY"]}]
llm_config = {"config_list": config_list, "temperature": 0, "cache_seed": None}

# Assistant : génère le code
assistant = autogen.AssistantAgent(
    name="assistant",
    system_message=(
        "Vous êtes un expert Python. Quand on vous pose un problème, "
        "écrivez du code Python pour le résoudre. "
        "Vérifiez toujours les résultats. "
        "Répondez TERMINATE quand le problème est résolu."
    ),
    llm_config=llm_config,
)

# UserProxy : exécute le code généré
user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=10,
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
    code_execution_config={
        "executor": LocalCommandLineCodeExecutor(
            work_dir="./coding_workspace",
            timeout=60,
        ),
    },
    system_message="Executor de code. Exécute le code et rapporte les résultats.",
)

# Lancement de la conversation
if __name__ == "__main__":
    result = user_proxy.initiate_chat(
        assistant,
        message=(
            "Téléchargez les données de cours d'Apple (AAPL) pour les 30 derniers jours "
            "et tracez un graphique avec matplotlib. Sauvegardez le graphique en PNG."
        ),
    )
    print(f"Résumé : {result.summary}")
```

### Group Chat multi-agents avec rôles spécialisés

```python
import os
import autogen

config_list = [{"model": "gpt-4o", "api_key": os.environ["OPENAI_API_KEY"]}]
llm_config = {"config_list": config_list, "temperature": 0.1}

# Définition des agents spécialisés
product_manager = autogen.AssistantAgent(
    name="ProductManager",
    system_message=(
        "Vous êtes un Product Manager. Vous analysez les besoins, "
        "définissez les spécifications et coordonnez l'équipe. "
        "Répondez TERMINATE quand le livrable est complet."
    ),
    llm_config=llm_config,
)

developer = autogen.AssistantAgent(
    name="Developer",
    system_message=(
        "Vous êtes un développeur senior Python/FastAPI. "
        "Vous implémentez les fonctionnalités demandées avec du code propre et testé."
    ),
    llm_config=llm_config,
)

security_expert = autogen.AssistantAgent(
    name="SecurityExpert",
    system_message=(
        "Vous êtes un expert en cybersécurité. "
        "Vous vérifiez le code pour les vulnérabilités OWASP Top 10 "
        "et proposez des correctifs."
    ),
    llm_config=llm_config,
)

# UserProxy qui n'exécute pas de code dans cet exemple
user_proxy = autogen.UserProxyAgent(
    name="UserProxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=0,
    is_termination_msg=lambda x: "TERMINATE" in x.get("content", ""),
    code_execution_config=False,
)

# Configuration du Group Chat
groupchat = autogen.GroupChat(
    agents=[user_proxy, product_manager, developer, security_expert],
    messages=[],
    max_round=15,
    speaker_selection_method="auto",
    # Transitions autorisées pour un flow structuré
    allowed_or_disallowed_speaker_transitions={
        user_proxy: [product_manager],
        product_manager: [developer, security_expert],
        developer: [security_expert, product_manager],
        security_expert: [developer, product_manager],
    },
    speaker_transitions_type="allowed",
)

manager = autogen.GroupChatManager(
    groupchat=groupchat,
    llm_config=llm_config,
)

# Démarrer la conversation
if __name__ == "__main__":
    user_proxy.initiate_chat(
        manager,
        message=(
            "Créez une API REST FastAPI sécurisée avec un endpoint POST /login "
            "qui accepte email/password, valide les entrées et retourne un JWT. "
            "Assurez-vous qu'elle résiste aux injections et brute-force."
        ),
    )
```

## Règles

1. **Toujours définir `is_termination_msg`** — Sans condition de terminaison, les conversations peuvent boucler indéfiniment. Utilisez une convention claire comme le mot "TERMINATE" dans le `system_message` de chaque agent, et détectez-le avec une lambda.

2. **Utiliser Docker pour l'exécution de code en production** — `LocalCommandLineCodeExecutor` présente des risques de sécurité (exécution arbitraire). Toujours utiliser `DockerCommandLineCodeExecutor` en environnement de production ou partagé.

3. **Mettre `cache_seed=None` en production** — Le cache basé sur `cache_seed` est utile pour le développement (reproductibilité, économie de tokens) mais doit être désactivé en production pour obtenir des réponses fraîches.

4. **Dimensionner `max_consecutive_auto_reply` et `max_round`** — Ces deux limites sont vos filets de sécurité contre les boucles infinies et les coûts incontrôlés. Commencez bas (5-10) et augmentez selon les besoins.

5. **Séparer les rôles clairement dans `system_message`** — La qualité d'un Group Chat dépend directement de la clarté des `system_message`. Chaque agent doit avoir un rôle unique, non ambigu, avec des instructions sur quand intervenir et quand passer la parole.
