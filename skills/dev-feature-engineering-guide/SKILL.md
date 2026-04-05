---
name: dev-feature-engineering-guide
description: Techniques de feature engineering pour améliorer les modèles ML. Se déclenche avec "feature engineering", "features", "transformation de données", "encoding", "normalisation", "feature selection", "feature store".
---

# Feature Engineering Guide

## Workflow
1. **Exploration des données** — Analyser les distributions (histogrammes, boxplots), calculer les corrélations (Pearson, Spearman), quantifier les valeurs manquantes par colonne, détecter les outliers (IQR, z-score) et comprendre la sémantique métier de chaque variable.
2. **Nettoyage** — Traiter les valeurs manquantes (imputation par médiane/mode/KNN/MICE selon le mécanisme de manque) ; gérer les outliers (capping, winsorisation ou suppression selon l'impact) ; corriger les types (dates, catégories, numériques) ; dédupliquer les lignes.
3. **Encoding catégoriel** — Appliquer la bonne stratégie selon la cardinalité et le modèle : one-hot encoding (faible cardinalité, modèles linéaires), label encoding (arbres de décision), target encoding (haute cardinalité, attention au data leakage), ordinal encoding (catégories ordonnées), embeddings (très haute cardinalité).
4. **Features numériques** — Normaliser/standardiser selon le modèle (StandardScaler, MinMaxScaler, RobustScaler) ; discrétiser en bins (qcut, cut) ; appliquer des transformations logarithmiques pour réduire la skewness ; créer des features polynomiales ou d'interaction pour les modèles linéaires.
5. **Features temporelles** — Extraire les composantes calendaires (heure, jour, mois, trimestre, jour de semaine, jours fériés) ; créer des lag features (valeur à t-1, t-7, t-30) ; calculer des rolling window statistics (moyenne mobile, std, min, max) ; encoder la cyclicité (sin/cos pour heures, jours).
6. **Features textuelles** — Vectoriser avec TF-IDF (bag-of-words pondéré), word embeddings (Word2Vec, GloVe, FastText), sentence embeddings (BERT, Sentence Transformers) ; extraire des statistiques textuelles (longueur, nombre de mots, ratio majuscules) ; générer des n-grams pour les modèles classiques.
7. **Feature selection** — Éliminer les features redondantes via la corrélation (seuil > 0.95) ; mesurer l'importance via mutual information (non-linéaire), permutation importance, valeurs SHAP (interprétabilité) ou RFE (Recursive Feature Elimination) ; valider avec cross-validation pour éviter le surapprentissage.
8. **Feature store** — Centraliser les features réutilisables dans un feature store (Feast, Tecton, Hopsworks) ; distinguer le serving online (faible latence, Redis/DynamoDB) et offline (entraînement, Parquet/BigQuery) ; versionner les feature pipelines pour la reproductibilité des expériences.

## Règles
- Fournis des exemples de code Python concrets (scikit-learn Pipeline, pandas, Feature-engine) pour chaque transformation mentionnée.
- Préviens systématiquement contre le data leakage : toute transformation apprise (encoders, scalers) doit être fit sur le train set uniquement.
- Priorise la qualité des features sur la quantité : 10 features bien construites surpassent souvent 100 features bruitées.
- Adapte les techniques au type de modèle : les arbres de décision (XGBoost, LightGBM) nécessitent moins de preprocessing que les modèles linéaires ou les réseaux de neurones.
- Pense toujours à la reproductibilité : encapsuler les transformations dans des pipelines scikit-learn ou des feature pipelines versionnés.


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
