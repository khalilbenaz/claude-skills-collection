---
name: dev-integration-test-builder
description: Crée des tests d'intégration pour vérifier l'interaction entre composants. Se déclenche avec "test d'intégration", "integration test", "tester l'API", "tester la DB", "test end-to-end", "test E2E", "Testcontainers", "WebApplicationFactory".
---

# Integration Test Builder

## Workflow
1. **Identifier les points d'intégration à tester**
   - Endpoints API REST ou GraphQL exposés par le service
   - Accès base de données (requêtes, transactions, contraintes)
   - Files de messages (Kafka, RabbitMQ, Azure Service Bus)
   - Services externes consommés (paiement, email, stockage, auth)

2. **Setup de l'environnement de test**
   - TestContainers pour démarrer de vraies instances DB/Redis/Kafka en Docker
   - Base de données in-memory (SQLite, H2, EF Core InMemory) pour tests légers
   - Docker Compose dédié à l'environnement de test avec profils isolés
   - Variables d'environnement et configuration spécifiques au mode test

3. **Configuration du test server**
   - .NET : `WebApplicationFactory<Program>` avec `IClassFixture`
   - Node.js : `supertest` avec l'app Express/Fastify démarrée en mode test
   - FastAPI/Python : `TestClient` de Starlette avec base de données de test
   - Spring Boot : `@SpringBootTest` avec `MockMvc` ou `WebTestClient`

4. **Création des fixtures et seed data**
   - Données de test réalistes et représentatives des cas métier
   - Builders ou factories pour générer des entités cohérentes
   - Scripts de seed versionnés et reproductibles
   - Cleanup systématique après chaque test (rollback, truncate, drop)

5. **Tests des scénarios d'intégration**
   - CRUD complet : créer, lire, mettre à jour, supprimer une ressource
   - Workflows multi-étapes : enchaîner plusieurs appels dans un scénario cohérent
   - Vérifier les codes HTTP, les headers, la structure des réponses JSON
   - Tester les cas d'erreur : 404, 400, 409, 500 et leurs messages

6. **Gestion des dépendances externes**
   - WireMock ou MockServer pour simuler les APIs tierces
   - Fake services locaux (fake-stripe, localstack pour AWS)
   - Configurer les timeouts et les comportements d'erreur simulés
   - Vérifier que les contrats d'appel sont respectés

7. **Tests de contrat**
   - Pact pour le contract testing consumer-driven entre microservices
   - Définir les contrats côté consommateur et les vérifier côté fournisseur
   - Intégrer Pact Broker pour partager et versionner les contrats
   - Valider les schémas JSON avec JSON Schema ou OpenAPI validation

8. **Parallélisation et isolation des tests**
   - Transactions de base de données rollbackées après chaque test
   - Ports dynamiques pour éviter les conflits entre tests parallèles
   - Ordering explicite si des dépendances existent entre tests
   - Séparation claire des collections de tests (unit vs integration vs e2e)

## Règles
- Adapte le setup au stack technique du projet (framework, DB, cloud provider).
- Fournis du code complet et exécutable avec les dépendances NuGet/npm/pip listées.
- Nomme chaque test de façon descriptive pour refléter le scénario métier testé.
- Ne simule pas ce qui peut être testé réellement via TestContainers ou équivalent.
- Assure l'isolation totale : un test ne doit jamais dépendre de l'état laissé par un autre.


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
