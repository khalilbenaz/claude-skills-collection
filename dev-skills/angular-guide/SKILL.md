---
name: angular-guide
description: Développement d'applications Angular avec modules, composants, services, RxJS, routing et formulaires réactifs. Se déclenche avec "Angular", "NgModule", "RxJS", "Angular CLI", "composant Angular", "service Angular".
---

# Guide Angular (v17+)

## 1. Initialisation du projet

```bash
npm install -g @angular/cli
ng new my-app --routing --style=scss --standalone
cd my-app && ng serve
```

**Critère de décision — standalone vs NgModule**
| Situation | Recommandation |
|---|---|
| Nouveau projet (v17+) | Standalone components (défaut CLI) |
| Migration progressive | Hybrid : `ng generate component --standalone` |
| Legacy codebase | Maintenir NgModules, migrer par feature |

Structure cible pour un projet moyen :
```
src/app/
  core/           # services singleton, interceptors, guards globaux
  shared/         # composants, pipes, directives réutilisables
  features/
    orders/       # composant, service, model, route propres à la feature
    users/
  app.routes.ts
  app.config.ts
```

---

## 2. Composants standalone et Signals

```typescript
// signal-counter.component.ts
import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Count: {{ count() }}</p>
    <p>Double: {{ double() }}</p>
    <button (click)="increment()">+1</button>
  `,
})
export class SignalCounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);

  constructor() {
    effect(() => console.log('count changed:', this.count()));
  }

  increment() { this.count.update(c => c + 1); }
}
```

**Règle** : `ChangeDetectionStrategy.OnPush` est obligatoire. Avec les signals, la détection est automatiquement granulaire — pas besoin de `markForCheck()`.

**Input typés (v17.1+)**
```typescript
// signal inputs
readonly userId = input.required<number>();
readonly label = input<string>('default');
// output
readonly selected = output<User>();
```

---

## 3. Services et injection de dépendances

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private cache = new Map<number, User>();

  getUser(id: number): Observable<User> {
    if (this.cache.has(id)) return of(this.cache.get(id)!);
    return this.http.get<User>(`/api/users/${id}`).pipe(
      tap(u => this.cache.set(id, u)),
      catchError(err => { throw new UserError(err); })
    );
  }
}
```

**inject() vs constructor DI** : Préfère `inject()` dans les standalone components et les fonctions (guards, resolvers). Le constructeur reste valide dans les services.

---

## 4. RxJS — opérateurs essentiels

```typescript
// Recherche avec debounce + annulation automatique
search$ = this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  filter(q => q.length > 2),
  switchMap(q => this.api.search(q)),   // annule la requête précédente
  takeUntilDestroyed(),                 // cleanup automatique (v16+)
);

// Combiner plusieurs sources
data$ = combineLatest({
  users: this.userService.getAll(),
  roles: this.roleService.getAll(),
}).pipe(
  map(({ users, roles }) => users.map(u => ({
    ...u, roleName: roles.find(r => r.id === u.roleId)?.name
  })))
);
```

**Choisir le bon opérateur de flatten :**
| Cas d'usage | Opérateur |
|---|---|
| Requête HTTP (annuler la précédente) | `switchMap` |
| Upload parallèle | `mergeMap` |
| Requêtes en séquence | `concatMap` |
| Ignorer si déjà en cours | `exhaustMap` |

**Éviter les memory leaks :**
```typescript
// Option 1 — async pipe (recommandé dans les templates)
// Option 2 — takeUntilDestroyed() dans le constructeur/ngOnInit
// Option 3 — toSignal() convertit Observable → Signal (se désinscrit auto)
readonly users = toSignal(this.userService.getAll(), { initialValue: [] });
```

---

## 5. Routing avec lazy loading

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders.component')
      .then(m => m.OrdersComponent),
    canActivate: [authGuard],
    resolve: { orders: ordersResolver },
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes')
      .then(m => m.ADMIN_ROUTES),
    canMatch: [adminGuard],   // bloque même le téléchargement du chunk
  },
];
```

**Guard fonctionnel (v15+) :**
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

**Resolver typé :**
```typescript
export const ordersResolver: ResolveFn<Order[]> = () =>
  inject(OrderService).getAll();
```

---

## 6. Formulaires réactifs

```typescript
@Component({ standalone: true, imports: [ReactiveFormsModule] })
export class UserFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email], [this.uniqueEmailValidator()]],
    address: this.fb.group({
      city: ['', Validators.required],
    }),
  });

  // Validateur asynchrone (ex: vérification serveur)
  private uniqueEmailValidator(): AsyncValidatorFn {
    return ctrl => this.userService.checkEmail(ctrl.value).pipe(
      map(taken => taken ? { emailTaken: true } : null),
      catchError(() => of(null)),
    );
  }

  submit() {
    if (this.form.invalid) return;
    this.userService.create(this.form.getRawValue()).subscribe();
  }
}
```

Template affichage d'erreur :
```html
<input formControlName="name" />
@if (form.get('name')?.errors?.['required'] && form.get('name')?.touched) {
  <span class="error">Champ requis</span>
}
```

---

## 7. Interceptors HTTP

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401) inject(AuthService).logout();
      return throwError(() => err);
    })
  );
};

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
```

---

## 8. Tests

```typescript
// Service unitaire
it('getUser retourne depuis cache', () => {
  const { service } = TestBed.inject(UserService);
  // ...
});

// Composant avec TestBed
beforeEach(() => TestBed.configureTestingModule({
  imports: [SignalCounterComponent],
}));

it('incrémenter le compteur', () => {
  const fixture = TestBed.createComponent(SignalCounterComponent);
  fixture.detectChanges();
  fixture.nativeElement.querySelector('button').click();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('p').textContent).toContain('1');
});
```

Commandes :
```bash
ng test --code-coverage          # Karma (défaut)
# ou avec Jest :
jest --coverage --watchAll=false
```

---

## Anti-patterns et pièges

| Piège | Correction |
|---|---|
| Souscrire manuellement dans le composant (`subscribe()` sans cleanup) | `async pipe`, `toSignal()`, ou `takeUntilDestroyed()` |
| Logique métier dans le template | Déplacer dans un `computed()` ou un service |
| `any` pour les réponses HTTP | Typer avec `this.http.get<User[]>(...)` |
| Guard via classe (`CanActivate`) | Guard fonctionnel (`CanActivateFn`) — classes dépréciées v15+ |
| `NgModule` imports inutiles dans un standalone | Importer uniquement ce qui est utilisé dans le composant |
| `ngOnDestroy` + `Subject`/`takeUntil` | Remplacer par `takeUntilDestroyed()` (plus simple, moins de code) |
| Appeler une méthode dans le template `{{ getLabel() }}` | Utiliser `computed()` ou `pipe` pur pour éviter les re-exécutions |
| `ChangeDetectionStrategy.Default` | Toujours `OnPush` — meilleure performance, détection contrôlée |

---

## Commandes CLI fréquentes

```bash
ng generate component features/orders/order-list --standalone --skip-tests=false
ng generate service core/auth --skip-tests=false
ng generate guard core/auth --functional
ng generate pipe shared/truncate --standalone
ng build --configuration production   # bundle AOT + tree-shaking
ng update @angular/core @angular/cli  # mise à jour majeure
npx nx affected:test                  # si monorepo Nx
```
