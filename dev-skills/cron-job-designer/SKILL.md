---
name: cron-job-designer
description: Conception de tâches planifiées — cron expressions, scheduling patterns, monitoring et idempotence. Se déclenche avec "cron", "tâche planifiée", "scheduled task", "cron expression", "job scheduler", "crontab". Also triggers on "schedule a job", "recurring task design".
---

# Cron Job Designer

## Workflow

### 1. Qualifier le besoin

Avant d'écrire une expression cron, réponds à ces questions :

| Question | Impact |
|---|---|
| Fenêtre d'exécution stricte (ex. avant 6h) ? | Timeout max à fixer |
| Idempotent par nature ou à construire ? | Stratégie de verrou |
| Exécution multi-instances (k8s, cloud) ? | Leader election |
| Dépendance externe (API, DB, SFTP) ? | Circuit breaker + retry |
| Fréquence < 1 min ? | Cron inadapté → message queue |

### 2. Concevoir l'expression cron

Syntaxe standard (5 champs) :
```
┌── minute (0-59)
│  ┌── heure (0-23)
│  │  ┌── jour du mois (1-31)
│  │  │  ┌── mois (1-12)
│  │  │  │  ┌── jour de la semaine (0-6, 0=dim)
│  │  │  │  │
*  *  *  *  *
```

Exemples copiables :
```bash
# Tous les jours à 2h07 (décalé pour éviter 2h00)
7 2 * * *

# Toutes les 15 min en heures ouvrables (8h-18h, lun-ven)
*/15 8-18 * * 1-5

# Premier lundi du mois à 3h30
30 3 * * 1 [ $(date +\%d) -le 7 ] && /path/to/script.sh
# Alternative avec Quartz/Hangfire : "0 30 3 ? * 2#1"

# Dernier jour du mois à minuit (approximation)
55 23 28-31 * * [ $(date +\%d) -eq $(cal | awk 'NF{last=$NF} END{print last}') ]

# Chaque heure, décalé de 17 min
17 * * * *
```

Valideur en ligne : **crontab.guru** — toujours vérifier avant déploiement.

Syntaxes étendues (systemd, cloud) :
```bash
# systemd timer — OnCalendar
OnCalendar=Mon *-*-* 03:17:00

# AWS EventBridge (rate)
rate(1 hour)
# AWS EventBridge (cron, timezone UTC)
cron(17 2 * * ? *)

# Kubernetes CronJob
schedule: "17 2 * * *"
```

### 3. Choisir l'outil adapté

| Contexte | Outil recommandé | Remarque |
|---|---|---|
| Linux standalone | `cron` / `systemd timer` | systemd > cron : logs journald, retry natif |
| .NET / ASP.NET Core | **Hangfire** ou **Quartz.NET** | Hangfire = dashboard UI intégré |
| Java / Spring | **Quartz** ou `@Scheduled` | Quartz pour clustering |
| Node.js | **node-cron** ou **Bull** | Bull si queue nécessaire |
| Python | **Celery Beat** ou **APScheduler** | APScheduler pour scripts simples |
| Kubernetes | **CronJob** k8s | `concurrencyPolicy: Forbid` par défaut |
| Azure | **Azure Functions Timer** ou **Logic Apps** | Timer Trigger = NCRONTAB (6 champs) |
| AWS | **EventBridge Scheduler** | Remplace CloudWatch Events |
| GCP | **Cloud Scheduler** | HTTP target ou Pub/Sub |

### 4. Garantir l'idempotence

Patterns selon le cas :

**Marqueur en base (le plus simple) :**
```sql
-- Avant traitement
INSERT INTO job_executions (job_name, run_date, status)
VALUES ('daily-report', CAST(GETDATE() AS DATE), 'running')
-- Si PK violation → déjà en cours, skip

-- Après traitement
UPDATE job_executions SET status = 'done', ended_at = GETDATE()
WHERE job_name = 'daily-report' AND run_date = CAST(GETDATE() AS DATE)
```

**Verrou Redis (multi-instances) :**
```python
import redis
r = redis.Redis()
lock = r.set("job:daily-report", "1", nx=True, ex=300)  # TTL = timeout max
if not lock:
    print("Job already running, skip")
    exit(0)
try:
    run_job()
finally:
    r.delete("job:daily-report")
```

**Hangfire (.NET) — DisableConcurrentExecution :**
```csharp
[DisableConcurrentExecution(timeoutInSeconds: 600)]
public void DailyReport() { ... }
```

### 5. Gérer les erreurs et les retries

Stratégie par défaut :
- **3 tentatives** avec backoff exponentiel : 1 min → 5 min → 15 min
- **Alerte** dès le 1er échec (ne pas attendre le 3e)
- **Dead letter** : log détaillé + ticket automatique après épuisement des retries

```python
# Celery
@app.task(bind=True, max_retries=3, default_retry_delay=60)
def daily_sync(self):
    try:
        sync()
    except TemporaryError as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

Décision circuit breaker : si le job dépend d'une API externe, ne pas reessayer
indéfiniment — ouvrir le circuit après 3 échecs consécutifs et attendre 10 min.

### 6. Configurer le monitoring

Métriques minimales à collecter :
- `job_started_at`, `job_ended_at`, durée d'exécution
- Statut : `success` / `failed` / `skipped`
- Nombre d'enregistrements traités

```bash
# Pattern de log structuré (JSON)
{"event":"job_start","job":"daily-report","ts":"2026-06-24T02:17:00Z"}
{"event":"job_end","job":"daily-report","ts":"2026-06-24T02:19:43Z","status":"success","records":1542,"duration_s":163}
```

**Healthchecks.io / Cronitor** : ping HTTP à la fin de chaque exécution réussie.
Si le ping n'arrive pas dans la fenêtre attendue → alerte automatique.

```bash
# Ping de fin (shell)
curl -fsS --retry 3 https://hc-ping.com/UUID > /dev/null
```

Alerte sur exécution manquée : configurer un timeout = `période × 1.5` (ex. job
quotidien → alerte si pas de ping en 36h).

### 7. Mécanisme de déclenchement manuel

Chaque job doit pouvoir s'exécuter hors du scheduler :

```bash
# Linux : wrapper avec flag
./scripts/daily-report.sh --force

# Hangfire : API ou dashboard
BackgroundJob.Enqueue(() => new DailyReportJob().Run());

# k8s : déclencher manuellement un CronJob
kubectl create job daily-report-manual --from=cronjob/daily-report
```

## Anti-patterns et pièges

**Exécution aux heures rondes** — `0 * * * *` au lieu de `17 * * * *` :
toutes les instances cloud redémarrent souvent en début d'heure → pics de charge.

**Pas de timeout** — un job bloqué occupe un slot indéfiniment et empêche le
suivant de s'exécuter. Toujours fixer `activeDeadlineSeconds` (k8s) ou un
`CancellationToken` avec timeout.

**Skip silencieux** — si `concurrencyPolicy: Forbid` et que le job précédent
tourne encore, k8s skip sans alerte. Monitorer `kube_cronjob_missed_schedule_time`.

**Tâche trop fine** — des milliers de micro-crons pour traiter chaque ligne
indépendamment. Préférer un batch unique qui parcourt les lignes en boucle.

**Dépendance à l'heure locale** — cron tourne en UTC sur la plupart des serveurs.
Un job "à 8h du matin" en heure d'été Europe/Paris → `6 * * * *` en UTC.
Documenter la timezone et utiliser `TZ=Europe/Paris` dans crontab ou le scheduler.

**Accumulation de jobs en attente** — si un job rate et que les retries s'accumulent,
la queue explose. Mettre un `max_retries` + TTL sur chaque job.

## Bonnes pratiques 2026

- Préférer **systemd timers** à cron sur Linux : logs journald, `OnFailure=`, `RandomizedDelaySec` intégré.
- En environnement cloud-native, **ne pas dockeriser un cron** — utiliser un CronJob k8s ou le scheduler cloud natif.
- Stocker les expressions cron **dans le code** (Infrastructure as Code), pas dans une UI manuelle.
- Tester les expressions avec `--dry-run` ou en environnement de staging avec une fréquence augmentée temporairement.
- Documenter chaque job : expression cron, timezone, durée attendue, propriétaire, impact si manqué.
