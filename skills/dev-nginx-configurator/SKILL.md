---
name: dev-nginx-configurator
description: Configuration Nginx — reverse proxy, SSL/TLS, load balancing, caching et security headers. Se déclenche avec "Nginx", "nginx.conf", "reverse proxy", "SSL Nginx", "load balancer Nginx".
---

# Nginx Configurator

## Workflow

1. **Identifier l'architecture cible** — Déterminer le rôle de Nginx dans l'infrastructure : serveur web statique, reverse proxy, load balancer, API gateway, ou combinaison de ces rôles. Recenser les services backend à exposer.

2. **Configurer le bloc serveur de base** — Créer la configuration `server` avec `listen`, `server_name`, `root`, et `index`. Configurer les `location` blocks pour le routage des requêtes vers les fichiers statiques et les services backend.

3. **Mettre en place le reverse proxy** — Configurer `proxy_pass` vers les services backend, définir les headers de proxy (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`), gérer les timeouts (`proxy_connect_timeout`, `proxy_read_timeout`) et le buffering.

4. **Configurer SSL/TLS** — Mettre en place HTTPS avec Let's Encrypt ou des certificats custom, configurer les protocoles TLS (1.2, 1.3), les cipher suites sécurisées, OCSP stapling, HSTS, et la redirection automatique HTTP vers HTTPS.

5. **Implémenter le load balancing** — Configurer le bloc `upstream` avec les algorithmes de répartition (`round-robin`, `least_conn`, `ip_hash`, `random`), les health checks, les poids des serveurs, et la gestion des serveurs `backup` et `down`.

6. **Configurer le caching** — Mettre en place `proxy_cache` avec des zones de cache nommées, définir les règles de validité (`proxy_cache_valid`), les clés de cache (`proxy_cache_key`), le bypass conditionnel et la purge de cache.

7. **Appliquer les headers de sécurité** — Configurer `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, et le rate limiting avec `limit_req_zone` et `limit_conn_zone`.

8. **Tester et déployer** — Valider la configuration avec `nginx -t`, tester les performances avec des outils de charge (ab, wrk, k6), configurer la rotation des logs, et mettre en place le reload sans downtime (`nginx -s reload`).

## Règles

- Fournis toujours des fichiers de configuration complets et commentés, prêts à être utilisés.
- Applique systématiquement les bonnes pratiques de sécurité : désactiver `server_tokens`, limiter les méthodes HTTP autorisées, configurer les headers de sécurité.
- Adapte la configuration au contexte de déploiement de l'utilisateur (bare metal, Docker, Kubernetes Ingress, cloud managed).
- Propose des configurations séparées par fichier (`sites-available/`, `conf.d/`) plutôt qu'un seul fichier monolithique.
- Inclus toujours les directives de logging (`access_log`, `error_log`) avec des formats personnalisés pour le debugging.
