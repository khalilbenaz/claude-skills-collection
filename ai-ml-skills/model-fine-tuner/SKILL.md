---
name: model-fine-tuner
description: "Guide pour le fine-tuning de modèles ML/LLM (LoRA, QLoRA, PEFT, datasets, hyperparamètres)"
triggers:
  - "fine-tuning"
  - "fine-tune"
  - "LoRA"
  - "QLoRA"
  - "PEFT"
  - "adapter"
  - "entraîner un modèle"
---

# Model Fine-Tuner

Guide complet pour le fine-tuning de modèles de machine learning et de grands modèles de langage (LLM), en utilisant des techniques efficientes comme LoRA, QLoRA et PEFT.

## Workflow

### 1. Analyser le cas d'usage et choisir le modèle de base

- Identifier la tâche cible (classification, génération, extraction, etc.)
- Sélectionner un modèle pré-entraîné adapté (LLaMA, Mistral, BERT, GPT, etc.)
- Évaluer les performances du modèle de base sur la tâche avant fine-tuning (baseline)
- Vérifier la licence du modèle et les contraintes d'utilisation

### 2. Préparer et valider le dataset de fine-tuning

- Formater les données selon le format attendu (instruction/response, prompt/completion, etc.)
- Nettoyer les données : supprimer les doublons, corriger les erreurs, gérer les valeurs manquantes
- Créer les splits train/validation/test avec des proportions appropriées (ex: 80/10/10)
- Vérifier la distribution des classes et appliquer un équilibrage si nécessaire
- Tokeniser les données et vérifier la longueur maximale des séquences

### 3. Configurer la méthode de fine-tuning

- Choisir entre fine-tuning complet, LoRA, QLoRA ou autre méthode PEFT
- Pour LoRA/QLoRA : définir le rang (r), alpha, dropout et les modules cibles
- Configurer la quantification si QLoRA (4-bit, 8-bit, nf4, double quantization)
- Paramétrer le type d'adaptateur selon la tâche (LoraConfig, PrefixTuningConfig, etc.)

### 4. Définir les hyperparamètres d'entraînement

- Configurer le learning rate (typiquement 1e-4 à 5e-5 pour le fine-tuning)
- Définir le batch size en fonction de la mémoire GPU disponible (utiliser gradient accumulation si nécessaire)
- Paramétrer le nombre d'epochs (généralement 1 à 5 pour les LLM)
- Configurer le scheduler (cosine, linear decay), le warmup ratio et le weight decay
- Activer le gradient checkpointing pour économiser la mémoire

### 5. Lancer l'entraînement avec monitoring

- Initialiser le Trainer (HuggingFace Transformers, Axolotl, ou framework custom)
- Configurer le logging vers W&B, MLflow ou TensorBoard
- Surveiller la loss d'entraînement et de validation en temps réel
- Mettre en place l'early stopping pour éviter le surapprentissage
- Sauvegarder les checkpoints régulièrement

### 6. Évaluer le modèle fine-tuné

- Calculer les métriques sur le set de test (perplexité, BLEU, ROUGE, accuracy, F1)
- Comparer les performances avec le modèle de base (baseline vs fine-tuné)
- Tester manuellement avec des exemples représentatifs et des cas limites
- Évaluer les biais potentiels et les comportements indésirables

### 7. Fusionner et exporter le modèle

- Fusionner les poids de l'adaptateur avec le modèle de base (merge_and_unload)
- Exporter dans le format souhaité (SafeTensors, GGUF, ONNX)
- Quantifier le modèle final si nécessaire pour le déploiement
- Publier sur HuggingFace Hub ou un registry interne avec une model card

### 8. Itérer et optimiser

- Analyser les erreurs du modèle pour identifier les faiblesses
- Enrichir le dataset avec des exemples ciblés sur les cas d'échec
- Ajuster les hyperparamètres en fonction des résultats
- Documenter chaque itération pour la reproductibilité

## Rules

1. **Toujours établir une baseline** : Mesurer les performances du modèle de base avant tout fine-tuning. Sans baseline, il est impossible de quantifier l'amélioration réelle apportée par le fine-tuning.

2. **Privilégier les méthodes PEFT pour les LLM** : Utiliser LoRA ou QLoRA plutôt qu'un fine-tuning complet sauf si les ressources le permettent et que la tâche l'exige. Cela réduit drastiquement la mémoire et le temps d'entraînement.

3. **Ne jamais entraîner sans set de validation** : Toujours surveiller la loss de validation pour détecter le surapprentissage. Un modèle qui performe bien sur le train set mais mal sur le validation set est inutilisable en production.

4. **Versionner chaque expérience** : Enregistrer systématiquement les hyperparamètres, le dataset utilisé, les métriques et les checkpoints. La reproductibilité est essentielle pour comparer et itérer efficacement.

5. **Vérifier la qualité des données avant tout** : Un dataset de mauvaise qualité produira un modèle de mauvaise qualité, indépendamment de la sophistication de la méthode de fine-tuning. Investir du temps dans la curation des données est toujours rentable.
