---
name: agent-cost-optimizer
description: Optimisation des coûts des agents IA — tokens, API calls, modèles, caching. Se déclenche avec "coût agent", "agent cher", "réduire les coûts IA", "token optimization", "optimiser les tokens", "budget agent", "agent cost", "économiser sur l'API".
---

# Agent Cost Optimizer

## Quand utiliser ce skill

Utilise ce skill lorsque l'utilisateur veut réduire les coûts de son agent IA, optimiser sa consommation de tokens, ou mettre en place des contrôles budgétaires. S'applique dès qu'on mentionne des dépenses API trop élevées, un besoin d'optimisation de prompts, de caching, de routing vers des modèles moins chers, ou de prévision budgétaire pour un agent en production.

## Workflow

1. **Audit des coûts actuels** — Établir la baseline avant d'optimiser :
   - Analyser le token usage par agent, par type de tâche, par outil
   - Calculer le coût réel : `(input_tokens × price_in) + (output_tokens × price_out)`
   - Identifier les 20% de requêtes qui génèrent 80% des coûts (règle de Pareto)
   - Outils : LangSmith cost tracking, Langfuse, logs structurés avec champs `cost_usd`

2. **Prompt optimization** — Réduire la taille des prompts sans perdre en qualité :
   - Supprimer les instructions redondantes, les exemples superflus, le verbose inutile
   - Compacter le system prompt (objectif : < 500 tokens pour agents simples)
   - Utiliser des instructions concises : "Réponds en JSON" vs long paragraphe explicatif
   - Tester chaque modification avec un jeu de cas de test pour valider que la qualité est maintenue

3. **Model routing** — Utiliser le bon modèle pour chaque tâche :
   - Modèle cheap (Claude Haiku, GPT-4o-mini, Gemini Flash) : classification, extraction, résumé simple
   - Modèle premium (Claude Sonnet/Opus, GPT-4o) : raisonnement complexe, génération créative, décisions critiques
   - Router intelligent : classifier la complexité de la requête avant de choisir le modèle
   ```python
   def route_model(task_complexity: str) -> str:
       return "claude-haiku-3" if task_complexity == "simple" else "claude-sonnet-4"
   ```

4. **Caching intelligent** — Éviter de payer pour les requêtes répétitives :
   - **Exact match cache** : hash du prompt → réponse stockée (Redis, TTL configurable)
   - **Semantic cache** : embeddings → trouver des réponses similaires (GPTCache, Langchain cache)
   - **Tool result cache** : cacher les résultats d'outils coûteux (recherches web, API externes)
   - **Prompt cache** (Anthropic/OpenAI natif) : préfixer le system prompt pour activer le cache API

5. **Context window management** — Contrôler la croissance du contexte :
   - Summarization progressive : résumer les anciens messages quand le contexte dépasse un seuil
   - Truncation intelligente : garder les N derniers messages + le résumé des précédents
   - Relevant context only : RAG pour injecter uniquement le contexte pertinent, pas tout le document
   - Sliding window : fenêtre glissante de K messages pour les conversations longues

6. **Batch processing** — Grouper les requêtes pour réduire les coûts :
   - Batch API (Anthropic, OpenAI) : jusqu'à 50% de réduction pour les traitements asynchrones
   - Regrouper les requêtes similaires : traiter N documents en un seul appel LLM si possible
   - Async bulk processing : file d'attente + worker, traitement par lots la nuit (tarifs réduits)
   - Éviter les appels LLM en boucle : traiter plusieurs items en une seule requête batch

7. **Tool call optimization** — Réduire le nombre d'appels aux outils :
   - Moins d'appels : combiner plusieurs outils en un seul quand possible
   - Batch tools : créer des outils qui acceptent plusieurs inputs en une fois
   - Cached tool results : stocker les résultats d'outils déterministes (ex : météo, données statiques)
   - Tool selection tuning : améliorer les descriptions d'outils pour que le LLM choisisse mieux du premier coup

8. **Architecture optimization** — Réduire les itérations de l'agent :
   - Réduire le nombre d'étapes agent (chaque LLM call coûte) : one-shot si possible
   - Early stopping : arrêter dès qu'une condition de succès est détectée
   - Confidence threshold : ne passer au modèle premium que si la confiance est < seuil
   - Paralléliser les tool calls indépendants (appels simultanés plutôt que séquentiels)

9. **Budget controls** — Limiter les dépenses de façon préventive :
   - Per-agent limits : plafond de coût par instance d'agent (`max_cost_usd = 0.50`)
   - Per-conversation caps : arrêter proprement si une conversation dépasse le budget
   - Daily budgets : alertes à 80% du budget, blocage à 100%
   - Hard limits côté code + côté API (paramètre `max_tokens` sur chaque requête)

10. **Cost monitoring et forecasting** — Piloter les coûts dans la durée :
    - Dashboards : coût par jour, par semaine, par utilisateur, par type de tâche
    - Unit economics : coût par tâche complétée, coût par utilisateur actif (objectif < $0.01)
    - Forecasting : projection mensuelle basée sur les tendances actuelles
    - ROI tracking : valeur générée par l'agent vs coût API (justifier l'investissement)

## Règles

- Fournis des exemples de code et configuration concrets, avec des calculs de coût réels basés sur les tarifs actuels des APIs.
- Priorise la sécurité et la fiabilité : ne jamais sacrifier la qualité critique pour des économies marginales.
- Documente les pièges courants : cache poisoning, résumés trop agressifs qui perdent du contexte, routing qui envoie des tâches complexes au mauvais modèle.
- Mesure toujours l'impact qualité d'une optimisation avant de la déployer en production.
- Adapte les recommandations au budget réel de l'utilisateur et à son provider LLM (Anthropic, OpenAI, Azure OpenAI, GCP Vertex).
