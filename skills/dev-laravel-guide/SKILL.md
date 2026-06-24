---
name: dev-laravel-guide
description: Développement PHP Laravel avec Eloquent ORM, Blade templates, migrations, middleware, queues et Sanctum. Se déclenche avec "Laravel", "Eloquent", "Blade", "artisan", "migration Laravel", "PHP Laravel".
---

# Guide Laravel

## 1. Choisir l'architecture cible

| Besoin | Architecture recommandée |
|---|---|
| API REST mobile/SPA | Laravel + Sanctum, `routes/api.php`, resources JSON |
| Full-stack SSR | MVC classique + Blade + Livewire |
| Back-office réactif | Inertia.js + Vue/React via Breeze/Jetstream |
| Monolithe modulaire | DDD : `app/Modules/{Domain}/` avec Services + Repositories |

Commande de départ selon le preset :
```bash
composer create-project laravel/laravel mon-app   # blank
composer create-project laravel/breeze            # auth + Blade/Inertia
php artisan install:api                           # ajoute routes/api.php + Sanctum (Laravel 11+)
```

## 2. Structure du projet

```
app/
  Http/
    Controllers/      # thin controllers — pas de logique métier
    Requests/         # validation ici UNIQUEMENT
    Resources/        # transformation JSON (API)
    Middleware/
  Models/             # Eloquent — relations, casts, scopes
  Services/           # logique métier testable
  Actions/            # une classe = une opération (Action pattern)
  Repositories/       # abstraction BDD si DDD
  Jobs/               # tâches async
  Policies/           # autorisation
```

## 3. Models Eloquent

```php
// Génération
php artisan make:model Product -mfsc   # model + migration + factory + seeder + controller

// Relations
public function orders(): HasMany
{
    return $this->hasMany(Order::class);
}

// Cast + Accessor (Laravel 9+)
protected $casts = ['price' => 'decimal:2', 'meta' => 'array'];

protected function fullName(): Attribute
{
    return Attribute::make(
        get: fn () => "{$this->first_name} {$this->last_name}",
    );
}

// Scope local réutilisable
public function scopeActive(Builder $query): Builder
{
    return $query->where('status', 'active');
}
// usage : Product::active()->paginate(20);
```

**Eager loading — obligatoire** :
```php
// MAUVAIS — N+1
foreach (Order::all() as $order) { echo $order->user->name; }

// BON
Order::with('user', 'items.product')->paginate(50);

// Détecter en dev
Model::preventLazyLoading(! app()->isProduction());  // dans AppServiceProvider
```

## 4. Controllers et routes

```php
// Controller ressource
php artisan make:controller ProductController --resource --model=Product

// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('products', ProductController::class);
    Route::post('products/{product}/publish', [ProductController::class, 'publish']);
});

// Controller thin
public function store(StoreProductRequest $request): JsonResponse
{
    $product = $this->productService->create($request->validated());
    return new ProductResource($product);
}
```

**API Resources** pour contrôler la sérialisation :
```php
php artisan make:resource ProductResource
// Dans la resource :
return ['id' => $this->id, 'price' => $this->price_formatted];
```

## 5. Validation avec Form Requests

```bash
php artisan make:request StoreProductRequest
```
```php
public function rules(): array
{
    return [
        'name'     => ['required', 'string', 'max:255'],
        'price'    => ['required', 'numeric', 'min:0'],
        'category' => ['required', Rule::in(Category::pluck('slug'))],
    ];
}
// authorize() retourne true si gate/policy gérée ailleurs
```

Jamais de `$request->validate()` dans le controller si la logique est réutilisable.

## 6. Migrations et base de données

```php
// Création
php artisan make:migration create_products_table

// Schema Builder
Schema::create('products', function (Blueprint $table) {
    $table->id();
    $table->foreignId('category_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->decimal('price', 10, 2);
    $table->json('meta')->nullable();
    $table->timestamps();
    $table->index(['category_id', 'price']); // index composite
});

// Commandes courantes
php artisan migrate:fresh --seed     # reset dev
php artisan migrate --step           # une migration à la fois
php artisan migrate:rollback --step=2
```

## 7. Authentification et autorisation

```bash
# Sanctum (API tokens + SPA)
php artisan install:api
# Passport (OAuth2 complet)
php artisan passport:install
```

```php
// Policy
php artisan make:policy ProductPolicy --model=Product

public function update(User $user, Product $product): bool
{
    return $user->id === $product->user_id || $user->hasRole('admin');
}

// Dans le controller
$this->authorize('update', $product);
```

Gates pour les actions non liées à un model :
```php
Gate::define('access-dashboard', fn (User $u) => $u->is_admin);
```

## 8. Queues et Jobs

```bash
php artisan make:job SendWelcomeEmail
php artisan queue:work redis --tries=3 --backoff=60
php artisan queue:failed          # voir les jobs échoués
php artisan queue:retry all
```

```php
// Dispatch
SendWelcomeEmail::dispatch($user)->onQueue('emails')->delay(now()->addMinutes(2));

// Dans le Job
public function handle(): void { /* pas d'injection lourde ici */ }
public function failed(Throwable $e): void { /* log, alerter */ }
```

Scheduler (Laravel 11 : `routes/console.php`) :
```php
Schedule::job(GenerateReportsJob::class)->dailyAt('02:00')->withoutOverlapping();
```

## 9. Tests

```bash
php artisan make:test ProductTest          # PHPUnit feature test
php artisan make:test ProductUnitTest --unit
php artisan test --filter ProductTest --parallel
```

```php
// Feature test API
public function test_user_can_create_product(): void
{
    $user = User::factory()->create();
    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/products', ['name' => 'Widget', 'price' => 9.99]);

    $response->assertCreated()->assertJsonPath('data.name', 'Widget');
    $this->assertDatabaseHas('products', ['name' => 'Widget', 'user_id' => $user->id]);
}

// Mock d'un service
$this->mock(PaymentGateway::class, fn ($mock) =>
    $mock->shouldReceive('charge')->once()->andReturn(true)
);
```

## 10. Optimisation et déploiement

```bash
# Cache tout pour la prod
php artisan optimize        # config + routes + views
php artisan icons:cache     # si Blade Icons
php artisan event:cache

# Rollback rapide
php artisan optimize:clear

# Horizon (Redis queues dashboard)
composer require laravel/horizon && php artisan horizon:install
```

Variables `.env` critiques en prod :
```
APP_ENV=production
APP_DEBUG=false
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
LOG_CHANNEL=stack
```

## Anti-patterns et garde-fous

| Anti-pattern | Solution |
|---|---|
| Logique métier dans le controller | Extraire dans un `Service` ou `Action` |
| `User::all()` sans limit | Toujours paginer : `->paginate(20)` |
| Relations lazy loadées en boucle | `Model::with(...)` ou `preventLazyLoading()` |
| `dd()` oublié en prod | `ray()` en dev uniquement, `Log::` en prod |
| Migrations irréversibles sans `down()` | Toujours implémenter `down()` |
| Secrets dans le code | `.env` + `config/services.php`, jamais en dur |
| `$fillable = ['*']` ou `$guarded = []` | Lister explicitement les champs fillable |
| Jobs sans timeout | Définir `public $timeout = 60;` et `$tries = 3` |
| Test sans RefreshDatabase | Utiliser le trait pour isolation |

## Références rapides

```bash
php artisan route:list --path=api      # lister routes API
php artisan tinker                     # REPL Eloquent
php artisan model:show Product         # inspect model
php artisan db:monitor                 # surveiller les connexions
php artisan about                      # infos environnement
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
