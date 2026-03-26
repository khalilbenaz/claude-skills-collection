---
name: automation-power-automate-designer
description: Création de workflows avec Power Automate — flows, triggers, connectors, expressions et intégration Office 365. Se déclenche avec "Power Automate", "Microsoft Flow", "automatisation Office 365", "flow Power Automate".
---

# Power Automate Designer

## Workflow

1. **Identifier le besoin d'automatisation** — analyser le processus métier à automatiser, définir le déclencheur (réception d'email, création de fichier SharePoint, soumission de formulaire Forms, événement planifié), et cartographier les étapes manuelles à remplacer.

2. **Choisir le type de flow** — sélectionner entre Cloud Flow (automatisé, instantané ou planifié), Desktop Flow (RPA pour les applications legacy), ou Business Process Flow (processus guidé multi-étapes), en fonction du scénario et des systèmes impliqués.

3. **Configurer les connecteurs** — établir les connexions aux services nécessaires (Office 365, SharePoint, Teams, Outlook, Dataverse, SQL Server, services tiers), gérer les authentifications OAuth, et utiliser les connecteurs personnalisés pour les API non couvertes.

4. **Construire la logique du flow** — assembler les actions séquentiellement, utiliser les conditions (`if/else`), les boucles (`Apply to each`, `Do until`), les actions parallèles (`Parallel branch`), et le `Switch` pour les branchements multiples selon la valeur d'une variable.

5. **Maîtriser les expressions** — utiliser les fonctions d'expression pour manipuler les données : `formatDateTime()`, `concat()`, `split()`, `json()`, `triggerOutputs()`, `body()`, et les fonctions de collection `first()`, `last()`, `length()` pour transformer les données entre les étapes.

6. **Gérer les erreurs et les retries** — configurer le `Configure run after` pour chaque action (succeeded, failed, skipped, timed out), implémenter des scopes `Try/Catch` avec des blocs Scope, définir les politiques de retry, et envoyer des notifications en cas d'échec.

7. **Tester et déboguer** — utiliser le mode test avec déclenchement manuel, examiner les entrées/sorties de chaque action dans l'historique d'exécution, corriger les expressions avec le testeur d'expressions intégré, et valider les scénarios limites (données manquantes, timeouts).

8. **Déployer et surveiller** — exporter le flow dans une solution pour le déploiement entre environnements (dev, staging, prod), configurer les alertes de monitoring, vérifier les quotas et limites de l'abonnement, et documenter le flow avec des commentaires et des notes.

## Règles

- Toujours utiliser des variables et des expressions nommées explicitement — un flow lisible est un flow maintenable, même six mois plus tard.
- Implémenter systématiquement la gestion d'erreurs avec des scopes Try/Catch — un flow sans gestion d'erreurs échouera silencieusement en production.
- Respecter les limites de l'API (throttling) en ajoutant des délais (`Delay`) et en paginant les requêtes pour les grandes collections de données.
- Utiliser les solutions Power Platform pour le versioning et le déploiement — ne jamais modifier un flow directement en production.
- Tester avec des données réalistes incluant les cas limites (champs vides, caractères spéciaux, grands volumes) avant la mise en production.
