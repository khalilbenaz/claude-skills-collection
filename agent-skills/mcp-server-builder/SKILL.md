---
name: mcp-server-builder
description: Création de serveurs MCP (Model Context Protocol) pour exposer des outils, ressources et prompts aux LLMs. Se déclenche avec "MCP", "Model Context Protocol", "MCP server", "MCP tool", "MCP resource", "serveur MCP", "connecter Claude à", "exposer une API à Claude", "claude desktop config".
---

# MCP Server Builder

## Quand utiliser ce skill

Crée un serveur MCP quand l'objectif est d'exposer une capacité (API, base de données, système de fichiers, service métier) à un LLM de façon structurée. Les cas typiques :
- Connecter Claude Desktop ou Cursor à un outil interne
- Wrapper une API REST existante pour qu'elle soit appelable par un agent
- Exposer des ressources en lecture (documents, données) au contexte de Claude
- Créer des prompt templates réutilisables pour un workflow métier récurrent

## Critères de décision : transport

| Contexte | Transport recommandé |
|---|---|
| Claude Desktop / Cursor / usage local | `stdio` |
| Serveur réseau, multi-clients | `Streamable HTTP` (depuis SDK 1.x) |
| Compatibilité legacy SSE requise | `SSE` (déprécié en 2025) |
| Edge / Cloudflare Workers | `Streamable HTTP` avec fetch handler |

## Workflow

### 1. Initialisation du projet

**Python (recommandé pour démarrages rapides) :**
```bash
uv init my-mcp-server && cd my-mcp-server
uv add "mcp[cli]"
uv run mcp dev server.py        # hot-reload avec MCP Inspector
```

**TypeScript (recommandé pour production Node.js) :**
```bash
npx @modelcontextprotocol/create-server my-mcp-server
cd my-mcp-server && npm install
npm run build
```

**Structure minimale Python :**
```
my-mcp-server/
  server.py
  pyproject.toml
  .env               # secrets, jamais committé
```

### 2. Squelette serveur minimal

**Python — stdio (Claude Desktop) :**
```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
async def ping() -> str:
    """Vérifie que le serveur répond."""
    return "pong"

if __name__ == "__main__":
    mcp.run()          # transport stdio par défaut
```

**TypeScript — stdio :**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

server.tool("ping", "Vérifie que le serveur répond", {}, async () => ({
  content: [{ type: "text", text: "pong" }],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3. Définir des Tools

Règles de nommage : `snake_case`, verbe d'action, sans ambiguïté (`search_emails` > `emails`).

La **description** est lue par le LLM pour décider quand appeler l'outil — elle doit être précise et inclure les cas limites.

```python
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="Texte à rechercher, supporte la syntaxe Lucene")
    limit: int = Field(default=10, ge=1, le=100, description="Nombre de résultats max")
    since: str | None = Field(default=None, description="Filtre date ISO 8601, ex: 2026-01-01")

@mcp.tool()
async def search_documents(params: SearchInput) -> list[dict]:
    """
    Recherche dans la base documentaire interne.
    Retourne titre, extrait, url et score de pertinence.
    Utiliser quand l'utilisateur cherche un document, une procédure ou une politique.
    """
    results = await db.search(params.query, params.limit, params.since)
    return [{"title": r.title, "snippet": r.snippet, "url": r.url, "score": r.score}
            for r in results]
```

### 4. Définir des Resources

Les resources exposent des données en lecture sans action. Le LLM peut les inclure dans son contexte.

```python
@mcp.resource("config://app/{env}")
async def get_config(env: str) -> str:
    """Configuration de l'application pour l'environnement donné."""
    if env not in ("dev", "staging", "prod"):
        raise ValueError(f"Environnement inconnu : {env}")
    data = load_config(env)
    return json.dumps(data, indent=2)
```

URI schemes utiles : `file://`, `db://`, `api://`, `config://`, `doc://`.

### 5. Définir des Prompts

```python
@mcp.prompt()
def code_review_prompt(language: str, code: str) -> list[dict]:
    """Template de revue de code réutilisable."""
    return [
        {"role": "user", "content": f"Revois ce code {language} :\n\n```{language}\n{code}\n```\nFocus : sécurité, perf, lisibilité."}
    ]
```

### 6. Transport réseau (Streamable HTTP)

```python
from mcp.server.fastmcp import FastMCP
import uvicorn

mcp = FastMCP("my-server")
# ... définir tools/resources ...

app = mcp.streamable_http_app()   # renvoie une ASGI app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

URL cliente : `http://localhost:8000/mcp`

### 7. Error handling

```python
from mcp.server.fastmcp import Context
from mcp.types import McpError, ErrorCode

@mcp.tool()
async def get_user(user_id: str, ctx: Context) -> dict:
    try:
        user = await db.get_user(user_id)
        if not user:
            raise McpError(ErrorCode.NOT_FOUND, f"Utilisateur {user_id} introuvable")
        return user.dict()
    except DbConnectionError as e:
        await ctx.error(f"DB indisponible : {e}")
        raise McpError(ErrorCode.INTERNAL_ERROR, "Service temporairement indisponible")
```

Codes d'erreur MCP : `INVALID_PARAMS`, `NOT_FOUND`, `INTERNAL_ERROR`, `METHOD_NOT_FOUND`.

### 8. Testing

```bash
# Inspecter interactivement avec MCP Inspector
npx @modelcontextprotocol/inspector python server.py

# Tests unitaires (Python)
uv add --dev pytest pytest-asyncio
```

```python
import pytest
from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

@pytest.mark.asyncio
async def test_ping():
    params = StdioServerParameters(command="python", args=["server.py"])
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as session:
            await session.initialize()
            result = await session.call_tool("ping", {})
            assert result.content[0].text == "pong"
```

### 9. Configuration client

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` sur macOS) :
```json
{
  "mcpServers": {
    "my-server": {
      "command": "uv",
      "args": ["run", "--directory", "/abs/path/my-mcp-server", "python", "server.py"],
      "env": {
        "API_KEY": "sk-..."
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` à la racine du projet) :
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

Redémarrer le client après modification de la config.

### 10. Dockerfile pour déploiement réseau

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install uv && uv sync --no-dev
COPY . .
EXPOSE 8000
CMD ["uv", "run", "python", "server.py"]
```

## Garde-fous / Anti-patterns

**Secrets dans les descriptions** — Ne jamais inclure de clé API, token ou donnée sensible dans `description` d'un outil (le LLM peut les loguer ou les retourner dans ses réponses). Passer les secrets via `env` dans la config client.

**Outils trop génériques** — Un outil `execute_sql(query: str)` sans validation est dangereux. Préférer des outils spécialisés (`list_users`, `get_order_by_id`) avec validation Pydantic stricte.

**Absence de timeout** — Les handlers stdio bloquants font geler Claude Desktop. Toujours utiliser `asyncio.wait_for` avec timeout.

```python
import asyncio

@mcp.tool()
async def slow_api_call(params: MyInput) -> dict:
    try:
        return await asyncio.wait_for(external_api(params), timeout=15.0)
    except asyncio.TimeoutError:
        raise McpError(ErrorCode.INTERNAL_ERROR, "Timeout API après 15s")
```

**Retours non-sérialisables** — Tout retour doit être JSON-sérialisable. Convertir les objets métier (`datetime`, `Decimal`, custom classes) avant de retourner.

**Mélanger transport stdio et logs sur stdout** — En stdio, `stdout` est le canal MCP. Les logs doivent aller sur `stderr` ou dans un fichier.

```python
import logging, sys
logging.basicConfig(stream=sys.stderr, level=logging.INFO)
```

**URI de ressource non-canoniques** — Les templates d'URI (`users/{id}`) doivent correspondre exactement au pattern déclaré. Un mismatch rend la ressource silencieusement inaccessible.

## Bonnes pratiques 2026

- Utiliser **FastMCP** (Python) ou **McpServer** (TS SDK 1.x+) plutôt que les bas-niveaux `Server`/`Protocol` — l'API haut-niveau gère le cycle de vie, la validation et le routing.
- **Streamable HTTP** est le standard réseau depuis 2025 — éviter SSE pour tout nouveau projet.
- Versionner le serveur dans `McpServer({ name, version })` — permet aux clients de détecter les mises à jour.
- Déclarer uniquement les **capabilities** réellement implémentées dans `capabilities: { tools: {}, resources: {} }` — évite les erreurs de négociation.
- Pour les agents Claude Code : préférer des outils **idempotents** avec des noms d'action clairs ; documenter les effets de bord dans la description.
- Tester systématiquement avec **MCP Inspector** avant intégration client — il affiche les erreurs de schéma que le client LLM silencerait.
