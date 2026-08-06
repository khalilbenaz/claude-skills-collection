---
name: ai-ml-ml-experiment-tracker
description: Suivi d'expériences ML avec MLflow, W&B, versioning de modèles et comparaison de métriques. Se déclenche avec : 'MLflow', 'Weights & Biases', 'experiment tracking', 'suivi d'expériences', 'model registry'. Se déclenche avec "MLflow", "Weights & Biases", "experiment tracking", "suivi d'expériences", "model registry". Also triggers on "track ML experiments", "MLflow tracking", "compare model runs".
---

# ML Experiment Tracker

Suivi structuré d'expériences ML, versioning de modèles, comparaison de métriques — MLflow, W&B, Neptune, ClearML.

---

## 1. Choisir la plateforme

| Outil | Quand choisir |
|---|---|
| **MLflow** | On-premise, équipe data interne, pas de budget SaaS |
| **W&B** | Collaboration multi-équipes, visualisations riches, GPU cloud |
| **Neptune** | Gros volumes de métadonnées, intégration CI/CD fine |
| **ClearML** | Orchestration complète (pipeline + HPO + registry) |

**Installation MLflow (auto-hébergé) :**
```bash
pip install mlflow
mlflow server \
  --backend-store-uri postgresql://user:pass@host:5432/mlflow \
  --default-artifact-root s3://mon-bucket/mlflow \
  --host 0.0.0.0 --port 5000
```

**Installation W&B (local) :**
```bash
pip install wandb
wandb login  # ou WANDB_API_KEY=xxx en env var
wandb server start  # si self-hosted (Weights & Biases Local)
```

---

## 2. Structurer les expériences

Convention de nommage **obligatoire** avant le premier run :

```
{projet}/{tâche}/{variante}
ex: churn/lgbm/baseline
    churn/lgbm/feat-engineering-v2
    fraud/bert/fine-tune-lr3e-5
```

Tags standards à appliquer sur chaque run :
- `dataset_version` : hash ou tag DVC
- `model_type` : lgbm, resnet50, bert-base, …
- `env` : dev / staging / prod
- `owner` : alias du data scientist

---

## 3. Logger paramètres et métriques

**MLflow :**
```python
import mlflow

mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("churn/lgbm/baseline")

with mlflow.start_run(run_name="lgbm-lr0.05-depth6"):
    mlflow.log_params({
        "learning_rate": 0.05,
        "max_depth": 6,
        "n_estimators": 500,
        "dataset_version": "v2.3",
        "seed": 42,
    })
    # ... entraînement ...
    mlflow.log_metrics({"val_auc": 0.872, "val_f1": 0.741}, step=epoch)
    mlflow.sklearn.log_model(model, "model")
```

**W&B :**
```python
import wandb

run = wandb.init(project="churn", name="lgbm-lr0.05", config={
    "learning_rate": 0.05, "max_depth": 6, "seed": 42
})
wandb.log({"val_auc": 0.872, "val_f1": 0.741})
wandb.finish()
```

**Auto-logging (MLflow) — à activer systématiquement :**
```python
mlflow.sklearn.autolog()   # scikit-learn
mlflow.xgboost.autolog()   # XGBoost/LightGBM
mlflow.pytorch.autolog()   # PyTorch
mlflow.transformers.autolog()  # HuggingFace
```

---

## 4. Versionner les artefacts

```python
# MLflow — log artefacts
mlflow.log_artifact("conf/config.yaml")
mlflow.log_artifact("reports/confusion_matrix.png")
mlflow.sklearn.log_model(
    sk_model=model,
    artifact_path="model",
    registered_model_name="churn-lgbm",
)

# Lier un dataset DVC au run
mlflow.log_param("dataset_dvc_hash", subprocess.check_output(
    ["dvc", "status", "--json"]
).decode())
```

Artefacts minimum à logger sur chaque run :
1. Fichier de config complet (YAML/JSON)
2. Le modèle sérialisé + signature d'entrée/sortie
3. Métriques finales sur le test set (pas uniquement validation)
4. Plot de la courbe d'apprentissage
5. Version Python + `pip freeze` (ou `conda env export`)

---

## 5. Model Registry — promotion par statut

```bash
# MLflow CLI : promouvoir en staging
mlflow models transition-create \
  --model-name churn-lgbm \
  --version 7 \
  --stage Staging

# Puis en Production après validation
mlflow models transition-create \
  --model-name churn-lgbm \
  --version 7 \
  --stage Production
```

Flux minimal :
```
None → Staging (tests auto) → Production (validation métier) → Archived
```

Documenter dans la **model card** (champ `description` du registry) :
- Jeu de données d'entraînement + période
- Métriques de référence (AUC, F1, recall @seuil)
- Limites connues et biais identifiés
- Contact owner

---

## 6. Comparer et analyser les runs

**MLflow — comparaison programmatique :**
```python
import mlflow

client = mlflow.tracking.MlflowClient()
runs = client.search_runs(
    experiment_ids=["1"],
    filter_string="metrics.val_auc > 0.85 and params.model_type = 'lgbm'",
    order_by=["metrics.val_auc DESC"],
    max_results=10,
)
for r in runs:
    print(r.info.run_id, r.data.metrics["val_auc"])
```

**W&B Sweeps (HPO automatisé) :**
```yaml
# sweep.yaml
method: bayes
metric:
  name: val_auc
  goal: maximize
parameters:
  learning_rate:
    distribution: log_uniform_values
    min: 0.001
    max: 0.1
  max_depth:
    values: [4, 6, 8, 10]
```
```bash
wandb sweep sweep.yaml   # retourne SWEEP_ID
wandb agent SWEEP_ID     # lancer N agents en parallèle
```

---

## 7. Intégration CI/CD

```yaml
# GitHub Actions — vérifier que le run n'est pas régressif
- name: Run experiment
  run: python train.py
  env:
    MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_URI }}

- name: Check metrics gate
  run: |
    python scripts/check_metrics.py \
      --run-id $RUN_ID \
      --min-val-auc 0.85 \
      --max-train-val-gap 0.05
```

`check_metrics.py` doit retourner exit code 1 si les seuils ne sont pas atteints — le pipeline bloque la promotion automatique.

---

## Anti-patterns et pièges

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Logger uniquement la métrique finale | Impossible de détecter overfitting ou divergence | Logger à chaque epoch / step |
| Runs sans seed fixé | Non-reproductible, comparaisons faussées | `seed=42` dans params ET `torch.manual_seed()` |
| Écraser un run existant en cas d'erreur | Historique corrompu | Toujours créer un nouveau run, laisser l'ancien en "FAILED" |
| Stocker les artefacts localement | Perte à la mort de la VM | S3 / GCS / Azure Blob comme artifact store |
| Promouvoir en production sans test set isolé | Biais d'optimisme sur val | Réserver un hold-out jamais vu pendant la recherche |
| Tracking uniquement en notebook | Pas de reproductibilité en prod | Exporter le code en script avant tout run sérieux |

---

## Bonnes pratiques 2026

- **Lineage complet** : lier chaque run à son commit Git (`mlflow.set_tag("git_commit", git_sha)`) et à son dataset DVC.
- **Schema d'input/output** : toujours logger `mlflow.models.infer_signature(X_train, y_pred)` — obligatoire pour le serving.
- **Alertes proactives** : configurer des webhooks MLflow ou W&B Alerts sur `run.status == FAILED` ou `val_loss > threshold`.
- **Nettoyage périodique** : archiver les runs > 90 jours sans promotion ; supprimer les artefacts des runs FAILED > 30 jours.
- **Isolation des environments** : un experiment par branche feature, jamais mélanger les runs de dev et de prod dans le même experiment.
- **Coût GPU** : logger `cost_usd` estimé via `gpu_hours * prix_spot` pour prioriser les expériences à fort ROI.


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
