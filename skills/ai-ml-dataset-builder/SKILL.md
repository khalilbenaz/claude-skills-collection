---
name: ai-ml-dataset-builder
description: "Construction et curation de datasets pour l'entraînement ML (nettoyage, augmentation, annotation, split)"
triggers:
  - "dataset"
  - "données d'entraînement"
  - "annotation"
  - "data augmentation"
  - "train/test split"
---

# Dataset Builder

Guide complet pour la construction, la curation et la gestion de datasets de qualité pour l'entraînement de modèles de machine learning.

## Workflow

### 1. Définir les besoins du dataset

- Identifier la tâche ML cible et les exigences en termes de volume de données
- Définir le schéma des données : features d'entrée, labels, métadonnées
- Établir les critères de qualité minimaux (complétude, exactitude, cohérence)
- Recenser les sources de données disponibles (bases internes, APIs, web scraping, données publiques)
- Vérifier les contraintes légales et éthiques (RGPD, consentement, biais)

### 2. Collecter les données brutes

- Mettre en place des pipelines de collecte automatisés (scrapers, connecteurs API, ETL)
- Agréger les données depuis les différentes sources identifiées
- Stocker les données brutes dans un format standardisé (Parquet, CSV, JSONL)
- Documenter la provenance de chaque source (date, méthode, volume)
- Gérer la déduplication à la collecte pour éviter les biais de surreprésentation

### 3. Nettoyer et prétraiter les données

- Détecter et traiter les valeurs manquantes (imputation, suppression, marquage)
- Identifier et corriger les outliers statistiques
- Normaliser les formats (dates, textes, encodages, unités)
- Supprimer les doublons exacts et quasi-doublons (fuzzy matching)
- Valider la cohérence des types de données et des plages de valeurs
- Appliquer les transformations spécifiques au domaine (tokenization pour le texte, redimensionnement pour les images)

### 4. Annoter et labelliser les données

- Définir un guide d'annotation clair avec des exemples pour chaque catégorie
- Choisir la méthode d'annotation (manuelle, semi-automatique avec pré-annotation, crowdsourcing)
- Mettre en place des outils d'annotation adaptés (Label Studio, Prodigy, CVAT)
- Assurer la qualité via l'accord inter-annotateurs (Cohen's Kappa, Fleiss' Kappa)
- Gérer les cas ambigus avec un processus de résolution documenté

### 5. Augmenter les données si nécessaire

- Pour le texte : paraphrase, back-translation, insertion/suppression de mots, génération synthétique
- Pour les images : rotation, flip, crop, ajustement de luminosité, mixup, CutMix
- Pour les données tabulaires : SMOTE, ADASYN, génération par modèle génératif
- Vérifier que l'augmentation ne dégrade pas la qualité ni n'introduit de biais
- Calibrer le ratio d'augmentation pour chaque classe sous-représentée

### 6. Créer les splits train/validation/test

- Appliquer une stratification pour maintenir la distribution des classes dans chaque split
- Utiliser des proportions standards (70-80% train, 10-15% validation, 10-15% test)
- Garantir l'absence de fuite de données entre les splits (data leakage)
- Pour les données temporelles, respecter l'ordre chronologique dans les splits
- Pour les données groupées (même patient, même utilisateur), garder les groupes intacts dans un seul split

### 7. Valider et documenter le dataset

- Calculer les statistiques descriptives complètes (distribution, corrélations, taille)
- Générer un rapport de qualité automatique (Great Expectations, Pandera)
- Créer une datacard/dataset card documentant la composition, les biais connus et l'usage prévu
- Versionner le dataset avec un outil dédié (DVC, Delta Lake, HuggingFace Datasets)
- Archiver les métadonnées de provenance et de transformation

### 8. Maintenir et itérer le dataset

- Mettre en place un monitoring de la qualité des données en continu
- Planifier des mises à jour régulières pour éviter la dérive des données (data drift)
- Intégrer les retours du modèle en production pour enrichir le dataset (active learning)
- Maintenir un changelog des modifications apportées au dataset

## Rules

1. **La qualité prime sur la quantité** : Un petit dataset propre et bien annoté produira de meilleurs résultats qu'un grand dataset bruité. Investir dans le nettoyage et l'annotation de qualité est toujours prioritaire.

2. **Interdiction absolue de fuite de données** : Les données de test ne doivent jamais influencer l'entraînement, ni directement ni indirectement. Vérifier systématiquement l'absence de data leakage entre les splits, y compris via les transformations et l'augmentation.

3. **Documenter la provenance et les transformations** : Chaque étape de construction du dataset doit être traçable et reproductible. Sans documentation, le dataset perd sa valeur scientifique et rend le débogage impossible.

4. **Évaluer et corriger les biais** : Analyser systématiquement les biais de représentation dans le dataset (genre, ethnie, géographie, etc.). Un modèle entraîné sur des données biaisées reproduira et amplifiera ces biais en production.

5. **Versionner le dataset comme du code** : Chaque version du dataset doit être identifiable et récupérable. Utiliser DVC, Git LFS ou un système équivalent pour garantir la reproductibilité des expériences.


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
