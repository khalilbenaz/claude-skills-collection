---
name: dev-angular-guide
description: Développement d'applications Angular avec modules, composants, services, RxJS, routing et formulaires réactifs. Se déclenche avec "Angular", "NgModule", "RxJS", "Angular CLI", "composant Angular", "service Angular".
---

# Guide Angular

## Workflow

1. **Analyser le besoin** — Identifier le type d'application (dashboard, portail entreprise, PWA) et définir l'architecture : standalone components vs NgModules, stratégie de lazy loading, et choix de la gestion d'état (NgRx, signals, ou services simples).

2. **Structurer le projet** — Organiser en feature modules avec Angular CLI : `core/` pour les services singleton, `shared/` pour les composants et pipes réutilisables, et un dossier par feature contenant composants, services, models et guards associés.

3. **Créer les composants** — Développer les composants avec le décorateur `@Component`, utiliser les signals Angular pour l'état réactif (`signal()`, `computed()`, `effect()`), configurer `changeDetection: OnPush` pour les performances, et gérer les inputs/outputs typés.

4. **Implémenter les services et l'injection de dépendances** — Créer les services avec `@Injectable({ providedIn: 'root' })`, utiliser le système d'injection hiérarchique d'Angular, et implémenter les interceptors HTTP pour l'authentification et la gestion des erreurs.

5. **Gérer les flux asynchrones avec RxJS** — Utiliser les opérateurs RxJS essentiels (`switchMap`, `mergeMap`, `combineLatest`, `debounceTime`), gérer les souscriptions avec le pattern `async` pipe dans les templates, et éviter les memory leaks avec `takeUntilDestroyed()`.

6. **Configurer le routing** — Définir les routes avec lazy loading (`loadComponent`, `loadChildren`), implémenter les guards fonctionnels (`canActivate`, `canMatch`), les resolvers pour le pre-fetching, et les stratégies de preloading.

7. **Implémenter les formulaires** — Utiliser les Reactive Forms avec `FormBuilder`, `FormGroup` et `FormArray`, créer des validateurs custom synchrones et asynchrones, et gérer l'affichage des erreurs de validation de manière centralisée.

8. **Tester et déployer** — Écrire des tests unitaires avec Jasmine/Karma ou Jest, des tests d'intégration avec TestBed, configurer les environnements de build, et optimiser le bundle avec le tree-shaking et le build AOT.

## Règles

- Privilégie les standalone components et les signals Angular plutôt que les NgModules classiques pour les nouveaux projets.
- Utilise toujours le pipe `async` ou `toSignal()` dans les templates plutôt que des souscriptions manuelles dans les composants.
- Active systématiquement `changeDetection: OnPush` sur chaque composant pour éviter les cycles de détection inutiles.
- Ne place jamais de logique métier dans les composants — délègue aux services injectables pour la testabilité et la réutilisabilité.
- Gère toujours les erreurs HTTP dans les interceptors et les services, jamais directement dans les composants.


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
