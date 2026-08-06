---
name: feature-flag-system
description: Concevoir et implémenter un système de feature flags pour des déploiements progressifs, A/B testing, canary releases et kill switches — conception, SDK (OpenFeature, LaunchDarkly, Unleash, Microsoft.FeatureManagement .NET), rollout, monitoring et nettoyage. À utiliser quand l'utilisateur veut déployer progressivement, tester en production, choisir un provider de flags ou gérer le cycle de vie de fonctionnalités. Se déclenche aussi avec "feature flag", "feature toggle", "toggles", "déploiement progressif", "A/B test", "canary deployment", "kill switch", "LaunchDarkly", "OpenFeature", "Unleash", "feature management .NET", "progressive rollout", "percentage rollout". Also triggers on "A/B rollout".
---

# Système de Feature Flags

## Workflow en 6 étapes

### 1. Qualifier le besoin

Poser les 3 questions avant d'écrire une ligne de code :

| Question | Réponse attendue |
|---|---|
| Pourquoi ce flag ? | Risque déploiement / expérimentation / accès conditionnel |
| Durée de vie prévue ? | < 2 semaines (release), 1-3 mois (expériment), permanent (ops/permission) |
| Qui décide du kill switch ? | Ops, PM, automatique sur metric |

### 2. Choisir le type

| Type | Exemple concret | Durée de vie |
|---|---|---|
| **Release flag** | Nouvelle page checkout | < 2 semaines |
| **Experiment flag** | CTA rouge vs bleu | 1-3 mois |
| **Ops flag** | Mode maintenance, circuit breaker | Permanent |
| **Permission flag** | Feature plan Pro uniquement | Permanent |

### 3. Concevoir le flag (YAML de référence)

```yaml
# flags/checkout-v2.yaml
key: checkout_v2
description: "Nouvelle page checkout avec paiement 1-clic"
owner: team-payments
expires: 2026-08-01          # obligatoire sauf ops/permission
default: false
rules:
  - type: user_ids            # whitelist interne d'abord
    values: [user_123, user_456]
  - type: percentage
    value: 10                 # 10 % des utilisateurs
    sticky: true              # hash stable userId+flagKey
variants:                     # optionnel, A/B uniquement
  - key: control
    weight: 50
  - key: treatment
    weight: 50
```

### 4. Implémenter l'évaluation

**TypeScript (SDK maison ou OpenFeature)**

```typescript
import { OpenFeature } from "@openfeature/server-sdk";

const client = OpenFeature.getClient();

// Évaluation simple (release flag)
const isEnabled = await client.getBooleanValue(
  "checkout_v2",
  false,                          // valeur par défaut si flag absent
  { targetingKey: user.id, plan: user.plan }
);

if (isEnabled) {
  return newCheckout(cart);
} else {
  return legacyCheckout(cart);
}

// Évaluation avec variante (A/B)
const variant = await client.getStringValue(
  "checkout_v2_variant",
  "control",
  { targetingKey: user.id }
);
trackExposure("checkout_v2", variant, user.id);
```

**Hash déterministe pour sticky bucketing (sans dépendance externe)**

```typescript
function bucket(userId: string, flagKey: string): number {
  // FNV-1a 32 bits — rapide, pas de crypto
  let hash = 2166136261;
  for (const char of `${flagKey}:${userId}`) {
    hash ^= char.charCodeAt(0);
    hash = (hash * 16777619) >>> 0;
  }
  return (hash % 100); // 0-99 → pourcentage
}

const enabled = bucket(user.id, "checkout_v2") < rolloutPercent;
```

**Kill switch React (état global)**

```tsx
// hooks/useFlag.ts
export function useFlag(key: string): boolean {
  return useContext(FlagContext)[key] ?? false;
}

// usage dans un composant
const showNewDashboard = useFlag("new_dashboard");
if (!showNewDashboard) return <LegacyDashboard />;
```

### 5. Déploiement progressif

```
Jour 0 :  0 % → team interne (user_ids whitelist)
Jour 1 :  1 % → canary  — surveiller error rate 30 min
Jour 2 :  10 % — surveiller p99 latence + conversions
Jour 4 :  25 %
Jour 7 :  50 %
Jour 10 : 100 % → planifier suppression du flag sous 2 semaines
```

Alertes minimales à brancher avant chaque palier :
- Error rate > baseline + 0.5 % → rollback automatique
- p99 > seuil SLA → pause

### 6. Nettoyage et cycle de vie

```bash
# Lister les flags expirés (exemple avec Unleash CLI)
unleash flags list --expired-before 2026-06-01

# Supprimer un flag archivé
unleash flags archive --key checkout_v2
```

Checklist de suppression d'un flag :
- [ ] Flag à 100 % depuis > 2 semaines
- [ ] Aucune référence au fallback dans les logs
- [ ] Code des deux branches revu, branche inactive supprimée
- [ ] Flag archivé dans le gestionnaire (pas supprimé — garder l'historique)

---

## Implémentation .NET

**Microsoft.FeatureManagement** — le plus court chemin sur .NET, gratuit, piloté par la configuration.

```bash
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

```csharp
// Program.cs
builder.Services.AddFeatureManagement()
    .AddFeatureFilter<PercentageFilter>()
    .AddFeatureFilter<TimeWindowFilter>()
    .AddFeatureFilter<TargetingFilter>();

// Optionnel : définitions pilotées par Azure App Configuration
builder.Configuration.AddAzureAppConfiguration(opts =>
    opts.Connect("<connection-string>")
        .UseFeatureFlags(ff => ff.CacheExpirationInterval = TimeSpan.FromSeconds(30)));
```

```json
// appsettings.json — les 3 patterns qui couvrent 90 % des cas
{
  "FeatureManagement": {
    "SimpleFlag": true,

    "RolloutFlag": {
      "EnabledFor": [{ "Name": "Percentage", "Parameters": { "Value": 10 } }]
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
        "Parameters": { "Start": "2026-12-20T00:00:00Z", "End": "2026-12-31T23:59:59Z" }
      }]
    }
  }
}
```

```csharp
// Gate au niveau contrôleur
[FeatureGate("NewDashboard")]
[ApiController]
public class DashboardController : ControllerBase { }

// Évaluation avec fallback explicite
public class PaymentService(IFeatureManager fm)
{
    public async Task<PaymentResult> Process(PaymentRequest req)
        => await fm.IsEnabledAsync("NewPaymentEngine")
            ? await ProcessV2(req)
            : await ProcessV1(req);   // la branche de repli reste toujours présente
}
```

**OpenFeature .NET** — même code métier quel que soit le provider derrière (LaunchDarkly, Unleash, custom).

```bash
dotnet add package OpenFeature
dotnet add package LaunchDarkly.OpenFeature.ServerProvider
```

```csharp
// Program.cs
var ldConfig = Configuration.Builder("sdk-key-xxx").Build();
await Api.Instance.SetProviderAsync(new Provider(ldConfig));
builder.Services.AddSingleton(Api.Instance.GetClient());

// Évaluation contextuelle
public class FeatureFlagService(FeatureClient client)
{
    public Task<bool> IsNewEngineEnabledAsync(string userId, string country)
    {
        var ctx = EvaluationContext.Builder()
            .Set("userId", userId)
            .Set("country", country)
            .Build();

        // 2e argument = valeur par défaut sûre si le provider est indisponible
        return client.GetBooleanValueAsync("new-payment-engine", false, ctx);
    }

    public Task<double> GetFeePercentageAsync()
        => client.GetDoubleValueAsync("fee-percentage", 2.5);
}
```

---

## Choisir un provider

| Critère | Microsoft.FeatureManagement | Unleash / Flagsmith (self-hosted) | LaunchDarkly / GrowthBook (SaaS) |
|---|---|---|---|
| Coût | Gratuit | Open source + coût ops | Payant (GrowthBook a une offre OSS) |
| Setup | Minimal (config .NET) | Moyen | Moyen |
| Ciblage | Basique (Targeting filter) | Avancé | Avancé (segments, règles) |
| Multi-langage | .NET uniquement | Multi-SDK | Multi-SDK |
| Data sovereignty | Selon hébergement | ✅ | ❌ |
| Streaming temps réel | Polling | Polling | ✅ SSE/WebSocket |
| A/B stats intégrées | ❌ | ❌ | ✅ |
| Équipe < 5 devs | ✅ | ❌ (overhead ops) | ✅ |

**Raccourci :** projet .NET sans budget → Microsoft.FeatureManagement (+ Azure App Configuration). Produit multi-équipes avec A/B poussé → LaunchDarkly via OpenFeature. Souveraineté des données → Unleash self-hosted.

---

## Monitoring & gouvernance

| Phase | Action | Responsable |
|-------|--------|-------------|
| Création | nommer, documenter la finalité, fixer `expires` | Dev |
| Dev | implémenter les deux branches + tests des deux états | Dev |
| Staging | activer à 100 %, valider | QA |
| Rollout prod | incrémenter par paliers | Product + Dev |
| Nettoyage | supprimer le flag **et** le code de la branche morte | Dev |

Métriques à exposer (Prometheus/OTLP) :
- `feature_flag_evaluation_total{flag, result}` — volume d'évaluations, détecte les flags zombies (0 évaluation) ;
- `feature_flag_latency_ms{flag}` — alerter si l'évaluation part sur le réseau.

```bash
# Recenser les flags encore référencés dans le code (candidats au nettoyage)
grep -rE "IsEnabledAsync|FeatureGate|getBooleanValue|GetBooleanValueAsync" src/ \
  | grep -v "_test" | sort | uniq
```

### Conventions de nommage

```
<domaine>-<feature>-<type>
payment-new-engine-release       # release toggle
checkout-promo-experiment        # A/B test
api-rate-limit-ops               # kill switch
dashboard-v2-rollout             # rollout progressif
```

Préfixe par domaine → filtrage immédiat dans les dashboards et les `grep`.

---

## Pièges et anti-patterns

**Flag spaghetti** — plus de 3 niveaux de conditions imbriqués = refactoriser en permission flag ou configuration.

```typescript
// ❌ anti-pattern
if (flagA && flagB && !flagC && user.plan === "pro") { ... }

// ✅ encapsuler
const canAccessFeature = await featurePolicy.canAccess("new_report", user);
```

**Boolean prolifération** — ne pas créer un flag par micro-variation. Préférer une variante multi-valeur.

```typescript
// ❌ 3 flags booléens
flag_sidebar_color_blue / flag_sidebar_color_red / flag_sidebar_color_green

// ✅ 1 flag string
getStringValue("sidebar_color", "blue") // → "blue" | "red" | "green"
```

**Flag sans owner** — chaque flag doit avoir un owner dans les métadonnées, sinon il devient orphelin.

**Évaluation côté client non cachée** — appeler le SDK à chaque render React sans cache = latence et surcoût réseau. Hydrater les flags au bootstrap de la session, pas à chaque composant.

**Un flag à double rôle** — le même flag utilisé comme A/B test *et* comme kill switch rend la décision opérationnelle ambiguë. Un flag = un seul rôle.

**Évaluation dans une boucle serrée** — évaluer une fois en début de requête et passer le résultat en paramètre, jamais à chaque itération (latence si le provider est distant).

**Tests qui ne couvrent pas les deux états** — tout flag doit avoir un test `enabled=true` ET `enabled=false`.

```typescript
// Jest
it.each([true, false])("checkout works when flag=%s", async (enabled) => {
  mockFlag("checkout_v2", enabled);
  const result = await checkout(cart);
  expect(result.status).toBe("ok");
});
```

---

## Bonnes pratiques 2026

- **OpenFeature** comme standard d'abstraction — évite le lock-in SDK propriétaire.
- **Flag as code** — stocker les définitions YAML en git, PR + review avant activation.
- **Targeting contextuel** — préférer les attributs métier (plan, région, cohort) aux user_id bruts : plus maintenable.
- **Observabilité** — chaque évaluation expose un attribut `feature_flag.key` et `feature_flag.variant` dans les traces OpenTelemetry.
- **Date d'expiration obligatoire** sur release et experiment flags — un pipeline CI doit échouer si un flag est évalué après sa date d'expiration.
