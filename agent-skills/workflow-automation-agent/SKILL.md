---
name: workflow-automation-agent
description: Construction d'agents d'automatisation de workflows métier incluant RPA intelligent, déclencheurs et actions chaînées, orchestration d'étapes avec gestion d'erreurs et monitoring. Se déclenche avec "workflow agent", "RPA", "automatisation métier", "agent d'automatisation", "process automation. Also triggers on "business process agent", "workflow automation agent", "intelligent RPA".
---

# Workflow Automation Agent

## Workflow

### 1. Cartographier les processus métier

- Documenter chaque étape : acteur, système, volume, fréquence, temps moyen.
- Identifier les tâches 100 % déterministes (à automatiser en priorité) vs les tâches à jugement (LLM ou escalade humaine).
- Calculer le ROI : `(temps_manuel_h × taux_horaire × volume_annuel) − coût_implémentation`.
- Critère d'exclusion : si le processus change plus d'une fois par trimestre, différer ou abstraire la logique dans un fichier de configuration.

### 2. Choisir l'architecture de l'agent

| Besoin | Pattern recommandé |
|---|---|
| Étapes séquentielles simples | Pipeline linéaire (fonctions chaînées) |
| Branchements complexes + état persistant | State machine (XState, Temporal) |
| Processus long-running (jours/semaines) | Temporal Workflow ou Azure Durable Functions |
| Événements multi-sources | Chorégraphie via message broker (RabbitMQ, Kafka) |
| Pas d'API disponible | RPA UI avec Playwright ou UiPath |

Exemple minimal Temporal (Python) :
```python
@workflow.defn
class OnboardingWorkflow:
    @workflow.run
    async def run(self, user_id: str) -> str:
        await workflow.execute_activity(create_account, user_id, start_to_close_timeout=timedelta(minutes=5))
        await workflow.execute_activity(send_welcome_email, user_id, start_to_close_timeout=timedelta(minutes=2))
        return "done"
```

### 3. Implémenter les connecteurs

- Un connecteur = une classe avec `execute()`, `compensate()`, `health_check()`.
- Toujours décorer avec retry + circuit breaker :

```python
from tenacity import retry, stop_after_attempt, wait_exponential
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def call_external_api(payload: dict) -> dict:
    response = requests.post(API_URL, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()
```

- RPA UI (sans API) : préférer les sélecteurs stables (`data-testid`, `aria-label`) aux sélecteurs CSS fragiles.

```python
# Playwright — sélecteur robuste
await page.get_by_role("button", name="Valider").click()
# ❌ fragile
await page.click(".btn-primary:nth-child(2)")
```

### 4. Configurer les déclencheurs

| Type | Outil / Exemple |
|---|---|
| Timer/Cron | `0 8 * * 1-5` — chaque matin ouvré à 8h |
| Webhook entrant | FastAPI `POST /webhook/{event_type}` |
| Email reçu | IMAP IDLE ou SendGrid Inbound Parse |
| Changement DB | PostgreSQL `LISTEN/NOTIFY` ou CDC Debezium |
| Upload fichier | S3 Event Notification → Lambda → queue |

Implémenter le **debouncing** pour éviter les doubles déclenchements :
```python
LAST_TRIGGER: dict[str, float] = {}
MIN_INTERVAL = 5.0  # secondes

def debounce(key: str) -> bool:
    now = time.time()
    if now - LAST_TRIGGER.get(key, 0) < MIN_INTERVAL:
        return False  # ignorer
    LAST_TRIGGER[key] = now
    return True
```

### 5. Orchestrer les actions chaînées

- Persister l'état entre les étapes (DB ou Redis) pour reprendre après crash :

```python
@dataclass
class WorkflowState:
    workflow_id: str
    step: str          # "create_account" | "send_email" | "done"
    payload: dict
    created_at: datetime
    retries: int = 0
```

- Implémenter la **compensation** (rollback) pour chaque étape modifiant un système externe :

```python
executed_steps = []
try:
    create_order(order); executed_steps.append("create_order")
    charge_payment(order); executed_steps.append("charge_payment")
    send_confirmation(order)
except Exception:
    for step in reversed(executed_steps):
        compensators[step](order)  # rollback dans l'ordre inverse
    raise
```

- Sous-workflows : encapsuler les blocs réutilisables (ex : `KYCWorkflow`, `NotificationWorkflow`).

### 6. Intégrer la décision intelligente (LLM)

- Utiliser le LLM uniquement pour les cas non déterministes : classification, extraction de texte libre, cas ambigus.
- Définir un **seuil de confiance** : en dessous → escalade humaine.

```python
result = llm_classify(document_text)
if result.confidence < 0.85:
    escalate_to_human(document_id, reason="confiance insuffisante")
else:
    route_automatically(result.category)
```

- Toujours valider la sortie LLM avec un schéma Pydantic avant de l'injecter dans le workflow.

### 7. Gérer les erreurs et la résilience

- **Retry policy** : exponentiel avec jitter pour éviter le thundering herd.
- **Dead-letter queue** : messages non traités après N tentatives → DLQ avec alerte.
- **Timeout par étape** et timeout global du workflow.
- **Idempotence** : chaque action doit être réexécutable sans effet de bord. Utiliser un `idempotency_key` (UUID de la commande, hash de l'événement).

```python
def process_payment(order_id: str, idempotency_key: str):
    if db.exists(f"payment:{idempotency_key}"):
        return db.get(f"payment:{idempotency_key}")  # résultat déjà calculé
    result = payment_gateway.charge(order_id)
    db.set(f"payment:{idempotency_key}", result, ex=86400)
    return result
```

### 8. Monitorer et améliorer

KPIs à collecter :
- **Taux de succès** : `succeeded / total` par workflow et par étape.
- **Temps de cycle moyen** et p95.
- **Taux d'escalade humaine** : indicateur de maturité du modèle de décision.
- **Volume de la DLQ** : indicateur de problèmes systémiques.

Stack recommandée 2026 : OpenTelemetry (traces) + Prometheus (métriques) + Grafana (dashboards).

```python
from opentelemetry import trace
tracer = trace.get_tracer("workflow-agent")

with tracer.start_as_current_span("step.create_order") as span:
    span.set_attribute("order.id", order_id)
    create_order(order_id)
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Pas de compensation | Données incohérentes après crash partiel | Implémenter `compensate()` pour chaque étape modifiante |
| État en mémoire uniquement | Perte d'état au redémarrage | Persister dans Redis/DB après chaque transition |
| Sélecteurs CSS fragiles en RPA | Breakage à chaque déploiement UI | Utiliser `data-testid` ou `aria-*` |
| LLM sans validation de sortie | Crash imprévisible en production | Valider avec Pydantic avant injection |
| Automatiser sans fallback manuel | Blocage total si l'agent échoue | Toujours exposer une interface de reprise manuelle |
| Déclencheurs sans debounce | Exécutions dupliquées | Idempotency key + debounce |
| Timeout absent | Workflow bloqué indéfiniment | Timeout par étape ET timeout global |

## Bonnes pratiques 2026

- **Contract-first** : définir le contrat d'interface (schéma Pydantic / OpenAPI) avant d'implémenter les connecteurs.
- **Infrastructure as Code** : déclarer les queues, topics et schedulers dans Terraform/Bicep, pas en CLI.
- **Versioning de workflow** : suffixer les définitions (`OnboardingWorkflow_v2`) pour coexistence avec les instances en cours.
- **Secrets** : injecter via vault (Azure Key Vault, HashiCorp Vault) — jamais en variable d'environnement dans le code.
- **Tests** : unit-tester chaque activité isolément ; integration-tester le workflow avec un Temporal test server ou mocks.
- **Observabilité dès le départ** : ne pas ajouter les traces après coup ; instrumenter dès la première ligne de code.
