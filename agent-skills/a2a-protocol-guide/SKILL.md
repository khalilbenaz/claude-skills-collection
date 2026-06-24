---
name: a2a-protocol-guide
description: Guide du protocole Agent-to-Agent (A2A) de Google pour l'interopérabilité entre agents IA — découverte, communication et collaboration inter-agents, avec exemples de code, critères de décision et pièges à éviter. Se déclenche avec "A2A", "agent-to-agent", "protocole A2A", "Google A2A", "interopérabilité agents".
---

# Guide du Protocole A2A

## Concepts fondamentaux

| Composant | Rôle |
|-----------|------|
| **Agent Card** | Fichier JSON décrivant l'agent (skills, endpoint, auth) — publié sur `/.well-known/agent.json` |
| **Task** | Unité de travail délégué ; cycle : `submitted → working → completed / failed / canceled` |
| **Artifact** | Résultat produit par une tâche (fichier, JSON, message) |
| **Part** | Fragment d'un message ou artifact : `TextPart`, `FilePart`, `DataPart` |
| **Client / Server** | Un agent peut être les deux selon la direction de l'appel |

---

## Workflow en étapes

### 1. Définir l'Agent Card

Fichier minimal exposé sur `GET /.well-known/agent.json` :

```json
{
  "name": "DataExtractorAgent",
  "description": "Extrait des données structurées depuis des documents PDF",
  "url": "https://agent.example.com/a2a",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "authentication": {
    "schemes": ["Bearer"]
  },
  "skills": [
    {
      "id": "extract-invoice",
      "name": "Invoice Extraction",
      "description": "Retourne les champs clés d'une facture PDF",
      "examples": ["Extrais les montants de cette facture"],
      "inputModes": ["application/pdf"],
      "outputModes": ["application/json"]
    }
  ]
}
```

**Critère de décision — streaming** : active `streaming: true` si les tâches durent > 5 s ou produisent des résultats progressifs. Sinon, mode synchrone suffit.

---

### 2. Implémenter le serveur A2A (JSON-RPC 2.0)

Endpoint unique `POST /a2a` — méthodes requises :

| Méthode | Usage |
|---------|-------|
| `tasks/send` | Tâche synchrone (réponse directe) |
| `tasks/sendSubscribe` | Tâche longue — SSE stream |
| `tasks/get` | Consulter statut + artifacts |
| `tasks/cancel` | Annuler une tâche en cours |

```python
# FastAPI — squelette minimal
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
import uuid, asyncio

app = FastAPI()

tasks_store = {}  # En prod : Redis ou DB

@app.post("/a2a")
async def a2a_handler(request: Request):
    body = await request.json()
    method = body.get("method")
    params = body.get("params", {})
    rpc_id = body.get("id")

    if method == "tasks/send":
        task_id = str(uuid.uuid4())
        result = await run_task(params)
        tasks_store[task_id] = {"status": "completed", "result": result}
        return JSONResponse({
            "jsonrpc": "2.0", "id": rpc_id,
            "result": {"id": task_id, "status": {"state": "completed"}, "artifacts": [result]}
        })

    if method == "tasks/get":
        task_id = params["id"]
        task = tasks_store.get(task_id)
        if not task:
            return JSONResponse({"jsonrpc": "2.0", "id": rpc_id,
                                 "error": {"code": -32001, "message": "Task not found"}})
        return JSONResponse({"jsonrpc": "2.0", "id": rpc_id, "result": task})

    return JSONResponse({"jsonrpc": "2.0", "id": rpc_id,
                         "error": {"code": -32601, "message": "Method not found"}})
```

---

### 3. Appeler un agent distant (côté client)

```python
import httpx, json

async def send_task(agent_url: str, message: str, token: str) -> dict:
    payload = {
        "jsonrpc": "2.0", "id": "1", "method": "tasks/send",
        "params": {
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": message}]
            }
        }
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            agent_url,
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        resp.raise_for_status()
        return resp.json()["result"]
```

---

### 4. Streaming SSE (`tasks/sendSubscribe`)

```python
from fastapi.responses import StreamingResponse

@app.post("/a2a/stream")
async def stream_task(request: Request):
    body = await request.json()

    async def event_generator():
        # Mise à jour intermédiaire
        yield f"data: {json.dumps({'type': 'TaskStatusUpdateEvent', 'status': {'state': 'working'}})}\n\n"
        await asyncio.sleep(1)
        # Résultat final
        artifact = {"type": "DataPart", "data": {"key": "value"}}
        yield f"data: {json.dumps({'type': 'TaskArtifactUpdateEvent', 'artifact': artifact})}\n\n"
        yield f"data: {json.dumps({'type': 'TaskStatusUpdateEvent', 'status': {'state': 'completed'}})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

### 5. Découverte et sélection d'agent

```python
async def discover_agent(base_url: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{base_url}/.well-known/agent.json", timeout=5)
        r.raise_for_status()
        return r.json()

# Critère de sélection
def select_agent(agents: list[dict], required_skill: str) -> dict | None:
    for a in agents:
        skills = [s["id"] for s in a.get("skills", [])]
        if required_skill in skills:
            return a
    return None
```

**Registre simple** : maintenir une liste d'URLs connues + cache de leurs Agent Cards (TTL 5 min). Pour du dynamique, utiliser un service de registre central (ex. : endpoint `GET /agents` dans l'orchestrateur).

---

### 6. Sécurité

- **Transport** : HTTPS obligatoire ; rejeter toute requête HTTP plain.
- **Auth** : OAuth 2.0 Bearer token ou API key dans `Authorization` header — déclarer le scheme dans l'Agent Card.
- **Validation** : vérifier la signature de l'Agent Card si elle provient d'un registre tiers.
- **Autorisation** : liste blanche d'agents autorisés par skill — refuser les appels d'agents inconnus.

```python
# Middleware auth minimal
from fastapi import Depends, HTTPException, Header

async def verify_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401)
    token = authorization[7:]
    if token not in ALLOWED_TOKENS:
        raise HTTPException(status_code=403)
```

---

### 7. Orchestration multi-agents

Pattern **fan-out / fan-in** :

```python
async def orchestrate(agents: list[str], prompt: str) -> list:
    tasks = [send_task(url, prompt, TOKEN) for url in agents]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]
```

Pattern **chaîne séquentielle** : sortie artifact de l'agent N devient le message d'entrée de l'agent N+1. Extraire le bon `Part` depuis `artifacts[0].parts`.

---

### 8. Monitoring et debug

- Propager un `X-Correlation-ID` dans tous les appels inter-agents.
- Logger : `task_id`, `agent_url`, `method`, `status_transition`, `duration_ms`.
- Alertes : tâches en état `working` depuis > timeout configuré → déclencher `tasks/cancel`.
- Sanity check périodique : `GET /.well-known/agent.json` sur chaque agent du registre.

---

## Garde-fous et anti-patterns

| Anti-pattern | Problème | Correct |
|---|---|---|
| Stocker l'état des tâches en mémoire process | Perdu au redémarrage | Redis / DB persistante |
| Pas de timeout sur `tasks/send` | Blocage indéfini | Timeout HTTP + `tasks/cancel` si dépassé |
| Agent Card statique en cache illimité | Capabilities obsolètes | TTL max 5 min, invalider sur erreur 404/401 |
| Exposer `/.well-known/agent.json` sans auth | Enumération par tiers | Auth optionnelle mais recommandée en prod interne |
| Format propriétaire dans les `parts` | Interop cassée | Utiliser `TextPart`, `FilePart`, `DataPart` standard |
| Ignorer les erreurs `return_exceptions` en gather | Résultats silencieusement manquants | Logger chaque exception, circuit breaker si taux > seuil |

## Bonnes pratiques 2026

- Versionner l'Agent Card (`"version"`) et gérer la compatibilité ascendante des skills.
- Implémenter idempotency via un `taskId` côté client — le serveur doit dédupliquer les renvois.
- Limiter la taille des artifacts inline : au-delà de 1 Mo, retourner une URL signée (`FilePart` avec `uri`).
- Déclarer les `inputModes` / `outputModes` MIME précis : facilite la sélection automatique d'agent.
- Tester la conformité avec le SDK officiel Google A2A (`pip install a2a-sdk` ou `npm install @google/a2a`).
