---
name: gitlab-ci-guide
description: Pipelines GitLab CI/CD — stages, jobs, runners, artifacts, environments et Auto DevOps. Se déclenche avec "GitLab CI", "gitlab-ci.yml", "pipeline GitLab", "runner GitLab", "GitLab CD".
---

# Guide GitLab CI/CD

## Workflow

1. **Concevoir le pipeline** — Définir les stages du pipeline (`build`, `test`, `analyze`, `deploy`) dans `.gitlab-ci.yml`, identifier les jobs nécessaires à chaque stage, et déterminer les règles de déclenchement (`rules`, `only/except`).

2. **Configurer les jobs** — Écrire chaque job avec son image Docker, ses scripts (`before_script`, `script`, `after_script`), ses variables, et ses règles d'exécution conditionnelles basées sur la branche, les tags, les merge requests ou les modifications de fichiers.

3. **Gérer les runners** — Configurer les runners GitLab adaptés : shared runners pour les tâches standard, group runners pour les projets d'équipe, et specific runners pour les besoins spéciaux (GPU, accès réseau interne, Windows). Optimiser avec les tags et l'auto-scaling.

4. **Optimiser avec le caching et les artifacts** — Configurer le cache des dépendances (`cache:key`, `cache:paths`, `cache:policy`), les artifacts pour le partage entre jobs (`artifacts:paths`, `artifacts:reports`), et les dépendances explicites entre jobs (`dependencies`, `needs`).

5. **Implémenter les environnements** — Configurer les environnements de déploiement (`environment:name`, `environment:url`), les review apps dynamiques pour les merge requests, le stop des environnements temporaires, et les déploiements manuels avec protection.

6. **Créer des pipelines avancés** — Utiliser les pipelines enfants (`trigger:include`), les pipelines multi-projets (`trigger:project`), les templates partagés (`include:template`, `include:remote`), et le DAG (`needs`) pour la parallélisation optimale des jobs.

7. **Intégrer la sécurité** — Activer les scanners GitLab intégrés : SAST, DAST, dependency scanning, container scanning, secret detection. Configurer les politiques de merge basées sur les résultats de sécurité et les approval rules.

## Règles

- Utilise `rules` plutôt que `only/except` pour les conditions d'exécution — c'est la syntaxe recommandée et la plus flexible.
- Configure toujours un cache approprié pour les dépendances afin de réduire les temps de pipeline.
- Sépare la configuration en fichiers inclus (`include:local`) pour les projets avec des pipelines complexes plutôt qu'un seul fichier monolithique.
- Protège les variables sensibles avec le masquage (`masked: true`) et la restriction aux branches protégées (`protected: true`).
- Documente chaque job avec un commentaire expliquant son rôle dans le pipeline et ses dépendances.
