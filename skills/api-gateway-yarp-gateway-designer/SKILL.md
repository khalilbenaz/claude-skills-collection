---
name: api-gateway-yarp-gateway-designer
description: Conception d'API Gateway avec YARP (Yet Another Reverse Proxy) en .NET — routing, load balancing, rate limiting, transformations et authentification. À utiliser quand l'utilisateur implémente un reverse proxy ou une gateway API avec YARP en .NET. Se déclenche aussi avec "YARP", "reverse proxy .NET", "API gateway .NET", "YARP routing", "proxy .NET", "load balancer .NET".
---

# API Gateway avec YARP

## Workflow

1. **Définir les routes** : mapping des chemins vers les services backend.
2. **Configurer les clusters** : destinations, health checks, load balancing.
3. **Appliquer les transformations** : headers, paths, authentification.
4. **Sécuriser** : rate limiting, CORS, authentification centralisée.

## Configuration de base

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();
app.MapReverseProxy();
app.Run();
```

### appsettings.json

```json
{
  "ReverseProxy": {
    "Routes": {
      "payments-route": {
        "ClusterId": "payments-cluster",
        "Match": {
          "Path": "/api/payments/{**catch-all}"
        },
        "Transforms": [
          { "PathRemovePrefix": "/api/payments" }
        ]
      },
      "orders-route": {
        "ClusterId": "orders-cluster",
        "Match": {
          "Path": "/api/orders/{**catch-all}"
        },
        "Transforms": [
          { "PathRemovePrefix": "/api/orders" },
          { "RequestHeader": "X-Forwarded-Service", "Set": "orders" }
        ],
        "AuthorizationPolicy": "authenticated"
      }
    },
    "Clusters": {
      "payments-cluster": {
        "Destinations": {
          "primary": { "Address": "https://payment-service:8080" },
          "secondary": { "Address": "https://payment-service-2:8080" }
        },
        "LoadBalancingPolicy": "RoundRobin",
        "HealthCheck": {
          "Active": {
            "Enabled": true,
            "Interval": "00:00:30",
            "Timeout": "00:00:10",
            "Path": "/health"
          }
        }
      },
      "orders-cluster": {
        "Destinations": {
          "primary": { "Address": "https://order-service:8080" }
        }
      }
    }
  }
}
```

## Configuration avancée (code)

```csharp
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(transforms =>
    {
        transforms.AddRequestTransform(async context =>
        {
            // Ajouter un header avec le tenant
            var tenantId = context.HttpContext.User.FindFirst("tenant_id")?.Value;
            if (tenantId != null)
            {
                context.ProxyRequest.Headers.Add("X-Tenant-Id", tenantId);
            }
        });
    });

// Rate limiting par route
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("api-limit", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));
});
```

## Patterns courants

| Pattern | Configuration YARP |
|---------|-------------------|
| **Path-based routing** | `Match.Path: "/api/service/{**catch-all}"` |
| **Header-based routing** | `Match.Headers` avec conditions |
| **Load balancing** | `LoadBalancingPolicy: "RoundRobin"` / `"LeastRequests"` |
| **Circuit breaker** | Intégration Polly via middleware |
| **Auth centralisée** | `AuthorizationPolicy` sur les routes |
| **Rate limiting** | `RateLimiterPolicy` sur les routes |

## Règles
- YARP est un **reverse proxy**, pas un API management — pour des besoins avancés (quotas, developer portal), considérer Kong ou Azure APIM.
- Toujours configurer des **health checks actifs** sur les clusters.
- Les **transformations de headers** ne doivent pas exposer d'informations internes.
- Centraliser l'**authentification** dans la gateway, pas dans chaque service.
