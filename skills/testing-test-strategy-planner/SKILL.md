---
name: testing-test-strategy-planner
description: Planification de stratégie de test incluant la pyramide de tests, les quadrants de tests, la couverture et l'analyse de risques. Se déclenche avec "stratégie de test", "pyramide de tests", "test plan", "couverture de tests", "risk-based testing"
---

# Test Strategy Planner

## Workflow
1. **Analyser le contexte du projet** — Identifier le type d'application (web, mobile, API, microservices), les contraintes techniques, les délais et les exigences réglementaires. Comprendre les objectifs qualité attendus par les parties prenantes.
2. **Définir la pyramide de tests** — Répartir les efforts selon la pyramide : majorité de tests unitaires (base), tests d'intégration (milieu), et tests E2E/UI (sommet). Adapter les proportions au contexte du projet.
3. **Appliquer les quadrants de tests agiles** — Classifier les tests selon les quadrants : Q1 (unitaires, TDD), Q2 (fonctionnels, acceptance), Q3 (exploratoires, usabilité), Q4 (performance, sécurité). Assurer une couverture équilibrée.
4. **Planifier la couverture de tests** — Définir les objectifs de couverture de code (lignes, branches, conditions). Identifier les modules critiques nécessitant une couverture renforcée. Configurer les outils de mesure (Istanbul, JaCoCo, Coverlet).
5. **Effectuer une analyse de risques** — Lister les fonctionnalités par criticité métier et complexité technique. Appliquer le risk-based testing pour prioriser les efforts de test sur les zones à haut risque. Documenter la matrice de risques.
6. **Définir les environnements et données de test** — Planifier les environnements nécessaires (dev, staging, pré-prod). Définir la stratégie de gestion des données de test (génération, anonymisation, refresh).
7. **Établir les critères d'entrée et de sortie** — Définir les conditions pour démarrer les tests (critères d'entrée) et les conditions de validation (critères de sortie). Fixer les seuils acceptables de défauts par sévérité.

## Règles
- Toujours adapter la stratégie au contexte du projet ; ne jamais appliquer un modèle générique sans analyse préalable.
- Prioriser les tests par valeur métier et risque plutôt que par couverture de code brute ; un taux de couverture élevé ne garantit pas la qualité.
- Documenter la stratégie de test dans un document vivant, revu et mis à jour à chaque sprint ou itération.
- Impliquer l'ensemble de l'équipe (développeurs, QA, PO) dans la définition de la stratégie pour garantir l'adhésion et la pertinence.
- Prévoir systématiquement une phase de tests exploratoires en complément des tests automatisés pour détecter les défauts imprévus.
