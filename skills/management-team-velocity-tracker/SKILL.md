---
name: management-team-velocity-tracker
description: Suivi de la vélocité d'équipe et des métriques agile pour piloter la performance et la prévisibilité. Se déclenche avec "vélocité", "burndown", "lead time", "cycle time", "throughput", "métriques agile".
---

# Team Velocity Tracker

## Workflow
1. **Identification des métriques** — Définir les métriques clés à suivre : vélocité (story points livrés/sprint), throughput (nombre de stories livrées), lead time, cycle time, WIP.
2. **Collecte des données** — Extraire les données depuis l'outil de gestion (Jira, Azure DevOps, Linear) sur les 6-10 derniers sprints pour avoir une base statistique fiable.
3. **Calcul de la vélocité** — Calculer la vélocité moyenne, médiane et l'écart-type pour évaluer la stabilité et la prévisibilité de l'équipe.
4. **Construction des graphiques** — Générer les graphiques essentiels : burndown chart du sprint, velocity chart historique, cumulative flow diagram, lead time distribution.
5. **Analyse des tendances** — Identifier les tendances (amélioration, dégradation, plateaux), les anomalies et les corrélations avec des événements (changement d'équipe, dette technique).
6. **Prévisions** — Utiliser la vélocité pour estimer les dates de livraison avec des intervalles de confiance (optimiste/pessimiste/réaliste) via simulation Monte Carlo si possible.
7. **Recommandations** — Proposer des actions concrètes pour améliorer les métriques identifiées comme problématiques.

## Règles
- Ne jamais utiliser la vélocité pour comparer deux équipes entre elles.
- La vélocité n'est pas un objectif à maximiser mais un outil de planification et de prévisibilité.
- Prendre en compte au minimum 3 sprints pour toute moyenne significative.
- Signaler les sprints atypiques (vacances, incidents majeurs) pour ne pas fausser les statistiques.
