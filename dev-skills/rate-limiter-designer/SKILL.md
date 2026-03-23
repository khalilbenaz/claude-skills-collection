---
name: rate-limiter-designer
description: Conception de systèmes de rate limiting et throttling pour APIs. Se déclenche avec "rate limit", "throttling", "limite de requêtes", "API abuse", "DDoS protection", "quota", "429 Too Many Requests".
---

# Rate Limiter Designer

## Workflow
1. **Identifier les endpoints à protéger et les types de clients** : Cartographier les endpoints sensibles (authentification, envoi d'email, paiement, recherche lourde) et les endpoints publics ; distinguer les clients anonymes (par IP), les clients authentifiés (par user ID ou API key), et les services internes (limites plus élevées ou absentes) ; évaluer le risque d'abus par type d'endpoint.
2. **Choix de l'algorithme** : Fixed window (simple, mais burst possible à la frontière) ; sliding window log (précis, mais mémoire O(n) par requête) ; sliding window counter (compromis mémoire/précision) ; token bucket (burst contrôlé, remplit à taux fixe, recommandé pour les APIs) ; leaky bucket (débit constant, lisse les pics, adapté aux systèmes aval fragiles).
3. **Définition des limites par tier** : Différencier les quotas selon le niveau de service (anonymous: 10 req/min, free: 100 req/min, pro: 1000 req/min, enterprise: custom) ; définir les limites par endpoint en plus des limites globales (ex. `/auth/login` : 5 req/min indépendamment du tier) ; prévoir des limites burst vs sustained.
4. **Implémentation côté serveur** : Middleware applicatif (ASP.NET Core RateLimiter, Express rate-limit, Bucket4j) pour la flexibilité et l'accès au contexte métier ; API gateway (Kong, AWS API Gateway, Azure APIM) pour la centralisation et la décharge applicative ; reverse proxy (Nginx, Traefik) pour la protection au niveau réseau avant d'atteindre l'application.
5. **Stockage des compteurs** : In-memory pour les instances uniques (simple, ultra-rapide, perdu au redémarrage) ; Redis pour le rate limiting distribué (commandes atomiques `INCR`/`EXPIRE`, Lua scripts pour les opérations atomiques complexes, RedisRateLimiter) ; choisir le stockage en fonction des exigences de précision et de scalabilité.
6. **Headers de réponse** : Toujours retourner les headers standards : `X-RateLimit-Limit` (quota total), `X-RateLimit-Remaining` (requêtes restantes), `X-RateLimit-Reset` (timestamp de réinitialisation, format Unix epoch ou ISO 8601), `Retry-After` (secondes à attendre, obligatoire sur 429) ; faciliter l'intégration côté client en étant transparents sur les limites.
7. **Stratégie de réponse** : Retourner HTTP 429 avec un body JSON informatif (`{"error": "rate_limit_exceeded", "retry_after": 60, "limit": 100, "window": "1m"}`) ; envisager la dégradation gracieuse (réponse en cache périmée, version allégée de la réponse) avant le rejet total ; logger les événements de rate limiting pour analyser les patterns d'abus.
8. **Rate limiting distribué** : Synchroniser les compteurs via Redis avec des scripts Lua atomiques pour éviter les race conditions ; implémenter le sliding window avec des sorted sets Redis (score = timestamp) ; pour les déploiements multi-région, accepter un léger décalage (eventual consistency) ou utiliser des solutions dédiées (Envoy global rate limiting, Redis Cluster) ; tester la précision sous charge.

## Règles
- Fournis des exemples de code concrets (middleware, configuration Redis, snippets d'implémentation) dans le langage/framework de l'utilisateur
- Adapte les recommandations à l'architecture (monolithe, microservices, serverless, edge)
- Toujours mentionner les trade-offs (ex. token bucket = burst autorisé mais implémentation plus complexe vs fixed window)
- Commence par la solution simple avant la complexe (middleware in-process avant Redis distribué)
- Rappelle que le rate limiting seul ne suffit pas : combiner avec l'authentification, le monitoring et les WAF pour une protection complète
