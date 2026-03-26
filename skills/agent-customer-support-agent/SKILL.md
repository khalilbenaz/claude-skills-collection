---
name: agent-customer-support-agent
description: Construction d'agents de support client intelligents avec knowledge base, escalade et personnalisation. Se déclenche avec "agent support", "chatbot support", "customer support agent", "agent service client", "helpdesk agent", "FAQ bot", "support automatique", "ticket agent".
---

# Customer Support Agent

## Quand utiliser ce skill

Utilise ce skill pour concevoir un agent de support client capable de répondre aux questions fréquentes, consulter une base de connaissance via RAG, gérer les conversations avec empathie, escalader intelligemment vers un agent humain et s'intégrer avec un CRM pour le suivi des tickets. S'applique aux chatbots de support SaaS, e-commerce, télécoms, services financiers ou tout contexte de relation client à fort volume.

## Workflow

1. **Architecture générale** — Définis les cinq composantes : (a) moteur RAG sur la knowledge base (LLM + embeddings + vector store), (b) gestionnaire de conversation (state machine, historique), (c) moteur de classification d'intention, (d) moteur d'escalade, (e) intégration CRM/ticketing. Choisis entre architecture synchrone (chat temps réel) et asynchrone (email/ticket).

2. **Knowledge base et pipeline RAG** — Ingère et indexe toute la documentation : articles d'aide, FAQ, guides produit, politiques de remboursement, notes de version. Utilise `LlamaIndex` ou `LangChain` pour le pipeline RAG : chunking sémantique (500-1000 tokens avec overlap), embeddings (OpenAI `text-embedding-3-small` ou Cohere), vector store (Pinecone, Weaviate, pgvector). Met à jour l'index automatiquement à chaque modification de la doc.

   ```python
   from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
   documents = SimpleDirectoryReader("./knowledge_base").load_data()
   index = VectorStoreIndex.from_documents(documents)
   query_engine = index.as_query_engine(similarity_top_k=5)
   response = query_engine.query(user_question)
   ```

3. **Classification d'intention et routing** — Entraîne ou prompt un classifieur pour détecter : (a) le sujet (facturation, bug, fonctionnalité, compte, livraison…), (b) le sentiment (positif / neutre / frustré / furieux), (c) l'urgence (bloquant / important / faible), (d) le type de réponse attendu (information, action, escalade). Utilise cette classification pour router vers le bon flow de conversation.

4. **Design de la conversation** — Structure chaque interaction en 5 phases : (1) Accueil personnalisé (nom du client, contexte compte), (2) Compréhension de la demande (reformulation, questions clarifiantes si ambiguïté), (3) Résolution (réponse RAG + actions disponibles), (4) Confirmation (la réponse a-t-elle résolu le problème ?), (5) Clôture (feedback, ticket créé si nécessaire). Implémente un state machine explicite.

5. **Personnalisation contextuelle** — À chaque conversation, l'agent récupère le contexte client depuis le CRM : historique des tickets précédents, produits achetés, date d'inscription, statut (free/premium/enterprise), préférences de communication, dernières interactions. Injecte ce contexte dans le prompt système pour des réponses adaptées. Mémorise les préférences au fil des interactions.

   ```python
   customer_context = crm.get_customer(customer_id)
   system_prompt = f"""Tu es l'assistant support de {company_name}.
   Client : {customer_context['name']} (plan {customer_context['plan']})
   Historique : {customer_context['last_3_tickets']}
   Traite-le avec le niveau de service approprié à son plan."""
   ```

6. **Règles d'escalade intelligente** — Escalade vers un humain si : (a) score de confiance de la réponse RAG < 0.7, (b) sentiment détecté = furieux après 2 échanges sans résolution, (c) sujet sensible (remboursement > seuil, données personnelles, problème légal, menace de churn), (d) l'utilisateur demande explicitement un humain, (e) même problème signalé > 3 fois. Transmets un résumé structuré à l'agent humain : historique, intention, tentatives de résolution.

7. **Support multi-canal** — L'agent opère sur plusieurs canaux avec une cohérence totale : chat web (widget), email (via Sendgrid/Mailgun), Slack (pour le support B2B), API REST (pour intégrations tierces), WhatsApp Business. Partage le même état de conversation et le même historique cross-canal via un identifiant client unique. Adapte le format de la réponse au canal (markdown pour chat, HTML pour email).

8. **Intégration CRM et ticketing** — Connecte-toi à Zendesk, Intercom, Freshdesk, HubSpot ou Salesforce via leurs APIs REST. Actions disponibles : créer/mettre à jour un ticket, associer une conversation à un contact, logger une activité, mettre à jour le statut d'un ordre, déclencher un remboursement (avec approbation humaine). Documente chaque action avec un audit trail.

   ```python
   # Création d'un ticket Zendesk
   ticket = zendesk.tickets.create({
       "subject": f"[Agent] {intent} - {customer_name}",
       "comment": {"body": conversation_summary},
       "priority": urgency_level,
       "tags": [intent_tag, sentiment_tag]
   })
   ```

9. **Tone of voice et brand guardrails** — Le system prompt définit la personnalité de l'agent : ton (formel / conversationnel / chaleureux), vocabulaire spécifique à éviter ou à utiliser, règles de communication (ne jamais promettre ce qu'on ne peut pas tenir, ne jamais dénigrer la concurrence, toujours s'excuser pour les bugs). Implémente des guardrails avec un LLM de vérification ou des règles regex pour filtrer les réponses hors charte.

10. **Métriques clés de succès** — Instrumente l'agent pour mesurer en continu : taux de résolution autonome (containment rate, cible > 70%), CSAT (score de satisfaction post-résolution), First Response Time (FRT), Average Handle Time (AHT), taux d'escalade vers humain, taux de faux positifs de la classification d'intention. Alerte si une métrique dégrade de > 10% sur 7 jours.

## Règles

- **L'empathie avant la solution** : le premier message après une plainte doit toujours reconnaître le problème et s'excuser si nécessaire, avant de proposer une solution. Un agent froid qui cite directement la documentation sans empathie génère de la frustration.
- **Ne jamais inventer une réponse** : si la knowledge base ne contient pas la réponse avec suffisamment de confiance, l'agent doit l'admettre et proposer l'escalade vers un humain plutôt que de fournir une information incorrecte.
- **Escalade rapide sur les sujets sensibles** : rembourser, traiter des données personnelles, des litiges légaux ou des menaces de résiliation ne doit jamais être géré seul par l'agent. Escalade immédiate obligatoire sur ces topics.
- **Cohérence cross-canal** : l'historique de conversation doit être partagé entre tous les canaux. Un client qui a déjà expliqué son problème par email ne doit jamais avoir à tout répéter sur le chat.
- **Frameworks recommandés** : [Rasa](https://rasa.com/) pour les flows structurés, [LangGraph](https://langchain-ai.github.io/langgraph/) pour les agents complexes, [Voiceflow](https://www.voiceflow.com/) pour le design no-code, [Zendesk Sunshine](https://www.zendesk.fr/) pour l'intégration CRM. Modèles conseillés : Claude Haiku (réponses rapides) + Claude Sonnet (questions complexes).
