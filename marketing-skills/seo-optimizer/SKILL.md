---
name: seo-optimizer
description: Optimisation SEO on-page et technique — meta tags, structured data, Core Web Vitals, sitemap et stratégie de mots-clés. Se déclenche avec "SEO", "référencement", "Google Search", "meta tags", "sitemap", "mots-clés".
---

# SEO Optimizer

## Workflow

1. **Audit SEO technique** — analyser le site avec des outils comme Screaming Frog, Google Search Console ou Lighthouse pour identifier les problèmes techniques : erreurs de crawl (4xx, 5xx), pages orphelines, redirections en chaîne, temps de chargement excessif, et problèmes d'indexation (`robots.txt`, `noindex`).

2. **Optimisation des Core Web Vitals** — mesurer et améliorer les trois métriques clés : LCP (Largest Contentful Paint < 2.5s) en optimisant images et CSS critique, INP (Interaction to Next Paint < 200ms) en réduisant le JavaScript bloquant, et CLS (Cumulative Layout Shift < 0.1) en dimensionnant explicitement les éléments visuels.

3. **Recherche et stratégie de mots-clés** — identifier les mots-clés cibles avec Google Keyword Planner, Ahrefs ou SEMrush, analyser l'intention de recherche (informationnelle, navigationnelle, transactionnelle), évaluer la difficulté et le volume, et regrouper les mots-clés par clusters thématiques pour structurer le contenu.

4. **Optimisation on-page** — optimiser chaque page : titre (`<title>`) unique et accrocheur (50-60 caractères), meta description engageante (150-160 caractères), hiérarchie Hn correcte (un seul H1), URLs courtes et descriptives, maillage interne pertinent, et attributs alt sur les images.

5. **Données structurées (Schema.org)** — implémenter les balises JSON-LD pour enrichir les résultats de recherche : Article, Product, FAQ, HowTo, BreadcrumbList, Organization, LocalBusiness, et valider avec le Rich Results Test de Google pour obtenir les rich snippets.

6. **Optimisation du sitemap et du crawl** — générer un sitemap XML à jour listant toutes les pages indexables, soumettre via Google Search Console, configurer le `robots.txt` pour guider les crawlers, et utiliser les balises `canonical` pour éviter le contenu dupliqué.

7. **Suivi et analyse des résultats** — configurer Google Search Console pour suivre les impressions, clics, CTR et positions moyennes, analyser les tendances par page et par requête, identifier les opportunités de quick wins (pages en position 5-15), et ajuster la stratégie en fonction des données.

## Règles

- Toujours prioriser l'expérience utilisateur sur l'optimisation pour les moteurs — Google récompense les sites qui satisfont réellement l'intention de recherche de l'utilisateur.
- Ne jamais utiliser de techniques black hat (keyword stuffing, cloaking, liens artificiels) — les pénalités algorithmiques ou manuelles de Google peuvent détruire le trafic organique.
- Valider systématiquement les données structurées avec le Rich Results Test avant déploiement — un schema.org malformé est ignoré par Google.
- Considérer le SEO dès la conception du site (architecture, URLs, performance) et non comme une couche ajoutée après coup — la dette technique SEO est coûteuse à corriger.
- Mesurer les résultats sur des périodes de 3 à 6 mois minimum — le SEO est une stratégie à long terme, les résultats ne sont pas immédiats.
