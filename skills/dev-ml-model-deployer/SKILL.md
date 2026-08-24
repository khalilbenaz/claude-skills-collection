---
name: dev-ml-model-deployer
description: Mise en production d'un modèle ML déjà entraîné (MLOps) — packaging, serving, endpoint d'inférence, scaling, détection de drift et rollback. Couvre le déploiement, pas le suivi d'entraînement (voir ai-ml-ml-experiment-tracker). Se déclenche avec "déployer un modèle", "ML deployment", "MLOps", "model serving", "inference endpoint", "TensorFlow Serving", "model drift". Also triggers on "deploy an ML model", "model API endpoint", "serve a model in production".
---

# ML Model Deployer

## Critères de décision — quelle stack choisir ?

| Cas d'usage | Volume | Stack recommandée |
|---|---|---|
| MVP / POC rapide | < 100 req/s | FastAPI + Docker + MLflow |
| Real-time faible latence | 100–10k req/s | BentoML ou TorchServe + K8s |
| Batch nuit/semaine | très grand | Spark ML / Airflow batch job |
| Multi-framework / GPU | élevé | NVIDIA Triton Inference Server |
| Edge / embarqué | N/A | ONNX Runtime / TFLite |
| Géré full-cloud | variable | SageMaker / Azure ML / Vertex AI |

---

## Workflow en étapes

### 1. Préparer et sérialiser le modèle

Choisir le format selon le framework :

```python
# scikit-learn → joblib (préféré à pickle)
import joblib
joblib.dump(model, "model.joblib")

# PyTorch → TorchScript (portable, pas besoin du code source)
scripted = torch.jit.script(model)
scripted.save("model.pt")

# TensorFlow → SavedModel
model.save("saved_model/")

# Convertir en ONNX (interopérabilité max)
import torch.onnx
torch.onnx.export(model, dummy_input, "model.onnx", opset_version=17)
```

Créer une **model card** minimale (YAML dans le registre) :
```yaml
model_name: churn-predictor-v2
framework: scikit-learn 1.4.2
python: "3.11"
metrics:
  auc_roc: 0.887
  precision: 0.81
dataset_hash: sha256:abc123...
trained_at: 2026-05-10
known_limitations: "Biais sous-représentation < 25 ans"
```

### 2. Enregistrer dans le Model Registry

```bash
# MLflow — enregistrement depuis le training run
mlflow models register \
  --model-uri "runs:/RUN_ID/model" \
  --name "churn-predictor"

# Passer en Staging puis Production via API
mlflow models transition-version-stage \
  --name "churn-predictor" --version 3 --stage Production
```

Alternatives : W&B Artifacts (`wandb.log_artifact`), Azure ML Registry (`az ml model create`), SageMaker (`create_model`).

### 3. Containeriser de façon reproductible

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY model.joblib .
COPY app.py .

# Health check obligatoire
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Tagging sémantique : image = version du modèle
docker build -t myregistry/churn-predictor:v2.3.1 .
docker push myregistry/churn-predictor:v2.3.1
```

### 4. Exposer via FastAPI (serving custom)

```python
from fastapi import FastAPI
from pydantic import BaseModel
import joblib, numpy as np

app = FastAPI()
model = joblib.load("model.joblib")

class PredictRequest(BaseModel):
    features: list[float]

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/predict")
def predict(req: PredictRequest):
    arr = np.array(req.features).reshape(1, -1)
    proba = model.predict_proba(arr)[0, 1]
    return {"churn_proba": round(float(proba), 4)}
```

Pour **TorchServe** ou **Triton**, exporter en TorchScript / ONNX puis déclarer le model config.

### 5. CI/CD ML — gates de qualité

```yaml
# .github/workflows/ml-deploy.yml (extrait)
- name: Run model quality gate
  run: |
    python scripts/eval_gate.py \
      --model model.joblib \
      --min-auc 0.85 \
      --max-latency-ms 120

- name: Build & push image
  if: success()
  run: |
    docker build -t $IMAGE_TAG .
    docker push $IMAGE_TAG

- name: Deploy canary (5%)
  run: kubectl set image deployment/churn-api churn-api=$IMAGE_TAG
```

Gate minimal : AUC/F1 ≥ baseline − 1 %, latence p99 < seuil, fairness check sur sous-groupes sensibles.

### 6. Déploiement progressif (canary / shadow)

```bash
# Canary K8s — 5 % du trafic sur la nouvelle version
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
spec:
  http:
  - route:
    - destination: {host: churn-api, subset: v2}
      weight: 5
    - destination: {host: churn-api, subset: v1}
      weight: 95
EOF
```

**Shadow mode** : dupliquer le trafic vers le nouveau modèle sans retourner sa réponse aux clients — idéal pour valider avant tout impact.

### 7. Monitoring en production

Métriques à surveiller :

| Métrique | Outil | Alerte si |
|---|---|---|
| Data drift (features) | Evidently, NannyML | PSI > 0.2 ou KL-div > 0.1 |
| Model drift (labels) | NannyML, Arize | accuracy < baseline − 3 % |
| Latence p99 | Prometheus + Grafana | > 200 ms |
| Taux d'erreur | Prometheus | > 1 % sur 5 min |

```python
# Evidently — rapport drift hebdomadaire
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

report = Report(metrics=[DataDriftPreset()])
report.run(reference_data=ref_df, current_data=prod_df)
report.save_html("drift_report.html")
```

### 8. Rollback automatique

```python
# Pseudo-code — watcher de métriques
if current_auc < baseline_auc * 0.97:
    mlflow.models.transition_version_stage(
        name="churn-predictor",
        version=current_version,
        stage="Archived"
    )
    mlflow.models.transition_version_stage(
        name="churn-predictor",
        version=previous_version,
        stage="Production"
    )
    alert("Rollback automatique déclenché — v{} → v{}".format(
        current_version, previous_version))
```

---

## Anti-patterns / pièges

- **Pickle sans version** : un modèle pickle ne se recharge pas si la version scikit-learn change. Toujours épingler la version dans `requirements.txt` et préférer `joblib` ou ONNX.
- **Pas de health check** : un pod K8s sans `/health` peut router du trafic vers une instance cassée pendant des minutes.
- **Monitoring absent au lancement** : le data drift peut dégrader silencieusement le modèle pendant des semaines. Instrumenter *avant* le go-live.
- **Feature store absent** : différence entre features d'entraînement et features runtime (training-serving skew) = première cause de régression en production.
- **Over-engineering dès le MVP** : ne pas déployer Kubeflow + Feast + Seldon dès le premier modèle. Partir de FastAPI + MLflow, migrer quand le besoin est prouvé.
- **Pas de reproductibilité du dataset** : versionner le hash du dataset d'évaluation avec le modèle pour pouvoir rejouer les métriques à tout moment.
- **Retraining sans gate** : un retraining automatique sur données driftées sans quality gate peut dégrader le modèle en production en boucle.

---

## Bonnes pratiques 2026

- **ONNX comme format pivot** entre frameworks (PyTorch → ONNX → TensorRT pour GPU).
- **Model cards standardisées** (Hugging Face format) pour auditabilité et conformité IA Act.
- **Feature store** (Feast, Tecton, Redis) pour éviter le training-serving skew dès que plusieurs modèles partagent des features.
- **Quantization** (INT8 / FP16) pour réduire la latence et les coûts GPU sans perte significative de qualité.
- **LLM serving** : vLLM ou TGI (Text Generation Inference) pour les modèles de langage ; ne pas utiliser un endpoint FastAPI naïf pour des LLM (pas de batching continu).


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
