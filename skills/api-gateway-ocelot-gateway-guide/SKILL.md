---
name: api-gateway-ocelot-gateway-guide
description: Configuration d'Ocelot comme API Gateway en .NET — routing, aggregation, rate limiting, load balancing et intégration Consul/Kubernetes. À utiliser quand l'utilisateur implémente une gateway API avec Ocelot en .NET. Se déclenche aussi avec "Ocelot", "Ocelot gateway", "ocelot.json", "API gateway Ocelot", "routing Ocelot", "aggregation Ocelot".
---

# Guide Ocelot API Gateway

## Workflow

1. **Installer** : package NuGet Ocelot + configuration JSON.
2. **Définir les routes** : mapping upstream → downstream.
3. **Configurer** : rate limiting, load balancing, caching.
4. **Sécuriser** : authentification, autorisation, CORS.

## Configuration de base

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot();

var app = builder.Build();
await app.UseOcelot();
app.Run();
```

### ocelot.json

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
      "UpstreamHttpMethod": [ "GET", "POST", "PUT", "DELETE" ],
      "AuthenticationOptions": {
        "AuthenticationProviderKey": "Bearer"
      },
      "RateLimitOptions": {
        "EnableRateLimiting": true,
        "Period": "1m",
        "PeriodTimespan": 60,
        "Limit": 100
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
        { "Host": "order-service-1", "Port": 8080 },
        { "Host": "order-service-2", "Port": 8080 }
      ],
      "UpstreamPathTemplate": "/orders/{everything}",
      "UpstreamHttpMethod": [ "GET", "POST" ],
      "LoadBalancerOptions": {
        "Type": "RoundRobin"
      },
      "QoSOptions": {
        "ExceptionsAllowedBeforeBreaking": 3,
        "DurationOfBreak": 10000,
        "TimeoutValue": 5000
      }
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

## Fonctionnalités

### Aggregation de requêtes

```json
{
  "Routes": [
    {
      "DownstreamPathTemplate": "/api/users/{userId}",
      "UpstreamPathTemplate": "/users/{userId}",
      "Key": "user"
    },
    {
      "DownstreamPathTemplate": "/api/orders?userId={userId}",
      "UpstreamPathTemplate": "/users/{userId}/orders",
      "Key": "orders"
    }
  ],
  "Aggregates": [
    {
      "RouteKeys": [ "user", "orders" ],
      "UpstreamPathTemplate": "/users/{userId}/profile"
    }
  ]
}
```

### Service Discovery (Consul)

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
      "LoadBalancerOptions": { "Type": "RoundRobin" }
    }
  ],
  "GlobalConfiguration": {
    "ServiceDiscoveryProvider": {
      "Scheme": "http",
      "Host": "consul",
      "Port": 8500,
      "Type": "Consul"
    }
  }
}
```

## Ocelot vs YARP

| Critère | Ocelot | YARP |
|---------|--------|------|
| **Configuration** | JSON déclaratif | Config + code |
| **Aggregation** | Intégrée | Custom middleware |
| **Service Discovery** | Consul, Eureka | Custom |
| **Performance** | Bonne | Excellente (Microsoft) |
| **Maintenance** | Communauté | Microsoft officiel |
| **Cas d'usage** | Gateway simple à moyenne | Proxy haute performance |

## Règles
- Pour les nouveaux projets, **évaluer YARP** comme alternative plus performante et maintenue par Microsoft.
- Séparer la configuration par fichier (`ocelot.dev.json`, `ocelot.prod.json`).
- Configurer les **QoS options** (circuit breaker, timeout) sur chaque route.
- L'aggregation ne doit pas masquer les erreurs — logger chaque sous-requête.
