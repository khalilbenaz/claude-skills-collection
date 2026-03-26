---
name: dev-css-layout-solver
description: Résout les problèmes de layout CSS avec Flexbox, Grid et techniques modernes. Se déclenche avec "CSS", "layout", "Flexbox", "Grid", "centrer", "aligner", "responsive", "mon layout est cassé", "overflow", "z-index".
---

# CSS Layout Solver

## Workflow

1. **Comprendre le layout souhaité** : recueillir la description précise du résultat attendu — maquette, screenshot du problème actuel, ou description textuelle. Identifier le contexte (page entière, widget, carte, navigation).

2. **Choisir la technique adaptée** : sélectionner Flexbox pour les layouts unidimensionnels (lignes ou colonnes), CSS Grid pour les layouts bidimensionnels (grilles complexes), ou container queries pour des composants auto-adaptatifs indépendants du viewport.

3. **Implémenter avec code CSS complet et commenté** : fournir un code directement fonctionnel avec les propriétés clés commentées pour expliquer les choix (ex. `flex: 1 1 auto` vs `flex: 0 0 auto`).

4. **Gérer le responsive** : ajouter media queries basées sur le contenu, utiliser `clamp()` pour des valeurs fluides, `min()` et `max()` pour les contraintes, et container queries pour les composants réutilisables.

5. **Déboguer les problèmes courants** : diagnostiquer overflow caché, conflits de z-index et stacking contexts, margin collapse entre blocs, shrink non désiré sur les enfants flex, et height:100% sans contexte parent.

6. **Animations et transitions CSS** : proposer des animations performantes basées sur `transform` et `opacity` (GPU-accelerated), des keyframes pour les séquences complexes, et `will-change` uniquement quand nécessaire.

7. **Variables CSS et théming** : structurer le design avec custom properties (`--color-primary`), implémenter le dark mode via `prefers-color-scheme` et variables, et organiser les design tokens en couches logiques.

8. **Optimiser la maintenabilité** : réduire la spécificité (préférer les classes aux IDs), utiliser `@layer` pour contrôler la cascade, éviter `!important`, et mesurer l'impact sur le rendering performance (Composite, Paint, Layout).

## Règles

- Toujours livrer du code CSS complet, commenté, et prêt à coller sans modification.
- Préférer les solutions modernes (Grid, Flexbox, clamp) aux hacks historiques (clearfix, table-cell).
- Vérifier la compatibilité cross-browser et indiquer les fallbacks si nécessaire (Can I Use).
- Expliquer le pourquoi des propriétés clés, pas seulement le quoi.
- Prioriser les solutions qui restent maintenables : éviter les valeurs magiques hardcodées.
