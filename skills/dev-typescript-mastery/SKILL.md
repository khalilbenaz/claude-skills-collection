---
name: dev-typescript-mastery
description: Maîtrise de TypeScript avec types avancés et patterns. Se déclenche avec "TypeScript", "TS", "types", "generics", "interface", "type guard", "utility types", "strict mode", "tsconfig".
---

# TypeScript Mastery

## Workflow

1. **Configuration stricte** : Activer `"strict": true` dans `tsconfig.json` (active `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`), configurer `paths` pour les alias d'imports (`@/components`), choisir le bon `moduleResolution` (`bundler` pour Vite/esbuild, `node16` pour Node), définir `target` selon l'environnement cible, utiliser `references` pour les monorepos.

2. **Types fondamentaux** : Maîtriser les union types (`string | number`), intersection types (`A & B`), literal types (`"GET" | "POST"`), tuple types (`[string, number]`), enums (préférer `const enum` ou union de literals), branded types (`type UserId = string & { readonly _brand: "UserId" }`) pour éviter les confusions de primitives.

3. **Generics avancés** : Écrire des génériques avec constraints (`<T extends object>`), utiliser les conditional types (`T extends U ? X : Y`), le mot-clé `infer` pour extraire des types (`infer R`), les mapped types (`{ [K in keyof T]: ... }`), les template literal types (`\`${string}Id\``), combiner pour des types puissants et expressifs.

4. **Utility types** : Maîtriser les built-ins (`Partial<T>`, `Required<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, `Readonly<T>`, `ReturnType<F>`, `Parameters<F>`, `Awaited<T>`), créer des utilities custom réutilisables (`DeepPartial<T>`, `NonNullableFields<T>`), documenter leur usage avec des exemples.

5. **Type guards et narrowing** : Utiliser `typeof`, `instanceof`, `in` pour le narrowing automatique, créer des user-defined type guards (`function isUser(x): x is User`), exploiter les discriminated unions (`type Shape = Circle | Square` avec `kind` discriminant), écrire des assertion functions (`function assert(cond): asserts cond`), éviter les `as` casts non justifiés.

6. **Patterns TypeScript** : Implémenter le builder pattern typé avec méthodes chaînées, le Result type (`type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`), les branded types pour les IDs métier, la validation runtime avec `zod` (inférence du schema vers type TS), le pattern Repository typé avec generics.

7. **Types pour les APIs** : Créer des clients API type-safe avec `fetch` + types générés, utiliser `tRPC` pour les APIs full-stack typées end-to-end, `Zodios` pour les clients REST avec validation, générer des types depuis OpenAPI avec `openapi-typescript`, typer les réponses avec des discriminated unions selon le status HTTP.

8. **Debugging des types** : Lire les messages d'erreur TS (déplier les types complexes dans l'IDE), utiliser `type Debug<T> = { [K in keyof T]: T[K] }` pour "aplatir" les types, tester les types avec `@ts-expect-error` et `tsd`, activer `"verbatimModuleSyntax"` pour clarifier les imports de types, utiliser `satisfies` pour valider sans widening.

## Règles

- Activer `strict: true` sans exception ; les raccourcis type-unsafe (`any`, `as`, `!`) créent des dettes techniques qui explosent en production.
- Préférer les `type` aliases pour les unions/intersections et les `interface` pour les shapes extensibles ; utiliser `interface` quand on anticipe le merging de déclarations.
- Ne jamais utiliser `any` : remplacer par `unknown` avec narrowing, `never` pour les branches impossibles, ou des generics pour la flexibilité.
- Générer les types depuis la source de vérité (schéma DB, OpenAPI, Zod schema) plutôt que les écrire manuellement pour éviter la désynchro.
- Expliquer les types complexes avec des commentaires JSDoc (`/** */`) ; un type bien nommé avec un commentaire vaut mieux qu'un type inline incompréhensible.


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
