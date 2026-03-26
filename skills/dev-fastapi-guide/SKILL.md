---
name: dev-fastapi-guide
description: Développement d'APIs performantes avec FastAPI, Pydantic, async/await, OpenAPI et système de dépendances. Se déclenche avec "FastAPI", "Pydantic", "API Python", "async Python API", "uvicorn".
---

# Guide FastAPI

## Workflow

1. **Analyser le besoin** — Identifier le type d'API (REST, WebSocket, microservice) et définir l'architecture : structure modulaire avec routers, couche de services, repositories pour l'accès aux données, et stratégie d'authentification.

2. **Structurer le projet** — Organiser en modules avec `app/` contenant `main.py`, `routers/` pour les endpoints groupés par domaine, `schemas/` pour les modèles Pydantic, `models/` pour les modèles ORM, `services/` pour la logique métier, et `dependencies/` pour les injections.

3. **Définir les schémas Pydantic** — Créer les modèles de validation avec Pydantic v2 (`BaseModel`, `Field`, `validator`), séparer les schémas en `Create`, `Update`, `Response` et `InDB`. Utiliser les types stricts, les exemples OpenAPI, et les validateurs custom.

4. **Implémenter les routes** — Développer les endpoints avec les décorateurs `@router.get/post/put/delete`, typer les paramètres de path, query et body, configurer les status codes, les response models, et les tags pour la documentation OpenAPI automatique.

5. **Configurer le système de dépendances** — Utiliser `Depends()` pour l'injection de dépendances : connexion base de données, session utilisateur, permissions, pagination. Créer des dépendances chaînées et des dépendances avec `yield` pour la gestion des ressources.

6. **Implémenter l'async et les performances** — Utiliser `async def` pour les opérations I/O (base de données, HTTP externe), configurer SQLAlchemy async avec `AsyncSession`, implémenter le background tasks avec `BackgroundTasks`, et gérer le connection pooling.

7. **Sécuriser l'API** — Implémenter OAuth2 avec `OAuth2PasswordBearer`, JWT pour l'authentification, les scopes pour les permissions granulaires, le rate limiting avec `slowapi`, et la validation CORS. Documenter la sécurité dans OpenAPI.

8. **Tester et déployer** — Écrire des tests avec `pytest` et `httpx.AsyncClient`, utiliser les fixtures pour la base de données de test, configurer le déploiement avec Uvicorn + Gunicorn, Docker multi-stage, et les health checks.

## Règles

- Utilise toujours Pydantic v2 avec des schémas séparés pour la création, la mise à jour et la réponse — ne réutilise jamais le même modèle partout.
- Déclare les endpoints `async def` uniquement pour les vraies opérations asynchrones — utilise `def` pour les opérations synchrones afin d'éviter de bloquer la boucle événementielle.
- Injecte toujours les dépendances (DB, auth, config) via `Depends()` plutôt que des imports directs pour faciliter les tests.
- Ne place jamais de logique métier dans les routes — délègue aux services pour garder les endpoints fins et testables.
- Valide systématiquement toutes les entrées avec Pydantic et gère les erreurs avec des `HTTPException` explicites et des codes de statut appropriés.
