---
name: mcp-server-builder
description: Création de serveurs MCP (Model Context Protocol) pour exposer des outils, ressources et prompts aux LLMs. Se déclenche avec "MCP", "Model Context Protocol", "MCP server", "MCP tool", "MCP resource", "serveur MCP", "connecter Claude à", "exposer une API à Claude", "claude desktop config".
---

# MCP Server Builder

## Quand utiliser ce skill

Utilise ce skill lorsque l'utilisateur veut créer un serveur MCP pour exposer des outils, ressources ou prompts à un LLM comme Claude. Applicable aussi bien pour des intégrations locales (Claude Desktop, Cursor) que pour des déploiements réseau en production via SSE ou Streamable HTTP. S'applique dès qu'on mentionne le protocole MCP ou la volonté de connecter Claude à une API externe.

## Workflow

1. **Concepts MCP** — Expliquer l'architecture server/client, les primitives (Tools, Resources, Prompts), et les modes de transport disponibles : stdio (local), SSE (réseau), Streamable HTTP (production). Clarifier les capacités à déclarer (`tools`, `resources`, `prompts`, `sampling`).

2. **Setup du projet** — Initialiser le projet selon le langage choisi :
   - Python : `pip install mcp` ou `uv add mcp`, structure `server.py` + `pyproject.toml`
   - TypeScript : `npm install @modelcontextprotocol/sdk`, structure `src/index.ts` + `package.json`
   - Scaffolding recommandé : `mcp create my-server` (CLI officielle si disponible)

3. **Définition des Tools** — Implémenter chaque outil avec : nom snake_case, description claire pour le LLM, `inputSchema` JSON Schema complet (types, required, descriptions), et handler async avec gestion des erreurs. Exemple :
   ```python
   @server.tool("search_web")
   async def search_web(query: str, max_results: int = 10) -> list[dict]:
       ...
   ```

4. **Définition des Resources** — Exposer des données en lecture via URI scheme (`file://`, `db://`, `api://`), URI templates pour les ressources dynamiques (`users/{id}`), types MIME appropriés, et pagination si nécessaire. Différencier ressources statiques vs dynamiques.

5. **Définition des Prompts** — Créer des prompt templates réutilisables avec arguments typés, support multi-message (system + user), et descriptions utiles pour la découverte automatique. Utiliser pour les workflows récurrents de l'utilisateur.

6. **Transport configuration** — Configurer le transport adapté au contexte :
   - `stdio` : pour Claude Desktop et usage local, lire stdin / écrire stdout
   - `SSE` : pour exposer sur réseau, endpoint HTTP `/sse` + `/messages`
   - `Streamable HTTP` : pour production, endpoint unique avec streaming bidirectionnel

7. **Error handling** — Implémenter des codes d'erreur MCP standard (`INVALID_PARAMS`, `INTERNAL_ERROR`, `NOT_FOUND`), messages d'erreur lisibles par le LLM, résultats partiels quand possible, timeouts configurables, et retry logic côté serveur.

8. **Testing** — Tester avec MCP Inspector (`npx @modelcontextprotocol/inspector`), écrire des tests unitaires pour chaque handler, tests d'intégration avec mock client, et valider le JSON Schema des inputs.

9. **Configuration client** — Guider la configuration dans `claude_desktop_config.json` :
   ```json
   {
     "mcpServers": {
       "my-server": {
         "command": "python",
         "args": ["server.py"],
         "env": { "API_KEY": "..." }
       }
     }
   }
   ```
   Documenter aussi la config pour Cursor, VS Code Copilot, et clients custom.

10. **Distribution** — Publier en package `npm` ou `pip`, créer un `Dockerfile` pour déploiement réseau, rédiger une documentation claire (outils disponibles, exemples d'usage), et soumettre au MCP marketplace si pertinent.

## Règles

- Fournis toujours des exemples de code complets et fonctionnels, pas de pseudocode.
- Valide systématiquement les JSON Schemas avec des exemples d'inputs valides et invalides.
- Documente les pièges courants : problèmes de sérialisation, gestion des timeouts stdio, conflits de noms d'outils.
- Priorise la sécurité : ne jamais exposer de secrets dans les descriptions d'outils ou les erreurs retournées au LLM.
- Adapte le transport et le packaging au contexte de déploiement réel de l'utilisateur (local, cloud, edge).
