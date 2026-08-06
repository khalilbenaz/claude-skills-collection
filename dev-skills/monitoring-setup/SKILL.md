---
name: monitoring-setup
description: Mise en place de monitoring, alerting et observabilité. Se déclenche avec "monitoring", "alerting", "observabilité", "Prometheus", "Grafana", "logs", "metrics", "tracing", "dashboards", "Application Insights". Also triggers on "set up monitoring", "alerting rules", "observability stack", "dashboards and metrics".
---

# Monitoring Setup

## 1. Choix de la stack — critères de décision

| Contexte | Stack recommandée |
|---|---|
| Azure (App Service / AKS / Functions) | Application Insights + Azure Monitor + Log Analytics |
| AWS | CloudWatch + X-Ray + OpenSearch |
| On-premise / multi-cloud | Prometheus + Grafana + Loki + Tempo (stack LGTM) |
| Kubernetes toutes plateformes | kube-prometheus-stack (Helm) |
| Budget zéro, startup | Grafana Cloud free tier (10k metrics, 50 GB logs) |

---

## 2. Workflow en étapes

### Étape 1 — Définir les SLI/SLO avant d'instrumenter

Avant tout code, fixez les objectifs :

```yaml
# slo.yaml — documenter dans le repo
service: payment-api
slo:
  availability: 99.9%        # 43 min/mois max d'indispo
  latency_p99: 500ms
  error_rate: < 0.1%
window: 30d
```

Règle : un SLO non documenté ne sera jamais respecté.

### Étape 2 — Instrumenter avec OpenTelemetry (2026 : standard universel)

```bash
# .NET
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Exporter.Prometheus.AspNetCore

# Node.js
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

```csharp
// Program.cs — ASP.NET Core
builder.Services.AddOpenTelemetry()
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter())
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter()); // vers Grafana Tempo ou Jaeger
```

```python
# Python (FastAPI)
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
FastAPIInstrumentor.instrument_app(app, excluded_urls="health,ready")
```

### Étape 3 — Déployer Prometheus + Grafana sur Kubernetes

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword=changeme \
  --set prometheus.prometheusSpec.retention=15d \
  --set prometheus.prometheusSpec.retentionSize=10GB
```

Vérifier que les targets sont up :
```bash
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090 -n monitoring
# http://localhost:9090/targets
```

### Étape 4 — Logging structuré JSON (obligatoire)

```csharp
// Serilog — .NET
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Service", "payment-api")
    .WriteTo.Console(new JsonFormatter())
    .CreateLogger();

// Toujours inclure : TraceId, UserId, RequestId
using (LogContext.PushProperty("TraceId", Activity.Current?.TraceId))
{
    _logger.LogInformation("Payment processed {Amount} for {UserId}", amount, userId);
}
```

```yaml
# Promtail config pour Loki — scrape les pods K8s
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - json:
          expressions:
            level: level
            traceId: traceId
      - labels:
          level:
          traceId:
```

### Étape 5 — Règles d'alerte Prometheus — Golden Signals

```yaml
# alerts.yaml
groups:
  - name: golden-signals
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate {{ $value | humanizePercentage }} on {{ $labels.service }}"
          runbook: "https://wiki/runbooks/high-error-rate"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p99 latency {{ $value }}s"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
```

### Étape 6 — Application Insights (Azure)

```csharp
// Program.cs
builder.Services.AddApplicationInsightsTelemetry(
    options => options.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]);

// Custom metric métier
private readonly TelemetryClient _telemetry;
_telemetry.TrackMetric("Payment.Amount", amount, new Dictionary<string, string> {
    { "Currency", currency }, { "Channel", channel }
});
```

```kusto
// Requête Log Analytics — taux d'erreur par endpoint (dernière heure)
requests
| where timestamp > ago(1h)
| summarize total=count(), errors=countif(resultCode >= 500) by name
| extend errorRate = round(100.0 * errors / total, 2)
| order by errorRate desc
```

### Étape 7 — Dashboards Grafana — structure recommandée

1. **Overview** : SLO burn rate, error budget restant, golden signals globaux
2. **Service** : latence p50/p95/p99, RPS, error rate, saturation CPU/mémoire
3. **Infrastructure** : nodes K8s, pods restarts, PVC usage
4. **Business** : KPIs métier (commandes/min, revenus, conversions)

Importer le dashboard ID `1860` (Node Exporter Full) et `15661` (Kubernetes) comme base.

### Étape 8 — Routing des alertes (Alertmanager)

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: slack-default
  routes:
    - match:
        severity: critical
      receiver: pagerduty-oncall

receivers:
  - name: slack-default
    slack_configs:
      - api_url: $SLACK_WEBHOOK
        channel: '#alerts'
        text: "{{ .CommonAnnotations.summary }}\nRunbook: {{ .CommonAnnotations.runbook }}"

  - name: pagerduty-oncall
    pagerduty_configs:
      - routing_key: $PD_KEY
```

---

## 3. Garde-fous / Anti-patterns

**Ne PAS faire :**
- Alerter sur la cause technique (CPU > 80%) sans lier à un impact utilisateur — génère du bruit
- Logs non structurés (`Console.WriteLine("error: " + ex)`) — non requêtables, non corrélables
- Un dashboard par développeur — gouvernance zéro, duplication, dépend de données locales
- Seuils d'alerte fixes sans tenir compte de la saisonnalité (trafic nuit vs jour)
- Stocker des données sensibles (PII, tokens) dans les logs ou spans

**Faire attention à :**
- Cardinalité des labels Prometheus : jamais `userId` ou `requestId` comme label (explosion de séries)
- Rétention : Prometheus par défaut 15 jours — prévoir remote_write vers Thanos ou Mimir pour long terme
- Alertes en `for: 0m` — faux positifs sur spike court ; minimum `for: 2m` pour critical
- OpenTelemetry sampling : 100% en dev, 10-20% en prod (coût et volume)

---

## 4. Bonnes pratiques 2026

- **OpenTelemetry est le standard** : éviter les SDK propriétaires (Datadog agent, New Relic APM) comme seule instrumentation ; préférer OTLP + backend swappable
- **Erreur budgets** : tracker le burn rate SLO en temps réel, pas juste le SLO instantané
- **Health endpoints standard** :
  ```
  GET /health/live   → 200 si le process tourne
  GET /health/ready  → 200 si le service peut accepter du trafic (DB, dépendances OK)
  ```
- **Corrélation logs-traces** : injecter `TraceId` et `SpanId` dans chaque log — permet de passer d'une alerte Grafana à la trace Tempo en un clic
- **Runbook obligatoire** : chaque alerte doit avoir un lien `runbook` dans ses annotations avant d'être activée en production
- **Review mensuelle** : supprimer les alertes qui n'ont pas déclenché d'action depuis 30 jours (bruit ou obsolètes)
