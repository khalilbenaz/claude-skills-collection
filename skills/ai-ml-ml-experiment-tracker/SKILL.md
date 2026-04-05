---
name: ai-ml-ml-experiment-tracker
description: "Suivi d'expériences ML avec MLflow, W&B, versioning de modèles et comparaison de métriques"
triggers:
  - "MLflow"
  - "Weights & Biases"
  - "experiment tracking"
  - "suivi d'expériences"
  - "model registry"
---

# ML Experiment Tracker

Guide complet pour le suivi structuré d'expériences de machine learning, le versioning de modèles et la comparaison systématique des métriques.

## Workflow

### 1. Choisir et configurer la plateforme de tracking

- Évaluer les options disponibles : MLflow (open-source, auto-hébergé), Weights & Biases (SaaS), Neptune, ClearML
- Installer et configurer le serveur de tracking (MLflow Tracking Server, W&B workspace)
- Définir la structure des projets et des espaces de travail
- Configurer l'authentification et les droits d'accès pour l'équipe
- Intégrer le tracking dans le pipeline CI/CD existant

### 2. Structurer les expériences

- Définir une convention de nommage claire pour les expériences (projet/tâche/variante)
- Organiser les runs par groupes logiques (exploration, ablation, production)
- Créer des tags standardisés pour faciliter le filtrage (dataset_version, model_type, technique)
- Définir les métadonnées obligatoires à enregistrer pour chaque run
- Documenter l'objectif et l'hypothèse de chaque expérience avant de la lancer

### 3. Logger les paramètres et hyperparamètres

- Enregistrer automatiquement tous les hyperparamètres (learning rate, batch size, epochs, architecture)
- Logger la configuration complète du modèle (nombre de couches, dimensions, activation)
- Capturer les paramètres du dataset (version, taille, splits, prétraitement appliqué)
- Enregistrer l'environnement d'exécution (GPU, RAM, versions des librairies, seed)
- Utiliser le logging automatique quand disponible (mlflow.autolog(), wandb.watch())

### 4. Suivre les métriques en temps réel

- Définir les métriques principales (loss, accuracy, F1, BLEU, etc.) et secondaires
- Logger les métriques à chaque step/epoch pour visualiser les courbes d'apprentissage
- Configurer des alertes sur les métriques anormales (divergence, NaN, plateau)
- Enregistrer les métriques de ressources (utilisation GPU, mémoire, temps d'entraînement)
- Logger les métriques custom spécifiques au domaine métier

### 5. Versionner les artefacts

- Sauvegarder les checkpoints du modèle avec leurs métriques associées
- Versionner les datasets utilisés (lien vers DVC, hash du fichier)
- Stocker les fichiers de configuration et les scripts d'entraînement
- Enregistrer les graphiques et visualisations (courbes ROC, matrices de confusion, samples de prédictions)
- Archiver les logs d'entraînement complets pour le débogage

### 6. Comparer et analyser les résultats

- Utiliser les tableaux comparatifs pour mettre en regard les runs
- Créer des visualisations parallèles (parallel coordinates, scatter plots)
- Identifier les hyperparamètres ayant le plus d'impact (importance analysis)
- Documenter les conclusions et les insights tirés de chaque comparaison
- Générer des rapports automatiques pour les revues d'expériences

### 7. Gérer le Model Registry

- Promouvoir les meilleurs modèles dans le registry avec un statut (staging, production, archived)
- Associer chaque version du modèle à son run d'entraînement complet
- Documenter les changements entre versions (model card, changelog)
- Configurer des validations automatiques avant la promotion en production
- Maintenir un historique complet des modèles déployés

### 8. Automatiser et industrialiser

- Créer des templates de runs pour standardiser les nouvelles expériences
- Mettre en place des sweeps/grid search automatisés avec logging intégré
- Configurer des pipelines de réentraînement automatique avec tracking
- Intégrer le tracking dans les notebooks Jupyter pour l'exploration
- Former l'équipe aux bonnes pratiques de tracking

## Rules

1. **Logger avant de lancer** : Configurer le tracking complet avant de démarrer l'entraînement. Un run sans logs est un run perdu. Il est impossible de recréer les conditions exactes d'une expérience après coup.

2. **Un run = une configuration** : Chaque modification d'hyperparamètre, de dataset ou de code doit correspondre à un nouveau run. Ne jamais écraser un run existant, même en cas d'erreur.

3. **Métriques reproductibles** : Toujours fixer et enregistrer le random seed, la version exacte des librairies et le hash du code. Deux runs avec les mêmes paramètres doivent produire des résultats identiques (ou quasi-identiques sur GPU).

4. **Nommer et taguer systématiquement** : Un run sans nom descriptif ni tags est inutilisable pour la comparaison future. Appliquer la convention de nommage de l'équipe sans exception.

5. **Nettoyer régulièrement** : Archiver ou supprimer les runs exploratoires obsolètes. Un espace de tracking encombré ralentit la recherche et masque les résultats importants.


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
