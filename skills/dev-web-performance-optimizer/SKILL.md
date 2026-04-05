---
name: dev-web-performance-optimizer
description: Optimise les performances web (Core Web Vitals, loading, rendering). Se déclenche avec "performance web", "Core Web Vitals", "LCP", "FID", "CLS", "lighthouse score", "page speed", "site lent", "bundle size", "lazy loading".
---

# Web Performance Optimizer

## Workflow

1. **Audit avec Lighthouse et WebPageTest** : lancer un audit Lighthouse (mode navigation, desktop et mobile) pour obtenir les scores et métriques, puis WebPageTest pour le waterfall détaillé, le Time to First Byte, et l'analyse des requêtes bloquantes.

2. **Core Web Vitals** : viser les seuils "Good" définis par Google — LCP (Largest Contentful Paint) < 2.5s pour le chargement perçu, FID (First Input Delay) < 100ms / INP (Interaction to Next Paint) < 200ms pour la réactivité, CLS (Cumulative Layout Shift) < 0.1 pour la stabilité visuelle.

3. **Optimisation du chargement JavaScript** : implémenter le code splitting par route (dynamic `import()`), le tree shaking pour éliminer le code mort, les dynamic imports pour les fonctionnalités non critiques, et `<link rel="preload">` / `<link rel="prefetch">` pour les ressources prioritaires.

4. **Optimisation des images** : convertir en formats modernes WebP et AVIF (30-50% plus légers), appliquer le lazy loading (`loading="lazy"`) aux images hors écran, utiliser des images responsives (`srcset`/`sizes`), et servir via un CDN avec redimensionnement à la volée.

5. **Optimisation du CSS** : extraire et inliner le CSS critique (above-the-fold) dans le `<head>`, charger le reste en asynchrone (`media="print" onload`), purger le CSS inutilisé avec PurgeCSS ou le purge intégré de Tailwind, et éviter les imports CSS en cascade.

6. **Optimisation JavaScript** : utiliser `defer` ou `async` sur les scripts non critiques, analyser le bundle avec webpack-bundle-analyzer ou Rollup Visualizer, déplacer les tâches lourdes vers des Web Workers, et réduire le main thread blocking time.

7. **Stratégie de cache** : configurer les headers HTTP Cache-Control (immutable pour les assets versionnés, stale-while-revalidate pour les pages), implémenter un Service Worker pour le cache offline et les stratégies cache-first/network-first, et invalider le cache via content hashing.

8. **Infrastructure et livraison** : déployer les assets statiques sur un CDN (Cloudflare, Fastly, AWS CloudFront), activer HTTP/2 ou HTTP/3 pour le multiplexage des requêtes, activer la compression Brotli (meilleur que gzip), et explorer l'edge computing pour réduire la latence réseau.

## Règles

- Mesurer avant et après chaque optimisation : ne jamais optimiser sans données (Lighthouse, RUM, CrUX).
- Prioriser les optimisations par impact/effort : les images et le JS sont généralement les gains les plus rapides.
- Ne pas sacrifier l'expérience développeur pour des gains marginaux de performance.
- Documenter chaque optimisation appliquée et son gain mesuré pour justifier les choix techniques.
- Adapter les recommandations au stack technique existant — ne pas préconiser un remplacement complet d'infrastructure.


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
