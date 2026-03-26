---
name: agent-research-agent-designer
description: Design d'agents de recherche autonomes pour collecter, analyser et synthétiser de l'information. Se déclenche avec "research agent", "agent de recherche", "agent web", "web research agent", "deep research", "agent qui cherche", "collecte d'information automatique".
---

# Research Agent Designer

## Quand utiliser ce skill

Utilise ce skill pour concevoir un agent capable de mener des recherches autonomes sur le web ou dans des corpus documentaires : interroger des moteurs de recherche, lire des articles, extraire des données structurées, croiser des sources et produire un rapport synthétique. S'applique aux cas d'usage de veille concurrentielle, due diligence, fact-checking, recherche académique ou production de contenu documenté.

## Workflow

1. **Architecture générale** — Définis les quatre composantes : (a) couche de recherche (search tools, web fetcher), (b) couche d'extraction et parsing (HTML, PDF, tableaux), (c) couche d'analyse et synthèse (LLM fort), (d) couche de formatage output. Choisis entre architecture mono-agent avec outils multiples ou pipeline multi-agents (searcher → extractor → synthesizer).

2. **Tools de recherche** — Intègre les APIs indispensables : Serper/SerpAPI pour Google Search, Tavily pour la recherche web structurée, fetcher d'URL (`requests` + `newspaper3k`), lecteur PDF (`pypdf2`, `pdfplumber`), Wikipedia API, Semantic Scholar pour la recherche académique. Wrappe chaque tool avec gestion d'erreur et retry.

   ```python
   from tavily import TavilyClient
   client = TavilyClient(api_key="...")
   results = client.search(query="...", search_depth="advanced", max_results=10)
   ```

3. **Stratégie de recherche itérative** — Implémente un mécanisme de query generation : l'agent génère d'abord 3-5 requêtes initiales, analyse les résultats, identifie les lacunes, génère des requêtes de suivi plus précises (iterative deepening). Applique la triangulation multi-sources : minimum 3 sources indépendantes par claim important.

4. **Scraping et extraction de contenu** — Extrait le contenu textuel proprement : utilise `trafilatura` ou `readability-lxml` pour nettoyer le HTML, `camelot` pour les tableaux PDF, `BeautifulSoup` pour les données structurées. Gère les pages JavaScript avec Playwright si nécessaire. Limite la taille du contenu extrait (max 10k tokens par source).

   ```python
   import trafilatura
   downloaded = trafilatura.fetch_url(url)
   text = trafilatura.extract(downloaded, include_tables=True, include_links=False)
   ```

5. **Évaluation des sources** — Implémente un système de scoring : (a) crédibilité du domaine (whitelists/blacklists, Alexa rank), (b) fraîcheur de la date de publication, (c) détection de biais (opinion vs. fact), (d) cross-référencement (la même info apparaît-elle dans d'autres sources fiables ?). Attribue un score de confiance 0-1 à chaque source.

6. **Synthèse et analyse** — À partir des documents extraits, l'agent effectue : extraction des thèmes principaux, comparaison des positions entre sources, détection des contradictions, résumé hiérarchique (executive summary + détails). Utilise un LLM avec un prompt structuré qui liste explicitement les sources utilisées.

7. **Citation et attribution rigoureuse** — Chaque affirmation dans le rapport final doit être liée à sa source originale. Implémente un tracker de citations en JSON : `{"claim": "...", "source_url": "...", "source_date": "...", "quote": "..."}`. Formate les références en APA, Chicago ou Markdown selon le besoin.

   ```python
   citation_store = []
   citation_store.append({
       "claim": claim_text,
       "source_url": url,
       "source_title": title,
       "source_date": date,
       "verbatim_quote": quote
   })
   ```

8. **Formatage de l'output** — Génère un rapport structuré avec : (a) résumé exécutif (200-400 mots), (b) findings détaillés par thème, (c) tableau comparatif si pertinent, (d) niveau de confiance global et par section, (e) liste des sources avec scores. Propose plusieurs niveaux de détail selon le contexte (brief / standard / exhaustif).

9. **Raffinement itératif** — Après le premier draft, l'agent identifie automatiquement les gaps : questions sans réponse, contradictions non résolues, sujets insuffisamment couverts. Génère une liste de follow-up queries et propose d'approfondir les sections faibles. Implémente un mécanisme de validation humaine avant chaque nouvelle itération coûteuse.

10. **Guardrails et limites** — Applique des contraintes strictes : max 20-50 sources par recherche, budget temps (timeout global de 5-15 min), profondeur maximale (max 3 niveaux d'itération), restrictions de domaines si nécessaire. Log toutes les URLs visitées. Filtre le contenu inappropriate ou non pertinent avant injection dans le LLM.

## Règles

- **Citer systématiquement** : aucune affirmation factuelle sans source. Le rapport final doit permettre à un humain de vérifier chaque claim en cliquant sur un lien.
- **Triangulation obligatoire** : ne jamais présenter un fait comme établi s'il ne provient que d'une seule source. Exige minimum 2-3 sources concordantes pour les claims importants.
- **Transparence sur la confiance** : inclure toujours un indicateur de confiance (haute / moyenne / basse) par section, basé sur la qualité et la concordance des sources trouvées.
- **Limites de budget** : tout agent de recherche doit avoir un budget explicite (nombre de sources, temps, tokens) pour éviter les coûts incontrôlés. Implémente des alertes à 80% du budget consommé.
- **Frameworks recommandés** : [Tavily](https://tavily.com/) pour la recherche, [LangGraph](https://langchain-ai.github.io/langgraph/) pour l'orchestration, [Firecrawl](https://firecrawl.dev/) pour l'extraction, [Perplexity API](https://docs.perplexity.ai/) comme alternative tout-en-un. Utilise GPT-4o ou Claude Opus pour la synthèse finale.
