---
name: api-security-hardener
description: Durcissement de la sécurité des APIs — rate limiting, validation d'entrée, headers de sécurité, CORS, protection contre les attaques courantes. À utiliser quand l'utilisateur sécurise une API, configure des headers de sécurité ou implémente du rate limiting. Se déclenche aussi avec "sécurité API", "rate limiting", "headers sécurité", "CORS", "API hardening", "protection API", "OWASP API".
---

# Durcissement de la Sécurité des APIs

## Workflow en 5 étapes

### 1. Auditer — cartographier la surface d'attaque

- Lister tous les endpoints (y compris ceux non documentés via `/swagger`, logs, code).
- Vérifier chaque endpoint : authentification requise ? autorisation granulaire (BOLA) ? exposition de données excessive ?
- Scanner les headers de réponse actuels :

```bash
curl -sI https://api.example.com/health | grep -iE "server|x-powered|access-control|x-content"
```

- Identifier les endpoints sensibles (paiement, auth, admin) → appliquer un rate limit plus strict.

**Critère de décision** : si un endpoint peut être appelé sans jeton ou sans vérification d'ownership sur la ressource → priorité 1.

---

### 2. Configurer les headers de sécurité (ASP.NET Core)

```csharp
// Program.cs — avant app.UseRouting()
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers.Append("X-Content-Type-Options", "nosniff");
    headers.Append("X-Frame-Options", "DENY");
    headers.Append("X-XSS-Protection", "0");            // désactivé volontairement (géré par CSP)
    headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.Append("Content-Security-Policy", "default-src 'self'");
    headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    headers.Remove("Server");
    headers.Remove("X-Powered-By");
    headers.Remove("X-AspNet-Version");
    await next();
});
```

> Vérifier après déploiement avec [securityheaders.com](https://securityheaders.com) ou `curl -sI`.

---

### 3. Configurer le Rate Limiting

**Critères de choix** :
- Endpoint public / auth → `FixedWindow` large (ex. 100 req/min par IP)
- Endpoint sensible (paiement, OTP, login) → `SlidingWindow` strict (ex. 5–10 req/min)
- Endpoint admin → `TokenBucket` ou blocage complet hors IP whitelist

```csharp
// .NET 7+ — Microsoft.AspNetCore.RateLimiting
builder.Services.AddRateLimiter(options =>
{
    // Global : 100 req/min par IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Politique "strict" pour endpoints sensibles
    options.AddPolicy("strict", ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: ctx.User.Identity?.Name     // par utilisateur si authentifié
                          ?? ctx.Connection.RemoteIpAddress?.ToString()
                          ?? "anon",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6
            }));

    options.OnRejected = async (ctx, token) =>
    {
        ctx.HttpContext.Response.StatusCode = 429;
        ctx.HttpContext.Response.Headers.Append("Retry-After", "60");
        await ctx.HttpContext.Response.WriteAsync("Too Many Requests", token);
    };
});

app.UseRateLimiter();

// Sur l'endpoint
app.MapPost("/api/payments", handler).RequireRateLimiting("strict");
```

---

### 4. Valider les entrées et sécuriser les sorties

**Validation d'entrée (DTO)** :

```csharp
public class CreatePaymentRequest
{
    [Required]
    [Range(1, 9_999_999)]
    public int AmountCents { get; set; }

    [Required, RegularExpression("^(EUR|USD|MAD|TND)$")]
    public string Currency { get; set; } = default!;

    [Required, StringLength(50, MinimumLength = 1)]
    [RegularExpression("^[a-zA-Z0-9_-]+$")]   // pas d'injection possible
    public string RecipientId { get; set; } = default!;

    [MaxLength(10)]
    public Dictionary<string, string>? Metadata { get; set; }
}
```

**BOLA — vérification d'ownership** :

```csharp
// Toujours filtrer par UserId de la session, pas par paramètre URL seul
var order = await db.Orders
    .Where(o => o.Id == orderId && o.UserId == currentUserId)  // double filtre obligatoire
    .FirstOrDefaultAsync();

if (order is null) return Results.NotFound();   // ne pas révéler l'existence
```

**Réponses d'erreur génériques** :

```csharp
// Anti-pattern : retourner le message d'exception
return Results.Problem(ex.Message);   // ❌ fuite d'info

// Correct
return Results.Problem("Une erreur est survenue.", statusCode: 500);  // ✅
// Logger ex en interne avec correlation ID
```

---

### 5. Configurer CORS et monitorer

**CORS strict** :

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("Production", policy =>
        policy.WithOrigins("https://app.company.com", "https://admin.company.com")
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Authorization", "Content-Type", "X-Correlation-Id")
              .SetMaxAge(TimeSpan.FromHours(1)));   // cache preflight 1h
});

// Jamais AllowAnyOrigin() + AllowCredentials() ensemble → erreur runtime + faille critique
```

**Logging sécurité** (Serilog / ILogger) :

```csharp
// Événements à logger systématiquement
logger.LogWarning("Auth failed: user={User} ip={Ip} endpoint={Ep}", user, ip, path);
logger.LogWarning("Rate limit hit: ip={Ip} policy={Policy}", ip, policy);
logger.LogWarning("BOLA attempt: requestedId={Id} ownerId={Owner}", id, owner);
```

Envoyer ces logs vers un SIEM ou au moins un fichier séparé consultable en cas d'incident.

---

## OWASP API Top 10 — Checklist 2023

| # | Risque | Contrôle minimal |
|---|--------|-----------------|
| API1 | Broken Object Level Authorization | Filtre `UserId` sur chaque requête DB |
| API2 | Broken Authentication | JWT exp court (15 min), refresh rotation, révocation |
| API3 | Broken Object Property Level Authorization | DTO explicites, jamais d'entités directes |
| API4 | Unrestricted Resource Consumption | Rate limit + pagination obligatoire (`maxPageSize`) |
| API5 | Broken Function Level Authorization | `[Authorize(Roles="Admin")]` sur chaque endpoint admin |
| API6 | Unrestricted Sensitive Business Flows | Limites métier (ex. max 3 OTP/24h), CAPTCHA |
| API7 | Server Side Request Forgery | Whitelist d'URLs, interdire les IPs privées dans les webhooks |
| API8 | Security Misconfiguration | Headers corrects, swagger désactivé en prod, erreurs génériques |
| API9 | Improper Inventory Management | Inventaire d'endpoints versionné, décommissionner `/v1` obsolètes |
| API10 | Unsafe Consumption of APIs | Valider le schéma des réponses tierces, timeout agressif |

---

## Anti-patterns / Pièges

- **`AllowAnyOrigin().AllowCredentials()`** : interdit par la spec CORS et par ASP.NET Core — exception au démarrage.
- **Rate limit uniquement par IP** : un attaquant distribué contourne facilement ; combiner IP + user ID + fingerprint.
- **Exposer les stack traces** en prod : désactiver `UseDeveloperExceptionPage()` hors `Development`.
- **JWT sans expiration** (`exp` absent ou très long) : une clé volée reste valide indéfiniment.
- **Ignorer les paramètres de tri/filtrage** : `?orderBy=DROP TABLE` → injection si non validé.
- **Rate limit après la logique métier** : une requête lourde peut être exécutée avant d'être rejetée.
- **Pagination sans limite serveur** : `?pageSize=999999` → DoS.
- **CORS `*` sur une API avec `Authorization`** : les cookies/tokens ne sont pas envoyés dans ce cas, mais la config reste dangereuse si évolution future.

---

## Commandes de vérification rapide

```bash
# Tester les headers en prod
curl -sI https://api.example.com/ | grep -iE "strict-transport|content-security|x-content|server"

# Tester CORS
curl -sI -X OPTIONS https://api.example.com/api/payments \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control"

# Tester le rate limit (10 appels rapides)
for i in {1..12}; do curl -sw "%{http_code}\n" -o /dev/null https://api.example.com/api/auth/login; done
```
