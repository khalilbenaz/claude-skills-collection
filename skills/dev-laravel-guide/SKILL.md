---
name: dev-laravel-guide
description: Développement PHP Laravel avec Eloquent ORM, Blade templates, migrations, middleware, queues et Sanctum. Se déclenche avec "Laravel", "Eloquent", "Blade", "artisan", "migration Laravel", "PHP Laravel".
---

# Guide Laravel

## Workflow

1. **Analyser le besoin** — Identifier le type d'application (API REST, application web full-stack, back-office) et définir l'architecture : MVC classique Laravel, DDD avec services et repositories, ou API-only avec Sanctum/Passport pour l'authentification.

2. **Structurer le projet** — Organiser avec les conventions Laravel : `app/Models/` pour Eloquent, `app/Http/Controllers/` avec des controllers ressource, `app/Services/` pour la logique métier, `app/Repositories/` pour l'abstraction des données, et `app/Http/Requests/` pour la validation des formulaires.

3. **Concevoir les models Eloquent** — Définir les models avec les relations (`hasMany`, `belongsTo`, `morphMany`, `belongsToMany`), les scopes locaux et globaux, les mutators et accessors (`Attribute::make()`), les casts, et les événements de model (`creating`, `updating`).

4. **Implémenter les controllers et routes** — Créer les controllers ressource avec `artisan make:controller --resource`, définir les routes dans `routes/api.php` et `routes/web.php`, utiliser le route model binding implicite, et grouper les routes avec middleware et préfixes.

5. **Gérer les migrations et seeders** — Écrire les migrations avec le Schema Builder, configurer les foreign keys et les index, créer les seeders et factories avec Faker pour les données de test, et utiliser `artisan migrate:fresh --seed` pour réinitialiser l'environnement de développement.

6. **Implémenter les Blade templates** — Créer les layouts avec `@extends` et `@yield`, les composants Blade avec `<x-component>`, les slots nommés, les directives custom, et utiliser Livewire ou Inertia.js pour l'interactivité sans quitter l'écosystème Laravel.

7. **Configurer les queues et jobs** — Implémenter les jobs asynchrones avec `dispatch()`, configurer les queues (Redis, SQS, database), gérer les retries et les failed jobs, planifier les tâches récurrentes avec le scheduler dans `app/Console/Kernel.php`.

8. **Tester et déployer** — Écrire des tests avec PHPUnit et les helpers Laravel (`actingAs`, `assertDatabaseHas`), utiliser les factories pour les données de test, configurer le déploiement avec Laravel Forge, Envoyer ou Docker, et optimiser avec `artisan optimize`.

## Règles

- Utilise toujours les Form Requests (`php artisan make:request`) pour la validation plutôt que de valider directement dans le controller.
- Charge les relations Eloquent avec `with()` (eager loading) pour éviter le problème N+1 — ne fais jamais de lazy loading en boucle.
- Ne place jamais de logique métier dans les controllers ou les models — délègue aux services et actions pour la testabilité.
- Protège toujours les routes sensibles avec les middleware d'authentification (`auth:sanctum`) et d'autorisation (policies et gates).
- Utilise les queues pour toutes les opérations longues (envoi d'emails, traitement d'images, appels API externes) afin de ne jamais bloquer la requête HTTP.


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
