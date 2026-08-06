---
name: agent-monitoring-setup
description: Monitoring et observabilité pour agents IA en production — traces distribuées, métriques LLM, alertes coût/qualité, dashboards, debugging. Se déclenche avec "monitoring agent", "observabilité agent", "LangSmith", "traces agent", "agent logs", "surveiller mon agent", "agent debugging", "agent analytics". Also triggers on "monitor my agent", "agent alerting", "agent cost alerts".
---

# Agent Monitoring Setup

## Quand utiliser ce skill

Mise en place de l'observabilité d'un agent IA en production : traces, métriques, logs structurés, dashboards, alertes coût/qualité, debugging d'incidents.

---

## Étape 1 — Choisir le backend de tracing

| Outil | Cas d'usage | Hébergement |
|---|---|---|
| **LangSmith** | LangChain natif, éval intégrée | SaaS |
| **Langfuse** | Open source, multi-framework | Self-hosted / SaaS |
| **Arize Phoenix** | ML observability, RAG eval | Self-hosted / SaaS |
| **OpenTelemetry + Jaeger** | Standard ouvert, multi-service | Self-hosted |
| **Datadog / New Relic** | Monitoring infra unifié | SaaS |

**Critère de décision :**
- LangChain → LangSmith (zéro config)
- Budget limité / données sensibles → Langfuse self-hosted
- Équipe SRE existante avec Datadog → OpenTelemetry + Datadog
- RAG avec éval de fidélité → Phoenix

---

## Étape 2 — Instrumenter l'agent

### LangSmith (LangChain)
```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=lsv2_...
export LANGCHAIN_PROJECT=my-agent-prod
```
Tout appel LangChain est automatiquement tracé. Pas de code supplémentaire.

### Langfuse (multi-framework)
```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

lf = Langfuse(public_key="pk-...", secret_key="sk-...", host="https://cloud.langfuse.com")

@observe()  # trace automatique de la fonction entière
def run_agent(user_input: str, conversation_id: str):
    langfuse_context.update_current_trace(
        user_id="user-42",
        session_id=conversation_id,
        tags=["prod", "v2.1"],
    )
    # ... logique agent
```

### OpenTelemetry (agent custom)
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider

tracer = trace.get_tracer("my-agent")

with tracer.start_as_current_span("llm_call") as span:
    span.set_attribute("model", "claude-sonnet-4-5")
    span.set_attribute("input_tokens", 450)
    span.set_attribute("output_tokens", 120)
    response = llm.invoke(prompt)
    span.set_attribute("latency_ms", elapsed)
```

---

## Étape 3 — Logging structuré

Chaque événement doit comporter les champs de corrélation obligatoires :

```python
import structlog

log = structlog.get_logger()

log.info("agent_step",
    conversation_id=cid,   # OBLIGATOIRE — corrèle toutes les données
    user_id=uid,
    step="tool_call",
    tool="search_web",
    input_hash=hash(query),  # ne pas logguer PII en clair
    duration_ms=elapsed,
    tokens_used=tokens,
    success=True,
    error_code=None,
)
```

**Champs obligatoires :** `conversation_id`, `user_id`, `step`, `tool`, `success`, `error_code`.

---

## Étape 4 — Métriques clés à exposer

Exposer via Prometheus (ou équivalent) :

```python
from prometheus_client import Histogram, Counter, Gauge

agent_latency = Histogram("agent_request_duration_seconds",
    "Latence par requête", ["agent_name", "task_type"],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30])

agent_tokens = Counter("agent_tokens_total",
    "Tokens consommés", ["model", "direction"])  # direction=input|output

agent_cost_usd = Counter("agent_cost_usd_total",
    "Coût en dollars", ["model", "agent_name"])

agent_errors = Counter("agent_errors_total",
    "Erreurs", ["error_type"])  # timeout|safety|api_error|tool_error
```

**KPIs prioritaires :** p95 latence, tokens/requête, $/conversation, taux d'erreur, tool call frequency.

---

## Étape 5 — Dashboards Grafana

Panels essentiels (importer depuis `grafana.com/grafana/dashboards`) :

```
Row 1 — Trafic & Latence
  - Requests/min (stat)
  - p50 / p95 / p99 latence (time series)
  - Taux d'erreur % (gauge + threshold rouge >5%)

Row 2 — Coût & Tokens
  - Tokens/jour par modèle (bar chart)
  - Coût cumulé du jour vs veille (stat)
  - Top 10 conversations les plus chères (table)

Row 3 — Qualité
  - LLM-as-judge score moyen (time series)
  - Taux de refus/safety violations (stat)
  - User feedback ratio 👍/👎 (gauge)
```

---

## Étape 6 — Alertes (Alertmanager / PagerDuty / Slack)

```yaml
# prometheus/rules/agent.yml
groups:
  - name: agent_alerts
    rules:
      - alert: AgentErrorRateHigh
        expr: rate(agent_errors_total[5m]) / rate(agent_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Taux d'erreur agent > 5% depuis 2 min"

      - alert: AgentLatencyDegraded
        expr: histogram_quantile(0.95, agent_request_duration_seconds_bucket) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 latence > 10s"

      - alert: AgentCostAnomaly
        expr: increase(agent_cost_usd_total[1h]) > 2 * avg_over_time(increase(agent_cost_usd_total[1h])[7d:1h])
        labels:
          severity: warning
        annotations:
          summary: "Coût horaire > 2x la moyenne 7j"
```

Routing : `critical` → PagerDuty, `warning` → Slack `#agent-alerts`.

---

## Étape 7 — Quality monitoring (LLM-as-judge)

```python
import anthropic

def evaluate_response(question: str, answer: str) -> dict:
    client = anthropic.Anthropic()
    prompt = f"""Évalue cette réponse d'agent (score 1-5) :
Question : {question}
Réponse : {answer}

Critères : pertinence, exactitude, concision.
Réponds UNIQUEMENT en JSON : {{"score": X, "reason": "..."}}"""

    result = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(result.content[0].text)

# Exécuter en batch sur 5% des conversations (sampling)
```

---

## Étape 8 — Debugging d'incident

```bash
# Rejouer une trace LangSmith depuis son run_id
langsmith runs get --run-id <run_id> --output-format json | jq '.inputs, .outputs'

# Filtrer les traces Langfuse par session
curl "https://cloud.langfuse.com/api/public/sessions/<session_id>/observations" \
  -H "Authorization: Basic $(echo -n 'pk-...:sk-...' | base64)"
```

Checklist debugging :
1. Récupérer le `conversation_id` depuis le ticket ou l'alerte
2. Ouvrir la trace complète (LangSmith / Langfuse)
3. Identifier le span en échec (error, latence anormale)
4. Extraire l'input exact → reproduire en local
5. Vérifier les tool calls (inputs/outputs de chaque outil)
6. Comparer avec une trace réussie similaire

---

## Garde-fous / Anti-patterns / Pièges

| Piège | Conséquence | Solution |
|---|---|---|
| Logguer les inputs/outputs LLM en clair | Fuite de PII | Hasher ou tronquer ; masquer emails, téléphones, IBAN |
| Tracer 100% des tokens en prod | Coût stockage explosif | Sampling 10-20% en prod, 100% en staging |
| Alertes sans `for:` (trop réactives) | Alert fatigue | Toujours `for: 2m` minimum sur les règles critiques |
| Un seul `conversation_id` par user | Impossible de corréler | Générer un UUID par session, pas par user |
| Métriques sans labels business | Dashboards inexploitables | Toujours labeller par `agent_name`, `task_type`, `env` |
| LLM-as-judge sur 100% des réponses | Coût éval > coût prod | Sampling + règles triggers (score < 3, feedback négatif) |
| Pas de runbook associé aux alertes | Temps de résolution x3 | Lier chaque alerte à un runbook Confluence / Notion |

---

## Bonnes pratiques 2026

- **FinOps agent** : fixer un budget journalier par agent via CloudWatch Billing Alerts ou Langfuse budgets — bloquer automatiquement si dépassement > 150%.
- **Shadow mode** : déployer un nouveau modèle en shadow (reçoit les requêtes sans répondre), comparer métriques qualité avant promotion.
- **Versioning des prompts** : taguer chaque trace avec la version du prompt (`prompt_version=v2.3`) pour isoler les régressions de qualité.
- **SLOs explicites** : définir p95 latence < 5s, error rate < 2%, quality score > 3.5/5 — monitorer via Sloth ou Pyrra pour les error budgets.
- **Sampling intelligent** : traces à 100% pour les erreurs et les sessions avec feedback négatif, 10% pour les succès nominaux.


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
