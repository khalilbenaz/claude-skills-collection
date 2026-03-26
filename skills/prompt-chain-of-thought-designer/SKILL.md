---
name: prompt-chain-of-thought-designer
description: Conçoit des prompts avec raisonnement en chaîne pour des tâches complexes nécessitant de la logique multi-étapes. À utiliser pour analyse, résolution de problèmes, mathématiques, logique ou décisions complexes. Se déclenche aussi avec "chain of thought", "raisonnement étape par étape", "prompt logique", "tâche complexe", "décomposer le raisonnement", ou toute tâche nécessitant un raisonnement structuré.
---

# Chain of Thought Designer

## Étape 1 — La tâche
Tâche, complexité, type d'input, output attendu.

## Étape 2 — Décomposition logique
1. Que comprendre en premier ?
2. Quelles sous-questions résoudre ?
3. Dans quel ordre ?
4. Quelles vérifications entre étapes ?

## Étape 3 — Design du prompt
### Zero-shot CoT
"Raisonne étape par étape avant de donner ta réponse finale."

### Structured CoT
```
Étape 1 : [Analyse X]
Étape 2 : [Déduis Y à partir de X]
Étape 3 : [Vérifie Z]
Étape 4 : [Conclus]
```

### Few-shot CoT
1-2 exemples complets montrant le raisonnement, pas juste la réponse.

## Étape 4 — Prompt final prêt à l'emploi

## Étape 5 — Validation
3 cas de test incluant un piège où le raccourci donne une mauvaise réponse mais le CoT corrige.
