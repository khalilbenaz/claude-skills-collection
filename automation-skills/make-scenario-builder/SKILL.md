---
name: make-scenario-builder
description: Scénarios d'automatisation avec Make (ex-Integromat) — modules, routers, iterators, webhooks et orchestration visuelle. Se déclenche avec "Make", "Integromat", "scénario Make", "automatisation Make".
---

# Make Scenario Builder

## Workflow

1. **Définir le scénario d'automatisation** — analyser le processus métier, identifier les applications impliquées et vérifier leur disponibilité dans le catalogue Make (1500+ apps), définir la fréquence d'exécution (instantané via webhook, ou planifié par intervalle), et estimer le volume d'opérations pour choisir le plan adapté.

2. **Configurer le module trigger** — sélectionner le module déclencheur (Watch pour polling périodique, Instant pour webhook temps réel), connecter le compte de l'application source, configurer les filtres de déclenchement pour ne traiter que les données pertinentes, et tester pour vérifier la récupération des données.

3. **Construire le flux avec les modules** — enchaîner les modules d'action dans l'éditeur visuel, mapper les champs dynamiquement entre les modules avec le panneau de mapping, utiliser les fonctions intégrées (`formatDate`, `parseJSON`, `ifempty`, `replace`) pour transformer les données en transit.

4. **Utiliser les Routers pour le branchement** — ajouter un Router pour créer des branches parallèles ou conditionnelles, configurer des filtres sur chaque route (conditions AND/OR sur les données), ordonner les routes par priorité avec l'option fallback, et utiliser des routes distinctes pour les différents cas métier.

5. **Gérer les collections avec Iterators et Aggregators** — utiliser un Iterator pour décomposer un tableau en éléments individuels traités un par un, puis un Aggregator (Array, Text, Numeric) pour reconstituer les résultats après traitement, et configurer le Array Aggregator pour regrouper les données filtrées.

6. **Implémenter les webhooks personnalisés** — créer un webhook Make pour recevoir des données externes en temps réel, définir la structure des données attendues (data structure), répondre immédiatement avec un Webhook Response, et sécuriser avec une vérification IP ou un token.

7. **Gérer les erreurs** — ajouter des Error Handlers (Resume, Commit, Rollback, Break, Ignore) sur les modules critiques, configurer les notifications d'erreur par email ou Slack, utiliser le module Break pour mettre en file d'attente les exécutions échouées et les relancer.

8. **Optimiser et déployer** — activer le scénario en mode scheduling, surveiller la consommation d'opérations dans le tableau de bord, utiliser les Data Stores pour le stockage intermédiaire persistant, et cloner le scénario dans un espace d'équipe pour la collaboration.

## Règles

- Toujours estimer le nombre d'opérations avant de déployer un scénario — chaque module exécuté consomme une opération, et les boucles (Iterators) multiplient la consommation.
- Utiliser les filtres le plus tôt possible dans le scénario pour éviter de consommer des opérations sur des données non pertinentes.
- Implémenter systématiquement des Error Handlers sur les modules qui interagissent avec des API externes — les timeouts et erreurs réseau sont fréquents.
- Documenter chaque scénario avec des notes sur les modules et nommer explicitement les connexions — un scénario visuel non documenté devient incompréhensible après quelques semaines.
- Tester avec l'option "Run once" avant d'activer le scheduling — vérifier chaque module individuellement et valider les données de sortie.
