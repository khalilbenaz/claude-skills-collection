---
name: agent-tool-calling-architect
description: Design et implémentation de systèmes de tool calling pour agents IA. Function calling, API wrapping, schema design. Se déclenche avec "tool calling", "function calling", "tools agent", "API tools", "agent tools", "créer un outil", "custom tool", "tool schema", "MCP tool".
---

# Tool Calling Architect

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois concevoir, implémenter ou améliorer les outils (tools/functions) d'un agent IA. Il couvre la création d'outils depuis zéro, le wrapping d'APIs existantes, la conception de schémas JSON pour le function calling, et la mise en place du protocole MCP. S'applique aussi bien aux outils simples (recherche web, calcul) qu'aux pipelines complexes de tool chaining.

## Workflow

1. **Design de l'outil** — Avant d'écrire du code, définis précisément : un nom en snake_case explicite (`search_web`, `create_calendar_event`), une description en langage naturel que le LLM comprend sans ambiguïté, des paramètres typés et nommés clairement, et le schéma de retour. La qualité de la description détermine si le LLM saura quand et comment utiliser l'outil.

2. **JSON Schema pour function calling** — Rédige le schéma OpenAI-compatible avec `name`, `description`, `parameters` (JSON Schema). Chaque paramètre doit avoir `type`, `description` et, si applicable, `enum` ou `default`. Liste explicitement les paramètres `required`.
   ```python
   tool_schema = {
       "name": "search_web",
       "description": "Recherche des informations actuelles sur le web. Utilise cet outil quand tu as besoin d'informations récentes ou factuelles.",
       "parameters": {
           "type": "object",
           "properties": {
               "query": {"type": "string", "description": "La requête de recherche en langage naturel"},
               "max_results": {"type": "integer", "description": "Nombre max de résultats", "default": 5}
           },
           "required": ["query"]
       }
   }
   ```

3. **Implémentation du tool** — Wrape chaque outil dans une fonction Python avec validation des inputs (Pydantic recommandé), gestion des erreurs explicite, timeout, et retour d'un format standardisé. Ne laisse jamais une exception non catchée remonter au LLM.
   ```python
   from pydantic import BaseModel
   import httpx

   class SearchInput(BaseModel):
       query: str
       max_results: int = 5

   async def search_web(query: str, max_results: int = 5) -> dict:
       try:
           validated = SearchInput(query=query, max_results=max_results)
           async with httpx.AsyncClient(timeout=10) as client:
               resp = await client.get(SEARCH_API_URL, params=validated.dict())
               resp.raise_for_status()
               return {"status": "success", "results": resp.json()["items"][:max_results]}
       except Exception as e:
           return {"status": "error", "message": str(e)}
   ```

4. **Tool discovery et sélection** — Filtre les outils disponibles selon le contexte pour réduire le bruit dans le prompt : dynamic tool loading (charge uniquement les outils pertinents à la tâche), tool filtering par tags/catégories, `tool_choice` API parameter pour forcer ou exclure des outils. Évite de passer 20+ outils simultanément.

5. **Parallel tool calling** — Exploite le parallel tool calling natif des APIs modernes (OpenAI, Anthropic) : le LLM retourne plusieurs tool calls en un seul tour, exécute-les en parallèle avec `asyncio.gather`, puis retourne tous les résultats en un seul message. Réduit significativement la latence.
   ```python
   tool_calls = response.tool_calls  # plusieurs calls retournés
   results = await asyncio.gather(*[dispatch_tool(tc) for tc in tool_calls])
   ```

6. **Tool chaining** — Conçois des pipelines où l'output d'un outil devient l'input d'un autre : soit via l'agent lui-même (le LLM décide de la chaîne), soit via un pipeline déterministe pour les workflows prévisibles. Documente les types d'entrée/sortie pour faciliter la composition.

7. **MCP (Model Context Protocol)** — Pour exposer des outils via MCP : implémente un MCP server (Python SDK `mcp`), définis les `tools` (équivalent function calling), les `resources` (données exposées en lecture), et les `prompts` (templates réutilisables). Choisis le transport approprié : `stdio` (local), `HTTP+SSE` (distant).
   ```python
   from mcp.server import Server
   from mcp.server.stdio import stdio_server

   app = Server("mon-serveur")

   @app.list_tools()
   async def list_tools():
       return [Tool(name="search_web", description="...", inputSchema={...})]

   @app.call_tool()
   async def call_tool(name: str, arguments: dict):
       if name == "search_web":
           return await search_web(**arguments)
   ```

8. **Sécurité** — Applique systématiquement : validation/sanitisation des inputs (rejette les injections), sandboxing pour les outils d'exécution de code (Docker, subprocess limité), rate limiting par outil et par utilisateur, permission scoping (l'agent ne peut appeler que les outils autorisés pour la session), limites de coût (budget par outil, par session).

9. **Testing des tools** — Teste chaque outil en isolation : unit tests avec inputs valides/invalides/edge cases, integration tests contre les vrais endpoints (ou mocks fidèles), tests de timeout et de comportement en cas d'erreur. Vérifie que le schéma JSON est correct et que le LLM l'interprète comme prévu.
   ```python
   async def test_search_web():
       result = await search_web(query="test", max_results=3)
       assert result["status"] == "success"
       assert len(result["results"]) <= 3

   async def test_search_web_error():
       result = await search_web(query="")
       assert result["status"] == "error"
   ```

10. **Monitoring** — Instrumente chaque appel d'outil : usage stats (quels outils sont appelés le plus), latence par outil, taux d'erreur, coût par appel (APIs payantes), détection des appels inutiles (outil appelé mais résultat ignoré). Mets en place des logs structurés avec tool_name, inputs, outputs, durée.

## Règles

- **Description d'outil = documentation LLM** : une description vague produit des appels incorrects ; sois aussi précis que si tu documentais une API publique pour un développeur humain.
- **Anti-pattern — outil fourre-tout** : un outil qui fait "plusieurs choses selon les paramètres" confuse le LLM ; crée plusieurs outils spécialisés plutôt qu'un seul outil générique.
- **Retours standardisés** : tous tes outils doivent retourner le même format de base (`status`, `data`/`error`) pour simplifier la gestion côté agent.
- **Idempotence où possible** : les outils de lecture sont naturellement idempotents ; pour les outils d'écriture, implémente des guards contre les doubles appels (idempotency keys).
- **Framework-agnostic d'abord** : implémente la logique métier de l'outil indépendamment du framework agent (LangChain, LlamaIndex, etc.) pour faciliter la migration et les tests.


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
