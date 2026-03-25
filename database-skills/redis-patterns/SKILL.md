---
name: redis-patterns
description: Patterns d'utilisation Redis pour le cache, pub/sub, streams et sessions. Se déclenche avec "Redis", "cache distribué", "pub/sub Redis", "Redis streams", "session store"
---

# Redis Patterns

## Workflow
1. **Identifier le cas d'usage** — Déterminer le pattern Redis approprié : cache-aside, write-through, pub/sub, streams, session store, rate limiting, leaderboard ou file d'attente.
2. **Choisir les structures de données** — Sélectionner le type Redis optimal (String, Hash, List, Set, Sorted Set, Stream, HyperLogLog) en fonction des opérations nécessaires.
3. **Définir la stratégie de clés** — Concevoir un nommage de clés cohérent avec des namespaces (ex: app:user:123:session) et définir les politiques de TTL appropriées.
4. **Configurer la politique d'éviction** — Choisir la politique de mémoire adaptée (allkeys-lru, volatile-lfu, noeviction) selon le cas d'usage et les contraintes mémoire.
5. **Implémenter le pattern** — Coder l'implémentation avec gestion des erreurs, fallback en cas d'indisponibilité Redis et sérialisation/désérialisation efficace.
6. **Gérer la haute disponibilité** — Configurer Redis Sentinel ou Redis Cluster selon les besoins de failover automatique et de scalabilité horizontale.
7. **Monitorer et optimiser** — Suivre les métriques clés (hit ratio, mémoire utilisée, latence, connections) avec Redis INFO et SLOWLOG.

## Règles
- Toujours définir un TTL sur les clés de cache pour éviter une croissance mémoire non contrôlée, sauf pour les données de référence permanentes.
- Ne jamais utiliser KEYS en production ; utiliser SCAN pour itérer sur les clés de manière non-bloquante.
- Toujours implémenter un mécanisme de cache stampede prevention (mutex, probabilistic early expiration) pour les clés à fort trafic.
- Utiliser les pipelines Redis pour regrouper les commandes et réduire la latence réseau lors d'opérations multiples.
- Prévoir un fallback applicatif en cas d'indisponibilité de Redis pour garantir la résilience du système.
