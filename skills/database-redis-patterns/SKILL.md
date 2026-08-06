---
name: database-redis-patterns
description: Patterns d'utilisation Redis pour le cache, pub/sub, streams et sessions. Se déclenche avec "Redis", "cache distribué", "pub/sub Redis", "Redis streams", "session store. Also triggers on "Redis cache", "Redis pub/sub".
---

# Redis Patterns

## Workflow

### 1. Identifier le pattern adapté

| Besoin | Pattern | Structure de données |
|---|---|---|
| Cache lecture | Cache-aside / Write-through | String, Hash |
| Session utilisateur | Session store | Hash + TTL |
| Communication asynchrone | Pub/Sub | Channel |
| File d'attente durable | Streams | Stream |
| Compteur / Rate limiting | Incr atomique | String |
| Classement | Leaderboard | Sorted Set |
| Déduplication / ensemble | Membership | Set |
| Comptage unique approx. | HyperLogLog | HLL |

### 2. Concevoir le nommage des clés

Convention : `{app}:{entité}:{id}:{sous-clé}` — toujours en minuscules, séparateur `:`.

```
user:42:session          # session utilisateur
product:sku:A123:stock   # stock d'un produit
rate:api:ip:1.2.3.4      # compteur rate limit
stream:orders            # stream de commandes
leaderboard:weekly       # classement hebdo
```

Critères :
- Longueur < 64 chars (impact mémoire des clés)
- Jamais d'informations sensibles dans la clé elle-même
- Préfixe par environnement si Redis partagé : `prod:`, `staging:`

### 3. Définir les TTL

```bash
# Cache applicatif : TTL court
SET product:sku:A123 '{"price":29.99}' EX 300

# Session : TTL glissant via EXPIRE à chaque accès
HSET user:42:session token abc123 role admin
EXPIRE user:42:session 3600

# Données de référence : TTL long ou absent (refresh manuel)
SET config:feature-flags '{"darkMode":true}' EX 86400
```

Politique d'éviction conseillée :
- Cache pur → `allkeys-lfu`
- Cache + données persistantes mixées → `volatile-lfu`
- Jamais d'éviction → `noeviction` (monitoring mémoire obligatoire)

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
redis-cli CONFIG SET maxmemory 2gb
```

### 4. Implémenter les patterns courants

#### Cache-aside (read-through manuel)

```python
import redis, json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_product(sku: str) -> dict:
    key = f"product:sku:{sku}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)          # cache hit
    product = db.fetch_product(sku)        # fallback DB
    r.set(key, json.dumps(product), ex=300)
    return product
```

#### Rate limiting (fenêtre glissante)

```python
import time

def is_allowed(user_id: str, limit: int = 100, window: int = 60) -> bool:
    key = f"rate:{user_id}:{int(time.time()) // window}"
    current = r.incr(key)
    if current == 1:
        r.expire(key, window)
    return current <= limit
```

#### Pub/Sub (fanout temps réel)

```python
# Publisher
r.publish("orders:new", json.dumps({"order_id": 99, "amount": 150.0}))

# Subscriber (thread séparé)
pubsub = r.pubsub()
pubsub.subscribe("orders:new")
for message in pubsub.listen():
    if message["type"] == "message":
        process(json.loads(message["data"]))
```

#### Redis Streams (file durable avec consumer groups)

```bash
# Publier un événement
XADD orders:stream * order_id 99 amount 150 status pending

# Créer un consumer group
XGROUP CREATE orders:stream processors $ MKSTREAM

# Consommer (atomique, at-least-once)
XREADGROUP GROUP processors worker1 COUNT 10 BLOCK 2000 STREAMS orders:stream >

# Acquitter après traitement
XACK orders:stream processors <message-id>
```

#### Leaderboard (Sorted Set)

```bash
# Ajouter / mettre à jour un score
ZADD leaderboard:weekly NX 4250 "user:42"

# Top 10
ZREVRANGE leaderboard:weekly 0 9 WITHSCORES

# Rang d'un utilisateur (0-based)
ZREVRANK leaderboard:weekly "user:42"
```

### 5. Pipeline et transactions

```python
# Pipeline : batch de commandes, 1 aller-retour réseau
pipe = r.pipeline()
pipe.set("key1", "v1", ex=60)
pipe.incr("counter:daily")
pipe.zadd("leaderboard:weekly", {"user:42": 100})
pipe.execute()

# Transaction (MULTI/EXEC) : atomicité, pas de rollback
with r.pipeline() as pipe:
    pipe.multi()
    pipe.decrby("stock:A123", 1)
    pipe.incr("orders:count")
    pipe.execute()
```

### 6. Haute disponibilité

**Sentinel** (failover automatique, setup simple) :
```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
```

**Cluster** (sharding horizontal, >= 6 noeuds recommandés) :
```bash
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

Critères de choix :
- < 50 GB, failover seul → **Sentinel**
- > 50 GB ou scaling horizontal → **Cluster**

### 7. Monitoring

```bash
# Métriques essentielles
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
redis-cli INFO memory | grep used_memory_human
redis-cli INFO clients | grep connected_clients
redis-cli SLOWLOG GET 10          # top 10 commandes lentes

# Hit ratio cible : > 90%
# Formule : hits / (hits + misses)
```

Alertes à configurer :
- `used_memory` > 80% du `maxmemory`
- `connected_clients` proche de `maxclients` (défaut 10 000)
- `keyspace_misses` en hausse soudaine
- `blocked_clients` > 0 de façon persistante

---

## Anti-patterns et pièges

- **`KEYS *` en production** — bloque Redis (mono-thread). Remplacer par `SCAN 0 MATCH prefix:* COUNT 100`.
- **Clés sans TTL** — mémoire croissante non contrôlée. Toujours définir ex/px sauf données permanentes avérées.
- **Cache stampede** — multiples threads rechargent simultanément une clé expirée. Utiliser un verrou distribué (SETNX + TTL) ou probabilistic early expiration.
- **Sérialisation coûteuse** — éviter XML/YAML ; préférer JSON compact ou MessagePack.
- **Valeurs trop grandes** — une valeur > 1 MB impacte la latence. Chunker ou stocker en DB avec pointeur Redis.
- **Transactions sur Cluster** — MULTI/EXEC ne fonctionne que si toutes les clés sont dans le même slot. Utiliser les hash tags : `{user:42}:cart` et `{user:42}:session`.
- **Pub/Sub sans persistance** — messages perdus si le subscriber est déconnecté. Préférer Streams pour garantir la livraison.
- **SELECT (bases multiples)** — déconseillé en production (non supporté en Cluster). Utiliser des préfixes de clés à la place.
- **Connexions sans pool** — créer une connexion par requête HTTP tue les performances. Toujours utiliser un connection pool (redis-py, StackExchange.Redis, Lettuce).

## Bonnes pratiques 2026

- Utiliser **Redis 7.x+** : LMPOP, ZMPOP, SINTERCARD, expiration de champs de hash natifs (Hash field TTL).
- Activer **ACL** (Access Control Lists) pour segmenter les accès par service.
- **TLS** obligatoire en production (`tls-port 6380`, certificats Let's Encrypt ou PKI interne).
- Prefer **RESP3** (Redis 7 default) pour les clients modernes : meilleur typage, push notifications.
- **Keyspace notifications** (`notify-keyspace-events Ex`) pour réagir aux expirations sans polling.
- Tester les patterns de charge avec `redis-benchmark -n 100000 -c 50 -d 256`.


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
