---
name: nextjs-guide
description: Développement d'applications Next.js avec App Router, Server Components, SSR, ISR, API routes et middleware. Se déclenche avec "Next.js", "NextJS", "App Router", "Server Components", "SSR", "getServerSideProps".
---

# Guide Next.js (App Router — 2026)

## 1. Critères de décision stratégique

**Choix de la stratégie de rendu par page :**

| Besoin | Stratégie | Config |
|---|---|---|
| Données dynamiques par requête | SSR | `export const dynamic = 'force-dynamic'` |
| Données rarement modifiées | ISR | `export const revalidate = 60` |
| Contenu totalement statique | SSG | `generateStaticParams` + cache par défaut |
| Interactivité pure, auth client | CSR | `"use client"` + SWR/React Query |
| Latence critique, edge-compatible | Edge SSR | `export const runtime = 'edge'` |

**Quand utiliser `"use client"` :** uniquement pour `useState`, `useEffect`, event handlers DOM, hooks navigateur (`window`, `localStorage`). Tout le reste = Server Component.

---

## 2. Initialisation du projet

```bash
# Next.js 15 avec TypeScript, Tailwind, App Router, ESLint
npx create-next-app@latest my-app \
  --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"

cd my-app && npm run dev
```

**Structure `app/` recommandée :**
```
app/
  (marketing)/          # groupe de routes sans segment URL
    page.tsx
    layout.tsx
  (dashboard)/
    layout.tsx           # layout partagé dashboard
    analytics/page.tsx
    settings/page.tsx
  api/
    users/route.ts       # Route Handler REST
  globals.css
  layout.tsx             # Root layout (obligatoire)
  not-found.tsx
```

---

## 3. Server Components — data fetching

```tsx
// app/users/page.tsx — Server Component par défaut
async function getUsers() {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 60 }, // ISR : re-valide toutes les 60s
  });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers(); // pas de useEffect, direct
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

**Parallel fetching (évite les waterfalls) :**
```tsx
export default async function DashboardPage() {
  const [users, stats] = await Promise.all([
    getUsers(),
    getStats(),
  ]);
  return <Dashboard users={users} stats={stats} />;
}
```

---

## 4. Server Actions — mutations de données

```tsx
// app/actions/user.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  const parsed = CreateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });
  if (!parsed.success) return { error: parsed.error.flatten() };

  await db.user.create({ data: parsed.data });
  revalidatePath('/users'); // invalide le cache de la page
}
```

```tsx
// Utilisation dans un form
<form action={createUser}>
  <input name="name" required />
  <input name="email" type="email" required />
  <button type="submit">Créer</button>
</form>
```

---

## 5. Route Handlers (API REST)

```ts
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Next 15 : params est une Promise
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

---

## 6. Middleware — auth, redirections, headers

```ts
// middleware.ts (racine du projet)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard');

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 7. Streaming et Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { UsersSkeleton } from '@/components/skeletons';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<UsersSkeleton />}>
        <SlowDataComponent />  {/* streamé indépendamment */}
      </Suspense>
    </div>
  );
}
```

---

## 8. Optimisation images et polices

```tsx
import Image from 'next/image';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// Image optimisée avec lazy loading automatique
<Image
  src="/hero.webp"
  alt="Hero"
  width={1200}
  height={630}
  priority // uniquement pour LCP (above the fold)
/>
```

**Lazy loading composant client lourd :**
```tsx
import dynamic from 'next/dynamic';
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  ssr: false, // si besoin de window
  loading: () => <p>Chargement...</p>,
});
```

---

## 9. Variables d'environnement

```bash
# .env.local
DATABASE_URL="postgres://..."          # serveur uniquement
NEXT_PUBLIC_API_URL="https://api..."   # exposé côté client (préfixe obligatoire)
```

- Sans `NEXT_PUBLIC_` → accessible uniquement côté serveur (Server Components, API routes, middleware).
- Avec `NEXT_PUBLIC_` → bundle client. Ne jamais y mettre clés secrètes.

---

## 10. Garde-fous et anti-patterns

**Waterfalls de fetch** — ne jamais faire `await` en séquence quand les requêtes sont indépendantes. Utiliser `Promise.all`.

**"use client" trop haut** — ne pas marquer un layout ou une page entière comme client. Pousser `"use client"` au composant feuille qui a besoin d'interactivité.

**Données sensibles dans les composants client** — ne jamais passer `process.env.SECRET_KEY` ou tokens JWT à un composant client. Les garder dans les Server Actions ou Route Handlers.

**Oublier `revalidatePath`/`revalidateTag` après une mutation** — la page affichera des données périmées après une Server Action.

**`params` non awaité (Next 15)** — `params` et `searchParams` sont des Promises dans Next.js 15. Toujours les `await`.

**`export const dynamic = 'force-dynamic'` sur tout** — désactive le cache partout, détruit les performances. Utiliser uniquement quand les données changent à chaque requête.

**Fetch sans gestion d'erreur** — un fetch échoué dans un Server Component non protégé par `error.tsx` fait planter toute la page.

---

## 11. Déploiement

```bash
# Build de production
npm run build && npm start

# Standalone (Docker)
# next.config.ts
output: 'standalone'

# Dockerfile minimal
FROM node:22-alpine AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
CMD ["node", "server.js"]
```

**Vercel** : zéro config — `vercel deploy --prod`. ISR, Edge Functions et Image Optimization activés automatiquement.

**Self-hosted** : vérifier que `HOSTNAME=0.0.0.0` est défini pour le serveur standalone (sinon écoute sur localhost seulement).
