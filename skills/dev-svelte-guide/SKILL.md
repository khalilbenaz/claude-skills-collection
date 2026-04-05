---
name: dev-svelte-guide
description: Développement d'applications Svelte et SvelteKit avec réactivité native, stores, SSR, routing et transitions. Se déclenche avec "Svelte", "SvelteKit", "store Svelte", "réactivité Svelte", "$:", "svelte:component".
---

# Guide Svelte / SvelteKit

## Workflow

1. **Analyser le besoin** — Identifier le type de projet (SPA, site statique, application full-stack) et choisir entre Svelte seul ou SvelteKit pour le SSR, le routing basé sur le système de fichiers et les API endpoints.

2. **Structurer le projet SvelteKit** — Organiser l'arborescence `src/routes/` avec les conventions de fichiers : `+page.svelte`, `+layout.svelte`, `+page.server.ts`, `+server.ts`. Créer `src/lib/` pour les composants, utilitaires et stores partagés avec l'alias `$lib`.

3. **Exploiter la réactivité native** — Utiliser les déclarations réactives `$:` pour les valeurs dérivées et les effets de bord, le binding bidirectionnel avec `bind:`, et les runes Svelte 5 (`$state`, `$derived`, `$effect`) pour la réactivité fine.

4. **Implémenter les stores** — Créer des writable, readable et derived stores pour l'état partagé entre composants. Utiliser la syntaxe `$store` pour l'auto-souscription dans les templates, et développer des custom stores avec des méthodes encapsulées.

5. **Configurer le data loading** — Implémenter les fonctions `load()` dans `+page.server.ts` pour le data fetching côté serveur, les form actions pour les mutations, et utiliser `invalidateAll()` pour le revalidation des données après les actions.

6. **Gérer les transitions et animations** — Appliquer les directives de transition (`fade`, `slide`, `fly`, `scale`), les animations avec `animate:flip`, les actions custom avec `use:action`, et les transitions de page avec `onNavigate`.

7. **Créer les composants avancés** — Utiliser les slots nommés pour la composition, `svelte:component` pour le rendu dynamique, les event dispatchers avec `createEventDispatcher`, et les context API avec `setContext/getContext` pour le partage de données.

8. **Tester et déployer** — Écrire des tests avec Vitest et Testing Library Svelte, configurer les adapters SvelteKit (node, static, vercel, cloudflare), et optimiser avec le prerendering sélectif et le code splitting automatique.

## Règles

- Privilégie les runes Svelte 5 (`$state`, `$derived`, `$effect`) pour les nouveaux projets plutôt que la syntaxe réactive `$:` classique.
- Utilise toujours `+page.server.ts` pour les données sensibles et les accès base de données — ne charge jamais de secrets côté client.
- Évite les stores globaux quand le context API (`setContext/getContext`) suffit pour le partage de données entre composants parent-enfant.
- Valide systématiquement les données des form actions côté serveur avant toute mutation en base de données.
- Exploite le SSR et le prerendering de SvelteKit par défaut — ne désactive le SSR que si explicitement nécessaire.


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
