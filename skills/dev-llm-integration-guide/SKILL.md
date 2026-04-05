---
name: dev-llm-integration-guide
description: Intégration de LLMs dans des applications via API. Se déclenche avec "API OpenAI", "Claude API", "intégrer un LLM", "GPT dans mon app", "Ollama", "LLM local", "streaming", "embeddings", "fine-tuning", "token management".
---

# LLM Integration Guide

## Workflow

1. **Choix du modèle** — Évaluer selon 4 critères : **Qualité** (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro pour les tâches complexes ; GPT-4o-mini, Claude 3 Haiku pour les tâches simples), **Coût** (de ~$0.10/1M tokens pour les petits modèles à ~$15/1M pour les premium), **Latence** (Groq < 100ms, Mistral ~300ms, GPT-4 ~1-3s), **Contexte** (Gemini 1M tokens, Claude 200K, GPT-4 128K). Pour du cloud vs local : Ollama/vLLM si données sensibles ou budget contraint, API cloud si pas d'infra et besoin de qualité maximale.

2. **Setup de l'API** — Configurer les clients officiels avec des bonnes pratiques de sécurité : clés dans variables d'environnement, timeout, retry automatique.

   ```python
   # OpenAI
   from openai import OpenAI
   client = OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=30, max_retries=3)
   
   # Anthropic
   from anthropic import Anthropic
   client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
   
   # Ollama (local)
   from ollama import Client
   client = Client(host="http://localhost:11434")
   
   # Azure OpenAI
   from openai import AzureOpenAI
   client = AzureOpenAI(azure_endpoint=os.environ["AZURE_ENDPOINT"],
                        api_key=os.environ["AZURE_API_KEY"], api_version="2024-02-01")
   ```

3. **Gestion des tokens et coûts** — Estimer les coûts avant déploiement avec `tiktoken` (OpenAI) ou `anthropic.count_tokens()`. Implémenter une **truncation strategy** pour les longs contextes : résumer les messages anciens, utiliser une sliding window, ou extraire les passages pertinents via RAG. Tracker les coûts par session/utilisateur pour éviter les surprises.

   ```python
   import tiktoken
   enc = tiktoken.encoding_for_model("gpt-4o")
   
   def count_tokens(messages: list) -> int:
       return sum(len(enc.encode(m["content"])) for m in messages)
   
   def trim_context(messages: list, max_tokens: int = 100_000) -> list:
       while count_tokens(messages) > max_tokens and len(messages) > 2:
           messages.pop(1)  # Garder le system prompt
       return messages
   
   # Coût estimé
   cost = count_tokens(messages) * 0.0000025  # GPT-4o: $2.50/1M
   ```

4. **Streaming responses** — Implémenter le streaming pour améliorer l'UX perçue (premier token en ~300ms au lieu d'attendre 5-10s). Côté backend : SSE (Server-Sent Events) ou WebSocket. Côté frontend : afficher les chunks progressivement. Gérer la reconnexion automatique et l'annulation du stream.

   ```python
   # Backend FastAPI + streaming
   from fastapi.responses import StreamingResponse
   
   async def stream_llm(prompt: str):
       async with client.messages.stream(
           model="claude-3-5-sonnet-20241022", max_tokens=1024,
           messages=[{"role": "user", "content": prompt}]
       ) as stream:
           async for text in stream.text_stream:
               yield f"data: {json.dumps({'text': text})}\n\n"
   
   @app.get("/stream")
   async def endpoint(prompt: str):
       return StreamingResponse(stream_llm(prompt), media_type="text/event-stream")
   ```

5. **Error handling et résilience** — Gérer les erreurs spécifiques : `RateLimitError` (attendre et retry avec exponential backoff), `ContextLengthExceededError` (tronquer), `APITimeoutError` (retry + fallback), `InsufficientQuotaError` (alerter). Implémenter un **circuit breaker** et un modèle de **fallback** (GPT-4 → GPT-4o-mini si erreur).

   ```python
   import tenacity
   
   @tenacity.retry(
       wait=tenacity.wait_exponential(multiplier=1, min=4, max=60),
       stop=tenacity.stop_after_attempt(3),
       retry=tenacity.retry_if_exception_type(openai.RateLimitError)
   )
   async def call_with_retry(messages: list, model: str = "gpt-4o"):
       try:
           return await client.chat.completions.create(model=model, messages=messages)
       except openai.ContextLengthExceededError:
           return await client.chat.completions.create(
               model="gpt-4o-mini", messages=trim_context(messages, 50_000)
           )
   ```

6. **Caching et optimisation** — **Prompt caching** : Anthropic et OpenAI permettent de cacher le prefixe du prompt (réduction de 90% des coûts sur le contenu caché). **Semantic caching** : GPTCache ou Redis + embeddings pour retourner des réponses cached pour des questions sémantiquement similaires. **Batch API** : OpenAI Batch API permet de traiter des milliers de requêtes async à -50% du coût. **Response caching** : pour les réponses déterministes (temperature=0), cacher en Redis avec TTL.

   ```python
   from gptcache import cache
   from gptcache.adapter import openai
   cache.init()  # Cache sémantique automatique
   
   # Anthropic prompt caching
   messages = [{"role": "user", "content": [
       {"type": "text", "text": long_document,
        "cache_control": {"type": "ephemeral"}},  # Cache ce bloc
       {"type": "text", "text": question}
   ]}]
   ```

7. **Embeddings et similarity search** — Générer des embeddings avec `text-embedding-3-small` (OpenAI, 1536 dims, $0.02/1M tokens) ou `sentence-transformers/all-MiniLM-L6-v2` (local, gratuit). Calculer la similarité cosinus pour le retrieval. Indexer avec FAISS (local) ou pgvector (PostgreSQL) pour la recherche à grande échelle.

   ```python
   from openai import OpenAI
   import numpy as np
   
   def get_embedding(text: str) -> list[float]:
       response = client.embeddings.create(
           input=text, model="text-embedding-3-small"
       )
       return response.data[0].embedding
   
   def cosine_similarity(a: list, b: list) -> float:
       a, b = np.array(a), np.array(b)
       return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
   ```

8. **Fine-tuning et adaptation** — Choisir entre **Prompt engineering** (gratuit, rapide, essayer en premier), **RAG** (données dynamiques, knowledge base > 100 docs), **Fine-tuning** (style spécifique, données propriétaires, tâches très répétitives). Pour fine-tuner : préparer 50-500 exemples JSONL (input/output), lancer via `openai api fine_tuning.jobs.create`, évaluer sur un test set holdout. Coût fine-tuning GPT-4o-mini : ~$0.003/1K tokens de training, puis ~2x le coût d'inférence du modèle de base.

   ```python
   # Préparer les données fine-tuning (JSONL)
   training_data = [
       {"messages": [
           {"role": "system", "content": "Tu es un expert en support client."},
           {"role": "user", "content": "Mon abonnement ne fonctionne pas"},
           {"role": "assistant", "content": "Je comprends votre frustration..."}
       ]}
   ]
   # Uploader et lancer
   file = client.files.create(file=open("train.jsonl", "rb"), purpose="fine-tune")
   job = client.fine_tuning.jobs.create(training_file=file.id, model="gpt-4o-mini")
   ```

## Règles

- **Ne jamais hardcoder une clé API** : utiliser des variables d'environnement (`.env` + `python-dotenv`) ou un secret manager (AWS Secrets Manager, HashiCorp Vault) — une clé exposée peut générer des milliers d'euros de coûts en quelques heures.
- **Implémenter le streaming par défaut** : l'UX perçue avec streaming est bien meilleure qu'une attente silencieuse — le premier token en 300ms vaut mieux qu'une réponse complète en 8s.
- **Toujours avoir un fallback** : si le modèle premium échoue, fallback sur un modèle moins cher/plus disponible — la résilience est non-négociable en production.
- **Tracker les coûts dès le début** : implémenter un compteur de tokens par session/utilisateur avant le lancement — les coûts LLM peuvent exploser sans monitoring.
- **Tester avec `temperature=0`** pour les tâches déterministes (extraction, classification) et `temperature=0.7-1.0` pour la génération créative — ne pas utiliser les defaults sans réflexion.


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
