---
name: dev-openapi-contract-first
description: Design d'API Contract-First avec OpenAPI/Swagger, génération de code, validation de contrats et documentation interactive. À utiliser quand l'utilisateur conçoit une API REST, écrit une spécification OpenAPI ou génère du code depuis un contrat. Se déclenche aussi avec "OpenAPI", "Swagger", "contract first", "spécification API", "openapi.yaml", "swagger.json", "génération de code API".
---

# Design API Contract-First avec OpenAPI

## Workflow

1. **Définir le contrat** : spécification OpenAPI (YAML/JSON) avec endpoints, schémas et exemples.
2. **Valider** : vérifier la conformité du contrat (linting, breaking changes).
3. **Générer** : code serveur et/ou client depuis la spec.
4. **Documenter** : interface interactive pour les consommateurs de l'API.

## Structure d'une spécification OpenAPI

```yaml
openapi: 3.1.0
info:
  title: Payment API
  version: 1.0.0
  description: API de gestion des paiements
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
      operationId: createPayment
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
      summary: Lister les paiements
      tags: [Payments]
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/PaymentStatus'
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
        metadata:
          type: object
          additionalProperties:
            type: string

    Payment:
      type: object
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
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Payment'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer

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

## Génération de code

### .NET (NSwag)

```bash
# Générer le client C#
nswag openapi2csclient /input:openapi.yaml /output:PaymentApiClient.cs \
  /namespace:MyApp.ApiClients /className:PaymentApiClient

# Générer le contrôleur serveur
nswag openapi2cscontroller /input:openapi.yaml /output:PaymentController.cs \
  /namespace:MyApp.Controllers
```

### TypeScript

```bash
# openapi-typescript
npx openapi-typescript openapi.yaml -o ./src/api/schema.d.ts

# openapi-generator
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml -g typescript-fetch -o ./src/api/client
```

## Validation et linting

```bash
# Spectral (linting OpenAPI)
npx @stoplight/spectral-cli lint openapi.yaml

# oasdiff (détection de breaking changes)
oasdiff breaking openapi-old.yaml openapi-new.yaml
```

## Bonnes pratiques

### Conception
- Utiliser des `$ref` pour éviter la duplication de schémas
- Définir des `operationId` uniques pour la génération de code
- Inclure des `examples` dans les schémas pour la documentation
- Versionner l'API dans l'URL (`/v1/`, `/v2/`)

### Schémas
- Marquer les champs `required` explicitement
- Utiliser `pattern` pour les formats personnalisés
- Définir `minimum`/`maximum` pour les nombres
- Utiliser `enum` pour les valeurs limitées

### Workflow Contract-First
1. Rédiger la spec OpenAPI **avant** le code
2. Revue de la spec par les consommateurs de l'API
3. Générer le code serveur/client depuis la spec
4. Valider que l'implémentation est conforme au contrat
5. Tester les breaking changes avant chaque modification

## Règles
- Le contrat OpenAPI est la source de vérité — pas le code.
- Chaque endpoint doit avoir un `operationId` unique.
- Les breaking changes doivent être validées avec un outil dédié avant merge.
- Les schémas partagés doivent être dans `components/schemas`, jamais inline.
