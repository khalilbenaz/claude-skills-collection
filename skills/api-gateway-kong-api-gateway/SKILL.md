---
name: api-gateway-kong-api-gateway
description: Configuration de Kong API Gateway — services, routes, plugins, rate limiting, authentification et monitoring. À utiliser quand l'utilisateur configure Kong, gère des APIs avec Kong ou implémente des plugins. Se déclenche aussi avec "Kong", "Kong Gateway", "Kong plugin", "Kong route", "API gateway Kong", "kong.yml", "Kong declarative".
---

# Kong API Gateway

## Workflow

1. **Définir les services** : backend APIs à exposer.
2. **Configurer les routes** : mapping des chemins/hosts vers les services.
3. **Appliquer les plugins** : sécurité, rate limiting, logging.
4. **Monitorer** : métriques, logs, health checks.

## Configuration déclarative (kong.yml)

```yaml
_format_version: "3.0"

services:
  - name: payment-service
    url: http://payment-api:8080
    connect_timeout: 5000
    write_timeout: 60000
    read_timeout: 60000
    retries: 3
    routes:
      - name: payment-route
        paths:
          - /api/payments
        methods:
          - GET
          - POST
          - PUT
          - DELETE
        strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
          redis_host: redis
      - name: jwt
        config:
          claims_to_verify:
            - exp

  - name: order-service
    url: http://order-api:8080
    routes:
      - name: order-route
        paths:
          - /api/orders
        strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 200
      - name: cors
        config:
          origins:
            - https://app.company.com
          methods:
            - GET
            - POST
          headers:
            - Authorization
            - Content-Type
          max_age: 3600

# Plugins globaux
plugins:
  - name: prometheus
    config:
      per_consumer: true
  - name: file-log
    config:
      path: /var/log/kong/access.log
      reopen: true
  - name: correlation-id
    config:
      header_name: X-Request-ID
      generator: uuid
```

## Plugins essentiels

| Plugin | Usage | Scope |
|--------|-------|-------|
| **rate-limiting** | Limiter les requêtes | Par route/service/consumer |
| **jwt** / **oauth2** | Authentification | Par route/service |
| **cors** | Cross-Origin requests | Par route/service |
| **prometheus** | Métriques | Global |
| **file-log** / **http-log** | Logging | Global/par route |
| **correlation-id** | Traçabilité | Global |
| **request-transformer** | Modifier les requêtes | Par route |
| **response-transformer** | Modifier les réponses | Par route |
| **ip-restriction** | Whitelist/blacklist IP | Par route/service |
| **acl** | Contrôle d'accès par groupe | Par route |

## Administration

```bash
# Vérifier la configuration
kong config parse kong.yml

# Appliquer la config déclarative
kong config db_import kong.yml

# Admin API
curl http://localhost:8001/services           # Lister les services
curl http://localhost:8001/routes             # Lister les routes
curl http://localhost:8001/plugins            # Lister les plugins
curl http://localhost:8001/status             # Santé de Kong
```

## Docker Compose

```yaml
services:
  kong:
    image: kong:3.6
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_PROXY_LISTEN: 0.0.0.0:8000
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
      KONG_LOG_LEVEL: info
    ports:
      - "8000:8000"   # Proxy
      - "8001:8001"   # Admin API
    volumes:
      - ./kong.yml:/kong/kong.yml:ro
```

## Règles
- Préférer le mode **declarative** (DB-less) pour les environnements immutables.
- Les plugins de sécurité (rate limiting, auth) doivent être configurés **par route**, pas globalement.
- Toujours activer le plugin **correlation-id** pour la traçabilité distribuée.
- Exposer l'Admin API uniquement sur un réseau interne, jamais publiquement.


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
