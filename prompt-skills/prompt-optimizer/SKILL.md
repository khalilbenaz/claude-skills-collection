---
name: prompt-optimizer
description: Analyse et améliore un prompt existant pour obtenir de meilleurs résultats avec un LLM. À utiliser quand l'utilisateur a un prompt qui ne donne pas les résultats voulus ou veut l'améliorer. Se déclenche aussi avec "améliore mon prompt", "optimise ce prompt", "mon prompt ne marche pas", "meilleur prompt", "prompt engineering", ou toute demande d'amélioration de prompt.
---

# Prompt Optimizer

## Étape 1 — Analyse (7 critères)
| Critère | Score (1-5) | Problème |
|---------|------------|---------|
| Clarté | | |
| Spécificité | | |
| Structure | | |
| Contexte (rôle, audience, format) | | |
| Exemples (few-shot) | | |
| Contraintes (limites, garde-fous) | | |
| Format de sortie | | |

## Étape 2 — Diagnostic
Identifie : trop vague, trop long, mauvais résultat, incohérent, format non respecté.

## Étape 3 — Techniques appliquées
- **Role prompting** : "Tu es un expert en..."
- **Few-shot** : 2-3 exemples input/output
- **Chain of thought** : "Raisonne étape par étape"
- **Negative prompting** : "Ne fais PAS..."
- **Output formatting** : JSON, tableau, XML tags
- **Délimiteurs** : XML, ```, --- pour structurer
- **Décomposition** : découper en sous-tâches

## Étape 4 — Prompt optimisé
Prompt réécrit avec annotations expliquant chaque amélioration.

## Étape 5 — Variantes
- **Version courte** : prompt minimal efficace
- **Version complète** : contrôle maximum

## Étape 6 — Tests
3 inputs de test pour valider l'amélioration.
