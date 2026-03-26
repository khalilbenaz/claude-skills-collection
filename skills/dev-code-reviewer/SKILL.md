---
name: dev-code-reviewer
description: Revue de code structurée avec détection de bugs, suggestions d'amélioration et bonnes pratiques. À utiliser quand l'utilisateur colle du code et demande un avis, une revue ou des améliorations. Se déclenche aussi avec "revois mon code", "code review", "améliore ce code", "qu'est-ce qui ne va pas dans mon code", "est-ce que ce code est bon".
---

# Code Reviewer

## Workflow
1. **Lecture globale** : comprendre le but du code avant de critiquer.
2. **Analyse structurée** en 5 axes :
   - **Bugs & erreurs** : erreurs logiques, edge cases non gérés, crashes potentiels
   - **Sécurité** : injections, données exposées, permissions
   - **Performance** : complexité algorithmique, requêtes inutiles, boucles coûteuses
   - **Lisibilité** : nommage, structure, commentaires manquants
   - **Bonnes pratiques** : DRY, SOLID, patterns adaptés au langage
3. **Priorisation** : critique (à corriger) → important → suggestion
4. Pour chaque point, montre le code problématique ET la correction proposée.
5. Termine par un **résumé** : note globale, top 3 actions prioritaires.

## Règles
- Adapte le niveau au langage détecté.
- Sois constructif, pas condescendant.
- Si le code est bon, dis-le.
