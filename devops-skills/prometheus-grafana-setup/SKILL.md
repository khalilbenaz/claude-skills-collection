---
name: prometheus-grafana-setup
description: Configuration de Prometheus et Grafana — scraping, exporters, règles d'alerte, Alertmanager, PromQL et construction de dashboards. À utiliser pour l'outillage lui-même ; pour décider quoi mesurer, voir dev-monitoring-setup. Se déclenche aussi avec "Prometheus", "Grafana", "monitoring", "alerting", "dashboard Grafana", "PromQL", "scraping", "Alertmanager". Also triggers on "Prometheus metrics", "Grafana dashboard", "alerting rules", "PromQL query".
---

# Setup Prometheus & Grafana

## Workflow en 5 étapes

### 1. Choisir la stratégie de déploiement

| Contexte | Option recommandée |
|---|---|
| Kubernetes | `kube-prometheus-stack` (Helm) |
| Docker Compose (dev/staging) | Compose multi-service |
| Bare metal / VM | Binaires + systemd |
| Grafana Cloud | Agent Alloy → cloud managed |

```bash
# Option Kubernetes (tout-en-un : Prometheus + Grafana + AlertManager + exporters)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword=changeme \
  --set prometheus.prometheusSpec.retention=15d
```

```yaml
# docker-compose.yml (dev)
services:
  prometheus:
    image: prom/prometheus:v2.52.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts:/etc/prometheus/alerts
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=15d
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:11.0.0
    environment:
      GF_SECURITY_ADMIN_PASSWORD: changeme
      GF_FEATURE_TOGGLES_ENABLE: publicDashboards
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    ports: ["3000:3000"]

  alertmanager:
    image: prom/alertmanager:v0.27.0
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports: ["9093:9093"]

volumes:
  grafana-data:
```

### 2. Instrumenter l'application

**Types de métriques — quand utiliser quoi :**

| Type | Caractéristique | Exemple concret |
|---|---|---|
| Counter | Monotone croissant | Requêtes totales, erreurs |
| Gauge | Libre variation | Connexions actives, RAM utilisée |
| Histogram | Buckets + count + sum | Latence (p50/p95/p99) |
| Summary | Quantiles côté client | Latence si pas besoin d'agrégation |

> Préférer Histogram à Summary quand les métriques seront agrégées entre plusieurs instances.

```csharp
// dotnet add package prometheus-net.AspNetCore
// Program.cs
app.UseHttpMetrics();
app.MapMetrics(); // expose /metrics

// Métriques custom
private static readonly Counter PaymentsTotal = Metrics
    .CreateCounter("payments_total", "Total paiements",
        new CounterConfiguration { LabelNames = ["status", "currency"] });

private static readonly Histogram PaymentDuration = Metrics
    .CreateHistogram("payment_duration_seconds", "Durée paiement",
        new HistogramConfiguration
        {
            // Buckets exponentiels : 10ms → ~10s
            Buckets = Histogram.ExponentialBuckets(0.01, 2, 10)
        });

// Utilisation
PaymentsTotal.WithLabels("success", "TND").Inc();
using (PaymentDuration.NewTimer()) { /* appel métier */ }
```

```go
// Go — github.com/prometheus/client_golang
var requestDuration = promauto.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "Durée des requêtes HTTP",
        Buckets: prometheus.DefBuckets,
    },
    []string{"method", "path", "status"},
)
```

### 3. Configurer le scraping Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s       # intervalle de collecte
  evaluation_interval: 15s   # évaluation des règles d'alerte

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

rule_files:
  - "alerts/*.yml"

scrape_configs:
  # Application custom
  - job_name: payment-api
    metrics_path: /metrics
    static_configs:
      - targets: ["payment-api:8080"]
    relabel_configs:
      - target_label: env
        replacement: production

  # Auto-découverte Kubernetes
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: $1

  # Exporter node (infra)
  - job_name: node-exporter
    static_configs:
      - targets: ["node-exporter:9100"]
```

### 4. Requêtes PromQL opérationnelles

```promql
# --- Taux d'erreur 5xx (%) sur 5 min ---
100 * sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# --- Latence p99 par service ---
histogram_quantile(0.99,
  sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
)

# --- Requêtes/s par endpoint ---
topk(10, sum by (path) (rate(http_requests_total[5m])))

# --- CPU (node-exporter) ---
100 - avg by (instance) (
  irate(node_cpu_seconds_total{mode="idle"}[5m])
) * 100

# --- RAM disponible (%) ---
100 * node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes

# --- Pods en état non-Ready (Kubernetes) ---
kube_pod_status_ready{condition="false"} == 1
```

### 5. Alertes et Alertmanager

```yaml
# alerts/slo-alerts.yml
groups:
  - name: slo
    rules:
      - alert: ErrorRateTooHigh
        expr: |
          (
            sum(rate(http_requests_total{status=~"5..",job="payment-api"}[5m]))
            / sum(rate(http_requests_total{job="payment-api"}[5m]))
          ) > 0.01
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Taux d'erreur > 1% sur payment-api"
          description: "Erreur actuelle : {{ $value | humanizePercentage }}"
          runbook: "https://wiki.internal/runbooks/payment-api"

      - alert: LatencyP99High
        expr: |
          histogram_quantile(0.99,
            sum by (le) (rate(http_request_duration_seconds_bucket{job="payment-api"}[5m]))
          ) > 1.0
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "p99 latence > 1s"
```

```yaml
# alertmanager.yml
route:
  group_by: [alertname, team]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: slack-critical
  routes:
    - match:
        severity: warning
      receiver: slack-warning

receivers:
  - name: slack-critical
    slack_configs:
      - api_url: "https://hooks.slack.com/services/XXX"
        channel: "#alerts-critical"
        title: "{{ .GroupLabels.alertname }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"
  - name: slack-warning
    slack_configs:
      - api_url: "https://hooks.slack.com/services/XXX"
        channel: "#alerts-warning"
```

## Dashboards Grafana — bonnes pratiques

**4 Golden Signals (Google SRE) à couvrir systématiquement :**
- **Latence** : p50 / p95 / p99 via `histogram_quantile`
- **Trafic** : req/s via `rate(…[5m])`
- **Erreurs** : taux 5xx / exceptions
- **Saturation** : CPU, RAM, connexions pool

**Provisioning as-code (recommandé en prod) :**
```yaml
# grafana/provisioning/dashboards/default.yaml
apiVersion: 1
providers:
  - name: default
    type: file
    options:
      path: /etc/grafana/dashboards
```
Placer les fichiers JSON exportés dans `/etc/grafana/dashboards/` — rechargés sans restart.

**Dashboards communautaires à importer (ID Grafana) :**
- `1860` — Node Exporter Full
- `315` — Kubernetes cluster
- `13659` — ASP.NET Core
- `11159` — RabbitMQ

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Label à haute cardinalité (ex: `user_id`) | TSDB explose, OOM Prometheus | N'utiliser que des labels stables (env, service, status) |
| `scrape_interval` < 10s sur beaucoup de cibles | Surcharge réseau + stockage | 15s par défaut, 30s pour infra stable |
| Alertes sans `for` | Faux positifs sur spike court | Toujours `for: 2m` minimum |
| Histograms avec buckets par défaut | Buckets inadaptés à la latence réelle | Dimensionner les buckets autour du SLO cible |
| Pas de `runbook` dans les annotations | Oncall sans contexte | Ajouter systématiquement un lien de procédure |
| Grafana sans provisioning as-code | Dashboards perdus au redémarrage | Versionner les JSON dans le repo |
| Rétention infinie | Disque plein | `--storage.tsdb.retention.time=30d` ou `--storage.tsdb.retention.size=50GB` |

## Validation rapide

```bash
# Vérifier la config Prometheus
docker run --rm -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:v2.52.0 promtool check config /etc/prometheus/prometheus.yml

# Vérifier les règles d'alerte
promtool check rules alerts/*.yml

# Tester une règle PromQL
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=rate(http_requests_total[5m])' | jq .

# Voir les alertes actives
curl -s http://localhost:9093/api/v2/alerts | jq '[.[] | {name:.labels.alertname, state:.status.state}]'
```
