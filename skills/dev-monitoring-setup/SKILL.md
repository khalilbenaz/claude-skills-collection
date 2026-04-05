---
name: dev-monitoring-setup
description: Mise en place de monitoring, alerting et observabilité. Se déclenche avec "monitoring", "alerting", "observabilité", "Prometheus", "Grafana", "logs", "metrics", "tracing", "dashboards", "Application Insights".
---

# Monitoring Setup

## Workflow
1. Définition des SLI/SLO/SLA : identification des indicateurs clés (latence p95/p99, taux de disponibilité, error rate, throughput) et définition des objectifs par service
2. Architecture des 3 piliers de l'observabilité : metrics pour l'état du système, logs pour le détail des événements, traces pour le suivi des requêtes distribuées
3. Setup des métriques : instrumentation avec Prometheus (exporters, custom metrics), Azure Monitor ou CloudWatch, intégration des KPIs métier
4. Setup du logging centralisé : collecte et indexation avec la stack ELK (Elasticsearch/Logstash/Kibana) ou Loki/Grafana, structured logging JSON, corrélation avec les traces
5. Setup du distributed tracing : instrumentation des services avec OpenTelemetry, déploiement de Jaeger ou Zipkin, propagation du contexte entre microservices
6. Création des dashboards : tableaux de bord Grafana ou Azure Dashboards avec vues par service, golden signals (latence, traffic, errors, saturation) et KPIs métier
7. Configuration des alertes : définition des seuils critiques, détection d'anomalies, routing on-call (PagerDuty, OpsGenie), escalade et silencing des alertes non-actionnables
8. Rédaction des runbooks : playbooks de réponse aux incidents courants, procédures de diagnostic, arbres de décision pour les alertes récurrentes

## Règles
- Adapte la stack de monitoring à la plateforme de l'utilisateur (Azure Monitor + Application Insights, AWS CloudWatch + X-Ray, stack open-source Prometheus/Grafana)
- Fournis des configurations complètes et commentées (dashboards JSON, règles d'alerte Prometheus, pipelines de logs)
- Priorise l'actionnabilité des alertes : chaque alerte doit avoir un runbook associé et être liée à un impact utilisateur mesurable
- Propose des solutions progressives : monitoring basique des golden signals d'abord, puis observabilité avancée avec tracing et anomaly detection


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
