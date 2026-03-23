---
name: health-check-monitor
description: Implémentation de health checks ASP.NET Core, readiness/liveness probes et intégration Kubernetes. À utiliser quand l'utilisateur configure des endpoints de santé, des probes K8s ou du monitoring applicatif. Se déclenche aussi avec "health check", "liveness probe", "readiness probe", "endpoint santé", "health endpoint", "ASP.NET health", "monitoring applicatif".
---

# Health Checks & Monitoring

## Workflow

1. **Identifier les dépendances** : base de données, cache, services externes, file queues.
2. **Implémenter les checks** : un check par dépendance critique.
3. **Configurer les probes** : liveness (l'app est vivante) et readiness (l'app peut servir du trafic).
4. **Intégrer** : Kubernetes probes, dashboard, alertes.

## Configuration ASP.NET Core

### Setup de base

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    // Base de données
    .AddSqlServer(
        connectionString,
        name: "sqlserver",
        tags: new[] { "db", "ready" },
        timeout: TimeSpan.FromSeconds(5))

    // Redis
    .AddRedis(
        redisConnectionString,
        name: "redis",
        tags: new[] { "cache", "ready" },
        timeout: TimeSpan.FromSeconds(3))

    // RabbitMQ
    .AddRabbitMQ(
        rabbitConnectionString,
        name: "rabbitmq",
        tags: new[] { "messaging", "ready" },
        timeout: TimeSpan.FromSeconds(5))

    // Service externe
    .AddUrlGroup(
        new Uri("https://api.partner.com/health"),
        name: "partner-api",
        tags: new[] { "external" },
        timeout: TimeSpan.FromSeconds(10))

    // Check custom
    .AddCheck<DiskSpaceHealthCheck>("disk-space",
        tags: new[] { "infrastructure" });

// Endpoints
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false, // Aucun check — juste "l'app répond"
    ResponseWriter = WriteMinimalResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteDetailedResponse
});

app.MapHealthChecks("/health/full", new HealthCheckOptions
{
    ResponseWriter = WriteDetailedResponse
});
```

### Health Check personnalisé

```csharp
public class DiskSpaceHealthCheck : IHealthCheck
{
    private const long MinimumFreeBytes = 1_073_741_824; // 1 GB

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken ct = default)
    {
        var drive = new DriveInfo("/");
        var freeSpace = drive.AvailableFreeSpace;

        if (freeSpace < MinimumFreeBytes)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                $"Espace disque faible : {freeSpace / 1_048_576} MB restants"));
        }

        return Task.FromResult(HealthCheckResult.Healthy(
            $"Espace disque OK : {freeSpace / 1_073_741_824} GB disponibles"));
    }
}
```

### Réponse JSON détaillée

```csharp
static async Task WriteDetailedResponse(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";

    var result = new
    {
        status = report.Status.ToString(),
        duration = report.TotalDuration.TotalMilliseconds,
        checks = report.Entries.Select(e => new
        {
            name = e.Key,
            status = e.Value.Status.ToString(),
            duration = e.Value.Duration.TotalMilliseconds,
            description = e.Value.Description,
            error = e.Value.Exception?.Message
        })
    };

    await context.Response.WriteAsJsonAsync(result);
}
```

## Intégration Kubernetes

### Probes

```yaml
# deployment.yaml
spec:
  containers:
    - name: payment-api
      ports:
        - containerPort: 8080
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 10
        failureThreshold: 3
        # Si 3 échecs → K8s redémarre le pod
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
        failureThreshold: 3
        # Si 3 échecs → K8s retire le pod du service
      startupProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 3
        failureThreshold: 30
        # Laisse 90s au pod pour démarrer
```

### Différences entre probes

| Probe | Question | Conséquence si échec |
|-------|----------|---------------------|
| **Liveness** | L'app est-elle vivante ? | Pod redémarré |
| **Readiness** | L'app peut-elle servir du trafic ? | Pod retiré du load balancer |
| **Startup** | L'app a-t-elle fini de démarrer ? | Liveness/readiness suspendues |

## Bonnes pratiques

### À faire
- Séparer `/health/live` (léger, pas de checks) et `/health/ready` (checks des dépendances)
- Mettre des **timeouts** sur chaque health check
- Taguer les checks pour filtrer par contexte
- Retourner des détails en JSON pour le debugging
- Monitorer les résultats avec Prometheus/Grafana

### À éviter
- Faire des health checks trop lourds (requêtes complexes en DB)
- Mettre des checks de services externes dans le liveness (risque de cascade)
- Oublier le `startupProbe` pour les apps lentes au démarrage
- Exposer le `/health/full` sans authentification en production

## Règles
- Le liveness probe ne doit **jamais** vérifier les dépendances externes.
- Le readiness probe doit vérifier toutes les dépendances nécessaires au traitement du trafic.
- Chaque health check doit avoir un timeout explicite.
- Les détails des health checks ne doivent pas être exposés publiquement sans authentification.
