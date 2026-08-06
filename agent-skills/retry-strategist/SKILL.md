---
name: retry-strategist
description: Stratégies de retry intelligentes pour sous-agents qui échouent — backoff, fallback, alternatives et recovery. Se déclenche avec "retry agent", "agent qui échoue", "agent retry", "fallback agent", "error recovery agent", "agent resilience", "agent failure handling", "relancer agent". Also triggers on "backoff strategy for agents", "agent keeps failing".
---

# Agent Retry Strategist

## Quand utiliser ce skill

Dès qu'un sous-agent peut échouer et que l'échec ne doit pas remonter brutalement. Cas typiques : pipelines de production avec erreurs transitoires (rate limit, timeout, 503), architectures multi-modèles avec quota par provider, traitements longs nécessitant des checkpoints.

---

## Workflow — 10 étapes actionnables

### Étape 1 — Classifier l'erreur avant tout retry

| Classe | Signaux | Action |
|---|---|---|
| `TRANSIENT` | 429, 503, timeout, connexion reset | Retry avec backoff |
| `PERMANENT` | 400 schéma invalide, content policy, token limit | Fallback ou escalade — **jamais de retry** |
| `UNKNOWN` | Toute autre exception | Retry prudent (max 1–2 fois) |

```python
TRANSIENT_SIGNALS = ["rate limit", "429", "503", "timeout", "connection", "temporarily"]
PERMANENT_SIGNALS = ["token limit", "content policy", "invalid schema", "401", "403", "400"]

def classify_error(error: Exception) -> str:
    s = str(error).lower()
    if any(x in s for x in TRANSIENT_SIGNALS): return "transient"
    if any(x in s for x in PERMANENT_SIGNALS):  return "permanent"
    return "unknown"
```

### Étape 2 — Choisir la retry policy selon le contexte

| Stratégie | Formule délai | Usage |
|---|---|---|
| `immediate` | 0 s | 429 avec `Retry-After: 1` |
| `fixed` | base_delay | service interne fiable |
| `exponential` | `base × 2^attempt` | API externe instable |
| `jittered` | `exponential × random(0.5–1.5)` | **défaut recommandé** — évite thundering herd |

```python
def compute_delay(attempt: int, base: float = 1.0, jitter: bool = True) -> float:
    delay = base * (2 ** attempt)          # 1s, 2s, 4s, 8s...
    if jitter:
        delay *= 0.5 + random.random()     # ±50% de bruit
    return min(delay, 60.0)               # plafond à 60 s
```

### Étape 3 — Circuit breaker (3 états)

```
CLOSED ──N failures──► OPEN ──recovery_timeout──► HALF-OPEN
  ▲                                                    │
  └─────────────────── succès ────────────────────────┘
```

```python
class CircuitBreaker:
    # failure_threshold=5, recovery_timeout=30s
    def can_attempt(self) -> bool:
        if self.state == "OPEN":
            if time.time() - self.last_failure > self.recovery_timeout:
                self.state = "HALF_OPEN"
                return True
            return False   # rejeter sans appel réseau
        return True
```

Paramètres conseillés par défaut : `failure_threshold=5`, `recovery_timeout=30s`.

### Étape 4 — Modifier la tâche si l'échec persiste

Un retry identique sur un input identique produit le même échec. Dès la 2e tentative :

- Tronquer le prompt à 60 % de sa longueur initiale
- Supprimer les exemples few-shot pour réduire les tokens
- Simplifier la consigne : `"Réponds en JSON strict, rien d'autre"`
- Basculer vers un modèle plus petit (voir étape 5)

```python
def modify_task(args: dict, attempt: int) -> dict:
    m = args.copy()
    if attempt == 1 and "prompt" in m:
        m["prompt"] = m["prompt"][:int(len(m["prompt"]) * 0.6)]
    if attempt == 2:
        m["prompt"] = "Réponse JSON uniquement: " + m["prompt"][:300]
    return m
```

### Étape 5 — Model fallback chain

Définir la chaîne une seule fois dans la config :

```python
MODEL_FALLBACK_CHAIN = [
    "claude-opus-4-5",      # modèle principal
    "claude-sonnet-4-5",    # fallback intermédiaire
    "claude-haiku-3-5",     # fallback léger
]
```

Basculer vers le suivant à chaque échec consécutif. Journaliser le changement de modèle.

### Étape 6 — Tool fallback

```python
TOOL_FALLBACKS = {
    "search_web":    ["fetch_url", "search_academic"],
    "fetch_url":     ["search_web"],
    "db_primary":    ["db_replica"],
    "api_weather_1": ["api_weather_2"],
}
```

Si l'outil `search_web` échoue 2 fois → essayer `fetch_url`. Si le tool de fallback est indisponible aussi → remonter une erreur métier claire.

### Étape 7 — Décomposition de tâche sur échec de complexité

Indicateur : erreur de token limit ou réponse tronquée/incohérente.

```python
# Découper une liste de 100 items en chunks de 20
def decompose(items: list, chunk_size: int = 20) -> list[list]:
    return [items[i:i+chunk_size] for i in range(0, len(items), chunk_size)]

# Relancer chaque chunk indépendamment, agréger les résultats
results = await asyncio.gather(*[process_chunk(c) for c in decompose(items)])
```

### Étape 8 — Checkpoints et partial recovery

Persister l'état après chaque étape critique :

```python
# Redis / fichier / base de données
checkpoint = {"step": "step_3", "processed_ids": [1, 2, 3], "ts": time.time()}
redis_client.set(f"checkpoint:{job_id}", json.dumps(checkpoint), ex=3600)

# Au redémarrage : reprendre depuis le checkpoint
ckpt = redis_client.get(f"checkpoint:{job_id}")
if ckpt:
    state = json.loads(ckpt)
    start_from = state["step"]
```

### Étape 9 — Dead Letter Queue (DLQ)

Toute tâche qui épuise ses retries ET ses fallbacks → DLQ. Ne jamais l'abandonner silencieusement.

```python
def send_to_dlq(task: dict, error: Exception, attempts: int):
    record = {
        "task": task,
        "error": str(error),
        "attempts": attempts,
        "ts": datetime.utcnow().isoformat(),
    }
    # SQS: sqs.send_message(QueueUrl=DLQ_URL, MessageBody=json.dumps(record))
    # Redis: redis_client.rpush("dlq:agents", json.dumps(record))
    # Fichier: append to dlq.jsonl
    logger.error("[DLQ] %s", json.dumps(record))
```

### Étape 10 — Analyse des patterns d'échec

```python
from collections import Counter

def failure_report(failure_log: list[dict]) -> dict:
    by_class   = Counter(f["class"]   for f in failure_log)
    by_model   = Counter(f["model"]   for f in failure_log)
    by_tool    = Counter(f["tool"]    for f in failure_log)
    return {"total": len(failure_log), "by_class": dict(by_class),
            "by_model": dict(by_model), "by_tool": dict(by_tool)}
```

Réviser les politiques si `transient/permanent ratio > 3 : 1` → le backoff base est probablement trop court.

---

## Comparaison frameworks

| Critère | LangGraph | CrewAI | Custom Python |
|---|---|---|---|
| Retry natif | Partiel (node) | Non | Total contrôle |
| Circuit breaker | Non | Non | Manuel |
| Model fallback | Non | Non | Manuel |
| DLQ | Non | Non | Manuel |
| Modification de tâche | Non | Non | Manuel |

Recommandation : implémenter `RetryStrategist` en couche transversale, appelée par l'orchestrateur, indépendamment du framework agent.

---

## Anti-patterns et pièges

- **Retry immédiat sans délai** — aggrave la surcharge du service et risque la mise en quarantaine IP.
- **Retry sur erreurs permanentes** — gaspille du budget ; classifier *avant* de retenter.
- **Retry identique sans modification** — un prompt qui dépasse le token limit restera trop long au 3e essai.
- **Circuit breaker absent** — un sous-agent en cascade failure appellera le service dégradé N × max_attempts fois.
- **DLQ silencieuse** — une tâche abandonnée sans trace crée des données manquantes invisibles.
- **Jitter absent en environnement multi-agents** — tous les agents retenent en même temps après un outage → thundering herd.
- **Checkpoints non atomiques** — écrire le checkpoint avant que l'opération soit réellement confirmée provoque des doublons.

## Règles de décision rapide

1. Erreur permanente → pas de retry, fallback ou escalade immédiate.
2. Erreur transient → jittered exponential backoff, max 3–5 attempts.
3. 2e tentative → modifier le prompt / réduire le scope.
4. 3e tentative → changer de modèle ou d'outil.
5. Toutes tentatives épuisées → DLQ obligatoire, jamais silencieux.
6. Circuit OPEN → rejeter sans appel réseau, tester une sonde après `recovery_timeout`.
