---
name: responsive-design-helper
description: Conception responsive et mobile-first pour tout type de site ou app web. Se déclenche avec "responsive", "mobile first", "media queries", "breakpoints", "adaptatif", "mobile", "tablette", "s'affiche mal sur mobile". Also triggers on "responsive design", "mobile-first layout".
---

# Responsive Design Helper

## Workflow en étapes

### 1. Diagnostic du problème
Avant de coder, identifier la cause :
- Overflow horizontal → contenu avec largeur fixe trop large, ou `overflow: hidden` manquant sur `body`
- Texte trop petit → `viewport meta` absent ou `font-size` en px fixe
- Layout cassé → Flexbox/Grid avec valeurs non fluides
- Images débordantes → absence de `max-width: 100%`

Vérifier en priorité :
```html
<!-- Obligatoire dans <head> — sans ça, mobile-first ne fonctionne pas -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

---

### 2. Choix de l'approche de layout

| Cas d'usage | Approche recommandée |
|---|---|
| Grille multi-colonnes | CSS Grid + `fr` |
| Alignement 1D (nav, card row) | Flexbox |
| Mise en page page entière | CSS Grid outer + Flexbox inner |
| Spacing/padding adaptatif | `clamp()` sans media query |
| Composant avec breakpoint précis | Container Queries (2024+) |

---

### 3. Mobile-first : structure de base

Toujours écrire le style mobile **sans** media query, puis enrichir avec `min-width` :

```css
/* Mobile — base, aucun media query */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
}

/* Tablette portrait ≥ 640px */
@media (min-width: 40rem) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

/* Desktop ≥ 1024px */
@media (min-width: 64rem) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
    padding: 2rem;
  }
}
```

Breakpoints de référence (contenu-first, pas device-first) :
- `40rem` (640px) — smartphones paysage, petites tablettes
- `48rem` (768px) — tablette portrait
- `64rem` (1024px) — tablette paysage / petit desktop
- `80rem` (1280px) — desktop standard
- `96rem` (1536px) — large desktop

---

### 4. Typographie fluide avec `clamp()`

```css
:root {
  --text-sm:   clamp(0.875rem, 1.5vw, 1rem);
  --text-base: clamp(1rem,     2vw,   1.125rem);
  --text-lg:   clamp(1.125rem, 2.5vw, 1.5rem);
  --text-xl:   clamp(1.5rem,   4vw,   2.5rem);
  --text-hero: clamp(2rem,     6vw,   4rem);
}

body {
  font-size: var(--text-base);
  line-height: 1.6;
}
```

Règle absolue : minimum `1rem` (16px) pour le corps de texte sur mobile — en dessous, iOS zoome automatiquement sur les inputs.

---

### 5. Images responsives

```html
<!-- Image simple avec densité -->
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="Description"
  loading="lazy"
  decoding="async"
>

<!-- Art direction (cadrage différent selon taille) -->
<picture>
  <source media="(max-width: 639px)" srcset="hero-portrait.webp">
  <source media="(min-width: 640px)" srcset="hero-landscape.webp">
  <img src="hero-landscape.jpg" alt="Hero" loading="eager">
</picture>
```

```css
/* Obligatoire pour toutes les images */
img, video, svg {
  max-width: 100%;
  height: auto;
}
```

---

### 6. Navigation adaptative

```css
/* Mobile : bottom nav ou hamburger */
.nav-desktop { display: none; }
.nav-mobile  { display: flex; }

@media (min-width: 64rem) {
  .nav-desktop { display: flex; }
  .nav-mobile  { display: none; }
}
```

Zones tactiles — minimum `44×44px` (Apple HIG) / `48×48dp` (Google Material 3) :
```css
.btn, a, button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1rem;
}
```

---

### 7. Container Queries (2024+ — support universel)

Préférer aux media queries pour les composants réutilisables :

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* Réagit à la taille du parent, pas du viewport */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}
```

---

### 8. Testing

```
# DevTools Chrome — ordre de test
1. Responsive Mode → glisser de 320px à 1440px progressivement
2. CPU throttling 4x + réseau "Slow 3G" → vérifier les Core Web Vitals
3. Onglet Lighthouse → Mobile audit
4. Outil "Accessibility" → vérifier les tailles de cibles tactiles

# Vrais appareils (obligatoire avant livraison)
- iOS Safari (comportements spécifiques : safe-area, 100vh, scroll)
- Android Chrome
- Samsung Internet si cible grand public
```

Pour l'encoche et la Dynamic Island :
```css
.header {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.footer {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Anti-patterns / pièges courants

| Piège | Conséquence | Correction |
|---|---|---|
| `height: 100vh` sur mobile Safari | Layout cassé (barre d'adresse) | Utiliser `height: 100dvh` |
| `overflow-x: hidden` sur `body` | Bloque `position: sticky` | Appliquer sur un wrapper intermédiaire |
| Breakpoints en `px` dans le CSS | Ignore le zoom navigateur | Utiliser `rem` pour les breakpoints |
| `user-scalable=no` dans viewport | Inaccessible (WCAG 1.4.4) | Supprimer cette propriété |
| `hover` comme seul indicateur d'état | Invisible sur tactile | Toujours doubler avec `:focus-visible` |
| Grid avec colonnes en `px` fixes | Overflow sur petits écrans | Utiliser `minmax(0, 1fr)` ou `auto-fill` |
| Images sans `width`/`height` attrs | Layout Shift (mauvais CLS) | Toujours spécifier `width` et `height` |

---

## Garde-fous

- Ne jamais utiliser `!important` pour corriger un problème responsive — signe d'architecture CSS désorganisée.
- Ne pas créer plus de 4-5 breakpoints : si le contenu exige plus, restructurer le composant.
- Tester le zoom navigateur à 200% — obligation WCAG 1.4.4.
- Valider avec l'outil "Responsive" de Firefox DevTools en complément de Chrome (rendu légèrement différent).
- Pour les projets Tailwind : utiliser `sm:`, `md:`, `lg:`, `xl:`, `2xl:` en mobile-first ; ne pas ajouter de breakpoints custom sans justification.
