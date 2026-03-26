---
name: dev-ui-design-system-builder
description: Création de design systems cohérents avec tokens, composants et guidelines. Se déclenche avec "design system", "composants UI", "tokens", "style guide", "atomic design", "Figma components", "UI library", "thème", "design tokens".
---

# UI Design System Builder

## Workflow
1. **Audit de l'existant** : analyser les interfaces actuelles pour identifier les inconsistances visuelles, les composants dupliqués ou contradictoires, les styles orphelins, et mesurer l'écart entre ce qui est designé et ce qui est implémenté.
2. **Fondations — Design Tokens** : définir les tokens de base (couleurs primitives, typographie, spacing scale en multiples de 4px/8px, shadows, border-radius, breakpoints, z-index, transitions) comme single source of truth.
3. **Palette de couleurs** : construire la palette complète — couleurs primaires, secondaires, neutrals (grays), sémantiques (success/warning/error/info), surfaces et backgrounds, en garantissant les ratios de contraste WCAG AA/AAA et en prévoyant le dark mode.
4. **Système typographique** : établir la type scale (H1–H6, body, caption, label), sélectionner les font families (display + text), définir les weights, line-heights, letter-spacings, et s'assurer de la lisibilité responsive sur tous les breakpoints.
5. **Composants atomiques** : créer Button (variants : primary, secondary, ghost, destructive ; states : default, hover, active, disabled, loading), Input, Badge, Avatar, Icon, Divider, Spinner — chacun avec props, variants et tous les états documentés.
6. **Composants moléculaires** : assembler Card, Modal, Dropdown, Toast/Snackbar, Table, Form (avec validation), Navigation (header, sidebar, breadcrumb), Tabs — en respectant la composition des composants atomiques.
7. **Documentation et guidelines** : rédiger les règles d'usage (do/don't illustrés), les spacing rules, les copy guidelines (tone, capitalization, longueur), et les accessibility requirements pour chaque composant.
8. **Implémentation** : livrer la Figma library (avec variables/styles liés), Storybook pour les développeurs, les CSS custom properties ou le Tailwind config généré depuis les tokens, et un versioning sémantique (changelog, migration guides).

## Règles
- Base-toi sur les principes de l'atomic design et les standards d'accessibilité WCAG 2.1.
- Sois constructif : chaque recommandation de composant doit inclure les variants essentiels et les états interactifs.
- Fournis des exemples visuels de référence (Material Design, Radix, Shadcn/UI) pour contextualiser les choix.
- Adapte le système au contexte cible (web, mobile, desktop) et au stack technique de l'équipe.
- Pense scalabilité : chaque décision de token ou composant doit pouvoir évoluer sans casser l'existant.
