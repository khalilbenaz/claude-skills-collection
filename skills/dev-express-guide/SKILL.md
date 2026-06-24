---
name: dev-express-guide
description: Développement d'APIs Node.js avec Express, middleware, routing, gestion d'erreurs, authentification et bonnes pratiques de conception. Se déclenche avec "Express", "Express.js", "middleware Express", "Node.js API", "router Express".
---

# Guide Express.js

## Workflow

### 1. Initialiser le projet

```bash
mkdir my-api && cd my-api
npm init -y
npm install express helmet cors morgan compression express-rate-limit
npm install zod jsonwebtoken bcryptjs
npm install -D typescript ts-node @types/express @types/node nodemon jest supertest
```

Structure recommandée (feature-based) :
```
src/
  app.ts          ← config Express, middleware globaux
  server.ts       ← écoute HTTP + graceful shutdown
  routes/         ← index + un fichier par ressource
  controllers/    ← extraction req/res, appel service
  services/       ← logique métier (testable)
  middleware/     ← auth, validate, errorHandler
  models/         ← schémas DB (Prisma / Mongoose)
  utils/          ← helpers, logger, asyncHandler
  types/          ← interfaces TS globales
```

### 2. Configurer `app.ts` avec les middleware globaux

```ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { router } from './routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use('/api/v1', router);

// Error handler TOUJOURS en dernier
app.use(errorHandler);

export { app };
```

### 3. Router modulaire par ressource

```ts
// routes/users.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createUserSchema } from '../schemas/user.schema';
import { createUser, getUserById } from '../controllers/user.controller';

const router = Router();

router.post('/', validate(createUserSchema), createUser);
router.get('/:id', authenticate, getUserById);

export { router as userRouter };
```

```ts
// routes/index.ts
import { Router } from 'express';
import { userRouter } from './users';

const router = Router();
router.use('/users', userRouter);
// router.use('/products', productRouter);
export { router };
```

### 4. Pattern controller → service

```ts
// middleware/asyncHandler.ts
import { RequestHandler } from 'express';
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// controllers/user.controller.ts
import { asyncHandler } from '../middleware/asyncHandler';
import { UserService } from '../services/user.service';

export const createUser = asyncHandler(async (req, res) => {
  const user = await UserService.create(req.body);
  res.status(201).json({ success: true, data: user });
});
```

```ts
// services/user.service.ts — aucune dépendance Express ici
import { prisma } from '../utils/db';
import bcrypt from 'bcryptjs';

export const UserService = {
  async create(data: CreateUserDto) {
    const hashed = await bcrypt.hash(data.password, 12);
    return prisma.user.create({ data: { ...data, password: hashed } });
  },
};
```

### 5. Validation avec Zod

```ts
// middleware/validate.ts
import { AnyZodObject } from 'zod';
import { RequestHandler } from 'express';

export const validate =
  (schema: AnyZodObject): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (!result.success) {
      return next({ status: 422, errors: result.error.flatten() });
    }
    req.body = result.data.body;
    next();
  };

// schemas/user.schema.ts
import { z } from 'zod';
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2).max(100),
  }),
});
```

### 6. Gestion d'erreurs centralisée

```ts
// utils/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errors?: unknown
  ) {
    super(message);
  }
}

// middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof AppError ? err.statusCode : err.status ?? 500;
  res.status(status).json({
    success: false,
    message: err.message ?? 'Internal Server Error',
    errors: err.errors ?? undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

### 7. Authentification JWT

```ts
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';

export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new AppError('Unauthorized', 401);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    next();
  } catch {
    next(new AppError('Token invalide ou expiré', 401));
  }
};
```

### 8. Graceful shutdown dans `server.ts`

```ts
import { app } from './app';
import { prisma } from './utils/db';

const server = app.listen(process.env.PORT ?? 3000, () =>
  console.log(`API up on :${process.env.PORT ?? 3000}`)
);

const shutdown = async (signal: string) => {
  console.log(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000); // force kill si bloqué
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### 9. Tests avec Jest + Supertest

```ts
// __tests__/users.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/v1/users', () => {
  it('crée un utilisateur valide', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ email: 'test@test.com', password: 'secret123', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejette un email invalide', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ email: 'pas-un-email', password: 'secret123', name: 'Alice' });
    expect(res.status).toBe(422);
  });
});
```

## Critères de décision

| Besoin | Choix |
|---|---|
| API REST simple | Express + Zod + Prisma |
| Temps réel | Express + Socket.io ou passer à Fastify |
| Auth OAuth2/OIDC | `passport.js` + stratégies |
| Validation complexe | Zod (TS-first) > Joi |
| ORM | Prisma (TypeScript), Mongoose (MongoDB) |
| Logging structuré | `pino` + `pino-http` (plus rapide que morgan) |
| Haute performance | Envisager Fastify (3× plus rapide) |

## Anti-patterns / pièges

- **try-catch dans chaque route** — utilise `asyncHandler`, sinon une exception non catchée crash le process.
- **Logique métier dans les routes** — non testable, non réutilisable ; toujours isoler dans un service.
- **`app.use(express.json())` après les routes** — les routes ne verront pas le body parsé. L'ordre des middleware EST la logique.
- **Oublier `next(err)` dans les middleware async** — une `Promise` rejetée sans `.catch(next)` ou `asyncHandler` ne déclenche pas l'error handler.
- **`res.send()` après `res.json()`** — double send → crash. Toujours `return res.json(...)`.
- **Variables d'env en dur** — utiliser `dotenv` + valider avec `envalid` ou Zod au démarrage.
- **Pas de rate limiting** — brute force triviale sans `express-rate-limit` ou un WAF upstream.
- **Port binding dans `app.ts`** — rend les tests Supertest lents (port déjà occupé) ; séparer `app.ts` et `server.ts`.
- **Helmet désactivé en prod** — headers par défaut exposent la stack tech.

## Bonnes pratiques 2026

- **TypeScript strict** (`"strict": true`) — évite les bugs de runtime sur `req.params` / `req.query` (toujours `string`).
- **Versioning d'API** — préfixer `/api/v1/` dès le début, impossible à ajouter proprement après coup.
- **Format de réponse uniforme** — `{ success, data, error, message, meta }` sur toutes les routes, y compris erreurs.
- **Health check** — `GET /health` renvoie `{ status: "ok", uptime, db: "connected" }` pour les load balancers / k8s.
- **OpenAPI** — générer la spec avec `zod-to-openapi` ou `tsoa` pour documenter et valider les contrats.
- **`pino`** à la place de `console.log` — JSON structuré, niveaux, corrélation par `requestId`.


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
