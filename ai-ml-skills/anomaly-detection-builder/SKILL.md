---
name: anomaly-detection-builder
description: Conception de systèmes de détection d'anomalies (statistique, ML, deep learning) — arbre de décision, snippets copiables, anti-patterns, déploiement production. Se déclenche avec "anomaly detection", "détection d'anomalies", "outlier", "fraud detection", "anomalie". Also triggers on "outlier detection", "detect unusual behavior".
---

# Anomaly Detection Builder

## 1. Caractériser le problème

**Questions clés avant de coder quoi que ce soit :**

| Dimension | Options | Impact sur le choix technique |
|---|---|---|
| Type d'anomalie | Ponctuelle / Contextuelle / Collective | Contextuelle → features temporelles obligatoires |
| Disponibilité des labels | Supervisé / Semi-supervisé / Non-supervisé | Labels → classifier classique suffit souvent |
| Ratio d'anomalies | < 0.1 % / 0.1–5 % / > 5 % | < 0.1 % → isolation/reconstruction ; > 5 % → SMOTE + classifier |
| Contrainte de latence | Temps réel (< 100 ms) / Batch (minutes) | Temps réel → éviter DBSCAN, LOF sur grands datasets |
| Coût faux négatif vs faux positif | Fraude / Qualité / Infra | Calibre le seuil, pas le modèle |

---

## 2. Arbre de décision : choisir la méthode

```
Données labellisées suffisantes ?
├─ OUI → XGBoost / LightGBM avec class_weight + seuil F1-optimal
│         (baseline solide, explicable, rapide)
└─ NON
    ├─ Données tabulaires basses dimensions (< 50 features) ?
    │   └─ Isolation Forest  (2–5 M lignes sans GPU)
    │       si résultats insuffisants → One-Class SVM (kernel RBF)
    ├─ Séries temporelles ?
    │   ├─ Courte fenêtre (< 1 h) → SARIMA residuals ou STL decomposition
    │   └─ Longue séquence → LSTM Autoencoder ou Transformer (TadGAN, Anomaly Transformer)
    ├─ Images / texte ?
    │   └─ Autoencoder convolutif ou VAE + seuil sur reconstruction error
    └─ Logs / événements discrets ?
        └─ Drain3 (log parsing) → Isolation Forest sur vecteurs TF-IDF
```

---

## 3. Préparer les données

```python
import pandas as pd
from sklearn.preprocessing import RobustScaler

df = pd.read_parquet("data/raw.parquet")

# 1. Statistiques glissantes (features temporelles)
for w in [5, 30, 60]:  # minutes
    df[f"mean_{w}m"] = df["value"].rolling(w).mean()
    df[f"std_{w}m"]  = df["value"].rolling(w).std()

# 2. Ratios / deltas — souvent plus discriminants que la valeur brute
df["pct_change"] = df["value"].pct_change()
df["z_score"]    = (df["value"] - df["value"].rolling(60).mean()) / df["value"].rolling(60).std()

# 3. Normalisation robuste (insensible aux outliers existants)
scaler = RobustScaler()
X = scaler.fit_transform(df[features].dropna())
```

**Pièges fréquents en préparation :**
- Scaler fitté sur l'ensemble train+test → fuite de données, résultats faussement bons.
- Imputer les NaN par la moyenne globale sur une série temporelle → détruire les pics réels.
- Oublier de supprimer les anomalies connues du set d'entraînement (semi-supervisé).

---

## 4. Implémenter le détecteur

### Isolation Forest (point de départ universel)

```python
from sklearn.ensemble import IsolationForest

model = IsolationForest(
    n_estimators=200,       # 100 suffit rarement sur > 100k lignes
    contamination=0.01,     # estimation du ratio d'anomalies attendu
    max_samples="auto",
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train)

scores = -model.score_samples(X_test)  # plus élevé = plus anormal
```

### LSTM Autoencoder (séries temporelles)

```python
import torch, torch.nn as nn

class LSTMAutoencoder(nn.Module):
    def __init__(self, n_features, hidden=64, latent=16):
        super().__init__()
        self.encoder = nn.LSTM(n_features, hidden, batch_first=True)
        self.bottleneck = nn.Linear(hidden, latent)
        self.expand     = nn.Linear(latent, hidden)
        self.decoder    = nn.LSTM(hidden, n_features, batch_first=True)

    def forward(self, x):
        enc_out, _ = self.encoder(x)
        h = torch.relu(self.bottleneck(enc_out))
        h = torch.relu(self.expand(h))
        dec_out, _ = self.decoder(h)
        return dec_out

# Score = MSE de reconstruction par séquence
recon_error = ((x_test - model(x_test)) ** 2).mean(dim=(1, 2))
```

### Baseline statistique (toujours comparer)

```python
# Z-score sur fenêtre glissante — souvent suffisant pour séries univariées
def zscore_anomaly(series, window=60, threshold=3.0):
    mu  = series.rolling(window).mean()
    std = series.rolling(window).std()
    z   = (series - mu) / (std + 1e-9)
    return z.abs() > threshold
```

---

## 5. Calibrer le seuil

Le seuil est aussi critique que le modèle.

```python
from sklearn.metrics import precision_recall_curve, f1_score
import numpy as np

# Si labels disponibles : maximiser F1 ou recall à precision minimale acceptable
precision, recall, thresholds = precision_recall_curve(y_true, scores)
min_precision = 0.30  # tolérance aux faux positifs
mask = precision[:-1] >= min_precision
best_threshold = thresholds[mask][recall[:-1][mask].argmax()]

# Si pas de labels : percentile métier
threshold = np.percentile(scores, 99)   # top 1 % des scores
```

**Tableau d'aide au choix de stratégie :**

| Contrainte métier | Stratégie recommandée |
|---|---|
| Aucune fausse alerte tolérée | Maximize precision à recall ≥ 0.5 |
| Aucune anomalie manquée (fraude, sécurité) | Maximize recall à precision ≥ 0.2 |
| Équilibre opérationnel | Maximize F1 ou F-beta (beta > 1 pour recall) |
| Pas de labels | Percentile ou sigma-rule, ajuster via feedback |

---

## 6. Évaluer correctement

```python
from sklearn.metrics import (
    classification_report, average_precision_score, roc_auc_score
)

y_pred = (scores >= best_threshold).astype(int)

print(classification_report(y_true, y_pred))
print("AUC-PR :", average_precision_score(y_true, scores))
print("AUC-ROC:", roc_auc_score(y_true, scores))
```

**Métriques indispensables :**
- AUC-PR (Average Precision) — principale métrique sur données déséquilibrées.
- Recall à precision fixe (ex : recall@P30).
- Time-to-detect : délai médian entre occurrence et détection.

**Ne jamais utiliser l'accuracy seule.** Avec 1 % d'anomalies, prédire "normal" partout donne 99 % d'accuracy.

---

## 7. Déployer en production

```python
# Inférence temps réel via une file (ex : Kafka consumer)
import joblib, json
from kafka import KafkaConsumer

model   = joblib.load("isolation_forest.pkl")
scaler  = joblib.load("scaler.pkl")

consumer = KafkaConsumer("events", bootstrap_servers="broker:9092",
                         value_deserializer=lambda m: json.loads(m.decode()))

for msg in consumer:
    x       = scaler.transform([extract_features(msg.value)])
    score   = -model.score_samples(x)[0]
    if score > THRESHOLD:
        send_alert(severity="critical" if score > THRESHOLD * 1.5 else "warning",
                   payload=msg.value, score=score)
```

**Checklist déploiement :**
- [ ] Seuil stocké hors du code (variable d'environnement ou config store).
- [ ] Suppression de doublons : ne pas ré-alerter la même anomalie toutes les 5 s.
- [ ] Circuit-breaker : si le taux d'alertes dépasse 10× la normale, suspendre et alerter l'équipe.
- [ ] Feedback loop : interface pour que les analystes valident/invalident → enrichit le dataset.
- [ ] Data drift : surveiller la distribution des scores hebdomadairement (PSI, KL-divergence).

---

## 8. Monitorer et itérer

```python
# Calculer le Population Stability Index (PSI) pour détecter le drift
def psi(expected, actual, buckets=10):
    def scale(x):
        counts, _ = np.histogram(x, bins=buckets)
        return (counts + 1e-9) / len(x)  # éviter division par 0
    e, a = scale(expected), scale(actual)
    return np.sum((a - e) * np.log(a / e))

psi_score = psi(scores_train, scores_production_last_week)
# PSI > 0.2 → recalibration urgente ; 0.1–0.2 → surveiller
```

**Fréquence de recalibration recommandée :**
- Fraude financière : hebdomadaire.
- Supervision infrastructure : mensuelle.
- Contrôle qualité industriel : à chaque changement de lot/process.

---

## Anti-patterns et garde-fous

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Scaler fitté sur tout le dataset | Data leakage, faux bons résultats | Fit scaler uniquement sur train |
| Contamination Isolation Forest = 0.5 par défaut | Trop d'anomalies détectées | Estimer le vrai ratio ou utiliser `score_samples` + seuil manuel |
| Évaluer uniquement sur accuracy | Ignorer toutes les vraies anomalies | AUC-PR obligatoire |
| Threshold codé en dur sans monitoring | Dérive silencieuse en prod | PSI + recalibration périodique |
| Un seul détecteur en production | Point de défaillance unique | Ensemble : vote majoritaire sur 2-3 détecteurs |
| Entraîner avec anomalies dans le set (semi-supervisé) | Modèle apprend à ne pas les détecter | Nettoyer le train set des anomalies connues |
| Négliger l'heure/jour comme feature | Faux positifs sur trafic nuit/weekend | Ajouter features calendaires systématiquement |

---

## Bibliothèques clés (2026)

```bash
pip install scikit-learn pyod river           # classiques + streaming
pip install torch torchmetrics               # deep learning
pip install alibi-detect                     # drift + outlier + adversarial
pip install stumpy                           # matrix profile (séries temporelles)
pip install drain3                           # parsing de logs
```

- **PyOD** : 40+ algorithmes unifiés, API sklearn-compatible.
- **Alibi-Detect** : drift detection + outlier, prêt production.
- **River** : détection en ligne (streaming), mise à jour incrémentale.
- **Stumpy** : Matrix Profile, excellent pour motifs répétitifs dans les séries temporelles.
