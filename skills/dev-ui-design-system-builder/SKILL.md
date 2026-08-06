---
name: dev-ui-design-system-builder
description: Création de design systems cohérents avec tokens, composants et guidelines. Se déclenche avec "design system", "composants UI", "tokens", "style guide", "atomic design", "Figma components", "UI library", "thème", "design tokens". Also triggers on "component library".
---

# UI Design System Builder

## Étapes du workflow

### 1. Audit de l'existant

Avant de créer quoi que ce soit, inventorier :

```
- Compter les valeurs de couleur uniques dans le CSS (grep -r "color:" src/ | sort -u)
- Lister les font-size utilisées
- Identifier les composants Button/Card/Modal dupliqués entre équipes
- Mesurer l'écart design (Figma) ↔ implémentation (DOM)
```

**Critère de go/no-go** : si > 5 composants identiques avec des styles différents coexistent → design system prioritaire. Sinon, un simple tokens file suffit peut-être.

---

### 2. Design Tokens — single source of truth

Définir les tokens en JSON (style-dictionary) ou en CSS custom properties.

**Structure recommandée (style-dictionary 4.x) :**

```json
{
  "color": {
    "brand": { "primary": { "value": "#1A73E8" } },
    "neutral": {
      "100": { "value": "#F5F5F5" },
      "900": { "value": "#1A1A1A" }
    },
    "semantic": {
      "success": { "value": "{color.green.500}" },
      "error":   { "value": "{color.red.600}" }
    }
  },
  "spacing": {
    "xs":  { "value": "4px"  },
    "sm":  { "value": "8px"  },
    "md":  { "value": "16px" },
    "lg":  { "value": "24px" },
    "xl":  { "value": "32px" }
  },
  "typography": {
    "scale": {
      "h1": { "value": "2.25rem" },
      "body": { "value": "1rem" }
    },
    "weight": {
      "regular": { "value": 400 },
      "semibold": { "value": 600 }
    }
  },
  "radius": {
    "sm": { "value": "4px" },
    "md": { "value": "8px" },
    "full": { "value": "9999px" }
  }
}
```

Build via style-dictionary pour générer CSS, JS, iOS Swift, Android XML en parallèle :

```bash
npx style-dictionary build --config sd.config.json
```

---

### 3. Palette de couleurs

**Checklist WCAG 2.1 :**
- Texte normal sur fond : ratio ≥ 4.5:1 (AA) ou ≥ 7:1 (AAA)
- Texte large (≥18px bold) : ratio ≥ 3:1
- Composants UI et icônes : ratio ≥ 3:1

```bash
# Vérification rapide
npx @adobe/leonardo-contrast-colors --bg "#FFFFFF" --fg "#1A73E8"
```

**Structure de palette :**
- Primitifs (50–950 pour chaque teinte)
- Alias sémantiques (`--color-text-primary`, `--color-surface-danger`)
- Dark mode via `@media (prefers-color-scheme: dark)` OU data-attribute `[data-theme="dark"]`

---

### 4. Système typographique

**Type scale modulaire (ratio 1.25 — Major Third) :**

| Token       | rem   | px  |
|-------------|-------|-----|
| `text-xs`   | 0.64  | ~10 |
| `text-sm`   | 0.8   | ~13 |
| `text-base` | 1.0   | 16  |
| `text-lg`   | 1.25  | 20  |
| `text-xl`   | 1.563 | 25  |
| `text-2xl`  | 1.953 | 31  |
| `text-3xl`  | 2.441 | 39  |

Règles :
- Line-height : 1.5 pour le corps, 1.2 pour les titres
- Toujours définir les tailles en `rem` (jamais `px` directement dans les tokens)
- Limiter à 2 familles max (display + body)

---

### 5. Composants atomiques

Pour chaque composant, livrer : **props API + variants + états + accessibilité**.

**Exemple : Button**

```tsx
// Variants: primary | secondary | ghost | destructive
// Sizes: sm | md | lg
// States: default | hover | active | disabled | loading

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Composants atomiques prioritaires :**
`Button`, `Input`, `Checkbox`, `Radio`, `Badge`, `Avatar`, `Icon`, `Divider`, `Spinner`, `Tag`

---

### 6. Composants moléculaires

Assembler les atomiques. Critère : un composant moléculaire contient ≥ 2 atomiques et a sa propre logique d'état.

**Priorité par fréquence d'usage :**
1. Card (header + body + footer)
2. Modal / Dialog (focus trap + aria-modal)
3. Toast / Snackbar (auto-dismiss, variants success/error)
4. Dropdown / Select (virtualisé si > 100 options)
5. DataTable (sort, filter, pagination)
6. Form (validation, error states, accessible labels)

---

### 7. Documentation — Storybook

```bash
npx storybook@latest init
# stories colocalisées : Button.stories.tsx à côté de Button.tsx
```

**Structure d'une story minimale :**

```tsx
export default {
  title: 'Atoms/Button',
  component: Button,
  argTypes: { variant: { control: 'select' } },
};

export const AllVariants = () => (
  <div style={{ display: 'flex', gap: '8px' }}>
    {['primary','secondary','ghost','destructive'].map(v => (
      <Button key={v} variant={v as any}>{v}</Button>
    ))}
  </div>
);
```

Activer `@storybook/addon-a11y` pour les audits d'accessibilité inline.

---

### 8. Intégration Tailwind / CSS Variables

**Option A — Tailwind config depuis tokens :**

```js
// tailwind.config.js
module.exports = {
  theme: {
    colors: require('./tokens/colors.json'),
    spacing: require('./tokens/spacing.json'),
    borderRadius: require('./tokens/radius.json'),
  },
};
```

**Option B — CSS custom properties (framework-agnostic) :**

```css
:root {
  --color-primary:   #1A73E8;
  --spacing-md:      16px;
  --radius-md:       8px;
  --font-size-base:  1rem;
}
```

---

### 9. Versioning et gouvernance

```bash
# Semantic versioning : MAJOR.MINOR.PATCH
# MAJOR = breaking change (renommage token, suppression composant)
# MINOR = nouveau composant ou token
# PATCH = bug visuel, ajustement d'état

npm version minor -m "feat(button): add loading state"
```

- Maintenir un `CHANGELOG.md` par composant
- Migration guides pour chaque MAJOR
- Figma library versionnée avec auto-sync via Tokens Studio plugin

---

## Garde-fous — Anti-patterns

| Anti-pattern | Conséquence | Correctif |
|---|---|---|
| Valeurs en dur (`color: #1A73E8` dans un composant) | Impossible de theming | Toujours passer par un token |
| Trop de variants dès le début | Complexity overhead | Commencer avec 3 variants max, ajouter sur usage réel |
| Composants trop couplés (Card qui contient une Table) | Impossible à réutiliser | Composer via props/slots |
| Aucun test d'accessibilité | Non-conformité WCAG | Ajouter axe-core dans les tests CI |
| Design tokens sans owner | Dérive silencieuse | Désigner un DX/Design Lead responsable |
| Dark mode ajouté après coup | Refactoring massif | Planifier les alias sémantiques dès le départ |
| Storybook non maintenu | Décalage doc ↔ réalité | PR bloquante si story manquante |

---

## Références 2025-2026

- **Radix UI** + **shadcn/ui** : composants headless + copier-coller, approche recommandée pour React
- **Style Dictionary 4.x** : génération multi-plateforme depuis un JSON de tokens
- **Tokens Studio** (Figma plugin) : sync bidirectionnel Figma ↔ repo Git
- **Storybook 8.x** : test visuel, a11y, interaction testing intégrés
- **WCAG 2.2** (2023) : nouveaux critères focus appearance, target size minimum 24×24px


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
