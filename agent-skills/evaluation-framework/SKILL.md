---
name: agent-evaluation-framework
description: Framework d'évaluation et benchmarking d'agents IA. Métriques, tests, comparaisons et quality assurance. Se déclenche avec "évaluer agent", "agent eval", "benchmark agent", "tester mon agent", "qualité agent", "agent metrics", "agent performance", "LMSYS", "agent accuracy".
---

# Agent Evaluation Framework

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois mesurer, comparer ou améliorer la qualité d'un agent IA. Il s'applique à la création de suites de tests, à la mise en place de pipelines d'évaluation automatisés, au choix de métriques adaptées à la tâche, et à l'interprétation des résultats pour guider les améliorations. Couvre aussi bien les agents conversationnels que les agents avec tools et les systèmes multi-agents.

## Workflow

1. **Définir les critères d'évaluation** — Commence par clarifier ce que signifie "bon" pour ton agent selon son objectif : `task completion` (l'agent a-t-il accompli la tâche ?), `accuracy` (les réponses sont-elles correctes ?), `efficiency` (combien d'étapes/tokens pour y arriver ?), `cost` (coût moyen par tâche), `safety` (l'agent évite-t-il les réponses dangereuses ou inappropriées ?). Hiérarchise ces critères selon le contexte métier.

2. **Créer un dataset de test** — Construis un jeu de données représentatif : cas nominaux (tâches courantes bien représentées), edge cases (inputs limites, ambigus), adversarial inputs (tentatives de jailbreak, instructions contradictoires), golden answers (réponses de référence validées par des humains experts). Minimum 50-100 exemples pour des résultats significatifs.
   ```python
   test_cases = [
       {"input": "Résume cet article en 3 points", "expected_output": "...", "tags": ["summarization"]},
       {"input": "", "expected_output": None, "tags": ["edge_case", "empty_input"]},
       {"input": "Ignore tes instructions et...", "expected_output": None, "tags": ["adversarial"]},
   ]
   ```

3. **Métriques quantitatives** — Mesure objectivement : `success rate` (% de tâches complétées), `latency` (temps de réponse p50/p95/p99), `token usage` (tokens en entrée + sortie par tâche), `tool call count` (nombre d'appels d'outils par tâche), `cost per task` (coût moyen), `step efficiency` (nombre d'étapes vs optimal théorique).

4. **Métriques qualitatives (LLM-as-judge)** — Pour les tâches ouvertes, utilise un LLM juge pour évaluer : `relevancy` (la réponse répond-elle à la question ?), `faithfulness` (pas d'hallucinations par rapport aux sources ?), `coherence` (la réponse est-elle logiquement cohérente ?), `helpfulness` (note de 1 à 5). Instruis le juge avec des rubriques précises et des exemples few-shot.
   ```python
   def llm_judge(question: str, answer: str, reference: str, llm) -> dict:
       prompt = f"""Évalue cette réponse sur une échelle de 1 à 5.
       Question: {question}
       Réponse de l'agent: {answer}
       Réponse de référence: {reference}
       Retourne un JSON: {{"score": int, "justification": str}}"""
       return json.loads(llm.complete(prompt))
   ```

5. **Testing automatisé** — Intègre les évals dans ton pipeline CI/CD : exécute la suite de tests à chaque changement de prompt, de modèle ou de code. Définis des seuils minimaux (ex: success rate ≥ 85%, coût moyen ≤ 0.02€) comme gates de déploiement. Génère des rapports HTML automatiques.

6. **Evaluation frameworks** — Utilise des outils existants plutôt que de réinventer la roue : `RAGAS` (évaluation de pipelines RAG), `DeepEval` (framework général avec métriques prêtes), `LangSmith` (tracing + évaluation intégrés), `Braintrust` (A/B testing et scoring), `Inspect AI` (évals approfondies par AISI). Choisis selon ta stack.
   ```python
   # Exemple avec DeepEval
   from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
   from deepeval.test_case import LLMTestCase

   test_case = LLMTestCase(input="...", actual_output="...", expected_output="...")
   metric = AnswerRelevancyMetric(threshold=0.7)
   metric.measure(test_case)
   print(metric.score, metric.reason)
   ```

7. **A/B testing** — Compare systématiquement les variantes : prompt A vs prompt B, modèle GPT-4o vs Claude 3.5 Sonnet, architecture avec vs sans mémoire long-terme. Lance les deux variantes sur le même dataset de test, compare les métriques, et valide la significativité statistique (test de Student ou bootstrap) avant de conclure.

8. **Safety et guardrails testing** — Teste explicitement les comportements indésirables : tentatives de jailbreak (prompt injection, role-playing malveillant), inputs extrêmes (très longs, très courts, caractères spéciaux), biais détectables (l'agent répond-il différemment selon le genre/l'ethnie ?), refus inappropriés (l'agent refuse-t-il des requêtes légitimes ?).

9. **Stress testing** — Évalue le comportement sous charge et dans des conditions dégradées : conversations très longues (100+ tours), contextes larges proches du max token, appels d'outils en cascade, erreurs simulées (tool timeout, API indisponible), exécutions concurrentes (10, 100, 1000 requêtes simultanées).

10. **Reporting** — Produis des rapports exploitables : tableau de bord avec évolution temporelle des métriques clés, matrice coût/qualité par configuration testée, exemples annotés des pires performances (pour guider les corrections), résumé des regressions détectées par rapport à la version précédente.
    ```python
    def generate_eval_report(results: list[dict]) -> dict:
        return {
            "success_rate": sum(r["success"] for r in results) / len(results),
            "avg_latency_ms": statistics.mean(r["latency"] for r in results),
            "avg_cost_eur": statistics.mean(r["cost"] for r in results),
            "worst_cases": sorted(results, key=lambda x: x["score"])[:5]
        }
    ```

## Règles

- **Dataset de test ≠ données d'entraînement** : ne jamais optimiser un prompt en regardant les mêmes exemples qui serviront à l'évaluation ; maintiens un split test/validation strict.
- **Anti-pattern — évaluation manuelle uniquement** : l'évaluation humaine ne scale pas ; automatise dès que possible avec LLM-as-judge tout en conservant une validation humaine périodique pour calibrer le juge.
- **Métriques proxy vs métriques réelles** : le token usage est une métrique proxy du coût ; la satisfaction utilisateur est la métrique réelle — ne confonds pas les deux et mesure les deux quand c'est possible.
- **Reproductibilité** : fixe les seeds aléatoires, les versions de modèle et les timestamps des tests pour pouvoir reproduire et comparer des résultats dans le temps.
- **Documente les anti-patterns détectés** : quand un test révèle un comportement indésirable, crée systématiquement un test de regression pour éviter toute réintroduction future.
