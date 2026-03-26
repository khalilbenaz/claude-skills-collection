---
name: ai-ml-nlp-pipeline-designer
description: "Conception de pipelines NLP (tokenization, embeddings, NER, sentiment, summarization)"
triggers:
  - "NLP"
  - "traitement du langage"
  - "NER"
  - "sentiment analysis"
  - "text classification"
  - "spaCy"
  - "HuggingFace"
---

# NLP Pipeline Designer

Guide complet pour la conception et l'implémentation de pipelines de traitement du langage naturel, de la tokenization aux tâches avancées comme la NER, l'analyse de sentiment et la summarization.

## Workflow

### 1. Analyser la tâche NLP et définir le pipeline

- Identifier la tâche principale : classification de texte, NER, sentiment analysis, summarization, question answering, traduction
- Déterminer la langue cible et les spécificités linguistiques (multilingue, dialectes, jargon technique)
- Choisir l'approche : modèle pré-entraîné (HuggingFace Transformers), pipeline spaCy, ou solution custom
- Évaluer les contraintes de latence, volume et coût (batch vs temps réel)
- Définir les métriques d'évaluation adaptées à la tâche (F1, precision, recall, ROUGE, BLEU)

### 2. Préparer et prétraiter le corpus textuel

- Collecter les textes depuis les sources identifiées (bases de données, APIs, fichiers)
- Nettoyer les textes : suppression du HTML/markdown, normalisation unicode, gestion des caractères spéciaux
- Détecter et gérer la langue de chaque document si corpus multilingue
- Appliquer les prétraitements spécifiques : lowercasing, suppression des stopwords (si pertinent), lemmatisation
- Segmenter les documents longs en chunks cohérents si nécessaire (sentence splitting, paragraph splitting)
- Annoter le corpus pour les tâches supervisées (labels de classe, entités nommées, relations)

### 3. Configurer la tokenization et les embeddings

- Choisir le tokenizer adapté au modèle : WordPiece (BERT), BPE (GPT), SentencePiece (T5, mBART)
- Configurer la longueur maximale des séquences et la stratégie de troncation/padding
- Pour les approches classiques : configurer TF-IDF, Word2Vec, FastText ou GloVe
- Pour les Transformers : utiliser les embeddings contextuels du modèle pré-entraîné
- Gérer les tokens hors vocabulaire (OOV) et les sous-mots rares
- Tester la couverture du vocabulaire sur le corpus cible

### 4. Sélectionner et configurer le modèle

- Pour la classification : BERT, RoBERTa, CamemBERT (français), DistilBERT (léger)
- Pour la NER : spaCy NER, BERT-CRF, token classification avec Transformers
- Pour la summarization : BART, T5, Pegasus, mBART (multilingue)
- Pour le sentiment : modèles fine-tunés sur des corpus de sentiment, ou zero-shot avec NLI
- Charger le modèle pré-entraîné via HuggingFace ou spaCy
- Adapter l'architecture si nécessaire (ajout de couches, modification de la tête)

### 5. Entraîner ou fine-tuner le modèle

- Préparer les DataLoaders avec batching dynamique et padding intelligent
- Configurer l'entraînement : learning rate (2e-5 à 5e-5 pour BERT), warmup steps, weight decay
- Appliquer le fine-tuning progressif : geler les couches basses, puis débloquer progressivement
- Monitorer la loss et les métriques de validation à chaque epoch
- Utiliser l'early stopping basé sur la métrique de validation principale
- Pour les tâches few-shot : explorer SetFit, prompt tuning ou in-context learning

### 6. Construire le pipeline de bout en bout

- Assembler les composants : prétraitement, tokenization, modèle, post-traitement
- Implémenter le post-traitement des prédictions (décodage BIO pour NER, beam search pour la génération)
- Gérer les cas limites : textes vides, textes trop longs, langues non supportées
- Ajouter la gestion des erreurs et le fallback gracieux
- Optimiser le pipeline pour le batch processing si nécessaire
- Documenter les entrées/sorties et les formats attendus

### 7. Évaluer et itérer

- Calculer les métriques détaillées par classe/entité (classification report complet)
- Analyser les erreurs : faux positifs récurrents, entités manquées, confusion entre classes
- Tester sur des données hors distribution pour évaluer la robustesse
- Créer un jeu de test de non-régression avec des cas critiques
- Itérer sur le dataset et le modèle en fonction des erreurs identifiées

## Rules

1. **Choisir le bon niveau de complexité** : Ne pas utiliser un Transformer de 340M de paramètres quand un TF-IDF + régression logistique suffit. Commencer simple, complexifier seulement si les performances l'exigent. La complexité ajoutée doit être justifiée par un gain mesurable.

2. **Respecter les spécificités linguistiques** : Pour le français, utiliser CamemBERT ou FlauBERT plutôt qu'un modèle anglais. Pour le multilingue, utiliser XLM-RoBERTa ou mBERT. Un modèle entraîné sur la bonne langue surpasse systématiquement un modèle générique.

3. **Ne jamais évaluer sur les données d'entraînement** : Toujours maintenir un set de test strictement séparé. Pour la NER, s'assurer que les mêmes entités n'apparaissent pas dans le train et le test (entity-level split si possible).

4. **Gérer la longueur des textes explicitement** : Définir une stratégie claire pour les textes dépassant la limite du tokenizer (troncation, sliding window, hierarchical approach). Ignorer ce problème cause des pertes silencieuses d'information.

5. **Versionner le pipeline complet** : Le modèle seul ne suffit pas. Versionner ensemble le code de prétraitement, le tokenizer, le modèle et le post-traitement. Un changement dans n'importe quel composant peut modifier les résultats.
