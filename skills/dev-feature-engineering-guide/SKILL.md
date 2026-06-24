---
name: dev-feature-engineering-guide
description: Techniques de feature engineering pour améliorer les modèles ML. Se déclenche avec "feature engineering", "features", "transformation de données", "encoding", "normalisation", "feature selection", "feature store".
---

# Feature Engineering Guide

## Workflow en 8 étapes

### 1. Exploration et audit des données

```python
import pandas as pd
import numpy as np

df.info()                              # types, nulls par colonne
df.describe(include="all")            # stats descriptives
df.isnull().mean().sort_values()      # % manquants
df.select_dtypes("number").skew()     # skewness
df.duplicated().sum()                 # doublons

# Corrélations
corr = df.select_dtypes("number").corr("spearman")
# Outliers par IQR
Q1, Q3 = df["col"].quantile([0.25, 0.75])
iqr = Q3 - Q1
outliers = df[(df["col"] < Q1 - 1.5*iqr) | (df["col"] > Q3 + 1.5*iqr)]
```

**Critère de décision** : Si une colonne dépasse 60 % de valeurs manquantes → supprimer (sauf raison métier forte). Entre 5 % et 60 % → imputer.

---

### 2. Nettoyage et imputation

```python
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.pipeline import Pipeline

# Imputation simple (train-only fit, jamais sur le test !)
imp_median = SimpleImputer(strategy="median")
X_train["col"] = imp_median.fit_transform(X_train[["col"]])
X_test["col"]  = imp_median.transform(X_test[["col"]])

# Imputation avancée (MICE via IterativeImputer)
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer
imp_mice = IterativeImputer(max_iter=10, random_state=0)

# Winsorisation (capping à 1er/99e percentile)
from scipy.stats.mstats import winsorize
df["col"] = winsorize(df["col"], limits=[0.01, 0.01])
```

**Choix d'imputation** :
| Mécanisme de manque | Méthode recommandée |
|---|---|
| MCAR (aléatoire) | Médiane / mode |
| MAR (conditionnel) | KNN, MICE |
| MNAR (non-aléatoire) | Indicateur binaire + imputation |

---

### 3. Encoding catégoriel

```python
import pandas as pd
from sklearn.preprocessing import OrdinalEncoder, TargetEncoder
from sklearn.preprocessing import OneHotEncoder

# One-Hot (cardinalité < 15, modèles linéaires)
pd.get_dummies(df, columns=["ville"], drop_first=True)

# Ordinal (catégories avec ordre naturel)
oe = OrdinalEncoder(categories=[["bas","moyen","haut"]])

# Target encoding (haute cardinalité, ex : code postal)
# ⚠ Toujours avec cross-validation pour éviter le leakage
te = TargetEncoder(smooth="auto", cv=5)

# Fréquence encoding (cardinalité très élevée, sans leakage)
freq = df["col"].value_counts(normalize=True)
df["col_freq"] = df["col"].map(freq)
```

**Règle cardinale** : Un encoder appris (TargetEncoder, scaler) doit être `.fit()` **uniquement sur X_train**.

---

### 4. Transformations numériques

```python
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler
import numpy as np

# Log pour distributions skewed (skew > 1)
df["col_log"] = np.log1p(df["col"])          # log1p gère les 0

# Box-Cox / Yeo-Johnson (automatique)
from sklearn.preprocessing import PowerTransformer
pt = PowerTransformer(method="yeo-johnson")  # gère les valeurs négatives

# Binning (discrétisation en quantiles)
df["col_bin"] = pd.qcut(df["col"], q=10, labels=False)

# Interactions polynomiales (modèles linéaires)
from sklearn.preprocessing import PolynomialFeatures
poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
```

**Quel scaler choisir ?**
- `StandardScaler` → régression linéaire, SVM, PCA
- `RobustScaler` → présence d'outliers non traités
- `MinMaxScaler` → réseaux de neurones (images, MLP)
- Arbres (XGBoost, LightGBM, Random Forest) → **pas de scaler nécessaire**

---

### 5. Features temporelles

```python
df["dt"] = pd.to_datetime(df["date"])
df["heure"]    = df["dt"].dt.hour
df["dow"]      = df["dt"].dt.dayofweek
df["mois"]     = df["dt"].dt.month
df["is_weekend"] = df["dow"].isin([5, 6]).astype(int)

# Encodage cyclique (évite la discontinuité 23h→0h)
df["heure_sin"] = np.sin(2 * np.pi * df["heure"] / 24)
df["heure_cos"] = np.cos(2 * np.pi * df["heure"] / 24)

# Lag features (séries temporelles)
df["lag_1"]  = df["valeur"].shift(1)
df["lag_7"]  = df["valeur"].shift(7)

# Rolling stats
df["roll_mean_7"] = df["valeur"].rolling(7).mean()
df["roll_std_7"]  = df["valeur"].rolling(7).std()
```

---

### 6. Features textuelles

```python
from sklearn.feature_extraction.text import TfidfVectorizer

# TF-IDF (modèles classiques)
tfidf = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
X_tfidf = tfidf.fit_transform(train_texts)

# Sentence embeddings (BERT, modèles modernes)
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(texts, batch_size=64)

# Features statistiques textuelles (signal faible mais rapide)
df["nb_mots"]     = df["texte"].str.split().str.len()
df["nb_chars"]    = df["texte"].str.len()
df["ratio_upper"] = df["texte"].apply(lambda x: sum(c.isupper() for c in x) / max(len(x), 1))
```

---

### 7. Feature selection

```python
from sklearn.feature_selection import mutual_info_classif, RFE
from sklearn.ensemble import RandomForestClassifier
import shap

# Supprimer les features quasi-constantes
from sklearn.feature_selection import VarianceThreshold
vt = VarianceThreshold(threshold=0.01)

# Supprimer les features très corrélées (> 0.95)
corr_matrix = df.corr().abs()
upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
to_drop = [col for col in upper.columns if any(upper[col] > 0.95)]

# Mutual information (non-linéaire)
mi = mutual_info_classif(X_train, y_train)
top_features = pd.Series(mi, index=X_train.columns).nlargest(30)

# SHAP values (interprétable + sélection)
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)
shap.summary_plot(shap_values, X_test)
```

---

### 8. Pipeline et Feature Store

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

num_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])
cat_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore")),
])

preprocessor = ColumnTransformer([
    ("num", num_pipe, num_cols),
    ("cat", cat_pipe, cat_cols),
])

full_pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", RandomForestClassifier()),
])
full_pipeline.fit(X_train, y_train)
```

**Feature store** : Pour les équipes multi-projets, utiliser [Feast](https://feast.dev/) (open-source) ou Hopsworks. Distinguer :
- **Offline store** : Parquet / BigQuery — pour l'entraînement
- **Online store** : Redis / DynamoDB — pour le serving temps-réel

---

## Anti-patterns et pièges

| Piège | Symptôme | Correction |
|---|---|---|
| **Data leakage** | Score parfait en validation, effondrement en prod | Fit les transformers uniquement sur train |
| **Target encoding sans CV** | Overfitting caché | Utiliser `TargetEncoder(cv=5)` ou leave-one-out |
| **Normaliser des arbres** | Perte de temps, pas d'impact | Supprimer scalers pour XGBoost/LightGBM |
| **Trop de features** | Curse of dimensionality, lenteur | Sélectionner < 50–100 features significatives |
| **Log sur valeurs négatives** | NaN silencieux | Utiliser `log1p` ou Yeo-Johnson |
| **Rolling sans groupby** | Fuite entre séries d'entités différentes | Toujours `df.groupby("entity_id")["val"].rolling(n)` |
| **One-hot sur cardinalité > 50** | Explosion de dimensions | Target encoding ou embeddings |

---

## Bonnes pratiques 2026

- **Versioning des features** : tracer avec MLflow `log_params` ou DVC pour reproductibilité.
- **Feature importance ≠ causalité** : valider avec un expert métier avant de supprimer.
- **Automatisation** : outils comme `featuretools` (deep feature synthesis) ou `AutoFeat` accélèrent l'exploration mais nécessitent une revue humaine.
- **Monitoring en production** : détecter le feature drift (PSI > 0.2 = alarme) avec `evidently` ou `nannyml`.
- **Moins c'est plus** : 10 features bien construites surpassent souvent 100 features bruitées.


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
