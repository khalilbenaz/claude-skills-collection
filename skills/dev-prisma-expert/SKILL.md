---
name: dev-prisma-expert
description: Expert Prisma ORM pour la conception de schémas, les migrations, l'optimisation de requêtes, la modélisation de relations et les opérations base de données. À utiliser quand l'utilisateur travaille avec Prisma, a des problèmes de schéma, de migration ou de performance de requêtes. Se déclenche aussi avec "prisma", "schema prisma", "migration prisma", "prisma client", "requête prisma lente", "relation prisma". Also triggers on "Prisma schema", "Prisma migration", "Prisma query performance".
---

# Expert Prisma ORM

## Workflow de diagnostic

1. **Catégoriser** : schéma · migration · requête lente · connexion · transaction
2. **Valider l'état actuel** : `npx prisma validate` + `npx prisma migrate status`
3. **Identifier le root cause** : logs SQL (`log: ['query']`), `EXPLAIN ANALYZE`, état drift
4. **Appliquer la correction** : minimal d'abord, vérifier l'impact
5. **Valider** : relancer les commandes de diagnostic, tests d'intégration

---

## Conception de schéma

### Modèle canonique

```prisma
model User {
  id        String   @id @default(cuid())   // ou uuid() selon besoin
  email     String   @unique
  role      Role     @default(USER)
  posts     Post[]   @relation("UserPosts")
  profile   Profile? @relation("UserProfile")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([role, createdAt])
  @@map("users")
}

enum Role { USER ADMIN MODERATOR }

model Post {
  id        String   @id @default(cuid())
  title     String
  status    PostStatus @default(DRAFT)
  authorId  String
  author    User     @relation("UserPosts", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([authorId])
  @@index([status, createdAt])
  @@map("posts")
}
```

### Many-to-Many explicite (toujours préférer)

```prisma
// EVITER : relation implicite (perte de flexibilité)
model Post { tags Tag[] }
model Tag  { posts Post[] }

// FAIRE : table de jointure explicite
model PostTag {
  postId    String
  tagId     String
  addedAt   DateTime @default(now())
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId],  references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}
```

### Critères de choix `@id`

| Cas | Choix |
|-----|-------|
| Public, URL-friendly | `cuid()` ou `uuid()` |
| Performance max (write-heavy) | `Int @id @default(autoincrement())` |
| UUID v7 (ordre temporel) | `uuid()` + trigger ou app-generated |
| Clé composée | `@@id([a, b])` |

### Checklist schéma

- `@relation` explicite avec `fields` + `references` sur chaque FK
- `onDelete` / `onUpdate` défini (ne pas laisser le défaut `NoAction` en prod)
- `@@index` sur chaque FK, chaque champ filtré/trié fréquemment
- Enums pour valeurs fixes (pas de `String` ouvert)
- `@@map` / `@map` pour respecter la convention snake_case de la DB

---

## Migrations

### Environnements

```bash
# Développement — génère + applique + regénère le client
npx prisma migrate dev --name add_user_role

# CI/Staging — vérifier sans appliquer
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma

# Production — UNIQUEMENT cette commande (jamais migrate dev)
npx prisma migrate deploy

# Résoudre une migration bloquée en prod
npx prisma migrate resolve --applied  "20240601_add_user_role"
npx prisma migrate resolve --rolled-back "20240601_add_user_role"
```

### Drift de schéma

```bash
# Détecter un drift (DB modifiée hors Prisma)
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-migrations ./prisma/migrations

# Introspect pour récupérer l'état réel
npx prisma db pull
```

### Migration destructive — procédure safe

```bash
# 1. Créer la migration sans l'appliquer
npx prisma migrate dev --name rename_col --create-only

# 2. Editer le SQL généré manuellement :
#    - Copier les données avant DROP
#    - Utiliser ADD COLUMN + UPDATE + DROP COLUMN en 2 déploiements

# 3. Appliquer
npx prisma migrate dev
```

---

## Optimisation des requêtes

### Problème N+1 — recette complète

```typescript
// MAUVAIS : N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// BON : include (charge tout)
const users = await prisma.user.findMany({ include: { posts: true } });

// MIEUX : select ciblé (moins de données réseau)
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    posts: { select: { id: true, title: true }, take: 5 }
  }
});

// OPTIMAL pour pagination + count : transaction parallèle
const [items, total] = await prisma.$transaction([
  prisma.post.findMany({ where, skip, take, orderBy }),
  prisma.post.count({ where }),
]);
```

### Critère `select` vs `include`

- `select` : quand on ne veut qu'un sous-ensemble de champs (performance réseau)
- `include` : quand on veut tous les champs du modèle + la relation
- Les deux ne peuvent pas coexister au même niveau

### `$queryRaw` — quand et comment

```typescript
// Utiliser $queryRaw pour : agrégations complexes, WINDOW functions, requêtes non supportées
import { Prisma } from '@prisma/client';

const stats = await prisma.$queryRaw<{ userId: string; count: bigint }[]>`
  SELECT author_id as "userId", COUNT(*) as count
  FROM posts
  WHERE created_at > ${new Date('2025-01-01')}
  GROUP BY author_id
  HAVING COUNT(*) > 10
`;

// Toujours utiliser les template literals Prisma.sql (pas de string concat — injection risk)
const safeQuery = await prisma.$queryRaw(
  Prisma.sql`SELECT * FROM users WHERE id = ${userId}`
);
```

### Activer les logs SQL en dev

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'warn',  emit: 'stdout' },
  ],
});
prisma.$on('query', (e) => {
  console.log(`Query: ${e.query} — ${e.duration}ms`);
});
```

---

## Gestion des connexions

### Singleton (Node.js / Next.js)

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn'] : ['warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Serverless / Edge (Vercel, Cloudflare)

```typescript
// Utiliser Prisma Accelerate ou connection pooling externe (PgBouncer)
// DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=...

import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

// Avec cache Accelerate
const user = await prisma.user.findUnique({
  where: { id },
  cacheStrategy: { ttl: 60 },  // 60 secondes
});
```

### Pool de connexions — valeurs recommandées

```env
# connection_limit = (nb_CPU * 2) + 1 en général
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=10&pool_timeout=15"
```

---

## Transactions

```typescript
// Transaction séquentielle (simple, atomic)
const [user, account] = await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.account.create({ data: accountData }),
]);

// Transaction interactive (logique conditionnelle)
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  if (!user) throw new Error('User creation failed');  // rollback auto

  await tx.auditLog.create({ data: { action: 'USER_CREATED', userId: user.id } });
  return user;
}, {
  maxWait: 5000,   // attente de slot de connexion
  timeout: 10000,  // durée max de la transaction
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
});
```

---

## Pièges et anti-patterns

| Anti-pattern | Problème | Correction |
|---|---|---|
| `migrate dev` en production | Réinitialise la DB si drift | Utiliser `migrate deploy` |
| `include` sans `where` sur relation large | Charge tout en mémoire | Ajouter `take` + `where` |
| Many-to-many implicite | Impossible d'ajouter des champs à la relation | Table de jointure explicite |
| `$queryRaw` avec concaténation string | Injection SQL | Template literals `Prisma.sql` |
| Instancier PrismaClient dans chaque handler | Épuisement du pool | Singleton global |
| Omettre `onDelete` | Erreur FK en cascade ou orphelins | Définir `Cascade` / `SetNull` |
| Index manquant sur FK | Full table scan à chaque JOIN | `@@index([foreignKeyField])` |
| Enum modifié via `db push` en prod | Risque de perte de données | Migration SQL explicite |

---

## Commandes essentielles

```bash
npx prisma generate          # Régénérer le client après changement schéma
npx prisma validate          # Valider le schéma
npx prisma format            # Formater schema.prisma
npx prisma migrate status    # État des migrations
npx prisma studio            # UI graphique pour explorer la DB
npx prisma db push           # Appliquer schéma sans migration (proto uniquement)
npx prisma db seed           # Exécuter le seed (prisma.seed dans package.json)
```


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
