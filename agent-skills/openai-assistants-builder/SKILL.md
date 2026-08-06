---
name: openai-assistants-builder
description: Création d'assistants IA hébergés avec l'API OpenAI Assistants v2. File search avec vector stores, code interpreter, function calling, threads persistants et streaming. Se déclenche avec "OpenAI Assistants", "assistant API", "file search", "code interpreter", "thread", "run", "assistant OpenAI", "GPT assistant", "vector store OpenAI", "assistants v2". Also triggers on "OpenAI Assistants API", "vector store file search", "code interpreter assistant".
---

# OpenAI Assistants Builder — API Assistants v2

## Critères de décision : Assistants API vs Chat Completions

| Besoin | Assistants API | Chat Completions |
|---|---|---|
| Mémoire de conversation persistante | ✅ Threads gérés par OpenAI | ❌ À gérer soi-même |
| Recherche sémantique dans des fichiers | ✅ file_search natif | ❌ RAG custom requis |
| Exécution de code Python | ✅ code_interpreter sandbox | ❌ Sandbox custom requis |
| Latence minimale (< 500ms) | ❌ Overhead run lifecycle | ✅ Réponse directe |
| Contrôle total du contexte | ❌ Géré par OpenAI | ✅ Contrôle complet |
| Coût optimisé (volume élevé) | ❌ + coût tools/storage | ✅ Tokens seuls |

**Choisir Assistants API** pour les MVP avec RAG ou analyse de données sans backend complexe.
**Choisir Chat Completions** quand la latence, le coût, ou le contrôle du contexte sont prioritaires.

## Workflow en 10 étapes

### 1. Installation et initialisation

```bash
pip install openai>=1.57.0 tenacity
```

```python
from openai import OpenAI
import os

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Azure OpenAI (optionnel) :
# from openai import AzureOpenAI
# client = AzureOpenAI(
#     azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
#     api_key=os.environ["AZURE_OPENAI_KEY"],
#     api_version="2024-05-01-preview",
# )
```

### 2. Création de l'assistant (une seule fois)

```python
assistant = client.beta.assistants.create(
    name="Assistant Commercial",
    model="gpt-4o",                        # ou gpt-4o-mini pour réduire les coûts
    instructions=(
        "Vous êtes un assistant commercial expert. "
        "Répondez en français, citez vos sources documentaires. "
        "Soyez concis et professionnel."
    ),
    tools=[
        {"type": "file_search"},
        {"type": "code_interpreter"},
        {
            "type": "function",
            "function": {
                "name": "get_product_price",
                "description": "Consulte le prix d'un produit dans le catalogue",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "string", "description": "ID produit (ex: PROD001)"}
                    },
                    "required": ["product_id"],
                },
            },
        },
    ],
    temperature=0.2,                       # Réduire pour des réponses plus déterministes
    response_format="auto",                # ou {"type":"json_object"} pour JSON structuré
)

# IMPORTANT : stocker cet ID — ne jamais recréer l'assistant à chaque appel
print(f"ASSISTANT_ID={assistant.id}")      # Persister dans .env ou config
```

### 3. Vector store pour file_search

```python
# Créer le vector store une seule fois, le réutiliser ensuite
vector_store = client.beta.vector_stores.create(
    name="Base documentaire",
    expires_after={"anchor": "last_active_at", "days": 30},  # Nettoyage auto
)

# Upload batch (files + poll jusqu'à indexation complète)
file_paths = ["rapport_q3.pdf", "guide_produit.pdf", "faq.docx"]
with client.beta.vector_stores.file_batches.upload_and_poll(
    vector_store_id=vector_store.id,
    files=[open(p, "rb") for p in file_paths],
) as batch:
    print(f"Indexés : {batch.file_counts.completed}/{batch.file_counts.total}")

# Attacher à l'assistant
client.beta.assistants.update(
    assistant_id=assistant.id,
    tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}},
)
```

**Formats supportés** : PDF, DOCX, TXT, MD, HTML, JSON, CSV, Python, JS/TS, C/C++, Java, etc.
**Taille max par fichier** : 512 MB, 5 000 000 tokens après parsing.
**Coût de stockage** : ~$0.10/GB/jour — configurer `expires_after` systématiquement.

### 4. Threads : une session par utilisateur

```python
# Créer un thread et stocker thread_id par user_id en base de données
thread = client.beta.threads.create(
    metadata={"user_id": "u-001", "channel": "web"},
)
# Stocker : db.set(f"thread:{user_id}", thread.id)

# Récupérer un thread existant
# thread_id = db.get(f"thread:{user_id}")
```

### 5. Ajout de messages

```python
client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="Quels sont les revenus du Q3 selon le rapport ?",
    # Attacher un fichier au message pour code_interpreter :
    # attachments=[{"file_id": file_id, "tools": [{"type": "code_interpreter"}]}],
)
```

### 6. Exécution : polling (simple, scripts/CLI)

```python
import json

def run_with_tool_calls(thread_id: str, assistant_id: str) -> str:
    run = client.beta.threads.runs.create_and_poll(
        thread_id=thread_id,
        assistant_id=assistant_id,
        truncation_strategy={"type": "last_messages", "last_messages": 20},
    )

    # Boucle tool calls
    while run.status == "requires_action":
        tool_outputs = []
        for tc in run.required_action.submit_tool_outputs.tool_calls:
            args = json.loads(tc.function.arguments)
            result = dispatch_function(tc.function.name, args)
            tool_outputs.append({"tool_call_id": tc.id, "output": json.dumps(result)})
        run = client.beta.threads.runs.submit_tool_outputs_and_poll(
            thread_id=thread_id, run_id=run.id, tool_outputs=tool_outputs,
        )

    if run.status != "completed":
        raise RuntimeError(f"Run {run.status}: {run.last_error}")

    print(f"Tokens: {run.usage.total_tokens}")  # Tracking coût

    msgs = client.beta.threads.messages.list(thread_id=thread_id, order="desc", limit=1)
    return extract_text_with_citations(msgs.data[0])
```

### 7. Extraction du texte et annotations (citations)

```python
def extract_text_with_citations(message) -> str:
    result = ""
    for block in message.content:
        if block.type != "text":
            continue
        text = block.text.value
        for ann in block.text.annotations:
            if ann.type == "file_citation":
                fname = client.files.retrieve(ann.file_citation.file_id).filename
                text = text.replace(ann.text, f" [{fname}]")
            elif ann.type == "file_path":
                text = text.replace(ann.text, f" [fichier généré: {ann.file_path.file_id}]")
        result += text
    return result
```

### 8. Streaming (interfaces web, UX réactive)

```python
from openai import AssistantEventHandler
from typing_extensions import override

class StreamHandler(AssistantEventHandler):
    def __init__(self, on_token=None):
        super().__init__()
        self.on_token = on_token or (lambda t: print(t, end="", flush=True))
        self.full_text = ""

    @override
    def on_text_delta(self, delta, snapshot):
        if delta.value:
            self.full_text += delta.value
            self.on_token(delta.value)

    @override
    def on_tool_call_created(self, tool_call):
        print(f"\n[{tool_call.type} activé...]", flush=True)

# Utilisation
handler = StreamHandler()
with client.beta.threads.runs.stream(
    thread_id=thread.id,
    assistant_id=assistant.id,
    event_handler=handler,
) as stream:
    stream.until_done()
print(f"\nRéponse complète : {len(handler.full_text)} caractères")
```

### 9. Retry robuste pour les rate limits

```python
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import openai

@retry(
    retry=retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError)),
    wait=wait_exponential(multiplier=1, min=1, max=60),
    stop=stop_after_attempt(5),
)
def safe_create_run(thread_id, assistant_id):
    return client.beta.threads.runs.create_and_poll(
        thread_id=thread_id, assistant_id=assistant_id
    )
```

### 10. Nettoyage et contrôle des coûts

```python
import datetime

def cleanup_old_threads(db, days=30):
    """Supprime les threads inactifs > N jours."""
    cutoff = datetime.datetime.now() - datetime.timedelta(days=days)
    for user_id, thread_id, last_active in db.get_inactive_threads(cutoff):
        try:
            client.beta.threads.delete(thread_id)
            db.remove_thread(user_id)
        except openai.NotFoundError:
            db.remove_thread(user_id)  # Déjà supprimé

def cleanup_orphan_files(active_file_ids: set):
    """Supprime les fichiers non attachés à un assistant ou thread."""
    for f in client.files.list(purpose="assistants"):
        if f.id not in active_file_ids:
            client.files.delete(f.id)
            print(f"Fichier supprimé : {f.id} ({f.filename})")
```

## Garde-fous et anti-patterns

| Anti-pattern | Impact | Correction |
|---|---|---|
| Recréer l'assistant à chaque requête | Coût + désorganisation du compte | Stocker `assistant_id` dans la config |
| Un thread par message (pas par user) | Perte de contexte + coût explosif | Un thread persistant par session utilisateur |
| Ignorer `requires_action` dans le polling | Run bloqué indéfiniment | Toujours gérer le cas dans la boucle |
| Pas de `truncation_strategy` en prod | Coût croissant avec la longueur du thread | `last_messages: 20` par défaut |
| Files et vector stores jamais supprimés | Facture de stockage continue | `expires_after` + job de nettoyage périodique |
| Pas de retry sur les appels API | Crash sur RateLimitError en prod | `tenacity` avec backoff exponentiel |
| `code_interpreter` activé sans nécessité | +$0.03/session inutile | N'activer que les tools nécessaires par assistant |

## Bonnes pratiques 2026

- **Modèle** : `gpt-4o-mini` pour les cas simples (file_search Q&A), `gpt-4o` pour le raisonnement complexe ou le code.
- **run.usage** : logguer `prompt_tokens` et `completion_tokens` après chaque run pour alerter sur les dérives de coût.
- **Structured outputs** : utiliser `response_format={"type": "json_schema", "json_schema": {...}}` pour des réponses avec schéma strict (Pydantic compatible).
- **Parallel tool calls** : l'assistant peut appeler plusieurs fonctions en parallèle — `dispatch_function` doit être thread-safe.
- **Async** : utiliser `AsyncOpenAI` en environnement FastAPI/asyncio pour ne pas bloquer l'event loop.
- **Observabilité** : logger `run_id`, `thread_id`, `assistant_id` et `usage` pour tracer chaque interaction en production.
