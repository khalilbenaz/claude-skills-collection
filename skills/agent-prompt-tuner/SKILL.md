---
name: agent-prompt-tuner
description: Optimisation systématique des prompts d'agents pour améliorer performance et fiabilité. Se déclenche avec "optimiser prompt agent", "agent prompt", "améliorer mon agent", "prompt tuning", "agent accuracy", "agent qui se trompe", "calibrer agent", "affiner prompt".
---

# Agent Prompt Tuner

## Quand utiliser ce skill
Utilise ce skill lorsqu'un agent produit des résultats incorrects, incohérents ou sous-optimaux et que tu dois diagnostiquer et corriger ses prompts. Il s'applique aussi lors de la création d'un nouvel agent pour structurer ses instructions dès le départ, ou lors d'une migration vers un nouveau modèle LLM nécessitant une recalibration.

## Workflow

1. **Mesure de la baseline** — Définir et mesurer les métriques de performance actuelles avant toute modification : taux de succès par type de tâche, fréquence des erreurs, coût moyen par requête, latence P50/P95. Constituer un dataset d'évaluation de 50 à 200 exemples représentatifs. Cette baseline est le point de référence absolu pour toute amélioration.

2. **Analyse des erreurs** — Classifier les échecs observés en catégories distinctes : erreurs de formatage (sortie mal structurée), erreurs de raisonnement (logique incorrecte), hallucinations (faits inventés), mauvais usage des outils (appel au mauvais outil ou mauvais arguments), hors-domaine (refus inapproprié ou réponse hors-scope). Quantifier chaque catégorie pour prioriser les corrections.

3. **Structure du system prompt** — Revoir l'architecture du system prompt selon l'ordre optimal : définition du rôle et de la persona, liste des capacités disponibles, contraintes et interdictions explicites, format de sortie attendu avec exemples, gestion des cas d'erreur. Chaque section doit être délimitée clairement. Supprimer les instructions redondantes ou contradictoires.

4. **Ingénierie des few-shot examples** — Sélectionner les exemples les plus représentatifs et diversifiés : couvrir les variations d'input, les cas difficiles et les edge cases critiques. Format recommandé : 3 à 8 exemples pour les tâches complexes, 1 à 3 pour les tâches simples. Chaque exemple doit illustrer exactement le comportement désiré, incluant la structure de la réponse et le niveau de détail attendu.

5. **Chain-of-thought tuning** — Décider quand imposer un raisonnement explicite (scratchpad, étapes numérotées) vs réponse directe. Pour les tâches de raisonnement multi-étapes : forcer `<thinking>...</thinking>` avant la réponse finale. Pour les tâches de classification simples : réponse directe plus efficace. Calibrer la profondeur du raisonnement selon la complexité de la tâche.

6. **Optimisation des descriptions d'outils** — Réécrire chaque description d'outil pour maximiser la clarté : nom explicite, description en une phrase, paramètres documentés avec types et exemples, indication explicite des cas d'usage et de non-usage. Exemple : "Utilise `search_web` UNIQUEMENT pour des informations récentes ou factuelles externes. N'utilise PAS pour des calculs ou des tâches de transformation de données."

7. **Guardrails dans le prompt** — Intégrer des instructions de validation et de récupération d'erreur directement dans le prompt : "Si tu n'es pas sûr, réponds UNCERTAIN plutôt que d'inventer", "Vérifie toujours le format JSON avant de retourner", "En cas d'outil non disponible, explique ce que tu aurais fait". Définir le comportement attendu pour chaque classe d'erreur anticipée.

8. **A/B testing systématique** — Créer des variantes de prompt (généralement 2 à 4) et les évaluer sur le dataset de référence. Mesurer la significativité statistique des différences (test de Student, intervalle de confiance à 95 %). Ne déployer une variante que si l'amélioration est statistiquement significative ET si le gain justifie l'éventuelle augmentation de coût ou latence.

9. **Versionnage des prompts** — Gérer les prompts comme du code : commits git avec messages explicatifs, branches pour les expérimentations, tags pour les versions stables. Maintenir un `CHANGELOG.md` des prompts avec : date, auteur, modification, métriques avant/après. Permettre le rollback immédiat vers n'importe quelle version précédente en cas de régression.

10. **Amélioration continue** — Mettre en place une boucle de feedback : collecter les échecs en production via logging, les analyser hebdomadairement, identifier les patterns, mettre à jour le dataset d'évaluation et relancer un cycle d'optimisation. Planifier des réévaluations périodiques lors des mises à jour de modèles LLM ou des changements de cas d'usage.

## Règles

- **Mesurer avant de modifier** : toute optimisation sans baseline mesurée est une intuition, pas une amélioration. Constituer le dataset d'évaluation avant d'écrire la première ligne de prompt révisé.
- **Une variable à la fois** : modifier un seul aspect du prompt par itération (structure, few-shots, format, instructions d'outils) pour isoler l'effet de chaque changement et interpréter correctement les résultats.
- **Spécificité des instructions** : les instructions vagues ("réponds bien", "sois précis") sont moins efficaces que les instructions spécifiques ("réponds en 3 phrases maximum", "inclus toujours une source"). Chaque instruction doit être vérifiable.
- **Trade-offs documentés** : documenter explicitement les compromis de chaque décision de prompt (longueur vs coût, raisonnement explicite vs latence, strictesse vs flexibilité) pour faciliter les décisions futures de l'équipe.
- **Ne pas sur-optimiser** : un prompt trop spécifique au dataset de test généralise mal en production. Valider toujours sur un ensemble de données hors du dataset d'optimisation avant le déploiement.


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
