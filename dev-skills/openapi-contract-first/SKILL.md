---
name: openapi-contract-first
description: Design d'API Contract-First avec OpenAPI/Swagger, génération de code, validation de contrats et documentation interactive. À utiliser quand l'utilisateur conçoit une API REST, écrit une spécification OpenAPI ou génère du code depuis un contrat. Se déclenche aussi avec "OpenAPI", "Swagger", "contract first", "spécification API", "openapi.yaml", "swagger.json", "génération de code API". Also triggers on "contract-first API", "OpenAPI spec", "generate client from spec".
---

# Design API Contract-First avec OpenAPI

## Workflow en étapes

1. **Choisir la version OpenAPI** — utiliser **3.1.0** pour tout nouveau projet (support JSON Schema complet, `nullable` remplacé par `type: [string, 'null']`). Rester sur 3.0.x uniquement si l'outillage cible ne supporte pas encore 3.1.
2. **Rédiger la spec avant le code** — commencer par les paths, les schemas `required`, les codes d'erreur. Ne pas générer la spec depuis le code existant : c'est du code-first déguisé.
3. **Valider et linter** la spec (Spectral) avant tout commit.
4. **Faire reviewer par les consommateurs** — frontend, mobile, partenaires — avant de freezer le contrat.
5. **Générer serveur et/ou client** depuis la spec validée.
6. **Implémenter** derrière le contrat généré ; l'implémentation ne doit jamais diverger du contrat.
7. **Détecter les breaking changes** en CI avant chaque PR mergée.
8. **Publier la doc interactive** (Swagger UI, Redoc, Scalar).

---

## Structure de référence (OpenAPI 3.1)

```yaml
openapi: 3.1.0
info:
  title: Payment API
  version: 1.0.0
  contact:
    name: Équipe Paiements
    email: payments@company.com

servers:
  - url: https://api.company.com/v1
    description: Production
  - url: https://api-staging.company.com/v1
    description: Staging

paths:
  /payments:
    post:
      operationId: createPayment   # OBLIGATOIRE — utilisé pour nommer la méthode générée
      summary: Créer un paiement
      tags: [Payments]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePaymentRequest'
            example:
              amount: 5000
              currency: EUR
              recipient_id: usr_abc123
      responses:
        '201':
          description: Paiement créé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
        '400':
          $ref: '#/components/responses/BadRequest'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'

    get:
      operationId: listPayments
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Liste paginée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentList'

components:
  schemas:
    CreatePaymentRequest:
      type: object
      required: [amount, currency, recipient_id]
      properties:
        amount:
          type: integer
          minimum: 1
          description: Montant en centimes
        currency:
          type: string
          enum: [EUR, USD, GBP]
        recipient_id:
          type: string
          pattern: '^usr_[a-zA-Z0-9]+$'

    Payment:
      type: object
      required: [id, amount, currency, status, created_at]
      properties:
        id:
          type: string
          format: uuid
        amount:
          type: integer
        currency:
          type: string
        status:
          $ref: '#/components/schemas/PaymentStatus'
        created_at:
          type: string
          format: date-time

    PaymentStatus:
      type: string
      enum: [pending, processing, completed, failed]

    PaymentList:
      type: object
      required: [data, pagination]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Payment'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      required: [page, limit, total]
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer

    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: array
          items:
            type: object

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        default: 1
        minimum: 1
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        default: 20
        minimum: 1
        maximum: 100

  responses:
    BadRequest:
      description: Requête invalide
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    UnprocessableEntity:
      description: Données non traitables
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

---

## Validation et linting

```bash
# Linting Spectral (règles OpenAPI + règles customs)
npx @stoplight/spectral-cli lint openapi.yaml --ruleset .spectral.yaml

# Valider la syntaxe seule
npx @apidevtools/swagger-parser validate openapi.yaml

# Détecter les breaking changes entre deux versions
oasdiff breaking openapi-v1.yaml openapi-v2.yaml
oasdiff breaking openapi-v1.yaml openapi-v2.yaml --fail-on ERR  # sortie non-zéro = CI fail
```

Règleset Spectral minimal `.spectral.yaml` :
```yaml
extends: ['spectral:oas']
rules:
  operation-operationId: error
  operation-tags: warn
  oas3-api-servers: error
```

---

## Génération de code

### .NET — NSwag

```bash
# Client C#
nswag openapi2csclient \
  /input:openapi.yaml \
  /output:PaymentApiClient.cs \
  /namespace:MyApp.ApiClients \
  /className:PaymentApiClient \
  /generateClientInterfaces:true

# Contrôleur serveur (interface + stub)
nswag openapi2cscontroller \
  /input:openapi.yaml \
  /output:PaymentControllerBase.cs \
  /namespace:MyApp.Controllers \
  /controllerBaseClass:ControllerBase
```

### TypeScript

```bash
# Types seuls (léger, recommandé pour fetch natif)
npx openapi-typescript openapi.yaml -o ./src/api/schema.d.ts

# Client complet (fetch)
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml -g typescript-fetch -o ./src/api/client \
  --additional-properties=supportsES6=true,npmVersion=10
```

### Java / Spring Boot

```bash
openapi-generator-cli generate \
  -i openapi.yaml -g spring \
  -o ./generated \
  --additional-properties=interfaceOnly=true,useSpringBoot3=true
```

---

## Critères de décision

| Situation | Recommandation |
|---|---|
| Nouvelle API, équipe multi-stack | Contract-First obligatoire |
| API existante à documenter | Générer la spec depuis code (code-first), puis migrer vers contract-first |
| Partenaires externes consomment l'API | Versionner dans l'URL (`/v1/`), publier Redoc/Scalar |
| Micro-changement non-breaking | OK sans bump de version majeure |
| Changement breaking (suppression champ, rename) | Nouvelle version (`/v2/`) + période de dépréciation |
| Authentification multi-schémas | Déclarer tous les `securitySchemes`, appliquer au niveau global ou opération |

---

## Garde-fous / Anti-patterns

**Ne pas faire :**
- Générer la spec depuis le code annoté (code-first) puis prétendre faire du contract-first — la spec suit le code, pas l'inverse.
- Schemas inline dans les paths — toujours utiliser `$ref '#/components/schemas/...'`.
- Omettre `operationId` — les générateurs produiront des noms aléatoires et instables.
- Marquer tous les champs response comme optionels par prudence — les clients ne sauront pas sur quoi compter.
- Mettre des exemples incohérents avec les schemas (ne valident pas Spectral mais trompent les développeurs).
- Versionner la spec dans le code applicatif sans pipeline de détection de breaking changes — un champ renommé casse silencieusement les clients.
- Utiliser `additionalProperties: false` sur les requêtes mais pas sur les réponses — évolutivité compromise côté consommateur.

**Pièges courants :**
- OpenAPI 3.1 utilise `type: ['string', 'null']` ; `nullable: true` est 3.0 uniquement — mixer les deux casse les validateurs.
- `format: date-time` est indicatif, pas contraignant — ajouter un `pattern` si la validation stricte est requise.
- Les `$ref` dans les `responses` d'un path écrasent tout le contenu de la réponse (headers inclus) — déclarer les headers séparément si nécessaire.
- Spectral `extends: spectral:oas` active les règles OAS3 **et** OAS2 — préciser `extends: ['spectral:oas', {recommended: true}]` pour filtrer.

---

## Bonnes pratiques 2026

- **Scalar** remplace Swagger UI comme UI de doc interactive standard (DX bien supérieure, thème moderne, Try-it intégré).
- **openapi-typescript v7+** génère des types avec `paths`, `components`, `operations` bien séparés — utiliser `createFetch` de `openapi-fetch` pour des appels typés bout-en-bout sans génération de client lourd.
- Stocker la spec dans un dépôt dédié ou `api/` à la racine du monorepo, versionné avec Git.
- Taguer chaque release de spec avec la version (`git tag api-v1.2.0`).
- Intégrer `oasdiff` en CI sur la branche principale pour bloquer les breaking changes non intentionnels.
- Utiliser **Prism** pour mocker l'API depuis la spec pendant le développement frontend : `npx @stoplight/prism-cli mock openapi.yaml`.
- Documenter les webhooks (OpenAPI 3.1 les supporte nativement via `webhooks:`).
