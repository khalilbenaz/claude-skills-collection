---
name: dev-caching-strategy
description: Stratégie de cache adaptée à chaque cas d'usage (Redis, Memcached, in-memory). Se déclenche avec "cache", "Redis", "caching", "mise en cache", "performance", "cache invalidation", "CDN", "distributed cache". Also triggers on "caching strategy", "what should I cache".
---

# Caching Strategy

## Workflow

### 1. Qualifier le besoin

Avant de cacher quoi que ce soit, répondre à ces trois questions :

| Question | Cache pertinent si… |
|---|---|
| Ratio lecture/écriture ? | Lectures >> écritures (≥ 10:1) |
| Données partagées entre instances ? | Oui → distributed cache obligatoire |
| Tolérance à la stale data ? | Si cohérence stricte requise, invalidation event-based obligatoire |

Cibles prioritaires : résultats de requêtes DB coûteuses, appels API tiers (limités en rate), calculs d'agrégation, sessions utilisateur.

### 2. Choisir le bon niveau de cache

```
Requête utilisateur
      │
      ▼
[Browser cache]          ← Cache-Control, ETag, Last-Modified
      │
      ▼
[CDN / Edge cache]       ← Cloudflare, Azure CDN, AWS CloudFront
      │
      ▼
[Application cache]      ← In-process (MemoryCache) ou distributed (Redis)
      │
      ▼
[Database query cache]   ← pg_bouncer result cache, MySQL query cache (désactivé > MySQL 8)
      │
      ▼
[Source of truth]        ← Base de données / API tierce
```

**Règle de décision** :
- Instance unique, faible volume → `MemoryCache` (.NET) / `caffeine` (Java) / dict Python
- Multi-instances / scalabilité → Redis ou Memcached
- Assets statiques / réponses HTTP entières → CDN
- API REST publique → HTTP `Cache-Control` + ETag

### 3. Sélectionner le pattern

| Pattern | Quand l'utiliser | Trade-off |
|---|---|---|
| **Cache-aside** (lazy) | Contrôle maximal, données hétérogènes | Double aller DB au premier miss |
| **Read-through** | Simplification du code applicatif | Complexité déportée vers le cache |
| **Write-through** | Cohérence forte (lecture après écriture) | Latence d'écriture augmentée |
| **Write-behind** | Throughput d'écriture maximal | Risque de perte de données si crash |
| **Refresh-ahead** | Données populaires avec TTL court | Prématuré si prédiction inexacte |

Pattern le plus courant en production : **cache-aside + invalidation active** sur mutation.

### 4. Concevoir les cache keys

Convention recommandée : `{service}:{entité}:{id}` ou `{service}:{entité}:{id}:{variant}`

```
users:profile:42
users:profile:42:fr          # variante locale
catalog:product:SKU-9901
catalog:search:hash(query)   # hash si la clé est longue
```

- Versionner si le format change : `v2:users:profile:42`
- Namespace explicite pour l'invalidation groupée : `SCAN "catalog:*"` (Redis)
- Éviter les données sensibles dans la clé (PII, tokens)

### 5. Définir l'expiration

```
Données système (config, feature flags)   → TTL 5-30 min ou invalidation event-based
Données utilisateur (profil, panier)      → TTL 5-15 min
Résultats de requêtes analytiques        → TTL 1-24 h
Résultats de recherche / catalogue       → TTL 5-30 min + purge sur update
Sessions                                  → TTL = durée de session + sliding expiration
Assets statiques (CDN)                   → Cache-Control: max-age=31536000, immutable
```

**Eviction policies Redis** (à configurer selon l'usage) :
- `allkeys-lru` : usage général (évince le moins récemment utilisé)
- `allkeys-lfu` : données avec popularité stable
- `volatile-lru` : seulement les keys avec TTL (si mélange cache + stockage)
- `noeviction` : bases de données / queues (ne jamais pour un cache pur)

### 6. Snippets copiables

**Redis cache-aside — Python (redis-py)**
```python
import redis, json, hashlib

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_product(product_id: int) -> dict:
    key = f"catalog:product:{product_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    r.setex(key, 300, json.dumps(product))  # TTL 5 min
    return product

def update_product(product_id: int, data: dict):
    db.execute("UPDATE products SET ... WHERE id = %s", product_id)
    r.delete(f"catalog:product:{product_id}")  # invalidation active
```

**IDistributedCache — .NET 8**
```csharp
public async Task<UserProfile?> GetProfileAsync(int userId, CancellationToken ct)
{
    var key = $"users:profile:{userId}";
    var cached = await _cache.GetStringAsync(key, ct);
    if (cached is not null)
        return JsonSerializer.Deserialize<UserProfile>(cached);

    var profile = await _db.Users.FindAsync(userId, ct);
    if (profile is not null)
        await _cache.SetStringAsync(key, JsonSerializer.Serialize(profile),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) }, ct);
    return profile;
}
```

**HTTP Cache-Control (API REST)**
```http
Cache-Control: public, max-age=300, stale-while-revalidate=60
ETag: "abc123"
Vary: Accept-Language, Accept-Encoding
```

**Output caching — ASP.NET Core 8**
```csharp
app.MapGet("/products/{id}", async (int id, IProductService svc) =>
    await svc.GetAsync(id))
   .CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)).Tag("products"));

// Purge ciblée :
await outputCache.EvictByTagAsync("products", ct);
```

### 7. Prévenir le cache stampede (thundering herd)

```python
import threading

_locks = {}

def get_with_lock(key, loader_fn, ttl=300):
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    lock = _locks.setdefault(key, threading.Lock())
    with lock:
        cached = r.get(key)  # double-check après lock
        if cached:
            return json.loads(cached)
        value = loader_fn()
        r.setex(key, ttl, json.dumps(value))
        return value
```

Alternative Redis native : `SET key value NX EX 300` (SET if Not eXists).

### 8. Configurer Redis (production)

```conf
# redis.conf — points critiques
maxmemory 2gb
maxmemory-policy allkeys-lru
save ""                        # désactiver AOF/RDB si cache pur (pas de persistance)
requirepass <password>
bind 127.0.0.1                 # ne jamais exposer Redis sans auth sur réseau public
```

Cluster Redis (≥ 3 nœuds) pour HA ; Redis Sentinel pour failover automatique sans cluster.

### 9. Monitorer

Métriques indispensables :
- **Hit rate** : `keyspace_hits / (keyspace_hits + keyspace_misses)` → objectif > 85 %
- **Eviction rate** : `evicted_keys` en hausse → mémoire sous-dimensionnée
- **Latence** : P99 < 1 ms pour Redis sur réseau local
- **Memory fragmentation ratio** > 1.5 → `redis-cli MEMORY DOCTOR`

```bash
redis-cli INFO stats | grep -E "hits|misses|evicted"
redis-cli INFO memory | grep used_memory_human
redis-cli --latency -h localhost
```

---

## Anti-patterns et pièges

| Piège | Symptôme | Correctif |
|---|---|---|
| **Cache everything** | Mémoire saturée, hit rate bas | Profiler les hot paths avant de cacher |
| **TTL trop long** | Données périmées servies longtemps | Invalidation active sur mutation |
| **TTL trop court** | Hit rate effondré, DB surchargée | Analyser la fréquence réelle de changement |
| **Thundering herd** | Pics CPU/DB au restart | Mutex ou probabilistic early expiration |
| **Cache stampede multi-serveurs** | Même problème à grande échelle | Redis SETNX ou Lua lock distribué |
| **Cache sans namespace** | Invalidation impossible sans flush total | Convention de keys dès le départ |
| **Cacher des données PII sans chiffrement** | RGPD / fuite de données | Chiffrer ou ne pas cacher |
| **Redis exposé sans auth** | Vecteur d'attaque critique | `requirepass` + TLS + bind local |
| **Oublier Vary sur le CDN** | Cache non segmenté par langue/device | Ajouter `Vary: Accept-Language` |
| **Write-behind sans WAL** | Perte de données au crash | Préférer write-through pour les données critiques |

## Bonnes pratiques 2026

- **Stale-while-revalidate** : servir le cache périmé immédiatement, rafraîchir en arrière-plan → latence perçue quasi nulle.
- **Cache warming** : préremplir au démarrage les données les plus chaudes pour éviter le cold start.
- **Valkey** (fork Redis open-source, 2024) : alternative à considérer si licence Redis Stack est un frein.
- **Dragonfly / Garnet** : alternatives Redis-compatibles à très haute performance pour charges extrêmes.
- **Edge caching (Workers KV, Cloudflare D1)** : cacher au plus près de l'utilisateur pour les lectures globales.
- **Observabilité first** : instrumenter le hit/miss rate dès le début, pas après coup.


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
