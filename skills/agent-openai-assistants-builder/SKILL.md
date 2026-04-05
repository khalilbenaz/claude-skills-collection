---
name: agent-openai-assistants-builder
description: Création d'assistants IA hébergés avec l'API OpenAI Assistants v2. File search avec vector stores, code interpreter, function calling, threads persistants et streaming. Se déclenche avec "OpenAI Assistants", "assistant API", "file search", "code interpreter", "thread", "run", "assistant OpenAI", "GPT assistant", "vector store OpenAI", "assistants v2".
---

# OpenAI Assistants Builder — API Assistants v2

## Quand utiliser ce skill

Utiliser ce skill quand l'utilisateur veut créer un assistant hébergé directement par OpenAI, sans infrastructure à gérer. L'API Assistants v2 est idéale pour : chatbots avec mémoire de conversation persistante, assistants capables d'analyser des fichiers (PDF, Excel, code), outils d'analyse de données avec exécution de code Python, ou assistants qui combinent recherche dans des documents et appels de fonctions métier. C'est la solution la plus rapide pour un MVP d'assistant IA sans backend complexe.

## Workflow

1. **Setup et initialisation du client**
   - Installer : `pip install openai==1.57.0`
   - Initialiser le client :
     ```python
     from openai import OpenAI
     import os

     client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
     # Pour Azure OpenAI :
     # from openai import AzureOpenAI
     # client = AzureOpenAI(azure_endpoint=..., api_version="2024-05-01-preview")
     ```
   - Les assistants sont persistants — un assistant créé une fois peut être réutilisé indéfiniment via son `assistant_id`

2. **Création de l'assistant**
   - Paramètres clés : `model`, `name`, `instructions` (system prompt), `tools`, `tool_resources`, `response_format`
   - `instructions` : le system prompt permanent de l'assistant (jusqu'à 256 000 tokens)
   - `response_format` : `"auto"`, `{"type": "json_object"}`, ou JSON Schema pour outputs structurés
   - Bonne pratique : créer l'assistant une seule fois et stocker son ID, ne pas le recréer à chaque session

3. **Tools intégrés**
   - **`file_search`** : recherche sémantique dans des fichiers attachés (PDF, DOCX, TXT, code, etc.)
   - **`code_interpreter`** : exécute du code Python dans un sandbox sécurisé (analyse de données, graphiques, calculs)
   - **`function`** : function calling classique pour intégrer des APIs et logique métier externe
   - Activer dans `tools` : `[{"type": "file_search"}, {"type": "code_interpreter"}]`
   - Piège : `code_interpreter` et `file_search` ont un coût par session — surveiller l'usage

4. **Vector Stores pour file_search**
   - Le vector store indexe et stocke les embeddings des fichiers pour la recherche sémantique :
     ```python
     # Créer un vector store
     vector_store = client.beta.vector_stores.create(name="Base documentaire")

     # Uploader des fichiers dans le vector store
     file_paths = ["rapport_annuel.pdf", "guide_produit.pdf"]
     file_streams = [open(path, "rb") for path in file_paths]

     file_batch = client.beta.vector_stores.file_batches.upload_and_poll(
         vector_store_id=vector_store.id,
         files=file_streams,
     )
     print(f"Statut : {file_batch.status}, Fichiers : {file_batch.file_counts}")

     # Attacher le vector store à l'assistant
     assistant = client.beta.assistants.update(
         assistant_id=assistant.id,
         tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}},
     )
     ```
   - Les vector stores ont un coût de stockage (environ $0.10/GB/jour)
   - `expiration_policy` : configurer pour supprimer automatiquement les stores inactifs

5. **Threads et messages**
   - Un `Thread` représente une conversation — il persiste tous les messages automatiquement
   - Créer un thread : `thread = client.beta.threads.create()`
   - Ajouter un message :
     ```python
     message = client.beta.threads.messages.create(
         thread_id=thread.id,
         role="user",
         content="Quels sont les revenus du Q3 selon le rapport ?",
         # Attacher des fichiers spécifiques à ce message (pour code_interpreter)
         attachments=[{
             "file_id": file_id,
             "tools": [{"type": "code_interpreter"}],
         }],
     )
     ```
   - `metadata` : dict key-value pour stocker des infos custom (user_id, session_id)

6. **Runs — exécution de l'assistant**
   - Un `Run` représente une invocation de l'assistant sur un thread
   - **Polling** (simple mais bloquant) :
     ```python
     run = client.beta.threads.runs.create_and_poll(
         thread_id=thread.id,
         assistant_id=assistant.id,
         instructions="Répondez toujours en français avec des citations précises.",
     )
     if run.status == "completed":
         messages = client.beta.threads.messages.list(thread_id=thread.id)
         print(messages.data[0].content[0].text.value)
     ```
   - Statuts possibles : `queued` → `in_progress` → `completed` | `requires_action` | `failed` | `expired`
   - Un run expire après 10 minutes d'inactivité

7. **Function calling — intégration d'APIs externes**
   - Définir les fonctions dans `tools` lors de la création de l'assistant
   - Gérer le statut `requires_action` :
     ```python
     if run.status == "requires_action":
         tool_outputs = []
         for tool_call in run.required_action.submit_tool_outputs.tool_calls:
             name = tool_call.function.name
             args = json.loads(tool_call.function.arguments)
             result = dispatch_function(name, args)  # votre logique
             tool_outputs.append({
                 "tool_call_id": tool_call.id,
                 "output": json.dumps(result),
             })
         run = client.beta.threads.runs.submit_tool_outputs_and_poll(
             thread_id=thread.id,
             run_id=run.id,
             tool_outputs=tool_outputs,
         )
     ```
   - Délai maximum pour soumettre les tool outputs : 10 minutes (sinon le run expire)

8. **Streaming — réponses progressives**
   - L'API supporte le streaming natif via des Server-Sent Events :
     ```python
     from openai import AssistantEventHandler
     from typing_extensions import override

     class MyEventHandler(AssistantEventHandler):
         @override
         def on_text_delta(self, delta, snapshot):
             print(delta.value, end="", flush=True)

         @override
         def on_tool_call_created(self, tool_call):
             print(f"\n[Outil activé : {tool_call.type}]")

         @override
         def on_run_step_delta(self, delta, snapshot):
             if delta.step_details.type == "tool_calls":
                 for call in delta.step_details.tool_calls or []:
                     if hasattr(call, "code_interpreter"):
                         print(call.code_interpreter.input or "", end="")

     with client.beta.threads.runs.stream(
         thread_id=thread.id,
         assistant_id=assistant.id,
         event_handler=MyEventHandler(),
     ) as stream:
         stream.until_done()
     ```

9. **Gestion des fichiers et annotations**
   - Uploader un fichier : `file = client.files.create(file=open("data.csv", "rb"), purpose="assistants")`
   - `purpose="assistants"` pour les deux tools ; les fichiers sont globaux au compte
   - **Annotations** dans les réponses : références aux fichiers sources à extraire et formatter :
     ```python
     for content_block in message.content:
         text_value = content_block.text.value
         for annotation in content_block.text.annotations:
             if annotation.type == "file_citation":
                 cited_file = client.files.retrieve(annotation.file_citation.file_id)
                 text_value = text_value.replace(
                     annotation.text, f"[{cited_file.filename}]"
                 )
     ```
   - Nettoyer les fichiers non utilisés : `client.files.delete(file_id)` (facturation continue sinon)

10. **Production — robustesse et gestion des coûts**
    - **Rate limits** : l'API a des limites par minute — implémenter un retry avec backoff exponentiel
    - **Gestion des threads** : stocker le `thread_id` par utilisateur en base de données, ne pas créer un thread par message
    - **Nettoyage** : supprimer les threads inactifs > 30 jours, limiter la taille des threads avec `truncation_strategy`
    - **Cost tracking** : surveiller `run.usage` (prompt_tokens, completion_tokens) après chaque run
    - **Error handling** : gérer `openai.APIStatusError`, `openai.APITimeoutError`, `openai.RateLimitError`

## Exemples de code

### Assistant complet avec file_search, code_interpreter et function calling

```python
import os
import json
import time
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# ===== CONFIGURATION DES FONCTIONS EXTERNES =====
def get_product_price(product_id: str) -> dict:
    """Simule une requête base de données."""
    prices = {"PROD001": 49.99, "PROD002": 129.99, "PROD003": 9.99}
    price = prices.get(product_id)
    if price:
        return {"product_id": product_id, "price": price, "currency": "EUR"}
    return {"error": f"Produit {product_id} introuvable"}

def dispatch_tool(name: str, args: dict) -> str:
    """Route les appels de fonctions."""
    if name == "get_product_price":
        return json.dumps(get_product_price(**args))
    return json.dumps({"error": f"Fonction inconnue: {name}"})

# ===== CRÉATION DE L'ASSISTANT =====
def create_or_load_assistant(assistant_id: str = None):
    """Crée un nouvel assistant ou charge un assistant existant."""
    if assistant_id:
        return client.beta.assistants.retrieve(assistant_id)

    return client.beta.assistants.create(
        name="Assistant Commercial",
        model="gpt-4o",
        instructions=(
            "Vous êtes un assistant commercial expert. "
            "Vous aidez les clients à comprendre nos produits, analysez des données "
            "avec du code Python, et consultez notre catalogue en temps réel. "
            "Répondez toujours en français de manière professionnelle et concise. "
            "Citez vos sources quand vous utilisez des documents."
        ),
        tools=[
            {"type": "file_search"},
            {"type": "code_interpreter"},
            {
                "type": "function",
                "function": {
                    "name": "get_product_price",
                    "description": "Consulte le prix actuel d'un produit dans notre catalogue",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {
                                "type": "string",
                                "description": "L'identifiant du produit (ex: PROD001)",
                            }
                        },
                        "required": ["product_id"],
                    },
                },
            },
        ],
    )

# ===== GESTION DES RUNS =====
def process_run(thread_id: str, assistant_id: str, user_instructions: str = None) -> str:
    """Lance un run, gère les tool calls, et retourne la réponse finale."""
    run_params = {
        "thread_id": thread_id,
        "assistant_id": assistant_id,
    }
    if user_instructions:
        run_params["additional_instructions"] = user_instructions

    run = client.beta.threads.runs.create(**run_params)

    # Polling avec gestion des tool calls
    while run.status in ["queued", "in_progress", "requires_action"]:
        time.sleep(0.5)
        run = client.beta.threads.runs.retrieve(
            thread_id=thread_id, run_id=run.id
        )

        if run.status == "requires_action":
            tool_outputs = []
            for tool_call in run.required_action.submit_tool_outputs.tool_calls:
                args = json.loads(tool_call.function.arguments)
                output = dispatch_tool(tool_call.function.name, args)
                print(f"  [Tool] {tool_call.function.name}({args}) → {output}")
                tool_outputs.append({
                    "tool_call_id": tool_call.id,
                    "output": output,
                })
            run = client.beta.threads.runs.submit_tool_outputs(
                thread_id=thread_id,
                run_id=run.id,
                tool_outputs=tool_outputs,
            )

    if run.status != "completed":
        raise RuntimeError(f"Run échoué : {run.status} — {run.last_error}")

    # Récupérer le dernier message de l'assistant
    messages = client.beta.threads.messages.list(
        thread_id=thread_id, order="desc", limit=1
    )
    last_message = messages.data[0]

    # Traiter les annotations (citations)
    response_text = ""
    for content_block in last_message.content:
        if content_block.type == "text":
            text_value = content_block.text.value
            for annotation in content_block.text.annotations:
                if annotation.type == "file_citation":
                    cited_file = client.files.retrieve(annotation.file_citation.file_id)
                    text_value = text_value.replace(
                        annotation.text, f" [Source: {cited_file.filename}]"
                    )
            response_text += text_value

    return response_text

# ===== SESSION DE CHAT =====
def run_chat_session():
    # Créer ou charger l'assistant
    # En production : stocker et réutiliser l'assistant_id
    assistant = create_or_load_assistant()
    print(f"Assistant prêt : {assistant.id}")

    # Créer un thread de conversation
    thread = client.beta.threads.create(
        metadata={"user_id": "user-demo-001", "session": "2025-01"},
    )
    print(f"Thread créé : {thread.id}\n")

    print("=== Assistant Commercial IA ===")
    print("(Tapez 'quit' pour terminer)\n")

    while True:
        user_input = input("Vous : ").strip()
        if user_input.lower() == "quit":
            break
        if not user_input:
            continue

        # Ajouter le message au thread
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=user_input,
        )

        print("Assistant : ", end="")
        try:
            response = process_run(thread.id, assistant.id)
            print(response)
        except RuntimeError as e:
            print(f"Erreur : {e}")
        print()

    # Nettoyage optionnel
    print(f"\nSession terminée. Thread ID sauvegardé : {thread.id}")
    print("Tokens utilisés dans le dernier run :")
    # (récupérer via run.usage après le dernier run)

if __name__ == "__main__":
    run_chat_session()
```

### Streaming avec EventHandler pour interface web

```python
import os
from openai import OpenAI, AssistantEventHandler
from typing_extensions import override

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

class StreamingEventHandler(AssistantEventHandler):
    """Handler pour streaming progressif dans une interface web."""

    def __init__(self, on_token=None, on_tool_start=None, on_complete=None):
        super().__init__()
        self.on_token = on_token or (lambda t: print(t, end="", flush=True))
        self.on_tool_start = on_tool_start or (lambda t: print(f"\n[Outil: {t}]"))
        self.on_complete = on_complete or (lambda: print("\n[Terminé]"))
        self.full_response = ""

    @override
    def on_text_delta(self, delta, snapshot):
        if delta.value:
            self.full_response += delta.value
            self.on_token(delta.value)

    @override
    def on_tool_call_created(self, tool_call):
        self.on_tool_start(tool_call.type)

    @override
    def on_run_step_done(self, run_step):
        if run_step.status == "completed":
            pass

    @override
    def on_end(self):
        self.on_complete()

def stream_response(thread_id: str, assistant_id: str, user_message: str):
    """Envoie un message et streame la réponse."""
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=user_message,
    )

    handler = StreamingEventHandler()

    with client.beta.threads.runs.stream(
        thread_id=thread_id,
        assistant_id=assistant_id,
        event_handler=handler,
    ) as stream:
        stream.until_done()

    return handler.full_response

# Exemple d'utilisation avec FastAPI (pour une API web)
# from fastapi import FastAPI
# from fastapi.responses import StreamingResponse
# import asyncio
#
# app = FastAPI()
#
# @app.post("/chat/stream")
# async def chat_stream(thread_id: str, assistant_id: str, message: str):
#     async def generate():
#         # Dans un contexte réel, utiliser la version async du client
#         for token in ["Implémentation", " SSE", " ici"]:
#             yield f"data: {token}\n\n"
#             await asyncio.sleep(0.05)
#     return StreamingResponse(generate(), media_type="text/event-stream")
```

## Règles

1. **Stocker les IDs (assistant_id, thread_id) en base de données** — Ne jamais recréer un assistant à chaque appel. Un assistant coûte rien à stocker, mais recréer inutilement gaspille du temps et désorganise le compte. Stocker `assistant_id` dans la config et `thread_id` par utilisateur en base.

2. **Toujours gérer le statut `requires_action` dans la boucle de polling** — Le function calling exige de soumettre les `tool_outputs` dans les 10 minutes. Une application qui ignore ce statut restera bloquée indéfiniment. Vérifier ce cas dans toute boucle de polling ou handler de streaming.

3. **Nettoyer les fichiers et vector stores inutilisés** — Les fichiers uploadés et les vector stores génèrent des coûts de stockage continus. Implémenter une tâche de nettoyage périodique : supprimer les fichiers non attachés, configurer `expiration_policy` sur les vector stores, et supprimer les threads inactifs après 30 jours.

4. **Utiliser `truncation_strategy` sur les threads longs** — Par défaut, tous les messages d'un thread sont envoyés au LLM (coût croissant). Configurer `truncation_strategy={"type": "last_messages", "last_messages": 20}` sur les runs pour contrôler les coûts en production.

5. **Implémenter un retry avec backoff exponentiel pour les rate limits** — L'API OpenAI retourne des `RateLimitError` (429) lors de pics de charge. Toujours encapsuler les appels API dans un retry avec délai exponentiel (1s, 2s, 4s, max 60s) et alerter si le retry échoue après 5 tentatives.


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
