---
name: dev-graphql-builder
description: Conception et implémentation de schémas et résolveurs GraphQL. Se déclenche avec "GraphQL", "schema", "query", "mutation", "subscription", "resolver", "Apollo", "Hot Chocolate".
---

# GraphQL Builder

## Critères de décision : GraphQL vs REST

| Critère | GraphQL | REST |
|---|---|---|
| Clients multiples (mobile/web/tiers) avec besoins différents | ✅ | ❌ sur-fetch |
| API publique stable et versionnée | ❌ complexe | ✅ |
| Upload de fichiers binaires | ❌ multipart lourd | ✅ |
| CRUD simple sans nested data | ❌ overhead | ✅ |
| Real-time natif (subscriptions) | ✅ | ❌ SSE/WS manuel |

**Règle d'or** : si un seul client consomme l'API et que les endpoints sont stables, REST suffit. GraphQL brille dès que plusieurs surfaces (mobile, web, partenaires) ont des besoins de champs divergents.

---

## Workflow en étapes

### 1. Design du schéma SDL (Schema-First)

Définir le contrat avant le code. Partir du SDL, pas des modèles DB.

```graphql
# types de base
type User {
  id: ID!
  email: String!
  role: UserRole!
  posts(first: Int = 10, after: String): PostConnection!
}

enum UserRole { ADMIN MEMBER GUEST }

# erreurs métier explicites — pas d'exceptions génériques
union CreateUserResult = User | EmailAlreadyExistsError | ValidationError

type EmailAlreadyExistsError { message: String! email: String! }
type ValidationError { message: String! field: String! }

type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

input CreateUserInput {
  email: String!
  password: String!
  role: UserRole! = MEMBER
}
```

**Check-list schéma**
- [ ] Champs nullable par défaut → rendre `!` uniquement ce qui est garanti
- [ ] Utiliser des `input` types pour toutes les mutations (jamais des scalaires inline)
- [ ] Documenter avec des commentaires SDL (`"""description"""`) sur chaque type exposé
- [ ] Versionnement : préférer les champs `@deprecated(reason: "…")` plutôt qu'un v2

---

### 2. DataLoader — éliminer le N+1

Chaque résolveur de relation **doit** passer par un DataLoader. Sans ça, 100 posts = 100 requêtes DB.

```ts
// Apollo Server / TypeScript
import DataLoader from 'dataloader';

// Créer dans le contexte par requête (jamais en singleton global)
export function createLoaders(db: Db) {
  return {
    userById: new DataLoader<string, User>(async (ids) => {
      const users = await db.users.findMany({ where: { id: { in: [...ids] } } });
      const map = new Map(users.map(u => [u.id, u]));
      return ids.map(id => map.get(id) ?? new Error(`User ${id} not found`));
    }),
  };
}

// Résolveur
const resolvers = {
  Post: {
    author: (post, _args, ctx) => ctx.loaders.userById.load(post.authorId),
  },
};
```

**Règle** : le DataLoader doit respecter l'ordre et la taille du tableau d'entrée — renvoyer exactement `ids.length` éléments dans le même ordre.

---

### 3. Pagination Relay Connections

Standard cursor-based, compatible avec tous les clients GraphQL.

```graphql
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type PostEdge { node: Post! cursor: String! }
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```ts
// Utilitaire cursor (base64 de l'ID ou d'un offset)
const encodeCursor = (id: string) => Buffer.from(id).toString('base64');
const decodeCursor = (cursor: string) => Buffer.from(cursor, 'base64').toString();
```

Ne pas mélanger offset (`skip`/`limit`) et cursor dans la même connexion — choisir un seul pattern par type.

---

### 4. Authentification & autorisation

**Niveau contexte** : injecter le user une seule fois.

```ts
// Apollo Server v4
const server = new ApolloServer({ typeDefs, resolvers });
const handler = startStandaloneServer(server, {
  context: async ({ req }) => ({
    user: await verifyJwt(req.headers.authorization),
    loaders: createLoaders(db),
  }),
});
```

**Niveau champ** — directive `@auth` avec `graphql-shield` (Node.js) ou attribute `[Authorize]` (Hot Chocolate .NET) :

```ts
// graphql-shield
import { shield, rule, and } from 'graphql-shield';
const isAuthenticated = rule()((_, __, ctx) => ctx.user != null);
const isAdmin = rule()((_, __, ctx) => ctx.user?.role === 'ADMIN');

export const permissions = shield({
  Mutation: { deleteUser: and(isAuthenticated, isAdmin) },
});
```

**Ne jamais** filtrer des données sensibles uniquement côté client — le résolveur doit refuser, pas cacher.

---

### 5. Error handling

| Type d'erreur | Approche |
|---|---|
| Erreur métier prévisible | Union type dans le schéma (`CreateUserResult`) |
| Erreur d'autorisation | `GraphQLError` avec `extensions.code: 'FORBIDDEN'` |
| Erreur technique (500) | Masquer le détail en prod, logger côté serveur |

```ts
import { GraphQLError } from 'graphql';

// Erreur d'autorisation
throw new GraphQLError('Access denied', {
  extensions: { code: 'FORBIDDEN', http: { status: 403 } },
});
```

---

### 6. Subscriptions (real-time)

Protocole recommandé 2026 : `graphql-ws` (supercède `subscriptions-transport-ws` déprécié).

```ts
// Apollo Server + graphql-ws + Redis Pub/Sub
import { RedisPubSub } from 'graphql-redis-subscriptions';
const pubsub = new RedisPubSub({ connection: process.env.REDIS_URL });

const resolvers = {
  Subscription: {
    messageAdded: {
      subscribe: (_root, { channelId }, ctx) => {
        if (!ctx.user) throw new GraphQLError('Unauthenticated');
        return pubsub.asyncIterableIterator(`CHANNEL_${channelId}`);
      },
    },
  },
  Mutation: {
    sendMessage: async (_root, { input }, ctx) => {
      const msg = await db.messages.create({ data: input });
      await pubsub.publish(`CHANNEL_${input.channelId}`, { messageAdded: msg });
      return msg;
    },
  },
};
```

**Multi-instance** : toujours utiliser un bus externe (Redis) — un EventEmitter in-memory ne fonctionne que sur une seule instance.

---

### 7. Federation (microservices)

Utiliser Apollo Federation v2 quand plusieurs équipes ownt des domaines distincts.

```graphql
# Sous-graphe "users"
type User @key(fields: "id") {
  id: ID!
  email: String!
}

# Sous-graphe "posts" — étend l'entité User
type User @key(fields: "id") @extends {
  id: ID! @external
  posts: [Post!]!
}
```

**Coût opérationnel** : gateway supplémentaire, schema registry, composition à valider en CI. Ne pas fédérer un monolithe si l'équipe est < 5 devs.

---

### 8. Sécurité et performance en production

```ts
// Depth limiting + complexity scoring (Apollo Server)
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs, resolvers,
  validationRules: [
    depthLimit(7),
    createComplexityLimitRule(1000),
  ],
});
```

**Persisted queries** (Apollo) : le client envoie un hash SHA-256, le serveur valide contre une allowlist. Bloque les requêtes arbitraires en prod.

```bash
# Générer le manifest avec Rover CLI
rover graph introspect http://localhost:4000 > schema.graphql
rover persisted-queries publish --graph-id MY_GRAPH --manifest manifest.json
```

---

## Anti-patterns et pièges

| Piège | Solution |
|---|---|
| Résolveurs sans DataLoader → N+1 | DataLoader systématique sur toutes les relations |
| Nullable partout par confort | Réfléchir explicitement à chaque `!` |
| Exposer l'erreur DB brute en prod | Masquer, logger, renvoyer un code générique |
| Mutations sans input type | Toujours un `XxxInput` — facilite les évolutions |
| Federation prématurée | Schéma monolithique d'abord, fedérer quand la friction inter-équipes est réelle |
| `any` en TypeScript dans les résolveurs | Utiliser `graphql-codegen` pour typer automatiquement |
| Subscriptions sur un EventEmitter in-memory | Redis Pub/Sub ou NATS pour multi-instance |
| Pas de rate limiting sur les queries | Complexity scoring + IP rate-limit sur le endpoint |

---

## Outils recommandés 2026

| Besoin | Outil |
|---|---|
| Codegen types TS depuis SDL | `@graphql-codegen/cli` |
| Linter schéma | `@graphql-inspector/cli` |
| Test résolveurs | `graphql-tester`, Jest + `@apollo/server-integration-testing` |
| Exploration API | GraphiQL, Apollo Sandbox, Insomnia |
| .NET | Hot Chocolate 14+ (source generators, AOT) |
| Python | Strawberry (type-first, async natif) |
| Monitoring | Apollo Studio, Stellate (edge caching) |


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
