---
name: dotnet-aspire-guide
description: Guide .NET Aspire pour l'orchestration d'applications cloud-native, le service discovery, la télémétrie et l'intégration de composants distribués. À utiliser quand l'utilisateur travaille avec .NET Aspire, orchestre des microservices ou configure des composants cloud-native en .NET. Se déclenche aussi avec ".NET Aspire", "Aspire", "AppHost", "service discovery .NET", "orchestration cloud-native", "Aspire dashboard".
---

# Guide .NET Aspire

## Workflow

1. **Créer le projet AppHost** : orchestrateur central des services et ressources.
2. **Ajouter les composants** : bases de données, caches, messaging.
3. **Configurer le service discovery** : références entre projets.
4. **Observer** : dashboard Aspire pour logs, traces et métriques.

## Structure d'un projet Aspire

```
MySolution/
├── MySolution.AppHost/           # Orchestrateur
│   └── Program.cs
├── MySolution.ServiceDefaults/   # Configuration partagée
│   └── Extensions.cs
├── MySolution.ApiService/        # Service API
├── MySolution.WorkerService/     # Worker background
└── MySolution.Web/               # Frontend Blazor
```

## AppHost — Orchestration

```csharp
// MySolution.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

// Ressources d'infrastructure
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume("postgres-data")
    .WithPgAdmin();

var orderDb = postgres.AddDatabase("orderdb");
var userDb = postgres.AddDatabase("userdb");

var redis = builder.AddRedis("cache")
    .WithRedisCommander();

var rabbitmq = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin();

// Services applicatifs
var apiService = builder.AddProject<Projects.MySolution_ApiService>("api-service")
    .WithReference(orderDb)
    .WithReference(redis)
    .WithReference(rabbitmq)
    .WithReplicas(3);

var workerService = builder.AddProject<Projects.MySolution_WorkerService>("worker-service")
    .WithReference(orderDb)
    .WithReference(rabbitmq);

// Frontend avec référence au service API
builder.AddProject<Projects.MySolution_Web>("web-frontend")
    .WithExternalHttpEndpoints()
    .WithReference(apiService);

builder.Build().Run();
```

## ServiceDefaults — Configuration partagée

```csharp
// MySolution.ServiceDefaults/Extensions.cs
public static class Extensions
{
    public static IHostApplicationBuilder AddServiceDefaults(
        this IHostApplicationBuilder builder)
    {
        // OpenTelemetry (traces, métriques, logs)
        builder.ConfigureOpenTelemetry();

        // Health checks par défaut
        builder.AddDefaultHealthChecks();

        // Service discovery
        builder.Services.AddServiceDiscovery();
        builder.Services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
        });

        return builder;
    }

    public static IHostApplicationBuilder ConfigureOpenTelemetry(
        this IHostApplicationBuilder builder)
    {
        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
        });

        builder.Services.AddOpenTelemetry()
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation();
            })
            .WithTracing(tracing =>
            {
                tracing
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddEntityFrameworkCoreInstrumentation();
            });

        builder.AddOpenTelemetryExporters();

        return builder;
    }
}
```

## Composants Aspire disponibles

| Composant | Package NuGet | Méthode |
|-----------|--------------|---------|
| PostgreSQL | `Aspire.Npgsql` | `AddNpgsqlDataSource` |
| SQL Server | `Aspire.Microsoft.Data.SqlClient` | `AddSqlServerClient` |
| Redis | `Aspire.StackExchange.Redis` | `AddRedisClient` |
| RabbitMQ | `Aspire.RabbitMQ.Client` | `AddRabbitMQClient` |
| MongoDB | `Aspire.MongoDB.Driver` | `AddMongoDBClient` |
| Azure Blob | `Aspire.Azure.Storage.Blobs` | `AddAzureBlobClient` |
| Azure Service Bus | `Aspire.Azure.Messaging.ServiceBus` | `AddAzureServiceBusClient` |

## Service Discovery

```csharp
// Dans ApiService — appeler un autre service par son nom
builder.Services.AddHttpClient<IUserServiceClient>(client =>
{
    // "https+http://user-service" est résolu automatiquement par Aspire
    client.BaseAddress = new Uri("https+http://user-service");
});
```

## Dashboard Aspire

Le dashboard est automatiquement disponible en développement et affiche :

| Vue | Contenu |
|-----|---------|
| **Resources** | État de tous les services et ressources |
| **Console Logs** | Logs en temps réel de chaque service |
| **Structured Logs** | Logs structurés avec filtrage |
| **Traces** | Traces distribuées entre services |
| **Metrics** | Métriques applicatives et runtime |

## Déploiement

```bash
# Générer le manifeste pour Azure Container Apps
azd init
azd up

# Ou générer un manifeste Kubernetes
aspirate generate
aspirate apply
```

## Règles
- Toujours utiliser `ServiceDefaults` pour la configuration partagée (télémétrie, health checks).
- Le service discovery utilise les noms logiques définis dans l'AppHost.
- Les volumes de données doivent être nommés pour persister entre les redémarrages.
- En production, remplacer les conteneurs locaux par des services managés (Azure, AWS).
