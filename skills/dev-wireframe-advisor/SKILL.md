---
name: dev-wireframe-advisor
description: Conseille sur la création de wireframes et mockups pour apps et sites. Se déclenche avec "wireframe", "maquette", "mockup", "prototype", "Figma", "UI layout", "comment structurer ma page", "disposition".
---

# Wireframe Advisor

## Étape 1 — Cadrer le contexte (avant de dessiner quoi que ce soit)

Collecter impérativement :
- **Type de produit** : SaaS dashboard, e-commerce, landing page, app mobile native, PWA, back-office admin
- **Audience** : grand public / utilisateurs métier / développeurs — change radicalement la densité et la complexité acceptable
- **Plateforme principale** : mobile-first (< 768 px) ou desktop-first (≥ 1280 px) — décision irréversible en lo-fi
- **Contraintes** : design system existant ? (MUI, Ant Design, Tailwind UI, shadcn/ui), composants réutilisables imposés ?
- **Objectif business du wireframe** : valider un flow avec le PO ? test utilisateur ? handoff dev ?

## Étape 2 — Information Architecture

Avant la mise en page, définir :
1. Hiérarchie de contenu : primaire (1 seul élément par vue), secondaire, tertiaire
2. Structure de navigation : **flat** (≤ 5 sections, favorise la découverte) vs **deep** (arborescence, favorise la spécialisation)
3. Sitemap textuel minimal avant de toucher à Figma :

```
/ Home
├── /products
│   ├── /products/:id
│   └── /products/compare
├── /checkout
│   ├── /checkout/cart
│   └── /checkout/payment
└── /account
    ├── /account/orders
    └── /account/settings
```

Valider avec le PO ou par card sorting (outil gratuit : OptimalSort, Maze).

## Étape 3 — Choisir le layout pattern

| Contexte | Pattern recommandé | Éviter |
|---|---|---|
| Dashboard analytique | CSS Grid 12 colonnes + KPI cards + graphiques | sidebar masquant le contenu |
| SaaS B2B | Sidebar fixe + main scrollable | navigation top masquant l'espace vertical |
| Landing page | Z-pattern ou F-pattern, hero full-width | trop de colonnes sur mobile |
| E-commerce listing | Catalogue 2–4 colonnes + filtres sidebar ou drawer | filtres en modale (UX lourde) |
| App mobile | Bottom tab bar (≤ 5 items) + stacks de navigation | hamburger menu sur mobile natif |
| Admin/back-office | Table-first, actions en ligne, bulk actions | cartes inutiles sur données tabulaires |

## Étape 4 — Lo-fi : structure en blocs texte (Figma ou ASCII)

Règle d'or : **pas de couleur, pas de style, juste des boîtes et des labels.**

Exemple de wireframe ASCII pour une page listing SaaS :

```
+--[Logo]----------[Nav: Features Pricing Docs]--[Login][CTA]--+
|                                                               |
|  [Filters: Status ▼  Date ▼  Search ________________]        |
|                                                               |
|  [Checkbox] Name ↕   Status    Created ↕     Actions         |
|  ─────────────────────────────────────────────────────────   |
|  [ ] Item A          Active    2026-06-01    [Edit][Delete]   |
|  [ ] Item B          Draft     2026-06-15    [Edit][Delete]   |
|  ─────────────────────────────────────────────────────────   |
|  [Bulk: Delete selected]            [< Prev]  1 2 3  [Next >] |
+---------------------------------------------------------------+
```

En Figma : utiliser uniquement des rectangles (`R`), textes (`T`) et auto-layout. Pas de fill de couleur — gris `#E0E0E0` pour les blocs, texte en `#333`.

## Étape 5 — Hi-fi : specs et grille

- **Grille 8px** : tous les espacings sont multiples de 8 (margin, padding, gap). Exceptions à 4px pour les micro-espacings.
- **Breakpoints standard** (à définir dans Figma > Local Variables) :

```
xs  : 0–599 px    (mobile portrait)
sm  : 600–899 px  (mobile landscape / petite tablette)
md  : 900–1199 px (tablette)
lg  : 1200–1535 px (desktop)
xl  : ≥ 1536 px   (large desktop)
```

- **Typographie** : 3 tailles max en wireframe (heading, body, caption). Ne pas choisir la font en hi-fi — laisser le design system décider.
- **Composants** : utiliser des instances de la librairie Figma dès le hi-fi (Button, Input, Badge, etc.). Ne pas redessiner manuellement.

## Étape 6 — États obligatoires à câbler

Chaque vue doit avoir au minimum ces états documentés :

| État | Ce qu'il faut montrer |
|---|---|
| **Empty state** | Illustration + message + CTA principal |
| **Loading** | Skeleton screen (pas de spinner seul sur layout complexe) |
| **Error** | Message précis + action de récupération (retry, contact support) |
| **Success** | Feedback immédiat (toast ou inline, jamais les deux) |
| **Validation** | Erreurs inline sous chaque champ, pas en modale |
| **Pagination / infinite scroll** | Décision explicite : infinite scroll interdit si l'URL doit être partageable |

## Étape 7 — Prototype interactif (Figma Prototype ou Storybook)

Connecter uniquement les **flows critiques** (pas tout le produit) :
1. Flow d'onboarding / inscription
2. Flow d'action principale (ex : créer une commande, publier un article)
3. Flow d'erreur le plus probable

Dans Figma : `Prototype` > ajouter des connections `On Click` > choisir `Navigate to`. Pour les overlays : `Open overlay` avec `Close when clicking outside`.

Pour tester sans design system : utiliser **Storybook + MSW** pour mocker les API et tester les états en isolation.

## Étape 8 — Handoff développeur

Annotations à fournir (Figma Dev Mode ou commentaires inline) :
- Spacing exact sur chaque composant (pas "environ 16px", mais `padding: 16px 24px`)
- Comportement responsive : ce qui se collapse, ce qui se cache, ce qui devient un drawer
- Logique conditionnelle : "ce bouton n'apparaît que si `role === admin`"
- Cas limites : nom de 100 caractères, liste vide, erreur réseau

Exporter les specs :
```
Figma > Dev Mode > Inspect (Ctrl+Alt+I)
→ CSS / iOS / Android selon la cible
→ Assets > Export SVG (icons) ou PNG @2x (images)
```

## Anti-patterns / Garde-fous

- **Ne jamais partir en hi-fi sans valider le lo-fi** avec au moins une personne extérieure au projet.
- **Ne pas itérer sur la couleur avant que le layout soit figé** — le cerveau se fixe sur le style et oublie la structure.
- **Éviter les modales sur mobile** : préférer des bottom sheets ou des pages dédiées.
- **Pas d'infinite scroll sur les données paginées par URL** (partage de lien cassé, back du navigateur cassé).
- **Ne pas inventer de composants custom** si MUI/Ant Design/shadcn en ont un natif — coût de maintenance élevé.
- **Trop d'états hover sur desktop** ignorés sur tactile : toujours tester le wireframe sur un vrai device.
- **Copier le layout d'un concurrent sans analyser son audience** : un dashboard dense acceptable pour des analystes financiers est inutilisable pour le grand public.

## Références et outils (2026)

| Outil | Usage |
|---|---|
| Figma (gratuit team limité) | Lo-fi, hi-fi, prototype, handoff |
| Excalidraw | Sketching rapide collaboratif, lo-fi uniquement |
| Mobbin.com | Références patterns iOS/Android/Web réels |
| Landbook.com | Références landing pages |
| shadcn/ui | Composants copiables React, tailwind, accessible |
| Storybook | Documentation et test des composants isolés |
| Maze / Hotjar | Test utilisateur à distance sur prototype Figma |


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
