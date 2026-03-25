---
name: gcp-guide
description: Services Google Cloud Platform incluant Cloud Run, BigQuery, GKE, Cloud Functions et Firestore. Se déclenche avec "GCP", "Google Cloud", "BigQuery", "Cloud Run", "GKE", "Firestore"
---

# GCP Guide

## Workflow
1. **Comprendre le contexte du projet** — Identifier les besoins métier, les volumes de données attendus et les contraintes de performance ou de conformité
2. **Organiser la hiérarchie des ressources** — Structurer les projets GCP, les dossiers et l'organisation avec une stratégie IAM claire et des service accounts dédiés
3. **Sélectionner les services de calcul** — Choisir entre Cloud Run (conteneurs serverless), GKE (Kubernetes managé) ou Cloud Functions (event-driven) selon le cas d'usage
4. **Concevoir la couche de données** — Déterminer le stockage adapté entre Firestore (NoSQL temps réel), BigQuery (analytique), Cloud SQL ou Cloud Storage selon les patterns d'accès
5. **Configurer le réseau et la sécurité** — Mettre en place les VPC, les règles de pare-feu, les interconnexions et les politiques d'accès IAM granulaires
6. **Implémenter le pipeline de données** — Construire les flux de données avec Pub/Sub, Dataflow ou Cloud Composer pour l'orchestration des traitements
7. **Déployer avec Infrastructure as Code** — Utiliser Terraform ou Deployment Manager pour automatiser le provisionnement et garantir la reproductibilité
8. **Superviser et optimiser** — Configurer Cloud Monitoring, Cloud Logging et les alertes, puis analyser les recommandations de coûts via le Cost Management

## Règles
- Toujours utiliser des service accounts dédiés par application plutôt que des comptes utilisateurs pour l'authentification machine
- Activer les logs d'audit (Cloud Audit Logs) sur tous les projets en production
- Privilégier les services managés de GCP pour réduire la charge opérationnelle
- Partitionner et clustériser les tables BigQuery pour optimiser les performances et les coûts de requêtage
