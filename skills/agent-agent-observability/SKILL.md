---
name: agent-agent-observability
description: Observabilité complète pour agents IA — distributed tracing, métriques custom, log correlation et dashboards de supervision. Se déclenche avec "observabilité agent", "tracing agent", "métriques agent", "agent observability", "OpenTelemetry agent".
---

# Agent Observability

## Workflow

1. **Définir la stratégie d'observabilité** — Identifier les trois piliers à instrumenter pour les agents IA : traces distribuées (parcours d'exécution), métriques (performance et usage), et logs structurés (événements et erreurs). Adapter la granularité au type d'agent (autonome, orchestré, multi-agent).

2. **Instrumenter avec OpenTelemetry** — Intégrer le SDK OpenTelemetry dans l'agent pour générer des spans sur chaque étape : appel LLM, tool calling, récupération de contexte (RAG), décision de routage, et interaction utilisateur. Propager le trace context entre agents et services.

3. **Configurer les métriques custom** — Définir les métriques spécifiques aux agents IA : nombre de tokens consommés, latence par appel LLM, taux de succès des tool calls, nombre d'itérations par tâche, coût par requête, et taux d'hallucination détecté.

4. **Structurer les logs** — Implémenter le logging structuré (JSON) avec corrélation aux traces : prompt envoyé, réponse LLM (tronquée), outils appelés, paramètres et résultats, décisions prises, et erreurs rencontrées. Inclure le trace_id et span_id dans chaque log.

5. **Construire les dashboards** — Créer des dashboards de supervision dans Grafana, Datadog ou Azure Monitor : vue d'ensemble des agents actifs, performance par agent, analyse des coûts, détection des anomalies, et drill-down sur les traces individuelles.

6. **Configurer les alertes** — Définir les alertes sur les seuils critiques : latence d'exécution anormale, taux d'erreur élevé, consommation de tokens excessive, boucles infinies détectées, et agents non responsifs.

7. **Tracer les workflows multi-agents** — Instrumenter les échanges entre agents avec des spans parent-enfant, visualiser le graphe d'exécution complet, mesurer les latences inter-agents, et identifier les goulots d'étranglement dans les chaînes de traitement.

8. **Analyser et optimiser** — Exploiter les données d'observabilité pour optimiser les prompts (réduire les tokens), identifier les outils lents, détecter les patterns de défaillance récurrents, et améliorer la qualité des réponses via l'analyse des traces.

## Règles

- Instrumente chaque appel LLM et chaque tool call comme un span distinct avec les métadonnées pertinentes (modèle, tokens, latence).
- Ne log jamais les données sensibles des utilisateurs en clair — masque les PII et les secrets dans les traces et logs.
- Corrèle systématiquement les logs aux traces distribuées via trace_id pour permettre le drill-down depuis les dashboards.
- Définis des budgets d'alerte réalistes pour éviter la fatigue d'alerte — priorise les anomalies impactant l'expérience utilisateur.
- Conserve un historique des traces suffisant pour l'analyse post-mortem (minimum 7 jours) tout en maîtrisant les coûts de stockage.
