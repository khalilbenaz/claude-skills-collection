---
name: dev-ai-agent-builder
description: Conception et implémentation d'agents IA autonomes avec outils et mémoire. Se déclenche avec "agent IA", "AI agent", "autonomous agent", "tool use", "function calling", "agent framework", "LangChain agent", "CrewAI", "AutoGen", "agent loop", "ReAct".
---

# AI Agent Builder

## Workflow

1. **Définition de l'agent** — Clarifier l'objectif principal, les capacités attendues, les limites (domaine, périmètre), et rédiger un system prompt structuré : rôle, ton, règles de comportement, ce que l'agent doit refuser. Exemple : `"Tu es un agent d'analyse financière. Tu réponds uniquement sur les données fournies. Tu ne fais pas de prédictions."`)

2. **Architecture de l'agent** — Choisir le pattern selon la complexité : **ReAct** (Reasoning + Acting, idéal pour tâches simples), **Plan-and-Execute** (décomposer avant d'agir, pour tâches longues), **Tree of Thoughts** (exploration multi-chemins, pour problèmes complexes), **Multi-agent** (sous-agents spécialisés orchestrés). Documenter le flow décisionnel avec un schéma.

3. **Définition des outils** — Créer les tool schemas au format JSON Schema (OpenAI function calling, Anthropic tools). Chaque outil doit avoir : nom snake_case, description précise, paramètres typés avec descriptions. Exemples : `search_web(query: str)`, `run_python(code: str)`, `read_file(path: str)`. Wrapper les APIs tierces avec gestion d'erreur uniforme.

   ```python
   tools = [{
       "type": "function",
       "function": {
           "name": "search_web",
           "description": "Recherche des informations sur le web",
           "parameters": {
               "type": "object",
               "properties": {
                   "query": {"type": "string", "description": "Requête de recherche"}
               },
               "required": ["query"]
           }
       }
   }]
   ```

4. **Mémoire de l'agent** — Implémenter les couches mémoire adaptées : **short-term** (contexte de la conversation, sliding window), **long-term** (vector store avec embeddings, retrieval sémantique), **episodic** (historique des tâches passées, succès/échecs), **working memory** (résultats intermédiaires de la tâche courante). Utiliser `langchain.memory`, `mem0`, ou une implémentation custom avec pgvector.

   ```python
   from langchain.memory import ConversationSummaryBufferMemory
   memory = ConversationSummaryBufferMemory(
       llm=llm, max_token_limit=2000, return_messages=True
   )
   ```

5. **Boucle d'exécution** — Implémenter le cycle **Observe → Think → Act → Reflect** avec un compteur `max_iterations` (défaut : 10-20) pour éviter les boucles infinies. Gérer les erreurs d'outils (retry x3, fallback), détecter les états bloqués (même outil appelé 3 fois de suite), et implémenter un mécanisme de finalisation explicite (`FINAL_ANSWER:`).

   ```python
   async def agent_loop(task: str, max_iter: int = 15):
       messages = [{"role": "user", "content": task}]
       for i in range(max_iter):
           response = await llm.invoke(messages, tools=tools)
           if response.stop_reason == "end_turn":
               return response.content
           tool_result = await execute_tool(response.tool_use)
           messages.append(tool_result)
       return "Max iterations atteintes"
   ```

6. **Multi-agent systems** — Définir les rôles : **Orchestrator** (décompose, délègue, synthétise), **Workers** (agents spécialisés : recherche, code, analyse). Utiliser **CrewAI** pour des équipes déclaratives, **AutoGen** pour des conversations multi-agents, **LangGraph** pour des workflows avec état et branchements conditionnels. Définir les protocoles de communication (messages structurés JSON).

   ```python
   from crewai import Agent, Task, Crew
   researcher = Agent(role="Researcher", goal="...", tools=[search_tool])
   writer = Agent(role="Writer", goal="...", tools=[])
   crew = Crew(agents=[researcher, writer], tasks=[...], verbose=True)
   ```

7. **Guardrails et sécurité** — Valider les outputs (JSON schema validation, content filtering), imposer des limites de coût (`max_cost_usd` par session), du rate limiting (tokens/min), et des timeouts par outil. Intégrer **human-in-the-loop** pour les actions irréversibles (envoi d'email, suppression). Loguer toutes les décisions pour audit. Utiliser Guardrails AI ou NeMo Guardrails.

   ```python
   if tool_name in HIGH_RISK_TOOLS:
       confirmation = await ask_human(f"Confirmer: {tool_name}({args})?")
       if not confirmation:
           return "Action annulée par l'utilisateur"
   ```

8. **Évaluation et monitoring** — Tracker : taux de succès des tâches, nombre moyen d'itérations, coût moyen par tâche, taux d'erreur par outil. Utiliser **LangSmith** pour le tracing complet, **Phoenix (Arize)** pour l'observabilité, ou OpenTelemetry custom. Créer un dataset de benchmarks représentatifs et lancer des évaluations régulières (evals automatisés + human eval).

   ```python
   from langsmith import Client
   client = Client()
   # Chaque run est tracé automatiquement avec @traceable
   @traceable(run_type="chain")
   async def run_agent(task: str): ...
   ```

## Règles

- **Toujours définir `max_iterations`** : sans limite, un agent peut boucler indéfiniment et générer des coûts non maîtrisés. Commencer à 10, ajuster selon la complexité.
- **Outils idempotents et sûrs** : chaque outil doit gérer ses propres erreurs et retourner un résultat structuré (succès/échec + données). Ne jamais laisser une exception non gérée remonter à l'agent.
- **Tracer toutes les décisions** : logguer chaque appel d'outil, chaque raisonnement intermédiaire, chaque erreur. Indispensable pour déboguer et améliorer l'agent.
- **Séparer la logique agent de la logique métier** : les outils sont des wrappers fins sur les fonctions métier existantes — facilite les tests unitaires et le remplacement du LLM.
- **Tester avec des cas adversariaux** : tenter de faire boucler l'agent, lui donner des instructions contradictoires, simuler des échecs d'outils — la robustesse se construit par les edge cases.
