---
name: tailwind-expert
description: Maîtrise de Tailwind CSS — utility-first, configuration custom, plugins, responsive design et dark mode. Se déclenche avec "Tailwind", "Tailwind CSS", "utility-first", "tailwind.config", "classes Tailwind".
---

# Tailwind CSS Expert

## Workflow

1. **Analyser le design** — Examiner la maquette ou les besoins UI pour identifier les composants, la palette de couleurs, la typographie, les espacements et les breakpoints nécessaires.

2. **Configurer le projet** — Initialiser Tailwind CSS avec `tailwind.config.ts`, définir le `content` pour le tree-shaking, et configurer le thème personnalisé (`colors`, `spacing`, `fontFamily`, `screens`, `extend`).

3. **Créer le système de design** — Définir les design tokens dans la configuration : couleurs sémantiques (`primary`, `secondary`, `destructive`), échelle typographique, ombres et border-radius cohérents avec la charte graphique.

4. **Implémenter les composants** — Construire les composants UI avec les classes utilitaires Tailwind, en utilisant les variantes responsive (`sm:`, `md:`, `lg:`), les états interactifs (`hover:`, `focus:`, `active:`, `disabled:`), et les classes de groupe (`group-hover:`).

5. **Configurer le dark mode** — Implémenter le mode sombre avec la stratégie `class` ou `media`, définir les variantes `dark:` pour chaque composant, et gérer la persistance du choix utilisateur via localStorage.

6. **Développer des plugins custom** — Créer des plugins Tailwind pour les composants récurrents, les utilitaires personnalisés et les variantes spécifiques au projet. Utiliser `addComponents`, `addUtilities` et `matchUtilities` selon le besoin.

7. **Optimiser la production** — Vérifier le tree-shaking des classes inutilisées, extraire les classes répétitives avec `@apply` dans les composants de base, et mesurer la taille finale du CSS généré.

8. **Assurer la maintenabilité** — Organiser les classes avec un ordre cohérent (layout, spacing, sizing, typography, colors, effects), utiliser `clsx`/`cn` pour la composition conditionnelle, et documenter les conventions d'équipe.

## Règles

- Privilégie les classes utilitaires Tailwind plutôt que du CSS custom — n'utilise `@apply` que pour les composants de base très répétés.
- Utilise toujours l'approche mobile-first pour le responsive : commence par les styles mobiles puis ajoute les variantes `sm:`, `md:`, `lg:`.
- Ne modifie jamais les valeurs par défaut de Tailwind directement — utilise `extend` dans la configuration pour ajouter des valeurs personnalisées.
- Fournis des exemples avec les classes complètes et lisibles, pas de classes abrégées ou ambiguës.
- Propose systématiquement une version accessible (contraste WCAG AA, focus visible, attributs ARIA) pour chaque composant.
