---
name: tool-calling-architect
description: Design et implémentation de systèmes de tool calling pour agents IA. Function calling, API wrapping, schema design, MCP server, parallel calls, sécurité et monitoring. Se déclenche avec "tool calling", "function calling", "tools agent", "API tools", "agent tools", "créer un outil", "custom tool", "tool schema", "MCP tool". Also triggers on "function calling schema", "give my agent tools".
---

# Tool Calling Architect

## Critères de décision : quel pattern choisir ?

| Situation | Pattern recommandé |
|---|---|
| Outil ponctuel dans un seul agent | Function calling inline (JSON schema dans le prompt) |
| Outil partagé entre plusieurs agents | MCP Server (stdio ou HTTP+SSE) |
| Enchaînement prévisible de 3+ étapes | Pipeline déterministe, pas tool chaining LLM |
| Actions parallèles indépendantes | Parallel tool calling natif (OpenAI/Anthropic) |
| Outil exposé à des LLMs tiers/clients | MCP Server avec authentification |
| Wrapping d'API REST existante | Tool = thin wrapper + validation Pydantic |

---

## Workflow en 10 étapes

### 1. Définir le contrat de l'outil

Avant d'écrire du code, complète cette fiche :

- **Nom** : snake_case explicite (`get_invoice_by_id`, pas `get_data`)
- **Description** : une phrase claire sur CE QUE l'outil fait + QUAND l'utiliser (le LLM lit cette phrase pour décider d'appeler ou non)
- **Inputs** : chaque paramètre typé, obligatoire ou optionnel, avec valeurs autorisées si `enum`
- **Output** : format de retour standardisé (`status`, `data` ou `error`)
- **Effets de bord** : lecture seule ? écriture ? irréversible ?

> Règle : si la description de l'outil est ambiguë pour un développeur humain, elle le sera aussi pour le LLM.

---

### 2. Rédiger le JSON Schema

Format OpenAI-compatible (compatible Anthropic, Gemini, Mistral) :

```python
SEARCH_WEB_SCHEMA = {
    "name": "search_web",
    "description": (
        "Recherche des informations récentes sur le web. "
        "Utilise cet outil uniquement quand tu as besoin d'informations "
        "publiées après ta date de coupure ou de données factuelles précises."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Requête en langage naturel, la plus spécifique possible"
            },
            "max_results": {
                "type": "integer",
                "description": "Nombre max de résultats retournés (1-10)",
                "default": 5
            },
            "language": {
                "type": "string",
                "enum": ["fr", "en", "ar"],
                "description": "Langue des résultats",
                "default": "fr"
            }
        },
        "required": ["query"],
        "additionalProperties": False   # bloque les paramètres inconnus
    }
}
```

**Pièges courants dans les schémas :**
- Oublier `"additionalProperties": False` → le LLM invente des champs
- Description trop courte → appels au mauvais moment
- Trop de paramètres optionnels → le LLM les omet aléatoirement

---

### 3. Implémenter le tool (Python)

```python
from pydantic import BaseModel, Field, field_validator
import httpx

class SearchInput(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    max_results: int = Field(5, ge=1, le=10)
    language: str = Field("fr", pattern="^(fr|en|ar)$")

    @field_validator("query")
    @classmethod
    def no_injection(cls, v: str) -> str:
        forbidden = ["<script", "DROP TABLE", "--"]
        if any(f in v for f in forbidden):
            raise ValueError("Requête invalide")
        return v.strip()


async def search_web(query: str, max_results: int = 5, language: str = "fr") -> dict:
    try:
        inp = SearchInput(query=query, max_results=max_results, language=language)
    except Exception as e:
        return {"status": "error", "code": "INVALID_INPUT", "message": str(e)}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://search-api/v1/search",
                params=inp.model_dump(),
                headers={"Authorization": f"Bearer {SEARCH_API_KEY}"}
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])[:inp.max_results]
            return {"status": "success", "data": items}
    except httpx.TimeoutException:
        return {"status": "error", "code": "TIMEOUT", "message": "Search API timeout after 8s"}
    except httpx.HTTPStatusError as e:
        return {"status": "error", "code": f"HTTP_{e.response.status_code}", "message": str(e)}
    except Exception as e:
        return {"status": "error", "code": "UNKNOWN", "message": str(e)}
```

---

### 4. Dynamic tool loading

Ne passe jamais 20+ outils dans chaque prompt. Charge uniquement les outils pertinents :

```python
TOOL_REGISTRY = {
    "search": {"schema": SEARCH_WEB_SCHEMA, "fn": search_web, "tags": ["read", "web"]},
    "send_email": {"schema": SEND_EMAIL_SCHEMA, "fn": send_email, "tags": ["write", "email"]},
    "query_db": {"schema": QUERY_DB_SCHEMA, "fn": query_db, "tags": ["read", "db"]},
}

def get_tools_for_task(tags: list[str]) -> list[dict]:
    return [
        t["schema"] for t in TOOL_REGISTRY.values()
        if any(tag in t["tags"] for tag in tags)
    ]

# Utilisation
tools = get_tools_for_task(["read", "web"])
```

**Seuils pratiques :**
- 1–5 outils : pas de filtrage nécessaire
- 6–15 outils : filtrer par catégorie selon le contexte
- 16+ outils : filtrage sémantique (embeddings) ou multi-agent avec spécialisation

---

### 5. Parallel tool calling

Les LLMs modernes (GPT-4o, Claude 3.5+, Gemini 1.5+) retournent plusieurs `tool_calls` en un seul tour. Exécute-les en parallèle :

```python
import asyncio

async def dispatch_tool(tool_call) -> dict:
    name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)
    fn = TOOL_REGISTRY[name]["fn"]
    result = await fn(**args)
    return {
        "tool_call_id": tool_call.id,
        "role": "tool",
        "content": json.dumps(result)
    }

# Dans la boucle agent
if response.tool_calls:
    results = await asyncio.gather(
        *[dispatch_tool(tc) for tc in response.tool_calls],
        return_exceptions=True  # une erreur n'annule pas les autres
    )
    messages.extend(results)
```

---

### 6. Tool chaining — quand laisser le LLM décider vs. pipeline déterministe

```
LLM-driven chaining → quand les étapes sont imprévisibles (exploration, recherche)
Pipeline déterministe → quand l'ordre est toujours le même (ETL, workflow métier)
```

Pipeline déterministe (exemple) :
```python
async def invoice_pipeline(invoice_id: str) -> dict:
    raw = await get_invoice_by_id(invoice_id)           # step 1
    if raw["status"] == "error": return raw
    enriched = await enrich_with_client_data(raw["data"])  # step 2
    return await generate_pdf(enriched["data"])            # step 3
```

Expose ce pipeline comme **un seul tool** à l'agent. L'agent n'a pas à orchestrer les 3 étapes.

---

### 7. MCP Server (partage inter-agents)

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("mon-mcp-server")

@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="search_web",
            description="Recherche des infos récentes. Utiliser pour toute question post-2024.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "max_results": {"type": "integer", "default": 5}
                },
                "required": ["query"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "search_web":
        result = await search_web(**arguments)
        return [TextContent(type="text", text=json.dumps(result))]
    raise ValueError(f"Outil inconnu : {name}")

# Lancement stdio
async def main():
    async with stdio_server() as (r, w):
        await app.run(r, w, app.create_initialization_options())
```

**Choisir le transport :**
- `stdio` → usage local (Claude Desktop, Claude Code, scripts)
- `HTTP+SSE` (FastMCP) → usage distant, multi-clients, auth OAuth2

---

### 8. Sécurité

Checklist à appliquer sur chaque outil :

- [ ] **Validation input** — Pydantic avec contraintes strictes (`min_length`, `pattern`, `enum`)
- [ ] **Sanitisation** — rejette les injections SQL, prompt injection, path traversal (`../`)
- [ ] **Sandboxing** — outils d'exécution de code dans Docker ou subprocess avec timeout
- [ ] **Rate limiting** — par outil ET par session (ex. max 10 calls/min pour `send_email`)
- [ ] **Permission scoping** — l'agent reçoit uniquement les outils autorisés pour la session
- [ ] **Budget par outil** — coût max par appel pour les APIs payantes (éviter les loops infinis)
- [ ] **Audit log** — chaque appel loggé avec tool_name, user_id, timestamp, inputs (sans secrets)

```python
# Exemple rate limiting simple
from collections import defaultdict
import time

call_counts: dict[str, list[float]] = defaultdict(list)

def check_rate_limit(tool_name: str, user_id: str, max_calls: int = 10, window: int = 60):
    key = f"{tool_name}:{user_id}"
    now = time.time()
    call_counts[key] = [t for t in call_counts[key] if now - t < window]
    if len(call_counts[key]) >= max_calls:
        raise PermissionError(f"Rate limit: {max_calls} appels/{window}s pour {tool_name}")
    call_counts[key].append(now)
```

---

### 9. Testing des tools

```python
import pytest

@pytest.mark.asyncio
async def test_search_web_valid():
    result = await search_web(query="Python asyncio tutorial", max_results=3)
    assert result["status"] == "success"
    assert len(result["data"]) <= 3

@pytest.mark.asyncio
async def test_search_web_empty_query():
    result = await search_web(query="")
    assert result["status"] == "error"
    assert result["code"] == "INVALID_INPUT"

@pytest.mark.asyncio
async def test_search_web_timeout(monkeypatch):
    async def slow_get(*args, **kwargs):
        raise httpx.TimeoutException("timeout")
    monkeypatch.setattr(httpx.AsyncClient, "get", slow_get)
    result = await search_web(query="test")
    assert result["code"] == "TIMEOUT"
```

**Matrice de test pour chaque outil :**
1. Input valide nominal → succès attendu
2. Input invalide (type, longueur, enum) → erreur `INVALID_INPUT`
3. API downstream en erreur (4xx, 5xx) → erreur propre (pas d'exception non catchée)
4. Timeout → erreur `TIMEOUT`
5. Parallel calls (si supporté) → pas de race condition

---

### 10. Monitoring

```python
import structlog
import time

log = structlog.get_logger()

async def instrumented_dispatch(tool_call) -> dict:
    name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)
    start = time.perf_counter()
    result = await TOOL_REGISTRY[name]["fn"](**args)
    duration_ms = (time.perf_counter() - start) * 1000

    log.info(
        "tool_call",
        tool=name,
        duration_ms=round(duration_ms, 1),
        status=result.get("status"),
        error_code=result.get("code"),
        # NE PAS logger les inputs complets (secrets potentiels)
    )
    return result
```

**Métriques à suivre :**
- Taux d'erreur par outil (cible < 2%)
- Latence p95 par outil
- Top 5 outils les plus appelés (détecte les loops)
- Taux d'appels sans résultat utilisé (outil appelé, LLM ignore la réponse → symptôme de description floue)

---

## Anti-patterns à éviter

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| Outil fourre-tout | LLM appelle avec les mauvais params | Découpe en plusieurs outils spécialisés |
| Description vague ("do stuff") | Appels au mauvais moment | Ajouter "Utilise UNIQUEMENT quand..." |
| Exception non catchée | Agent crash sans message utile | `try/except` exhaustif, retour `{"status":"error"}` |
| Trop d'outils dans le prompt | Hallucination de tool names | Dynamic loading par tags/catégorie |
| Output non structuré (plain text) | LLM réinterprète mal | JSON standardisé avec `status` + `data`/`error` |
| Outil avec effets de bord cachés | Actions non voulues | Documenter les effets de bord dans la description |
| Idempotence ignorée | Double send d'email, double débit | Idempotency key côté outil et API downstream |
| Tests absents sur les timeouts | Silent failure en prod | Mocker les timeouts, vérifier le retour |
