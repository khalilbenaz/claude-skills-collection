---
name: cloud-azure-functions-expert
description: Développement Azure Functions incluant triggers, bindings, Durable Functions, deployment et monitoring. Se déclenche avec "Azure Functions", "function Azure", "Durable Functions", "serverless Azure", "trigger Azure. Also triggers on "serverless on Azure", "function triggers and bindings".
---

# Azure Functions Expert

## 1. Choisir le plan d'hébergement

| Plan | Cold start | Timeout max | VNET | Quand l'utiliser |
|---|---|---|---|---|
| Consumption | Oui (~2-5 s .NET) | 10 min | Non (outbound via NAT GW) | Workloads sporadiques, faible coût |
| Flex Consumption (2025) | Partiel | 60 min | Oui | Remplacement progressif du Premium |
| Premium (EP1-EP3) | Non (pre-warm) | Illimité | Oui (inbound + outbound) | Accès ressources privées, latence critique |
| Dedicated (App Service) | Non | Illimité | Oui | Coexistence avec une App Service existante |

**Décision rapide :** accès à un VNet privé → Flex Consumption ou Premium. Latence < 200 ms en P99 → Premium EP2+. Budget strict, trafic < 1 M invocations/mois → Consumption.

## 2. Créer et structurer un projet

```bash
# .NET 8 isolated worker (modèle recommandé 2026)
func init MyFunctionApp --worker-runtime dotnet-isolated --target-framework net8.0
cd MyFunctionApp
func new --name HttpTriggerExample --template "HTTP trigger" --authlevel anonymous

# Node.js v4 programming model
func init MyApp --worker-runtime node --language typescript --model V4
func new --name QueueProcessor --template "Azure Queue Storage trigger"

# Lancer localement
func start
```

Structure recommandée .NET :
```
MyFunctionApp/
├── Program.cs          ← DI + middleware
├── Functions/
│   ├── HttpApi.cs
│   └── QueueProcessor.cs
├── Services/           ← Logique métier injectable
└── local.settings.json ← JAMAIS commité
```

## 3. Configurer les triggers et bindings

Règle : déclarer les bindings en attributs, pas de SDK explicite dans la fonction.

```csharp
// HTTP → Blob output binding (isolated .NET 8)
[Function("ProcessUpload")]
[BlobOutput("output-container/{name}.json", Connection = "AzureWebJobsStorage")]
public string Run(
    [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req,
    string name,
    FunctionContext context)
{
    var log = context.GetLogger<HttpApi>();
    // Pas d'IBlobClient ici — le binding gère l'écriture
    return JsonSerializer.Serialize(new { name, ts = DateTime.UtcNow });
}
```

Triggers courants et leurs pièges :

| Trigger | Piège principal |
|---|---|
| Timer (CRON) | `0 */5 * * * *` = toutes les 5 min ; expression à 6 champs (secondes en tête) |
| Service Bus | `maxConcurrentCalls` par défaut = 16 ; throttler selon la charge aval |
| Cosmos DB change feed | Checkpoint stocké dans un conteneur lease dédié — le créer avant le déploiement |
| Event Grid | Valider le webhook endpoint avec la réponse 200 + `validationResponse` |
| Blob (polling) | Latence jusqu'à 10 min sur Consumption ; préférer Event Grid Blob Created |

## 4. Implémenter avec injection de dépendances

```csharp
// Program.cs — .NET 8 isolated
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(worker =>
    {
        worker.UseMiddleware<ExceptionHandlingMiddleware>();
    })
    .ConfigureServices((ctx, services) =>
    {
        services.AddSingleton<IMyService, MyService>();
        services.AddSecretClient(new Uri(ctx.Configuration["KeyVaultUri"]!));
        services.AddApplicationInsightsTelemetryWorkerService();
    })
    .Build();

host.Run();
```

Ne jamais utiliser `static` pour les clients HTTP — injecter `IHttpClientFactory` :

```csharp
services.AddHttpClient<IExternalApi, ExternalApiClient>(c =>
    c.BaseAddress = new Uri(config["ExternalApiUrl"]!));
```

## 5. Durable Functions — patterns clés

```csharp
// Fan-out / Fan-in
[Function("FanOutOrchestrator")]
public async Task<List<string>> Run(
    [OrchestrationTrigger] TaskOrchestrationContext ctx)
{
    var items = await ctx.CallActivityAsync<string[]>("GetItems", null);
    var tasks = items.Select(i => ctx.CallActivityAsync<string>("ProcessItem", i));
    return (await Task.WhenAll(tasks)).ToList();
}

// Attente événement externe (human-in-the-loop)
var approved = await ctx.WaitForExternalEvent<bool>("ApprovalEvent",
    timeout: TimeSpan.FromDays(3));
if (!approved) ctx.SetCustomStatus("Rejected");
```

Choisir le bon pattern :

| Besoin | Pattern Durable |
|---|---|
| Enchaîner N étapes séquentielles | Function chaining |
| Paralléliser puis agréger | Fan-out/fan-in |
| Poller un état externe | Monitor pattern (retry avec timer) |
| Approbation humaine | External event + timeout |
| Compteurs distribués | Durable Entities |

## 6. Sécuriser

```bash
# Activer la managed identity et donner accès au Key Vault
az functionapp identity assign --name MyFunc --resource-group MyRG
az keyvault set-policy --name MyKV \
  --object-id <principalId> --secret-permissions get list

# Référencer un secret dans App Settings (pas de code pour lire le KV)
az functionapp config appsettings set --name MyFunc --resource-group MyRG \
  --settings "DbPassword=@Microsoft.KeyVault(SecretUri=https://mykv.vault.azure.net/secrets/DbPassword/)"
```

- Auth level `Function` (clé par fonction) pour les webhooks tiers ; `Anonymous` uniquement derrière APIM avec policy d'auth.
- Activer Easy Auth (Entra ID) pour les APIs internes.
- Restreindre les IP entrantes avec `ipSecurityRestrictions` si le plan le permet.

## 7. Déployer

```yaml
# GitHub Actions — déploiement zero-downtime avec slots
- name: Deploy to staging slot
  uses: Azure/functions-action@v1
  with:
    app-name: MyFunctionApp
    slot-name: staging
    publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE_STAGING }}

- name: Swap slots
  run: |
    az functionapp deployment slot swap \
      --name MyFunctionApp --resource-group MyRG \
      --slot staging --target-slot production
```

Flex Consumption : pas de slots en GA (juin 2026) — utiliser des resource groups séparés staging/prod.

```bash
# Déploiement Bicep (IaC recommandé)
az deployment group create \
  --resource-group MyRG \
  --template-file infra/functionapp.bicep \
  --parameters env=prod
```

## 8. Monitorer

```bash
# Activer Application Insights
az functionapp config appsettings set --name MyFunc --resource-group MyRG \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="<connexion_string>"

# KQL — top 5 fonctions les plus lentes (30 dernières minutes)
requests
| where timestamp > ago(30m)
| summarize avg(duration), p99=percentile(duration, 99), count() by name
| order by p99 desc | take 5
```

Métriques à alerter :

| Métrique | Seuil indicatif |
|---|---|
| `FunctionExecutionCount` failures | > 1 % → alerte critique |
| `InstanceCount` (Premium) | Proche du max configuré → scale-out |
| Cold start duration | > 3 s en moyenne → passer Premium |
| `WorkflowActionsCompleted` (Durable) | Stagnation → vérifier les leases |

## Garde-fous et anti-patterns

- **Ne jamais stocker d'état dans des champs statiques** — les instances sont recyclées; utiliser Durable Entities, Redis ou Cosmos DB.
- **Ne pas dépasser 10 min sur Consumption** (5 min avant la v4) — découper avec Durable Functions.
- **Éviter le polling Blob trigger sur Consumption** pour des événements temps réel — latence jusqu'à 10 min; préférer Event Grid.
- **Ne pas hard-coder les connection strings** — toujours passer par Application Settings + Key Vault reference.
- **Ne pas utiliser le in-process model .NET** pour de nouveaux projets — déprécié, fin de support novembre 2026.
- **Attention aux cold starts Cosmos DB change feed** — le conteneur `leases` doit exister avant le premier démarrage, sinon l'exception est silencieuse.
- **Ne pas ignorer `maxDequeueCount`** sur les triggers Queue/Service Bus — sans DLQ configurée, les messages empoisonnés bloquent la file.
- **Éviter les `Task.Delay` dans les orchestrators Durable** — utiliser `ctx.CreateTimer` pour garantir la rejouabilité.

## Bonnes pratiques 2026

- Migrer vers **Flex Consumption** dès que le support VNET est requis — meilleure densité et scaling que Premium à coût équivalent.
- Adopter le **modèle isolated worker** partout en .NET 8/9 — middleware, DI propre, tests unitaires sans dépendance au SDK host.
- Utiliser **Deployment Stacks** (Bicep) pour gérer les ressources Functions + Storage + APIM comme une unité atomique.
- Activer **Managed Identity** systématiquement — supprimer toutes les connection strings avec clé d'accès au profit du rôle RBAC (ex : `Storage Blob Data Contributor`).
- Configurer **Health Check endpoint** sur le Premium Plan pour le swap automatique des slots avec validation.


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
