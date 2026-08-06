---
name: api-gateway-yarp-gateway-designer
description: Conception d'API Gateway avec YARP (Yet Another Reverse Proxy) en .NET — routing, load balancing, rate limiting, transformations et authentification. À utiliser quand l'utilisateur implémente un reverse proxy ou une gateway API avec YARP en .NET. Se déclenche aussi avec "YARP", "reverse proxy .NET", "API gateway .NET", "YARP routing", "proxy .NET", "load balancer .NET". Also triggers on "YARP reverse proxy", "YARP gateway", "gateway in ASP.NET Core".
---

# API Gateway avec YARP

## Critères de décision

| Besoin | Recommandation |
|--------|----------------|
| Reverse proxy léger, intégré .NET | YARP |
| Developer portal, quotas avancés, monétisation | Azure APIM ou Kong |
| Multi-tenant avec isolation stricte | YARP + middleware tenant + JWT claims |
| mTLS entre gateway et backends | YARP + `HttpClient` custom avec cert |

## Workflow en 6 étapes

### 1. Installer le package

```bash
dotnet add package Yarp.ReverseProxy
# Dernière version stable : 2.2.0 (LTS .NET 8/9)
```

### 2. Enregistrer YARP dans Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Optionnel : rate limiting (Microsoft.AspNetCore.RateLimiting)
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api-limit", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 10;
    });
    options.RejectionStatusCode = 429;
});

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapReverseProxy();
app.Run();
```

### 3. Déclarer les routes et clusters (appsettings.json)

```json
{
  "ReverseProxy": {
    "Routes": {
      "payments-route": {
        "ClusterId": "payments-cluster",
        "Match": { "Path": "/api/payments/{**catch-all}" },
        "Transforms": [
          { "PathRemovePrefix": "/api/payments" },
          { "RequestHeader": "X-Gateway-Source", "Set": "yarp-gw" }
        ],
        "RateLimiterPolicy": "api-limit",
        "AuthorizationPolicy": "anonymous"
      },
      "orders-route": {
        "ClusterId": "orders-cluster",
        "Match": {
          "Path": "/api/orders/{**catch-all}",
          "Headers": [{ "Name": "X-Api-Version", "Values": ["v2"], "Mode": "ExactHeader" }]
        },
        "Transforms": [
          { "PathRemovePrefix": "/api/orders" }
        ],
        "AuthorizationPolicy": "authenticated",
        "RateLimiterPolicy": "api-limit"
      }
    },
    "Clusters": {
      "payments-cluster": {
        "LoadBalancingPolicy": "RoundRobin",
        "HealthCheck": {
          "Active": {
            "Enabled": true,
            "Interval": "00:00:30",
            "Timeout": "00:00:10",
            "Path": "/health"
          },
          "Passive": { "Enabled": true }
        },
        "Destinations": {
          "primary":   { "Address": "https://payment-svc-1:8080" },
          "secondary": { "Address": "https://payment-svc-2:8080" }
        }
      },
      "orders-cluster": {
        "LoadBalancingPolicy": "LeastRequests",
        "Destinations": {
          "primary": { "Address": "https://order-svc:8080" }
        }
      }
    }
  }
}
```

### 4. Ajouter des transformations par code (claims, tenant, corrélation)

```csharp
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(ctx =>
    {
        // Injecter le tenant depuis le JWT dans chaque requête proxiée
        ctx.AddRequestTransform(async reqCtx =>
        {
            var tenantId = reqCtx.HttpContext.User.FindFirst("tenant_id")?.Value;
            if (tenantId is not null)
                reqCtx.ProxyRequest.Headers.TryAddWithoutValidation("X-Tenant-Id", tenantId);

            // Corrélation
            var correlationId = reqCtx.HttpContext.TraceIdentifier;
            reqCtx.ProxyRequest.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
        });

        // Masquer les headers internes sur la réponse
        ctx.AddResponseTransform(async respCtx =>
        {
            respCtx.ProxyResponse?.Headers.Remove("X-Internal-Node");
            await Task.CompletedTask;
        });
    });
```

### 5. Health check passif + circuit breaker (Polly)

```csharp
// Besoin : Microsoft.Extensions.Http.Resilience
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .ConfigureHttpClient((ctx, handler) =>
    {
        // Timeout global par requête proxiée
        handler.ActivityHeadersPropagator = null;
    })
    .AddResilienceHandler("circuit-breaker", builder =>
    {
        builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            SamplingDuration = TimeSpan.FromSeconds(30),
            FailureRatio = 0.5,
            MinimumThroughput = 10,
            BreakDuration = TimeSpan.FromSeconds(15)
        });
        builder.AddTimeout(TimeSpan.FromSeconds(5));
    });
```

### 6. Rechargement à chaud (hot reload) sans restart

```csharp
// Recharger les routes/clusters depuis n'importe quelle source dynamique
var proxyConfig = app.Services.GetRequiredService<InMemoryConfigProvider>();
proxyConfig.Update(newRoutes, newClusters);
// Pas besoin de redémarrer le process — YARP recharge instantanément.
```

Pour un chargement depuis une base de données ou un API config, implémenter `IProxyConfigProvider`.

## Patterns de routing courants

| Cas | Config YARP |
|-----|-------------|
| Path prefix routing | `Match.Path: "/api/svc/{**catch-all}"` + `PathRemovePrefix` |
| Header-based routing (versioning) | `Match.Headers[].Values` + `Mode: ExactHeader` |
| Query string routing | `Match.QueryParameters[].Values` |
| Host-based routing (multi-tenant) | `Match.Hosts: ["tenant1.api.com"]` |
| Weighted routing (canary) | Deux destinations, `Weight` dans les clusters |
| Rewrite complet de chemin | `PathPattern: "/v2/{**catch-all}"` |

## Politiques de load balancing

| Politique | Usage |
|-----------|-------|
| `RoundRobin` | Distribution uniforme, cas général |
| `LeastRequests` | Backends hétérogènes (latence variable) |
| `Random` | Tests, benchmarks |
| `PowerOfTwoChoices` | Haute charge, meilleure distribution que RoundRobin |
| `FirstAlphabetical` | Failover ordonné, actif/passif |

## Garde-fous et anti-patterns

**Ne pas faire :**
- Laisser les routes sans `AuthorizationPolicy` sur des endpoints sensibles (oubli silencieux — YARP ne bloque rien par défaut).
- Utiliser YARP comme orchestrateur BFF complexe avec logique métier — garder la gateway dumb, les services smart.
- Oublier `PassiveHealthCheck` : sans lui, un backend tombé reste dans la rotation jusqu'au prochain active check.
- Configurer `HttpClient` timeout à l'infini — toujours positionner un timeout explicite (`AddTimeout`).
- Exposer des headers internes (`X-Internal-*`, `Server`, `X-Powered-By`) aux clients — les supprimer dans `AddResponseTransform`.
- Stocker les secrets de cluster (mots de passe mTLS, tokens) dans `appsettings.json` — utiliser `IConfiguration` + Azure Key Vault / environment variables.

**Pièges courants :**
- `PathRemovePrefix` est case-sensitive — tester avec `/Api/Payments` vs `/api/payments` si les clients varient.
- L'ordre des routes dans le JSON n'est pas garanti en .NET < 8 — utiliser `Order` explicite sur chaque route si la priorité compte.
- `AddReverseProxy().LoadFromConfig()` et `AddTransforms()` doivent être chaînés sur le **même** `IReverseProxyBuilder`, sinon les transforms ne s'appliquent pas.
- Le rate limiting `UseRateLimiter()` doit être appelé **avant** `MapReverseProxy()` dans le pipeline.

## Bonnes pratiques 2026

- **Observabilité** : YARP expose des métriques OpenTelemetry natives (`Yarp.ReverseProxy` activity source) — les brancher sur Prometheus/Grafana ou Azure Monitor.
- **mTLS inter-services** : configurer `SocketsHttpHandler` avec le certificat client dans `ConfigureHttpClient`.
- **Configuration dynamique** : préférer `IProxyConfigProvider` avec rechargement depuis un config store (Consul, Azure App Configuration) plutôt que des restart.
- **Versioning** : router par header `Accept-Version` ou par host `v2.api.company.com` plutôt que par path quand les backends sont stables.
- **Tests** : utiliser `Microsoft.AspNetCore.TestHost` + `WebApplicationFactory` pour tester les routes YARP sans démarrer de vrai serveur backend (mocker les destinations avec `WireMock.Net`).


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
