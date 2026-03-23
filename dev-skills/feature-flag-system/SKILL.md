---
name: feature-flag-system
description: Concevoir et implémenter un système de feature flags pour des déploiements progressifs, A/B testing, canary releases et kill switches. À utiliser quand l'utilisateur veut déployer progressivement, tester en production ou gérer le cycle de vie de fonctionnalités. Se déclenche aussi avec "feature flag", "feature toggle", "déploiement progressif", "A/B test", "canary deployment", "kill switch".
---

# Système de Feature Flags

## Workflow

1. **Comprendre le besoin** : identifier le type de flag nécessaire (rollout, A/B, kill switch, beta).
2. **Concevoir la configuration** :
   - Définir les règles de ciblage (utilisateur, pourcentage, attribut, date)
   - Définir les variantes si nécessaire (A/B testing)
3. **Implémenter** : proposer le code adapté au framework utilisé.
4. **Vérifier** : s'assurer que les deux chemins (activé/désactivé) sont testés.

## Types de feature flags

| Type | Usage | Durée de vie |
|------|-------|--------------|
| **Release flag** | Déploiement progressif | Court terme |
| **Experiment flag** | A/B testing | Moyen terme |
| **Ops flag** | Mode maintenance, kill switch | Permanent |
| **Permission flag** | Fonctionnalités par rôle/plan | Permanent |

## Structure de base

```typescript
interface FlagConfig {
  key: string;
  enabled: boolean;
  description: string;
  rules?: FlagRule[];
  variants?: FlagVariant[];
}

interface FlagRule {
  type: "user" | "percentage" | "attribute" | "datetime";
  operator: "in" | "equals" | "contains" | "gt" | "lt" | "between";
  attribute?: string;
  values: any[];
}

interface FlagVariant {
  key: string;
  weight: number;  // Pourcentage de trafic
  value: any;
}
```

## Stratégies de rollout

### Déploiement progressif
1. **1%** — Équipe interne uniquement
2. **5%** — Beta testeurs
3. **25%** — Premier quart d'utilisateurs
4. **50%** → **100%** — Montée progressive avec monitoring

### A/B Testing
- Utiliser un hash stable (userId + flagKey) pour des résultats cohérents
- Toujours tracker les évaluations pour l'analyse
- Définir les métriques de succès avant le lancement

## Bonnes pratiques

### À faire
- Nommer les flags de manière descriptive
- Documenter le but et le cycle de vie de chaque flag
- Tracker les évaluations pour l'analytique
- Nettoyer régulièrement les anciens flags
- Tester les deux états (activé/désactivé)
- Utiliser un hashing cohérent pour la stabilité

### À éviter
- Utiliser des flags pour de la configuration permanente
- Accumuler de la dette technique avec des flags obsolètes
- Rendre les flags trop granulaires
- Hard-coder les vérifications de flags partout
- Ignorer le monitoring

## Règles
- Toujours proposer une stratégie de nettoyage des flags.
- Chaque flag doit avoir une date d'expiration prévue (sauf ops flags).
- Ne jamais déployer un flag sans monitoring associé.
