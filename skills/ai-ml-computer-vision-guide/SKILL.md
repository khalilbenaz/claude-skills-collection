---
name: ai-ml-computer-vision-guide
description: "Guide computer vision (classification, détection, segmentation) avec PyTorch, TensorFlow, OpenCV"
triggers:
  - "computer vision"
  - "détection d'objets"
  - "YOLO"
  - "classification d'images"
  - "segmentation"
---

# Computer Vision Guide

Guide complet pour la conception et l'implémentation de solutions de computer vision couvrant la classification, la détection d'objets et la segmentation d'images.

## Workflow

### 1. Analyser le problème de vision et choisir l'approche

- Identifier le type de tâche : classification, détection d'objets, segmentation sémantique/d'instance, pose estimation
- Évaluer la complexité du problème (nombre de classes, variabilité des images, taille des objets)
- Choisir le framework adapté : PyTorch (recherche, flexibilité), TensorFlow (production, mobile), OpenCV (traitement classique)
- Déterminer les contraintes de déploiement (temps réel, edge, cloud, mobile)
- Évaluer si une approche par transfer learning est suffisante ou si un entraînement from scratch est nécessaire

### 2. Préparer le dataset d'images

- Collecter et organiser les images avec une structure de dossiers cohérente
- Annoter les images selon la tâche (bounding boxes pour la détection, masques pour la segmentation, labels pour la classification)
- Utiliser des outils d'annotation adaptés : LabelImg, CVAT, Roboflow, VGG Image Annotator
- Convertir les annotations au format requis (COCO, Pascal VOC, YOLO format)
- Vérifier la qualité des annotations (chevauchements, classes manquantes, erreurs de labelling)
- Créer les splits stratifiés en maintenant la distribution des classes

### 3. Implémenter le pipeline de prétraitement et d'augmentation

- Définir les transformations de base : redimensionnement, normalisation (ImageNet mean/std si transfer learning)
- Configurer les augmentations d'entraînement avec Albumentations ou torchvision.transforms
- Appliquer des augmentations géométriques : rotation, flip horizontal/vertical, crop aléatoire, affine
- Appliquer des augmentations photométriques : ajustement de luminosité, contraste, saturation, bruit gaussien
- Utiliser des augmentations avancées si nécessaire : Mixup, CutMix, Mosaic (pour YOLO)
- Créer un DataLoader/Dataset performant avec chargement parallèle et prefetching

### 4. Sélectionner et configurer le modèle

- Pour la classification : ResNet, EfficientNet, Vision Transformer (ViT), ConvNeXt
- Pour la détection : YOLOv8/v9/v10, Faster R-CNN, DETR, RT-DETR
- Pour la segmentation : U-Net, Mask R-CNN, SAM (Segment Anything), DeepLab
- Charger les poids pré-entraînés (ImageNet, COCO) et adapter la tête de sortie
- Configurer le nombre de classes, la résolution d'entrée et les anchor boxes si applicable

### 5. Entraîner le modèle

- Configurer l'optimiseur (AdamW, SGD avec momentum) et le scheduler (cosine annealing, step decay)
- Définir la loss appropriée (CrossEntropy, Focal Loss, IoU Loss, Dice Loss selon la tâche)
- Appliquer le transfer learning : geler le backbone initialement, puis fine-tuner progressivement
- Monitorer les métriques spécifiques : mAP pour la détection, IoU/Dice pour la segmentation, top-k accuracy pour la classification
- Utiliser la mixed precision (FP16/BF16) pour accélérer l'entraînement et réduire la mémoire

### 6. Évaluer et visualiser les résultats

- Calculer les métriques finales sur le set de test (mAP@0.5, mAP@0.5:0.95, IoU, precision/recall par classe)
- Générer la matrice de confusion et les courbes precision-recall
- Visualiser les prédictions sur des exemples représentatifs (bounding boxes, masques superposés)
- Analyser les erreurs : faux positifs, faux négatifs, classes confondues
- Évaluer les performances par catégorie pour identifier les classes faibles

### 7. Optimiser pour le déploiement

- Exporter le modèle au format adapté (ONNX, TorchScript, TensorRT, Core ML, TFLite)
- Appliquer la quantification (INT8, FP16) pour réduire la taille et accélérer l'inférence
- Benchmarker la latence et le throughput sur le hardware cible
- Implémenter le post-traitement optimisé (NMS, filtrage de confiance)
- Tester la robustesse sur des images dégradées (bruit, flou, éclairage variable)

## Rules

1. **Toujours visualiser les données avant d'entraîner** : Inspecter manuellement un échantillon d'images et d'annotations pour détecter les erreurs de labelling, les biais visuels et les cas atypiques. Un modèle ne peut pas compenser des annotations incorrectes.

2. **Utiliser le transfer learning par défaut** : Sauf cas très spécifique (imagerie médicale très différente d'ImageNet, images non naturelles), toujours partir de poids pré-entraînés. Entraîner from scratch nécessite beaucoup plus de données et de temps.

3. **Adapter les métriques à la tâche métier** : La accuracy globale est souvent trompeuse. Utiliser mAP pour la détection, IoU pour la segmentation, et considérer le coût métier des faux positifs vs faux négatifs pour calibrer le seuil de confiance.

4. **Tester sur des conditions réelles** : Les images de test doivent refléter les conditions réelles de déploiement (éclairage, angle, résolution, occlusions). Un modèle performant sur un dataset propre peut échouer en conditions réelles.
