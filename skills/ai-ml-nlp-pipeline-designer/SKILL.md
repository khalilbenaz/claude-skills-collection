---
name: ai-ml-nlp-pipeline-designer
description: Conception de pipelines NLP (tokenization, embeddings, NER, sentiment, summarization) — guide opérationnel avec snippets, critères de décision et anti-patterns. Se déclenche avec : \"NLP\", \"traitement du langage\", \"NER\", \"sentiment analysis\", \"text classification\", \"spaCy\", \"HuggingFace\". Se déclenche avec "NLP", "traitement du langage", "NER", "sentiment analysis", "text classification", "spaCy", "HuggingFace".
---

# NLP Pipeline Designer

Guide opérationnel pour concevoir et implémenter des pipelines NLP production-ready, de la tokenization aux tâches avancées.

---

## Étape 1 — Cadrer la tâche et choisir l'approche

**Questions à trancher avant tout code :**

| Critère | Approche légère | Approche Transformer |
|---|---|---|
| < 10 k exemples annotés | TF-IDF + sklearn | SetFit / few-shot |
| Latence < 50 ms | DistilBERT, FastText | Non |
| Corpus français | CamemBERT, FlauBERT | XLM-RoBERTa si multilingue |
| Généralisation zero-shot | Non | NLI (MNLI) ou GPT-4o |
| Tâche extractive simple | regex + spaCy rules | Rarement utile |

**Tâches → modèles recommandés (2026) :**
- Classification texte : `CamemBERT-base` (FR), `DeBERTa-v3-base` (EN)
- NER : `spaCy fr_core_news_lg` (règles + statistique), `bert-base-multilingual-cased` fine-tuné
- Sentiment : `nlptown/bert-base-multilingual-uncased-sentiment`, ou zero-shot `facebook/bart-large-mnli`
- Summarization : `facebook/bart-large-cnn`, `moussaKam/barthez-orangesum-abstract` (FR)
- QA extractif : `deepset/camembert-base-squad2` (FR)

---

## Étape 2 — Prétraitement du corpus

```python
import re, unicodedata
from langdetect import detect

def clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)               # strip HTML
    text = unicodedata.normalize("NFC", text)           # normalise unicode
    text = re.sub(r"http\S+|www\.\S+", "[URL]", text)  # masque URLs
    text = re.sub(r"\s+", " ", text).strip()
    return text

# Chunking pour textes longs (sliding window)
def chunk_text(text: str, max_tokens: int = 400, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), max_tokens - overlap):
        chunks.append(" ".join(words[i : i + max_tokens]))
    return chunks
```

**Points critiques :**
- Ne pas supprimer les stopwords avant un Transformer (il les utilise pour le contexte).
- Conserver la casse pour la NER (majuscules = signal fort pour les entités).
- Annoter la langue avant tout pipeline multilingue : `detect(text)` → filtrer/router.

---

## Étape 3 — Tokenization et DataLoader

```python
from transformers import AutoTokenizer
from torch.utils.data import Dataset, DataLoader

tokenizer = AutoTokenizer.from_pretrained("camembert-base")

class TextDataset(Dataset):
    def __init__(self, texts, labels, max_length=512):
        self.encodings = tokenizer(
            texts, truncation=True, padding=True,
            max_length=max_length, return_tensors="pt"
        )
        self.labels = labels

    def __getitem__(self, idx):
        item = {k: v[idx] for k, v in self.encodings.items()}
        item["labels"] = self.labels[idx]
        return item

    def __len__(self):
        return len(self.labels)

loader = DataLoader(TextDataset(train_texts, train_labels), batch_size=16, shuffle=True)
```

**Stratégie textes longs (> 512 tokens) :**
1. Troncation simple : acceptable si l'info utile est en début de texte.
2. Sliding window + vote : prédire sur chaque chunk, agréger (mean ou max).
3. Hierarchical model : encoder les phrases, puis encoder le document.

---

## Étape 4 — Fine-tuning

```python
from transformers import AutoModelForSequenceClassification, TrainingArguments, Trainer
import evaluate

model = AutoModelForSequenceClassification.from_pretrained("camembert-base", num_labels=3)

args = TrainingArguments(
    output_dir="./checkpoints",
    num_train_epochs=5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    learning_rate=2e-5,          # 2e-5 à 5e-5 pour BERT-like
    weight_decay=0.01,
    warmup_ratio=0.1,
    evaluation_strategy="epoch",
    save_strategy="best",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    fp16=True,                   # activer si GPU CUDA disponible
)

metric = evaluate.load("f1")
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = logits.argmax(-1)
    return metric.compute(predictions=preds, references=labels, average="macro")

trainer = Trainer(model=model, args=args,
                  train_dataset=train_ds, eval_dataset=val_ds,
                  compute_metrics=compute_metrics)
trainer.train()
```

**Hyperparamètres clés :**
- `learning_rate` : 2e-5 (sûr), 5e-5 si dataset > 10k, 1e-5 si on gèle les couches basses.
- `warmup_ratio` : 0.06–0.1 pour éviter les instabilités en début d'entraînement.
- Geler les 6 premières couches si < 1000 exemples : `for p in model.bert.encoder.layer[:6].parameters(): p.requires_grad = False`

---

## Étape 5 — Pipeline spaCy (règles + ML, production rapide)

```python
import spacy

nlp = spacy.load("fr_core_news_lg")

# Ajouter des règles métier avant le ML
ruler = nlp.add_pipe("entity_ruler", before="ner")
ruler.add_patterns([
    {"label": "PRODUIT", "pattern": [{"LOWER": "carte"}, {"LOWER": "visa"}]},
    {"label": "CODE", "pattern": [{"TEXT": {"REGEX": r"^[A-Z]{2}\d{6}$"}}]},
])

doc = nlp("La carte Visa n° AB123456 est expirée.")
for ent in doc.ents:
    print(ent.text, ent.label_)
```

**Quand préférer spaCy au HuggingFace :**
- Pipeline CPU-only en production (latence < 20 ms par document).
- Règles métier à combiner avec le ML (entity_ruler + NER).
- Cas d'usage où l'explicabilité des règles est requise.

---

## Étape 6 — Évaluation rigoureuse

```python
from sklearn.metrics import classification_report
from seqeval.metrics import classification_report as ner_report  # pour NER BIO

# Classification
print(classification_report(y_true, y_pred, target_names=class_names, digits=4))

# NER (format BIO)
print(ner_report(true_tags, pred_tags))  # F1 par type d'entité
```

**Métriques par tâche :**
| Tâche | Métrique principale | Métrique secondaire |
|---|---|---|
| Classification binaire | F1 macro | AUC-ROC |
| Classification multi-classe | F1 macro | Matrice de confusion |
| NER | F1 entité exacte (seqeval) | F1 partielle |
| Summarization | ROUGE-L | BERTScore |
| QA extractif | Exact Match | F1 token |

**Analyse d'erreurs :**
```python
errors = [(text, true, pred) for text, true, pred in zip(texts, y_true, y_pred) if true != pred]
# Inspecter les 20 erreurs les plus fréquentes par classe confondue
from collections import Counter
Counter((t, p) for _, t, p in errors).most_common(10)
```

---

## Étape 7 — Mise en production

```python
# Sérialisation optimisée
from optimum.onnxruntime import ORTModelForSequenceClassification

model_ort = ORTModelForSequenceClassification.from_pretrained("./checkpoints", export=True)
model_ort.save_pretrained("./model_onnx")
# Latence divisée par 2–4 vs PyTorch CPU

# Pipeline HuggingFace prêt à l'emploi
from transformers import pipeline
classifier = pipeline("text-classification", model="./model_onnx",
                      tokenizer=tokenizer, device=-1)
results = classifier(texts, batch_size=32, truncation=True)
```

**Checklist avant déploiement :**
- [ ] Versionner ensemble : `tokenizer/` + `model/` + `config.json` + code de prétraitement.
- [ ] Tester le pipeline sur des textes vides, très longs, avec caractères spéciaux.
- [ ] Ajouter un timeout et un fallback (réponse par défaut) si latence dépassée.
- [ ] Logger les entrées et prédictions (échantillon 1%) pour détecter le drift.
- [ ] Définir un seuil de confiance minimum — rejeter les prédictions < seuil.

---

## Anti-patterns et pièges fréquents

| Piège | Symptôme | Correction |
|---|---|---|
| Évaluer sur les données d'entraînement | F1 = 0.99 en train, 0.60 en test | Split strict, entity-level pour NER |
| Même tokenizer que le pré-entraînement non respecté | Résultats incohérents | `AutoTokenizer.from_pretrained(model_name)` toujours |
| Textes > 512 tokens tronqués silencieusement | Perte d'information en fin de doc | Sliding window ou chunking explicite |
| Stopwords supprimés avant Transformer | Dégradation des performances | Ne supprimer les stopwords que pour TF-IDF/classiques |
| Modèle anglais sur corpus français | F1 -15 à -30 points vs CamemBERT | Toujours aligner langue modèle / langue corpus |
| Fine-tuning sans warmup | Loss diverge en début d'entraînement | `warmup_ratio=0.1` minimum |
| Batch trop petit (1-2) avec BN | Gradients instables | batch_size >= 8, gradient_accumulation si mémoire limitée |
| Label imbalance ignoré | Modèle prédit toujours la classe majoritaire | `class_weight="balanced"` ou oversampling (imbalanced-learn) |

---

## Ressources et outils clés (2026)

- **HuggingFace Hub** : `huggingface.co/models` — filtrer par langue + tâche.
- **spaCy** : `python -m spacy download fr_core_news_lg`
- **Optimum** : export ONNX + quantisation INT8 pour inférence CPU rapide.
- **Label Studio** : annotation collaborative (NER, classification, QA).
- **Argilla** : feedback humain en boucle fermée pour amélioration continue.
- **BERTopic** : clustering de topics non supervisé sur grands corpus.


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
