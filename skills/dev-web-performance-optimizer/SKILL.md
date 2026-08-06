---
name: dev-web-performance-optimizer
description: Optimise les performances web (Core Web Vitals, loading, rendering). Se déclenche avec "performance web", "Core Web Vitals", "LCP", "FID", "CLS", "lighthouse score", "page speed", "site lent", "bundle size", "lazy loading". Also triggers on "make my site faster", "LCP and CLS issues".
---

# Web Performance Optimizer

## Étape 1 — Mesurer d'abord

**Règle absolue : jamais d'optimisation sans baseline mesurée.**

```bash
# CLI Lighthouse (headless)
npx lighthouse https://example.com --output=json --output-path=./lh-report.json \
  --form-factor=mobile --throttling-method=simulate

# CrUX field data (données réelles utilisateurs)
npx crux-api --origin https://example.com --key YOUR_API_KEY

# WebPageTest en CLI
npx webpagetest test https://example.com --key YOUR_KEY --location ec2-eu-west-1
```

Collecter **avant** et **après** chaque changement. Utiliser CrUX (données terrain) et non seulement Lighthouse (labo).

---

## Étape 2 — Diagnostiquer par métrique

### Seuils "Good" 2026

| Métrique | Good | Needs Improvement | Poor |
|---|---|---|---|
| LCP | < 2.5 s | 2.5 – 4 s | > 4 s |
| INP | < 200 ms | 200 – 500 ms | > 500 ms |
| CLS | < 0.1 | 0.1 – 0.25 | > 0.25 |
| TTFB | < 800 ms | 800 ms – 1.8 s | > 1.8 s |
| FCP | < 1.8 s | 1.8 – 3 s | > 3 s |

> FID est remplacé par **INP** depuis mars 2024. Ne pas cibler FID dans les nouveaux rapports.

### Arbre de décision rapide

- **LCP élevé** → image LCP non preloadée ? TTFB élevé ? police bloquante ? → voir Étape 3
- **INP élevé** → main thread bloqué ? long tasks (> 50 ms) ? → voir Étape 5
- **CLS élevé** → images/vidéos sans dimensions ? fonts swap ? iframes dynamiques ? → voir Étape 6
- **TTFB élevé** → problème serveur/CDN/DB → résoudre côté infra avant tout le reste

---

## Étape 3 — Optimiser le chargement des ressources critiques

### Images

```html
<!-- LCP image : preload + fetchpriority -->
<link rel="preload" as="image" href="/hero.avif"
      fetchpriority="high" type="image/avif">

<!-- Responsive + lazy hors écran -->
<img src="photo.avif" srcset="photo-400.avif 400w, photo-800.avif 800w"
     sizes="(max-width: 600px) 400px, 800px"
     loading="lazy" decoding="async" width="800" height="600" alt="...">
```

```bash
# Convertir en AVIF/WebP (Sharp CLI)
npx sharp -i input.jpg -o output.avif --format avif --quality 60
npx sharp -i input.jpg -o output.webp --format webp --quality 75
```

**Critères de format** : AVIF = meilleure compression (–50 % vs JPEG), mais encodage lent → générer au build. WebP = fallback universel.

### Fonts

```html
<!-- Preconnect + preload font critique -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="font" href="/fonts/inter.woff2"
      type="font/woff2" crossorigin>
```

```css
/* Éviter FOIT : swap immédiat */
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter.woff2") format("woff2");
  font-display: swap; /* ou 'optional' si CLS est prioritaire */
}
```

**Anti-pattern** : `font-display: block` = invisible jusqu'à 3 s → toujours `swap` ou `optional`.

---

## Étape 4 — Optimiser JavaScript (bundle)

```bash
# Analyser le bundle webpack
npx webpack-bundle-analyzer stats.json

# Analyser bundle Vite/Rollup
npx vite-bundle-visualizer

# Trouver les dépendances lourdes
npx bundlephobia-cli react-pdf
```

```js
// Code splitting par route (React / Vue / Svelte)
const Dashboard = lazy(() => import('./Dashboard'));

// Éviter l'import en masse depuis une lib
// ❌ import _ from 'lodash'           // importe 70 KB
// ✅
import debounce from 'lodash/debounce'; // importe 2 KB
```

```html
<!-- Scripts non critiques : defer ou type="module" -->
<script src="analytics.js" defer></script>
<!-- async uniquement si totalement indépendant du DOM -->
<script src="chat.js" async></script>
```

**Critères** : `defer` = exécuté après parsing HTML ; `async` = exécuté dès téléchargé (peut bloquer). Préférer `defer` dans 90 % des cas.

---

## Étape 5 — Réduire le blocage du main thread (INP)

```js
// Découper les long tasks avec scheduler
async function processItems(items) {
  for (const item of items) {
    await scheduler.yield(); // libère le thread régulièrement
    process(item);
  }
}

// Déléguer aux Web Workers
const worker = new Worker('./heavy-computation.js', { type: 'module' });
worker.postMessage({ data: bigArray });
worker.onmessage = ({ data }) => updateUI(data);
```

```js
// Debouncer les événements fréquents
input.addEventListener('input', debounce(handleSearch, 150));

// Éviter layout thrashing
// ❌
elements.forEach(el => { el.style.width = el.offsetWidth + 'px'; });
// ✅
const widths = elements.map(el => el.offsetWidth);
elements.forEach((el, i) => { el.style.width = widths[i] + 'px'; });
```

---

## Étape 6 — Corriger le CLS

```css
/* Réserver l'espace pour images et vidéos */
img, video { aspect-ratio: 16 / 9; width: 100%; }

/* Skeleton loader au lieu de contenu dynamique injecté */
.skeleton { background: #e0e0e0; min-height: 200px; border-radius: 4px; }
```

**Causes fréquentes de CLS** :
- Images sans `width`/`height` explicites
- Ads ou embeds injectés sans espace réservé
- Fonts qui swappent et changent la hauteur de ligne
- Animations qui modifient `top`/`left` (utiliser `transform` à la place)

---

## Étape 7 — Cache et livraison

```nginx
# Cache immuable pour assets versionnés (hash dans le nom de fichier)
location ~* \.(js|css|woff2|avif|webp)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Pages HTML : revalidation rapide
location / {
  add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

```js
// Service Worker : cache-first pour assets statiques
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'script') {
    event.respondWith(
      caches.match(event.request).then(r => r || fetch(event.request))
    );
  }
});
```

**Checklist infra** :
- [ ] Brotli activé (–15 % vs gzip)
- [ ] HTTP/2 ou HTTP/3 (multiplexage)
- [ ] CDN avec edge caching (Cloudflare, Fastly, CloudFront)
- [ ] TTFB < 200 ms depuis le CDN edge

---

## Étape 8 — CSS critique

```bash
# Extraire le CSS above-the-fold avec Critical
npx critical index.html --base dist/ --inline --width 1300 --height 900

# Purger le CSS inutilisé
npx purgecss --css dist/styles.css --content dist/**/*.html dist/**/*.js \
  --output dist/styles.purged.css
```

```html
<!-- Charger le CSS non-critique sans bloquer le rendu -->
<link rel="preload" href="/styles.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>
```

---

## Anti-patterns et pièges

| Piège | Problème | Solution |
|---|---|---|
| Optimiser sans mesurer | Gains imaginaires, régressions réelles | Baseline CrUX/Lighthouse systématique |
| `loading="lazy"` sur l'image LCP | LCP explose car téléchargement retardé | `fetchpriority="high"` + pas de lazy sur LCP |
| `async` sur scripts qui lisent le DOM | Race condition, erreurs runtime | `defer` par défaut |
| Inliner tout le CSS | Impossible à mettre en cache | Inliner seulement le CSS critique (< 14 KB) |
| Compresser en gzip quand Brotli dispo | –15 % de ratio perdus | Brotli level 6 en production |
| Ignorer les données CrUX terrain | Lighthouse labo ≠ expérience réelle | Toujours valider avec CrUX API ou Search Console |
| Font `font-display: block` | FOIT 3 s pour les utilisateurs lents | `swap` ou `optional` |

---

## Règles de priorité

1. **TTFB d'abord** : si > 800 ms, toute optimisation frontend est marginale.
2. **LCP image** : précharger, dimensionner, AVIF — gain le plus rapide et le plus visible.
3. **JS inutile** : tree shaking + code splitting avant toute micro-optimisation.
4. **Mesurer en terrain** : CrUX + RUM (Real User Monitoring) prime sur Lighthouse labo.
5. **Ne pas sur-optimiser** : un score Lighthouse 90+ en mobile est une cible saine ; passer de 95 à 100 a peu d'impact réel.


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
