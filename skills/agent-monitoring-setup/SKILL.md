---
name: agent-monitoring-setup
description: Monitoring et observabilité pour agents IA en production. Traces, métriques, alertes. Se déclenche avec "monitoring agent", "observabilité agent", "LangSmith", "traces agent", "agent logs", "surveiller mon agent", "agent debugging", "agent analytics".
---

# Agent Monitoring Setup

## Quand utiliser ce skill

Utilise ce skill lorsque l'utilisateur veut mettre en place l'observabilité d'un agent IA en production, diagnostiquer des comportements inattendus, ou comprendre les performances et coûts de son agent. S'applique dès qu'on parle de traces, métriques, logs structurés, dashboards, alertes, ou évaluation continue de la qualité des réponses.

## Workflow

1. **Les 4 piliers de l'observabilité agent** — Poser les fondations :
   - **Traces** : séquence complète d'une exécution (LLM calls, tool calls, décisions)
   - **Métriques** : agrégats numériques (latence, tokens, coût, taux d'erreur)
   - **Logs** : événements structurés détaillés (inputs, outputs, étapes intermédiaires)
   - **Évaluations** : scores de qualité automatisés (correctness, faithfulness, relevance)

2. **Tracing** — Choisir et intégrer un backend de tracing :
   - **LangSmith** (LangChain natif) : `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY=...`
   - **Langfuse** (open source) : SDK Python/JS, auto-instrumentation LangChain/LlamaIndex
   - **Phoenix/Arize** : focus ML observability, compatible OpenTelemetry
   - **OpenTelemetry** : standard ouvert, compatible avec Jaeger, Tempo, Datadog
   - Instrumenter les spans manuellement pour les agents custom (début/fin de chaque étape)

3. **Métriques clés à collecter** — Définir les KPIs de l'agent :
   - Latence : p50, p95, p99 par type de requête (détecter les outliers)
   - Token usage : input tokens, output tokens, cached tokens (par agent, par task)
   - Coût : `$` par requête, par conversation, par utilisateur
   - Taux de succès : complétions réussies vs erreurs vs timeouts
   - Tool call frequency : quels outils sont utilisés, combien de fois par session

4. **Logging structuré** — Émettre des logs exploitables :
   ```python
   import structlog
   logger = structlog.get_logger()
   logger.info("agent_step", conversation_id=cid, step="tool_call",
               tool="search_web", input=query, duration_ms=duration,
               tokens_used=tokens, success=True)
   ```
   Inclure systématiquement : `conversation_id`, `user_id`, `step`, `tool`, `error_code`.

5. **Dashboards** — Visualiser les données en temps réel :
   - **Grafana** : connecter à Prometheus (métriques) + Loki (logs), templates pré-construits
   - **LangSmith dashboard** : traces, évaluations, comparaisons de versions
   - **Langfuse** : dashboard intégré coût + qualité + usage
   - Créer une vue "cost per conversation" et "error rate over time" en priorité

6. **Alerting** — Définir les alertes critiques :
   - Error rate spike : > 5% d'erreurs sur 5 minutes → PagerDuty / Slack
   - Cost anomaly : dépense > 2x la moyenne quotidienne → alerte email
   - Latency degradation : p95 > 10s → alerte équipe
   - Safety violations : contenu filtré ou refus inapproprié → alerte immédiate
   - Configurer des seuils graduels (warning, critical) pour éviter la fatigue d'alertes

7. **Replay et debugging** — Diagnostiquer les incidents :
   - Conversation replay : rejouer une session complète depuis les traces stockées
   - Step-by-step trace : inspecter chaque étape (LLM call, tool call, décision)
   - Input reproduction : extraire l'input exact d'un run pour le reproduire en local
   - LangSmith / Langfuse : interface graphique pour explorer les traces en détail

8. **Quality monitoring** — Évaluation continue automatisée :
   - LLM-as-judge : utiliser un LLM (Claude, GPT-4) pour noter les réponses (1-5)
   - Métriques : correctness, faithfulness, relevance, hallucination rate
   - User feedback : intégrer thumbs up/down → lier au `conversation_id` dans les traces
   - Regression detection : comparer qualité avant/après chaque déploiement

9. **Cost tracking** — Suivre et anticiper les dépenses :
   - Granularité : par agent, par conversation, par tool, par utilisateur
   - Tendances : daily/weekly cost trends, coût moyen par task type
   - Unit economics : coût par tâche complétée, coût par utilisateur actif
   - Alertes budgétaires : seuil journalier, seuil mensuel, prévision de dépassement

10. **Incident response** — Réagir aux incidents de production :
    - Runbooks documentés : playbook pour chaque type d'incident courant
    - Alert routing : PagerDuty, OpsGenie, ou Slack selon la criticité
    - Escalation matrix : qui contacter pour erreurs LLM, sécurité, coût
    - Post-mortem structuré : timeline, root cause, mesures correctives, suivi

## Règles

- Fournis des exemples de code et configuration concrets pour l'outil de monitoring choisi par l'utilisateur.
- Priorise la sécurité : masquer les PII dans les logs et traces (email, téléphone, données sensibles).
- Documente les pièges courants : sur-logging (coût stockage), alertes trop sensibles (fatigue), traces trop volumineuses.
- Impose un `conversation_id` unique dès le début pour corréler toutes les données.
- Adapte les dashboards et alertes au cloud provider de l'utilisateur (AWS CloudWatch, Azure Monitor, GCP Cloud Operations).


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
