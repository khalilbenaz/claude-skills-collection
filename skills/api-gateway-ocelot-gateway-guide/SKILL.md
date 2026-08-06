---
name: api-gateway-ocelot-gateway-guide
description: Configuration d'Ocelot comme API Gateway en .NET — routing, aggregation, rate limiting, load balancing et intégration Consul/Kubernetes. À utiliser quand l'utilisateur implémente une gateway API avec Ocelot en .NET. Se déclenche aussi avec "Ocelot", "Ocelot gateway", "ocelot.json", "API gateway Ocelot", "routing Ocelot", "aggregation Ocelot". Also triggers on ".NET API gateway", "Ocelot routing".
---

# Guide Ocelot API Gateway

## Workflow — mise en place pas à pas

### 1. Installer les packages

```bash
dotnet add package Ocelot                          # Core — toujours requis
dotnet add package Ocelot.Provider.Consul          # Service Discovery Consul
dotnet add package Ocelot.Provider.Eureka          # Service Discovery Eureka
dotnet add package Ocelot.Cache.CacheManager       # Cache distribué
dotnet add package Ocelot.Tracing.OpenTracing      # Tracing distribué
```

### 2. Brancher Ocelot dans Program.cs

```csharp
// Program.cs (.NET 8+)
var builder = WebApplication.CreateBuilder(args);

// Charge ocelot.json en priorité sur appsettings.json
builder.Configuration
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json",
                 optional: true, reloadOnChange: true);

builder.Services
    .AddOcelot(builder.Configuration)
    .AddCacheManager(x => x.WithDictionaryHandle())  // cache en mémoire
    .AddConsul()                                      // si Consul utilisé
    ;

builder.Services.AddAuthentication()
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = builder.Configuration["Jwt:Authority"];
        options.Audience  = builder.Configuration["Jwt:Audience"];
    });

var app = builder.Build();
await app.UseOcelot();
app.Run();
```

### 3. Définir les routes dans ocelot.json

Chaque route = un objet dans `"Routes"`. Minima obligatoires :

```json
{
  "Routes": [
    {
      "DownstreamPathTemplate": "/api/payments/{everything}",
      "DownstreamScheme": "https",
      "DownstreamHostAndPorts": [
        { "Host": "payment-service", "Port": 8080 }
      ],
      "UpstreamPathTemplate": "/payments/{everything}",
      "UpstreamHttpMethod": ["GET", "POST", "PUT", "DELETE"],

      "AuthenticationOptions": {
        "AuthenticationProviderKey": "Bearer"
      },

      "RateLimitOptions": {
        "EnableRateLimiting": true,
        "Period": "1m",
        "PeriodTimespan": 60,
        "Limit": 100
      },

      "QoSOptions": {
        "ExceptionsAllowedBeforeBreaking": 3,
        "DurationOfBreak": 10000,
        "TimeoutValue": 5000
      },

      "FileCacheOptions": {
        "TtlSeconds": 30,
        "Region": "payments"
      }
    },
    {
      "DownstreamPathTemplate": "/api/orders/{everything}",
      "DownstreamScheme": "https",
      "DownstreamHostAndPorts": [
        { "Host": "order-svc-1", "Port": 8080 },
        { "Host": "order-svc-2", "Port": 8080 }
      ],
      "UpstreamPathTemplate": "/orders/{everything}",
      "UpstreamHttpMethod": ["GET", "POST"],
      "LoadBalancerOptions": { "Type": "RoundRobin" }
    }
  ],
  "GlobalConfiguration": {
    "BaseUrl": "https://api.company.com",
    "RateLimitOptions": {
      "DisableRateLimitHeaders": false,
      "QuotaExceededMessage": "Trop de requêtes, réessayez plus tard",
      "HttpStatusCode": 429
    }
  }
}
```

### 4. Aggregation de requêtes

Agrège plusieurs appels downstream en une seule réponse upstream. Utiliser la clé `"Key"` sur chaque route participante :

```json
{
  "Routes": [
    {
      "DownstreamPathTemplate": "/api/users/{userId}",
      "UpstreamPathTemplate": "/users/{userId}",
      "DownstreamHostAndPorts": [{ "Host": "user-svc", "Port": 8080 }],
      "Key": "user"
    },
    {
      "DownstreamPathTemplate": "/api/orders?userId={userId}",
      "UpstreamPathTemplate": "/users/{userId}/orders",
      "DownstreamHostAndPorts": [{ "Host": "order-svc", "Port": 8080 }],
      "Key": "orders"
    }
  ],
  "Aggregates": [
    {
      "RouteKeys": ["user", "orders"],
      "UpstreamPathTemplate": "/users/{userId}/profile"
    }
  ]
}
```

> Limite : l'agrégation ne supporte que GET. Pour des cas complexes (POST, transformation de payload), implémenter un custom `IDefinedAggregator`.

### 5. Service Discovery avec Consul

```csharp
builder.Services.AddOcelot().AddConsul();
```

```json
{
  "Routes": [
    {
      "DownstreamPathTemplate": "/api/{everything}",
      "UpstreamPathTemplate": "/payments/{everything}",
      "ServiceName": "payment-service",
      "LoadBalancerOptions": { "Type": "LeastConnection" }
    }
  ],
  "GlobalConfiguration": {
    "ServiceDiscoveryProvider": {
      "Scheme": "http",
      "Host": "consul",
      "Port": 8500,
      "Type": "Consul",
      "PollingInterval": 5000
    }
  }
}
```

### 6. Headers et claims transformation

```json
{
  "AddHeadersToRequest": {
    "X-Tenant-Id": "Claims[tenant_id] > value"
  },
  "AddClaimsToRequest": {
    "sub": "Claims[sub] > value"
  },
  "AddQueriesToRequest": {
    "clientId": "Claims[client_id] > value"
  },
  "UpstreamHeaderTransform": {
    "X-Forwarded-For": "{RemoteIpAddress}"
  },
  "DownstreamHeaderTransform": {
    "Location": "{DownstreamBaseUrl}/{UpstreamBaseUrl}"
  }
}
```

### 7. Middleware personnalisé

```csharp
// Middleware de corrélation avant Ocelot
app.Use(async (ctx, next) =>
{
    ctx.Request.Headers["X-Correlation-Id"] =
        ctx.Request.Headers.TryGetValue("X-Correlation-Id", out var existing)
            ? existing.ToString()
            : Guid.NewGuid().ToString("N");
    await next();
});

await app.UseOcelot();
```

## Critères de décision — Ocelot vs YARP

| Critère | Ocelot | YARP |
|---------|--------|------|
| Configuration | JSON déclaratif | Code + config |
| Aggregation intégrée | Oui | Non (custom) |
| Service Discovery | Consul, Eureka | Custom |
| Performance | Bonne | Excellente (Microsoft) |
| Maintenance | Communauté | Microsoft officiel |
| Courbe d'apprentissage | Faible | Moyenne |
| Cas d'usage | Équipes petites/moyennes, config déclarative | Proxy haute performance, finops |

**Choisir Ocelot si** : config JSON suffisante, aggregation native requise, équipe habituée au routing déclaratif.
**Choisir YARP si** : throughput critique (>50k req/s), besoin de transformations complexes en code.

## Garde-fous et anti-patterns

**Ne pas faire :**
- Laisser une route sans `QoSOptions` — un service lent bloque toute la gateway.
- Partager un seul `ocelot.json` pour tous les environnements — utiliser `ocelot.{env}.json`.
- Utiliser le cache (`FileCacheOptions`) sur des routes POST/PUT/DELETE — effets de bord silencieux.
- Masquer les erreurs d'aggregation : si un sous-appel échoue, retourner un corps partiel avec un statut `207 Multi-Status` et logger chaque sous-requête individuellement.
- Exposer le port Consul admin (`8500`) sur le réseau public.
- Stocker les secrets (`Jwt:Authority`, clés API) en clair dans `ocelot.json` — utiliser les variables d'environnement ou un vault.

**Pièges courants :**
- `UpstreamPathTemplate` trop générique (`/{everything}`) capte tout et masque d'autres routes. Toujours ordonner du plus spécifique au plus général.
- L'aggregation retourne HTTP 200 même si les sous-requêtes ont échoué — vérifier chaque body de la réponse agrégée.
- `reloadOnChange: true` sur `ocelot.json` peut causer un reload à chaud en production ; tester en staging d'abord.
- Le circuit breaker (`QoSOptions`) nécessite le package `Polly` — sans lui, les options sont ignorées silencieusement.

## Bonnes pratiques 2026

- Versionner `ocelot.json` avec le code source, jamais dans un ConfigMap Kubernetes non tracé.
- Activer les health checks Ocelot avec `/health` et lier à la readiness probe.
- Utiliser `LeastConnection` plutôt que `RoundRobin` dès que les services ont des latences inégales.
- En Kubernetes, préférer le Service Discovery natif (`Kube`) plutôt que Consul sauf si multi-cluster.
- Exposer les métriques via OpenTelemetry (`Ocelot.Tracing.OpenTracing`) et les consommer dans Grafana.
- Limiter le nombre de routes par fichier à ~50 ; au-delà, splitter en fichiers partiels chargés via `AddOcelot(builder.Configuration)`.


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
