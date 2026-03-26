---
name: dev-caching-strategy
description: Stratégie de cache adaptée à chaque cas d'usage (Redis, Memcached, in-memory). Se déclenche avec "cache", "Redis", "caching", "mise en cache", "performance", "cache invalidation", "CDN", "distributed cache".
---

# Caching Strategy

## Workflow
1. **Identifier les données à cacher** : Cibler les hot data (accédées très fréquemment), les données read-heavy (ratio lecture >> écriture), et les résultats de calculs coûteux (agrégations, appels API tiers, requêtes DB complexes) ; éviter de cacher les données qui changent trop souvent ou qui nécessitent une cohérence stricte.
2. **Choix du type de cache** : In-process/in-memory (`MemoryCache`, dictionnaire) pour la latence minimale sur instance unique ; distributed cache (Redis, Memcached) pour le partage multi-instance et la persistance optionnelle ; CDN (Cloudflare, Azure CDN) pour les assets statiques et réponses HTTP ; database query cache pour les requêtes répétitives ; browser cache (`Cache-Control`, `ETag`) pour réduire les allers-retours.
3. **Pattern de caching** : Cache-aside (lazy loading, l'application gère le cache manuellement) pour le contrôle maximal ; read-through (le cache charge depuis la DB automatiquement) pour simplifier le code applicatif ; write-through (écriture synchrone en DB et cache) pour la cohérence forte ; write-behind/write-back (écriture asynchrone en DB) pour la performance maximale en écriture.
4. **Politique d'expiration** : Définir un TTL adapté au taux de changement des données (court pour les données volatiles, long pour les données stables) ; utiliser LRU (Least Recently Used) pour l'éviction mémoire par défaut ; LFU (Least Frequently Used) pour les données avec popularité stable ; envisager l'invalidation event-based (purge ciblée sur événement métier) pour les données critiques.
5. **Cache key design** : Adopter une convention claire (`{service}:{entity}:{id}`, ex. `users:profile:42`) ; versionner les keys si le format des données change (`v2:users:profile:42`) ; utiliser le namespacing pour faciliter l'invalidation groupée (`SCAN users:*`) ; éviter les keys trop longues ou contenant des données sensibles.
6. **Gestion de la cohérence** : Définir la stratégie d'invalidation (TTL passif, invalidation active sur mutation, cache-busting) ; prévenir le cache stampede (thundering herd) avec le mutex/lock sur le premier chargement ou le probabilistic early expiration ; gérer le stale-while-revalidate pour servir du cache périmé pendant le rechargement en arrière-plan.
7. **Implémentation** : Redis (structures de données riches : strings, hashes, sets, sorted sets, streams) pour les cas d'usage avancés ; `IDistributedCache` (.NET) ou Spring Cache (Java) pour l'abstraction framework ; output caching pour les réponses HTTP complètes ; function memoization pour les calculs purs.
8. **Monitoring** : Surveiller le hit rate (objectif > 80-90% selon le cas), le miss rate, l'éviction rate (signal de mémoire insuffisante), l'utilisation mémoire et la latence ; configurer des alertes sur la dégradation du hit rate ; analyser les patterns d'accès pour affiner les TTL et la politique d'éviction.

## Règles
- Fournis des exemples de code concrets (configuration Redis, snippets de mise en cache) dans le langage/framework de l'utilisateur
- Adapte les recommandations à l'infrastructure (cloud managé vs on-prem, mono-instance vs cluster)
- Toujours mentionner les trade-offs (ex. write-through = cohérence forte mais latence d'écriture plus haute)
- Commence par la solution simple avant la complexe (MemoryCache avant Redis distribué)
- Rappelle que l'invalidation de cache est l'un des deux problèmes difficiles en informatique : prévoir la stratégie dès le départ
