---
name: cron-job-designer
description: Conception de tâches planifiées — cron expressions, scheduling patterns, monitoring et idempotence. Se déclenche avec "cron", "tâche planifiée", "scheduled task", "cron expression", "job scheduler", "crontab".
---

# Cron Job Designer

## Workflow

1. **Identifier les tâches à planifier** — Recenser les opérations récurrentes (nettoyage de données, envoi de rapports, synchronisation, backups, renouvellement de tokens) et définir la fréquence, la fenêtre d'exécution et les dépendances entre tâches.

2. **Concevoir les expressions cron** — Écrire les expressions cron adaptées au besoin (minute, heure, jour du mois, mois, jour de la semaine). Couvrir les cas courants : exécution quotidienne, hebdomadaire, mensuelle, et les patterns avancés (premier lundi du mois, toutes les 15 minutes en heures ouvrables).

3. **Assurer l'idempotence** — Concevoir chaque tâche pour être idempotente : utiliser des marqueurs de traitement, des verrous distribués (Redis lock, database advisory lock), et des mécanismes de détection de doublons pour éviter les effets de bord en cas de double exécution.

4. **Implémenter la gestion des erreurs** — Définir la stratégie de retry (nombre de tentatives, délai entre retries, exponential backoff), les alertes en cas d'échec, le dead letter queue pour les tâches en erreur persistante, et le circuit breaker si la tâche dépend d'un service externe.

5. **Configurer le monitoring** — Mettre en place le suivi d'exécution : logs structurés (début, fin, durée, statut), métriques (taux de succès, durée moyenne, retard d'exécution), alertes sur les exécutions manquées ou trop longues, et dashboard de visualisation.

6. **Gérer la concurrence et le scaling** — Empêcher les exécutions parallèles non désirées avec des verrous distribués, configurer le leader election pour les environnements multi-instances, et définir les timeouts d'exécution maximum.

7. **Choisir l'outil de scheduling** — Sélectionner la solution adaptée au contexte : crontab Linux, Hangfire (.NET), Quartz (Java), node-cron (Node.js), Celery Beat (Python), Azure Functions Timer Trigger, AWS EventBridge, ou Kubernetes CronJob.

## Règles

- Chaque tâche planifiée doit être idempotente — une double exécution ne doit jamais corrompre les données ni produire d'effets indésirables.
- Implémente toujours un mécanisme de monitoring et d'alerte sur les exécutions manquées ou en échec.
- Documente chaque tâche planifiée avec son expression cron, sa description fonctionnelle, sa durée attendue et son contact responsable.
- Évite les exécutions aux heures rondes (00, 15, 30, 45) pour répartir la charge — ajoute un décalage (ex. :03, :17, :33).
- Prévois un mécanisme de déclenchement manuel pour chaque tâche planifiée, indépendamment du scheduler, pour les cas de rattrapage ou de debug.
