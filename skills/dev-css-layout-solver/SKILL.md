---
name: dev-css-layout-solver
description: Résout les problèmes de layout CSS avec Flexbox, Grid et techniques modernes. Se déclenche avec "CSS", "layout", "Flexbox", "Grid", "centrer", "aligner", "responsive", "mon layout est cassé", "overflow", "z-index". Also triggers on "CSS layout issue", "flexbox centering", "grid layout", "why is my div misaligned".
---

# CSS Layout Solver

## Étape 1 — Diagnostiquer avant de coder

Avant toute solution, collecter :
- **Ce que l'utilisateur voit** : screenshot ou description du bug (débordement, mauvais alignement, collapse, etc.)
- **Ce qu'il attend** : maquette ou description du résultat cible
- **Contexte DOM** : nesting, nombre d'enfants, largeur/hauteur connue ou dynamique

Questions de triage rapide :
1. Le problème est-il unidimensionnel (ligne OU colonne) → Flexbox
2. Le problème est-il bidimensionnel (lignes ET colonnes) → Grid
3. Le composant doit-il réagir à sa propre taille (pas au viewport) → Container Queries
4. Y a-t-il un overflow ou un z-index suspect → Diagnostic stacking context

---

## Étape 2 — Critères de choix de technique

| Besoin | Technique | Éviter |
|---|---|---|
| Centrer un élément (1D) | `display:flex; align-items:center; justify-content:center` | `margin:auto` seul sans contexte flex/grid |
| Grille fixe (colonnes répétées) | `grid-template-columns: repeat(3, 1fr)` | `float` + clearfix |
| Colonnes de taille variable | `grid-template-columns: auto 1fr auto` | `display:table-cell` |
| Layout responsive sans media query | `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` | media queries manuelles |
| Taille fluide entre deux bornes | `clamp(1rem, 2.5vw, 2rem)` | valeurs px fixes |
| Composant réutilisable responsive | `@container` | media query sur viewport |
| Sticky header/footer | `position:sticky; top:0` | `position:fixed` (sort du flux) |

---

## Étape 3 — Snippets copiables par cas fréquent

### Centrage universel (Flex)
```css
.wrapper {
  display: flex;
  align-items: center;     /* axe transversal */
  justify-content: center; /* axe principal */
  min-height: 100dvh;      /* dvh : tient compte des barres mobiles */
}
```

### Grille responsive sans media query
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 1.5rem;
}
/* min(100%, 280px) évite l'overflow sur petits écrans */
```

### Holy Grail layout (header / sidebar / main / footer)
```css
.page {
  display: grid;
  grid-template:
    "header header"  auto
    "nav    main  "  1fr
    "footer footer"  auto
    / 220px 1fr;
  min-height: 100dvh;
}
header  { grid-area: header; }
nav     { grid-area: nav;    }
main    { grid-area: main;   }
footer  { grid-area: footer; }
```

### Sidebar fixe + contenu fluide (Flex)
```css
.layout {
  display: flex;
  gap: 1rem;
}
.sidebar { flex: 0 0 260px; }   /* ne grandit pas, ne rétrécit pas */
.content { flex: 1 1 0;    }    /* prend tout l'espace restant */
```

### Fluid typography
```css
:root {
  --text-base: clamp(1rem, 0.5rem + 1.5vw, 1.25rem);
  --text-xl:   clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
}
```

### Dark mode via custom properties
```css
:root {
  --bg: #ffffff;
  --fg: #111111;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111111;
    --fg: #f0f0f0;
  }
}
body { background: var(--bg); color: var(--fg); }
```

### Container Query (composant card auto-adaptatif)
```css
.card-wrapper {
  container-type: inline-size;
}
@container (min-width: 400px) {
  .card { flex-direction: row; }
}
```

---

## Étape 4 — Déboguer les problèmes classiques

### Overflow mystérieux
1. Ajouter temporairement `* { outline: 1px solid red; }` pour visualiser les boîtes.
2. Chercher un enfant avec `width: 100vw`, `min-width` non contraint, ou texte sans `overflow-wrap: break-word`.
3. Sur mobile : `html, body { overflow-x: hidden; }` masque le symptôme mais ne corrige pas la cause — trouver l'élément coupable.

### z-index qui ne fonctionne pas
- Un `z-index` n'a d'effet que si `position` ≠ `static`.
- Tout élément avec `transform`, `opacity < 1`, `filter`, `will-change` ou `isolation:isolate` **crée un stacking context** : les z-index enfants sont confinés à ce contexte.
- Diagnostic : inspecter l'arbre dans DevTools → onglet "Layers".

### Margin collapse
- Se produit uniquement entre blocs dans le flux normal (pas en flex/grid).
- Solution : passer le parent en `display:flex` ou ajouter `padding: 1px` / `overflow:hidden` sur le parent.

### Flex enfant qui rétrécit indésirable
```css
.enfant {
  flex-shrink: 0; /* interdit le rétrécissement */
  /* ou : flex: 0 0 auto; */
}
```

### height:100% sans effet
```css
/* Le parent doit avoir une hauteur explicite ou être en grid/flex avec align-stretch */
.parent { height: 400px; /* ou min-height */ }
.enfant { height: 100%; }
```

---

## Étape 5 — Responsive : media queries bien ciblées

```css
/* Mobile-first : base = petit écran */
.grid { grid-template-columns: 1fr; }

@media (min-width: 640px)  { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(3, 1fr); } }
```

Préférer les **breakpoints basés sur le contenu** (quand le layout casse) aux breakpoints device (320, 768, 1024 sont des conventions, pas des règles).

---

## Étape 6 — Performance rendering

| Propriété à animer | Coût | Recommandation |
|---|---|---|
| `transform`, `opacity` | Composite (GPU) | Toujours préférer |
| `background-color`, `color`, `border` | Paint | Acceptable ponctuellement |
| `width`, `height`, `margin`, `top` | Layout (reflow) | Éviter en animation |

```css
/* Animation performante */
.card:hover {
  transform: translateY(-4px);
  transition: transform 200ms ease-out;
}
/* will-change : seulement si l'animation est fréquente et mesurée */
.animated { will-change: transform; }
```

---

## Anti-patterns et pièges (2026)

- **`!important` en cascade** : symptôme d'un problème de spécificité. Utiliser `@layer` pour contrôler la priorité proprement.
- **`position:fixed` pour un sticky** : sort du flux, pose des problèmes dans les conteneurs `transform`. Utiliser `position:sticky`.
- **`vh` sur mobile** : les barres de navigation du navigateur font varier `100vh`. Utiliser `100dvh` (dynamic viewport height, supporté depuis 2023).
- **`float` pour le layout** : obsolète. Réservé aux textes qui enveloppent une image (`float:left` sur l'image).
- **Trop de media queries manuelles** : `auto-fit` + `minmax` + `clamp` couvrent 80% des besoins sans breakpoints.
- **Nesting Flexbox sans raison** : un `display:grid` à la racine suffit souvent pour éviter plusieurs couches Flexbox.
- **`@layer` oublié** : en 2026, tout projet sérieux utilise `@layer` (reset, base, components, utilities) pour éviter les guerres de spécificité.

```css
@layer reset, base, components, utilities;
@layer components {
  .btn { padding: 0.5rem 1rem; }
}
@layer utilities {
  .mt-4 { margin-top: 1rem; }
}
```

---

## Checklist de livraison

- [ ] Code testé dans Chrome DevTools (responsive mode)
- [ ] Compatibilité vérifiée sur Can I Use si propriété récente
- [ ] Aucune valeur magique px sans commentaire justificatif
- [ ] Variables CSS pour les valeurs répétées (couleurs, espacements)
- [ ] Fallback indiqué si la propriété n'est pas universelle (ex. `dvh` → fallback `vh`)


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
