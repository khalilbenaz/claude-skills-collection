---
name: model-optimization-guide
description: "Optimisation de modèles ML pour l'inférence (quantization, pruning, distillation, ONNX) — guide opérationnel avec snippets copiables, critères de choix et anti-patterns. Se déclenche avec \"quantization\", \"pruning\", \"distillation\", \"ONNX\", \"optimiser un modèle\", \"inférence rapide\""
triggers:
  - "quantization"
  - "pruning"
  - "distillation"
  - "ONNX"
  - "optimiser un modèle"
  - "inférence rapide"
---

# Model Optimization Guide

Guide opérationnel pour réduire la taille et accélérer l'inférence d'un modèle ML sans régresser les métriques métier.

## Critères de décision rapides

| Contrainte principale | Technique recommandée |
|---|---|
| Déploiement sans GPU, CPU seul | PTQ INT8 + ONNX Runtime (OpenVINO EP) |
| Latence < 20 ms sur GPU NVIDIA | TensorRT FP16 ou INT8 |
| Modèle trop gros pour mémoire edge | Pruning structuré + TFLite/CoreML |
| LLM > 7B à servir sur 1 GPU | GPTQ 4-bit ou AWQ |
| Contrainte de qualité stricte (< 0,5 % drop) | QAT ou distillation |
| Pipeline cross-framework | ONNX export + ORT |

---

## Workflow en 7 étapes

### 1. Profiler et fixer les objectifs

**Avant toute optimisation**, mesurer la baseline sur le hardware de production.

```python
# PyTorch Profiler (CPU+GPU)
import torch
from torch.profiler import profile, ProfilerActivity

with profile(activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
             record_shapes=True, profile_memory=True) as prof:
    model(inputs)

print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=15))
prof.export_chrome_trace("trace.json")  # ouvrir dans chrome://tracing
```

Grille d'objectifs à remplir avant de commencer :

| Métrique | Valeur actuelle | Cible | Tolérance dégradation |
|---|---|---|---|
| Latence P95 (ms) | ? | ? | +0 % |
| Taille modèle (MB) | ? | ? | — |
| Accuracy / F1 | ? | — | -0,5 % max |
| VRAM / RAM (MB) | ? | ? | — |

---

### 2. Quantification (technique la plus rapide)

**PTQ INT8 — PyTorch (sans réentraînement)**
```python
import torch.quantization as tq

model.eval()
model.qconfig = tq.get_default_qconfig('fbgemm')   # CPU x86
# ou 'qnnpack' pour ARM/mobile
tq.prepare(model, inplace=True)

# Calibration : passer ~100-500 exemples représentatifs
for batch in calibration_loader:
    model(batch)

tq.convert(model, inplace=True)
torch.save(model.state_dict(), "model_int8.pt")
```

**PTQ FP16 — ONNX Runtime (le plus portable)**
```python
from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    "model.onnx",
    "model_int8.onnx",
    weight_type=QuantType.QInt8
)
```

**LLM — bitsandbytes 4-bit (Hugging Face)**
```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)
model = AutoModelForCausalLM.from_pretrained("mistralai/Mistral-7B-v0.1",
                                              quantization_config=bnb_config,
                                              device_map="auto")
```

**QAT (quand PTQ dégrade > seuil)**
```python
model.train()
model.qconfig = tq.get_default_qat_qconfig('fbgemm')
tq.prepare_qat(model, inplace=True)
# Fine-tune 3-5 epochs avec LR réduit (~10x)
trainer.train()
tq.convert(model.eval(), inplace=True)
```

---

### 3. Pruning (élagage)

**Choix de la stratégie :**
- Non structuré → sparsité maximale, gains réels seulement avec bibliothèques sparse (cuSPARSE, SparseML)
- Structuré (filtres/couches) → gains directs sur CPU/GPU classiques ✓
- 2:4 semi-structuré → gain x2 sur GPU NVIDIA Ampere+ via sparsité matérielle ✓

```python
import torch.nn.utils.prune as prune

# Pruning structuré : supprimer 30 % des filtres conv
prune.ln_structured(model.layer1[0].conv1, name='weight', amount=0.3, n=2, dim=0)

# Pruning global non structuré (tous les modules conv+linear)
parameters_to_prune = [
    (module, 'weight')
    for module in model.modules()
    if isinstance(module, (torch.nn.Conv2d, torch.nn.Linear))
]
prune.global_unstructured(parameters_to_prune,
                           pruning_method=prune.L1Unstructured,
                           amount=0.4)

# Rendre le pruning permanent
for module, _ in parameters_to_prune:
    prune.remove(module, 'weight')
```

Après pruning, **fine-tuner obligatoirement** 3-10 epochs avec LR = 1/10 du LR d'origine.

---

### 4. Distillation de connaissances

Quand on veut un modèle student 5-10x plus petit avec < 1 % de dégradation.

```python
import torch.nn.functional as F

def distillation_loss(student_logits, teacher_logits, labels,
                      temperature=4.0, alpha=0.7):
    # Soft loss (KL divergence sur les distributions adoucies)
    soft_targets = F.softmax(teacher_logits / temperature, dim=-1)
    soft_student = F.log_softmax(student_logits / temperature, dim=-1)
    kd_loss = F.kl_div(soft_student, soft_targets, reduction='batchmean') * (temperature ** 2)

    # Hard loss (cross-entropy sur les vrais labels)
    ce_loss = F.cross_entropy(student_logits, labels)

    return alpha * kd_loss + (1 - alpha) * ce_loss
```

Valeurs de départ : `temperature=4`, `alpha=0.7`. Augmenter `temperature` si le teacher est très confiant.

---

### 5. Export ONNX et optimisation du graphe

```python
import torch
import onnx
from onnxruntime.tools.optimizer import optimize_model

# Export
dummy_input = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy_input, "model.onnx",
    opset_version=17,
    input_names=["input"], output_names=["output"],
    dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}}
)

# Vérification
onnx.checker.check_model("model.onnx")

# Optimisation du graphe (fusion conv+bn, élimination nœuds morts)
optimized = optimize_model("model.onnx", model_type="bert")  # ou "gpt2", "vit"
optimized.save_model_to_file("model_opt.onnx")
```

**Benchmark ONNX Runtime vs PyTorch :**
```python
import onnxruntime as ort, time, numpy as np

sess = ort.InferenceSession("model_opt.onnx",
       providers=["CUDAExecutionProvider", "CPUExecutionProvider"])

inp = {"input": np.random.randn(1, 3, 224, 224).astype(np.float32)}
# Warmup
for _ in range(10): sess.run(None, inp)

t0 = time.perf_counter()
for _ in range(200): sess.run(None, inp)
print(f"ORT latency: {(time.perf_counter()-t0)/200*1000:.2f} ms")
```

---

### 6. Optimisations hardware spécifiques

**TensorRT (GPU NVIDIA) :**
```bash
# Convertir ONNX → TensorRT engine FP16
trtexec --onnx=model_opt.onnx \
        --saveEngine=model_fp16.trt \
        --fp16 \
        --workspace=4096 \
        --minShapes=input:1x3x224x224 \
        --optShapes=input:8x3x224x224 \
        --maxShapes=input:32x3x224x224
```

**OpenVINO (Intel CPU/GPU) :**
```bash
mo --input_model model.onnx \
   --compress_to_fp16 \
   --output_dir openvino_model/
```

**TFLite (mobile Android/iOS) :**
```python
converter = tf.lite.TFLiteConverter.from_saved_model("saved_model/")
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.float16]
tflite_model = converter.convert()
open("model.tflite", "wb").write(tflite_model)
```

---

### 7. Validation et benchmarking final

```python
# Checklist de validation avant déploiement
import numpy as np

def validate_optimization(original_model, optimized_runner, test_loader, tol=1e-3):
    diffs = []
    for inputs, _ in test_loader:
        ref = original_model(inputs).detach().numpy()
        opt = optimized_runner(inputs)
        diffs.append(np.abs(ref - opt).max())
    print(f"Max output diff: {max(diffs):.6f} (tol={tol})")
    assert max(diffs) < tol, "REGRESSION NUMERIQUE DETECTEE"
```

Métriques à documenter impérativement :

| Métrique | Avant | Après | Delta |
|---|---|---|---|
| Accuracy / F1 | | | |
| Latence P95 ms | | | |
| Taille fichier MB | | | |
| VRAM peak MB | | | |
| Throughput img/s | | | |

---

## Anti-patterns et pièges

**1. Optimiser sans mesurer sur le hardware cible**
INT8 sur CPU x86 peut être plus lent que FP32 si les opérateurs ne sont pas supportés nativement. Toujours mesurer sur le vrai hardware.

**2. Combiner toutes les techniques d'un coup**
Quantification + pruning + distillation ensemble = impossible de diagnostiquer la source de dégradation. Une technique à la fois, mesurer entre chaque.

**3. Calibration non représentative pour PTQ**
Calibrer sur le jeu de test → fuite d'information. Calibrer sur un sous-ensemble du train. 100-500 exemples suffisent ; plus n'améliore pas.

**4. Ignorer les couches sensibles**
Premières et dernières couches du réseau sont souvent très sensibles à la quantification. Utiliser `per-channel` plutôt que `per-tensor`, ou les laisser en FP32.

**5. Oublier le dynamic batching**
Un modèle optimisé pour batch=1 peut ne pas bénéficier du throughput à batch=32. Configurer `dynamic_axes` à l'export ONNX et profiler les deux cas.

**6. Ne pas vérifier la cohérence numérique**
Les exporteurs ONNX ont des bugs sur certains opérateurs (attention masks, custom layers). Toujours comparer les sorties sur un jeu fixe.

**7. Pruning non structuré sans framework sparse**
PyTorch met les poids à zéro mais la couche reste dense en mémoire. Gain réel uniquement avec SparseML, DeepSparse ou en convertissant vers un format sparse explicite.

---

## Bonnes pratiques 2026

- **llm.int8() / bitsandbytes** : standard de facto pour les LLM > 3B sur GPU avec mémoire limitée.
- **AWQ (Activation-aware Weight Quantization)** : meilleure qualité que GPTQ à 4-bit, privilégier pour les LLM critiques.
- **torch.compile() (PyTorch 2.x)** : avant toute optimisation manuelle, tester `model = torch.compile(model, mode="reduce-overhead")` — gain gratuit 10-40 % sans perte de qualité.
- **Flash Attention 2/3** : pour les transformers, remplacer l'attention standard par `flash_attn` réduit la mémoire quadratique en linéaire et accélère x2-x4.
- **Continual calibration** : pour les modèles en production, recalibrer la quantification PTQ à chaque dérive significative de la distribution des données.
