---
name: testing-cypress-e2e-guide
description: Tests end-to-end avec Cypress, couvrant le setup, les commandes personnalisées, les fixtures, l'interception réseau et l'intégration CI. Se déclenche avec "Cypress", "test e2e", "end-to-end Cypress", "cy.get", "cypress.config"
---

# Cypress E2E Guide

## 1. Installation et configuration initiale

```bash
npm install cypress --save-dev
npx cypress open          # génère la structure + ouvre l'UI de sélection
```

Structure générée :
```
cypress/
  e2e/          ← specs
  fixtures/     ← données JSON
  support/
    commands.ts ← commandes personnalisées
    e2e.ts      ← hooks globaux (beforeEach, etc.)
cypress.config.ts
```

`cypress.config.ts` minimal (Cypress 13+) :
```ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,           // activer en CI
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // plugins ici
    },
  },
});
```

## 2. Organisation des specs

Convention : `cypress/e2e/<module>/<feature>.cy.ts`

```
cypress/e2e/
  auth/
    login.cy.ts
    logout.cy.ts
  checkout/
    cart.cy.ts
    payment.cy.ts
```

Critère de découpage : **un fichier = un parcours utilisateur** (pas un composant). Garder chaque spec indépendante : elle doit passer en isolation (`npx cypress run --spec 'cypress/e2e/auth/login.cy.ts'`).

## 3. Sélecteurs robustes

Priorité décroissante :
1. `data-testid` (jamais touché par les refactos CSS/texte)
2. `aria-label` / rôle ARIA (bonus accessibilité)
3. `cy.contains()` pour les textes stables (labels, titres de page)
4. Sélecteur CSS — en dernier recours uniquement

```html
<!-- HTML -->
<button data-testid="submit-order">Commander</button>
```

```ts
// Test
cy.get('[data-testid="submit-order"]').click();
```

## 4. Commandes personnalisées

`cypress/support/commands.ts` :
```ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request('POST', '/api/auth/login', { email, password })
    .its('body.token')
    .then((token) => {
      localStorage.setItem('auth_token', token);
    });
});

Cypress.Commands.add('visitAs', (role: 'admin' | 'user', path: string) => {
  const creds = Cypress.env(`credentials_${role}`);
  cy.login(creds.email, creds.password);
  cy.visit(path);
});
```

`cypress/support/index.d.ts` (typage) :
```ts
declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string): Chainable<void>;
    visitAs(role: 'admin' | 'user', path: string): Chainable<void>;
  }
}
```

Règle : **ne jamais dupliquer la logique de login dans chaque spec** — une commande, un seul endroit à maintenir.

## 5. Fixtures et données de test

```json
// cypress/fixtures/user.json
{
  "email": "test@example.com",
  "name": "Alice Dupont",
  "role": "admin"
}
```

```ts
// Dans le test
cy.fixture('user').then((user) => {
  cy.get('[data-testid="name-field"]').type(user.name);
});

// Ou avec alias (recommandé)
beforeEach(() => {
  cy.fixture('user').as('user');
});
it('affiche le nom', function () {
  cy.get('[data-testid="name-field"]').should('contain.value', this.user.name);
});
```

## 6. Interception réseau

```ts
// Stubber une réponse
cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as('getProducts');
cy.visit('/shop');
cy.wait('@getProducts');
cy.get('[data-testid="product-list"]').should('have.length', 3);

// Intercepter et modifier à la volée
cy.intercept('POST', '/api/orders', (req) => {
  req.reply({ statusCode: 422, body: { error: 'Stock insuffisant' } });
}).as('failOrder');

// Espionner sans modifier
cy.intercept('GET', '/api/cart').as('getCart');
cy.wait('@getCart').its('response.statusCode').should('eq', 200);
```

Critère : utiliser `cy.intercept()` + `cy.wait('@alias')` systématiquement à la place de `cy.wait(ms)`.

## 7. Gestion des variables d'environnement

`cypress.env.json` (gitignore) :
```json
{
  "credentials_admin": { "email": "admin@example.com", "password": "secret" },
  "api_url": "https://staging-api.example.com"
}
```

En CI (GitHub Actions) :
```yaml
- name: Run Cypress
  run: npx cypress run --headless
  env:
    CYPRESS_credentials_admin: '{"email":"${{ secrets.ADMIN_EMAIL }}","password":"${{ secrets.ADMIN_PASS }}"}'
    CYPRESS_api_url: ${{ secrets.STAGING_API_URL }}
```

Accès dans les tests : `Cypress.env('api_url')`.

## 8. Intégration CI

```yaml
# .github/workflows/e2e.yml
name: E2E
on: [push, pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          start: npm run dev
          wait-on: 'http://localhost:3000'
          wait-on-timeout: 60
          browser: chrome
          record: true          # Cypress Cloud optionnel
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

Pour le parallélisme : `--parallel --group "E2E Chrome"` avec Cypress Cloud ou `cypress-split` (open source).

## 9. Rapports

```bash
npm install --save-dev mochawesome mochawesome-merge mochawesome-report-generator
```

`cypress.config.ts` :
```ts
reporter: 'mochawesome',
reporterOptions: {
  reportDir: 'cypress/reports',
  overwrite: false,
  html: false,
  json: true,
},
```

Script de merge :
```bash
npx mochawesome-merge cypress/reports/*.json > merged.json
npx marge merged.json --reportDir cypress/reports/html
```

## Garde-fous et anti-patterns

| Anti-pattern | Alternative |
|---|---|
| `cy.wait(3000)` | `cy.wait('@alias')` ou assertion `.should('be.visible')` |
| Sélecteur CSS `.btn-primary` | `data-testid="submit-btn"` |
| Partager un état entre specs via `before()` global | `beforeEach()` ou commandes qui remontent l'état |
| Tester la logique métier en E2E | Tests unitaires / intégration pour la logique |
| Hard-coder les credentials dans le code | `cypress.env.json` + variables CI |
| `cy.visit()` dans chaque `it()` | Factoriser dans `beforeEach()` |
| Ignorer les tests flaky | Identifier avec `--spec` isolé, corriger `cy.intercept()` manquant |

## Critères de décision — quand écrire un test E2E

- Parcours critique métier (login, paiement, inscription) → **toujours E2E**
- Validation de formulaire simple → test unitaire suffit
- Comportement API seul → test d'intégration backend
- Rendu conditionnel d'un composant → test unitaire (Vitest/Jest + Testing Library)
- Flux multi-pages impliquant auth + state → **E2E**


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
