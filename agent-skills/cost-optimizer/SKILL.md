---
name: cost-optimizer
description: Optimisation des coûts des agents IA — tokens, API calls, modèles, caching, routing, budget controls. Se déclenche avec "coût agent", "agent cher", "réduire les coûts IA", "token optimization", "optimiser les tokens", "budget agent", "agent cost", "économiser sur l'API". Also triggers on "reduce agent cost", "token cost optimization", "cheaper model routing".
---

# Agent Cost Optimizer

## Quand utiliser ce skill

Dès qu'un agent IA consomme trop de tokens, que la facture API dépasse le budget, ou qu'on cherche à passer en production à coût maîtrisé. S'applique aussi pour mettre en place des garde-fous préventifs avant le déploiement.

---

## Workflow

### Étape 1 — Audit baseline (ne rien optimiser sans mesure)

**Objectif** : identifier les 20 % de requêtes qui causent 80 % du coût.

```python
# Structure minimale de log — ajouter à chaque appel LLM
import anthropic, time

client = anthropic.Anthropic()

def call_with_cost_log(messages, model, system=""):
    t0 = time.time()
    resp = client.messages.create(
        model=model, max_tokens=1024,
        system=system, messages=messages
    )
    cost = (
        resp.usage.input_tokens  * pricing[model]["in"]  +
        resp.usage.output_tokens * pricing[model]["out"]
    )
    print(f"[COST] model={model} in={resp.usage.input_tokens} "
          f"out={resp.usage.output_tokens} cost_usd={cost:.5f} "
          f"latency_ms={int((time.time()-t0)*1000)}")
    return resp
```

Tarifs 2026 indicatifs (vérifier [anthropic.com/pricing](https://anthropic.com/pricing)) :

| Modèle | Input / 1M tokens | Output / 1M tokens |
|---|---|---|
| claude-haiku-3-5 | $0.80 | $4.00 |
| claude-sonnet-4 | $3.00 | $15.00 |
| claude-opus-4 | $15.00 | $75.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| gemini-2.0-flash | $0.10 | $0.40 |

**Critère de décision** : si le coût médian par requête > $0.02, optimiser en priorité. Si variance > 10×, le routing est le levier le plus impactant.

---

### Étape 2 — Model routing (levier le plus rapide)

Router chaque tâche vers le modèle le moins cher capable de la traiter.

```python
ROUTING_RULES = {
    "simple":   "claude-haiku-3-5",   # classification, extraction, reformulation
    "moderate": "claude-sonnet-4",    # raisonnement, synthèse, code standard
    "complex":  "claude-opus-4",      # architecture, décisions critiques, audit
}

def classify_task(prompt: str) -> str:
    """Classifier cheap (Haiku) pour décider du modèle à utiliser."""
    resp = client.messages.create(
        model="claude-haiku-3-5", max_tokens=10,
        messages=[{"role": "user", "content":
            f"Complexity of this task (simple/moderate/complex):\n{prompt[:300]}"}]
    )
    return resp.content[0].text.strip().lower()

def route(prompt: str):
    level = classify_task(prompt)
    return ROUTING_RULES.get(level, "claude-sonnet-4")
```

> Règle : le coût du classifier doit être < 5 % du coût économisé. Haiku à $0.80/M tokens convient parfaitement.

---

### Étape 3 — Prompt optimization

Compacter sans dégrader la qualité :

- Supprimer les formules de politesse, répétitions et exemples superflus.
- System prompt cible : **< 500 tokens** pour agents simples, < 1 000 pour agents complexes.
- Remplacer les longues instructions par des formats compacts :

```
# MAUVAIS (verbose)
Tu es un assistant utile et bienveillant. Lorsque l'utilisateur te pose une question,
tu dois répondre de manière claire et structurée en utilisant le format JSON...

# BON (concis)
Réponds UNIQUEMENT en JSON valide. Schéma: {"answer": str, "confidence": float}
```

- Tester chaque modification sur un jeu de **≥ 20 cas** avant de déployer.
- Utiliser `tiktoken` (OpenAI) ou `anthropic.count_tokens()` pour mesurer avant/après.

---

### Étape 4 — Prompt caching (Anthropic natif)

Économie immédiate sur les requêtes avec system prompt identique (jusqu'à **90 % de réduction** sur les tokens en cache).

```python
response = client.messages.create(
    model="claude-sonnet-4",
    max_tokens=1024,
    system=[{
        "type": "text",
        "text": LONG_SYSTEM_PROMPT,          # > 1024 tokens pour activer le cache
        "cache_control": {"type": "ephemeral"}
    }],
    messages=messages
)
# Les appels suivants avec le même system prompt utilisent le cache (prix cache_read << prix input)
```

**Prérequis** : system prompt ≥ 1 024 tokens. En dessous, le gain est nul.

---

### Étape 5 — Context window management

Chaque token dans le contexte est facturé à chaque appel.

```python
MAX_CONTEXT_TOKENS = 4000  # seuil avant résumé

def maybe_summarize(messages: list, model="claude-haiku-3-5") -> list:
    total = sum(len(m["content"].split()) * 1.3 for m in messages)  # estimation rapide
    if total < MAX_CONTEXT_TOKENS:
        return messages
    # Résumer les messages anciens (garder les 4 derniers intacts)
    to_summarize = messages[:-4]
    summary_resp = client.messages.create(
        model=model, max_tokens=300,
        messages=[{"role": "user", "content":
            "Résume en 200 mots max:\n" + "\n".join(m["content"] for m in to_summarize)}]
    )
    return [{"role": "assistant", "content": "[Résumé] " + summary_resp.content[0].text}] + messages[-4:]
```

Stratégies complémentaires :
- **RAG** : injecter uniquement les chunks pertinents (top-k = 3 à 5) plutôt que tout le document.
- **Sliding window** : conserver les N derniers échanges + résumé cumulatif.

---

### Étape 6 — Caching applicatif

```python
import hashlib, json
from functools import lru_cache

# Cache exact (Redis recommandé en prod)
cache: dict = {}

def cached_llm_call(prompt: str, model: str) -> str:
    key = hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()
    if key in cache:
        return cache[key]
    result = client.messages.create(model=model, max_tokens=512,
        messages=[{"role": "user", "content": prompt}])
    text = result.content[0].text
    cache[key] = text
    return text
```

- **Semantic cache** (GPTCache, Redis VSS) : utile quand les prompts varient légèrement mais la réponse est identique.
- **Tool result cache** : cacher les résultats d'API externes coûteuses (recherches web, bases de données).
- TTL recommandé : 1 h pour données fraîches, 24 h pour données statiques.

---

### Étape 7 — Batch processing

```bash
# Batch API Anthropic — jusqu'à 50 % de réduction, délai < 24 h
curl https://api.anthropic.com/v1/messages/batches \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "requests": [
      {"custom_id": "task-1", "params": {"model": "claude-haiku-3-5", "max_tokens": 256,
        "messages": [{"role": "user", "content": "Classe ce texte: ..."}]}},
      {"custom_id": "task-2", "params": {"model": "claude-haiku-3-5", "max_tokens": 256,
        "messages": [{"role": "user", "content": "Résume: ..."}]}}
    ]
  }'
```

Adapter pour **openai.batches** (même principe, quota 24 h, 50 % discount).

---

### Étape 8 — Tool call optimization

- **Batch tools** : concevoir des outils qui acceptent une liste d'items plutôt qu'un seul.
- **Parallel calls** : déclencher les tool calls indépendants en simultané (réduire les aller-retours).
- **Descriptions précises** : le LLM choisit mieux du premier coup → moins de tentatives ratées.

```python
# MAUVAIS : 3 appels séquentiels = 3 tours agent
get_weather("Paris")  # appel 1
get_price("AAPL")     # appel 2
translate("hello")    # appel 3

# BON : parallel tool use (un seul tour agent)
# L'agent émet les 3 tool_use en une seule réponse si les descriptions sont claires
```

---

### Étape 9 — Budget controls

```python
class BudgetGuard:
    def __init__(self, max_usd: float):
        self.max_usd = max_usd
        self.spent = 0.0

    def charge(self, cost: float):
        self.spent += cost
        if self.spent >= self.max_usd * 0.8:
            print(f"[WARN] 80% du budget atteint ({self.spent:.4f}$/{self.max_usd}$)")
        if self.spent >= self.max_usd:
            raise RuntimeError(f"Budget dépassé : {self.spent:.4f}$ > {self.max_usd}$")
```

Paramétrage recommandé :
- **Par conversation** : $0.10–$0.50 selon cas d'usage
- **Par agent/jour** : $5–$50 en production
- Toujours combiner limite côté code **et** `max_tokens` dans chaque requête API.

---

### Étape 10 — Monitoring continu

Métriques minimales à tracker :

| Métrique | Cible |
|---|---|
| Coût par tâche complétée | < $0.01 |
| Cache hit rate | > 30 % |
| % requêtes routées vers cheap model | > 60 % |
| Token ratio output/input | < 0.5 (éviter sur-génération) |

Stack recommandée : **Langfuse** (open-source, self-hostable) ou **LangSmith** pour le tracing ; Grafana + InfluxDB pour les dashboards opérationnels.

---

## Anti-patterns / pièges

| Piège | Conséquence | Correctif |
|---|---|---|
| Résumé trop agressif | Perte de contexte critique, hallucinations | Garder toujours les 4 derniers messages bruts |
| Cache sans TTL | Réponses obsolètes livrées aux utilisateurs | TTL explicite + invalidation sur changement de données |
| Routing systématique vers Haiku | Dégradation qualité sur tâches complexes | Classifier avant de router, évaluer la qualité |
| `max_tokens` trop grand | Sur-génération inutile | Calibrer par type de tâche (extraction : 128, résumé : 512) |
| Optimiser avant de mesurer | Effort mal ciblé | Toujours établir la baseline d'abord |
| Prompt cache sur < 1 024 tokens | Aucun gain (seuil non atteint) | Vérifier le token count avant d'activer |
| Ignorer le coût des embeddings | Budget RAG sous-estimé | Tracker `embedding_tokens` séparément |

---

## Checklist avant mise en production

- [ ] Baseline mesurée (coût médian, P95, P99 par type de requête)
- [ ] Model routing implémenté et testé sur jeu de données réel
- [ ] System prompt < seuil cible et prompt cache activé si éligible
- [ ] Context summarization avec tests de non-régression qualité
- [ ] Budget guard actif avec alertes à 80 % et hard stop à 100 %
- [ ] Cache hit rate > 20 % dès le départ
- [ ] Dashboard coût/tâche opérationnel (pas juste coût total)
