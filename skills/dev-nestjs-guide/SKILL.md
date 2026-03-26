---
name: dev-nestjs-guide
description: Développement backend NestJS avec modules, controllers, providers, pipes, guards et interceptors. Se déclenche avec "NestJS", "Nest.js", "module NestJS", "controller NestJS", "decorator NestJS".
---

# Guide NestJS

## Workflow

1. **Analyser le besoin** — Identifier le type de backend (API REST, GraphQL, microservices, WebSocket) et définir l'architecture modulaire : découpage en feature modules, choix de l'ORM (TypeORM, Prisma, MikroORM), et stratégie d'authentification.

2. **Structurer le projet** — Organiser en modules NestJS avec la CLI (`nest g module/controller/service`). Chaque feature module contient ses controllers, services, DTOs, entities et guards. Configurer le `CoreModule` pour les services transversaux et le `SharedModule` pour les éléments réutilisables.

3. **Implémenter les controllers** — Créer les controllers avec les décorateurs de route (`@Get`, `@Post`, `@Put`, `@Delete`), typer les paramètres avec `@Param`, `@Query`, `@Body`, configurer les interceptors de sérialisation, et documenter avec `@ApiTags` et `@ApiOperation` pour Swagger.

4. **Développer les providers et services** — Créer les services injectables avec `@Injectable()`, implémenter le repository pattern pour l'accès aux données, utiliser les custom providers (`useFactory`, `useValue`, `useClass`) pour la configuration dynamique et les connexions externes.

5. **Configurer les pipes et la validation** — Utiliser `ValidationPipe` global avec `class-validator` et `class-transformer` pour la validation automatique des DTOs. Créer des pipes custom pour les transformations spécifiques et activer `whitelist` et `forbidNonWhitelisted`.

6. **Implémenter les guards et l'authentification** — Créer les guards avec `@UseGuards()` pour l'authentification JWT via Passport, les rôles avec `@Roles()` et un `RolesGuard` custom, et les permissions granulaires avec CASL ou un système custom.

7. **Gérer les interceptors et middleware** — Développer des interceptors pour le logging, la transformation de réponse, le cache et la gestion des timeouts. Configurer les middleware pour le rate limiting, la compression, les CORS et les headers de sécurité avec Helmet.

8. **Tester et déployer** — Écrire des tests unitaires avec Jest et le `TestingModule`, des tests e2e avec Supertest, mocker les dépendances avec `createMock()`. Configurer le déploiement Docker avec health checks et graceful shutdown.

## Règles

- Respecte toujours l'architecture modulaire NestJS — chaque feature doit avoir son propre module avec ses dépendances déclarées explicitement.
- Utilise systématiquement les DTOs avec `class-validator` pour valider toutes les entrées — ne fais jamais confiance aux données brutes du client.
- Injecte les dépendances via le constructeur plutôt que d'instancier manuellement — laisse le conteneur IoC de NestJS gérer le cycle de vie.
- Implémente toujours la gestion d'erreurs avec des `HttpException` typées et des exception filters custom pour un format de réponse cohérent.
- Sépare la logique métier dans les services et la logique de transport dans les controllers — un service ne doit jamais dépendre du protocole HTTP.
