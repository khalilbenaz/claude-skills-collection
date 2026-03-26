---
name: agent-context-manager
description: Gestion avancée du contexte pour agents IA — fenêtre de contexte, compression, RAG dynamique. Se déclenche avec "context window", "contexte agent", "token limit", "context management", "context overflow", "trop de contexte", "agent context", "context stuffing", "context compression".
---

# Agent Context Manager

## Quand utiliser ce skill
Utilise ce skill lorsqu'un agent atteint les limites de sa fenêtre de contexte, lorsque tu dois optimiser les coûts liés aux tokens ou lorsque tu conçois une architecture agent devant gérer des conversations longues, des documents volumineux ou des sessions multi-tours persistantes.

## Workflow

1. **Analyse du budget tokens** — Cartographier l'allocation de la fenêtre de contexte du modèle cible (ex. 128k tokens pour GPT-4o, 200k pour Claude 3.5) : system prompt (fixe), descriptions d'outils (fixe), historique de conversation (dynamique), contexte RAG injecté (dynamique), réponse attendue (réservée). Calculer les budgets maximum par couche et définir les seuils d'alerte (ex. alerte à 80 %, compression obligatoire à 90 %).

2. **Stratégie de contexte** — Choisir la stratégie adaptée au cas d'usage : allocation fixe (proportions prédéfinies par couche), allocation dynamique (ajustement selon la nature de la requête), priority-based (prioriser selon l'importance calculée des segments), adaptive (apprentissage des patterns d'usage). Documenter la stratégie choisie et ses paramètres dans la configuration de l'agent.

3. **Compression de contexte** — Implémenter la compression pour réduire les parties moins critiques : résumé de l'historique ancien par LLM léger (ex. `gpt-4o-mini`), extraction des informations clés (entités, décisions, faits établis), distillation en bullet points structurés. Mesurer le taux de compression atteint et le taux de rétention de l'information critique.

4. **Sliding window** — Gérer l'historique de conversation avec une fenêtre glissante : conserver les N derniers échanges en verbatim, remplacer les échanges plus anciens par un résumé progressif (progressive summarization). Format recommandé : `[RÉSUMÉ DES ÉCHANGES PRÉCÉDENTS: ...]` + échanges récents complets. Recalculer le résumé à chaque dépassement de seuil.

5. **Dynamic RAG** — Injecter le contexte à la demande plutôt qu'en bloc : analyser la requête utilisateur pour identifier les besoins d'information, récupérer uniquement les chunks pertinents (top-k avec score de pertinence minimum), injecter juste avant la génération. Utiliser un reranker (Cohere Rerank, cross-encoder) pour maximiser la pertinence des chunks sélectionnés.

6. **Priorisation du contexte** — Implémenter un système de scoring pour chaque segment de contexte : score de récence (échanges récents > anciens), score de pertinence sémantique à la requête courante, score d'importance déclaré (informations marquées comme critiques). Combiner les scores avec des poids configurables. En cas de contrainte, éliminer les segments avec le score le plus bas.

7. **Assemblage multi-sources** — Orchestrer l'assemblage final du contexte en respectant l'ordre optimal : system prompt → instructions d'outils → mémoire long terme → contexte RAG pertinent → historique récent → requête courante. Chaque source a un template et des délimiteurs explicites. Valider le total avant envoi et déclencher la compression si nécessaire.

8. **Comptage et monitoring des tokens** — Intégrer un comptage précis avec `tiktoken` (OpenAI) ou `anthropic.count_tokens()` (Anthropic) à chaque assemblage. Logger en temps réel : tokens utilisés par couche, pourcentage de la fenêtre consommée, coût estimé, événements de compression déclenchés. Exposer ces métriques dans le dashboard de monitoring.

9. **Gestion des débordements** — Définir des comportements de dégradation gracieuse : compression automatique des segments moins prioritaires, notification à l'utilisateur ("Je résume les échanges précédents pour optimiser la réponse"), truncation en dernier recours avec avertissement. Ne jamais laisser l'API retourner une erreur de contexte sans la gérer applicativement.

10. **Optimisation des performances** — Réduire la latence et les coûts : mettre en cache le contexte stable entre les tours (system prompt, descriptions d'outils, mémoire long terme invariante), utiliser le prompt caching natif d'Anthropic/OpenAI quand disponible, pré-calculer les embeddings RAG, effectuer les résumés de compression en arrière-plan après chaque tour.

## Règles

- **Budget tokens explicite** : tout agent en production doit avoir un budget tokens documenté par couche. Un dépassement silencieux est une erreur de conception, pas un comportement acceptable.
- **Compression avec validation** : après toute compression, vérifier que les informations critiques (instructions système, contraintes de sécurité, contexte utilisateur essentiel) ont bien été préservées via une liste de contrôle automatisée.
- **Transparence des compromis** : informer l'utilisateur lorsqu'une compression de contexte a eu lieu et peut affecter la cohérence des réponses. Ne jamais simuler une mémoire parfaite qui n'existe pas.
- **Adapter la stratégie au modèle** : les stratégies de contexte varient significativement selon le modèle (fenêtre disponible, coût par token, qualité de la compression). Recalibrer lors de tout changement de modèle.
- **Tester les cas de débordement** : inclure des tests spécifiques pour les scénarios de near-overflow et overflow dans la suite de tests de l'agent. Ces cas sont souvent les plus difficiles à diagnostiquer en production.
