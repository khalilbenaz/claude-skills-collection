---
name: context-manager
description: Gestion avancée du contexte pour agents IA — fenêtre de contexte, compression, RAG dynamique, sliding window, prompt caching. Se déclenche avec "context window", "contexte agent", "token limit", "context management", "context overflow", "trop de contexte", "agent context", "context stuffing", "context compression".
---

# Agent Context Manager

## Quand utiliser ce skill

- L'agent retourne `context_length_exceeded` ou une erreur 413/400 équivalente
- Les coûts de tokens dépassent le budget prévu
- Tu conçois un agent avec sessions multi-tours longues ou documents volumineux
- Tu dois implémenter une mémoire persistante entre sessions

---

## Fenêtres de contexte de référence (2026)

| Modèle | Fenêtre | Prompt cache natif |
|---|---|---|
| Claude 3.7 Sonnet | 200 k tokens | Oui (Anthropic API) |
| GPT-4o | 128 k tokens | Oui (OpenAI API) |
| Gemini 2.0 Flash | 1 M tokens | Oui (Google AI) |
| Llama 3.3 70B | 128 k tokens | Non (self-hosted) |

---

## Workflow en 10 étapes

### 1. Cartographier le budget par couche

Avant tout code, décompose la fenêtre en couches fixes et dynamiques :

```
Fenêtre totale = 200 000 tokens
├── System prompt (fixe)          ~  2 000  (1 %)
├── Descriptions d'outils (fixe)  ~  3 000  (1.5 %)
├── Mémoire long terme            ~  5 000  (2.5 %)
├── Contexte RAG injecté          ~ 20 000  (10 %)
├── Historique conversation       ~ 40 000  (20 %)
├── Réponse réservée              ~ 10 000  (5 %)
└── Marge sécurité (10 %)        ~ 20 000
```

Définis deux seuils : **alerte 80 %** (log warning), **action 90 %** (compression obligatoire).

### 2. Compter les tokens précisément

```python
# OpenAI / tiktoken
import tiktoken
enc = tiktoken.encoding_for_model("gpt-4o")
n_tokens = len(enc.encode(text))

# Anthropic SDK
import anthropic
client = anthropic.Anthropic()
response = client.messages.count_tokens(
    model="claude-sonnet-4-5",
    system=system_prompt,
    messages=messages,
)
print(response.input_tokens)  # total exact avant envoi
```

Appelle le comptage **avant** chaque appel API, pas après. C'est le seul moyen de gérer proactivement.

### 3. Choisir la stratégie de contexte

| Situation | Stratégie recommandée |
|---|---|
| Conversation courte, budget abondant | **Verbatim** — rien à faire |
| Historique long mais requêtes récentes dominantes | **Sliding window** |
| Documents volumineux, requête ponctuelle | **RAG dynamique** |
| Sessions très longues (agent autonome multi-jours) | **Résumé progressif + LTM externe** |
| Coût critique (prod haute volumétrie) | **Prompt caching + compression agressive** |

### 4. Sliding window sur l'historique

Conserve les N derniers échanges verbatim, résume le reste via un modèle léger :

```python
WINDOW_VERBATIM = 10  # derniers échanges complets

def build_history(messages: list[dict], max_tokens: int) -> list[dict]:
    recent = messages[-WINDOW_VERBATIM:]
    older  = messages[:-WINDOW_VERBATIM]
    if not older:
        return recent

    summary = summarize_with_cheap_model(older)  # gpt-4o-mini, claude-haiku
    summary_msg = {
        "role": "system",
        "content": f"[RÉSUMÉ DES ÉCHANGES PRÉCÉDENTS]\n{summary}"
    }
    return [summary_msg] + recent
```

Format du résumé attendu du modèle léger :
```
- Décisions prises : ...
- Faits établis : ...
- Contexte utilisateur : ...
- Tâches en cours : ...
```

### 5. RAG dynamique — injection à la demande

Ne pas injecter tous les documents au départ. Injecter uniquement ce dont la requête a besoin :

```python
def inject_rag_context(query: str, vector_store, top_k=5, min_score=0.75):
    results = vector_store.similarity_search_with_score(query, k=top_k)
    relevant = [doc for doc, score in results if score >= min_score]

    if not relevant:
        return ""

    chunks = "\n\n---\n\n".join(doc.page_content for doc in relevant)
    return f"[CONTEXTE DOCUMENTAIRE PERTINENT]\n{chunks}"
```

Utilise un **reranker** (Cohere Rerank, cross-encoder `ms-marco-MiniLM`) après le retrieval vectoriel pour améliorer la précision sans augmenter le top_k.

### 6. Compression de l'historique par LLM léger

Quand le seuil d'action (90 %) est atteint :

```python
COMPRESSION_PROMPT = """
Tu reçois un historique de conversation entre un agent IA et un utilisateur.
Résume-le en conservant UNIQUEMENT :
1. Les décisions prises et leur justification
2. Les contraintes et préférences exprimées par l'utilisateur
3. L'état courant de la tâche principale
4. Les informations factuelles établies (dates, noms, valeurs numériques)

Sois concis. Élimine les reformulations, hésitations et confirmations de politesse.
"""

def compress_history(history: list[dict]) -> str:
    response = cheap_llm.invoke(COMPRESSION_PROMPT + format_history(history))
    return response.content
```

Mesure le **taux de rétention** : vérifie que les 5 dernières décisions critiques sont dans le résumé avant de supprimer l'original.

### 7. Assemblage final du contexte

Ordre optimal d'injection dans le prompt :

```
[SYSTEM PROMPT]
  → Instructions système permanentes

[MÉMOIRE LONG TERME]
  → Faits persistants sur l'utilisateur/projet

[CONTEXTE RAG]
  → Chunks documentaires pertinents à la requête

[RÉSUMÉ HISTORIQUE]
  → Résumé des échanges anciens (si sliding window active)

[HISTORIQUE RÉCENT]
  → N derniers échanges verbatim

[REQUÊTE COURANTE]
  → Message utilisateur actuel
```

Utilise des délimiteurs XML explicites (`<memory>`, `<context>`, `<history>`) pour améliorer la compréhension par le modèle et faciliter le debug.

### 8. Prompt caching — activer systématiquement

```python
# Anthropic — cache_control sur les blocs stables
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": long_stable_document,
                "cache_control": {"type": "ephemeral"}  # TTL 5 min
            },
            {"type": "text", "text": user_query}
        ]
    }
]

# OpenAI — automatique sur les 1024 premiers tokens identiques
# Pas de configuration requise, vérifier via usage.prompt_tokens_details.cached_tokens
```

Le prompt caching est **rentable dès 2 appels** avec le même préfixe. Priorité : system prompt, descriptions d'outils, documents de référence.

### 9. Dégradation gracieuse en cas de débordement

```python
class ContextOverflowHandler:
    def handle(self, context: dict, budget: int) -> dict:
        current = count_tokens(context)

        if current <= budget * 0.8:
            return context  # OK, rien à faire

        if current <= budget * 0.9:
            # Alerte seulement
            log.warning(f"Context at {current/budget:.0%} — approaching limit")
            return context

        # Action : compression par niveaux
        for strategy in [self.compress_rag, self.compress_history, self.truncate_oldest]:
            context = strategy(context)
            if count_tokens(context) <= budget * 0.85:
                log.info(f"Context compressed via {strategy.__name__}")
                return context

        # Dernier recours : notifier l'utilisateur
        context["overflow_notice"] = (
            "Note : le contexte a été condensé pour respecter les limites du modèle. "
            "Certains détails anciens peuvent ne plus être accessibles."
        )
        return context
```

### 10. Monitoring et métriques

Expose ces métriques en production :

```python
metrics = {
    "tokens_used_total": current_tokens,
    "tokens_by_layer": {
        "system": system_tokens,
        "tools": tool_tokens,
        "ltm": ltm_tokens,
        "rag": rag_tokens,
        "history": history_tokens,
    },
    "context_utilization_pct": current_tokens / max_tokens * 100,
    "compression_events": compression_count,
    "cache_hit_rate": cached_tokens / total_tokens,
    "estimated_cost_usd": estimate_cost(current_tokens, model),
}
```

---

## Anti-patterns à éviter

| Anti-pattern | Impact | Correction |
|---|---|---|
| Injecter tous les documents au départ | Coût x10, contexte dilué | RAG dynamique top-k |
| Tronquer brutalement à droite | Perte de contexte récent | Sliding window avec résumé |
| Résumer sans valider la rétention | Perte d'informations critiques | Checklist post-compression |
| Ignorer le prompt caching | Coût inutile sur préfixes stables | Activer sur tout contenu invariant |
| Simuler une mémoire parfaite | Réponses incohérentes | Informer l'utilisateur de la compression |
| Compter les tokens après l'appel API | Erreurs non gérées | Compter avant, agir proactivement |
| Un seul seuil (overflow = erreur) | Dégradation brutale | Niveaux : alerte 80 %, action 90 %, urgence 95 % |

---

## Garde-fous

- **Informations critiques non-compressibles** : marque explicitement les segments interdits à la compression (contraintes de sécurité, instructions système, données PII déclarées). Vérifie leur présence après chaque compression.
- **Tests de near-overflow obligatoires** : simule des conversations de 50+ tours en CI/CD. Les bugs de contexte n'apparaissent qu'à la limite, jamais en dev.
- **Recalibrer au changement de modèle** : les coûts par token, la fenêtre disponible et la qualité de la compression changent à chaque migration de modèle. Rejoue les benchmarks.
- **Ne jamais faire confiance au comptage approximatif** : les estimations "1 token ≈ 4 caractères" sont fausses sur du code, des langues non-latines ou du JSON. Utilise toujours `tiktoken` ou l'API de comptage native.
