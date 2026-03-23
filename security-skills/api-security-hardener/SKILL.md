---
name: api-security-hardener
description: Durcissement de la sécurité des APIs — rate limiting, validation d'entrée, headers de sécurité, CORS, protection contre les attaques courantes. À utiliser quand l'utilisateur sécurise une API, configure des headers de sécurité ou implémente du rate limiting. Se déclenche aussi avec "sécurité API", "rate limiting", "headers sécurité", "CORS", "API hardening", "protection API", "OWASP API".
---

# Durcissement de la Sécurité des APIs

## Workflow

1. **Auditer** : identifier les failles potentielles (OWASP API Top 10).
2. **Configurer** : headers, CORS, rate limiting.
3. **Valider** : entrées, sorties, authentification.
4. **Monitorer** : logs de sécurité, détection d'anomalies.

## OWASP API Top 10 — Checklist

| # | Risque | Contrôle |
|---|--------|----------|
| 1 | Broken Object Level Authorization | Vérifier l'ownership sur chaque ressource |
| 2 | Broken Authentication | JWT court, refresh rotation, MFA |
| 3 | Broken Object Property Level Authorization | DTO de réponse, pas d'entités directes |
| 4 | Unrestricted Resource Consumption | Rate limiting, pagination obligatoire |
| 5 | Broken Function Level Authorization | RBAC sur chaque endpoint |
| 6 | Unrestricted Access to Sensitive Business Flows | Captcha, anti-bot, limites métier |
| 7 | Server Side Request Forgery | Whitelist d'URLs, pas d'URLs utilisateur |
| 8 | Security Misconfiguration | Headers, CORS strict, erreurs génériques |
| 9 | Improper Inventory Management | Documenter tous les endpoints, décommissionner les anciens |
| 10 | Unsafe Consumption of APIs | Valider les réponses des APIs tierces |

## Implémentation ASP.NET Core

### Headers de sécurité

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "0");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'");
    context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    context.Response.Headers.Remove("Server");
    context.Response.Headers.Remove("X-Powered-By");

    await next();
});
```

### Rate Limiting

```csharp
builder.Services.AddRateLimiter(options =>
{
    // Rate limit global
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Rate limit par endpoint
    options.AddPolicy("strict", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Usage
app.MapPost("/api/payments", handler).RequireRateLimiting("strict");
```

### Validation d'entrée

```csharp
public class CreatePaymentRequest
{
    [Required]
    [Range(1, 99999999, ErrorMessage = "Le montant doit être entre 1 et 99999999 centimes")]
    public int Amount { get; set; }

    [Required]
    [RegularExpression("^(EUR|USD|GBP)$")]
    public string Currency { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string RecipientId { get; set; }

    [MaxLength(10)]
    public Dictionary<string, string>? Metadata { get; set; }
}
```

### CORS strict

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("Production", policy =>
    {
        policy.WithOrigins("https://app.company.com", "https://admin.company.com")
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Authorization", "Content-Type")
              .SetMaxAge(TimeSpan.FromHours(1));
    });
});
```

## Règles
- Ne jamais exposer les entités de base de données directement — toujours des **DTOs**.
- Les messages d'erreur ne doivent **jamais** révéler des détails d'implémentation.
- Chaque endpoint doit vérifier l'**autorisation** (pas seulement l'authentification).
- Le rate limiting doit être appliqué **avant** la logique métier.
- Logger les tentatives d'accès non autorisées pour la détection d'intrusion.

> Ce skill est un outil de sécurité défensif. Il aide à protéger les APIs contre les attaques courantes.
