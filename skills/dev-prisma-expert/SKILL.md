---
name: dev-prisma-expert
description: Expert Prisma ORM pour la conception de schémas, les migrations, l'optimisation de requêtes, la modélisation de relations et les opérations base de données. À utiliser quand l'utilisateur travaille avec Prisma, a des problèmes de schéma, de migration ou de performance de requêtes. Se déclenche aussi avec "prisma", "schema prisma", "migration prisma", "prisma client", "requête prisma lente", "relation prisma".
---

# Expert Prisma

## Workflow

1. **Diagnostic** : identifier la catégorie du problème (schéma, migration, requête, connexion).
2. **Analyse** : vérifier la configuration et détecter les anti-patterns.
3. **Correction progressive** : minimal → mieux → complet.
4. **Validation** : tester avec le CLI Prisma et vérifier le résultat.

## Conception de schéma

### Bonnes pratiques

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  posts     Post[]   @relation("UserPosts")
  profile   Profile? @relation("UserProfile")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@map("users")
}

model Post {
  id       String @id @default(cuid())
  title    String
  author   User   @relation("UserPosts", fields: [authorId], references: [id], onDelete: Cascade)
  authorId String

  @@index([authorId])
  @@map("posts")
}
```

### Checklist schéma
- Toutes les relations avec `@relation` explicite, `fields` et `references`
- Comportements de cascade définis (`onDelete`, `onUpdate`)
- Index sur les champs fréquemment requêtés
- Enums pour les ensembles de valeurs fixes
- `@@map` pour les conventions de nommage des tables

## Migrations

### Workflow sécurisé

```bash
# Développement
npx prisma migrate dev --name nom_descriptif

# Production (jamais migrate dev !)
npx prisma migrate deploy

# Si une migration échoue en production
npx prisma migrate resolve --applied "nom_migration"
npx prisma migrate resolve --rolled-back "nom_migration"
```

### Diagnostic

```bash
npx prisma validate        # Valider le schéma
npx prisma migrate status  # Vérifier l'état des migrations
npx prisma format          # Formater le schéma
```

## Optimisation des requêtes

### Problème N+1

```typescript
// MAUVAIS : N+1
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// BON : Include
const users = await prisma.user.findMany({
  include: { posts: true }
});

// MIEUX : Select ciblé
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    posts: { select: { id: true, title: true } }
  }
});
```

### Requêtes complexes

```typescript
// Pour les agrégations complexes, utiliser $queryRaw
const result = await prisma.$queryRaw`
  SELECT u.id, u.email, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  GROUP BY u.id
`;
```

## Gestion des connexions (Serverless)

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Transactions

```typescript
// Transaction séquentielle
const [user, profile] = await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.profile.create({ data: profileData }),
]);

// Transaction interactive
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const profile = await tx.profile.create({
    data: { ...profileData, userId: user.id }
  });
  return { user, profile };
}, {
  maxWait: 5000,
  timeout: 10000,
});
```

## Anti-patterns à éviter

1. **Many-to-Many implicite** : toujours utiliser des tables de jointure explicites
2. **Over-Including** : ne pas inclure des relations inutiles
3. **Ignorer les limites de connexion** : toujours configurer la taille du pool
4. **Abus de requêtes brutes** : utiliser Prisma quand possible
5. **`migrate dev` en production** : jamais, utiliser `migrate deploy`

## Règles
- Toujours valider le schéma avant de créer une migration.
- Ne jamais utiliser `migrate dev` en production.
- Chaque relation doit avoir un `@relation` explicite.
- Tester les deux états de chaque migration (apply et rollback).


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
