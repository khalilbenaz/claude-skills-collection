---
name: testing-cypress-e2e-guide
description: Tests end-to-end avec Cypress, couvrant le setup, les commandes personnalisées, les fixtures, l'interception réseau et l'intégration CI. Se déclenche avec "Cypress", "test e2e", "end-to-end Cypress", "cy.get", "cypress.config"
---

# Cypress E2E Guide

## Workflow
1. **Initialiser le projet Cypress** — Installer Cypress via `npm install cypress --save-dev`, générer la structure de dossiers avec `npx cypress open`, et configurer `cypress.config.ts` avec les paramètres de base (baseUrl, viewportWidth, viewportHeight).
2. **Structurer les fichiers de test** — Organiser les specs dans `cypress/e2e/` par fonctionnalité ou module métier. Utiliser une convention de nommage claire (`login.cy.ts`, `checkout.cy.ts`).
3. **Créer des commandes personnalisées** — Définir des commandes réutilisables dans `cypress/support/commands.ts` pour les actions répétitives (login, navigation, remplissage de formulaires). Typer les commandes avec des déclarations TypeScript.
4. **Préparer les fixtures et données de test** — Créer des fichiers JSON dans `cypress/fixtures/` pour les données de test. Utiliser `cy.fixture()` pour charger les données et découpler les tests des données dynamiques.
5. **Intercepter les appels réseau** — Utiliser `cy.intercept()` pour stubber ou espionner les requêtes API. Définir des réponses mockées pour isoler le frontend et stabiliser les tests.
6. **Implémenter les assertions et vérifications** — Combiner `cy.get()`, `cy.contains()`, `.should()` et `.within()` pour des assertions précises. Privilégier les sélecteurs `data-testid` pour la robustesse.
7. **Configurer l'exécution en CI** — Ajouter Cypress au pipeline CI avec `npx cypress run --headless`. Configurer les enregistrements vidéo, les screenshots en cas d'échec, et le parallélisme avec Cypress Cloud si nécessaire.
8. **Analyser les résultats et maintenir les tests** — Exploiter les rapports (Mochawesome, JUnit) pour le suivi. Identifier et corriger les tests flaky. Maintenir les sélecteurs et les données à jour.

## Règles
- Toujours utiliser des attributs `data-testid` plutôt que des sélecteurs CSS fragiles ou des textes susceptibles de changer.
- Ne jamais utiliser `cy.wait(ms)` avec un délai fixe ; préférer `cy.intercept()` combiné avec `cy.wait('@alias')` pour attendre les réponses réseau.
- Isoler chaque test : chaque spec doit pouvoir s'exécuter indépendamment sans dépendre de l'état laissé par un test précédent.
- Stocker les variables d'environnement sensibles (URLs, credentials) dans `cypress.env.json` ou les variables CI, jamais en dur dans le code.
- Limiter la portée des tests E2E aux parcours critiques ; déléguer les vérifications unitaires et d'intégration aux outils appropriés.


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
