---
name: dev-feature-flags-manager
description: Gestion de feature toggles avec LaunchDarkly, OpenFeature et implémentations custom pour le déploiement progressif et l'A/B testing. À utiliser quand l'utilisateur veut implémenter des feature flags avec un SDK spécifique ou le standard OpenFeature. Se déclenche aussi avec "LaunchDarkly", "OpenFeature", "feature toggle", "déploiement progressif", "feature management .NET", "toggles".
---

# Feature Flags Manager

## Workflow

1. **Choisir l'approche** : SDK managé (LaunchDarkly, Unleash) ou custom avec OpenFeature.
2. **Configurer** : provider, contexte d'évaluation, fallback values.
3. **Implémenter** : évaluation des flags, segmentation, analytics.
4. **Gérer le cycle de vie** : nettoyage, audit, monitoring.

## OpenFeature (.NET Standard)

### Configuration

```csharp
// Installation : dotnet add package OpenFeature
// + un provider : dotnet add package LaunchDarkly.OpenFeature.ServerProvider

using OpenFeature;
using LaunchDarkly.OpenFeature.ServerProvider;

// Configurer le provider
var ldProvider = new Provider(Configuration.Builder("sdk-key").Build());
await Api.Instance.SetProviderAsync(ldProvider);

// Obtenir le client
var client = Api.Instance.GetClient();
```

### Évaluation des flags

```csharp
public class PaymentService
{
    private readonly IFeatureClient _featureClient;

    public PaymentService(IFeatureClient featureClient)
    {
        _featureClient = featureClient;
    }

    public async Task<PaymentResult> ProcessPayment(PaymentRequest request)
    {
        var context = EvaluationContext.Builder()
            .Set("userId", request.UserId)
            .Set("country", request.Country)
            .Set("plan", request.Plan)
            .Build();

        // Flag booléen
        var useNewEngine = await _featureClient.GetBooleanValueAsync(
            "new-payment-engine", false, context);

        if (useNewEngine)
            return await ProcessWithNewEngine(request);

        return await ProcessWithLegacyEngine(request);
    }

    public async Task<decimal> CalculateFees(decimal amount)
    {
        // Flag numérique (pourcentage de frais)
        var feePercentage = await _featureClient.GetDoubleValueAsync(
            "payment-fee-percentage", 2.5);

        return amount * (decimal)(feePercentage / 100);
    }

    public async Task<CheckoutConfig> GetCheckoutConfig()
    {
        // Flag JSON (configuration complexe)
        var config = await _featureClient.GetObjectValueAsync(
            "checkout-config",
            new Value(new Structure(new Dictionary<string, Value>
            {
                ["maxRetries"] = new Value(3),
                ["showPromo"] = new Value(false)
            })));

        return MapToCheckoutConfig(config);
    }
}
```

## Microsoft Feature Management (.NET)

### Configuration

```csharp
// dotnet add package Microsoft.FeatureManagement.AspNetCore

builder.Services.AddFeatureManagement()
    .AddFeatureFilter<PercentageFilter>()
    .AddFeatureFilter<TimeWindowFilter>()
    .AddFeatureFilter<TargetingFilter>();
```

### appsettings.json

```json
{
  "FeatureManagement": {
    "NewDashboard": true,
    "BetaFeature": {
      "EnabledFor": [
        {
          "Name": "Targeting",
          "Parameters": {
            "Audience": {
              "Users": ["user1@company.com", "user2@company.com"],
              "Groups": [
                { "Name": "beta-testers", "RolloutPercentage": 100 },
                { "Name": "internal", "RolloutPercentage": 50 }
              ],
              "DefaultRolloutPercentage": 5
            }
          }
        }
      ]
    },
    "HolidayPromo": {
      "EnabledFor": [
        {
          "Name": "TimeWindow",
          "Parameters": {
            "Start": "2025-12-20T00:00:00Z",
            "End": "2025-12-31T23:59:59Z"
          }
        }
      ]
    }
  }
}
```

### Utilisation

```csharp
[FeatureGate("NewDashboard")]
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly IFeatureManager _featureManager;

    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        if (await _featureManager.IsEnabledAsync("BetaFeature"))
        {
            return Ok(await GetBetaDashboard());
        }

        return Ok(await GetStandardDashboard());
    }
}

// Dans les vues Razor
@if (await FeatureManager.IsEnabledAsync("NewDashboard"))
{
    <NewDashboardComponent />
}
```

## Cycle de vie des flags

| Phase | Action | Responsable |
|-------|--------|-------------|
| **Création** | Définir le flag, sa description et sa date d'expiration | Dev |
| **Développement** | Implémenter le code derrière le flag | Dev |
| **Rollout** | Activer progressivement (1% → 10% → 50% → 100%) | Product |
| **Stabilisation** | Confirmer que la fonctionnalité est stable | Équipe |
| **Nettoyage** | Supprimer le flag et le code conditionnel | Dev |

## Règles
- Chaque flag doit avoir une **date d'expiration** et un responsable.
- Le code derrière un flag doit fonctionner **sans le flag** (fallback sûr).
- Nettoyer les flags après adoption complète — pas de dette technique.
- Logger chaque évaluation de flag pour l'audit et l'analytics.
- Préférer OpenFeature pour la portabilité entre providers.
