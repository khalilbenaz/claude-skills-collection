---
name: dev-nginx-configurator
description: Configuration Nginx — reverse proxy, SSL/TLS, load balancing, caching et security headers. Se déclenche avec "Nginx", "nginx.conf", "reverse proxy", "SSL Nginx", "load balancer Nginx".
---

# Nginx Configurator

## Workflow

### 1. Identifier l'architecture cible

Définir le rôle avant d'écrire une seule ligne :

| Rôle | Indicateur clé | Directives centrales |
|---|---|---|
| Serveur statique | Pas de backend | `root`, `try_files` |
| Reverse proxy | 1 backend | `proxy_pass`, `proxy_set_header` |
| Load balancer | N backends | `upstream`, `least_conn` |
| API Gateway | Auth, rate-limit, routing fin | `limit_req_zone`, `map`, `auth_request` |
| Cache proxy | Backend lent/coûteux | `proxy_cache_path`, `proxy_cache_valid` |

Recenser : noms de domaine, ports, chemins `/api/`, backends (host:port), contraintes SSL (Let's Encrypt vs certificat interne).

---

### 2. Structure des fichiers — ne pas monolithiser

```
/etc/nginx/
├── nginx.conf              # global (worker_processes, events, http block)
├── conf.d/
│   ├── 00-defaults.conf    # gzip, types, log_format
│   └── upstream.conf       # blocs upstream mutualisés
└── sites-enabled/
    └── monapp.conf         # 1 fichier par vhost
```

```nginx
# nginx.conf — paramètres globaux recommandés 2026
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    server_tokens off;                        # masque la version
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20m;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" rt=$request_time';

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*.conf;
}
```

---

### 3. Bloc serveur de base + reverse proxy

```nginx
# /etc/nginx/sites-enabled/monapp.conf
upstream backend {
    least_conn;
    server 127.0.0.1:3000 weight=3;
    server 127.0.0.1:3001 weight=1 backup;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name app.exemple.com;

    access_log /var/log/nginx/app.access.log main;
    error_log  /var/log/nginx/app.error.log warn;

    # --- SSL (section 4) ---
    ssl_certificate     /etc/letsencrypt/live/app.exemple.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.exemple.com/privkey.pem;

    location / {
        proxy_pass         http://backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";  # WebSocket support
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout    60s;
        proxy_send_timeout    60s;
        proxy_buffering       on;
        proxy_buffer_size     8k;
        proxy_buffers         8 16k;
    }

    location /static/ {
        alias /var/www/app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name app.exemple.com;
    return 301 https://$host$request_uri;
}
```

---

### 4. SSL/TLS — configuration durcie

```nginx
# conf.d/ssl.conf — inclure dans chaque vhost HTTPS
ssl_protocols              TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers  on;
ssl_ciphers                ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384;
ssl_session_cache          shared:SSL:10m;
ssl_session_timeout        1d;
ssl_session_tickets        off;
ssl_stapling               on;
ssl_stapling_verify        on;
resolver                   8.8.8.8 1.1.1.1 valid=300s;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

Obtenir un certificat Let's Encrypt :
```bash
certbot --nginx -d app.exemple.com --email admin@exemple.com --agree-tos --non-interactive
# Renouvellement automatique (cron ou systemd timer déjà créé par certbot)
certbot renew --dry-run
```

---

### 5. Load balancing — critères de choix

| Algorithme | Quand l'utiliser |
|---|---|
| `round-robin` (défaut) | Backends homogènes, requêtes rapides |
| `least_conn` | Requêtes longues, latences variables |
| `ip_hash` | Session affinité obligatoire (stateful sans Redis) |
| `hash $request_uri consistent` | Cache côté backend, même URL → même nœud |
| `random two least_conn` | Très grands clusters (100+ backends) |

Health check passif (open-source) :
```nginx
upstream backend {
    least_conn;
    server 10.0.0.1:8080 max_fails=3 fail_timeout=30s;
    server 10.0.0.2:8080 max_fails=3 fail_timeout=30s;
}
```
Health check actif → nécessite **nginx-plus** ou module `ngx_http_upstream_hc_module` compilé.

---

### 6. Caching proxy

```nginx
# conf.d/cache.conf
proxy_cache_path /var/cache/nginx/app
                 levels=1:2
                 keys_zone=app_cache:10m
                 max_size=1g
                 inactive=60m
                 use_temp_path=off;

# Dans le location block :
location /api/ {
    proxy_pass        http://backend;
    proxy_cache       app_cache;
    proxy_cache_key   "$scheme$host$request_uri";
    proxy_cache_valid 200 302 10m;
    proxy_cache_valid 404      1m;
    proxy_cache_bypass $http_pragma $http_authorization;
    add_header X-Cache-Status $upstream_cache_status;  # debug : HIT/MISS
}
```

Ne jamais cacher : requêtes authentifiées (`Authorization` header), méthodes POST/PUT/DELETE, endpoints `/logout`, `/pay`.

---

### 7. Sécurité — headers et rate limiting

```nginx
# conf.d/security.conf
add_header X-Frame-Options           "SAMEORIGIN"   always;
add_header X-Content-Type-Options    "nosniff"      always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy   "default-src 'self'; script-src 'self'; object-src 'none'" always;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
limit_conn_zone $binary_remote_addr zone=conn:10m;

# Appliquer dans le location :
location /api/ {
    limit_req  zone=api burst=40 nodelay;
    limit_conn conn 20;
    limit_req_status 429;
    proxy_pass http://backend;
}

# Bloquer méthodes non désirées
if ($request_method !~ ^(GET|POST|PUT|PATCH|DELETE|OPTIONS)$) {
    return 405;
}
```

---

### 8. Tester et déployer sans downtime

```bash
# Validation syntaxique — toujours avant reload
nginx -t

# Reload sans coupure (0-downtime)
nginx -s reload
# ou via systemd :
systemctl reload nginx

# Tester les headers de sécurité
curl -I https://app.exemple.com

# Test de charge rapide
wrk -t4 -c100 -d30s https://app.exemple.com/api/health
# ou
ab -n 10000 -c 200 https://app.exemple.com/

# Vérifier le cache
curl -I https://app.exemple.com/api/items | grep X-Cache-Status
```

---

## Garde-fous / Anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| `proxy_pass http://backend/` avec `/` final | Rewrite du path — `/api/foo` devient `/foo` | Omettre le `/` final si on veut préserver le path |
| `add_header` dans un bloc `if` | Hérite mal, écrase les headers parents | Utiliser `always` dans le bloc `server` ou `location` |
| `worker_processes 1` en production | Sous-utilisation CPU | `worker_processes auto;` |
| `client_max_body_size` à 0 | Upload illimité, risque DoS | Fixer à la taille max métier (ex: `50m`) |
| HSTS sans `preload` testé | Difficile à révoquer | Tester d'abord sans `preload`, ajouter après validation |
| Cache sans `proxy_cache_bypass $http_authorization` | Servir du contenu privé à d'autres | Toujours bypass si header `Authorization` présent |
| `ssl_protocols TLSv1 TLSv1.1` | Protocoles dépréciés (CVE) | TLSv1.2 + TLSv1.3 uniquement |
| Logs désactivés en prod | Impossible de diagnostiquer | Conserver access + error log, rotation via logrotate |

## Bonnes pratiques 2026

- **HTTP/3 (QUIC)** : `listen 443 quic reuseport;` + `add_header Alt-Svc 'h3=":443"; ma=86400';` si nginx ≥ 1.25 compilé avec BoringSSL.
- **Brotli** : préférer à gzip seul — module `ngx_brotli` (compilation) ou image Docker `nginxinc/nginx-unprivileged` avec Brotli inclus.
- **Docker/K8s** : utiliser `nginx:alpine` (image officielle), monter la config via ConfigMap, exposer `/healthz` avec `stub_status` pour les liveness probes.
- **Observabilité** : exporter les métriques avec `nginx-prometheus-exporter` + scraper Prometheus ; dasboard Grafana ID 12708.
- **Mise à jour** : patcher régulièrement — suivre [nginx.org/en/CHANGES](https://nginx.org/en/CHANGES) ; en distro, `apt-get upgrade nginx` sans supprimer les configs.


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
