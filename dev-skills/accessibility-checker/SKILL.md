---
name: accessibility-checker
description: Vérifie et améliore l'accessibilité web (WCAG 2.1). Se déclenche avec "accessibilité", "a11y", "WCAG", "screen reader", "ARIA", "contraste", "accessible", "handicap", "lecteur d'écran".
---

# Accessibility Checker

## Workflow

1. **Audit des critères WCAG 2.1 niveau AA** : parcourir les quatre principes — Perceivable (contenu perceptible), Operable (interface utilisable), Understandable (contenu compréhensible), Robust (compatible technologies d'assistance) — et identifier les violations par niveau de criticité.

2. **Navigation clavier** : vérifier l'ordre de tabulation logique (tab order suit le flux visuel), que le focus est toujours visible (`outline` non supprimé), que des skip links existent pour sauter la navigation, et qu'aucune keyboard trap ne bloque l'utilisateur.

3. **Sémantique HTML** : contrôler l'utilisation correcte des landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`), la hiérarchie des titres (h1 > h2 > h3 sans saut), les labels associés aux champs, et les rôles implicites des éléments natifs.

4. **ARIA correctement utilisé** : s'assurer que `aria-label`, `aria-describedby`, `aria-expanded`, `aria-controls` et les live regions (`aria-live`) sont appliqués uniquement là où le HTML natif ne suffit pas — pas d'ARIA redondant ou incorrect.

5. **Contrastes et couleurs** : vérifier le ratio de contraste (minimum 4.5:1 pour le texte normal, 3:1 pour les grands textes ≥18px), s'assurer que l'information n'est jamais transmise par la couleur seule, et tester en mode daltonien.

6. **Images et médias** : valider les textes alternatifs (`alt`) informatifs pour les images porteuses de sens, `alt=""` pour les images décoratives, sous-titres pour les vidéos, audio descriptions pour les contenus visuels complexes, et transcriptions pour les podcasts.

7. **Formulaires accessibles** : associer chaque champ à son `<label>` via `for`/`id`, fournir des messages d'erreur clairs liés au champ (`aria-describedby`), ne pas bloquer la validation sur le seul format visuel, et permettre la correction avant soumission.

8. **Tests avec outils** : intégrer axe-core ou Lighthouse pour les tests automatisés, tester manuellement avec NVDA (Windows) et VoiceOver (macOS/iOS), et ajouter pa11y-ci dans la pipeline CI/CD pour prévenir les régressions.

## Règles

- L'accessibilité est une exigence légale dans de nombreux pays : traiter chaque violation comme un bug critique.
- Préférer le HTML sémantique natif à ARIA — un `<button>` vaut mieux qu'un `<div role="button">`.
- Tester avec de vrais lecteurs d'écran, pas uniquement des outils automatisés (qui ne détectent que ~30% des problèmes).
- Fournir des exemples de code corrigé, pas seulement la liste des problèmes.
- Documenter le niveau WCAG (A, AA, AAA) et le critère exact (ex. 1.4.3 Contrast) pour chaque point soulevé.
