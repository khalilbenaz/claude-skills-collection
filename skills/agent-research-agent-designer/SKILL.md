---
name: agent-research-agent-designer
description: Design d'agents de recherche autonomes pour collecter, analyser et synthétiser de l'information. Se déclenche avec "research agent", "agent de recherche", "agent web", "web research agent", "deep research", "agent qui cherche", "collecte d'information automatique". Also triggers on "deep research agent", "agent that gathers sources".
---

# Research Agent Designer

## Quand utiliser ce skill

Conçois un agent de recherche autonome quand le besoin est : chercher sur le web ou un corpus documentaire, croiser des sources, extraire des données structurées et produire un rapport synthétique avec citations. Cas d'usage : veille concurrentielle, due diligence, fact-checking, recherche académique, production de contenu documenté.

---

## Critères de choix d'architecture

| Besoin | Architecture recommandée |
|---|---|
| 1 sujet, réponse rapide | Mono-agent + outils multiples |
| Sujets complexes / multi-domaines | Pipeline multi-agents (searcher → extractor → synthesizer) |
| Corpus interne (PDF, SharePoint) | RAG + search hybride (vector + keyword) |
| Fréquence élevée / coût maîtrisé | Cache Redis des résultats + deduplication URL |
| Résultat fiable avec citations | Toujours : citation tracker JSON obligatoire |

---

## Workflow en 10 étapes

### 1. Définir le scope et le budget

Avant tout code, fixe trois contraintes explicites :
- **Budget sources** : max 20-50 URLs par run
- **Budget temps** : timeout global 5-15 min (configurable)
- **Budget tokens** : max 10k tokens par source injectée dans le LLM

```python
RESEARCH_CONFIG = {
    "max_sources": 30,
    "timeout_s": 600,
    "max_tokens_per_source": 8000,
    "max_iterations": 3,
    "alert_budget_pct": 0.80,
}
```

### 2. Architecturer les quatre couches

**(a) Recherche** — search tools (Tavily, Serper, SerpAPI)
**(b) Extraction** — HTML cleaner (trafilatura), PDF (pdfplumber), JS (Playwright)
**(c) Analyse / synthèse** — LLM fort (Claude Opus / GPT-4o)
**(d) Output** — rapport structuré avec scores de confiance et citations

Choisis dès le départ LangGraph ou un simple loop Python ; LangGraph est préférable dès que le flow est conditionnel ou multi-agents.

### 3. Configurer les tools de recherche

```python
# Tavily (recommandé — retourne directement le contenu extrait)
from tavily import TavilyClient
client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
results = client.search(
    query=query,
    search_depth="advanced",   # "basic" pour économiser des tokens
    max_results=10,
    include_raw_content=False, # True si tu veux le HTML brut
)

# Serper (alternative, moindre coût)
import httpx
resp = httpx.post(
    "https://google.serper.dev/search",
    json={"q": query, "num": 10},
    headers={"X-API-KEY": os.environ["SERPER_API_KEY"]},
)
```

Wrappe **toujours** chaque appel outil dans un bloc try/except avec retry exponentiel (max 3 tentatives).

### 4. Extraction de contenu propre

```python
import trafilatura

def fetch_and_clean(url: str, max_tokens: int = 8000) -> str | None:
    downloaded = trafilatura.fetch_url(url, timeout=15)
    if not downloaded:
        return None
    text = trafilatura.extract(
        downloaded,
        include_tables=True,
        include_links=False,
        no_fallback=False,
    )
    # Tronquer pour respecter le budget tokens (approx 4 chars/token)
    return text[: max_tokens * 4] if text else None
```

Pour les pages JavaScript lourdes (SPA, dashboards), utilise Playwright :

```python
from playwright.async_api import async_playwright

async def fetch_js_page(url: str) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle", timeout=20000)
        content = await page.content()
        await browser.close()
    return content
```

Pour les PDF : `pdfplumber` (tableaux) ou `pypdf` (texte brut).

### 5. Stratégie de requêtes itératives (iterative deepening)

L'agent génère **3-5 requêtes initiales** → analyse les résultats → identifie les lacunes → génère des requêtes de suivi.

```python
QUERY_GENERATION_PROMPT = """
Sujet de recherche : {topic}
Génère 5 requêtes de recherche complémentaires couvrant différents angles.
Format : JSON list de strings.
Contraintes : pas de doublons, chaque requête < 12 mots.
"""

FOLLOWUP_QUERY_PROMPT = """
Résultats collectés jusqu'ici (résumé) : {summary}
Questions encore sans réponse : {gaps}
Génère 3 requêtes de suivi ciblées pour combler ces lacunes.
Format : JSON list de strings.
"""
```

Applique **triangulation multi-sources** : minimum 3 sources indépendantes pour tout claim important.

### 6. Scoring de fiabilité des sources

Attribue un score 0-1 à chaque source selon quatre critères :

```python
def score_source(url: str, date: str | None, content: str) -> float:
    score = 0.5  # base

    # Crédibilité domaine
    trusted_domains = ["reuters.com", "bbc.com", "nature.com", "arxiv.org"]
    low_quality = ["blogspot.com", "wordpress.com"]
    if any(d in url for d in trusted_domains): score += 0.2
    if any(d in url for d in low_quality): score -= 0.2

    # Fraîcheur (bonus si < 12 mois)
    if date and is_recent(date, months=12): score += 0.15

    # Longueur (proxy de profondeur)
    if len(content) > 2000: score += 0.1

    return min(max(score, 0.0), 1.0)
```

Filtre toute source avec score < 0.3 avant injection dans le LLM de synthèse.

### 7. Citation tracker JSON

Chaque claim factuel doit être tracé :

```python
citation_store: list[dict] = []

def add_citation(claim: str, url: str, title: str, date: str, quote: str) -> str:
    ref_id = f"[{len(citation_store) + 1}]"
    citation_store.append({
        "ref_id": ref_id,
        "claim": claim,
        "source_url": url,
        "source_title": title,
        "source_date": date,
        "verbatim_quote": quote[:300],
    })
    return ref_id  # insérer inline dans le texte généré
```

Le rapport final doit inclure une section `## Sources` avec la liste complète.

### 8. Prompt de synthèse structuré

```python
SYNTHESIS_PROMPT = """
Tu es un analyste expert. Synthétise les documents fournis sur le sujet : {topic}

Documents (avec IDs source) :
{documents}

Produis un rapport structuré :
1. Résumé exécutif (200-400 mots)
2. Findings principaux (par thème, avec citations inline [N])
3. Points de divergence entre sources
4. Niveau de confiance global : Haute / Moyenne / Basse (justifié)
5. Gaps identifiés et questions ouvertes

Règle absolue : chaque affirmation factuelle doit citer au moins une source [N].
Ne jamais inventer ou inférer des faits non présents dans les documents.
"""
```

### 9. Formatage de l'output

Propose trois niveaux selon le contexte :

| Mode | Contenu | Longueur cible |
|---|---|---|
| `brief` | Résumé exécutif + 3-5 key findings + sources | ~400 mots |
| `standard` | Rapport complet structuré + tableau comparatif | ~800-1200 mots |
| `exhaustif` | Tout le dessus + annexes par source + contradictions détaillées | 2000+ mots |

Ajoute toujours un **niveau de confiance par section** et la **liste des sources avec scores**.

### 10. Validation itérative et arrêt

Après le premier draft, l'agent identifie automatiquement les gaps :

```python
GAP_ANALYSIS_PROMPT = """
Rapport produit : {draft}
Sujet initial : {topic}

Identifie :
1. Les questions du sujet restées sans réponse
2. Les contradictions non résolues entre sources
3. Les sections avec seulement 1 source (triangulation insuffisante)

Format : JSON avec clés "unanswered", "contradictions", "weak_sections".
"""
```

Si des gaps critiques existent et que le budget le permet → nouvelle itération.
Sinon → finaliser et remettre le rapport.

---

## Garde-fous et anti-patterns

### Anti-patterns critiques

- **Hallucination de sources** : ne jamais générer une URL qui n'a pas été réellement visitée. Toujours construire le citation_store depuis les fetches réels.
- **Source unique** : présenter un fait comme établi depuis une seule source = erreur. Exige 2-3 sources concordantes.
- **Injection de contenu non filtré** : injecter des pages entières dans le LLM sans tronquer → coûts explosifs et hallucinations. Toujours tronquer à `max_tokens_per_source`.
- **Boucle infinie** : sans limite d'itérations, un agent peut looper indéfiniment. Toujours imposer `max_iterations`.
- **Confusion corrélation/causalité** : le LLM de synthèse peut inférer des liens causaux. Le prompt doit interdire explicitement toute inférence non étayée.

### Pièges courants

- **Contenu paywallé** : Tavily et Serper retournent souvent des snippets plutôt que le contenu complet — vérifie que le contenu est suffisant avant de scorer la source.
- **Pages JS-only** : `trafilatura` retourne `None` sur les SPA. Détecter et basculer sur Playwright.
- **Dates manquantes** : beaucoup de pages n'exposent pas de date. Ne pas pénaliser excessivement ; utiliser la date de fetch comme fallback.
- **Résultats redondants** : plusieurs URLs peuvent pointer vers le même contenu (syndication). Déduplique par hash du contenu extrait.

---

## Stack recommandée (2026)

| Composante | Outil privilégié | Alternative |
|---|---|---|
| Search web | Tavily | Serper, SerpAPI, Perplexity API |
| Extraction HTML | trafilatura | Firecrawl, readability-lxml |
| Pages JS | Playwright | Puppeteer (Node) |
| PDF | pdfplumber | pypdf, LlamaParse |
| Orchestration | LangGraph | CrewAI, plain Python |
| Synthèse LLM | Claude Opus 4 / GPT-4o | Gemini 1.5 Pro |
| Cache résultats | Redis + TTL 24h | SQLite local |


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
