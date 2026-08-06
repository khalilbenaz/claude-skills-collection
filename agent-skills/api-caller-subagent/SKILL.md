---
name: api-caller-subagent
description: Sous-agent spécialisé dans les appels API REST/GraphQL avec retry, auth et transformation de données. Se déclenche avec "sous-agent API", "API caller agent", "agent qui appelle une API", "REST agent", "HTTP agent", "API integration subagent", "external API agent". Also triggers on "subagent that calls an API", "API calling agent", "agent HTTP requests".
---

# API Caller Sub-Agent

## Quand utiliser ce skill

Déléguer à ce sous-agent tout appel réseau sortant depuis un agent parent : intégration d'APIs tierces, scraping structuré via API, agrégation multi-sources, synchronisation de données.

**Critères de décision :**
- Plusieurs APIs différentes dans le même workflow → sous-agent par API ou sous-agent unique réutilisé
- Auth complexe (OAuth2, rotation de token) → toujours isoler dans ce sous-agent
- Pagination ou rate limiting → laisser le sous-agent gérer, l'agent parent ne voit qu'un tableau plat
- Requête unique simple GET sans auth → acceptable en direct si le contexte est simple

---

## Workflow en 10 étapes

### 1. Validation des inputs

Avant toute connexion réseau, valider :

```python
from urllib.parse import urlparse

def validate_input(inp: dict) -> None:
    parsed = urlparse(inp["url"])
    assert parsed.scheme in ("https", "http"), "Schéma invalide"
    assert parsed.netloc, "URL sans hôte"
    assert inp["method"].upper() in (
        "GET","POST","PUT","PATCH","DELETE","HEAD","GRAPHQL"
    ), f"Méthode inconnue: {inp['method']}"
    if inp.get("auth", {}).get("type") not in (
        None,"none","api_key","bearer","oauth2","jwt","basic"
    ):
        raise ValueError("auth.type non supporté")
```

Retourner immédiatement un output d'erreur formaté sans lever d'exception non catchée.

---

### 2. Résolution de l'authentification

Choisir le handler selon `auth.type` :

| Type | Implémentation |
|------|---------------|
| `api_key` | Header `X-Api-Key` ou query param `?api_key=` |
| `bearer` | `Authorization: Bearer {token}` |
| `basic` | `Authorization: Basic {b64(user:pass)}` |
| `oauth2` | Client Credentials : POST `/token`, stocker + rafraîchir |
| `jwt` | `PyJWT.encode(payload, secret, algorithm="HS256")` |

```python
import base64, httpx, jwt, time

def build_auth_headers(auth: dict) -> dict:
    t = auth.get("type", "none")
    c = auth.get("credentials", {})
    if t == "bearer":
        return {"Authorization": f"Bearer {c['token']}"}
    if t == "basic":
        raw = base64.b64encode(f"{c['username']}:{c['password']}".encode()).decode()
        return {"Authorization": f"Basic {raw}"}
    if t == "api_key":
        return {c.get("header_name", "X-Api-Key"): c["key"]}
    if t == "jwt":
        token = jwt.encode(
            {"sub": c.get("sub","agent"), "exp": int(time.time()) + 3600},
            c["secret"], algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}
    return {}
```

**Refresh OAuth2 :** stocker `(access_token, expires_at)` en mémoire ; re-demander un token si `expires_at - now < 60s`.

---

### 3. Construction de la requête

```python
import httpx

def build_request(inp: dict, auth_headers: dict) -> dict:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "APICallerSubAgent/1.0",
        "X-Request-ID": str(uuid.uuid4()),
        **auth_headers,
        **(inp.get("params", {}).get("headers", {})),
    }
    method = inp["method"].upper()
    if method == "GRAPHQL":
        method = "POST"
        body = {"query": inp["graphql_query"], "variables": inp.get("params", {}).get("body", {})}
    else:
        body = inp.get("params", {}).get("body")

    return dict(
        method=method, url=inp["url"],
        params=inp.get("params", {}).get("query"),
        json=body, headers=headers,
        timeout=inp.get("timeout", 30),
    )
```

---

### 4. Exécution avec retry et circuit breaker

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

RETRYABLE = (httpx.TimeoutException, httpx.ConnectError)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(RETRYABLE),
    reraise=True,
)
def execute(req: dict) -> httpx.Response:
    with httpx.Client() as client:
        resp = client.request(**req)
    if resp.status_code >= 500:
        resp.raise_for_status()   # force un retry via tenacity
    return resp
```

**Circuit breaker** : utiliser `circuitbreaker` (pip) ou un compteur local ; ouvrir après 5 erreurs 5xx consécutives, demi-ouverture après 60s.

---

### 5. Rate limiting proactif

```python
import time

def respect_rate_limit(resp: httpx.Response) -> None:
    remaining = int(resp.headers.get("X-RateLimit-Remaining", 1))
    reset_ts   = int(resp.headers.get("X-RateLimit-Reset", 0))
    retry_after = int(resp.headers.get("Retry-After", 0))

    if resp.status_code == 429 or remaining == 0:
        wait = max(retry_after, reset_ts - int(time.time()), 1)
        time.sleep(wait)
```

---

### 6. Pagination automatique

```python
def paginate(inp: dict, first_resp: dict) -> list:
    results = first_resp.get("data", [])
    cursor = first_resp.get("next_cursor") or first_resp.get("meta", {}).get("next")
    page = 2
    max_r = inp.get("max_records", 1000)

    while cursor and len(results) < max_r:
        paged_inp = dict(inp)
        q = dict(inp.get("params", {}).get("query") or {})
        q["cursor"] = cursor  # adapter selon l'API : page=page, offset=len(results)
        paged_inp.setdefault("params", {})["query"] = q
        resp = execute(build_request(paged_inp, {}))
        body = resp.json()
        results.extend(body.get("data", []))
        cursor = body.get("next_cursor")
        page += 1

    return results[:max_r]
```

Stratégies supportées : `offset/limit`, `cursor`, `page`, `Link header` (RFC 5988).

---

### 7. Parsing de la réponse

```python
import json
from lxml import etree

def parse_response(resp: httpx.Response) -> any:
    ct = resp.headers.get("Content-Type", "")
    if "json" in ct:
        return resp.json()
    if "xml" in ct:
        root = etree.fromstring(resp.content)
        return etree.tostring(root, method="text").decode()
    if "csv" in ct:
        import io, pandas as pd
        return pd.read_csv(io.StringIO(resp.text)).to_dict(orient="records")
    return resp.text
```

---

### 8. Transformation et mapping

```python
def transform(data: any, schema: dict) -> any:
    """schema = {"field_map": {"old": "new"}, "drop": [...], "cast": {"field": "int"}}"""
    if not schema or not isinstance(data, (list, dict)):
        return data
    rows = data if isinstance(data, list) else [data]
    field_map = schema.get("field_map", {})
    drop = set(schema.get("drop", []))
    cast = schema.get("cast", {})
    out = []
    for row in rows:
        r = {field_map.get(k, k): v for k, v in row.items() if k not in drop}
        for f, typ in cast.items():
            if f in r:
                r[f] = __builtins__[typ](r[f]) if isinstance(__builtins__, dict) \
                       else getattr(__builtins__, typ, lambda x: x)(r[f])
        out.append(r)
    return out if isinstance(data, list) else out[0]
```

---

### 9. Mapping des erreurs HTTP

| Code | Sémantique | Retryable |
|------|-----------|-----------|
| 400 | Requête malformée — inspecter `errors` dans le corps | Non |
| 401 | Token expiré — tenter un refresh, puis échouer | 1 fois |
| 403 | Permissions insuffisantes | Non |
| 404 | Ressource absente | Non |
| 422 | Validation métier | Non |
| 429 | Rate limit — lire `Retry-After` | Oui (après attente) |
| 5xx | Erreur serveur transitoire | Oui (backoff) |

---

### 10. Output normalisé vers l'agent parent

```python
{
  "data": [...],              # Données transformées
  "status": 200,
  "pagination": {
    "total_records": 342,
    "pages_fetched": 4,
    "has_more": False,
    "next_cursor": None
  },
  "errors": [],               # [{"attempt": 1, "status": 503, "message": "..."}]
  "rate_limit_info": {"remaining": 98, "reset_at": "2026-06-24T12:00:00Z", "limit": 100},
  "cached": False,
  "execution_time_s": 1.23
}
```

---

## Schéma d'entrée complet

```python
{
  "url": str,            # HTTPS recommandé, obligatoire
  "method": str,         # GET | POST | PUT | PATCH | DELETE | GRAPHQL
  "auth": {
    "type": str,         # api_key | bearer | oauth2 | jwt | basic | none
    "credentials": dict  # token / key / client_id+secret / username+password
  },
  "params": {
    "query": dict,       # Query string
    "body": dict,        # Corps JSON / form-data
    "headers": dict      # Headers additionnels
  },
  "graphql_query": str,  # Si method=GRAPHQL
  "expected_schema": dict,
  "paginate": bool,      # défaut: False
  "max_records": int,    # défaut: 1000
  "timeout": int,        # défaut: 30s
  "max_retries": int,    # défaut: 3
  "cache_ttl": int       # défaut: 0 (désactivé)
}
```

---

## Garde-fous & anti-patterns

| Anti-pattern | Conséquence | Remède |
|---|---|---|
| Retrier un POST sans `Idempotency-Key` | Doublon côté API | Envoyer `Idempotency-Key: {uuid}` à chaque POST |
| Logger le token en clair | Fuite de credentials | Masquer : `sk-***...` dans tous les logs |
| Timeout infini (pas de timeout) | Blocage agent parent | Toujours définir `timeout=30` |
| Ignorer `Retry-After` sur 429 | Ban IP immédiat | Lire l'en-tête, dormir exactement ce délai |
| Agréger sans limite de pages | OOM sur API volumineuse | Respecter `max_records`, retourner `has_more: True` |
| Hardcoder l'URL de token OAuth2 | Non réutilisable | Passer `credentials.token_url` dans le schéma |
| Retry sur 4xx | Requêtes inutiles | Ne retrier QUE 5xx, 429 et erreurs réseau |
| Renvoyer une exception Python à l'agent parent | Crash orchestrateur | Toujours retourner le schéma de sortie, `data: null` si erreur totale |

---

## Librairies Python recommandées

```
httpx>=0.27.0        # HTTP async/sync, HTTP/2
tenacity>=8.3.0      # Retry déclaratif
circuitbreaker>=2.0  # Circuit breaker
PyJWT>=2.8.0         # Tokens JWT
jsonschema>=4.22.0   # Validation schéma réponse
lxml>=5.2.0          # Parsing XML
pandas>=2.2.0        # Parsing CSV
```

---

## Exemple d'orchestration multi-APIs

```python
import asyncio, httpx
from typing import Any

async def fetch_one(inp: dict) -> dict:
    # Instancier APICallerSubAgent et appeler .run(inp)
    agent = APICallerSubAgent()
    return await agent.run(inp)

async def main():
    tasks = [
        fetch_one({"url": "https://api.service-a.com/users", "method": "GET",
                   "auth": {"type": "bearer", "credentials": {"token": "..."}},
                   "paginate": True, "max_records": 500}),
        fetch_one({"url": "https://api.service-b.com/products", "method": "GET",
                   "auth": {"type": "api_key", "credentials": {"key": "..."}}}),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    users    = results[0]["data"] if not isinstance(results[0], Exception) else []
    products = results[1]["data"] if not isinstance(results[1], Exception) else []
    # Fusionner, enrichir, renvoyer à l'agent parent
    return {"users": users, "products": products}
```
