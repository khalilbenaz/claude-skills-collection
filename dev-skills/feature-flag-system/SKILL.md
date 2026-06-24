---
name: feature-flag-system
description: Concevoir et implémenter un système de feature flags pour des déploiements progressifs, A/B testing, canary releases et kill switches. À utiliser quand l'utilisateur veut déployer progressivement, tester en production ou gérer le cycle de vie de fonctionnalités. Se déclenche aussi avec "feature flag", "feature toggle", "déploiement progressif", "A/B test", "canary deployment", "kill switch".
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

## Critères de décision : self-hosted vs SaaS

| Critère | Self-hosted (Unleash, Flagsmith) | SaaS (LaunchDarkly, GrowthBook) |
|---|---|---|
| Data sovereignty requise | ✅ | ❌ |
| Budget < 500 $/mois | ✅ | ❌ |
| Streaming temps réel critique | ❌ (polling) | ✅ (SSE/WebSocket) |
| Équipe < 5 devs | ❌ (overhead ops) | ✅ |
| A/B stats intégrées | ❌ | ✅ GrowthBook open source |

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
