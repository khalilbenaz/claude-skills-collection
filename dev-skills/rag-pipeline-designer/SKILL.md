---
name: rag-pipeline-designer
description: Conception de pipelines RAG (Retrieval-Augmented Generation) — architecture, chunking, embeddings, vector stores, retrieval hybride, re-ranking, évaluation RAGAS. Se déclenche avec "RAG", "retrieval augmented", "vector database", "embeddings", "knowledge base", "Pinecone", "ChromaDB", "Weaviate", "chercher dans mes documents". Also triggers on "RAG pipeline", "chunking and embeddings", "vector search retrieval".
---

# RAG Pipeline Designer

## Workflow

### 1. Analyse des données sources

Avant toute ligne de code, inventorier :

| Critère | Impact |
|---|---|
| Volume (< 10K / < 1M / > 1M docs) | FAISS local → Qdrant → architecture distribuée |
| Fréquence de mise à jour | Batch indexing statique vs incremental avec détection de changements |
| Langues | Modèle d'embedding multilingue obligatoire si > 1 langue |
| Structure | Homogène (1 splitter) vs hétérogène (splitters par type) |
| Confidentialité | Cloud embeddings ou modèle local (Ollama / llama.cpp) |

Identifier les relations inter-documents (références croisées, hiérarchies) : elles orientent vers un RAG **Graph** ou une stratégie **parent-child chunking**.

---

### 2. Pipeline d'ingestion

Chaîne : **chargement → parsing → nettoyage → enrichissement métadonnées → stockage brut**

```python
from langchain_community.document_loaders import PyMuPDFLoader, DirectoryLoader
from datetime import datetime

loader = DirectoryLoader("./docs", glob="**/*.pdf", loader_cls=PyMuPDFLoader)
documents = loader.load()

for doc in documents:
    doc.metadata.update({
        "indexed_at": datetime.now().isoformat(),
        "source_type": "pdf",
        # ajouter : title, department, version, expiry_date si dispo
    })
```

Loaders recommandés par type :
- PDF → `PyMuPDFLoader` (rapide, conserve layout) ou `PDFPlumberLoader` (tableaux)
- DOCX → `Docx2txtLoader`
- HTML/Web → `RecursiveUrlLoader` + `Html2TextTransformer`
- Code → `GenericLoader` + `LanguageParser` (LangChain)
- CSV/XLSX → chunker personnalisé par ligne ou par groupe de lignes

---

### 3. Chunking strategy

**Règle de base** : chunk size ≈ taille de la réponse attendue. Toujours tester ≥ 3 tailles.

| Stratégie | Quand l'utiliser | chunk_size conseillé |
|---|---|---|
| `RecursiveCharacterTextSplitter` | Défaut universel | 600–1000 tokens, overlap 10–15% |
| `MarkdownHeaderTextSplitter` | Markdown structuré | Par section H2/H3 |
| `SemanticChunker` (LangChain) | Texte dense, sujets variés | Variable |
| Parent-child chunking | Contexte large + précision fine | Parent 2000 / enfant 300 |
| Sentence-level | FAQ, contenu court | 1–3 phrases |

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,           # ~15% overlap
    separators=["\n\n", "\n", ". ", "! ", "? ", " "],
    length_function=len,
    add_start_index=True,        # métadonnée de position dans le doc
)
chunks = splitter.split_documents(documents)
print(f"{len(documents)} docs → {len(chunks)} chunks")

# Inspecter manuellement 10 chunks aléatoires avant d'indexer
import random
for c in random.sample(chunks, 10):
    print("---", c.metadata.get("source"), c.page_content[:200])
```

---

### 4. Embedding model selection

Une fois choisi, changer = ré-indexer tout le corpus. Bien choisir dès le départ.

| Modèle | Dims | Cas d'usage | Coût |
|---|---|---|---|
| `text-embedding-3-small` (OpenAI) | 1536 | Bon compromis qualité/prix | $0.02/1M tokens |
| `text-embedding-3-large` (OpenAI) | 3072 | Meilleure qualité en | $0.13/1M tokens |
| `intfloat/multilingual-e5-large` | 1024 | Multilingue local | Gratuit (GPU) |
| `BAAI/bge-m3` | 1024 | Multilingue, dense+sparse | Gratuit (GPU) |
| `Cohere embed-multilingual-v3.0` | 1024 | Multilingue SaaS | $0.10/1M tokens |

```python
# OpenAI
from langchain_openai import OpenAIEmbeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Local GPU/CPU
from langchain_community.embeddings import HuggingFaceEmbeddings
embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={"device": "cuda"},   # "cpu" si pas de GPU
    encode_kwargs={"normalize_embeddings": True},
)
```

---

### 5. Vector store setup

| Store | Hébergement | Volume max conseillé | Point fort |
|---|---|---|---|
| FAISS | Local / fichier | < 5M vecteurs | Zéro infra, rapide |
| ChromaDB | Local / Docker | < 10M | DX simple, filtrage OK |
| Qdrant | Docker / Cloud | 100M+ | Filtrage avancé, payload |
| pgvector | PostgreSQL | 10M+ | Si Postgres déjà en place |
| Pinecone | SaaS | Illimité | Scalabilité, serverless |
| Weaviate | Docker / Cloud | 100M+ | GraphQL, modules intégrés |

```python
# ChromaDB (dev / staging)
from langchain_chroma import Chroma
vectorstore = Chroma.from_documents(
    chunks, embeddings, persist_directory="./chroma_db"
)

# Qdrant (production self-hosted)
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
client = QdrantClient(url="http://localhost:6333")
vectorstore = QdrantVectorStore.from_documents(
    chunks, embeddings, client=client, collection_name="my_kb"
)

# pgvector (stack PostgreSQL existante)
from langchain_postgres import PGVector
vectorstore = PGVector(
    embeddings=embeddings,
    connection="postgresql+psycopg://user:pass@localhost/mydb",
    collection_name="documents",
)
```

Indexer par batch de 500–1000 chunks pour éviter les timeouts.

---

### 6. Retrieval optimization

La recherche vectorielle seule est insuffisante. Pipeline recommandé :

```
Query → [BM25 top-20] + [Dense top-20] → RRF fusion → Cross-encoder re-rank top-5 → LLM
```

```python
from langchain.retrievers import EnsembleRetriever, BM25Retriever
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import CrossEncoderReranker

# Hybrid search : BM25 + dense, pondéré
bm25 = BM25Retriever.from_documents(chunks, k=15)
dense = vectorstore.as_retriever(search_kwargs={"k": 15})
ensemble = EnsembleRetriever(
    retrievers=[bm25, dense],
    weights=[0.35, 0.65],   # ajuster selon corpus
)

# Re-ranking cross-encoder
reranker = CrossEncoderReranker(
    model_name="cross-encoder/ms-marco-MiniLM-L-6-v2",
    top_n=5,
)
retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=ensemble,
)

# Filtrage par métadonnées avant la recherche vectorielle (Qdrant/Chroma)
retriever_filtered = vectorstore.as_retriever(
    search_kwargs={"k": 10, "filter": {"department": "finance", "year": 2025}}
)
```

**Techniques avancées 2026 :**
- **HyDE (Hypothetical Document Embeddings)** : générer une réponse fictive, embedder cette réponse pour chercher les vrais documents — améliore le recall sur requêtes abstraites.
- **Multi-query retrieval** : LangChain `MultiQueryRetriever` génère 3–5 variantes de la question, fusionne les résultats.
- **Contextual retrieval** (Anthropic 2025) : enrichir chaque chunk avec un résumé de contexte généré par LLM avant indexation.

---

### 7. Generation avec contexte

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI

RAG_PROMPT = """\
Tu es un assistant expert. Réponds à la question en te basant UNIQUEMENT
sur les documents fournis ci-dessous. Si l'information n'est pas présente,
réponds : "Je n'ai pas trouvé cette information dans la base de connaissances."
Ne complète jamais avec tes connaissances générales.

Documents :
{context}

Question : {question}

Réponse (cite les sources entre [brackets]) :"""

def format_docs(docs):
    return "\n\n".join(
        f"[{d.metadata.get('source','?')} p.{d.metadata.get('page','?')}]\n{d.page_content}"
        for d in docs
    )

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
prompt = ChatPromptTemplate.from_template(RAG_PROMPT)

chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
)
response = chain.invoke("Quelle est la politique de remboursement ?")
```

Limiter à 4–6 chunks dans le contexte : au-delà, la qualité baisse (lost-in-the-middle).

---

### 8. Évaluation (RAGAS)

Construire un dataset de 50–100 paires question / réponse attendue **manuellement validé** avant d'optimiser quoi que ce soit.

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,           # hallucinations : réponse ⊂ documents ?
    answer_relevancy,       # la réponse répond-elle à la question ?
    context_precision,      # documents récupérés pertinents ?
    context_recall,         # tous les docs nécessaires récupérés ?
)
from datasets import Dataset

test_data = Dataset.from_dict({
    "question":     questions,
    "answer":       generated_answers,
    "contexts":     retrieved_contexts,   # liste de listes de strings
    "ground_truth": ground_truths,
})
results = evaluate(test_data, metrics=[faithfulness, answer_relevancy,
                                        context_precision, context_recall])
print(results.to_pandas())
# Seuils minimaux acceptables : faithfulness > 0.85, context_precision > 0.75
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| Chunks trop grands (> 1500 tokens) | Retrieval dilué, mauvaises réponses | Réduire à 600–900 + overlap |
| Chunks trop petits (< 100 tokens) | Manque de contexte dans la réponse | Monter à 400–600 + parent-child |
| Pas de re-ranking | Top-k peu pertinents malgré bon recall | Ajouter cross-encoder |
| Métadonnées non stockées | Impossible de filtrer ou citer les sources | Enrichir dès l'ingestion |
| Dense retrieval seul | Mauvais sur termes exacts (codes, noms propres) | Hybrid BM25 + dense |
| Contexte > 8 chunks | "Lost in the middle", réponse dégradée | Limiter à 5–6 chunks |
| Aucun dataset d'éval | Optimisation aveugle | RAGAS dataset en priorité |
| Modèle d'embedding changé sans ré-indexation | Scores incohérents, retrieval cassé | Toujours ré-indexer intégralement |
| Pas de stratégie d'update | Index périmé silencieusement | Détection de changements + ré-indexation incrémentale |

---

## Bonnes pratiques 2026

- **Observabilité dès le jour 1** : logger query, retrieved docs, latence et score de faithfulness par requête (LangSmith, Phoenix/Arize, ou simple CSV).
- **Cache sémantique** : GPTCache ou Redis avec recherche vectorielle — évite de re-calculer pour des questions similaires (économie 30–60% de tokens LLM).
- **Sécurité** : filtrer les chunks par rôle utilisateur via métadonnées (`user_role` dans le filtre vector store) — ne pas mélanger données sensibles sans ACL.
- **Modèles d'embedding locaux** : pour la confidentialité ou les volumes importants, `BAAI/bge-m3` rivalise avec les modèles cloud sur MTEB (score ~65 vs ~64 pour `text-embedding-3-large`).
- **Agentic RAG** : pour les questions multi-hop, utiliser un agent (LangGraph, LlamaIndex Workflows) qui décompose la question, itère sur le retrieval et synthèse — meilleur que RAG naïf sur questions complexes.
- **Structured RAG** : combiner vector search + SQL/GraphQL pour les données mixtes (texte + données tabulaires).
