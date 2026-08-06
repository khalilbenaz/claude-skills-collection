---
name: agent-memory-designer
description: Architecture de mémoire pour agents IA — short-term, long-term, episodic, semantic, working memory. Se déclenche avec "mémoire agent", "agent memory", "long-term memory", "context window", "vector memory", "conversation history", "agent qui se souvient", "persistent memory". Also triggers on "long term memory for agent", "episodic memory".
---

# Agent Memory Designer

## Quand utiliser ce skill

Utilise ce skill pour concevoir ou améliorer le système de mémoire d'un agent IA dès que :
- l'agent doit se souvenir d'informations au-delà d'une seule conversation ;
- l'historique de conversation dépasse ou menace de dépasser la fenêtre de contexte ;
- plusieurs agents doivent partager une base de connaissance commune ;
- l'utilisateur se plaint que "l'agent ne se souvient pas".

---

## Étape 1 — Diagnostic des besoins

Avant de choisir un backend, réponds à ces questions :

| Question | Réponse → choix |
|---|---|
| Les souvenirs doivent-ils survivre au redémarrage du processus ? | Oui → persistence ; Non → in-memory suffit |
| Plusieurs sessions/utilisateurs partagent-ils la mémoire ? | Oui → backend centralisé (DB/cloud) |
| Le volume de souvenirs dépasse-t-il 10 k entrées ? | Oui → vector store dédié (Pinecone, Weaviate) |
| La latence de retrieval est-elle critique (< 100 ms) ? | Oui → Redis ou FAISS local |
| Confidentialité par utilisateur requise ? | Oui → namespace/user_id strict obligatoire |

---

## Étape 2 — Choisir les types de mémoire à implémenter

Chaque type a un rôle distinct ; ne pas tout mettre dans le même bucket.

| Type | Durée | Contenu typique | Backend |
|---|---|---|---|
| **Working / short-term** | Session en cours | Messages de la conversation | Buffer in-process |
| **Episodic** | Long terme | Interactions passées horodatées | Vector store + metadata |
| **Semantic** | Long terme | Faits, préférences utilisateur | Vector store ou SQL |
| **Procedural** | Persistant | Workflows mémorisés, "comment faire X" | Fichier structuré ou DB |

Règle de sélection : implémente **working** en priorité, puis **episodic** si l'utilisateur a besoin de continuité cross-session, **semantic** si l'agent doit raisonner sur des faits durables.

---

## Étape 3 — Working memory (gestion de la fenêtre de contexte)

Objectif : maintenir un historique utile sans dépasser le budget de tokens.

**Stratégie 1 — Sliding window (simple, prototypage)**
```python
def sliding_window(messages: list, max_messages: int = 20) -> list:
    system = [m for m in messages if m["role"] == "system"]
    rest = [m for m in messages if m["role"] != "system"]
    return system + rest[-max_messages:]
```

**Stratégie 2 — Summarization progressive (recommandée en production)**
```python
def compress_history(messages: list, max_tokens: int, llm) -> list:
    while count_tokens(messages) > max_tokens:
        # Résume la première moitié, garde la seconde intacte
        mid = len(messages) // 2
        summary = llm.invoke(f"Résume cette conversation en 3 phrases max :\n{format(messages[:mid])}")
        messages = [{"role": "system", "content": f"[Résumé antérieur] {summary}"}] + messages[mid:]
    return messages
```

**Stratégie 3 — Importance-based pruning**
Score chaque message (longueur, présence d'entités nommées, marqueur "IMPORTANT:"), supprime les messages au score le plus bas.

Règle : réserve **max 20 %** du budget de tokens pour la mémoire injectée.

---

## Étape 4 — Long-term memory avec vector store

### Pattern de base (ChromaDB local)

```python
import chromadb
from sentence_transformers import SentenceTransformer

client = chromadb.PersistentClient(path="./memory_db")
collection = client.get_or_create_collection("agent_memory")
model = SentenceTransformer("all-MiniLM-L6-v2")

def remember(user_id: str, content: str, metadata: dict = {}):
    vec = model.encode(content).tolist()
    collection.add(
        ids=[f"{user_id}_{hash(content)}"],
        embeddings=[vec],
        documents=[content],
        metadatas=[{"user_id": user_id, "ts": datetime.utcnow().isoformat(), **metadata}]
    )

def recall(user_id: str, query: str, top_k: int = 5) -> list[str]:
    vec = model.encode(query).tolist()
    results = collection.query(
        query_embeddings=[vec],
        n_results=top_k,
        where={"user_id": user_id}  # isolation par utilisateur
    )
    return results["documents"][0]
```

### Critères de choix du backend

| Backend | Usage | Avantages |
|---|---|---|
| ChromaDB | Dev/local | Zéro config, Python natif |
| pgvector | Production SQL existante | Transactionnel, SQL standard |
| Pinecone | Production scalable cloud | Managed, low-latency |
| Weaviate | Hybrid search natif | BM25 + dense intégré |
| FAISS | Batch/offline | Très rapide, in-memory |
| Redis (RedisVL) | Cache + vector | Sub-ms, TTL natif |

---

## Étape 5 — Episodic memory

Enregistre les interactions complètes pour permettre à l'agent de retrouver "la dernière fois que j'ai fait X pour cet utilisateur".

```python
from uuid import uuid4

def store_episode(user_id: str, task: str, result: str, outcome: str = "success"):
    content = f"Tâche: {task} | Résultat: {result}"
    remember(
        user_id=user_id,
        content=content,
        metadata={"type": "episode", "outcome": outcome}
    )

def get_similar_episodes(user_id: str, current_task: str) -> str:
    episodes = recall(user_id, current_task, top_k=3)
    if not episodes:
        return ""
    return "Épisodes similaires passés :\n" + "\n".join(f"- {e}" for e in episodes)
```

---

## Étape 6 — Injection dans le prompt

Assemble le contexte mémorisé de manière structurée :

```python
def build_system_with_memory(base_system: str, user_id: str, query: str, token_budget: int = 400) -> str:
    memories = recall(user_id, query, top_k=5)
    if not memories:
        return base_system
    mem_block = "\n".join(f"- {m}" for m in memories)
    mem_block = truncate_to_tokens(mem_block, token_budget)
    return f"{base_system}\n\n[Mémoire pertinente]\n{mem_block}"
```

Ordre de priorité dans le prompt : `system` → `mémoire injectée` → `historique court-terme` → `message utilisateur`.

---

## Étape 7 — Shared memory multi-agent

Trois patterns selon le niveau de coordination :

**Blackboard** — espace partagé en lecture/écriture, tous les agents y accèdent :
```python
# Redis comme blackboard partagé
redis_client.set(f"blackboard:{session_id}:{key}", value, ex=3600)
value = redis_client.get(f"blackboard:{session_id}:{key}")
```

**Entity memory** — un enregistrement par entité (utilisateur, projet, document) mis à jour par n'importe quel agent :
```python
def update_entity(entity_type: str, entity_id: str, field: str, value: str):
    key = f"entity:{entity_type}:{entity_id}"
    redis_client.hset(key, field, value)
```

**Consensus KB** — les agents votent avant d'écrire un fait durable (évite les contradictions).

---

## Étape 8 — Maintenance et compaction

Sans maintenance, la mémoire se dégrade. Automatise ces opérations :

```python
def compact_memories(user_id: str, llm, threshold_days: int = 30):
    # Récupérer les vieux souvenirs, les fusionner/résumer
    old = collection.get(where={"user_id": user_id, "age_days": {"$gt": threshold_days}})
    if len(old["documents"]) > 10:
        summary = llm.invoke(f"Résume ces souvenirs en bullet points concis :\n{old['documents']}")
        # Supprimer les anciens, stocker le résumé
        collection.delete(ids=old["ids"])
        remember(user_id, summary, {"type": "summary"})
```

Fréquence recommandée : quotidienne pour les agents actifs, hebdomadaire pour les autres.

---

## Anti-patterns et pièges

- **Tout mémoriser** : sans filtre d'importance, le retrieval se noie dans le bruit. Applique un seuil de score de similarité minimum (ex: > 0.7) avant de stocker.
- **Mémoire sans user_id** : mélange les données entre utilisateurs. Toujours namespaced.
- **Souvenirs obsolètes non invalidés** : une information peut changer. Ajoute un TTL ou un champ `valid_until` ; invalide explicitement les faits remplacés.
- **Latence retrieval synchrone** : ne bloque pas le pipeline principal. Lancer le recall en parallèle du traitement de la requête (`asyncio.gather`).
- **Embeddings incohérents** : utiliser des modèles d'embedding différents entre `remember` et `recall` casse le retrieval. Versionner et figer le modèle d'embedding.
- **Pas de fallback** : si le vector store est indisponible, l'agent doit continuer à fonctionner sans mémoire long-terme plutôt que planter.
- **Injection illimitée** : injecter trop de mémoire pousse les instructions system et le message utilisateur hors de la fenêtre. Budget de tokens strict : 15–20 % max pour la mémoire.

---

## Checklist de livraison

- [ ] Types de mémoire identifiés et documentés
- [ ] Backend choisi selon les contraintes (latence, volume, persistence)
- [ ] Isolation par user_id implémentée
- [ ] Budget de tokens pour la section mémoire défini et respecté
- [ ] Stratégie de compaction/expiration définie
- [ ] Fallback si backend indisponible implémenté
- [ ] Métriques de qualité mesurées (recall accuracy, relevancy, latence)


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
