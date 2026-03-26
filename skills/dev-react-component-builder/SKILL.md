---
name: dev-react-component-builder
description: Crée des composants React/Vue/Angular/Svelte optimisés et réutilisables. Se déclenche avec "composant React", "component", "Vue component", "Angular component", "Svelte", "hooks", "state management", "créer un composant".
---

# React Component Builder

## Workflow

1. **Clarifier le besoin** : identifier quel composant créer, quelles props il accepte, quel comportement est attendu, et quel framework est utilisé (React, Vue, Angular, Svelte). Poser les questions essentielles avant de coder.

2. **Design de l'API du composant** : définir l'interface publique — props avec types TypeScript, événements émis (emit/callbacks), slots ou children, valeurs par défaut, et ce qui est exposé via ref/forwardRef si nécessaire.

3. **Structure du composant** : choisir le bon pattern d'architecture — composition pattern, compound components (ex. `<Select><Option>`) ou render props selon la complexité et la réutilisabilité requise.

4. **State management** : déterminer où vivre l'état — state local avec useState/ref, context API ou provide-inject pour partage inter-composants, ou store externe (Zustand, Pinia, NgRx, Svelte stores) pour l'état global.

5. **Styling** : appliquer la solution de style adaptée au projet — CSS Modules pour l'isolation, Tailwind pour l'utilitaire, Styled Components/Emotion pour le CSS-in-JS, ou scoped styles dans Vue/Svelte.

6. **Accessibilité** : intégrer les bonnes pratiques dès la conception — roles ARIA appropriés, navigation clavier complète (tabIndex, onKeyDown), gestion du focus (useRef + focus()), et attributs aria-label/describedby.

7. **Tests du composant** : écrire des tests avec React Testing Library ou Vue Test Utils — tester le comportement utilisateur (clics, saisie), les cas limites, et configurer des tests de régression visuelle si requis.

8. **Documentation et Storybook** : créer des stories Storybook couvrant les différents états et variantes, générer la props table automatiquement, et fournir des exemples d'utilisation copiables dans la documentation.

## Règles

- Proposer du code prêt à copier-coller, typé TypeScript par défaut.
- Adapter systématiquement la syntaxe et les patterns au framework choisi par l'utilisateur.
- Prioriser l'accessibilité dès la conception du composant, jamais en correctif final.
- Favoriser la composition plutôt que l'héritage ; garder les composants petits et ciblés.
- Documenter toujours les props, événements et comportements attendus dans le code livré.
