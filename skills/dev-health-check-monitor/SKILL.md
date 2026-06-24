---
name: dev-health-check-monitor
description: Implémentation de health checks ASP.NET Core, readiness/liveness probes et intégration Kubernetes. À utiliser quand l'utilisateur configure des endpoints de santé, des probes K8s ou du monitoring applicatif. Se déclenche aussi avec "health check", "liveness probe", "readiness probe", "endpoint santé", "health endpoint", "ASP.NET health", "monitoring applicatif".
---

# Health Checks & Monitoring

## Workflow en 5 étapes

1. **Inventorier les dépendances** — base de données, cache, message broker, services HTTP tiers, système de fichiers.
2. **Classifier les checks** — liveness (process vivant), readiness (dépendances critiques up), startup (warm-up initial).
3. **Implémenter les checks** — un `IHealthCheck` par dépendance ; package NuGet dédié quand il existe.
4. **Exposer les endpoints** — `/health/live` minimal, `/health/ready` filtré par tags, `/health/full` protégé.
5. **Brancher l'observabilité** — Kubernetes probes, Prometheus scraping, alertes Grafana.

---

## Packages NuGet recommandés (2026)

```bash
dotnet add package AspNetCore.HealthChecks.SqlServer
dotnet add package AspNetCore.HealthChecks.Redis
dotnet add package AspNetCore.HealthChecks.RabbitMQ
dotnet add package AspNetCore.HealthChecks.Uris
dotnet add package AspNetCore.HealthChecks.Npgsql       # PostgreSQL
dotnet add package AspNetCore.HealthChecks.Kafka
dotnet add package AspNetCore.HealthChecks.UI.Client    # UI dashboard optionnel
```

---

## Configuration ASP.NET Core

### Program.cs — setup complet

```csharp
builder.Services.AddHealthChecks()
    // SQL Server — tag "ready" = inclus dans readiness probe
    .AddSqlServer(
        builder.Configuration.GetConnectionString("Default")!,
        name: "sqlserver",
        tags: ["db", "ready"],
        timeout: TimeSpan.FromSeconds(5))

    // Redis
    .AddRedis(
        builder.Configuration["Redis:ConnectionString"]!,
        name: "redis",
        tags: ["cache", "ready"],
        timeout: TimeSpan.FromSeconds(3))

    // RabbitMQ
    .AddRabbitMQ(
        builder.Configuration["RabbitMQ:Uri"]!,
        name: "rabbitmq",
        tags: ["messaging", "ready"],
        timeout: TimeSpan.FromSeconds(5))

    // URL externe — NON incluse dans liveness ni readiness
    .AddUrlGroup(
        new Uri("https://api.partner.com/ping"),
        name: "partner-api",
        tags: ["external"],
        timeout: TimeSpan.FromSeconds(8))

    // Check custom
    .AddCheck<DiskSpaceHealthCheck>("disk-space",
        tags: ["infra"],
        timeout: TimeSpan.FromSeconds(2));

// --- Endpoints ---

// Liveness : aucun check, répond 200 si le process tourne
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = WriteMinimalResponse
});

// Readiness : seules les dépendances critiques (tag "ready")
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = hc => hc.Tags.Contains("ready"),
    ResponseWriter = WriteDetailedResponse
});

// Full : tous les checks, endpoint protégé
app.MapHealthChecks("/health/full", new HealthCheckOptions
{
    ResponseWriter = WriteDetailedResponse
}).RequireAuthorization("internal");
```

### IHealthCheck personnalisé

```csharp
public class DiskSpaceHealthCheck(ILogger<DiskSpaceHealthCheck> logger) : IHealthCheck
{
    private const long MinFreeBytes = 1_073_741_824; // 1 GB

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        var drive = new DriveInfo(OperatingSystem.IsWindows() ? "C:\\" : "/");
        var free = drive.AvailableFreeSpace;

        var data = new Dictionary<string, object>
        {
            ["free_gb"] = Math.Round((double)free / 1_073_741_824, 2),
            ["drive"]   = drive.Name
        };

        if (free < MinFreeBytes)
        {
            logger.LogWarning("Disk space low: {FreeGb} GB", data["free_gb"]);
            return Task.FromResult(HealthCheckResult.Degraded(
                $"Espace disque faible : {data["free_gb"]} GB", data: data));
        }

        return Task.FromResult(HealthCheckResult.Healthy(null, data));
    }
}
```

### ResponseWriter JSON structuré

```csharp
static async Task WriteDetailedResponse(HttpContext ctx, HealthReport report)
{
    ctx.Response.ContentType = MediaTypeNames.Application.Json;
    ctx.Response.StatusCode = report.Status == HealthStatus.Unhealthy ? 503 : 200;

    var payload = new
    {
        status   = report.Status.ToString(),
        duration = report.TotalDuration.TotalMilliseconds,
        checks   = report.Entries.Select(e => new
        {
            name        = e.Key,
            status      = e.Value.Status.ToString(),
            duration_ms = e.Value.Duration.TotalMilliseconds,
            description = e.Value.Description,
            data        = e.Value.Data,
            error       = e.Value.Exception?.Message
        })
    };
    await ctx.Response.WriteAsJsonAsync(payload);
}

static Task WriteMinimalResponse(HttpContext ctx, HealthReport report)
{
    ctx.Response.ContentType = MediaTypeNames.Text.Plain;
    ctx.Response.StatusCode  = report.Status == HealthStatus.Unhealthy ? 503 : 200;
    return ctx.Response.WriteAsync(report.Status.ToString());
}
```

---

## Intégration Kubernetes

### Critères de choix des probes

| Probe | Question | Conséquence échec | Endpoint conseillé |
|---|---|---|---|
| **startupProbe** | L'app a-t-elle fini de démarrer ? | liveness/readiness suspendues | `/health/live` |
| **livenessProbe** | Le process est-il fonctionnel ? | Pod redémarré | `/health/live` |
| **readinessProbe** | Peut-on envoyer du trafic ? | Pod retiré du LB | `/health/ready` |

### deployment.yaml

```yaml
spec:
  containers:
    - name: payment-api
      image: myregistry/payment-api:1.0.0
      ports:
        - containerPort: 8080
      startupProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 3
        failureThreshold: 30   # 90 s max pour démarrer
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 10
        failureThreshold: 3
        timeoutSeconds: 5
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 5
        failureThreshold: 3
        timeoutSeconds: 5
```

---

## Critères de décision

- **Mettre dans liveness** : état interne seulement (deadlock détecté, mémoire critique). Jamais une dépendance externe.
- **Mettre dans readiness** : toute dépendance sans laquelle le trafic ne peut pas être traité (DB, cache session).
- **Mettre en external/infra** : services tiers à surveiller mais non bloquants (API partenaire, CDN).
- **Degraded vs Unhealthy** : utiliser `Degraded` pour les seuils d'avertissement ; K8s traite Degraded comme Healthy (HTTP 200).

---

## Monitoring Prometheus + Grafana

```csharp
// Exposer les métriques health check pour Prometheus
builder.Services.AddHealthChecks()
    // ... checks ...
    .ForwardToPrometheus();

app.UseHealthChecksPrometheusExporter("/metrics/health",
    options => options.ResultStatusCodes[HealthStatus.Unhealthy] = 503);
```

Alerte Grafana alerting rule :

```promql
# Alerte si un check est Unhealthy depuis > 1 min
health_check_status{status="Unhealthy"} == 1
```

---

## Garde-fous / Anti-patterns

- **Liveness qui vérifie la DB** → boucle de redémarrage si la DB tombe, tous les pods crashent en cascade.
- **Timeout trop long** → la probe K8s timeout elle-même (défaut 1s) ; toujours `timeout` < `timeoutSeconds` probe.
- **Requête SQL lourde dans le check** → utiliser `SELECT 1` ou `SELECT TOP 1 1 FROM sysobjects` pour SQL Server.
- **Pas de startupProbe** → liveness tue les pods qui ont une initialisation lente (EF migrations, cache warm-up).
- **`/health/full` exposé publiquement** → fuite d'informations sur la topologie interne ; toujours `RequireAuthorization`.
- **Checks synchrones bloquants** → implémenter `CheckHealthAsync` avec vrai `await` ; ne jamais `.Result` ou `.Wait()`.
- **Un seul endpoint fourre-tout** → impossible de séparer liveness/readiness ; segmenter dès le départ.

---

## Bonnes pratiques 2026

- Utiliser les **primary constructors** C# 12 dans `IHealthCheck` (voir exemple DiskSpace).
- Ajouter `HealthCheckPublisherHostedService` pour publier les résultats en push vers un système de monitoring externe.
- Tester les health checks en intégration avec `WebApplicationFactory` : forcer `Unhealthy` via stub et vérifier le HTTP 503.
- Nommer les checks de façon **consistante avec les tags** pour faciliter le filtrage en dashboard.
- En microservices, centraliser les checks dans un **aggregator** plutôt que de surveiller chaque pod individuellement.


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
