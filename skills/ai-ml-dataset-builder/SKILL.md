---
name: ai-ml-dataset-builder
description: "Construction et curation de datasets pour l'entraînement ML (nettoyage, augmentation, annotation, split, versioning, qualité, datacard)"
triggers:
  - "dataset"
  - "données d'entraînement"
  - "annotation"
  - "data augmentation"
  - "train/test split"
---

# Dataset Builder

Guide opérationnel pour construire, curate et maintenir des datasets ML de production.

---

## Étape 1 — Cadrer les besoins

| Question | Décision |
|---|---|
| Tâche ML ? | Classif / régression / détection / génération |
| Volume minimum viable ? | Règle empirique : ≥ 1 000 exemples/classe pour classif tabulaire, ≥ 10 k images pour CNN |
| Déséquilibre acceptable ? | Ratio max 1:10 sans traitement ; au-delà → SMOTE/oversampling |
| Contraintes légales ? | RGPD / consentement / droit à l'oubli à vérifier avant collecte |

Fixer un **schéma de données** dès le départ :
```python
# Exemple de schéma avec Pydantic
from pydantic import BaseModel, Field
from typing import Literal

class Sample(BaseModel):
    text: str = Field(min_length=10)
    label: Literal["positive", "negative", "neutral"]
    source: str
    collected_at: str  # ISO 8601
```

---

## Étape 2 — Collecter les données brutes

Choisir le format de stockage selon le cas d'usage :

| Format | Quand l'utiliser |
|---|---|
| **Parquet** | Données tabulaires, requêtes analytiques, > 100 k lignes |
| **JSONL** | Texte, NLP, LLM fine-tuning |
| **TFRecord / WebDataset** | Images/audio à grande échelle, streaming |
| **CSV** | Prototypage, petits datasets (< 50 k lignes) |

Collecter avec provenance :
```bash
# Exemple : snapshot DVC d'une source API
dvc run -n collect_api \
  -d scripts/collect.py \
  -o data/raw/samples.jsonl \
  python scripts/collect.py --source api --date 2026-06-24
```

Déduplication à la collecte (texte) :
```python
import hashlib, json

seen = set()
with open("data/raw/samples.jsonl", "w") as out:
    for record in raw_records:
        h = hashlib.md5(record["text"].encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            out.write(json.dumps(record, ensure_ascii=False) + "\n")
```

---

## Étape 3 — Nettoyer et prétraiter

Pipeline type avec **Pandas + Pandera** :
```python
import pandas as pd
import pandera as pa

schema = pa.DataFrameSchema({
    "text": pa.Column(str, pa.Check(lambda s: s.str.len() > 10)),
    "label": pa.Column(str, pa.Check.isin(["positive", "negative", "neutral"])),
})

df = pd.read_parquet("data/raw/samples.parquet")
df = df.drop_duplicates(subset=["text"])
df = df.dropna(subset=["label"])
df = schema.validate(df)  # lève une exception si non-conforme
df.to_parquet("data/clean/samples.parquet", index=False)
```

Quasi-doublons (fuzzy) :
```bash
pip install datasketch
# MinHash LSH pour détection de duplicats near-exact à grande échelle
```

---

## Étape 4 — Annoter et labelliser

**Critères de choix de l'outil d'annotation :**

| Outil | Type de données | Points forts |
|---|---|---|
| Label Studio | Texte, images, audio, vidéo | Open-source, tout-en-un |
| Prodigy | NLP/texte | Annotation active learning intégrée |
| CVAT | Images / vidéo | Bounding box, segmentation |
| Argilla | LLM feedback, RLHF | Interface moderne, intégration HuggingFace |

Mesurer l'accord inter-annotateurs **avant** de valider le guide :
```python
from sklearn.metrics import cohen_kappa_score

kappa = cohen_kappa_score(annotator_1_labels, annotator_2_labels)
# Seuil acceptable : kappa > 0.7
# < 0.6 → guide d'annotation à retravailler
print(f"Cohen's Kappa: {kappa:.3f}")
```

---

## Étape 5 — Augmenter les données

### Texte
```python
# back-translation légère avec deep-translator
from deep_translator import GoogleTranslator

def back_translate(text, lang="es"):
    translated = GoogleTranslator(source="fr", target=lang).translate(text)
    return GoogleTranslator(source=lang, target="fr").translate(translated)
```

### Images (Albumentations)
```python
import albumentations as A

transform = A.Compose([
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(p=0.3),
    A.Rotate(limit=15, p=0.4),
    A.GaussNoise(p=0.2),
])
augmented = transform(image=img)["image"]
```

### Tabulaire (déséquilibre de classes)
```python
from imblearn.over_sampling import SMOTE

sm = SMOTE(sampling_strategy="minority", random_state=42)
X_res, y_res = sm.fit_resample(X_train, y_train)
```

Règle : **n'augmenter que le train set**, jamais validation ni test.

---

## Étape 6 — Splits train / validation / test

```python
from sklearn.model_selection import train_test_split

# Stratifié (classification)
X_train, X_tmp, y_train, y_tmp = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
X_val, X_test, y_val, y_test = train_test_split(
    X_tmp, y_tmp, test_size=0.5, stratify=y_tmp, random_state=42
)
# Résultat : 80% / 10% / 10%
```

Cas spéciaux :

| Cas | Stratégie |
|---|---|
| Données temporelles | Split chronologique strict — pas de shuffle |
| Données groupées (patient, user) | `GroupShuffleSplit` — un groupe = un seul split |
| Très petit dataset (< 5 k) | Cross-validation k-fold stratifiée |

```python
# Split temporel
df_sorted = df.sort_values("date")
n = len(df_sorted)
train = df_sorted.iloc[:int(n*0.8)]
val   = df_sorted.iloc[int(n*0.8):int(n*0.9)]
test  = df_sorted.iloc[int(n*0.9):]
```

---

## Étape 7 — Valider et documenter

### Rapport de qualité automatique
```bash
pip install great_expectations
great_expectations init
great_expectations suite new  # définir les expectations
great_expectations checkpoint run my_checkpoint  # générer le rapport HTML
```

### Dataset card (HuggingFace standard)
```yaml
# README.md du dataset (format HF)
---
dataset_info:
  features:
    - name: text
      dtype: string
    - name: label
      dtype: class_label
  splits:
    - name: train
      num_examples: 8000
    - name: validation
      num_examples: 1000
    - name: test
      num_examples: 1000
license: cc-by-4.0
---
```

### Versioning avec DVC
```bash
dvc add data/clean/samples.parquet
git add data/clean/samples.parquet.dvc .gitignore
git commit -m "feat(data): v1.2 — +2k samples, dedup applied"
git tag dataset-v1.2
dvc push  # stockage distant (S3, GCS, Azure…)
```

---

## Étape 8 — Maintenir et itérer

- **Data drift** : surveiller avec `evidently` ou `whylogs` en production
- **Active learning** : remonter les exemples incertains du modèle pour re-annotation prioritaire
- **Changelog** : `CHANGELOG.md` daté sur chaque version du dataset

```python
# Détecter un drift de distribution (evidently)
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

report = Report(metrics=[DataDriftPreset()])
report.run(reference_data=df_train, current_data=df_new)
report.save_html("drift_report.html")
```

---

## Anti-patterns et pièges

| Piège | Conséquence | Remède |
|---|---|---|
| **Data leakage** : normalisation fit sur tout le dataset | Résultats gonflés, modèle inutilisable en prod | Fit scaler/encodeur uniquement sur train |
| **Test set contaminé** : augmentation avant split | Métriques non représentatives | Toujours splitter avant d'augmenter |
| **Label imbalance ignoré** | Accuracy trompeuse, mauvaise généralisation | F1-macro, stratification, SMOTE |
| **Doublons cross-split** | Surestimation des performances | Dédupliquer avant de splitter |
| **Guide d'annotation vague** | Kappa < 0.6, labels incohérents | Exemples concrets pour chaque cas-limite |
| **Dataset sans version** | Expériences non reproductibles | DVC ou LakeFS obligatoire dès le début |
| **Collecte sans consentement** | Violation RGPD, dette légale | Vérifier licences et consentements avant toute collecte |

---

## Bonnes pratiques 2026

- **Format Parquet + Delta Lake** pour les datasets > 1 M lignes (ACID, time-travel)
- **Synthetic data (LLM-generated)** : valider avec un modèle discriminateur avant d'inclure en train
- **Modèles d'embedding pour déduplication** sémantique (ex. `sentence-transformers` + FAISS)
- **Datacard obligatoire** sur tout dataset partagé ou utilisé pour fine-tuning LLM
- **Privacy-preserving** : PII scrubbing automatisé (`presidio`, `spacy` NER) avant stockage


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
