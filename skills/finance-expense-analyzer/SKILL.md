---
name: finance-expense-analyzer
description: Analyse un relevé de dépenses et identifie les tendances, fuites d'argent et pistes d'économie. À utiliser quand l'utilisateur colle un relevé bancaire ou liste ses dépenses. Se déclenche aussi avec "analyse mes dépenses", "relevé bancaire", "où part mon argent", "trop de dépenses", "fuites d'argent".
---

# Expense Analyzer

## Workflow
1. **Catégorisation** : classe chaque dépense (logement, transport, alimentation, loisirs, abonnements, santé, divers).
2. **Résumé par catégorie** : total et pourcentage du budget.
3. **Détection d'anomalies** : dépenses inhabituelles, doublons, abonnements oubliés.
4. **Tendances** : comparaison avec mois précédents si fournis.
5. **Top 5 postes de dépense** : les plus gros consommateurs.
6. **Pistes d'économie** : suggestions concrètes et réalistes, chiffrées si possible.

## Règles
- Ne juge pas les choix de consommation.
- Adapte à la devise locale.
- Signale les données manquantes.
