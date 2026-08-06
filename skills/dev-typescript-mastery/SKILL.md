---
name: dev-typescript-mastery
description: Maîtrise de TypeScript avec types avancés et patterns. Se déclenche avec "TypeScript", "TS", "types", "generics", "interface", "type guard", "utility types", "strict mode", "tsconfig". Also triggers on "TypeScript types", "fix this type error".
---

# TypeScript Mastery

## 1. Configuration — point de départ obligatoire

**tsconfig.json minimal recommandé (2026) :**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "moduleResolution": "bundler",   // Vite/esbuild/webpack5
    // "moduleResolution": "node16", // Node pur (CJS/ESM hybride)
    "verbatimModuleSyntax": true,    // clarifie import type vs import
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**Critères de choix `moduleResolution` :**
| Contexte | Valeur |
|---|---|
| Vite, esbuild, webpack 5 | `bundler` |
| Node 18+ natif (ESM) | `node16` ou `nodenext` |
| Lib publiée NPM | `node16` |
| Legacy CJS | `node` |

**Monorepo :** utiliser `references` + `composite: true` par package pour éviter que tsc recompile tout.

---

## 2. Types fondamentaux — choisir la bonne construction

```typescript
// Union + literal types — préférer aux enums
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// Branded types — évite les confusions de primitives
type UserId = string & { readonly _brand: "UserId" };
type OrderId = string & { readonly _brand: "OrderId" };
const toUserId = (s: string): UserId => s as UserId; // cast unique et localisé

// Tuple typé
type Pair<A, B> = [A, B];
const pair: Pair<string, number> = ["age", 30];

// Discriminated union — exhaustivité vérifiée par TS
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "rect":   return s.w * s.h;
    // TS erreur si un cas manque (avec noImplicitReturns)
  }
}
```

**`type` vs `interface` :**
- `interface` → shape d'objet qu'on va étendre ou merger (lib publique, OOP).
- `type` → union, intersection, mapped type, alias de primitive. Par défaut utiliser `type`.

---

## 3. Generics avancés

```typescript
// Constraint + conditional type + infer
type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
// UnwrapPromise<Promise<User>> => User

// Mapped type : rendre tous les champs optionnels et readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Template literal type
type EventName<T extends string> = `on${Capitalize<T>}`;
// EventName<"click"> => "onClick"

// NoUndefined sur les clés optionnelles
type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
```

---

## 4. Utility types — référence rapide

| Built-in | Usage concret |
|---|---|
| `Partial<T>` | Formulaire de mise à jour partielle |
| `Required<T>` | Forcer tous les champs après validation |
| `Pick<T, K>` | Projeter une sous-forme |
| `Omit<T, K>` | Exclure password d'un DTO user |
| `Record<K, V>` | Map statique clé-valeur |
| `Readonly<T>` | Config immuable |
| `ReturnType<F>` | Typer le retour d'une fonction inconnue |
| `Awaited<T>` | Déballer le type d'une Promise |
| `Parameters<F>` | Forwarding d'arguments |
| `NonNullable<T>` | Après un guard null |

```typescript
// Utility custom DeepPartial
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
```

---

## 5. Type guards et narrowing

```typescript
// User-defined type guard
function isUser(x: unknown): x is User {
  return typeof x === "object" && x !== null && "id" in x && "email" in x;
}

// Assertion function (throw si faux)
function assertDefined<T>(val: T | undefined, msg: string): asserts val is T {
  if (val === undefined) throw new Error(msg);
}

// Exhaustive check avec never
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}
// Placer en default d'un switch sur discriminated union
```

---

## 6. Patterns métier

**Result type (gestion d'erreurs sans exception) :**
```typescript
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

async function fetchUser(id: UserId): Promise<Result<User>> {
  try {
    const data = await api.get(`/users/${id}`);
    return { ok: true, value: data };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}
// Consommateur forcé de gérer les deux cas
```

**Validation runtime → types TS avec Zod :**
```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});
type User = z.infer<typeof UserSchema>; // source de vérité unique

const user = UserSchema.parse(rawJson); // throw si invalide
const safe  = UserSchema.safeParse(rawJson); // safe.success / safe.data
```

**Repository générique typé :**
```typescript
interface Repository<T, Id> {
  findById(id: Id): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: Id): Promise<void>;
}
class UserRepo implements Repository<User, UserId> { ... }
```

---

## 7. APIs type-safe

```typescript
// Génération depuis OpenAPI (zero runtime overhead)
// npx openapi-typescript openapi.yaml -o src/api.d.ts

import type { paths } from "./api";
import createClient from "openapi-fetch";

const client = createClient<paths>({ baseUrl: "/api" });
const { data, error } = await client.GET("/users/{id}", {
  params: { path: { id: "123" } },
});
// data est typé automatiquement selon le schéma OpenAPI
```

---

## 8. Debugging des types

```typescript
// "Aplatir" un type complexe pour le lire dans l'IDE
type Prettify<T> = { [K in keyof T]: T[K] } & {};

// satisfies — valide sans widening (TS 4.9+)
const config = {
  port: 3000,
  host: "localhost",
} satisfies Record<string, string | number>;
// config.port reste number (pas string | number)

// Tester les types à la compilation
import { expectType, expectError } from "tsd";
expectType<User>(parseUser(raw));
expectError(parseUser(123));

// @ts-expect-error — documenter une erreur intentionnelle
// @ts-expect-error — version legacy de l'API
legacyCall();
```

---

## 9. Anti-patterns et pièges

| Anti-pattern | Problème | Remède |
|---|---|---|
| `any` partout | Désactive le type checker | `unknown` + narrowing |
| `as Type` sans validation | Cast dangereux silencieux | Zod parse ou type guard |
| `!` non-null assertion | Exception runtime non détectée | `assertDefined()` ou `?.` |
| `enum` standard | Génère du JS runtime, tree-shaking difficile | `const enum` ou union de literals |
| Types écrits manuellement dupliquant le schéma DB/API | Désynchronisation garantie | Générer depuis OpenAPI / Prisma / Zod |
| `noUncheckedIndexedAccess: false` | `arr[0]` peut être `undefined` sans avertissement | Activer et gérer le `T \| undefined` |
| Ignorer `exactOptionalPropertyTypes` | `{ a?: string }` accepte `{ a: undefined }` | Activer pour distinguer absent vs undefined |
| `Object` ou `{}` comme type générique | Trop permissif, accepte tout | `object`, `Record<string, unknown>` |

---

## 10. Bonnes pratiques 2026

- **Générer, ne pas écrire** les types depuis la source de vérité : Prisma → types DB, OpenAPI → types API, Zod schema → types métier.
- **`satisfies`** plutôt que `: Type` quand on veut garder le type inféré précis tout en le validant.
- **`verbatimModuleSyntax`** obligatoire : sépare clairement `import type` (zéro runtime) de `import` (runtime).
- **Commenter avec JSDoc** (`/** */`) les types publics : les IDE affichent le commentaire au hover, indispensable pour les libs internes.
- **`tsd`** ou `@vitest/expect-type` pour les tests de types dans la CI : évite les régressions silencieuses.
- **`ts-reset`** (Matt Pocock) pour corriger les types stdlib surprenants (`JSON.parse` → `unknown`, `Array.isArray` correct, etc.).


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
