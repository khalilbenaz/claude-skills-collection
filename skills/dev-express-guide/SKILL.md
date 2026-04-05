---
name: dev-express-guide
description: Développement d'APIs Node.js avec Express, middleware, routing, gestion d'erreurs, authentification et bonnes pratiques de conception. Se déclenche avec "Express", "Express.js", "middleware Express", "Node.js API", "router Express".
---

# Guide Express.js

## Workflow

1. **Analyser le besoin** — Identifier le type d'API (REST, temps réel avec Socket.io, BFF) et définir l'architecture : structure modulaire par feature, couche de services pour la logique métier, et choix de l'ORM (Prisma, Sequelize, Mongoose).

2. **Structurer le projet** — Organiser en modules avec `src/routes/` pour les routers Express, `src/controllers/` pour la gestion des requêtes, `src/services/` pour la logique métier, `src/models/` pour les modèles de données, `src/middleware/` pour les middleware custom, et `src/utils/` pour les utilitaires.

3. **Configurer les middleware globaux** — Mettre en place les middleware essentiels : `express.json()` pour le parsing, `cors()` pour les requêtes cross-origin, `helmet()` pour les headers de sécurité, `morgan()` pour le logging, `compression()` pour la compression gzip, et `express-rate-limit` pour le rate limiting.

4. **Implémenter le routing** — Créer les routers modulaires avec `express.Router()`, organiser les routes par ressource, utiliser les paramètres de route typés, les query strings validées, et chaîner les middleware spécifiques par route pour la validation et l'authentification.

5. **Développer les controllers et services** — Séparer la logique de traitement HTTP (controllers) de la logique métier (services). Les controllers extraient et valident les données de la requête, appellent les services, et formatent la réponse. Les services encapsulent les règles métier et l'accès aux données.

6. **Implémenter la gestion d'erreurs** — Créer des classes d'erreur custom (`AppError`, `NotFoundError`, `ValidationError`) avec des codes HTTP associés. Configurer un error handler global en fin de chaîne middleware avec la signature `(err, req, res, next)` pour centraliser le format des réponses d'erreur.

7. **Sécuriser l'API** — Implémenter l'authentification JWT avec `jsonwebtoken` et Passport.js, la validation des entrées avec `joi` ou `zod`, la protection CSRF pour les formulaires, le sanitize des entrées contre les injections, et les headers de sécurité avec Helmet.

8. **Tester et déployer** — Écrire des tests avec Jest et Supertest pour les routes, mocker les services et la base de données, configurer le déploiement avec PM2 pour le clustering, Docker pour la conteneurisation, et les health checks pour le monitoring.

## Règles

- Utilise toujours un error handler global centralisé plutôt que des try-catch répétitifs dans chaque route — encapsule les controllers async avec un wrapper `asyncHandler`.
- Valide systématiquement toutes les entrées utilisateur (body, params, query) avec une librairie de validation (Zod, Joi) avant tout traitement.
- Ne place jamais de logique métier dans les routes ou les controllers — délègue aux services pour garantir la testabilité et la réutilisabilité.
- Retourne toujours des réponses HTTP cohérentes avec un format standardisé (`{ success, data, error, message }`) sur toutes les routes.
- Gère correctement les signaux d'arrêt (`SIGTERM`, `SIGINT`) pour un graceful shutdown qui ferme les connexions base de données et termine les requêtes en cours.


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
