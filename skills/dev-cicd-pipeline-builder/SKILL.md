---
name: dev-cicd-pipeline-builder
description: Conception de pipelines CI/CD pour tout type de plateforme. Se déclenche avec "CI/CD", "pipeline", "GitHub Actions", "Azure DevOps", "GitLab CI", "déploiement automatique", "continuous integration", "continuous deployment".
---

# CI/CD Pipeline Builder

## Workflow
1. Analyse du projet : langage, framework, suite de tests, environnements cibles (staging, production) et contraintes de déploiement
2. Choix de la plateforme CI/CD adaptée (GitHub Actions, Azure Pipelines, GitLab CI, Jenkins) selon le contexte et l'hébergement
3. Configuration du pipeline de CI : étapes de build, lint, tests unitaires/intégration, security scan (SAST/DAST) et rapport de couverture de code
4. Configuration du pipeline de CD : déploiement vers staging puis production, avec gates de validation et stratégie de rollback automatique
5. Gestion sécurisée des secrets et variables (HashiCorp Vault, Azure Key Vault, GitHub Secrets, configs spécifiques par environnement)
6. Définition de la stratégie de déploiement : blue-green, canary release ou rolling update selon les exigences de disponibilité
7. Mise en place des notifications et du reporting (alertes Slack/Teams, rapports email, dashboards de qualité SonarQube/Codecov)
8. Optimisation du pipeline : caching des dépendances, jobs parallèles, stages conditionnels, gestion des artefacts et temps de build

## Règles
- Adapte le pipeline à la plateforme cloud de l'utilisateur (Azure DevOps, GitHub Actions pour AWS/GCP, GitLab CI)
- Fournis les fichiers de configuration complets et commentés (YAML) prêts à l'emploi
- Priorise la sécurité : scan de vulnérabilités obligatoire, rotation des secrets, principe du moindre privilège
- Propose des solutions progressives : pipeline minimal fonctionnel en premier, puis enrichissement avec les étapes avancées
