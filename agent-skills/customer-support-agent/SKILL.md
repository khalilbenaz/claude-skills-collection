---
name: customer-support-agent
description: Construction d'agents de support client intelligents avec knowledge base, escalade et personnalisation. Se déclenche avec "agent support", "chatbot support", "customer support agent", "agent service client", "helpdesk agent", "FAQ bot", "support automatique", "ticket agent". Also triggers on "customer service bot".
---

# Customer Support Agent

## Quand utiliser ce skill

Conçois un agent de support client autonome qui répond aux questions fréquentes via RAG, classe les intentions, gère l'empathie conversationnelle, escalade vers un humain selon des règles explicites, et s'intègre au CRM/ticketing. Applicable à tout secteur à fort volume : SaaS, e-commerce, télécoms, fintech, services.

## Stack de référence 2026

| Couche | Options recommandées |
|--------|----------------------|
| Orchestration | LangGraph, Rasa Pro, CrewAI |
| RAG | LlamaIndex + pgvector, Weaviate, Pinecone |
| Embeddings | `text-embedding-3-small` (OpenAI), Cohere `embed-v4` |
| LLM réponse rapide | Claude Haiku 3.5 |
| LLM question complexe | Claude Sonnet 4 |
| CRM/Ticketing | Zendesk, Intercom, Freshdesk, HubSpot |
| Canaux | Chat web, Email (Sendgrid), WhatsApp Business, Slack B2B |

## Workflow en étapes

### 1. Définir l'architecture (Jour 1)

Cinq composantes obligatoires :
- **RAG** : pipeline d'indexation + query sur la knowledge base
- **State machine** : gestion de l'état de conversation (topic, turns, résolution)
- **Classifieur d'intention** : sujet + sentiment + urgence
- **Moteur d'escalade** : règles déterministes + score de confiance
- **Connecteur CRM** : lecture contexte client + écriture ticket/activité

Choix d'architecture selon le cas d'usage :

| Besoin | Architecture |
|--------|-------------|
| Chat temps réel (< 2 s) | Synchrone, streaming LLM, Haiku en front |
| Email/ticket async | Queue (Redis/SQS) + worker LLM |
| Mix canal | Gateway unifié + state partagé (Redis) |

### 2. Construire le pipeline RAG

Sources à ingérer : articles d'aide, FAQ, politiques de remboursement, notes de version, guides produit.

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter

# Chunking sémantique : 800 tokens, overlap 100
parser = SentenceSplitter(chunk_size=800, chunk_overlap=100)
documents = SimpleDirectoryReader("./knowledge_base").load_data()
index = VectorStoreIndex.from_documents(documents, transformations=[parser])
query_engine = index.as_query_engine(
    similarity_top_k=5,
    response_mode="compact"
)

def retrieve_answer(question: str) -> tuple[str, float]:
    response = query_engine.query(question)
    score = response.source_nodes[0].score if response.source_nodes else 0.0
    return str(response), score
```

Mise à jour de l'index : webhook sur chaque commit de la doc → re-indexation incrémentale, pas full rebuild.

### 3. Classification d'intention

Prompt de classification structuré (JSON forcé) :

```python
CLASSIFY_PROMPT = """
Analyse ce message client et retourne UNIQUEMENT ce JSON :
{
  "topic": "billing|bug|feature|account|shipping|legal|other",
  "sentiment": "positive|neutral|frustrated|angry",
  "urgency": "blocking|high|low",
  "response_type": "information|action|escalate"
}
Message : {message}
"""
```

Règle de routing rapide :

- `sentiment=angry` + `urgency=blocking` → escalade immédiate
- `topic=legal` ou `topic=billing` (montant > seuil) → escalade immédiate
- `response_type=information` + score RAG ≥ 0.75 → réponse autonome
- score RAG < 0.60 → admettre l'ignorance + escalade proposée

### 4. State machine de conversation

5 états séquentiels avec transitions explicites :

```
WELCOME → UNDERSTAND → RESOLVE → CONFIRM → CLOSE
                ↓ (ambiguïté)
           CLARIFY → RESOLVE
                          ↓ (non résolu × 2)
                      ESCALATE
```

Implémentation LangGraph :

```python
from langgraph.graph import StateGraph, END

builder = StateGraph(ConversationState)
builder.add_node("welcome", welcome_node)
builder.add_node("understand", understand_node)
builder.add_node("resolve", resolve_node)
builder.add_node("confirm", confirm_node)
builder.add_node("escalate", escalate_node)
builder.add_node("close", close_node)

builder.add_conditional_edges("understand", route_after_understand)
builder.add_conditional_edges("resolve", route_after_resolve)
builder.set_entry_point("welcome")
graph = builder.compile()
```

### 5. Personnalisation contextuelle via CRM

```python
def build_system_prompt(customer_id: str, company: str) -> str:
    ctx = crm.get_customer(customer_id)
    tickets = crm.get_recent_tickets(customer_id, limit=3)
    return f"""Tu es l'assistant support de {company}.
Client : {ctx['name']} — Plan : {ctx['plan']} — Inscrit depuis : {ctx['since']}
Derniers tickets : {tickets}
Adapte ton niveau de service au plan. Ne répète pas ce que le client a déjà dit."""
```

Données utiles à injecter : plan (free/premium/enterprise), historique tickets (3 derniers), produits actifs, préférences langue, SLA applicable.

### 6. Règles d'escalade (déterministes en priorité)

Escalade **immédiate** (sans LLM) :
- Sujet = `legal`, `churn_threat`, `data_privacy`
- Remboursement > seuil configuré (ex. 200 €)
- Client demande explicitement un humain
- Même problème signalé ≥ 3 fois sans résolution

Escalade **automatique** (basée sur scoring) :
- Score de confiance RAG < 0.60 après 2 tentatives
- Sentiment `angry` persistant après 2 échanges sans résolution
- Aucune réponse satisfaisante après 4 turns

```python
def should_escalate(state: ConversationState) -> bool:
    return (
        state.intent.topic in ESCALATE_TOPICS
        or state.rag_score < 0.60 and state.turns >= 2
        or state.sentiment == "angry" and state.unresolved_turns >= 2
        or state.explicit_human_request
    )
```

Handoff vers humain : envoyer résumé structuré (intention, sentiment, tentatives, contexte client, historique complet).

### 7. Intégration CRM et ticketing

```python
# Zendesk — création ticket à la clôture ou escalade
def create_ticket(conv: Conversation) -> dict:
    return zendesk.tickets.create({
        "subject": f"[Agent] {conv.intent.topic} — {conv.customer_name}",
        "comment": {"body": conv.summary()},
        "priority": "urgent" if conv.intent.urgency == "blocking" else "normal",
        "tags": [conv.intent.topic, conv.intent.sentiment, "auto-agent"],
        "custom_fields": [{"id": FIELD_AGENT_HANDLED, "value": not conv.escalated}]
    })
```

Connecteurs disponibles : Zendesk REST API v2, Intercom API v2.11, Freshdesk v2, HubSpot Conversations API.
Actions autorisées par défaut : créer/lire/MAJ ticket, logger activité CRM, envoyer email de suivi.
Actions nécessitant approbation humaine : remboursement, suppression compte, modification contrat.

### 8. Guardrails et tone of voice

System prompt à toujours inclure :

```
INTERDIT : inventer une information, promettre un délai non confirmé,
dénigrer la concurrence, divulguer des données d'autres clients,
répondre à une question hors support (politique, religion, etc.).
En cas de doute : escalade, ne pas improviser.
```

Filtre de sortie (post-LLM) : regex sur numéros de carte, mots interdits, mentions de noms d'employés internes. Logge chaque réponse filtrée pour audit.

### 9. Métriques et alertes

| Métrique | Cible | Alerte si |
|----------|-------|-----------|
| Containment rate | > 70 % | < 60 % sur 7 j |
| CSAT post-agent | > 4.0 / 5 | < 3.5 |
| First Response Time | < 10 s | > 30 s |
| Taux d'escalade | < 25 % | > 40 % |
| Faux positifs classification | < 5 % | > 10 % |

Instrumente avec OpenTelemetry : trace par conversation, span par étape (RAG query, classify, CRM call, LLM call).

## Anti-patterns et pièges

- **Confiance aveugle dans le RAG** : un score élevé ne garantit pas la pertinence si la question est ambiguë. Ajoute toujours une étape de reformulation avant la query.
- **State machine implicite** : gérer l'état dans le prompt seul (sans structure externe) mène à des incohérences sur les conversations longues. Utilise un store explicite (Redis, DB).
- **Escalade trop tardive** : ne pas escalader par peur de "gaspiller" un agent humain coûte plus cher en CSAT dégradé. Calibre les seuils sur données réelles, pas au doigt mouillé.
- **Pas de handoff structuré** : l'agent humain qui reçoit la conversation sans résumé perd du temps et redemande au client. Le résumé est obligatoire.
- **Guardrails uniquement côté prompt** : un prompt peut être contourné. Ajoute un filtre de sortie programmatique pour les données sensibles.
- **Index RAG jamais rafraîchi** : une base de connaissance obsolète de 3 mois génère des réponses erronées. Automatise la re-indexation sur chaque push docs.
- **Même modèle pour tout** : Haiku pour les questions simples et le streaming, Sonnet pour l'analyse complexe et la classification. Mixer économise 60-70 % de coût LLM.

## Checklist de mise en production

- [ ] Index RAG validé sur 50 questions de test avec score ≥ 0.75
- [ ] Classifieur testé sur 200 messages réels (precision ≥ 90 %)
- [ ] Règles d'escalade relues par l'équipe support métier
- [ ] Guardrails filtre de sortie activé et loggé
- [ ] Intégration CRM testée : lecture + écriture ticket en staging
- [ ] Métriques Prometheus/Grafana opérationnelles
- [ ] Plan de rollback : fallback vers formulaire statique si agent down
- [ ] Revue RGPD : aucune donnée client stockée dans les logs LLM bruts
