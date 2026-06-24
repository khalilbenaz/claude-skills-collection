---
name: dev-tailwind-expert
description: Maîtrise de Tailwind CSS — utility-first, configuration custom, plugins, responsive design et dark mode. Se déclenche avec "Tailwind", "Tailwind CSS", "utility-first", "tailwind.config", "classes Tailwind".
---

# Tailwind CSS Expert

## Workflow

### 1. Initialiser le projet

```bash
# Tailwind v4 (2025+) — recommandé pour tous les nouveaux projets
npm install tailwindcss @tailwindcss/vite
# OU avec PostCSS
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Critère de décision v3 vs v4 :**
- v4 : projet neuf, Vite/Remix/Next 15+, CSS-first config (`@theme`), performances build x2
- v3 : projet existant ou contrainte de compatibilité ecosystème (plugins tiers non migrés)

### 2. Configurer `tailwind.config.ts`

```ts
// tailwind.config.ts (v3)
import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{ts,tsx,html}',
    './node_modules/@acme/ui/dist/**/*.js', // libs externes si nécessaire
  ],
  darkMode: 'class', // ou 'media'
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
        destructive: 'hsl(var(--color-destructive) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter Variable', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '480px', // breakpoint custom avant sm
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config
```

**En v4 (CSS-first) :** la config se fait dans le CSS directement :
```css
/* app.css */
@import "tailwindcss";
@theme {
  --color-brand-500: oklch(62% 0.19 240);
  --font-sans: "Inter Variable", system-ui, sans-serif;
}
```

### 3. Construire les design tokens

Principe : définir une fois, utiliser partout via des variables CSS ou tokens Tailwind.

```ts
// Couleurs sémantiques → mappe les tokens sur des rôles
colors: {
  primary: 'hsl(var(--primary) / <alpha-value>)',
  'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
}
```

```css
/* globals.css */
:root {
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
}
.dark {
  --primary: 217 91% 70%;
}
```

### 4. Implémenter les composants

**Mobile-first systématique :**
```html
<!-- Mauvais : pas de base mobile -->
<div class="lg:flex lg:gap-8">...</div>

<!-- Bon : mobile d'abord, puis breakpoints -->
<div class="flex flex-col gap-4 md:flex-row md:gap-8">...</div>
```

**Composition conditionnelle avec `cn` (clsx + tailwind-merge) :**
```ts
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utilisation
<button className={cn(
  'px-4 py-2 rounded-md font-medium transition-colors',
  variant === 'primary' && 'bg-brand-500 text-white hover:bg-brand-600',
  variant === 'ghost'   && 'bg-transparent text-brand-500 hover:bg-brand-50',
  disabled && 'opacity-50 cursor-not-allowed',
)}>
```

**Groupes et peer :**
```html
<!-- group-hover : effet parent → enfant -->
<div class="group rounded-lg border p-4 hover:border-brand-500">
  <p class="text-gray-500 group-hover:text-brand-500">Texte</p>
</div>

<!-- peer : état sibling input → label -->
<input id="email" class="peer" required />
<p class="hidden peer-invalid:block text-red-500 text-sm">Email invalide</p>
```

### 5. Dark mode

```ts
// tailwind.config.ts
darkMode: 'class' // toggle via JS — meilleure UX
```

```ts
// Hook de toggle (React)
function useDarkMode() {
  const toggle = () => document.documentElement.classList.toggle('dark')
  return toggle
}
```

```html
<!-- Classes dark: sur chaque token de couleur -->
<div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
```

### 6. Plugins custom

```ts
// Plugin utilitaires — ex: text-balance manquant en v3
const plugin = require('tailwindcss/plugin')

module.exports = {
  plugins: [
    plugin(({ addUtilities, matchUtilities, theme }) => {
      // Utilitaire statique
      addUtilities({
        '.text-balance': { 'text-wrap': 'balance' },
        '.scrollbar-none': { 'scrollbar-width': 'none' },
      })
      // Utilitaire dynamique avec valeur config
      matchUtilities(
        { 'grid-cols-auto': (value) => ({ gridTemplateColumns: `repeat(auto-fill, minmax(${value}, 1fr))` }) },
        { values: theme('spacing') }
      )
    }),
  ],
}
// Usage : <div class="grid-cols-auto-64">
```

### 7. Optimiser pour la production

```bash
# Vérifier la taille du CSS généré
npx tailwindcss -i ./src/app.css -o ./dist/out.css --minify
du -sh dist/out.css  # objectif : < 20 KB en prod typique

# Analyser les classes non purgées (safelist si nécessaire)
```

```ts
// Safelist pour classes générées dynamiquement (ex: couleur depuis DB)
safelist: [
  'bg-red-500', 'bg-green-500', 'bg-blue-500',
  { pattern: /^(bg|text|border)-(brand|destructive)-\d{2,3}$/ },
]
```

**Règle `@apply` :** uniquement pour les composants de base répétés dans des fichiers `.css` — jamais dans des composants JSX.
```css
/* base.css — OK */
.btn-primary {
  @apply px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600;
}
```

### 8. Ordre et maintenabilité

Ordre recommandé (Prettier plugin enforce automatiquement) :
```bash
npm install -D prettier-plugin-tailwindcss
```
```
Layout (display, position) → Flexbox/Grid → Sizing → Spacing → Typography → Colors → Effects → Interactions
```

---

## Anti-patterns et pièges

| Piège | Problème | Solution |
|---|---|---|
| Classes dynamiques par concaténation de string | Purgées en prod | Utiliser des classes complètes ou safelist |
| `@apply` dans chaque composant JSX | Annule le bénéfice utility-first | Garder les styles inline en JSX |
| Override sans `extend` | Supprime les valeurs Tailwind par défaut | Toujours utiliser `theme.extend` |
| Ignorer `tailwind-merge` | Conflits de classes (`p-2 p-4` → imprévisible) | Toujours passer par `cn()` |
| Breakpoints hors mobile-first | CSS incohérent | Base sans préfixe = mobile, puis `sm:` et au-delà |
| Hardcoder des couleurs hex en classes | Pas thémable | Définir dans `tailwind.config` ou `@theme` |

---

## Bonnes pratiques 2026

- **v4 par défaut** pour tout projet neuf : config CSS-first, support P3/oklch, zero config JS.
- **Variants composés** (v3.4+) : `[@media(hover:hover)]:hover:bg-brand-600` pour cibler les vrais hover devices.
- **Arbitrary values** avec modération : `w-[327px]` acceptable ponctuellement, jamais pour les tokens systèmes.
- **Accessibilité** : toujours inclure `focus-visible:ring-2 focus-visible:ring-brand-500` sur les éléments interactifs ; tester le contraste avec `oklch` avant de figer la palette.
- **Container queries** (plugin officiel v3, natif v4) : préférer `@container` au responsive basé sur viewport pour les composants réutilisables.

```html
<!-- Container query v4 -->
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3">...</div>
</div>
```


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
