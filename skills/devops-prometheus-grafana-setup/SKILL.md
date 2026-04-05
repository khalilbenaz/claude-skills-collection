---
name: devops-prometheus-grafana-setup
description: Configuration de Prometheus et Grafana pour le monitoring d'applications et d'infrastructure — métriques, alertes, dashboards. À utiliser quand l'utilisateur met en place du monitoring, configure des alertes ou crée des dashboards Grafana. Se déclenche aussi avec "Prometheus", "Grafana", "monitoring", "métriques", "alerting", "dashboard Grafana", "PromQL", "scraping".
---

# Setup Prometheus & Grafana

## Workflow

1. **Instrumenter** : ajouter des métriques dans l'application.
2. **Collecter** : configurer Prometheus pour scraper les métriques.
3. **Visualiser** : créer des dashboards Grafana.
4. **Alerter** : définir des règles d'alerte et des notifications.

## Types de métriques Prometheus

| Type | Usage | Exemple |
|------|-------|---------|
| **Counter** | Valeur qui ne fait qu'augmenter | Nombre de requêtes, erreurs |
| **Gauge** | Valeur qui monte et descend | Température, connexions actives |
| **Histogram** | Distribution de valeurs | Latence des requêtes |
| **Summary** | Percentiles calculés côté client | Latence (p50, p90, p99) |

## Instrumentation .NET

```csharp
// dotnet add package prometheus-net.AspNetCore

// Program.cs
app.UseHttpMetrics(); // Métriques HTTP automatiques
app.MapMetrics();      // Endpoint /metrics

// Métriques custom
public class PaymentMetrics
{
    private static readonly Counter PaymentsProcessed = Metrics
        .CreateCounter("payments_processed_total",
            "Nombre total de paiements traités",
            new CounterConfiguration
            {
                LabelNames = new[] { "status", "currency" }
            });

    private static readonly Histogram PaymentDuration = Metrics
        .CreateHistogram("payment_duration_seconds",
            "Durée de traitement d'un paiement",
            new HistogramConfiguration
            {
                Buckets = Histogram.ExponentialBuckets(0.01, 2, 10)
            });

    private static readonly Gauge ActiveTransactions = Metrics
        .CreateGauge("active_transactions",
            "Nombre de transactions en cours");

    public void RecordPayment(string status, string currency, double duration)
    {
        PaymentsProcessed.WithLabels(status, currency).Inc();
        PaymentDuration.Observe(duration);
    }
}
```

## Configuration Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts/*.yml"

scrape_configs:
  - job_name: 'payment-api'
    metrics_path: /metrics
    static_configs:
      - targets: ['payment-api:8080']
        labels:
          environment: 'production'

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

## Requêtes PromQL utiles

```promql
# Taux de requêtes par seconde (dernières 5 minutes)
rate(http_requests_total[5m])

# Latence p99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Taux d'erreur (%)
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m])) * 100

# Utilisation mémoire
process_resident_memory_bytes / 1024 / 1024
```

## Règles d'alertes

```yaml
# alerts/payment-alerts.yml
groups:
  - name: payment-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5..", job="payment-api"}[5m]))
          / sum(rate(http_requests_total{job="payment-api"}[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Taux d'erreur élevé sur Payment API"
          description: "Le taux d'erreur 5xx est supérieur à 5% depuis 5 minutes."

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="payment-api"}[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Latence élevée sur Payment API"
```

## Règles
- Chaque service doit exposer un endpoint `/metrics`.
- Les alertes critiques doivent avoir un `for` d'au moins 5 minutes pour éviter les faux positifs.
- Les dashboards Grafana doivent inclure les 4 golden signals (latence, trafic, erreurs, saturation).
- Les labels Prometheus doivent avoir une cardinalité maîtrisée (pas d'IDs uniques).


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
