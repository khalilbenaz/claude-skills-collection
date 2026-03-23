---
name: rest-api-designer
description: Conception d'APIs REST conformes aux standards et bonnes pratiques. Se déclenche avec "API REST", "concevoir une API", "endpoints", "REST design", "resource naming", "HTTP methods", "API versioning", "pagination".
---

# REST API Designer

## Workflow
1. **Identification des ressources et relations** : Analyser le modèle de domaine, identifier les entités principales et leurs associations, mapper chaque ressource vers un endpoint (ex. `/users`, `/orders/{id}/items`).
2. **Design des endpoints** : Appliquer les conventions de nommage (noms pluriels, kebab-case), choisir les verbes HTTP appropriés (GET, POST, PUT, PATCH, DELETE), définir les codes de statut attendus (200, 201, 204, 400, 401, 403, 404, 409, 422).
3. **Pagination, filtrage et tri** : Implémenter la pagination cursor-based pour les grands ensembles (`?cursor=xxx&limit=20`) ou offset (`?page=1&size=20`), exposer les filtres via query params (`?status=active&created_after=2025-01-01`), standardiser le tri (`?sort=created_at:desc`).
4. **Versioning strategy** : Choisir la stratégie adaptée — URL path (`/v1/users`) pour la visibilité, header (`Accept: application/vnd.api+json;version=2`) pour la propreté sémantique, ou query param (`?api-version=2`) ; documenter la politique de dépréciation.
5. **Error handling standardisé** : Adopter RFC 7807 Problem Details (`Content-Type: application/problem+json`) avec `type`, `title`, `status`, `detail`, `instance` ; ajouter des codes d'erreur custom (`"code": "USER_ALREADY_EXISTS"`) pour le traitement programmatique côté client.
6. **Authentication et authorization** : Sécuriser avec JWT (Bearer token), OAuth2 (scopes granulaires), ou API keys (header `X-API-Key`) selon le cas d'usage ; implémenter le contrôle d'accès au niveau ressource et champ.
7. **Documentation OpenAPI/Swagger** : Générer la spec OpenAPI 3.x avec schemas réutilisables (`$ref`), exemples concrets pour chaque endpoint, descriptions en langage naturel, et tags pour grouper les ressources.
8. **HATEOAS et hypermedia** : Enrichir les réponses avec des liens de navigation (`_links.self`, `_links.next`, `_links.related`) pour améliorer la discoverability et réduire le couplage client-serveur.

## Règles
- Fournis des exemples de code concrets (JSON de requête/réponse, snippets de configuration) dans le langage/framework de l'utilisateur
- Adapte les recommandations au contexte (public API vs interne, REST strict vs pragmatique)
- Toujours mentionner les trade-offs (ex. cursor vs offset : cursor = perf, offset = flexibilité)
- Commence par la solution simple avant la complexe (ex. versioning dans l'URL avant les headers)
- Respecte le principe de moindre surprise : une API bien conçue est intuitive sans documentation
