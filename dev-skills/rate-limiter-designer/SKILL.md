---
name: rate-limiter-designer
description: Conception de systèmes de rate limiting et throttling pour APIs — algorithmes, stockage distribué, headers standards, snippets copiables ASP.NET Core / Node / Redis. Se déclenche avec "rate limit", "throttling", "limite de requêtes", "API abuse", "DDoS protection", "quota", "429 Too Many Requests".
---

# Rate Limiter Designer

## Workflow

### 1. Cartographier les surfaces à protéger

Identifier chaque endpoint par **profil de risque** :

| Profil | Exemples | Limite indicative |
|--------|----------|-------------------|
| Authentification | `/login`, `/token`, `/forgot-password` | 5 req/min/IP |
| Mutation sensible | `/pay`, `/transfer`, `/sms-otp` | 10 req/min/user |
| Lecture lourde | `/search`, `/export`, `/report` | 20 req/min/user |
| Read standard | `/products`, `/users/me` | 300 req/min/user |
| Webhook entrant | `/webhook/*` | 500 req/min/source IP |

Distinguer les identités : **IP** (anonyme), **API key** (machine-to-machine), **user ID** (session).

---

### 2. Choisir l'algorithme selon le besoin

| Algorithme | Avantage | Inconvénient | Quand l'utiliser |
|------------|----------|--------------|------------------|
| Fixed window | Très simple | Burst doublé à la frontière de fenêtre | Prototypage, admin interne |
| Sliding window log | Précision parfaite | RAM O(n) par client | Haute précision, faible trafic |
| Sliding window counter | Bon compromis | Légère approximation (≤ fenêtre) | API publique standard |
| **Token bucket** | Burst contrôlé, filling régulier | Implémentation plus complexe | **APIs REST, cas général** |
| Leaky bucket | Débit constant, protection aval | Latence artificielle | Files d'attente, systèmes fragiles en aval |

**Règle de décision rapide :** si le client légitime a besoin de pics courts → token bucket ; si le système aval ne tolère pas les pics → leaky bucket ; si la simplicité prime → sliding window counter.

---

### 3. Définir les tiers et quotas

```yaml
# config/rate-limits.yaml
tiers:
  anonymous:  { rpm: 10,   burst: 15 }
  free:       { rpm: 100,  burst: 150 }
  pro:        { rpm: 1000, burst: 1500 }
  enterprise: { rpm: 10000, burst: 15000 }

endpoints:
  /auth/login:         { rpm: 5,  scope: ip }
  /auth/forgot:        { rpm: 3,  scope: ip }
  /api/pay:            { rpm: 10, scope: user }
  /api/export:         { rpm: 5,  scope: user, cost: 10 }  # coût variable
```

---

### 4. Implémenter — snippets copiables

#### ASP.NET Core 8+ (built-in `RateLimiter`)

```csharp
// Program.cs
builder.Services.AddRateLimiter(opt =>
{
    opt.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        var key = ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon";
        return RateLimitPartition.GetSlidingWindowLimiter(key, _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit        = 100,
            Window             = TimeSpan.FromMinutes(1),
            SegmentsPerWindow  = 6,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit         = 0
        });
    });
    opt.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.StatusCode = 429;
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await ctx.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "rate_limit_exceeded",
            retry_after = 60
        }, ct);
    };
});
// Appliquer : app.UseRateLimiter();
```

#### Node.js / Express (`express-rate-limit` + Redis)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: 'draft-7',   // RateLimit-* headers RFC 6585
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) }),
  keyGenerator: (req) => req.user?.id ?? req.ip,
  handler: (req, res) => res.status(429).json({
    error: 'rate_limit_exceeded',
    retry_after: Math.ceil(res.getHeader('RateLimit-Reset') as number - Date.now() / 1000)
  })
});
```

#### Redis — Token Bucket en Lua (atomique)

```lua
-- token_bucket.lua  (KEYS[1]=bucket_key ARGV[1]=capacity ARGV[2]=refill_rate ARGV[3]=now_ms)
local key      = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])  -- tokens/seconde
local now      = tonumber(ARGV[3])

local bucket   = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens   = tonumber(bucket[1]) or capacity
local last     = tonumber(bucket[2]) or now

local elapsed  = (now - last) / 1000
tokens = math.min(capacity, tokens + elapsed * rate)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, math.ceil(capacity / rate) + 10)
  return 1   -- OK
else
  return 0   -- rejeté
end
```

Appel Go/Node/C# : `EVALSHA <sha> 1 user:42 100 1.67 <epoch_ms>`.

---

### 5. Headers de réponse standards

```http
HTTP/1.1 200 OK
RateLimit-Limit: 100
RateLimit-Remaining: 43
RateLimit-Reset: 1719230460
RateLimit-Policy: 100;w=60

# Sur 429 :
HTTP/1.1 429 Too Many Requests
Retry-After: 17
Content-Type: application/json
```

Utiliser **RFC 9110 `Retry-After`** (secondes) sur tous les 429. Éviter d'exposer les compteurs précis sur les endpoints d'auth (aide les attaquants à calibrer leurs bots).

---

### 6. Rate limiting distribué (multi-instance / multi-région)

- **Même région** : Redis Cluster ou Redis Sentinel, scripts Lua atomiques — précision parfaite.
- **Multi-région active/active** : accepter une légère tolérance (±5 %) avec eventual consistency Redis Geo ou utiliser **Envoy Global Rate Limiting** (sidecar gRPC).
- **Serverless / Edge** : Cloudflare Rate Limiting (règles WAF), AWS API Gateway Usage Plans, ou Upstash Redis (HTTP-based, sans connexion persistante).

```typescript
// Upstash Redis (Edge / Vercel / CF Workers)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
});

const { success, remaining, reset } = await ratelimit.limit(userId);
if (!success) return new Response("Too Many Requests", { status: 429 });
```

---

### 7. Monitoring et observabilité

- Émettre une métrique `rate_limit.rejected_total{endpoint, tier, reason}` sur chaque 429.
- Alerter si le taux de rejet dépasse 5 % sur 5 min (signal d'attaque ou de limite mal calibrée).
- Logger `{user_id, ip, endpoint, limit, window, timestamp}` dans un index dédié pour post-mortem.
- Dashboard minimal : taux de rejet/min par endpoint, top-10 IP rejetées, distribution des consommations par tier.

---

## Anti-patterns et pièges

| Piège | Conséquence | Correction |
|-------|-------------|------------|
| Compter par IP derrière un load balancer sans `X-Forwarded-For` | Tous les clients partagent la même IP (celle du LB) | Lire `X-Forwarded-For` ou `CF-Connecting-IP` ; configurer `trust proxy` |
| Fixed window sans décalage aléatoire | Thundering herd à chaque reset | Sliding window ou jitter sur le reset |
| Pas de `Retry-After` sur 429 | Les clients retentent immédiatement, amplifiant la charge | Toujours retourner `Retry-After` |
| Même limite pour toutes les routes | Endpoint léger et endpoint coûteux identiques | Coût variable (cost-per-request) ou limites par endpoint |
| In-memory sur instances multiples | Chaque instance a son propre compteur → 10× la limite réelle | Redis partagé obligatoire dès la deuxième instance |
| Rate limiting sans auth | L'attaquant tourne les IPs librement | Coupler auth + rate limiting ; CAPTCHA sur les endpoints publics sensibles |
| Limites trop strictes sans whitelist | Blocage des crawlers légitimes, monitoring, CI/CD | API keys internes exemptées, whitelist CIDR |

## Bonnes pratiques 2026

- **Cost-based limiting** : chaque requête consomme N tokens selon sa complexité (LLM = coût élevé, `/ping` = 0).
- **Adaptive rate limiting** : augmenter temporairement les limites pour les clients à comportement normal, resserrer sous attaque (ML ou règles heuristiques).
- **DDoS Layer 7** : le rate limiting applicatif ne remplace pas un WAF (Cloudflare, AWS WAF) pour les attaques volumétriques.
- **Tests de charge** : valider les limites avec k6 ou Gatling avant la prod — les race conditions Redis se révèlent uniquement sous concurrence réelle.
- **Documentation contractuelle** : publier les limites dans l'OpenAPI spec (`x-rate-limit`) et dans les headers dès la première requête (pas seulement sur 429).
