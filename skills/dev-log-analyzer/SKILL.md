---
name: dev-log-analyzer
description: Analyse de logs pour diagnostiquer problèmes et patterns. Se déclenche avec "logs", "analyser les logs", "erreur dans les logs", "log parsing", "structured logging", "Serilog", "ELK", "debug production".
---

# Log Analyzer

## Workflow
1. Collecter et identifier le format des logs : distinguer les formats structured JSON (préféré), plain text avec regex parsing, syslog (RFC 5424), ou propriétaires (IIS, Apache, Nginx) ; identifier les champs clés disponibles (timestamp, level, message, correlation ID, user, service).
2. Filtrer et rechercher efficacement : utiliser les outils adaptés au contexte (grep/awk en CLI, KQL dans Application Insights, Lucene dans Kibana, LogQL dans Grafana Loki) ; filtrer par plage temporelle, niveau de log, correlation ID, utilisateur ou endpoint concerné.
3. Identifier les patterns d'erreurs : repérer les exceptions récurrentes (top N par count), les error spikes (pics soudains sur la timeline), les cascading failures (une erreur qui en déclenche d'autres), et distinguer les erreurs fonctionnelles des erreurs d'infrastructure.
4. Corréler entre services : reconstituer la chaîne de requête complète via les correlation IDs (W3C TraceContext, B3 headers), utiliser le distributed tracing (OpenTelemetry, Jaeger, Zipkin, Application Insights) pour suivre une transaction à travers les microservices.
5. Analyser les performances via les logs : extraire les slow queries (duration > seuil), identifier les requêtes HTTP à haute latence, calculer les percentiles (P50, P95, P99) sur les temps de réponse loggés, détecter les timeouts et les retry storms.
6. Appliquer les best practices de structured logging : configurer Serilog (.NET), NLog, Winston (Node.js) ou Logback (Java) avec enrichissement contextuel automatique (user ID, tenant, version, environment), choisir les niveaux de log appropriés (Debug/Info/Warning/Error/Fatal), éviter le log flooding.
7. Mettre en place la centralisation des logs : configurer ELK Stack (Elasticsearch + Logstash/Filebeat + Kibana), Grafana Loki (plus léger, stockage par labels), Application Insights (Azure), CloudWatch Logs Insights (AWS) ou Datadog selon l'infrastructure existante.
8. Créer des alertes basées sur les logs : définir des seuils sur les error rates (ex: > 1% d'erreurs 5xx), configurer l'anomaly detection sur les patterns inhabituels, créer des custom queries pour les KPIs métier critiques (paiements échoués, authentifications bloquées).

## Règles
- Adapter les requêtes et outils au système de logs de l'utilisateur (ELK, Loki, CloudWatch, Application Insights, etc.).
- Commencer par le filtrage temporel et le correlation ID pour isoler rapidement le problème en production.
- Fournir des commandes et requêtes prêtes à l'emploi, pas seulement des explications conceptuelles.
- Proposer la centralisation et le structured logging comme amélioration durable après le diagnostic immédiat.
- Respecter la confidentialité : ne jamais suggérer de logger des données personnelles, mots de passe ou tokens sensibles.


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
