---
name: rest-api-designer
description: Conception d'APIs REST conformes aux standards et bonnes pratiques. Se déclenche avec "API REST", "concevoir une API", "endpoints", "REST design", "resource naming", "HTTP methods", "API versioning", "pagination". Also triggers on "design a REST API", "endpoint naming", "HTTP status codes", "pagination design".
---

# REST API Designer

## Workflow

### 1. Identifier les ressources et relations

Partir du domaine métier, pas des tables. Chaque entité devient une collection.

```
GET  /users                    # collection
GET  /users/{id}               # singleton
GET  /users/{id}/orders        # relation imbriquée (max 2 niveaux)
GET  /orders/{id}/items/{itemId}
```

Règles de nommage :
- **Pluriel** toujours : `/orders`, pas `/order`
- **kebab-case** : `/payment-methods`, pas `/paymentMethods`
- **Noms, pas verbes** : `/users/{id}/activate` avec `POST` — pas `GET /activateUser`

### 2. Choisir les verbes HTTP et codes de statut

| Action | Verbe | Succès | Idempotent |
|--------|-------|--------|------------|
| Lire | GET | 200 | Oui |
| Créer | POST | 201 + `Location: /resource/{id}` | Non |
| Remplacer complet | PUT | 200 ou 204 | Oui |
| Mise à jour partielle | PATCH | 200 | Non (en général) |
| Supprimer | DELETE | 204 | Oui |
| Vérifier existence | HEAD | 200/404 | Oui |

Codes essentiels à maîtriser :
- `400` = requête malformée (validation côté serveur)
- `401` = non authentifié
- `403` = authentifié mais interdit
- `404` = ressource inexistante
- `409` = conflit (doublon, état incompatible)
- `422` = entité non traitable (logique métier, pas format)
- `429` = rate limit atteint (header `Retry-After`)

### 3. Pagination, filtrage, tri

**Cursor-based** (préféré pour grandes collections, flux en temps réel) :
```
GET /events?cursor=eyJpZCI6MTAwfQ&limit=50
→ { "data": [...], "next_cursor": "eyJpZCI6MTUwfQ", "has_more": true }
```

**Offset** (plus simple, navigation par page) :
```
GET /products?page=3&size=25
→ { "data": [...], "total": 1240, "page": 3, "pages": 50 }
```

Critère de choix : cursor = performances + cohérence ; offset = flexibilité (aller page N directement).

Filtrage et tri :
```
GET /orders?status=pending&created_after=2026-01-01&sort=amount:desc,created_at:asc
```

### 4. Versioning — choisir sa stratégie

| Stratégie | Exemple | Pour | Contre |
|-----------|---------|------|--------|
| **URL path** | `/v2/users` | Visibilité, cache HTTP natif | Polluant sémantiquement |
| **Header** | `Accept: application/vnd.myapi.v2+json` | Propre, REST pur | Moins discoverable |
| **Query param** | `?api-version=2026-01` | Simple à tester | Non standard |

Recommandation par défaut : **URL path** pour API publique, **header** pour API interne/partenaire.

Politique de dépréciation obligatoire :
```
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: <https://api.example.com/v3/users>; rel="successor-version"
```

### 5. Error handling — RFC 7807 Problem Details

```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Le champ 'email' est invalide.",
  "instance": "/users/register",
  "code": "VALIDATION_FAILED",
  "errors": [
    { "field": "email", "code": "INVALID_FORMAT", "message": "Format attendu : user@domain.tld" }
  ]
}
```

Toujours inclure :
- `code` machine-readable (snake_upper) pour le traitement programmatique client
- `errors[]` pour les erreurs de validation multiples
- `instance` = URI de la requête ayant échoué

### 6. Authentification et autorisation

```
# JWT Bearer (API publique)
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...

# API Key (intégrations M2M simples)
X-API-Key: sk_live_xxxxxxxxxxxx

# OAuth2 Client Credentials (services internes)
POST /oauth/token
{ "grant_type": "client_credentials", "scope": "orders:read payments:write" }
```

Principes :
- Valider le scope au niveau endpoint (`orders:read`) ET au niveau ressource (l'utilisateur peut-il accéder à cette commande ?)
- Tokens JWT : durée courte (15 min), refresh token rotatif
- Ne jamais exposer de données sensibles dans un `GET` avec query params (loggés partout)

### 7. Documentation OpenAPI 3.1

Structure minimale viable :
```yaml
openapi: 3.1.0
info:
  title: My API
  version: 2.0.0
paths:
  /users/{id}:
    get:
      summary: Récupérer un utilisateur
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
              example: { id: "550e8400-...", email: "user@example.com" }
        '404':
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/ProblemDetail' }
components:
  schemas:
    User:
      type: object
      required: [id, email]
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
```

Générer la spec avant le code (contract-first) avec Stoplight, Redocly ou directement dans le repo.

### 8. Idempotence et sécurité des opérations critiques

Pour les POST non-idempotents (paiement, création de commande) :

```
POST /payments
Idempotency-Key: a1b2c3d4-e5f6-...   # UUID généré côté client

→ Stocker la clé + résultat côté serveur pendant 24h
→ Même clé = même réponse, pas de double débit
```

---

## Anti-patterns et pièges

| Anti-pattern | Problème | Solution |
|---|---|---|
| `POST /getUsers` | Verbe dans l'URL | `GET /users` |
| Retourner 200 avec `{ "error": true }` | Masque les erreurs aux proxies et clients HTTP | Utiliser les codes HTTP corrects |
| Exposer l'ID incrémental de la DB | Enumeration attack, couplage schema | UUID v4 ou ULID |
| Imbrication > 2 niveaux | `/a/{id}/b/{id}/c/{id}` ingérable | Ressource plate + filtre : `GET /c?b_id=x` |
| Ignorer les IDs de corrélation | Debugging impossible en prod | `X-Request-Id` en entrée, retourné en réponse |
| Pas de rate limiting documenté | Clients en boucle infinie sur 429 | Header `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` |
| Réponses différentes pour le même endpoint | `GET /users` renvoie tantôt array, tantôt objet | Toujours `{ "data": [...] }` enveloppé |
| `DELETE` qui renvoie 200 + body | Non cohérent avec l'idempotence | 204 No Content |

## Bonnes pratiques 2026

- **Contract-first** : spec OpenAPI committée dans le repo, générée avant l'implémentation, testée avec Schemathesis ou Dredd
- **Liens HATEOAS légers** : ajouter `_links.self` et `_links.next` dans les collections sans surcharger avec HAL complet si inutile
- **Versionner les breaking changes seulement** : ajouter un champ est non-breaking ; en retirer, changer un type ou renommer = breaking
- **`ETag` + `If-None-Match`** pour les GETs fréquents (réduction bande passante, cache côté client)
- **`PATCH` avec JSON Merge Patch** (RFC 7396) plutôt que JSON Patch (RFC 6902) pour la majorité des cas : plus lisible, moins complexe
- **Documenter les SLAs dans l'OpenAPI** : `x-rate-limit`, `x-response-time-p99` dans l'extension `info`
- **Tester la surface d'attaque** : fuzzing avec Schemathesis dès la CI, OWASP API Security Top 10 (2023) comme checklist de review
