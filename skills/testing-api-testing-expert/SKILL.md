---
name: testing-api-testing-expert
description: Tests d'API REST et GraphQL avec les outils majeurs du marché, incluant le contract testing, l'automatisation CI/CD et les tests de performance. Se déclenche avec "test API", "Postman", "Newman", "REST Assured", "contract testing", "Pact. Also triggers on "API testing", "Postman or REST Assured tests".
---

# API Testing Expert

## Workflow

### 1. Analyser la spécification
- Parser l'OpenAPI/Swagger : identifier endpoints, méthodes, paramètres, codes HTTP attendus, format des erreurs.
- GraphQL : introspection schema (`npx get-graphql-schema http://api/graphql > schema.graphql`).
- Repérer les règles métier critiques (validation, contraintes, side-effects).

### 2. Choisir l'outil selon le contexte

| Contexte | Outil recommandé |
|---|---|
| Exploration rapide / équipe non-dev | Postman + Newman |
| Backend Java/Kotlin | REST Assured |
| Backend Node.js | SuperTest ou Axios + Jest |
| Backend Python | pytest + httpx |
| Contract testing microservices | Pact (consumer-driven) |
| Performance / charge | k6 ou Artillery |
| Fuzzing / sécurité | OWASP ZAP API Scan ou Schemathesis |

### 3. Configurer les environnements

```bash
# Newman — run collection avec env staging
newman run collection.json \
  -e staging.env.json \
  --reporters cli,htmlextra,junit \
  --reporter-junit-export results/junit.xml \
  --bail
```

Variables d'environnement Postman — JAMAIS de valeur en dur :
```json
{ "BASE_URL": "https://api.staging.example.com", "API_KEY": "{{$env.API_KEY}}" }
```

### 4. Concevoir les cas de test

Matrice minimale par endpoint :
- **Happy path** : payload valide → 200/201 + valider le schéma de réponse complet.
- **Validation** : champ manquant, type incorrect, valeur hors plage → 400/422 + message d'erreur exploitable.
- **Auth** : sans token → 401, token expiré → 401, mauvais scope → 403.
- **Not found** : ressource inexistante → 404.
- **Conflits** : doublon → 409.

```python
# pytest + httpx — exemple endpoint POST /users
import httpx, pytest

BASE = "https://api.staging.example.com"

def test_create_user_happy_path(auth_headers):
    r = httpx.post(f"{BASE}/users", json={"email": "x@test.com", "role": "viewer"}, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert "id" in body and isinstance(body["id"], str)
    assert body["email"] == "x@test.com"

def test_create_user_missing_email(auth_headers):
    r = httpx.post(f"{BASE}/users", json={"role": "viewer"}, headers=auth_headers)
    assert r.status_code == 422
    assert "email" in r.json()["detail"][0]["loc"]

def test_create_user_unauthorized():
    r = httpx.post(f"{BASE}/users", json={"email": "x@test.com", "role": "viewer"})
    assert r.status_code == 401
```

### 5. Valider les schémas de réponse

```python
# Validation JSON Schema avec jsonschema
from jsonschema import validate

USER_SCHEMA = {
    "type": "object",
    "required": ["id", "email", "createdAt"],
    "properties": {
        "id":        {"type": "string", "format": "uuid"},
        "email":     {"type": "string", "format": "email"},
        "createdAt": {"type": "string", "format": "date-time"},
    },
    "additionalProperties": False,
}

def test_user_schema(auth_headers):
    r = httpx.get(f"{BASE}/users/some-uuid", headers=auth_headers)
    validate(instance=r.json(), schema=USER_SCHEMA)
```

### 6. Contract testing avec Pact

```python
# Consumer side — Python pact-python
from pact import Consumer, Provider

pact = Consumer("frontend").has_pact_with(Provider("users-api"))

pact.given("user abc123 exists").upon_receiving("a request for user").with_request(
    method="GET", path="/users/abc123"
).will_respond_with(200, body={"id": "abc123", "email": like("user@example.com")})
```

```bash
# Vérification côté Provider
pact-verifier \
  --provider-base-url http://localhost:8080 \
  --pact-broker-url https://pact-broker.internal \
  --provider users-api \
  --publish-verification-results \
  --provider-app-version $(git rev-parse --short HEAD)
```

### 7. Tests de performance

```javascript
// k6 — SLO : P95 < 500ms, error rate < 1%
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m',  target: 50 },
    { duration: '15s', target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  const r = http.get('https://api.staging.example.com/users', {
    headers: { Authorization: `Bearer ${__ENV.TOKEN}` },
  });
  check(r, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

```bash
k6 run --env TOKEN=$API_TOKEN perf/users.js
```

### 8. Intégration CI/CD

```yaml
# GitHub Actions
- name: Run API tests
  run: |
    newman run tests/collection.json \
      -e tests/env/${{ env.STAGE }}.json \
      --reporters junit \
      --reporter-junit-export results/junit.xml
  env:
    API_KEY: ${{ secrets.API_KEY }}

- name: Upload test results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: api-test-results
    path: results/
```

---

## Critères de décision — quel outil choisir

- **Postman/Newman** si l'équipe est mixte (dev + QA non-codeurs) ou si les tests servent aussi de démo.
- **REST Assured** si le projet est Java et que les tests doivent vivre dans le même repo Maven/Gradle.
- **pytest + httpx** si le projet est Python ou si les tests ont besoin de logique Python complexe (fixtures, parametrize).
- **Pact** dès qu'il y a plus de 2 services qui communiquent — évite les faux contrats testés uniquement en intégration.
- **k6** si les SLO sont formalisés ; Artillery si la config YAML est préférée ; JMeter si l'organisation impose un outil GUI legacy.

---

## Garde-fous / anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| Token en dur dans le code | Fuite dans Git | Toujours `os.environ["TOKEN"]` ou vault |
| Test non idempotent (données non nettoyées) | Flaky en CI | `setup` crée, `teardown` supprime via API ou DB |
| Tester uniquement le status code | Régression silencieuse sur le body | Valider le schéma JSON **et** les valeurs métier |
| Pas de test 4xx/5xx | Faux sentiment de couverture | Matrice erreurs obligatoire par endpoint |
| Collection Postman hors Git | Dérive entre devs | Committer `collection.json` + `env.*.json` (sans secrets) |
| Pact consumer publié sans vérification provider | Contrat jamais vérifié | Bloquer le merge si `can-i-deploy` échoue |
| Test de perfs pointant sur prod | Incident en production | Toujours utiliser staging ou un environment dédié |

---

## Bonnes pratiques 2026

- **Schemathesis** pour le fuzzing automatique à partir de l'OpenAPI spec : `schemathesis run openapi.yaml --checks all --base-url https://api.staging.example.com`.
- **Wiremock / Prism** comme mock server pendant le développement avant que le backend soit disponible.
- Utiliser **`can-i-deploy`** (Pact Broker CLI) comme gate CI : bloque le déploiement si le contrat n'est pas vérifié.
- Versionner les fichiers `.env.*.json` Postman **sans valeur sensible** (placeholder `{{SECRET}}`), injecter les vraies valeurs via CI secrets.
- Stocker les SLO de performance dans le code (`options.thresholds` k6) pour que la CI régresse automatiquement si une régression de latence est introduite.


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
