---
name: edge-computing-designer
description: Conception de systèmes edge computing avec traitement local, synchronisation cloud, latence et offline-first. Se déclenche avec "edge computing", "edge", "traitement local", "IoT edge", "fog computing", "offline IoT".
---

# Edge Computing Designer

## Workflow
1. **Évaluation des besoins** — Analyser les contraintes de latence, bande passante, volume de données et disponibilité réseau pour déterminer ce qui doit être traité en edge vs cloud
2. **Architecture edge-cloud** — Concevoir la répartition des traitements entre les appareils edge, les passerelles intermédiaires (fog) et le cloud central
3. **Sélection du matériel edge** — Choisir les dispositifs adaptés (Jetson Nano, Coral, passerelles industrielles) selon les besoins en calcul, mémoire et connectivité
4. **Conception offline-first** — Implémenter la logique de stockage local, les files d'attente de messages et la gestion des conflits pour fonctionner sans connexion
5. **Synchronisation des données** — Mettre en place les mécanismes de synchronisation bidirectionnelle avec le cloud (delta sync, compression, priorisation des données critiques)
6. **Déploiement des modèles** — Optimiser et déployer les modèles d'IA/ML en edge (quantification, pruning, TensorFlow Lite, ONNX Runtime) pour l'inférence locale
7. **Orchestration et mise à jour** — Configurer le déploiement à distance des mises à jour logicielles (OTA), le rollback automatique et la gestion de flotte
8. **Résilience et monitoring** — Implémenter la supervision distribuée, les mécanismes de failover local et les alertes de santé des nœuds edge

## Règles
- Concevoir toujours en mode offline-first : le système doit fonctionner de manière autonome même sans connexion au cloud
- Minimiser les données envoyées au cloud en appliquant le filtrage, l'agrégation et la compression directement en edge
- Prévoir des mécanismes de rollback automatique pour toute mise à jour OTA afin d'éviter de bricker les appareils distants
- Sécuriser chaque nœud edge individuellement (chiffrement local, authentification mutuelle, boot sécurisé)
- Documenter clairement la répartition des responsabilités entre edge et cloud avec les critères de décision associés
