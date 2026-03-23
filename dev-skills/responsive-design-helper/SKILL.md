---
name: responsive-design-helper
description: Conception responsive et mobile-first pour tout type de site ou app web. Se déclenche avec "responsive", "mobile first", "media queries", "breakpoints", "adaptatif", "mobile", "tablette", "s'affiche mal sur mobile".
---

# Responsive Design Helper

## Workflow

1. **Approche mobile-first** : commencer par concevoir et coder pour le plus petit écran (320-375px), puis enrichir progressivement avec des media queries `min-width` pour les écrans plus larges — jamais l'inverse (desktop-first génère des surcharges CSS inutiles).

2. **Définition des breakpoints** : choisir les breakpoints basés sur le contenu et non les devices spécifiques (les modèles changent). Points de référence courants : 480px (grand mobile), 768px (tablette portrait), 1024px (tablette paysage / petit desktop), 1280px (desktop standard).

3. **Layout fluide** : utiliser des unités relatives (`%`, `vw`, `vh`, `dvh`) plutôt que des pixels fixes, les `fr` units de CSS Grid pour les grilles fluides, et les fonctions `clamp()`, `min()`, `max()` pour des valeurs auto-adaptatives sans media queries.

4. **Typographie responsive** : appliquer `clamp(min, preferred, max)` pour une échelle de taille fluide (ex. `clamp(1rem, 2.5vw, 1.5rem)`), définir une échelle typographique cohérente, et éviter les textes trop petits sur mobile (minimum 16px pour le corps).

5. **Images responsives** : utiliser `srcset` et `sizes` pour charger la résolution adaptée, l'élément `<picture>` pour le format artistique (art direction), `loading="lazy"` pour le chargement différé, et proposer WebP/AVIF avec fallback JPEG/PNG.

6. **Navigation adaptative** : implémenter un hamburger menu ou bottom navigation sur mobile, un drawer/sidebar sur tablette, et la navigation complète sur desktop. Assurer la cohérence de l'expérience entre les patterns.

7. **Touch-friendly** : dimensionner les zones tactiles à minimum 44×44px (recommandation Apple/Google), gérer les gestes swipe si pertinent, et fournir des alternatives aux interactions `hover` pour les écrans tactiles (pas d'info uniquement au survol).

8. **Testing multi-appareils** : utiliser Chrome DevTools Device Mode pour les tests rapides, BrowserStack ou LambdaTest pour les vrais navigateurs/OS, et tester impérativement sur des appareils réels avant livraison (comportements gyroscopiques, performances CPU réelles).

## Règles

- Toujours partir du mobile-first : coder la version mobile en base, enrichir avec `min-width`.
- Éviter les breakpoints basés sur des modèles d'appareils — les contenus dictent les breakpoints.
- Fournir du code complet avec les media queries intégrées, pas en séparé.
- Tester les performances sur mobile (CPU throttling 4x dans DevTools) — un layout responsive lent n'est pas acceptable.
- Documenter les choix de breakpoints et les raisons dans les commentaires CSS.
