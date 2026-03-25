---
name: n8n-workflow-designer
description: Workflows d'automatisation avec n8n — nodes, triggers, credentials, déploiement self-hosted et intégrations. Se déclenche avec "n8n", "workflow n8n", "automatisation open-source", "n8n self-hosted".
---

# n8n Workflow Designer

## Workflow

1. **Installer et configurer n8n** — choisir le mode de déploiement (Docker, npm, n8n Cloud), configurer les variables d'environnement (`N8N_BASIC_AUTH_USER`, `N8N_ENCRYPTION_KEY`, `WEBHOOK_URL`), paramétrer la base de données (SQLite pour le dev, PostgreSQL pour la production), et sécuriser l'accès avec un reverse proxy.

2. **Concevoir l'architecture du workflow** — identifier les nœuds trigger (Webhook, Cron, événement applicatif), planifier le flux de données entre les nœuds, anticiper les branchements conditionnels (IF, Switch), et définir la stratégie de gestion d'erreurs.

3. **Configurer les credentials** — créer et stocker les authentifications pour chaque service externe (OAuth2, API Key, Basic Auth) dans le gestionnaire de credentials n8n, qui les chiffre automatiquement, et tester la connexion avant de les utiliser dans les nœuds.

4. **Assembler les nœuds du workflow** — connecter les nœuds dans l'éditeur visuel : trigger en entrée, nœuds de traitement (Set, Function, Code pour JavaScript/Python personnalisé), nœuds d'intégration (HTTP Request, base de données, SaaS), et nœuds de contrôle (IF, Switch, Merge, Split In Batches).

5. **Transformer les données** — utiliser le nœud Code pour les transformations complexes en JavaScript ou Python, le nœud Set pour renommer et restructurer les champs, les expressions `{{ $json.field }}` pour le mapping dynamique, et le nœud Merge pour combiner les données de branches parallèles.

6. **Gérer les erreurs et la fiabilité** — activer le Error Trigger pour capturer les échecs globalement, configurer les retry automatiques sur les nœuds critiques, utiliser le nœud Stop and Error pour les validations, et implémenter des notifications (Slack, email) en cas d'échec.

7. **Tester et itérer** — exécuter le workflow manuellement avec le bouton Execute, inspecter les données de sortie de chaque nœud dans le panneau de résultats, utiliser des données de test réalistes, et corriger les mappings et transformations étape par étape.

8. **Déployer et maintenir** — activer le workflow en production, configurer les sauvegardes automatiques de la base de données n8n, exporter les workflows en JSON pour le versioning Git, surveiller les exécutions via le tableau de bord, et mettre à jour n8n régulièrement.

## Règles

- Toujours chiffrer les credentials et ne jamais les coder en dur dans les nœuds Code — utiliser le gestionnaire de credentials intégré pour la sécurité.
- Utiliser le nœud Split In Batches pour traiter les grands volumes de données et respecter les rate limits des API externes.
- Versionner les workflows en JSON dans Git — exporter régulièrement et documenter les changements pour permettre le rollback.
- Séparer les environnements de développement et production — tester les workflows complets en staging avant de les activer en production.
- Monitorer les exécutions et configurer des alertes sur les échecs — un workflow en erreur silencieuse peut avoir des conséquences métier importantes.
