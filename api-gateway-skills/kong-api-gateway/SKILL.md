---
name: kong-api-gateway
description: Configuration de Kong API Gateway — services, routes, plugins, rate limiting, authentification et monitoring. À utiliser quand l'utilisateur configure Kong, gère des APIs avec Kong ou implémente des plugins. Se déclenche aussi avec "Kong", "Kong Gateway", "Kong plugin", "Kong route", "API gateway Kong", "kong.yml", "Kong declarative". Also triggers on "Kong plugins", "API gateway with Kong".
---

# Kong API Gateway

## Workflow en 6 étapes

### 1. Choisir le mode de déploiement

| Critère | DB-less (declarative) | DB (PostgreSQL) |
|---|---|---|
| Environnement immutable / GitOps | Oui | Non |
| Portail dev, plugins KonnectCI | Non | Oui |
| Multi-noeud avec sync dynamique | Non | Oui |
| Démarrage simple (Docker, K8s) | Oui | Non |

Règle : choisir **DB-less** par défaut. Passer en mode DB uniquement si Kong Manager, Konnect, ou des plugins enterprise nécessitent une base.

### 2. Écrire le kong.yml (DB-less)

```yaml
_format_version: "3.0"
_transform: true   # permet d'utiliser des urls courtes (http://host:port)

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
        methods: [GET, POST, PUT, DELETE]
        strip_path: true
        preserve_host: false
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
          redis_host: redis
          redis_port: 6379
      - name: jwt
        config:
          claims_to_verify: [exp]
          key_claim_name: kid

  - name: order-service
    url: http://order-api:8080
    routes:
      - name: order-route
        paths: [/api/orders]
        strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 200
          policy: local          # local si pas de Redis, attention au multi-noeud
      - name: cors
        config:
          origins: [https://app.company.com]
          methods: [GET, POST, OPTIONS]
          headers: [Authorization, Content-Type]
          exposed_headers: [X-Request-ID]
          credentials: true
          max_age: 3600

# Consumers (pour JWT / Key Auth)
consumers:
  - username: mobile-app
    jwt_secrets:
      - key: mobile-app-key
        algorithm: RS256
        rsa_public_key: |
          -----BEGIN PUBLIC KEY-----
          ...
          -----END PUBLIC KEY-----

# Plugins globaux (s'appliquent à toutes les routes)
plugins:
  - name: prometheus
    config:
      per_consumer: true
      status_code_metrics: true
      latency_metrics: true
  - name: correlation-id
    config:
      header_name: X-Request-ID
      generator: uuid#counter
      echo_downstream: true
  - name: http-log
    config:
      http_endpoint: http://log-aggregator:5044
      timeout: 1000
      keepalive: 60000
```

### 3. Valider et appliquer la configuration

```bash
# Valider la syntaxe AVANT de déployer
kong config parse kong.yml

# DB-less : rechargement à chaud via Admin API (pas de downtime)
curl -sX POST http://localhost:8001/config \
  -F config=@kong.yml

# DB : import initial
kong config db_import kong.yml

# Vérifier l'état après rechargement
curl -s http://localhost:8001/status | jq .
```

### 4. Démarrer Kong (Docker Compose)

```yaml
services:
  kong:
    image: kong:3.9          # version LTS 2026
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /etc/kong/kong.yml
      KONG_PROXY_LISTEN: "0.0.0.0:8000, 0.0.0.0:8443 ssl"
      KONG_ADMIN_LISTEN: "127.0.0.1:8001"   # jamais 0.0.0.0 en prod
      KONG_LOG_LEVEL: warn
      KONG_NGINX_WORKER_PROCESSES: auto
      KONG_PLUGINS: bundled              # ou liste explicite
    ports:
      - "8000:8000"    # HTTP proxy
      - "8443:8443"    # HTTPS proxy
    volumes:
      - ./kong.yml:/etc/kong/kong.yml:ro
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Redis pour rate-limiting distribué (multi-noeud obligatoire)
  redis:
    image: redis:7-alpine
    command: redis-server --save "" --appendonly no
```

### 5. Opérations courantes via Admin API

```bash
# Lister / inspecter
curl -s http://localhost:8001/services | jq '.data[].name'
curl -s http://localhost:8001/routes   | jq '.data[] | {name, paths}'
curl -s http://localhost:8001/plugins  | jq '.data[] | {name, enabled}'

# Désactiver un plugin à chaud (sans redémarrage)
PLUGIN_ID=$(curl -s http://localhost:8001/plugins?name=jwt | jq -r '.data[0].id')
curl -sX PATCH http://localhost:8001/plugins/$PLUGIN_ID \
  -d enabled=false

# Tester une route (proxy sur port 8000)
curl -sI -H "Authorization: Bearer <token>" http://localhost:8000/api/payments

# Recharger la config sans downtime (DB-less)
curl -sX POST http://localhost:8001/config -F config=@kong.yml | jq .
```

### 6. Monitoring et observabilité

```bash
# Métriques Prometheus (scraper sur :8001/metrics)
curl -s http://localhost:8001/metrics | grep kong_http

# Règle Prometheus à ajouter dans prometheus.yml :
# - job_name: kong
#   static_configs:
#     - targets: ['kong:8001']

# Grafana dashboard ID officiel Kong : 7424
```

## Plugins essentiels — tableau de décision

| Plugin | Quand l'utiliser | Scope recommandé |
|---|---|---|
| `rate-limiting` | Toutes les routes publiques | Par route (sinon trop permissif) |
| `rate-limiting-advanced` | Fenêtres glissantes, quotas par consumer | Par route / consumer |
| `jwt` | Auth stateless, microservices | Par route |
| `oauth2` | Auth déléguée, portail dev | Par service |
| `key-auth` | API B2B simple, M2M | Par route |
| `acl` | Restriction par groupe après auth | Après `jwt`/`key-auth` |
| `cors` | APIs consommées depuis un browser | Par route |
| `ip-restriction` | Whitelist/blacklist CIDRs | Par route/service |
| `request-transformer` | Ajouter/supprimer headers avant upstream | Par route |
| `response-transformer` | Masquer headers internes | Par route |
| `prometheus` | Métriques latence, codes HTTP | Global |
| `correlation-id` | Traçabilité distribuée | Global (toujours) |
| `http-log` / `file-log` | Centralisation des logs | Global ou par service |
| `proxy-cache` | Réduire la charge upstream (GET) | Par route |
| `bot-detection` | Bloquer les crawlers/bots | Global |

## Anti-patterns et pièges

**Rate limiting sans Redis en multi-noeud** : `policy: local` compte par noeud Kong, pas globalement. Avec 3 réplicas, un client peut envoyer 3× le quota. Toujours utiliser `policy: redis` dès qu'il y a plus d'une instance.

**Admin API exposée publiquement** : `KONG_ADMIN_LISTEN: 0.0.0.0:8001` est une faille critique. Restreindre à `127.0.0.1` ou un réseau interne, puis protéger avec `ip-restriction` ou mTLS.

**Plugin `cors` avec `origins: ["*"]` et `credentials: true`** : combinaison invalide côté navigateur (CORS spec). Toujours lister les origines explicitement si `credentials: true`.

**strip_path mal configuré** : si `strip_path: false` et que le service upstream ne s'attend pas au préfixe `/api/payments`, toutes les requêtes retournent 404. Valider avec `curl -v`.

**Order des plugins** : Kong applique les plugins dans l'ordre de priorité interne (pas l'ordre du YAML). Vérifier avec `GET /plugins?size=100` pour confirmer que `jwt` s'exécute avant `acl`.

**Timeouts trop courts sur des endpoints batch** : `read_timeout: 60000` (60 s) par défaut. Pour des imports lourds, augmenter explicitement par route avec `config.read_timeout` dans le plugin `request-termination` ou via un service dédié.

**Rechargement DB-less sans validation préalable** : `POST /config` sans `kong config parse` peut corrompre l'état en mémoire si le YAML est invalide. Toujours valider d'abord.

## Bonnes pratiques 2026

- Fixer la version image (`kong:3.9`, pas `kong:latest`) et la mettre à jour via une PR revue.
- Stocker `kong.yml` en Git, appliquer via CI/CD (`kong config parse` en étape de lint, `POST /config` en deploy).
- Pour Kubernetes, utiliser le **Kong Ingress Controller** (KIC 3.x) avec CRDs `KongPlugin`, `KongIngress` — évite de gérer le kong.yml manuellement.
- Activer HTTPS côté proxy (`8443`) avec TLS terminé sur Kong ; ne jamais laisser le trafic entre Kong et le client en HTTP en production.
- Séparer les plugins de sécurité (auth, rate limit) des plugins d'observabilité (logs, metrics) dans la configuration pour faciliter l'audit.
- Tester les règles de routing avec `curl -v --resolve` avant déploiement pour éviter les surprises `strip_path` / `preserve_host`.
