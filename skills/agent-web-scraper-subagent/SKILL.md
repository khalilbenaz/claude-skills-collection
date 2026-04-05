---
name: agent-web-scraper-subagent
description: Construction d'un sous-agent spécialisé dans la collecte de données web pour un agent parent. Crawling, extraction, parsing et retour structuré. Se déclenche avec "sous-agent web", "scraper agent", "agent qui collecte", "web extraction agent", "crawl agent", "agent browsing", "browser subagent".
---

# Web Scraper Sub-Agent

## Quand utiliser ce skill

Utiliser ce skill lorsqu'un agent parent doit déléguer la collecte de données web à un sous-agent autonome et réutilisable. Idéal pour les tâches de surveillance de pages, d'extraction de catalogues produits, de collecte de données structurées depuis des sites dynamiques ou statiques, ou lorsque plusieurs sources web doivent être interrogées en parallèle.

## Workflow

1. **Interface du sous-agent** — Recevoir depuis l'agent parent : `url` (URL de départ), `selectors` (schéma d'extraction CSS/XPath), `max_pages` (limite de pagination), `timeout` (délai maximum en secondes) et `output_format` (json/csv/markdown). Valider tous les champs avant de commencer.

2. **Browser automation setup** — Initialiser le moteur headless approprié selon l'environnement : Playwright (recommandé, supporte Chromium/Firefox/WebKit), Puppeteer (Node.js), ou Selenium avec ChromeDriver. Configurer le profil du navigateur (résolution, langue, timezone) pour paraître naturel.

3. **Page navigation** — Naviguer vers l'URL cible, attendre le rendu complet (`networkidle`, `domcontentloaded`). Gérer la pagination automatique (bouton "suivant", paramètres d'URL `?page=N`, curseurs, scroll infini via injection JS `window.scrollTo`). Limiter la profondeur selon `max_pages`.

4. **Data extraction** — Appliquer les sélecteurs CSS ou XPath définis dans `selectors`. Utiliser `readability.js` ou `trafilatura` pour l'extraction de texte principal. Extraire les tableaux (`pandas.read_html`), les données structurées (JSON-LD, microdata, Open Graph), et les attributs d'éléments (`href`, `src`, `data-*`).

5. **Anti-detection** — Faire pivoter les User-Agent (liste de navigateurs réels). Injecter des délais aléatoires entre requêtes (1–5 secondes). Masquer les propriétés `navigator.webdriver`. Utiliser des proxies rotatifs si nécessaire. Désactiver les en-têtes révélateurs (`headless`, `automation`).

6. **Error handling** — Intercepter les codes HTTP d'erreur (403, 404, 429, 503). Détecter les CAPTCHAs (présence de reCAPTCHA, hCaptcha) et signaler au parent. Implémenter un retry avec backoff exponentiel (1s, 2s, 4s, max 3 tentatives). Logger chaque erreur avec URL, code, timestamp et contexte.

7. **Output structuring** — Nettoyer les données extraites (strip whitespace, normaliser encodage UTF-8). Dédupliquer les enregistrements via hash de contenu. Valider la conformité au schéma JSON attendu. Enrichir si besoin (timestamps d'extraction, URL source, numéro de page).

8. **Caching** — Maintenir un cache local (SQLite ou fichier JSON) des pages déjà visitées avec TTL configurable. Vérifier le cache avant toute requête réseau. Supporter le rafraîchissement conditionnel via `If-Modified-Since` ou `ETag`. Éviter les re-crawls inutiles en session courante.

9. **Rate limiting et politesse** — Lire et respecter `robots.txt` (utiliser `urllib.robotparser`). Appliquer un délai minimum entre requêtes vers le même domaine. Limiter la concurrence (max 2–3 requêtes simultanées par domaine). Respecter l'en-tête `Retry-After` en cas de 429.

10. **Reporting au parent** — Retourner un objet structuré complet : données extraites, statut global (`success`/`partial`/`failed`), nombre de pages visitées, liste d'erreurs détaillées, score de confiance (ratio champs remplis / total attendu), et durée totale d'exécution.

## Interface du sous-agent

**Input schema :**
```python
{
  "url": str,                  # URL de départ (obligatoire)
  "selectors": {               # Dictionnaire nom_champ → sélecteur CSS/XPath
    "field_name": "css_or_xpath_selector"
  },
  "max_pages": int,            # Nombre maximum de pages à parcourir (défaut: 1)
  "timeout": int,              # Timeout global en secondes (défaut: 30)
  "output_format": str,        # "json" | "csv" | "markdown" (défaut: "json")
  "cache_ttl": int,            # TTL du cache en secondes (défaut: 3600)
  "follow_pagination": bool,   # Activer la pagination automatique (défaut: False)
  "proxy": str                 # URL proxy optionnel (défaut: None)
}
```

**Output schema :**
```python
{
  "data": list[dict],          # Liste d'enregistrements extraits
  "status": str,               # "success" | "partial" | "failed"
  "pages_visited": int,        # Nombre de pages effectivement visitées
  "errors": list[dict],        # [{"url": str, "code": int, "message": str}]
  "confidence_score": float,   # 0.0–1.0 (ratio champs remplis)
  "execution_time_s": float,   # Durée totale en secondes
  "cached": bool               # True si données servies depuis le cache
}
```

**Librairies Python recommandées :**
```
playwright>=1.40.0
beautifulsoup4>=4.12.0
lxml>=4.9.0
trafilatura>=1.6.0
requests>=2.31.0
urllib3>=2.0.0
pandas>=2.0.0
```

## Règles

1. **Interface contractuelle stricte** — Le sous-agent doit toujours accepter exactement le schéma d'entrée défini et retourner exactement le schéma de sortie défini. Tout champ manquant en entrée doit lever une `ValueError` explicite avant toute opération réseau.

2. **Robustesse prioritaire** — Une erreur sur une page individuelle ne doit jamais interrompre le traitement des autres pages. Utiliser `try/except` granulaires, logger chaque exception, et continuer avec les pages restantes. Retourner `status: "partial"` plutôt que de lever une exception globale.

3. **Éthique et légalité** — Toujours vérifier `robots.txt` avant de commencer. Ne jamais contourner les mécanismes d'authentification. Respecter les `Terms of Service`. Si une page retourne 403 persistant, signaler au parent sans insister. Le sous-agent ne doit pas être utilisé pour des activités illégales.

4. **Réutilisabilité maximale** — Le sous-agent doit fonctionner comme une boîte noire indépendante, sans état persistant entre deux appels. Toute configuration doit passer par le schéma d'entrée. Ne jamais hardcoder des sélecteurs, URLs ou credentials dans le code.

5. **Code Python fonctionnel fourni** — Toujours fournir une implémentation Python complète et exécutable, incluant la classe `WebScraperSubAgent` avec méthodes `run(input_schema) -> output_schema`, la gestion des dépendances (`requirements.txt`), et un exemple d'appel depuis un agent parent.


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
