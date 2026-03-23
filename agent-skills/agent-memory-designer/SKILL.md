---
name: agent-memory-designer
description: Architecture de mémoire pour agents IA — short-term, long-term, episodic, semantic, working memory. Se déclenche avec "mémoire agent", "agent memory", "long-term memory", "context window", "vector memory", "conversation history", "agent qui se souvient", "persistent memory".
---

# Agent Memory Designer

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois concevoir ou améliorer le système de mémoire d'un agent IA. Il s'applique dès que l'agent doit se souvenir d'informations au-delà d'une seule conversation, gérer un historique long qui dépasse la fenêtre de contexte, ou partager une base de connaissances entre plusieurs agents. Couvre aussi bien la mémoire éphémère (session) que la mémoire persistante (cross-session).

## Workflow

1. **Types de mémoire** — Identifie les besoins selon les quatre types : `short-term/working` (contexte de la conversation en cours), `long-term/semantic` (faits et connaissances durables), `episodic` (expériences passées horodatées), `procedural` (comment accomplir des tâches, workflows mémorisés). Chaque type a un backend et une stratégie de retrieval différents.

2. **Short-term memory** — Implémente un buffer de conversation avec gestion du token budget : sliding window (garder les N derniers messages), summarization progressive (résumer les anciens messages plutôt que les tronquer), ou importance-based pruning (supprimer les messages peu importants).
   ```python
   def trim_history(messages: list, max_tokens: int, llm) -> list:
       while count_tokens(messages) > max_tokens:
           summary = llm.summarize(messages[:len(messages)//2])
           messages = [{"role": "system", "content": f"Résumé: {summary}"}] + messages[len(messages)//2:]
       return messages
   ```

3. **Long-term memory avec vector stores** — Stocke les informations importantes sous forme d'embeddings dans un vector store (ChromaDB, Pinecone, Weaviate, pgvector). À chaque tour, encode la requête et effectue une recherche par similarité pour injecter les souvenirs pertinents.

4. **Episodic memory** — Enregistre les interactions passées complètes avec horodatage, contexte et résultat. Permet à l'agent de retrouver "la dernière fois que j'ai aidé cet utilisateur avec X". Implémente un retrieval par similarité sémantique + filtrage temporel.
   ```python
   def store_episode(user_id: str, task: str, result: str, vector_store):
       episode = {"task": task, "result": result, "timestamp": datetime.now().isoformat(), "user_id": user_id}
       embedding = embed(f"{task} {result}")
       vector_store.upsert(id=str(uuid4()), vector=embedding, metadata=episode)
   ```

5. **Memory indexing et retrieval** — Combine plusieurs stratégies de recherche : `dense retrieval` (similarité vectorielle), `sparse retrieval` (BM25/keyword), `hybrid search` (fusion des deux). Applique un re-ranking (cross-encoder) pour améliorer la précision. Intègre un time-decay pour favoriser les souvenirs récents.

6. **Memory management** — Préviens la dégradation par accumulation : compaction périodique (fusionner les souvenirs similaires), summarization (résumer les épisodes anciens), garbage collection (supprimer les souvenirs inutilisés depuis longtemps), limites de capacité par utilisateur/session.

7. **Persistence** — Choisis le backend selon les contraintes : `SQLite/PostgreSQL` pour les données structurées, `ChromaDB/FAISS` pour les embeddings locaux, `Pinecone/Weaviate` pour la production scalable, `Redis` pour le cache court terme, fichiers JSON pour le prototypage. Assure la cohérence entre le vector store et le stockage de métadonnées.

8. **Memory injection dans le prompt** — Assemble le contexte mémorisé intelligemment : récupère les N souvenirs les plus pertinents, ordonne par priorité (récence, score de similarité, importance), formate pour le LLM, et respecte un budget de tokens strict pour la section mémoire.
   ```python
   def build_memory_context(query: str, vector_store, max_tokens: int = 500) -> str:
       memories = vector_store.query(embed(query), top_k=5)
       context = "\n".join([f"- {m['content']}" for m in memories])
       return truncate_to_tokens(context, max_tokens)
   ```

9. **Shared memory multi-agent** — Pour les systèmes multi-agents, implémente un `blackboard` partagé (espace de travail commun en lecture/écriture), une `shared knowledge base` (faits partagés, mis à jour consensuellement), ou une `entity memory` (état par entité : utilisateur, projet, document).

10. **Évaluation** — Mesure la qualité de la mémoire : `recall accuracy` (l'agent retrouve-t-il les bons souvenirs ?), `relevancy` (les souvenirs injectés sont-ils pertinents ?), `hallucination from stale memory` (vieilles infos contradisant la réalité actuelle), latence du retrieval, utilisation du budget de tokens.

## Règles

- **Anti-pattern — tout mémoriser** : stocker chaque message sans sélection crée du bruit et ralentit le retrieval ; implémente un filtre d'importance avant stockage.
- **Versioning des souvenirs** : une information peut devenir obsolète ; horodates et si possible invalide les anciens souvenirs contradictoires plutôt que de les laisser coexister.
- **Privacy by design** : chaque souvenir doit être associé à un user_id ; n'injecte jamais la mémoire d'un utilisateur dans le contexte d'un autre.
- **Graceful degradation** : si le vector store est indisponible, l'agent doit fonctionner sans mémoire long-terme plutôt que de tomber en erreur.
- **Token budget strict** : la section mémoire du prompt ne doit jamais dépasser un pourcentage fixe (ex: 20%) de la fenêtre de contexte disponible.
