---
name: api-caller-subagent
description: Sous-agent spécialisé dans les appels API REST/GraphQL avec retry, auth et transformation de données. Se déclenche avec "sous-agent API", "API caller agent", "agent qui appelle une API", "REST agent", "HTTP agent", "API integration subagent", "external API agent".
---

# API Caller Sub-Agent

## Quand utiliser ce skill

Utiliser ce skill lorsqu'un agent parent doit déléguer des appels à des APIs externes (REST ou GraphQL) à un sous-agent autonome et robuste. Idéal pour orchestrer des intégrations multi-APIs dans un workflow agent, gérer automatiquement l'authentification et le rafraîchissement de tokens, paginer des résultats volumineux, ou normaliser des réponses hétérogènes dans un schéma unifié attendu par l'agent parent.

## Workflow

1. **Interface et validation des inputs** — Recevoir depuis l'agent parent : `url` (endpoint cible), `method` (HTTP verb), `auth` (configuration d'authentification), `params` (query params, body, headers), `expected_schema` (schéma de transformation de la réponse). Valider l'URL (format, protocole HTTPS obligatoire), la méthode HTTP, et la présence des credentials requis avant toute requête.

2. **Authentication handling** — Résoudre et appliquer le schéma d'authentification configuré : `api_key` (header ou query param), `bearer` (Authorization: Bearer {token}), `oauth2` (client credentials flow, authorization code flow), `jwt` (génération et signature si secret fourni), `basic` (Base64 username:password). Gérer le rafraîchissement automatique des tokens expirés via `refresh_token` ou re-authentification.

3. **Request construction** — Assembler la requête HTTP complète : headers standards (`Content-Type`, `Accept`, `User-Agent`, `X-Request-ID` pour le tracing), paramètres de query string (encodage correct, arrays, nested objects), corps de requête (JSON, form-data, multipart, XML selon `Content-Type`). Pour GraphQL : wrapper la query/mutation dans `{"query": ..., "variables": ...}`.

4. **Exécution avec retry** — Exécuter la requête via `httpx` (async) ou `requests`. Implémenter le retry avec backoff exponentiel (délais : 1s, 2s, 4s, 8s) pour les erreurs transitoires (5xx, timeout, `ConnectionError`). Configurer un circuit breaker (ouvrir après 5 échecs consécutifs, demi-ouverture après 60s). Respecter un `timeout` global par requête (défaut : 30s).

5. **Pagination handling** — Détecter et gérer automatiquement les stratégies de pagination : `offset/limit` (paramètres classiques), `cursor-based` (champ `next_cursor` ou `after` dans la réponse), `page-based` (paramètre `page`), `Link header` (RFC 5988, `rel="next"`). Agréger toutes les pages jusqu'à épuisement ou atteinte de `max_records`. Désactiver si `paginate: false`.

6. **Response parsing** — Détecter automatiquement le format de réponse via `Content-Type` : JSON (`application/json`), XML (`application/xml`, parser avec `lxml`), CSV (`text/csv`, parser avec `pandas`), texte brut. Valider la réponse contre `expected_schema` via `jsonschema`. Extraire le sous-objet pertinent si la réponse est enveloppée (`data`, `results`, `items`).

7. **Rate limit respect** — Lire les en-têtes de rate limiting standards : `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`. Calculer proactivement les délais nécessaires entre requêtes. Implémenter un throttler adaptatif qui ralentit avant d'atteindre 0 requêtes restantes. Remonter les informations de quota à l'agent parent dans chaque réponse.

8. **Error mapping** — Transformer les codes HTTP en messages d'erreur sémantiques : 400 (requête malformée + détail du champ invalide), 401 (échec authentification), 403 (accès interdit, permissions insuffisantes), 404 (ressource introuvable), 429 (rate limit dépassé, attendre N secondes), 5xx (erreur serveur, retryable). Gérer les succès partiels (207 Multi-Status).

9. **Caching** — Implémenter le cache HTTP conditionnel : stocker `ETag` et `Last-Modified` des réponses. Envoyer `If-None-Match` / `If-Modified-Since` sur les requêtes suivantes. Respecter les directives `Cache-Control` (`max-age`, `no-cache`, `private`). Cache en mémoire (dict) ou persistant (SQLite) selon `cache_backend` configuré.

10. **Data transformation** — Appliquer les transformations de mapping définies dans `expected_schema` : renommer les champs, changer les types (string → int, ISO date → timestamp), filtrer les champs inutiles, enrichir avec des champs calculés, aplatir les structures imbriquées. Retourner les données au format exactement attendu par l'agent parent.

## Interface du sous-agent

**Input schema :**
```python
{
  "url": str,                     # Endpoint API (obligatoire, HTTPS recommandé)
  "method": str,                  # "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "GRAPHQL"
  "auth": {                       # Configuration authentification (optionnel)
    "type": str,                  # "api_key" | "bearer" | "oauth2" | "jwt" | "basic" | "none"
    "credentials": dict           # Credentials spécifiques au type (token, client_id, etc.)
  },
  "params": {                     # Paramètres de la requête (optionnel)
    "query": dict,                # Query string parameters
    "body": dict,                 # Corps de la requête (POST/PUT/PATCH)
    "headers": dict               # Headers additionnels
  },
  "expected_schema": dict,        # Schéma JSON de transformation de la réponse (optionnel)
  "paginate": bool,               # Activer la pagination automatique (défaut: False)
  "max_records": int,             # Limite d'enregistrements totaux (défaut: 1000)
  "timeout": int,                 # Timeout par requête en secondes (défaut: 30)
  "max_retries": int,             # Nombre maximum de retries (défaut: 3)
  "cache_ttl": int,               # TTL du cache en secondes (0 = désactivé, défaut: 0)
  "graphql_query": str            # Query/mutation GraphQL (si method = "GRAPHQL")
}
```

**Output schema :**
```python
{
  "data": any,                    # Données parsées et transformées (list ou dict)
  "status": int,                  # Code HTTP de la dernière requête réussie
  "pagination": {                 # Informations de pagination
    "total_records": int,
    "pages_fetched": int,
    "has_more": bool,
    "next_cursor": str            # Curseur pour reprise si max_records atteint
  },
  "errors": list[dict],           # [{"attempt": int, "status": int, "message": str}]
  "rate_limit_info": dict,        # {"remaining": int, "reset_at": str, "limit": int}
  "cached": bool,                 # True si servi depuis le cache
  "execution_time_s": float       # Durée totale en secondes
}
```

**Librairies Python recommandées :**
```
httpx>=0.25.0
requests>=2.31.0
aiohttp>=3.9.0
tenacity>=8.2.0
jsonschema>=4.20.0
lxml>=4.9.0
pandas>=2.0.0
PyJWT>=2.8.0
```

## Règles

1. **Interface contractuelle stricte** — Le sous-agent valide exhaustivement le schéma d'entrée avant toute opération réseau. Une URL invalide, un type d'auth inconnu ou des credentials manquants doivent retourner immédiatement un output d'erreur formaté, jamais une exception non catchée. L'agent parent doit toujours recevoir un output conforme au schéma de sortie.

2. **Sécurité des credentials** — Les credentials (tokens, clés API, mots de passe) ne doivent jamais apparaître dans les logs, les messages d'erreur, ou le champ `errors` de l'output. Les masquer systématiquement (`Bearer sk-***...`). Ne jamais persister des credentials sur disque en clair. Utiliser des variables d'environnement ou un gestionnaire de secrets en production.

3. **Robustesse et idempotence** — Les requêtes `GET` doivent être retryables sans risque. Les requêtes mutatives (`POST`, `PUT`, `DELETE`) ne doivent être retryées qu'avec un mécanisme d'idempotence (header `Idempotency-Key`). Le circuit breaker doit protéger les APIs tierces contre les tempêtes de retry. En cas d'échec total, `data` retourne `null` et `errors` contient l'historique complet.

4. **Réutilisabilité universelle** — Le sous-agent doit fonctionner avec n'importe quelle API REST ou GraphQL publique sans modification de code. Toute spécificité d'une API (endpoint de refresh token, format de pagination non-standard) doit être configurable via le schéma d'entrée, jamais hardcodée.

5. **Code Python fonctionnel fourni** — Fournir une implémentation complète de la classe `APICallerSubAgent` avec méthodes `run(input_schema) -> output_schema`, `_authenticate()`, `_execute_with_retry()`, `_paginate()`, `_transform_response()`, support async via `asyncio`, et un exemple d'orchestration multi-APIs par un agent parent.
