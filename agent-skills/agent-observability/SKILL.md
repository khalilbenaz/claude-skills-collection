---
name: agent-observability
description: Observabilité complète pour agents IA — distributed tracing, métriques custom, log correlation et dashboards de supervision. Se déclenche avec "observabilité agent", "tracing agent", "métriques agent", "agent observability", "OpenTelemetry agent".
---

# Agent Observability

## Workflow

### 1. Choisir la stratégie d'instrumentation

Identifie les trois piliers à couvrir selon le type d'agent :

| Type d'agent | Traces | Métriques prioritaires | Logs |
|---|---|---|---|
| Agent autonome (ReAct) | Chaque itération reason→act | tokens/iter, nb iterations | prompt + tool calls |
| Orchestrateur multi-agents | Spans parent→enfant par sous-agent | latence inter-agents, taux délégation | handoff payloads |
| Agent RAG | Retrieval + LLM call séparés | recall@k, rerank score, latence retrieval | query + docs retenus |
| Pipeline séquentiel | Un span par étape du pipeline | throughput, erreurs par étape | inputs/outputs chaque step |

**Critère de décision :** si tu as plus de 2 agents en chaîne → distributed tracing obligatoire. Agent isolé → métriques + logs structurés suffisent pour commencer.

---

### 2. Instrumenter avec OpenTelemetry

Installer le SDK Python ou TypeScript selon le runtime :

```bash
# Python
pip install opentelemetry-sdk opentelemetry-exporter-otlp opentelemetry-instrumentation-httpx

# TypeScript / Node
npm install @opentelemetry/sdk-node @opentelemetry/exporter-otlp-http @opentelemetry/instrumentation-http
```

Initialiser le tracer en entrée de l'agent (une seule fois) :

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor

provider = TracerProvider(resource=Resource({"service.name": "my-agent", "agent.version": "1.0"}))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4318")))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)
```

Wrapper minimal autour des appels LLM :

```python
def call_llm(prompt: str, model: str = "claude-sonnet-4-6") -> str:
    with tracer.start_as_current_span("llm.call") as span:
        span.set_attributes({
            "llm.model": model,
            "llm.prompt_tokens": count_tokens(prompt),
            "llm.prompt_hash": sha256(prompt)[:8],  # pas le texte en clair
        })
        response = client.messages.create(model=model, messages=[{"role": "user", "content": prompt}])
        span.set_attributes({
            "llm.completion_tokens": response.usage.output_tokens,
            "llm.cost_usd": estimate_cost(response.usage),
        })
        return response.content[0].text
```

Propager le context entre agents (HTTP) :

```python
from opentelemetry.propagate import inject, extract

# Agent émetteur — injecter dans les headers
headers = {}
inject(headers)
requests.post("http://sub-agent/run", json=payload, headers=headers)

# Agent récepteur — extraire le context
ctx = extract(request.headers)
with tracer.start_as_current_span("sub_agent.run", context=ctx):
    ...
```

---

### 3. Définir les métriques custom agents IA

```python
from opentelemetry import metrics

meter = metrics.get_meter("agent-metrics")

# Compteurs et histogrammes à créer
llm_tokens = meter.create_counter("agent.llm.tokens_total", unit="tokens")
llm_latency = meter.create_histogram("agent.llm.latency_ms", unit="ms")
tool_calls = meter.create_counter("agent.tool.calls_total")
tool_errors = meter.create_counter("agent.tool.errors_total")
task_iterations = meter.create_histogram("agent.task.iterations")
agent_cost = meter.create_counter("agent.cost_usd_total", unit="USD")

# Usage dans le code
llm_tokens.add(tokens, {"model": model, "agent_id": agent_id})
llm_latency.record(elapsed_ms, {"model": model})
```

Métriques critiques à ne pas oublier :
- `agent.task.success_rate` — taux de tâches réussies (objectif vs résultat)
- `agent.loop.detected` — compteur de boucles infinies détectées
- `agent.handoff.count` — délégations entre agents (multi-agent)
- `agent.context_window.utilization` — % de fenêtre contexte utilisé

---

### 4. Structurer les logs avec corrélation trace

```python
import logging, json
from opentelemetry import trace

class AgentLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def _base(self, extra: dict) -> dict:
        span = trace.get_current_span()
        ctx = span.get_span_context()
        return {
            "trace_id": format(ctx.trace_id, "032x") if ctx.is_valid else None,
            "span_id": format(ctx.span_id, "016x") if ctx.is_valid else None,
            **extra,
        }

    def tool_call(self, tool: str, params: dict, result_summary: str):
        self.logger.info(json.dumps(self._base({
            "event": "tool.call",
            "tool": tool,
            "params_keys": list(params.keys()),  # pas les valeurs sensibles
            "result_summary": result_summary[:200],
        })))

    def decision(self, reason: str, action: str):
        self.logger.info(json.dumps(self._base({
            "event": "agent.decision",
            "reason": reason[:500],
            "action": action,
        })))
```

**Règle de masquage PII** : ne logguer que les clés des paramètres (pas les valeurs), tronquer les textes libres à 200-500 chars, ne jamais logguer tokens API, mots de passe, données personnelles.

---

### 5. Dashboards — panels essentiels

**Grafana / Datadog — structure recommandée :**

```
Panel 1 — Overview (last 1h)
  - Agents actifs (gauge)
  - Requêtes/min (time series)
  - Taux d'erreur % (stat + threshold rouge >5%)
  - Coût total estimé (stat)

Panel 2 — LLM Performance
  - Latence p50/p95/p99 par modèle (histogram)
  - Tokens consommés par requête (time series)
  - Distribution des longueurs de prompt (histogram)

Panel 3 — Tool Calls
  - Top 10 outils les plus appelés (bar chart)
  - Taux d'échec par outil (table)
  - Latence moyenne par outil (bar chart)

Panel 4 — Multi-agent (si applicable)
  - Graphe de dépendances agents (node graph panel)
  - Latence inter-agents (heatmap)
  - Chaînes les plus longues (table)

Panel 5 — Traces individuelles
  - Lien vers Jaeger/Tempo avec filtre trace_id
```

---

### 6. Alertes — seuils 2026

```yaml
# Prometheus AlertManager — exemples copiables
- alert: AgentHighLatency
  expr: histogram_quantile(0.95, agent_llm_latency_ms_bucket) > 10000
  for: 5m
  labels: { severity: warning }
  annotations:
    summary: "LLM p95 latency > 10s sur {{ $labels.model }}"

- alert: AgentLoopDetected
  expr: increase(agent_loop_detected_total[5m]) > 0
  labels: { severity: critical }
  annotations:
    summary: "Boucle infinie détectée — agent {{ $labels.agent_id }}"

- alert: AgentHighCost
  expr: increase(agent_cost_usd_total[1h]) > 10
  labels: { severity: warning }
  annotations:
    summary: "Coût agent > $10/h — vérifier les requêtes abusives"

- alert: AgentErrorRate
  expr: rate(agent_tool_errors_total[5m]) / rate(agent_tool_calls_total[5m]) > 0.1
  for: 3m
  labels: { severity: critical }
```

---

### 7. Tracer les workflows multi-agents

Pattern recommandé — chaque agent reçoit et propage le trace context :

```python
# Orchestrateur — crée la trace racine
with tracer.start_as_current_span("orchestrator.task", attributes={"task.id": task_id}):
    # Déléguer à sous-agent A
    with tracer.start_as_current_span("delegate.agent_a"):
        result_a = call_sub_agent("agent-a", payload_a)

    # Déléguer à sous-agent B en parallèle
    with tracer.start_as_current_span("delegate.agent_b"):
        result_b = call_sub_agent("agent-b", payload_b)

    # Agréger
    with tracer.start_as_current_span("aggregate"):
        final = aggregate(result_a, result_b)
```

Visualisation dans Jaeger/Tempo : waterfall view → identifier quel agent bloque la chaîne.

---

## Anti-patterns et pièges

| Piège | Conséquence | Solution |
|---|---|---|
| Logguer le prompt complet en prod | Fuite PII + coût stockage élevé | Hash du prompt + tronquage |
| Créer un span par token streamé | Overhead OTel > temps LLM | Un seul span par appel LLM complet |
| Pas de sampling en prod | Volume ingestion x100 | Tail-based sampling à 10-20% + 100% sur erreurs |
| Alertes sur métriques brutes sans baseline | Fatigue d'alerte dès le lancement | Définir les seuils après 1 semaine d'observation |
| Trace context non propagé vers les workers async | Traces orphelines, corrélation impossible | Toujours passer le context explicitement aux threads/coroutines |
| Métriques LLM sans dimension `model` | Impossible de comparer les modèles | Toujours tagger avec `model`, `agent_id`, `env` |
| Retention 30 jours par défaut | Coûts ingestion élevés | 7j traces détaillées, 90j métriques agrégées |

---

## Bonnes pratiques 2026

- **Sampling stratégique** : 100% en dev, tail-based 10-20% en prod (garder 100% des erreurs et des spans lents).
- **OpenTelemetry Collector** comme proxy — ne pas exporter directement depuis l'agent vers Datadog/Grafana, passer par le collector pour buffering et retry.
- **Semantic conventions LLM** : utiliser les attributs standardisés `gen_ai.*` (spec OpenTelemetry Semantic Conventions for LLM Systems, stable depuis 2025).
- **Cost attribution** : tagger chaque span avec `tenant_id` et `feature_id` pour le chargeback par équipe/feature.
- **Offline replay** : sauvegarder les traces complètes des cas d'échec pour rejouer en local lors du debug.
- **SLO sur les agents** : définir un SLO explicite (ex: 95% des tâches < 15s, taux succès > 98%) et alerter sur le burn rate, pas sur les seuils bruts.
