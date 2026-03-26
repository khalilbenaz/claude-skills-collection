---
name: devops-docker-swarm-guide
description: Orchestration avec Docker Swarm incluant services, stacks, overlay networks, secrets et rolling updates. Se déclenche avec "Docker Swarm", "swarm mode", "docker service", "docker stack", "overlay network"
---

# Docker Swarm Guide

## Workflow
1. **Initialiser le cluster Swarm** — Activer le swarm mode avec `docker swarm init` sur le premier manager. Joindre les noeuds workers et managers additionnels. Configurer un nombre impair de managers (3 ou 5) pour le consensus Raft. Vérifier l'état du cluster avec `docker node ls`.
2. **Configurer les overlay networks** — Créer des réseaux overlay pour la communication inter-services (`docker network create --driver overlay`). Isoler les services par réseau fonctionnel (frontend, backend, data). Activer le chiffrement réseau avec `--opt encrypted` pour les données sensibles.
3. **Déployer les services** — Créer les services avec `docker service create` ou via des stacks Compose. Définir le nombre de réplicas, les contraintes de placement (`--constraint`), les resource limits (CPU, mémoire) et les health checks. Configurer les ports publiés avec le routing mesh.
4. **Gérer les stacks avec Compose** — Écrire les fichiers `docker-compose.yml` (version 3.x) avec la section `deploy` pour les paramètres Swarm. Déployer avec `docker stack deploy -c docker-compose.yml`. Organiser les stacks par domaine fonctionnel pour faciliter la gestion.
5. **Sécuriser avec les secrets et configs** — Stocker les données sensibles avec `docker secret create`. Référencer les secrets dans les services via la section `secrets` du Compose. Utiliser `docker config` pour les fichiers de configuration non sensibles. Les secrets sont montés en mémoire dans `/run/secrets/`.
6. **Configurer les rolling updates** — Définir la stratégie de mise à jour : `--update-parallelism` (nombre de tasks mises à jour simultanément), `--update-delay` (délai entre chaque batch), `--update-failure-action` (pause, continue, rollback). Configurer le rollback automatique en cas d'échec du health check.
7. **Planifier le placement et la haute disponibilité** — Utiliser les labels de noeuds pour le placement stratégique (SSD, GPU, zone). Configurer les placement preferences pour la distribution par rack/zone. Définir les global services pour les agents de monitoring déployés sur chaque noeud.

## Règles
- Toujours utiliser un nombre impair de managers (3 ou 5) pour maintenir le quorum Raft et tolérer les pannes sans perte de consensus.
- Ne jamais stocker de secrets dans les variables d'environnement des services ; toujours utiliser `docker secret` qui monte les secrets en mémoire de manière sécurisée.
- Toujours définir des health checks sur chaque service pour permettre au Swarm de détecter et remplacer automatiquement les containers défaillants.
- Configurer des resource limits (CPU et mémoire) sur chaque service pour éviter qu'un service défaillant ne consomme toutes les ressources du noeud.
- Toujours tester les rolling updates sur un environnement de staging avec `--update-failure-action rollback` avant de déployer en production.
