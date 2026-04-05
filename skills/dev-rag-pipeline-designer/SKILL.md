---
name: dev-rag-pipeline-designer
description: Conception de pipelines RAG (Retrieval-Augmented Generation). Se déclenche avec "RAG", "retrieval augmented", "vector database", "embeddings", "knowledge base", "Pinecone", "ChromaDB", "Weaviate", "chercher dans mes documents".
---

# RAG Pipeline Designer

## Workflow

1. **Analyse des données sources** — Inventorier les types de documents (PDF, DOCX, HTML, Markdown, code, CSV), le volume (< 1K docs = approche simple, > 100K = architecture distribuée), la fréquence de mise à jour (statique → batch indexing, dynamique → incremental indexing), et la structure (documents homogènes vs corpus hétérogène). Identifier les langues (impacte le choix du modèle d'embedding), les relations entre documents (références croisées, hiérarchies), et les contraintes de confidentialité (cloud vs on-premise).

2. **Pipeline d'ingestion** — Construire la chaîne de traitement : **chargement** (LangChain document loaders, LlamaIndex readers, ou custom), **parsing** (PyMuPDF pour PDF, python-docx, BeautifulSoup pour HTML), **nettoyage** (supprimer headers/footers répétitifs, normaliser les espaces, détecter la langue), **extraction de métadonnées** (titre, date, auteur, source, section, page). Stocker les métadonnées pour le filtrage ultérieur.

   ```python
   from langchain.document_loaders import PyMuPDFLoader, DirectoryLoader
   from langchain.text_splitter import RecursiveCharacterTextSplitter
   
   loader = DirectoryLoader("./docs", glob="**/*.pdf", loader_cls=PyMuPDFLoader)
   documents = loader.load()
   
   # Ajouter des métadonnées
   for doc in documents:
       doc.metadata["indexed_at"] = datetime.now().isoformat()
       doc.metadata["source_type"] = "pdf"
   ```

3. **Chunking strategy** — Choisir la stratégie selon le contenu : **Fixed size** (512-1024 tokens, overlap 10-20%, simple et efficace), **Recursive character** (divise sur `\n\n`, puis `\n`, puis `.` — recommandé par défaut), **Semantic** (divise sur les changements de sujet, plus précis mais plus lent), **Sentence-based** (chaque phrase comme chunk, pour les textes courts et précis). **Règle clé** : chunk size ≈ taille de la réponse attendue. Tester avec 3-5 tailles différentes sur votre dataset.

   ```python
   from langchain.text_splitter import RecursiveCharacterTextSplitter
   
   splitter = RecursiveCharacterTextSplitter(
       chunk_size=800,        # tokens approximatifs
       chunk_overlap=100,     # 12.5% overlap
       separators=["\n\n", "\n", ". ", "! ", "? ", " "],
       length_function=len
   )
   chunks = splitter.split_documents(documents)
   print(f"{len(documents)} docs → {len(chunks)} chunks")
   ```

4. **Embedding model selection** — **Critères** : qualité (score MTEB), coût, latence, support multilingue. **Cloud** : `text-embedding-3-large` (OpenAI, 3072 dims, meilleure qualité, $0.13/1M tokens), `text-embedding-3-small` (1536 dims, bon compromis). **Local** : `sentence-transformers/all-MiniLM-L6-v2` (384 dims, rapide), `intfloat/multilingual-e5-large` (meilleur pour le multilingue). **Cohere** : `embed-multilingual-v3.0` (excellent pour plusieurs langues). Attention : une fois le modèle choisi, changer = ré-indexer tout le corpus.

   ```python
   # OpenAI embeddings
   from langchain_openai import OpenAIEmbeddings
   embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
   
   # Local avec sentence-transformers
   from langchain_community.embeddings import HuggingFaceEmbeddings
   embeddings = HuggingFaceEmbeddings(
       model_name="intfloat/multilingual-e5-large",
       model_kwargs={"device": "cuda"}  # ou "cpu"
   )
   ```

5. **Vector store setup** — Choisir selon la taille et l'infrastructure : **FAISS** (local, in-memory ou fichier, idéal < 1M vecteurs, aucune infra), **ChromaDB** (local ou self-hosted, simple, bonne DX), **Qdrant** (self-hosted ou cloud, haute performance, filtrage avancé), **Pinecone** (SaaS, scalable, $70/mois pour 1M vecteurs), **pgvector** (PostgreSQL extension, idéal si vous avez déjà Postgres). Indexer par batch de 500-1000 documents pour éviter les timeouts.

   ```python
   # ChromaDB
   from langchain_chroma import Chroma
   vectorstore = Chroma.from_documents(chunks, embeddings,
                                       persist_directory="./chroma_db")
   
   # Pinecone
   from langchain_pinecone import PineconeVectorStore
   vectorstore = PineconeVectorStore.from_documents(
       chunks, embeddings, index_name="my-index"
   )
   
   # pgvector
   from langchain_postgres import PGVector
   vectorstore = PGVector(embeddings=embeddings, connection=DATABASE_URL)
   ```

6. **Retrieval optimization** — **Dense retrieval** seul est rarement optimal. Implémenter la **hybrid search** : combiner BM25 (keyword, précis sur les termes exacts) et dense vector search (sémantique), fusionner avec Reciprocal Rank Fusion (RRF). **Re-ranking** : après retrieval initial (top 20), re-ranker avec `cross-encoder/ms-marco-MiniLM-L-6-v2` ou Cohere Rerank pour obtenir les 3-5 meilleurs. **MMR (Maximal Marginal Relevance)** : réduire la redondance dans les résultats. **Metadata filtering** : pré-filtrer par date, source, catégorie avant la recherche vectorielle.

   ```python
   from langchain.retrievers import EnsembleRetriever, BM25Retriever
   from langchain.retrievers import ContextualCompressionRetriever
   from langchain.retrievers.document_compressors import CrossEncoderReranker
   
   bm25 = BM25Retriever.from_documents(chunks, k=10)
   dense = vectorstore.as_retriever(search_kwargs={"k": 10})
   ensemble = EnsembleRetriever(retrievers=[bm25, dense], weights=[0.4, 0.6])
   
   reranker = CrossEncoderReranker(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2", top_n=4)
   retriever = ContextualCompressionRetriever(base_compressor=reranker, base_retriever=ensemble)
   ```

7. **Generation avec context** — Construire un prompt template qui injecte les documents récupérés avec leurs métadonnées (source, page). Inclure une instruction anti-hallucination explicite : `"Si la réponse n'est pas dans les documents fournis, dis-le clairement"`. Implémenter la **citation** : demander au modèle de référencer les sources utilisées. Limiter le contexte injecté à 4-8 chunks (qualité > quantité).

   ```python
   RAG_PROMPT = """Tu es un assistant expert. Réponds à la question en te basant UNIQUEMENT
   sur les documents fournis. Si l'information n'est pas dans les documents, réponds:
   "Je n'ai pas trouvé cette information dans la base de connaissances."
   
   Documents:
   {context}
   
   Question: {question}
   
   Réponse (cite les sources entre [brackets]):"""
   
   from langchain_core.prompts import ChatPromptTemplate
   prompt = ChatPromptTemplate.from_template(RAG_PROMPT)
   chain = {"context": retriever, "question": RunnablePassthrough()} | prompt | llm
   ```

8. **Évaluation** — Mesurer 4 métriques clés avec **RAGAS** : **Faithfulness** (la réponse est-elle fidèle aux documents ? — détecte les hallucinations), **Answer Relevancy** (la réponse répond-elle à la question ?), **Context Precision** (les documents récupérés sont-ils pertinents ?), **Context Recall** (tous les documents nécessaires ont-ils été récupérés ?). Créer un dataset de 50-100 questions/réponses attendues manuellement validées. Tester différentes configs de chunking, retrieval et re-ranking pour optimiser.

   ```python
   from ragas import evaluate
   from ragas.metrics import faithfulness, answer_relevancy, context_precision
   from datasets import Dataset
   
   test_data = Dataset.from_dict({
       "question": questions, "answer": answers,
       "contexts": contexts, "ground_truth": ground_truths
   })
   results = evaluate(test_data, metrics=[faithfulness, answer_relevancy, context_precision])
   print(results.to_pandas())
   ```

## Règles

- **La qualité du chunking est primordiale** : un mauvais découpage détruit la pertinence du retrieval — tester au moins 3 stratégies (fixed, recursive, semantic) sur votre corpus avant de choisir. Visualiser les chunks manuellement.
- **Toujours utiliser le re-ranking** : la recherche vectorielle seule retourne les documents "proches" mais pas forcément les meilleurs — un cross-encoder de re-ranking améliore la précision de 20-40%.
- **Stocker les métadonnées dès l'ingestion** : source, date, auteur, section — indispensable pour le filtrage et la citation. Difficile à ajouter après coup.
- **Évaluer avant d'optimiser** : sans dataset d'évaluation, toute "amélioration" est anecdotique. Construire le dataset en priorité, puis itérer sur les métriques RAGAS.
- **Prévoir la mise à jour incrémentale** : les documents évoluent — implémenter un pipeline de détection de changements et de ré-indexation partielle dès le début.


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
