---
name: llm-integration-guide
description: Intégration de LLMs dans des applications via API. Se déclenche avec "API OpenAI", "Claude API", "intégrer un LLM", "GPT dans mon app", "Ollama", "LLM local", "streaming", "embeddings", "fine-tuning", "token management". Also triggers on "call an LLM API", "integrate a model in my app", "streaming completions".
---

# LLM Integration Guide

## 1. Choisir le bon modèle

**Critères de décision 2026 :**

| Besoin | Modèle recommandé | Prix indicatif |
|--------|-------------------|---------------|
| Tâches complexes (analyse, code) | claude-sonnet-4, gpt-4o | $3–15/1M tokens |
| Tâches simples (classification, résumé) | claude-haiku-3-5, gpt-4o-mini | $0.10–0.30/1M tokens |
| Latence critique < 200 ms | groq/llama-3.3-70b, mistral-large | API Groq ~gratuit tier |
| Données sensibles / offline | Ollama + llama-3.3, mistral-nemo | Gratuit (infra propre) |
| Long contexte (> 200K tokens) | claude-opus-4 (1M), gemini-2.0-flash (1M) | Variable |

**Règle d'or :** essayer d'abord le modèle le moins cher qui atteint la qualité cible. Benchmarker sur 50 exemples réels avant de choisir.

---

## 2. Setup de l'API

Clés dans `.env` ou secret manager — jamais dans le code.

```python
# python-dotenv
from dotenv import load_dotenv; load_dotenv()

# OpenAI
from openai import OpenAI
client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
    timeout=30.0,
    max_retries=3
)

# Anthropic
from anthropic import Anthropic
client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# Ollama (local)
from ollama import Client
client = Client(host="http://localhost:11434")

# Azure OpenAI
from openai import AzureOpenAI
client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_ENDPOINT"],
    api_key=os.environ["AZURE_API_KEY"],
    api_version="2024-12-01-preview"
)
```

**LiteLLM** — une seule interface pour tous les providers :
```python
from litellm import completion
response = completion(model="anthropic/claude-sonnet-4", messages=messages)
response = completion(model="ollama/llama3.3",           messages=messages)
```

---

## 3. Gestion des tokens et des coûts

Estimer avant de déployer, mesurer en production.

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o")

def count_tokens(messages: list[dict]) -> int:
    return sum(len(enc.encode(m["content"])) for m in messages)

def trim_context(messages: list[dict], max_tokens: int = 90_000) -> list[dict]:
    """Sliding window : supprime les messages anciens, préserve le system prompt."""
    while count_tokens(messages) > max_tokens and len(messages) > 2:
        messages.pop(1)
    return messages

# Budget guard
def check_budget(tokens_in: int, tokens_out: int, model="gpt-4o") -> float:
    rates = {"gpt-4o": (2.50, 10.0), "gpt-4o-mini": (0.15, 0.60)}
    r_in, r_out = rates.get(model, (3.0, 12.0))
    return (tokens_in * r_in + tokens_out * r_out) / 1_000_000
```

**Stratégies de réduction de coûts :**
- Anthropic prompt caching : `"cache_control": {"type": "ephemeral"}` sur les blocs longs (réduction jusqu'à 90 %).
- OpenAI Batch API : `-50 %` sur les requêtes async non-urgentes.
- Semantic caching (GPTCache / Redis + embeddings) pour les questions répétitives.

---

## 4. Streaming responses

Toujours streamer en production — l'UX perçue est radicalement meilleure.

```python
# FastAPI + SSE (Server-Sent Events)
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import anthropic, json

app = FastAPI()
client = anthropic.Anthropic()

async def stream_claude(prompt: str):
    with client.messages.stream(
        model="claude-sonnet-4",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "data: [DONE]\n\n"

@app.get("/chat/stream")
async def chat_stream(prompt: str):
    return StreamingResponse(stream_claude(prompt), media_type="text/event-stream")
```

```typescript
// Frontend TypeScript — consommer le SSE
const es = new EventSource(`/chat/stream?prompt=${encodeURIComponent(text)}`);
es.onmessage = (e) => {
  if (e.data === "[DONE]") { es.close(); return; }
  const { text } = JSON.parse(e.data);
  output.textContent += text;
};
```

---

## 5. Résilience et error handling

```python
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import openai

@retry(
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(4),
    retry=retry_if_exception_type(openai.RateLimitError)
)
async def safe_completion(messages: list, model: str = "gpt-4o") -> str:
    try:
        resp = await client.chat.completions.create(model=model, messages=messages)
        return resp.choices[0].message.content
    except openai.ContextLengthExceededError:
        # Fallback : tronquer + modèle moins cher
        return await safe_completion(trim_context(messages, 50_000), "gpt-4o-mini")
    except openai.APITimeoutError:
        raise  # tenacity retentera

# Circuit breaker simple avec pybreaker
from pybreaker import CircuitBreaker
breaker = CircuitBreaker(fail_max=5, reset_timeout=60)

@breaker
def call_llm(messages): ...
```

**Erreurs à gérer obligatoirement :**

| Erreur | Action |
|--------|--------|
| `RateLimitError` | Exponential backoff (4 s → 60 s) |
| `ContextLengthExceededError` | Tronquer + fallback modèle light |
| `APITimeoutError` | Retry × 3, puis fallback |
| `InsufficientQuotaError` | Alerte immédiate, coupe le feature |
| `AuthenticationError` | Ne pas retenter — logguer et alerter |

---

## 6. Embeddings et RAG

```python
import numpy as np
from openai import OpenAI

client = OpenAI()

def embed(text: str, model="text-embedding-3-small") -> list[float]:
    return client.embeddings.create(input=text, model=model).data[0].embedding

def cosine_sim(a: list, b: list) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# Bulk embed + index FAISS
import faiss, pickle

def build_index(docs: list[str]) -> tuple:
    vectors = np.array([embed(d) for d in docs], dtype="float32")
    index = faiss.IndexFlatIP(vectors.shape[1])  # Inner product = cosine si normalisé
    faiss.normalize_L2(vectors)
    index.add(vectors)
    return index, docs

def retrieve(query: str, index, docs, k=5) -> list[str]:
    q = np.array([embed(query)], dtype="float32")
    faiss.normalize_L2(q)
    _, ids = index.search(q, k)
    return [docs[i] for i in ids[0]]
```

**Choix du vector store :**
- `FAISS` — local, performant, pas de serveur.
- `pgvector` — si vous êtes déjà sur PostgreSQL (extension `vector`).
- `Qdrant` / `Weaviate` — service dédié pour > 1M documents.

---

## 7. Fine-tuning — quand et comment

**Décision rapide :**
- Prompt engineering → essayez toujours en premier (gratuit, rapide).
- RAG → si la knowledge base dépasse 100 documents ou est dynamique.
- Fine-tuning → style très spécifique, tâche ultra-répétitive, ou qualité insuffisante après RAG.

**Préparer le dataset JSONL (min 50 exemples, idéal 200+) :**
```python
import json

examples = [
    {"messages": [
        {"role": "system",  "content": "Tu es un expert support client francophone."},
        {"role": "user",    "content": "Mon abonnement ne fonctionne plus."},
        {"role": "assistant","content": "Bonjour, je suis désolé de cet inconvénient. Pouvez-vous me communiquer votre numéro de commande ?"}
    ]}
]

with open("train.jsonl", "w") as f:
    for ex in examples:
        f.write(json.dumps(ex, ensure_ascii=False) + "\n")
```

**Lancer le fine-tuning OpenAI :**
```bash
openai api fine_tuning.jobs.create \
  -t train.jsonl \
  --validation-file val.jsonl \
  --model gpt-4o-mini \
  --suffix "support-fr"

openai api fine_tuning.jobs.follow -i <job_id>
```

**Coûts OpenAI 2026 :** ~$0.003/1K tokens training, inférence ×2 le modèle de base.

---

## 8. Structured outputs

Forcer un JSON schéma-valide — évite les parsers fragiles.

```python
from pydantic import BaseModel
from openai import OpenAI

class Ticket(BaseModel):
    priorite: str       # "haute" | "normale" | "basse"
    categorie: str
    resume: str

client = OpenAI()
resp = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Mon serveur est en feu depuis 2h !"}],
    response_format=Ticket
)
ticket: Ticket = resp.choices[0].message.parsed
# ticket.priorite == "haute"
```

Anthropic : utiliser `tool_use` avec un schéma JSON pour le même résultat.

---

## Anti-patterns et pièges

- **Clé API hardcodée** — une clé exposée sur GitHub peut coûter des milliers d'euros en quelques heures (bots de scan actifs en permanence).
- **Pas de timeout** — un appel bloqué indéfiniment plante le thread worker entier. Toujours `timeout=30`.
- **Concaténer le contexte sans limite** — le contexte grossit à chaque tour ; sans `trim_context`, on dépasse le max et les coûts explosent.
- **Pas de fallback** — un seul provider sans fallback = indisponibilité totale si rate limit ou outage.
- **`temperature=1` sur des tâches d'extraction** — génère des hallucinations évitables ; utiliser `temperature=0` pour extraction/classification.
- **Fine-tuner avant de tester le prompt engineering** — le fine-tuning est coûteux et long ; un bon prompt résout 80 % des cas.
- **Ignorer les coûts en dev** — les tokens de dev s'accumulent ; configurer un budget alert sur la console provider dès le premier jour.
- **Stocker les embeddings en mémoire seule** — redémarrage = recalcul de tout. Persister dans pgvector ou FAISS sur disque.

---

## Checklist déploiement production

- [ ] Clés API via secret manager (pas `.env` en container)
- [ ] Timeout + retry + exponential backoff configurés
- [ ] Fallback modèle défini et testé
- [ ] Budget alert activé sur la console provider
- [ ] Logging des tokens in/out par requête (coût traçable)
- [ ] Streaming activé pour toute interface conversationnelle
- [ ] `temperature=0` pour les tâches déterministes
- [ ] Tests d'intégration avec mock du provider (éviter les coûts CI)
