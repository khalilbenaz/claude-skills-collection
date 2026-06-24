---
name: feature-flags-manager
description: Gestion de feature toggles avec LaunchDarkly, OpenFeature et implémentations custom pour le déploiement progressif et l'A/B testing. À utiliser quand l'utilisateur veut implémenter des feature flags avec un SDK spécifique ou le standard OpenFeature. Se déclenche aussi avec "LaunchDarkly", "OpenFeature", "feature toggle", "déploiement progressif", "feature management .NET", "toggles".
---

# Feature Flags Manager

## Workflow en étapes

1. **Choisir le type de flag** (voir tableau de décision ci-dessous)
2. **Choisir le provider** : Microsoft.FeatureManagement (simple, .NET natif) ou OpenFeature (multi-provider, standard industrie)
3. **Configurer le contexte d'évaluation** : qui est l'utilisateur, quel environnement, quelles dimensions de ciblage
4. **Implémenter le flag** avec fallback sûr et valeur par défaut explicite
5. **Tester les deux branches** (flag ON et OFF) avant merge
6. **Définir la stratégie de rollout** : % progressif, liste blanche, time window
7. **Monitorer** : log chaque évaluation, alerter sur les anomalies de taux d'activation
8. **Nettoyer** : supprimer le flag et le code conditionnel après adoption complète

## Critères de décision : quel type de flag ?

| Besoin | Type | TTL conseillé |
|--------|------|--------------|
| Activer une feature en prod sans redéploiement | Release toggle | < 1 sprint |
| Rollout progressif (canary, blue/green) | Percentage rollout | < 2 semaines |
| A/B test avec métriques | Experiment toggle | Durée de l'exp |
| Config différente par env/région | Config toggle | Long terme |
| Kill switch / circuit breaker | Ops toggle | Permanent |

**Règle clé** : 1 feature = 1 flag. Ne jamais empiler plusieurs features sous un seul flag.

## Choix du provider

| Critère | Microsoft.FeatureManagement | LaunchDarkly (via OpenFeature) | Unleash |
|---------|----------------------------|-------------------------------|---------|
| Coût | Gratuit | Payant ($) | Open source |
| Complexité setup | Minimale | Moyenne | Moyenne |
| Ciblage utilisateur | Basique (Targeting filter) | Avancé (segments, règles) | Avancé |
| Evaluation server-side | Oui | Oui | Oui |
| Multi-langage | .NET uniquement | Multi-SDK | Multi-SDK |
| Dashboard UI | Azure App Config | LaunchDarkly console | Unleash UI |

Pour un projet .NET sans budget : **Microsoft.FeatureManagement + Azure App Configuration**.
Pour un produit multi-équipes avec A/B testing poussé : **LaunchDarkly via OpenFeature**.

---

## Microsoft Feature Management (.NET)

```bash
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

### Enregistrement

```csharp
// Program.cs
builder.Services.AddFeatureManagement()
    .AddFeatureFilter<PercentageFilter>()
    .AddFeatureFilter<TimeWindowFilter>()
    .AddFeatureFilter<TargetingFilter>();

// Optionnel : depuis Azure App Configuration
builder.Configuration.AddAzureAppConfiguration(opts =>
    opts.Connect("<connection-string>")
        .UseFeatureFlags(ff => ff.CacheExpirationInterval = TimeSpan.FromSeconds(30)));
```

### appsettings.json — patterns courants

```json
{
  "FeatureManagement": {
    "SimpleFlag": true,

    "RolloutFlag": {
      "EnabledFor": [{
        "Name": "Percentage",
        "Parameters": { "Value": 10 }
      }]
    },

    "TargetedFlag": {
      "EnabledFor": [{
        "Name": "Targeting",
        "Parameters": {
          "Audience": {
            "Users": ["admin@company.com"],
            "Groups": [
              { "Name": "beta", "RolloutPercentage": 100 },
              { "Name": "all",  "RolloutPercentage": 5 }
            ],
            "DefaultRolloutPercentage": 0
          }
        }
      }]
    },

    "HolidayPromo": {
      "EnabledFor": [{
        "Name": "TimeWindow",
        "Parameters": {
          "Start": "2026-12-20T00:00:00Z",
          "End":   "2026-12-31T23:59:59Z"
        }
      }]
    }
  }
}
```

### Utilisation dans le code

```csharp
// Via attribut (gate au niveau contrôleur/action)
[FeatureGate("NewDashboard")]
[ApiController]
public class DashboardController : ControllerBase { }

// Via injection
public class PaymentService(IFeatureManager fm)
{
    public async Task<PaymentResult> Process(PaymentRequest req)
    {
        if (await fm.IsEnabledAsync("NewPaymentEngine"))
            return await ProcessV2(req);

        return await ProcessV1(req); // fallback explicite, toujours présent
    }
}

// Dans les vues Razor
@inject IFeatureManager FeatureManager
@if (await FeatureManager.IsEnabledAsync("NewCheckout"))
{
    <CheckoutV2 />
}
```

---

## OpenFeature (.NET — standard multi-provider)

```bash
dotnet add package OpenFeature
dotnet add package LaunchDarkly.OpenFeature.ServerProvider
```

```csharp
// Program.cs
var ldConfig = Configuration.Builder("sdk-key-xxx").Build();
await Api.Instance.SetProviderAsync(new Provider(ldConfig));
builder.Services.AddSingleton(Api.Instance.GetClient());
```

### Évaluation typique avec contexte

```csharp
public class FeatureFlagService(FeatureClient client)
{
    public async Task<bool> IsNewEngineEnabledAsync(string userId, string country)
    {
        var ctx = EvaluationContext.Builder()
            .Set("userId", userId)
            .Set("country", country)
            .Build();

        // Toujours fournir une valeur par défaut sûre en 2e argument
        return await client.GetBooleanValueAsync("new-payment-engine", false, ctx);
    }

    public async Task<double> GetFeePercentageAsync()
    {
        // Flag numérique avec fallback
        return await client.GetDoubleValueAsync("fee-percentage", 2.5);
    }
}
```

**Avantage OpenFeature** : changer de provider (LaunchDarkly → Unleash → custom) sans toucher au code métier.

---

## Stratégie de rollout progressif

```
Jour 1  : 0% → internes seulement (liste blanche)
Jour 3  : 1%  → surveiller erreurs / latences
Jour 5  : 10% → confirmer métriques OK
Jour 8  : 30%
Jour 10 : 100% → planifier nettoyage du flag
```

**Critères de go/no-go avant chaque palier** :
- Taux d'erreur < seuil baseline + 0.1%
- Latence p99 stable
- Pas d'alerte on-call dans les 24h précédentes

---

## Cycle de vie & gouvernance

| Phase | Action | Responsable |
|-------|--------|-------------|
| Création | Nommer le flag, documenter la finalité, fixer date d'expiration | Dev |
| Dev | Implémenter les deux branches, écrire les tests | Dev |
| Staging | Activer à 100% en staging, valider | QA |
| Prod rollout | Incrémenter par paliers | Product + Dev |
| Nettoyage | Supprimer le flag ET le code conditionnel de l'ancienne branche | Dev |

```bash
# Exemple : recherche des flags à nettoyer dans le codebase
grep -r "IsEnabledAsync\|FeatureGate\|GetBooleanValue" src/ \
  | grep -v "\.md:" | grep -v "_test" \
  | sort | uniq
```

---

## Monitoring & observabilité

```csharp
// Middleware de logging des évaluations
public class FlagAuditMiddleware(RequestDelegate next, ILogger<FlagAuditMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx, IFeatureManager fm)
    {
        var flags = new[] { "NewDashboard", "NewPaymentEngine" };
        foreach (var flag in flags)
        {
            var enabled = await fm.IsEnabledAsync(flag);
            logger.LogInformation("FeatureFlag:{Flag} Enabled:{Enabled} User:{User}",
                flag, enabled, ctx.User.Identity?.Name);
        }
        await next(ctx);
    }
}
```

Métriques à exposer (Prometheus/OTLP) :
- `feature_flag_evaluation_total{flag, result}` — compteur d'évaluations
- `feature_flag_latency_ms{flag}` — temps d'évaluation (alerte si SDK distant)

---

## Garde-fous & anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| Imbriquer 3+ flags | Logique impossible à tester | Max 2 flags imbriqués ; refactorer sinon |
| Pas de valeur par défaut | Exception ou comportement indéterminé si provider down | Toujours passer le fallback en 2e argument |
| Flag permanent sans owner | Dette technique, "flag zombie" | Ajouter `expires:` et owner dans le nom ou le tag |
| Même flag pour A/B et kill switch | Confusion opérationnelle | Un flag = un seul rôle |
| Évaluer le flag dans une boucle serrée | Latence si évaluation réseau | Évaluer une seule fois en début de requête, passer le résultat en paramètre |
| Supprimer le flag sans supprimer le code mort | Code mort, branches unreachable | PR de nettoyage obligatoire avant fermeture du ticket |

## Conventions de nommage

```
<domaine>-<feature>-<type>
payment-new-engine-release       # release toggle
checkout-promo-experiment        # A/B test
api-rate-limit-ops               # kill switch
dashboard-v2-rollout             # rollout progressif
```

Préfixe par domaine → facilite le filtrage dans les dashboards et les recherches `grep`.
