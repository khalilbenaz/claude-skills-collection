---
name: ai-ml-model-optimization-guide
description: "Optimisation de modèles ML pour l'inférence (quantization, pruning, distillation, ONNX)"
triggers:
  - "quantization"
  - "pruning"
  - "distillation"
  - "ONNX"
  - "optimiser un modèle"
  - "inférence rapide"
---

# Model Optimization Guide

Guide complet pour l'optimisation de modèles de machine learning en vue du déploiement : réduction de taille, accélération de l'inférence et préservation des performances.

## Workflow

### 1. Profiler le modèle et établir les objectifs

- Mesurer les performances de base du modèle non optimisé (latence, throughput, taille mémoire)
- Profiler l'inférence pour identifier les goulots d'étranglement (couches les plus coûteuses, transferts mémoire)
- Utiliser des outils de profiling : PyTorch Profiler, TensorFlow Profiler, NVIDIA Nsight
- Définir les objectifs cibles (latence max, taille max du modèle, budget mémoire, hardware cible)
- Établir le seuil minimal de performance acceptable (dégradation maximale tolérée en accuracy/F1)

### 2. Appliquer la quantification

- Choisir le type de quantification selon les besoins :
  - Post-Training Quantization (PTQ) : rapide, sans réentraînement (FP32 vers INT8 ou FP16)
  - Quantization-Aware Training (QAT) : meilleure qualité, nécessite un réentraînement
  - Quantification dynamique : quantifie les activations à la volée
- Configurer la calibration pour PTQ avec un échantillon représentatif du dataset
- Appliquer la quantification par couche (certaines couches sensibles restent en FP32)
- Valider les métriques après quantification et comparer avec le modèle original
- Pour les LLM : utiliser GPTQ, AWQ ou bitsandbytes pour la quantification 4-bit/8-bit

### 3. Implémenter le pruning (élagage)

- Choisir la stratégie de pruning :
  - Non structuré : met à zéro les poids individuels (sparsity)
  - Structuré : supprime des neurones, filtres ou couches entières
  - Semi-structuré : pattern 2:4 pour les GPU NVIDIA Ampere+
- Définir le ratio de pruning cible (typiquement 30-90% selon la tolérance)
- Appliquer le pruning progressif : augmenter graduellement le taux d'élagage sur plusieurs epochs
- Réentraîner (fine-tuning) le modèle élagué pour récupérer les performances perdues
- Évaluer l'impact du pruning sur chaque couche pour identifier les couches sensibles

### 4. Mettre en oeuvre la distillation de connaissances

- Sélectionner le modèle enseignant (teacher) : le modèle original performant
- Concevoir le modèle élève (student) : architecture plus petite mais adaptée à la tâche
- Configurer la loss de distillation : combinaison de la loss standard et de la KL-divergence sur les logits
- Ajuster la température de softmax (typiquement T=2 à T=20) et le ratio alpha entre les deux losses
- Entraîner l'élève en utilisant simultanément les labels réels et les soft labels du teacher
- Comparer les performances de l'élève avec le teacher et un modèle entraîné sans distillation

### 5. Exporter et optimiser avec ONNX

- Exporter le modèle au format ONNX via torch.onnx.export ou tf2onnx
- Vérifier la validité du graphe ONNX (onnx.checker, comparaison des sorties)
- Appliquer les optimisations du graphe avec ONNX Runtime :
  - Fusion d'opérateurs (conv+bn, matmul+add)
  - Élimination des noeuds redondants
  - Optimisation de la mémoire (réutilisation des buffers)
- Configurer les execution providers adaptés au hardware (CUDA, TensorRT, OpenVINO, DirectML)
- Benchmarker ONNX Runtime vs le framework original sur des données réelles

### 6. Appliquer les optimisations spécifiques au hardware

- Pour GPU NVIDIA : compiler avec TensorRT pour des gains majeurs de latence
- Pour CPU Intel : utiliser OpenVINO ou ONNX Runtime avec MKL-DNN
- Pour mobile : convertir en TFLite (Android), Core ML (iOS) ou ONNX Mobile
- Pour edge : utiliser des frameworks spécialisés (TensorRT pour Jetson, NNAPI pour Android)
- Activer les optimisations de batching dynamique et de parallélisme d'inférence
- Exploiter la mixed precision (FP16/BF16) sur les GPU compatibles

### 7. Valider et benchmarker le modèle optimisé

- Comparer les métriques de qualité avant/après chaque optimisation (accuracy, F1, mAP)
- Mesurer la latence (P50, P95, P99) sur le hardware de production
- Calculer le throughput (inférences/seconde) en conditions de charge réalistes
- Vérifier la cohérence numérique entre le modèle original et optimisé sur un jeu de test
- Documenter le trade-off performance/qualité pour chaque technique appliquée
- Tester la stabilité sous charge prolongée (memory leaks, dégradation de latence)

## Rules

1. **Mesurer avant d'optimiser** : Toujours profiler le modèle pour identifier les vrais goulots d'étranglement. Optimiser sans mesurer conduit à des efforts inutiles sur des composants qui ne sont pas limitants.

2. **Optimiser de manière incrémentale** : Appliquer une technique à la fois et mesurer l'impact. Combiner quantification, pruning et distillation simultanément rend impossible l'identification de la source d'une dégradation.

3. **Valider numériquement chaque étape** : Après chaque transformation (export ONNX, quantification, pruning), comparer les sorties du modèle optimisé avec l'original sur un jeu de référence. Des écarts silencieux peuvent apparaître lors des conversions.

4. **Adapter l'optimisation au hardware cible** : Une optimisation performante sur GPU peut être contre-productive sur CPU. Toujours benchmarker sur le hardware réel de déploiement, pas uniquement sur la machine de développement.

5. **Documenter les compromis** : Chaque optimisation implique un trade-off entre taille, vitesse et qualité. Documenter précisément ces compromis pour permettre une prise de décision éclairée lors du déploiement.
