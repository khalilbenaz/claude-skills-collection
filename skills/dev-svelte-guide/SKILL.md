---
name: dev-svelte-guide
description: Développement d'applications Svelte et SvelteKit avec réactivité native, stores, SSR, routing et transitions. Se déclenche avec "Svelte", "SvelteKit", "store Svelte", "réactivité Svelte", "$:", "svelte:component".
---

# Guide Svelte / SvelteKit

## Critères de décision : Svelte vs SvelteKit

| Besoin | Solution |
|---|---|
| Composant UI isolé, widget embarqué | Svelte seul, build library |
| SPA avec routing côté client | SvelteKit + `adapter-static` |
| Site statique / blog / docs | SvelteKit + prerender + `adapter-static` |
| Application full-stack (API + DB + auth) | SvelteKit + `adapter-node` ou `adapter-vercel` |
| SSR obligatoire (SEO, données fraîches) | SvelteKit, SSR activé par défaut |

## Workflow

### 1. Initialiser le projet

```bash
# SvelteKit (recommandé)
npx sv create my-app
cd my-app && npm install
npm run dev

# Svelte seul (lib ou widget)
npx degit sveltejs/template my-widget
```

Choisir TypeScript dès le début — la migration ultérieure est coûteuse.

### 2. Structurer les routes SvelteKit

```
src/
  routes/
    +layout.svelte          # layout racine (nav, providers)
    +layout.server.ts       # load() partagé (session, user)
    +page.svelte            # page /
    blog/
      +page.svelte          # /blog
      [slug]/
        +page.svelte        # /blog/:slug
        +page.server.ts     # load({ params }) côté serveur
  lib/
    components/             # composants réutilisables
    stores/                 # stores partagés
    utils/                  # helpers purs
  app.html                  # template HTML racine
```

Règle : tout ce qui touche DB, secrets ou sessions va dans `+page.server.ts` ou `+server.ts`, jamais dans `+page.ts` (exécuté côté client aussi).

### 3. Réactivité — Svelte 4 vs Svelte 5

**Svelte 4 (legacy)**
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
  $: if (count > 10) console.log('high');
</script>
```

**Svelte 5 — Runes (recommandé pour tout nouveau projet)**
```svelte
<script>
  let count = $state(0);
  const doubled = $derived(count * 2);

  $effect(() => {
    if (count > 10) console.log('high');
    return () => { /* cleanup */ };
  });
</script>

<button onclick={() => count++}>{count} × 2 = {doubled}</button>
```

Avantages runes : réactivité fine (pas de réexécution du composant entier), cleanup explicite, lisibilité accrue, compatible composants universels.

### 4. Stores — état partagé

```ts
// src/lib/stores/cart.ts
import { writable, derived } from 'svelte/store';

const items = writable<CartItem[]>([]);

export const cart = {
  subscribe: items.subscribe,
  add: (item: CartItem) => items.update(i => [...i, item]),
  remove: (id: string) => items.update(i => i.filter(x => x.id !== id)),
  clear: () => items.set([]),
};

export const total = derived(items, $items =>
  $items.reduce((sum, i) => sum + i.price, 0)
);
```

```svelte
<!-- Auto-souscription avec $store -->
<script>
  import { cart, total } from '$lib/stores/cart';
</script>
<p>Total : {$total} €</p>
```

Préférer le context API (`setContext/getContext`) quand le store n'est utile qu'à un sous-arbre — évite les fuites entre utilisateurs en SSR.

### 5. Data loading et form actions

```ts
// src/routes/products/[id]/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) error(404, 'Produit introuvable');
  return { product };
};

export const actions: Actions = {
  addToCart: async ({ request, locals }) => {
    const data = await request.formData();
    const qty = Number(data.get('qty'));
    if (!qty || qty < 1) return fail(422, { error: 'Quantité invalide' });
    await cartService.add(locals.user.id, params.id, qty);
    redirect(303, '/cart');
  }
};
```

```svelte
<!-- +page.svelte -->
<script>
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

<h1>{data.product.name}</h1>
{#if form?.error}<p class="error">{form.error}</p>{/if}

<form method="POST" action="?/addToCart" use:enhance>
  <input name="qty" type="number" value="1" min="1" />
  <button>Ajouter au panier</button>
</form>
```

`use:enhance` : soumission progressive — fonctionne sans JS, AJAX avec JS.

### 6. Transitions et animations

```svelte
<script>
  import { fade, fly, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  let visible = $state(true);
  let items = $state(['a', 'b', 'c']);
</script>

{#if visible}
  <div transition:fly={{ y: 20, duration: 300 }}>Contenu</div>
{/if}

{#each items as item (item)}
  <div animate:flip={{ duration: 250 }}>{item}</div>
{/each}
```

Pour les transitions de page (SvelteKit 2+) :
```ts
// src/hooks.client.ts
import { onNavigate } from '$app/navigation';
onNavigate(navigation => {
  if (!document.startViewTransition) return;
  return new Promise(resolve => {
    document.startViewTransition(async () => {
      resolve();
      await navigation.complete;
    });
  });
});
```

### 7. Composants avancés

```svelte
<!-- Slot nommé -->
<Card>
  <svelte:fragment slot="header">Titre</svelte:fragment>
  Contenu par défaut
</Card>

<!-- Composant dynamique -->
<svelte:component this={selectedComponent} {props} />

<!-- Context API (évite prop drilling) -->
<script>
  import { setContext, getContext } from 'svelte';
  setContext('theme', { primary: '#3b82f6' });
  // Dans un enfant :
  const theme = getContext('theme');
</script>
```

### 8. Tester

```bash
npm install -D @testing-library/svelte vitest jsdom
```

```ts
// src/lib/Counter.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import Counter from './Counter.svelte';

test('incrémente au clic', async () => {
  const { getByRole } = render(Counter);
  const btn = getByRole('button');
  await fireEvent.click(btn);
  expect(btn.textContent).toBe('1');
});
```

Pour les routes SvelteKit, utiliser Playwright pour les tests E2E :
```bash
npx playwright test
```

### 9. Déployer

```bash
# Node.js (serveur autonome)
npm install -D @sveltejs/adapter-node

# Static (Netlify, GitHub Pages)
npm install -D @sveltejs/adapter-static

# Vercel / Cloudflare (auto-detect)
npm install -D @sveltejs/adapter-vercel
npm install -D @sveltejs/adapter-cloudflare
```

```ts
// svelte.config.js
import adapter from '@sveltejs/adapter-node';
export default { kit: { adapter: adapter() } };
```

Prerender sélectif :
```ts
// +page.ts
export const prerender = true;   // page statique
export const ssr = false;        // SPA shell uniquement
export const csr = false;        // HTML pur sans hydratation
```

## Garde-fous / Anti-patterns

- **Stores globaux + SSR** : un store module-level est partagé entre toutes les requêtes serveur — utiliser `setContext` ou initialiser le store dans `load()`.
- **Secrets dans `+page.ts`** : ce fichier s'exécute client ET serveur ; les clés API fuient dans le bundle. Toujours `+page.server.ts` pour les données sensibles.
- **Réactivité perdue sur objets** : en Svelte 4, `obj.prop = x` ne déclenche pas la réactivité si `obj` n'est pas réassigné — faire `obj = { ...obj, prop: x }`. En Svelte 5 avec `$state`, la réactivité profonde est native.
- **`invalidateAll()` trop large** : relance tous les `load()` de la page ; préférer `invalidate(url)` ciblé pour éviter des waterfalls réseau.
- **Mixage Svelte 4 et 5** : les runes (`$state`, `$derived`) ne sont disponibles qu'en mode rune (fichiers `.svelte` avec `<svelte:options runes />` ou projet créé avec Svelte 5). Ne pas mélanger `$:` et runes dans le même composant.
- **Oublier `use:enhance`** : sans lui, un `<form>` SvelteKit fait un rechargement complet de page — rend les actions inutilisables sans JS.

## Bonnes pratiques 2026

- **Svelte 5 + runes** pour tout nouveau code : réactivité fine, meilleure DX, composants universels (SSR + client sans divergence).
- **TypeScript strict** + `$types` générés automatiquement par SvelteKit pour `PageData`, `ActionData`, `LayoutData`.
- **`$app/state`** (SvelteKit 2.12+) remplace certains stores comme `$page` : `import { page } from '$app/state'` sans souscription.
- **Skeleton CSS / UnoCSS / Tailwind** : utiliser Tailwind via le preset officiel `@skeletonlabs/skeleton` ou `@tailwindcss/vite`.
- **Vite 6 / Rolldown** : SvelteKit 2.x supporte Rolldown-Vite pour des builds significativement plus rapides — activer via `vite.config.ts` quand disponible.
- **Progressive enhancement** systématique : forms avec `use:enhance`, navigation sans JS avec `<a>` standards, JS comme amélioration et non prérequis.


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
