---
name: computer-vision-guide
description: "Guide computer vision (classification, détection, segmentation) avec PyTorch, TensorFlow, OpenCV — critères de choix de modèle, pipelines annotés, snippets copiables, optimisation pour le déploiement edge/cloud"
triggers:
  - "computer vision"
  - "détection d'objets"
  - "YOLO"
  - "classification d'images"
  - "segmentation"
---

# Computer Vision Guide

Guide opérationnel pour concevoir, entraîner et déployer des solutions de vision par ordinateur : classification, détection d'objets, segmentation sémantique/d'instance.

---

## 1. Choisir la bonne tâche et le bon modèle

### Critères de décision

| Besoin | Tâche | Modèles recommandés (2026) |
|---|---|---|
| « Qu'est-ce que c'est ? » | Classification | EfficientNetV2, ConvNeXt-v2, ViT-S/16 |
| « Où est l'objet ? » (boîtes) | Détection | YOLOv10/v11, RT-DETR, Co-DETR |
| « Pixel par pixel, quelle classe ? » | Segmentation sémantique | SegFormer-B4, OneFormer |
| « Chaque instance séparément ? » | Segmentation d'instance | Mask2Former, YOLOv8-seg |
| « N'importe quel objet à prompter » | Segmentation zéro-shot | SAM 2 (Meta) |
| Traitement bas-niveau (filtrage, calibration) | Vision classique | OpenCV (pas de DL) |

**Règle de décision rapide :**
- Contraintes temps réel & edge → YOLO (v10+) ou EfficientDet
- Précision maximale, budget GPU → Co-DETR, Mask2Former
- Peu de données (< 500 images) → fine-tuning d'un modèle fondation (SAM 2, DINOv2)
- Mobile/embarqué → MobileNetV4, YOLO-NAS-s, TFLite

---

## 2. Préparer le dataset

### Structure de dossiers (classification)
```
data/
  train/
    chien/ img001.jpg …
    chat/  img002.jpg …
  val/
  test/
```

### Outils d'annotation recommandés

| Outil | Détection | Segmentation | Gratuit |
|---|---|---|---|
| CVAT (auto-annotate avec SAM) | ✓ | ✓ | ✓ |
| Roboflow | ✓ | ✓ | freemium |
| LabelImg | ✓ | ✗ | ✓ |

### Convertir vers YOLO format (depuis COCO)
```bash
pip install roboflow
# ou directement via la CLI Roboflow
roboflow convert -f yolov8 -i coco_annotations.json -o ./yolo_dataset
```

### Vérifier la distribution des classes
```python
from collections import Counter
import json

with open("annotations/instances_train.json") as f:
    coco = json.load(f)

cat_ids = {c["id"]: c["name"] for c in coco["categories"]}
counts = Counter(ann["category_id"] for ann in coco["annotations"])
for cid, n in counts.most_common():
    print(f"{cat_ids[cid]}: {n}")
```

**Seuils pratiques :**
- Classification : min 200 images / classe pour du transfer learning
- Détection : min 300 instances / classe (idéalement 1 000+)
- Segmentation : 150–500 masques / classe selon la variabilité

---

## 3. Pipeline d'augmentation (Albumentations)

```python
import albumentations as A
from albumentations.pytorch import ToTensorV2

train_transform = A.Compose([
    A.RandomResizedCrop(640, 640, scale=(0.5, 1.0)),
    A.HorizontalFlip(p=0.5),
    A.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05, p=0.7),
    A.GaussNoise(var_limit=(10, 50), p=0.3),
    A.MotionBlur(blur_limit=7, p=0.2),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ToTensorV2(),
], bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"]))

val_transform = A.Compose([
    A.Resize(640, 640),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ToTensorV2(),
])
```

**Augmentations avancées :**
- `Mosaic` (4 images en une) : intégrée dans YOLOv8+, activer avec `mosaic=1.0`
- `Mixup` : efficace en classification, moins utile en détection
- `CopyPaste` : excellent pour les objets rares ou petits

---

## 4. Entraîner avec YOLOv8/v10 (cas le plus courant)

```bash
pip install ultralytics
```

```python
from ultralytics import YOLO

# Entraînement détection
model = YOLO("yolov8m.pt")  # n/s/m/l/x selon le compromis taille/perf
results = model.train(
    data="dataset.yaml",       # chemins train/val/test + noms de classes
    epochs=100,
    imgsz=640,
    batch=16,
    lr0=1e-3,
    lrf=0.01,
    optimizer="AdamW",
    amp=True,                  # mixed precision automatique
    patience=20,               # early stopping
    project="runs/detect",
    name="exp1",
)

# Évaluation
metrics = model.val()
print(f"mAP50: {metrics.box.map50:.3f}")
print(f"mAP50-95: {metrics.box.map:.3f}")
```

### Fine-tuning PyTorch (classification)

```python
import torch
import torchvision.models as models
import torch.nn as nn

model = models.efficientnet_v2_s(weights="IMAGENET1K_V1")
# Geler le backbone
for param in model.features.parameters():
    param.requires_grad = False
# Remplacer la tête
model.classifier[1] = nn.Linear(model.classifier[1].in_features, NUM_CLASSES)

optimizer = torch.optim.AdamW([
    {"params": model.features.parameters(), "lr": 1e-5},    # backbone dégelé au cycle 2
    {"params": model.classifier.parameters(), "lr": 1e-3},
], weight_decay=1e-4)

scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=30)
```

---

## 5. Métriques et évaluation

| Tâche | Métrique principale | Métriques secondaires |
|---|---|---|
| Classification | Top-1 Accuracy | Top-5, F1 par classe |
| Détection | mAP@0.5:0.95 | mAP@0.5, precision, recall par classe |
| Segmentation | mIoU | Dice, precision par classe |

```python
# Matrice de confusion (classification)
from sklearn.metrics import classification_report, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

report = classification_report(y_true, y_pred, target_names=class_names)
print(report)

ConfusionMatrixDisplay.from_predictions(y_true, y_pred, display_labels=class_names)
plt.savefig("confusion_matrix.png", dpi=150)
```

---

## 6. Optimiser pour le déploiement

### Exporter en ONNX
```python
model.export(format="onnx", opset=17, simplify=True, dynamic=False, imgsz=640)
```

### Inférence ONNX (sans GPU requis)
```python
import onnxruntime as ort
import numpy as np

session = ort.InferenceSession("model.onnx", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
input_name = session.get_inputs()[0].name
outputs = session.run(None, {input_name: img_tensor.numpy()})
```

### Quantification INT8 (TensorRT)
```bash
# Via trtexec
trtexec --onnx=model.onnx --int8 --saveEngine=model_int8.trt --minShapes=input:1x3x640x640 --maxShapes=input:8x3x640x640
```

### Comparatif formats de déploiement

| Format | Latence | Taille | Compatibilité |
|---|---|---|---|
| PyTorch (FP32) | baseline | baseline | GPU/CPU Python |
| ONNX (FP32) | −10 à −20 % | = | Multi-runtime, multi-OS |
| TensorRT INT8 | −50 à −80 % | /4 | NVIDIA GPU uniquement |
| TFLite INT8 | −40 % | /4 | Mobile Android/iOS |
| Core ML | −30 % | /2 | Apple silicon |

---

## 7. Garde-fous, anti-patterns et pièges

### Pièges classiques

- **Data leakage** : images similaires (ex. burst photo) dans train ET val → métriques trop optimistes. Toujours hasher ou dédupliquer avant de splitter.
- **Class imbalance ignorée** : utiliser `WeightedRandomSampler` ou Focal Loss, jamais se contenter de la distribution brute.
- **Normalisation incohérente** : entraîner avec ImageNet mean/std puis inférer sans normalisation → prédictions aléatoires.
- **NMS mal configuré** : `iou_threshold` trop bas = faux doublons supprimés ; trop haut = objets superposés non détectés. Tester 0.45–0.65.
- **Résolution trop faible** : les petits objets (< 32×32 px) sont quasi-invisibles à 416×416 — utiliser 640 ou 1280.
- **Annotations incomplètes** : les objets non annotés sont traités comme négatifs → la loss pénalise les vrais positifs.

### Anti-patterns

- Entraîner from scratch avec < 5 000 images — toujours fine-tuner.
- Utiliser la accuracy sur des classes déséquilibrées (95 % d'une classe = 95 % "gratuits").
- Déployer sans tester sur des images dégradées (flou, bruit JPEG, éclairage nocturne).
- Augmenter agressivement sans vérifier visuellement que les bounding boxes suivent la transformation.
- Confier le choix du seuil de confiance au modèle : le calibrer sur val selon le trade-off métier (coût FP vs FN).

### Bonnes pratiques 2026

- Utiliser **DINOv2** ou **SAM 2** comme backbone ou annotateur automatique pour réduire le besoin en annotations manuelles.
- Activer **torch.compile()** (PyTorch 2.x) pour +20–40 % de vitesse d'entraînement sans changement de code.
- Logger les expériences avec **MLflow** ou **Weights & Biases** dès le premier run.
- Versionner les datasets avec **DVC** ou **Roboflow Versions** — ne jamais modifier un dataset en place.
- Monitorer la distribution des données en production (**data drift**) : les performances dégradent dès que la distribution change.
