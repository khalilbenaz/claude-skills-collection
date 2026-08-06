---
name: ai-ml-model-fine-tuner
description: Guide pour le fine-tuning de modèles ML/LLM (LoRA, QLoRA, PEFT, datasets, hyperparamètres) — workflow étape par étape, snippets copiables, critères de choix, anti-patterns 2026. Se déclenche avec "fine-tuning", "fine-tune", "LoRA", "QLoRA", "PEFT", "adapter", "entraîner un modèle".
---

# Model Fine-Tuner

## Critères de décision : quelle méthode choisir ?

| Situation | Méthode recommandée |
|---|---|
| GPU < 24 Go, LLM > 7B | QLoRA 4-bit |
| GPU 24–80 Go, besoin de vitesse | LoRA bfloat16 |
| Petite tâche de classification | Full fine-tune BERT/DeBERTa |
| Tâche très spécifique, budget compute | IA3 ou Prefix Tuning |
| Modèle > 70B, multi-GPU | FSDP + LoRA |
| Données < 500 exemples | Prompt engineering d'abord, fine-tune ensuite |

---

## Workflow

### 1. Baseline — mesurer avant de toucher quoi que ce soit

```bash
# Exemple : évaluer Mistral-7B zero-shot sur votre tâche
python eval.py --model mistralai/Mistral-7B-v0.3 --dataset data/test.jsonl --metric f1
```

Sans baseline chiffrée, l'amélioration est invérifiable. Loguer la baseline dans MLflow/W&B immédiatement.

### 2. Préparer le dataset

Format instruction/response (standard Alpaca / ChatML) :

```python
# Format Alpaca
{"instruction": "Classe cette phrase.", "input": "Le produit est excellent.", "output": "positif"}

# Format ChatML (préféré pour les LLM modernes)
{"messages": [
  {"role": "system", "content": "Tu es un classificateur de sentiment."},
  {"role": "user", "content": "Le produit est excellent."},
  {"role": "assistant", "content": "positif"}
]}
```

Validation obligatoire avant entraînement :

```python
from datasets import load_dataset
ds = load_dataset("json", data_files={"train": "train.jsonl", "test": "test.jsonl"})

# Vérifier la distribution des labels
from collections import Counter
Counter(ds["train"]["label"])

# Vérifier les longueurs de tokens
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-v0.3")
lengths = [len(tok(x["instruction"] + x["output"])["input_ids"]) for x in ds["train"]]
print(f"max={max(lengths)}, p95={sorted(lengths)[int(0.95*len(lengths))]}")
```

Règle : si p95 > `max_seq_length`, tronquer ou filtrer — ne jamais silencieusement perdre des tokens en production.

### 3. Configurer LoRA / QLoRA

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, TaskType
import torch

# QLoRA 4-bit (≈ 5 Go pour 7B)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.3",
    quantization_config=bnb_config,
    device_map="auto",
)

lora_config = LoraConfig(
    r=16,              # rang : 8 (léger) → 64 (expressif)
    lora_alpha=32,     # scaling = alpha/r, garder alpha = 2*r
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(model)
model.print_trainable_parameters()
# → "trainable params: 4,194,304 || all params: 3,756,462,080 || trainable%: 0.1117"
```

Choix du rang `r` :
- `r=8` : cas courants, peu de données
- `r=16`–`32` : tâche complexe ou domaine très spécialisé
- `r=64`+ : rarement justifié, coût élevé pour gain marginal

### 4. Hyperparamètres d'entraînement

```python
from transformers import TrainingArguments
from trl import SFTTrainer

args = TrainingArguments(
    output_dir="./checkpoints",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,      # batch effectif = 16
    learning_rate=2e-4,                 # LoRA : 1e-4 à 3e-4 ; full FT : 5e-5
    lr_scheduler_type="cosine",
    warmup_ratio=0.05,
    weight_decay=0.01,
    bf16=True,
    gradient_checkpointing=True,        # économise ~30 % VRAM
    logging_steps=10,
    save_strategy="epoch",
    evaluation_strategy="epoch",
    load_best_model_at_end=True,
    report_to="wandb",                  # ou "mlflow"
)

trainer = SFTTrainer(
    model=model,
    args=args,
    train_dataset=ds["train"],
    eval_dataset=ds["test"],
    dataset_text_field="text",
    max_seq_length=2048,
    peft_config=lora_config,
)
trainer.train()
```

Référence GPU / batch size pour Mistral-7B QLoRA :

| VRAM | batch_size | grad_accum | batch effectif |
|---|---|---|---|
| 8 Go | 1 | 16 | 16 |
| 16 Go | 2 | 8 | 16 |
| 24 Go | 4 | 4 | 16 |
| 80 Go (A100) | 16 | 1 | 16 |

### 5. Monitoring et early stopping

```python
from transformers import EarlyStoppingCallback

trainer.add_callback(EarlyStoppingCallback(early_stopping_patience=3))
```

Surveiller dans W&B :
- `eval/loss` doit descendre en parallèle de `train/loss`
- Si `eval/loss` remonte alors que `train/loss` descend → surapprentissage → stop
- Grad norm instable (> 10) → baisser le LR ou augmenter le warmup

### 6. Évaluation post-entraînement

```python
# Métriques standards selon la tâche
from evaluate import load

# Génération
rouge = load("rouge")
bleu  = load("sacrebleu")

# Classification
accuracy = load("accuracy")
f1       = load("f1")

results = rouge.compute(predictions=preds, references=refs, use_stemmer=True)
print(results)  # {'rouge1': 0.52, 'rouge2': 0.30, 'rougeL': 0.48, ...}
```

Tests manuels indispensables : 20–30 exemples représentatifs + 10 cas limites. Les métriques automatiques ne capturent pas les hallucinations ou les formats cassés.

### 7. Fusion et export

```python
# Fusionner l'adaptateur LoRA dans le modèle de base
from peft import PeftModel

base_model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.3", torch_dtype=torch.bfloat16
)
merged = PeftModel.from_pretrained(base_model, "./checkpoints/best")
merged = merged.merge_and_unload()

merged.save_pretrained("./final-model", safe_serialization=True)
tokenizer.save_pretrained("./final-model")

# Export GGUF pour déploiement CPU/edge (via llama.cpp)
# python llama.cpp/convert_hf_to_gguf.py ./final-model --outtype q5_k_m
```

### 8. Itération ciblée

Analyser les erreurs par catégorie :

```python
errors = [(ex["input"], pred, ref) for pred, ref in zip(preds, refs) if pred != ref]
# Regrouper par type d'erreur → enrichir le dataset là où ça échoue
```

Ajouter des exemples synthétiques (GPT-4o, Claude) pour les cas rares, en vérifiant manuellement un échantillon de 10 %.

---

## Anti-patterns et pièges

**Données**
- Inclure des exemples du set de test dans le train → métriques gonflées artificiellement.
- Dataset déséquilibré sans rééchantillonnage → modèle qui ignore la classe minoritaire.
- Séquences tronquées silencieusement → le modèle n'apprend que le début.

**Entraînement**
- LR trop élevé (> 5e-4 pour LoRA) → instabilité, loss NaN. Réduire de moitié et reprendre.
- Oublier `prepare_model_for_kbit_training()` avant LoRA sur un modèle quantifié → erreurs de gradient.
- Gradient checkpointing sans `use_reentrant=False` sur PyTorch ≥ 2.1 → warning + dégradation perf.

**Évaluation**
- Évaluer uniquement sur le train set → surapprentissage non détecté.
- Utiliser BLEU comme seule métrique pour la génération → ne capte pas la fluidité ni les faits.

**Export**
- Déployer l'adaptateur sans fusion → dépendance à la lib PEFT en production, latence supplémentaire.
- Publier le modèle fusionné sans vérifier la licence de la base (ex: LLaMA 3 — usage commercial limité).

---

## Bonnes pratiques 2026

- **unsloth** : bibliothèque qui accélère QLoRA de 2×, réduit la VRAM de 60 %, compatible HuggingFace. À préférer pour du fine-tuning mono-GPU.
- **Flash Attention 2** : activer via `attn_implementation="flash_attention_2"` — réduit la VRAM quadratique en linéaire sur les longues séquences.
- **DPO / ORPO** après SFT : pour aligner le comportement sur des préférences humaines sans RLHF complet (TRL ≥ 0.9).
- **Model card obligatoire** : documenter les données d'entraînement, les limites connues et les métriques avant tout déploiement.
- **Reproductibilité** : fixer `seed=42` dans `TrainingArguments` et versionner le dataset avec `datasets` SHA ou DVC.


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
