---
name: seo-optimizer
description: Optimisation SEO on-page et technique — meta tags, structured data, Core Web Vitals, sitemap et stratégie de mots-clés. Se déclenche avec "SEO", "référencement", "Google Search", "meta tags", "sitemap", "mots-clés".
---

# SEO Optimizer

## Workflow

### 1. Audit SEO technique

Commence par un crawl complet avant toute optimisation.

```bash
# Screaming Frog CLI (licence requise)
screamingfrogseospider --crawl https://example.com --headless \
  --output-folder ./seo-audit --export-tabs "Response Codes,Page Titles,Meta Description,H1"

# Lighthouse CLI via Node
npx lighthouse https://example.com \
  --output json --output-path ./lighthouse-report.json \
  --only-categories performance,seo,best-practices
```

Critères de priorisation des problèmes :
| Priorité | Type | Action |
|----------|------|---------|
| P0 | Pages 4xx/5xx indexées | Redirection 301 ou noindex immédiat |
| P0 | `noindex` en production | Retirer l'attribut |
| P1 | Redirections en chaîne (>2 sauts) | Raccourcir vers la destination finale |
| P1 | Contenu dupliqué | Canonical ou consolidation |
| P2 | Pages orphelines (aucun lien entrant) | Maillage interne |
| P2 | `robots.txt` bloquant des assets CSS/JS | Débloquer |

Vérifier `robots.txt` et sitemap via Search Console :
- **Coverage > Excluded** : pages exclues involontairement
- **Core Web Vitals** : pages Failed vs Good sur mobile/desktop

---

### 2. Core Web Vitals — diagnostiquer et corriger

Seuils 2026 (inchangés depuis CWV update 2024) :

| Métrique | Good | Needs Improvement | Poor |
|----------|------|-------------------|------|
| LCP | < 2.5 s | 2.5–4.0 s | > 4.0 s |
| INP | < 200 ms | 200–500 ms | > 500 ms |
| CLS | < 0.1 | 0.1–0.25 | > 0.25 |

**LCP — images et CSS critique**
```html
<!-- Précharger l'image LCP candidate -->
<link rel="preload" as="image" href="/hero.webp"
      imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w"
      imagesizes="100vw" fetchpriority="high">
<!-- Jamais lazy-load sur l'image above-the-fold -->
<img src="/hero.webp" alt="..." width="1200" height="600" fetchpriority="high">
```

**INP — réduire le JS bloquant**
```js
// Diviser les tâches longues (> 50 ms) avec scheduler.yield()
async function heavyTask() {
  for (const chunk of chunks) {
    processChunk(chunk);
    await scheduler.yield(); // libère le thread principal
  }
}
```

**CLS — dimensions explicites**
```css
/* Réserver l'espace pour les polices web */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: optional; /* évite le FOUT/CLS */
}
/* Ratio fixe pour images responsive */
.hero-image { aspect-ratio: 16 / 9; width: 100%; }
```

---

### 3. Recherche de mots-clés et clusters thématiques

**Processus en 4 étapes :**

1. **Seed keywords** — partir du domaine métier, des requêtes Search Console existantes, et de l'analyse des concurrents (Ahrefs : "Top Pages" du concurrent principal).
2. **Expansion** — Google Keyword Planner, "Searches related to", "People also ask", AnswerThePublic.
3. **Scoring** — pour chaque mot-clé : Volume mensuel × (1 / Difficulté KD) = score de priorité. Cibler KD < 40 en phase de lancement.
4. **Clusters** — regrouper les mots-clés par intention :
   - Informationnelle → articles de blog, guides
   - Commerciale → pages catégorie, comparatifs
   - Transactionnelle → pages produit/service, landing pages

```
Exemple de cluster "logiciel comptabilité PME" :
- Pillar page : /logiciel-comptabilite-pme/  (volume élevé, KD fort)
- Cluster 1 : /logiciel-comptabilite-auto-entrepreneur/  (longue traîne)
- Cluster 2 : /comparatif-logiciel-comptabilite/  (intention commerciale)
- Cluster 3 : /comment-choisir-logiciel-comptabilite/  (informationnelle)
```

---

### 4. Optimisation on-page

Checklist par page :

```html
<!-- Title : 50-60 caractères, mot-clé principal en tête -->
<title>Logiciel comptabilité PME — Essai gratuit 30 jours | NomDuSite</title>

<!-- Meta description : 150-160 caractères, CTA implicite -->
<meta name="description"
  content="Gérez votre comptabilité PME en ligne simplement. Facturation, TVA, bilan : tout-en-un. Essai gratuit, sans carte bancaire.">

<!-- Open Graph pour partage social -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://example.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Canonical explicite sur chaque page -->
<link rel="canonical" href="https://example.com/logiciel-comptabilite-pme/">
```

Règle H1-Hn : **un seul H1 par page**, contenant le mot-clé principal exact ou proche. Les H2 structurent les sections, les H3 les sous-sections.

**Densité de mots-clés** : viser 1–2 % d'occurrences naturelles ; l'over-optimisation (> 4 %) est pénalisante depuis Helpful Content Update.

---

### 5. Données structurées (Schema.org / JSON-LD)

```json
// Article de blog
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Titre de l'article",
  "author": { "@type": "Person", "name": "Prénom Nom" },
  "datePublished": "2026-01-15",
  "dateModified": "2026-06-01",
  "image": "https://example.com/image.jpg",
  "publisher": {
    "@type": "Organization",
    "name": "NomDuSite",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" }
  }
}
```

```json
// FAQ — génère les rich snippets accordéon dans SERP
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Quel logiciel comptabilité pour PME ?",
      "acceptedAnswer": { "@type": "Answer", "text": "..." }
    }
  ]
}
```

Valider avant déploiement : `https://search.google.com/test/rich-results`

---

### 6. Sitemap et crawl budget

```xml
<!-- sitemap.xml minimal valide -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/logiciel-comptabilite-pme/</loc>
    <lastmod>2026-06-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
```

- Soumettre via Search Console > Sitemaps
- Exclure les pages noindex, paginées après page 2, filtres e-commerce
- `robots.txt` : ne bloquer que les ressources admin/staging — ne jamais bloquer CSS/JS

```
# robots.txt exemple
User-agent: *
Disallow: /admin/
Disallow: /staging/
Disallow: /*?sort=
Allow: /

Sitemap: https://example.com/sitemap.xml
```

---

### 7. Suivi et quick wins

**Tableau de bord Search Console — requêtes prioritaires :**
- Filtrer Position 5–15 + Impressions > 500/mois → pages à optimiser en priorité
- CTR < 3 % malgré une bonne position → réécrire le title/meta description
- Pages avec clics mais sans conversions → problème d'adéquation contenu/intention

**Cycle d'optimisation recommandé :**
```
Semaine 1 : Audit + priorisation
Semaine 2-4 : Corrections P0/P1 (technique + on-page)
Mois 2-3 : Contenu (clusters), structured data
Mois 3+ : Suivi positions, ajustements, link building
Résultats visibles : 3–6 mois minimum
```

---

## Anti-patterns et pièges

- **Keyword stuffing** : répéter le mot-clé > 4 % déclenche une pénalité Helpful Content. Écrire pour l'humain.
- **Cloaking / contenu masqué** : afficher du texte aux bots mais pas aux users → pénalité manuelle.
- **Noindex en staging non retiré en prod** : vérifier `<meta name="robots" content="noindex">` et `X-Robots-Tag` à chaque déploiement.
- **Redirections 302 au lieu de 301** : le 302 ne transfère pas le "link equity" — utiliser 301 pour les redirections permanentes.
- **Ignorer le mobile** : Google utilise le mobile-first indexing depuis 2024 ; tester systématiquement sur mobile.
- **Pages AMP orphelines** : AMP n'est plus un critère de ranking depuis 2021 ; migrer vers des pages standard performantes.
- **Liens brisés internes** : chaque 404 interne gaspille le crawl budget et dégrade l'UX.
- **Contenu généré en masse par LLM non révisé** : flaggé par Helpful Content Update ; toujours ajouter une expertise humaine identifiable.

---

## Bonnes pratiques 2026

- **Helpful Content** : prioriser la valeur unique (données propriétaires, expertise terrain, cas réels) — le contenu générique est systématiquement déclassé.
- **E-E-A-T** (Experience, Expertise, Authoritativeness, Trustworthiness) : signer les contenus avec des auteurs réels et crédibles, ajouter des pages About/Contact complètes.
- **SGE / AI Overviews** : optimiser pour les featured snippets et les réponses concises en début d'article pour apparaître dans les résumés IA de Google.
- **Signaux locaux** : pour un SEO local, Google Business Profile complet + citations NAP cohérentes + avis > tout le reste.
- **Core Web Vitals sur field data** : Google utilise le CrUX (données réelles) et non Lighthouse (lab) pour le ranking — mesurer avec PageSpeed Insights API.
