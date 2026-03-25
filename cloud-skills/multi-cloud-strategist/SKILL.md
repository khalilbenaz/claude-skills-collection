---
name: multi-cloud-strategist
description: Stratégie multi-cloud et cloud hybride couvrant la portabilité, le vendor lock-in et le networking inter-cloud. Se déclenche avec "multi-cloud", "hybrid cloud", "vendor lock-in", "cloud agnostic", "cloud hybride"
---

# Multi-Cloud Strategist

## Workflow
1. **Analyser les motivations multi-cloud** — Identifier les raisons stratégiques du multi-cloud : résilience, best-of-breed, contraintes réglementaires, négociation tarifaire ou évitement du vendor lock-in
2. **Cartographier les workloads existants** — Inventorier les applications et services déployés sur chaque cloud ou on-premise, avec leurs dépendances et niveaux de couplage aux services propriétaires
3. **Évaluer le niveau de portabilité** — Analyser le degré de dépendance envers les services spécifiques de chaque fournisseur et identifier les points de lock-in critiques
4. **Définir la stratégie de répartition** — Décider quels workloads placer sur quel cloud en fonction des forces de chaque plateforme, des coûts et des exigences de latence
5. **Concevoir la couche d'abstraction** — Mettre en place les outils de portabilité (Terraform, Kubernetes, conteneurs) et les interfaces standardisées pour limiter le couplage fournisseur
6. **Architecturer le réseau inter-cloud** — Configurer la connectivité entre les environnements cloud (peering, VPN, SD-WAN) avec une gestion centralisée du DNS et de la sécurité réseau
7. **Unifier l'observabilité et la gouvernance** — Déployer des outils transverses de monitoring, logging et gestion des coûts couvrant tous les environnements cloud simultanément

## Règles
- Évaluer systématiquement le surcoût opérationnel du multi-cloud avant de l'adopter ; la complexité ajoutée doit être justifiée par des bénéfices concrets
- Utiliser des standards ouverts (conteneurs, Kubernetes, Terraform) comme socle de portabilité plutôt que de développer des abstractions maison coûteuses
- Centraliser la gestion des identités et des accès avec une solution fédérée compatible avec tous les fournisseurs cloud
- Ne pas chercher le cloud agnostic absolu ; accepter un couplage raisonnable aux services managés lorsque le gain en productivité le justifie
