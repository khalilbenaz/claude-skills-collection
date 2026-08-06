---
name: dev-api-doc-generator
description: Génère une documentation d'API claire et structurée à partir de code, routes ou descriptions. À utiliser quand l'utilisateur veut documenter une API REST, GraphQL ou des endpoints. Se déclenche aussi avec "documente mon API", "swagger", "endpoint documentation", "API docs", ou quand l'utilisateur montre des routes/controllers. Also triggers on "document my API", "generate API docs", "OpenAPI documentation".
---

# API Doc Generator

## Workflow

### Étape 1 — Détection du contexte

Identifie avant tout :
- **Framework** : Express/NestJS, FastAPI, Django REST, Laravel, ASP.NET Core, Spring Boot, etc.
- **Type d'API** : REST, GraphQL, gRPC, WebSocket
- **Auth** : Bearer JWT, API Key, OAuth2, Basic, aucune
- **Format cible** : OpenAPI 3.1 YAML, Markdown, Postman Collection v2.1

Si aucun format cible n'est précisé, utilise **OpenAPI 3.1 YAML** pour une API REST, **Markdown structuré** sinon.

---

### Étape 2 — Extraction des endpoints

Pour chaque endpoint, collecte :

| Champ | Contenu attendu |
|---|---|
| Méthode + URL | `POST /api/v1/payments` |
| Description | Action métier claire, pas le nom de la fonction |
| Path params | `{id}` → type, exemple, contraintes |
| Query params | nom, type, requis/optionnel, valeur par défaut |
| Request body | schéma JSON avec types, requis, exemples |
| Headers requis | `Authorization`, `Content-Type`, custom headers |
| Réponses | 200/201/204 succès + 400/401/403/404/422/500 erreurs |
| Auth | scope/rôle requis si applicable |

---

### Étape 3 — Format de sortie

#### OpenAPI 3.1 YAML (format recommandé)

```yaml
openapi: 3.1.0
info:
  title: Payments API
  version: 1.0.0
paths:
  /api/v1/payments:
    post:
      summary: Créer un paiement
      tags: [Payments]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [amount, currency, recipient_id]
              properties:
                amount:
                  type: integer
                  description: Montant en centimes
                  example: 5000
                currency:
                  type: string
                  enum: [TND, EUR, USD]
                  example: TND
                recipient_id:
                  type: string
                  format: uuid
      responses:
        "201":
          description: Paiement créé
          content:
            application/json:
              example:
                id: "pay_abc123"
                status: "pending"
        "422":
          description: Validation échouée
          content:
            application/json:
              example:
                error: "amount must be positive"
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

#### Markdown structuré (si OpenAPI non requis)

```markdown
## POST /api/v1/payments

Crée un nouveau paiement.

**Auth** : Bearer JWT requis (`role: operator`)

**Body** (application/json) :
| Champ | Type | Requis | Description |
|---|---|---|---|
| amount | integer | oui | Montant en centimes |
| currency | string | oui | `TND`, `EUR`, `USD` |
| recipient_id | uuid | oui | ID du destinataire |

**Réponses** :
- `201` — Paiement créé : `{ "id": "pay_abc123", "status": "pending" }`
- `401` — Token manquant ou expiré
- `422` — Champ invalide : `{ "error": "amount must be positive" }`
```

---

### Étape 4 — Exemples cURL copiables

Génère un cURL par endpoint avec variables d'environnement :

```bash
# Créer un paiement
curl -X POST "https://api.example.com/api/v1/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "currency": "TND",
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### Étape 5 — Table de synthèse

Produit toujours une table des routes en introduction :

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/payments` | JWT | Lister les paiements |
| POST | `/api/v1/payments` | JWT | Créer un paiement |
| GET | `/api/v1/payments/{id}` | JWT | Détail d'un paiement |
| DELETE | `/api/v1/payments/{id}` | JWT + admin | Annuler un paiement |

---

## Critères de décision — format

| Situation | Format recommandé |
|---|---|
| API publique / SDK tiers | OpenAPI 3.1 YAML + Swagger UI |
| Documentation interne équipe | Markdown structuré |
| Tests manuels / QA | Postman Collection v2.1 |
| API GraphQL | SDL + descriptions de champs |
| Micro-service interne | OpenAPI minimal (pas de UI) |

---

## Pièges et anti-patterns

- **Ne pas documenter les erreurs** : documenter uniquement le 200 est insuffisant. Inclus systématiquement 401, 403, 422, 500.
- **Exemples irréalistes** : évite `"string"`, `0`, `"id"`. Utilise des exemples métier (`"pay_abc123"`, `5000`, `"TND"`).
- **Oublier la pagination** : si un endpoint retourne une liste, documente `page`, `limit`, `total` dans la réponse.
- **Nommer les paramètres ambigus** : `id` seul est flou ; préfère `payment_id`, `user_id`.
- **Mélanger versions** : OpenAPI 2.0 (Swagger) ≠ OpenAPI 3.0 ≠ 3.1. Reste cohérent dans tout le fichier.
- **Omettre les Content-Type** : toujours préciser `application/json` ou `multipart/form-data` explicitement.
- **Description = nom de la fonction** : `createPayment()` n'est pas une description ; écris l'action métier.

---

## Bonnes pratiques 2026

- Utilise **OpenAPI 3.1** (aligné JSON Schema 2020-12) plutôt que 3.0.
- Ajoute `x-stability: stable | beta | deprecated` sur chaque path pour signaler le niveau de maturité.
- Génère des **exemples nommés** (`examples:`) plutôt que `example:` quand plusieurs cas existent (succès, erreur partielle, edge case).
- Documente le **rate limiting** si présent : header `X-RateLimit-Limit`, `X-RateLimit-Remaining`.
- Si code incomplet : documente ce qui est visible, marque les trous avec `# TODO: à compléter` dans le YAML.
- Pour GraphQL : documente chaque Query/Mutation avec les arguments, types retournés et directives (`@auth`, `@deprecated`).


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
