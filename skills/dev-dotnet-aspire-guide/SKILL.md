---
name: dev-dotnet-aspire-guide
description: Guide .NET Aspire pour l'orchestration d'applications cloud-native, le service discovery, la télémétrie et l'intégration de composants distribués. À utiliser quand l'utilisateur travaille avec .NET Aspire, orchestre des microservices ou configure des composants cloud-native en .NET. Se déclenche aussi avec ".NET Aspire", "Aspire", "AppHost", "service discovery .NET", "orchestration cloud-native", "Aspire dashboard". Also triggers on "cloud-native orchestration in .NET".
---

# Guide .NET Aspire

## Quand utiliser .NET Aspire

| Situation | Recommandation |
|-----------|---------------|
| ≥ 2 services qui se parlent en local | Aspire — service discovery automatique |
| Besoin de traces distribuées dès le dev | Aspire — dashboard OTEL intégré |
| Projet mono-service simple | Aspire superflu |
| Cible Azure Container Apps / Kubernetes | Aspire — manifeste généré via `azd` ou `aspirate` |
| Équipe < 3 devs, pas de messaging | À évaluer ; Aspire a un coût d'apprentissage |

Version stable 2026 : **.NET Aspire 9.x** (compatible .NET 8 et .NET 9).

---

## Étape 1 — Créer le squelette

```bash
# Prérequis : Docker Desktop actif, workload Aspire installé
dotnet workload install aspire

# Nouveau projet depuis le template
dotnet new aspire-starter -n MySolution -o MySolution
cd MySolution

# Structure générée
# MySolution.AppHost/          orchestrateur
# MySolution.ServiceDefaults/  config partagée
# MySolution.ApiService/       API demo
# MySolution.Web/              Blazor frontend
```

Pour ajouter Aspire à une solution existante :
```bash
dotnet new aspire-apphost -n MySolution.AppHost
dotnet new aspire-servicedefaults -n MySolution.ServiceDefaults
# Puis ajouter les références projets manuellement
```

---

## Étape 2 — Câbler l'AppHost

L'AppHost est le point d'entrée unique. Il déclare **les ressources** (infra) et **les projets** (code), puis les relie.

```csharp
// MySolution.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

// --- Infrastructure ---
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume("pgdata")   // volume nommé = persistance entre runs
    .WithPgAdmin();             // UI admin sur port aléatoire

var orderDb = postgres.AddDatabase("orderdb");
var redis   = builder.AddRedis("cache").WithRedisCommander();
var bus     = builder.AddRabbitMQ("messaging").WithManagementPlugin();

// --- Services applicatifs ---
var api = builder.AddProject<Projects.MySolution_ApiService>("api")
    .WithReference(orderDb)     // injecte la conn string via env var
    .WithReference(redis)
    .WithReference(bus)
    .WithReplicas(2);           // 2 instances en dev pour tester la LB

builder.AddProject<Projects.MySolution_Web>("web")
    .WithExternalHttpEndpoints()
    .WithReference(api);        // URL résolue par service discovery

builder.Build().Run();
```

**Règle** : nommez les ressources en minuscules-tirets (`"order-db"`), ce nom devient la clé de service discovery.

---

## Étape 3 — ServiceDefaults (configuration partagée)

Chaque service appelle `AddServiceDefaults()` dans son `Program.cs`. Ce package centralise : OpenTelemetry, health checks, resilience, service discovery.

```csharp
// Dans chaque service : Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults(); // une seule ligne suffit
```

```csharp
// MySolution.ServiceDefaults/Extensions.cs
public static IHostApplicationBuilder AddServiceDefaults(
    this IHostApplicationBuilder builder)
{
    builder.ConfigureOpenTelemetry();
    builder.AddDefaultHealthChecks();

    builder.Services.AddServiceDiscovery();
    builder.Services.ConfigureHttpClientDefaults(http =>
    {
        http.AddStandardResilienceHandler(); // retry + circuit breaker
        http.AddServiceDiscovery();
    });
    return builder;
}

public static IHostApplicationBuilder ConfigureOpenTelemetry(
    this IHostApplicationBuilder builder)
{
    builder.Logging.AddOpenTelemetry(o =>
    {
        o.IncludeFormattedMessage = true;
        o.IncludeScopes = true;
    });

    builder.Services.AddOpenTelemetry()
        .WithMetrics(m => m
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation())
        .WithTracing(t => t
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddEntityFrameworkCoreInstrumentation());

    builder.AddOpenTelemetryExporters(); // OTLP vers le dashboard Aspire
    return builder;
}
```

---

## Étape 4 — Service Discovery dans les services

```csharp
// Résolution automatique du nom logique déclaré dans AppHost
builder.Services.AddHttpClient<IOrderServiceClient>(client =>
{
    // "https+http://api" = nom donné dans AddProject("api")
    // Aspire résout l'URL réelle (port dynamique) à l'exécution
    client.BaseAddress = new Uri("https+http://api");
});
```

```csharp
// Connexion PostgreSQL injectée automatiquement via Aspire
builder.AddNpgsqlDataSource("orderdb"); // "orderdb" = nom de la database dans AppHost
```

---

## Composants intégrés (Aspire 9)

| Technologie | Package NuGet (AppHost) | Package NuGet (Service) | Méthode service |
|-------------|------------------------|------------------------|-----------------|
| PostgreSQL | `Aspire.Hosting.PostgreSQL` | `Aspire.Npgsql` | `AddNpgsqlDataSource` |
| SQL Server | `Aspire.Hosting.SqlServer` | `Aspire.Microsoft.Data.SqlClient` | `AddSqlServerClient` |
| Redis | `Aspire.Hosting.Redis` | `Aspire.StackExchange.Redis` | `AddRedisClient` |
| RabbitMQ | `Aspire.Hosting.RabbitMQ` | `Aspire.RabbitMQ.Client` | `AddRabbitMQClient` |
| MongoDB | `Aspire.Hosting.MongoDB` | `Aspire.MongoDB.Driver` | `AddMongoDBClient` |
| Kafka | `Aspire.Hosting.Kafka` | `Aspire.Confluent.Kafka` | `AddKafkaProducer` |
| Azure Blob | `Aspire.Hosting.Azure.Storage` | `Aspire.Azure.Storage.Blobs` | `AddAzureBlobClient` |
| Azure Service Bus | `Aspire.Hosting.Azure.ServiceBus` | `Aspire.Azure.Messaging.ServiceBus` | `AddAzureServiceBusClient` |
| Elasticsearch | `Aspire.Hosting.Elasticsearch` | `Aspire.Elastic.Clients.Elasticsearch` | `AddElasticsearchClient` |

---

## Étape 5 — Dashboard Aspire

Lancé automatiquement avec `dotnet run` sur l'AppHost :

| Vue | Usage |
|-----|-------|
| **Resources** | État (Running/Stopped/Unhealthy) de chaque conteneur/projet |
| **Console Logs** | Stdout/stderr en temps réel, filtrable par service |
| **Structured Logs** | Logs JSON avec filtres sur niveau/message/attributs |
| **Traces** | Traces distribuées OTEL — waterfall inter-services |
| **Metrics** | Métriques runtime + applicatives (graphs) |

URL par défaut : `https://localhost:17088` (token dans la console au démarrage).

---

## Étape 6 — Déploiement

### Azure Container Apps (recommandé)
```bash
dotnet tool install -g azd
azd init          # détecte Aspire, génère azure.yaml
azd up            # provision + deploy en une commande
```

### Kubernetes (via Aspirate)
```bash
dotnet tool install -g aspirate
aspirate init
aspirate generate  # génère les manifests K8s
aspirate apply     # kubectl apply automatique
```

### Production : remplacer les conteneurs locaux par des services managés
```csharp
// AppHost/Program.cs — switch dev/prod
if (builder.ExecutionContext.IsPublishMode)
{
    // Azure SQL Managed Instance en prod
    var sql = builder.AddAzureSqlServer("sql")
                     .AddDatabase("orderdb");
}
else
{
    // SQL Server local en conteneur en dev
    var sql = builder.AddSqlServer("sql")
                     .AddDatabase("orderdb");
}
```

---

## Anti-patterns / Pièges

| Problème | Cause | Correction |
|----------|-------|------------|
| Service discovery échoue | Nom dans `AddHttpClient` ne correspond pas au nom AppHost | Utiliser exactement le même nom logique |
| Port déjà utilisé au démarrage | Aspire affecte des ports dynamiques mais les profils launchSettings peuvent fixer les ports | Supprimer les `applicationUrl` dans `launchSettings.json` des services |
| Données perdues entre redémarrages | Volume anonyme (sans `.WithDataVolume("nom")`) | Toujours nommer les volumes |
| Traces manquantes | `AddServiceDefaults()` non appelé dans un service | Vérifier que chaque service l'appelle |
| Container pull lent en CI | Images téléchargées à chaque run | Pré-pull les images dans le step CI ou utiliser un registry miroir |
| `WithReplicas` en prod | Les réplicas Aspire sont pour le dev uniquement | En prod, déléguer le scaling à ACA/K8s |
| Secrets en clair dans AppHost | `.WithEnvironment("API_KEY", "secret")` visible dans les logs Aspire | Utiliser `builder.AddParameter("api-key", secret: true)` |

---

## Bonnes pratiques 2026

- **Un AppHost par solution** — pas un par environnement.
- **ServiceDefaults obligatoire** dans chaque service ; ne pas dupliquer la config OTEL.
- **Health checks exposés** : `/health` (liveness) et `/alive` (readiness) — Aspire les surveille.
- **Paramètres secrets** : `builder.AddParameter("conn", secret: true)` + Azure Key Vault en prod.
- **Tests d'intégration** : utiliser `Aspire.Hosting.Testing` pour démarrer l'AppHost dans xUnit.
  ```csharp
  // Test d'intégration avec DistributedApplicationTestingBuilder
  await using var app = await DistributedApplicationTestingBuilder
      .CreateAsync<Projects.MySolution_AppHost>();
  await app.StartAsync();
  var httpClient = app.CreateHttpClient("api");
  var response = await httpClient.GetAsync("/health");
  Assert.Equal(HttpStatusCode.OK, response.StatusCode);
  ```
- **Ne pas référencer AppHost depuis les services** — dépendance circulaire.
- **Nommer toutes les ressources** avec des slugs stables : le nom sert de clé dans les env vars injectées et dans les manifests de déploiement.


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
