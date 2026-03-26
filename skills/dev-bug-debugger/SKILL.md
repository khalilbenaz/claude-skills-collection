---
name: dev-bug-debugger
description: Aide à diagnostiquer et résoudre un bug en suivant une méthodologie structurée. À utiliser quand l'utilisateur a une erreur, un comportement inattendu ou un crash. Se déclenche aussi avec "j'ai un bug", "ça ne marche pas", "erreur", "crash", "pourquoi ça fait ça", "TypeError", "undefined", ou tout message d'erreur collé.
---

# Bug Debugger

## Workflow
1. **Comprendre le problème** :
   - Quel est le comportement attendu ?
   - Quel est le comportement observé ?
   - Depuis quand ? Qu'est-ce qui a changé récemment ?
2. **Analyser l'erreur** :
   - Lire le message d'erreur ligne par ligne
   - Identifier le fichier, la ligne et la fonction concernée
   - Remonter la stack trace
3. **Hypothèses** : lister les 3 causes les plus probables, classées par probabilité.
4. **Vérification** : pour chaque hypothèse, proposer un test simple (console.log, print, breakpoint…).
5. **Correction** : code corrigé avec explication de pourquoi ça résout le problème.
6. **Prévention** : comment éviter ce bug à l'avenir (types, tests, validation…).

## Règles
- Ne devine pas — demande le contexte manquant.
- Montre toujours le avant/après du code.
- Si le bug dépasse le code montré, dis-le.
