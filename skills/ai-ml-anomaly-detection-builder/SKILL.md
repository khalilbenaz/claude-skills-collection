---
name: ai-ml-anomaly-detection-builder
description: "Conception de systèmes de détection d'anomalies (statistique, ML, deep learning)"
triggers:
  - "anomaly detection"
  - "détection d'anomalies"
  - "outlier"
  - "fraud detection"
  - "anomalie"
---

# Anomaly Detection Builder

Guide complet pour la conception et l'implémentation de systèmes de détection d'anomalies, des approches statistiques classiques aux techniques de deep learning.

## Workflow

### 1. Caractériser le problème et les données

- Définir le type d'anomalie recherché : ponctuelle, contextuelle ou collective
- Identifier le domaine d'application : fraude financière, maintenance prédictive, cybersécurité, contrôle qualité
- Analyser la nature des données : séries temporelles, données tabulaires, images, logs
- Évaluer la disponibilité des labels : supervisé (anomalies connues), semi-supervisé (seulement des données normales), non supervisé
- Déterminer le ratio d'anomalies attendu (typiquement 0.1% à 5%)
- Définir les contraintes opérationnelles : temps réel vs batch, tolérance aux faux positifs/négatifs

### 2. Explorer et préparer les données

- Réaliser une analyse exploratoire approfondie (distributions, corrélations, tendances)
- Visualiser les données pour identifier visuellement les anomalies évidentes (scatter plots, box plots, histogrammes)
- Nettoyer les données : gestion des valeurs manquantes, normalisation, encodage des catégories
- Détecter et documenter les anomalies déjà connues pour constituer un ground truth
- Pour les séries temporelles : analyser la saisonnalité, la tendance et la stationnarité
- Créer des features pertinentes : statistiques glissantes, ratios, distances, embeddings

### 3. Choisir la méthode de détection adaptée

- Approches statistiques (données simples, interprétabilité maximale) :
  - Z-score, IQR pour les anomalies univariées
  - Mahalanobis distance pour les données multivariées
  - Tests de Grubbs, ESD pour les outliers
- Approches ML classiques (données tabulaires, performances robustes) :
  - Isolation Forest : efficace, scalable, peu de paramètres
  - One-Class SVM : bon pour les petits datasets à haute dimension
  - Local Outlier Factor (LOF) : détecte les anomalies locales basées sur la densité
  - DBSCAN : clustering avec détection de bruit
- Approches deep learning (données complexes, haute dimension) :
  - Autoencoders : détection par erreur de reconstruction
  - Variational Autoencoders (VAE) : modélisation de la distribution normale
  - GAN (GANomaly) : génération adversariale pour la détection
  - Transformer-based : pour les séries temporelles longues

### 4. Implémenter et entraîner le modèle

- Entraîner uniquement sur les données normales pour les approches semi-supervisées
- Configurer les hyperparamètres clés selon la méthode choisie :
  - Isolation Forest : n_estimators, contamination, max_samples
  - Autoencoder : architecture (dimension du bottleneck), loss (MSE, MAE), epochs
  - One-Class SVM : kernel, nu, gamma
- Implémenter la validation croisée adaptée (TimeSeriesSplit pour les données temporelles)
- Gérer le déséquilibre extrême des classes si approche supervisée (SMOTE, class weights, focal loss)
- Logger les métriques et les paramètres pour chaque expérience

### 5. Définir les seuils de détection

- Analyser la distribution des scores d'anomalie sur les données de validation
- Choisir la méthode de seuillage :
  - Percentile fixe (ex: top 1% des scores)
  - Seuil statistique (moyenne + k * écart-type)
  - Optimisation sur la courbe precision-recall si labels disponibles
  - Seuil adaptatif basé sur une fenêtre glissante
- Calibrer le seuil selon le coût métier des faux positifs vs faux négatifs
- Implémenter des niveaux d'alerte multiples (warning, critical) si pertinent
- Documenter la justification du seuil choisi

### 6. Évaluer les performances

- Calculer les métriques adaptées au déséquilibre : precision, recall, F1, AUC-PR (pas uniquement accuracy)
- Tracer la courbe precision-recall et la courbe ROC
- Calculer le taux de faux positifs à différents seuils de rappel
- Évaluer la latence de détection : temps entre l'occurrence de l'anomalie et sa détection
- Tester sur des anomalies synthétiques injectées pour valider la sensibilité
- Comparer avec des baselines simples (seuil statistique, règles métier)

### 7. Déployer et monitorer en production

- Implémenter le pipeline d'inférence avec gestion du streaming si temps réel
- Configurer le système d'alerting (niveaux de sévérité, canaux de notification, suppression de doublons)
- Mettre en place un feedback loop : les analystes valident/invalident les alertes
- Monitorer le data drift pour détecter quand le modèle doit être recalibré
- Recalculer périodiquement les seuils sur les données récentes
- Maintenir un dashboard de suivi (taux de faux positifs, volume d'alertes, temps de résolution)

### 8. Itérer et améliorer

- Analyser systématiquement les faux positifs et faux négatifs en production
- Enrichir le dataset avec les anomalies confirmées pour améliorer le modèle
- Explorer les approches d'ensemble (combiner plusieurs détecteurs pour réduire les faux positifs)
- Adapter les features et le modèle à l'évolution des patterns d'anomalie
- Documenter les types d'anomalies détectés et manqués pour guider l'amélioration

## Rules

1. **Privilégier le recall sur la precision pour les anomalies critiques** : En détection de fraude ou en maintenance prédictive, manquer une anomalie réelle (faux négatif) coûte généralement beaucoup plus cher qu'une fausse alerte (faux positif). Calibrer les seuils en conséquence.

2. **Ne jamais utiliser l'accuracy comme métrique principale** : Avec 1% d'anomalies, un modèle qui prédit toujours "normal" obtient 99% d'accuracy. Utiliser systématiquement la precision, le recall, le F1-score et l'AUC-PR.

3. **Commencer par les méthodes simples** : Isolation Forest ou un seuil statistique bien calibré surpasse souvent un autoencoder complexe. Implémenter d'abord une baseline simple, puis complexifier uniquement si les performances sont insuffisantes.

4. **Le seuil est aussi important que le modèle** : Un excellent modèle avec un seuil mal calibré est inutile. Investir autant de temps dans le calibrage du seuil que dans l'entraînement du modèle, et recalibrer régulièrement en production.

5. **Prévoir la dérive des données** : Les patterns normaux et anormaux évoluent dans le temps. Mettre en place un monitoring du data drift et un processus de réentraînement périodique pour maintenir la pertinence du système.


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
