---
name: dev-nextjs-guide
description: Développement d'applications Next.js avec App Router, Server Components, SSR, ISR, API routes et middleware. Se déclenche avec "Next.js", "NextJS", "App Router", "Server Components", "SSR", "getServerSideProps".
---

# Guide Next.js

## Workflow

1. **Analyser le besoin** — Identifier le type d'application (site vitrine, SaaS, e-commerce, dashboard) et déterminer la stratégie de rendu adaptée (SSR, SSG, ISR ou CSR) pour chaque page.

2. **Structurer le projet avec App Router** — Organiser l'arborescence `app/` avec les conventions de fichiers Next.js : `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`. Définir les groupes de routes `(group)`, les routes parallèles `@slot` et les intercepting routes `(.)`.

3. **Implémenter les Server Components** — Concevoir les composants serveur par défaut pour les opérations de data fetching, accès base de données et logique métier. Réserver `"use client"` uniquement pour l'interactivité (useState, useEffect, event handlers, hooks navigateur).

4. **Configurer le data fetching** — Utiliser `fetch()` avec les options de cache Next.js (`force-cache`, `no-store`, `revalidate`), implémenter ISR avec `revalidate` dans les segments de route, et configurer `generateStaticParams` pour la génération statique des pages dynamiques.

5. **Créer les API routes et Server Actions** — Implémenter les Route Handlers dans `app/api/` pour les endpoints REST, et les Server Actions avec `"use server"` pour les mutations de données directes depuis les formulaires et composants client.

6. **Configurer le middleware** — Implémenter `middleware.ts` à la racine pour l'authentification, la redirection, la réécriture d'URL, les headers de sécurité et la gestion de l'internationalisation (i18n).

7. **Optimiser les performances** — Appliquer les optimisations Next.js : `next/image` pour les images, `next/font` pour les polices, streaming avec Suspense, parallel data fetching, et lazy loading des composants client avec `dynamic()`.

8. **Déployer et monitorer** — Configurer le déploiement sur Vercel, Docker ou Node.js standalone. Activer les métriques Web Vitals, configurer les headers de cache CDN et mettre en place le monitoring des erreurs serveur.

## Règles

- Privilégie toujours les Server Components sauf quand l'interactivité client est explicitement nécessaire.
- Ne transmets jamais de données sensibles (tokens, clés API) aux composants client — garde-les côté serveur.
- Utilise les conventions de fichiers Next.js (`loading.tsx`, `error.tsx`) plutôt que des solutions custom pour la gestion des états de chargement et d'erreur.
- Valide systématiquement les entrées utilisateur dans les Server Actions et Route Handlers avant toute opération.
- Propose des solutions compatibles avec le déploiement edge quand la latence est critique.
