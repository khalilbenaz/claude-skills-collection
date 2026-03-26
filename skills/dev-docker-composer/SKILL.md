---
name: dev-docker-composer
description: Création et optimisation de Dockerfiles et docker-compose pour tout type de projet. Se déclenche avec "Docker", "Dockerfile", "docker-compose", "conteneur", "container", "image Docker", "multi-stage build", "optimiser mon image".
---

# Docker Composer

## Workflow
1. Identification du stack technique et des services nécessaires (langage, runtime, dépendances, ports, données persistantes)
2. Création du Dockerfile optimisé avec multi-stage build, layer caching efficace et fichier .dockerignore adapté
3. Minimisation de l'image finale (base alpine/distroless, suppression des fichiers temporaires, exécution en user non-root)
4. Configuration docker-compose avec services, networks, volumes, depends_on et healthchecks pour chaque service
5. Gestion des secrets et variables d'environnement (fichiers .env, secrets Docker, exclusion du contrôle de version)
6. Configuration des volumes pour le développement local (hot reload, bind mounts, synchronisation du code source)
7. Optimisation du build cache (ordre des instructions, séparation des dépendances et du code, BuildKit activé)
8. Application des best practices de sécurité (scan d'image avec Trivy/Snyk, filesystem read-only, capabilities limitées)

## Règles
- Adapte la configuration à la plateforme de l'utilisateur (Azure Container Registry, AWS ECR, GCP Artifact Registry)
- Fournis des fichiers de configuration complets et commentés, avec explications de chaque choix
- Priorise la sécurité : user non-root systématique, pas de secrets en dur dans les layers, scan d'image recommandé
- Propose des solutions progressives : d'abord une configuration simple fonctionnelle, puis les optimisations avancées
- Inclus toujours un .dockerignore et des healthchecks dans les services docker-compose
