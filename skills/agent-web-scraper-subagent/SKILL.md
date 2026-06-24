---
name: agent-web-scraper-subagent
description: Construction d'un sous-agent spécialisé dans la collecte de données web pour un agent parent. Crawling, extraction, parsing et retour structuré. Se déclenche avec "sous-agent web", "scraper agent", "agent qui collecte", "web extraction agent", "crawl agent", "agent browsing", "browser subagent".
---

# Web Scraper Sub-Agent

## Quand utiliser ce skill

Utiliser ce skill quand un agent parent doit déléguer la collecte de données web à un sous-agent autonome. Cas typiques :

| Cas | Outil adapté |
|---|---|
| Page statique HTML simple | `requests` + `BeautifulSoup` |
| Page JS dynamique (SPA, lazy-load) | `playwright` headless |
| Extraction de texte principal | `trafilatura` |
| Tableau HTML → DataFrame | `pandas.read_html` |
| Scraping à grande échelle | `scrapy` + middlewares |
| Browser automation avec MCP | `playwright-mcp` |

**Ne pas utiliser ce skill pour** : APIs REST publiques (utiliser `requests` direct), données disponibles via export officiel (CSV, JSON), ou sites protégés par authentication que l'on ne détient pas.

## Workflow en étapes

### Étape 1 — Valider l'input avant toute requête réseau

```python
REQUIRED_FIELDS = {"url"}
DEFAULTS = {"max_pages": 1, "timeout": 30, "output_format": "json",
            "cache_ttl": 3600, "follow_pagination": False, "proxy": None}

def validate_input(params: dict) -> dict:
    missing = REQUIRED_FIELDS - params.keys()
    if missing:
        raise ValueError(f"Champs obligatoires manquants : {missing}")
    return {**DEFAULTS, **params}
```

Vérifier aussi que l'URL est bien formée (`urllib.parse.urlparse`) et que le schéma est `http` ou `https`.

### Étape 2 — Choisir le moteur de rendu

```python
# Décision : site statique ou dynamique ?
import requests
from bs4 import BeautifulSoup

r = requests.get(url, timeout=10)
soup = BeautifulSoup(r.text, "lxml")

# Si les sélecteurs retournent vide → site JS → basculer sur Playwright
if not soup.select(selectors["target_field"]):
    use_playwright = True
```

Playwright en mode headless Chromium est le choix par défaut pour les sites dynamiques en 2026. Puppeteer n'est pertinent que si le reste de la stack est Node.js.

### Étape 3 — Initialiser le navigateur (Playwright)

```python
from playwright.sync_api import sync_playwright

def get_page_content(url: str, timeout: int, proxy: str | None) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            proxy={"server": proxy} if proxy else None,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
        )
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=timeout * 1000)
        content = page.content()
        browser.close()
    return content
```

### Étape 4 — Extraire les données

```python
from bs4 import BeautifulSoup

def extract(html: str, selectors: dict, source_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    # Extraction JSON-LD (structured data) en priorité
    import json
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            return [json.loads(tag.string)]
        except Exception:
            pass

    # Fallback : sélecteurs CSS définis par l'appelant
    rows = []
    containers = soup.select(selectors.get("container", "body"))
    for el in containers:
        row = {"_source_url": source_url}
        for field, selector in selectors.items():
            if field == "container":
                continue
            found = el.select_one(selector)
            row[field] = found.get_text(strip=True) if found else None
        rows.append(row)
    return rows
```

Pour extraction de texte libre (articles, documentation) : `trafilatura.fetch_url` + `trafilatura.extract` retourne directement le contenu principal nettoyé.

### Étape 5 — Gérer la pagination

```python
import re, time, random

def iter_pages(start_url: str, max_pages: int, follow: bool):
    url = start_url
    for page_num in range(max_pages):
        yield url, page_num + 1
        if not follow:
            break
        # Stratégie 1 : paramètre ?page=N dans l'URL
        next_url = re.sub(r"([?&]page=)\d+", lambda m: m.group(1) + str(page_num + 2), url)
        if next_url == url:
            break  # Pas de paramètre page → fin
        url = next_url
        time.sleep(random.uniform(1.5, 3.5))  # Délai poli
```

Pour les boutons "page suivante" dynamiques, utiliser `page.locator("a[aria-label='Next']").click()` dans Playwright puis attendre `networkidle`.

### Étape 6 — Respecter robots.txt et les limites

```python
from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse

def can_fetch(url: str, user_agent: str = "*") -> bool:
    parsed = urlparse(url)
    rp = RobotFileParser()
    rp.set_url(f"{parsed.scheme}://{parsed.netloc}/robots.txt")
    try:
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception:
        return True  # En cas d'erreur réseau, ne pas bloquer
```

Appeler `can_fetch` **avant** la première requête. Si `False`, retourner immédiatement `status: "failed"` avec message explicite.

### Étape 7 — Error handling et retry

```python
import time

def fetch_with_retry(fetch_fn, url: str, max_retries: int = 3) -> str | None:
    delay = 1
    for attempt in range(max_retries):
        try:
            return fetch_fn(url)
        except Exception as e:
            code = getattr(e, "status", 0)
            if code == 429:
                retry_after = getattr(e, "retry_after", delay * 2)
                time.sleep(retry_after)
            elif code in (403, 404):
                break  # Inutile de retenter
            else:
                time.sleep(delay)
                delay *= 2
    return None
```

### Étape 8 — Nettoyer et scorer les données

```python
import hashlib, unicodedata

def clean_record(record: dict) -> dict:
    return {k: unicodedata.normalize("NFKC", v).strip() if isinstance(v, str) else v
            for k, v in record.items()}

def deduplicate(records: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for r in records:
        h = hashlib.md5(str(r).encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            out.append(r)
    return out

def confidence_score(records: list[dict], expected_fields: list[str]) -> float:
    if not records:
        return 0.0
    filled = sum(1 for r in records for f in expected_fields if r.get(f))
    return filled / (len(records) * len(expected_fields))
```

### Étape 9 — Retourner le résultat au parent

```python
# Schéma de retour normalisé
output = {
    "data": cleaned_records,           # list[dict]
    "status": "success",               # "success" | "partial" | "failed"
    "pages_visited": pages_visited,    # int
    "errors": error_log,               # [{"url", "code", "message", "timestamp"}]
    "confidence_score": score,         # float 0.0–1.0
    "execution_time_s": elapsed,       # float
    "cached": served_from_cache,       # bool
}
```

## Schémas d'interface

**Input :**
```python
{
  "url": str,                  # URL de départ (obligatoire)
  "selectors": {               # nom_champ → sélecteur CSS ou XPath
    "container": "article.product",
    "title": "h2.name",
    "price": "span.price"
  },
  "max_pages": int,            # défaut: 1
  "timeout": int,              # défaut: 30 (secondes)
  "output_format": str,        # "json" | "csv" | "markdown" — défaut: "json"
  "cache_ttl": int,            # défaut: 3600 (secondes)
  "follow_pagination": bool,   # défaut: False
  "proxy": str | None          # ex: "http://proxy:8080"
}
```

**Dépendances Python (`requirements.txt`) :**
```
playwright>=1.44.0
beautifulsoup4>=4.12.3
lxml>=5.2.0
trafilatura>=1.10.0
requests>=2.32.0
pandas>=2.2.0
```

Installer Playwright : `pip install playwright && playwright install chromium`

## Pièges et anti-patterns

**Attendre `load` au lieu de `networkidle`** — Sur les SPAs, `load` se déclenche avant que l'Ajax soit terminé. Utiliser `wait_until="networkidle"` ou attendre explicitement un sélecteur : `page.wait_for_selector("div.results")`.

**Hardcoder des sélecteurs fragiles** — Les sélecteurs comme `div:nth-child(3) > span` cassent à la moindre refonte. Préférer les attributs sémantiques : `[data-testid="price"]`, `[itemprop="price"]`, classes métier stables.

**Ignorer robots.txt** — Risque légal (CFAA aux États-Unis, RGPD en Europe si PII). Vérifier systématiquement.

**Pas de délai inter-requêtes** — Ban IP immédiat sur la plupart des sites. Minimum 1,5 s entre requêtes vers le même domaine.

**Lever une exception globale sur une erreur de page** — Le sous-agent doit retourner `status: "partial"` et continuer. L'agent parent décide du fallback.

**Stocker des données personnelles sans consentement** — Vérifier que les données extraites ne contiennent pas de PII (emails, téléphones, noms) si le site ne l'autorise pas explicitement.

**Lancer Playwright sans `--no-sandbox`** — Plante dans les environnements Docker sans user namespace. Toujours passer l'argument en conteneur.

## Exemple d'appel depuis un agent parent

```python
result = web_scraper_subagent.run({
    "url": "https://example.com/products?page=1",
    "selectors": {
        "container": "div.product-card",
        "title": "h2.product-title",
        "price": "span.price",
        "availability": "span.stock-status"
    },
    "max_pages": 5,
    "follow_pagination": True,
    "timeout": 45,
    "output_format": "json"
})

if result["status"] == "failed":
    parent_agent.escalate(result["errors"])
elif result["confidence_score"] < 0.7:
    parent_agent.log_warning("Extraction partielle", result)
else:
    parent_agent.process(result["data"])
```

## Bonnes pratiques 2026

- **Playwright MCP** : si l'environnement Claude Code dispose du MCP Playwright, préférer les outils `browser_navigate`, `browser_snapshot`, `browser_click` plutôt que d'instancier un script Python séparé — latence réduite, pas de dépendance externe.
- **Cache HTTP conditionnel** : utiliser `requests_cache` ou stocker `ETag`/`Last-Modified` pour éviter de re-télécharger des pages inchangées.
- **Formats prioritaires** : toujours tenter JSON-LD et microdata avant les sélecteurs CSS — plus stable, moins sensible aux refontes HTML.
- **Monitoring** : logguer systématiquement `confidence_score` par run. Un score < 0,5 sur plusieurs runs consécutifs signale une rupture de sélecteur à corriger.


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
