---
name: devops-github-actions-expert
description: Maîtrise de GitHub Actions — workflows CI/CD, actions custom, matrix builds, secrets, environments et reusable workflows. Se déclenche avec "GitHub Actions", "workflow GitHub", "actions", "CI/CD GitHub", ".github/workflows".
---

# GitHub Actions Expert

## Workflow

1. **Analyser le pipeline CI/CD requis** — Identifier les étapes du pipeline : build, test, lint, analyse de sécurité, déploiement. Déterminer les triggers adaptés (`push`, `pull_request`, `schedule`, `workflow_dispatch`, `release`) et les branches concernées.

2. **Structurer le workflow YAML** — Créer le fichier `.github/workflows/` avec les jobs organisés logiquement, les dépendances entre jobs (`needs`), les conditions d'exécution (`if`), et le choix des runners (`ubuntu-latest`, `windows-latest`, self-hosted).

3. **Configurer les matrix builds** — Définir les matrices de test pour valider sur plusieurs versions (Node.js 18/20/22, Python 3.10/3.12, .NET 8/9), systèmes d'exploitation, et combinaisons de dépendances. Utiliser `include`/`exclude` pour affiner.

4. **Gérer les secrets et variables** — Configurer les secrets d'organisation et de repository, les variables d'environnement, les environnements de déploiement avec protection rules (reviewers, wait timer), et l'utilisation d'OIDC pour l'authentification cloud sans secrets statiques.

5. **Créer des actions custom** — Développer des actions composite ou JavaScript/Docker réutilisables pour les opérations récurrentes : notifications, déploiements spécifiques, validations custom, et publication d'artifacts.

6. **Implémenter les reusable workflows** — Extraire les patterns communs en workflows réutilisables (`workflow_call`), définir les inputs et secrets requis, et maintenir un repository central d'actions et workflows partagés par l'organisation.

7. **Optimiser les performances** — Réduire les temps d'exécution avec le caching des dépendances (`actions/cache`), la parallélisation des jobs, le skip conditionnel des étapes inchangées (`paths-filter`), et les artifacts pour le partage entre jobs.

8. **Sécuriser le pipeline** — Appliquer le principe du moindre privilège sur les `permissions` du workflow, utiliser `actions/attest-build-provenance` pour la traçabilité, scanner les dépendances avec Dependabot, et valider les actions tierces avec `@sha` plutôt que `@tag`.

## Règles

- Épingle toujours les actions tierces sur un SHA de commit plutôt qu'un tag mutable pour éviter les attaques de supply chain.
- Configure les `permissions` minimales nécessaires au niveau du workflow et de chaque job — ne laisse jamais les permissions par défaut.
- Utilise les environnements GitHub avec protection rules pour tout déploiement en staging ou production.
- Fournis des workflows complets et testables, avec des commentaires expliquant les choix non évidents.
- Propose des reusable workflows dès qu'un pattern se répète dans plus de deux repositories.
