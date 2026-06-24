---
name: test-strategy-planner
description: Planification de stratégie de test incluant la pyramide de tests, les quadrants de tests, la couverture et l'analyse de risques. Se déclenche avec "stratégie de test", "pyramide de tests", "test plan", "couverture de tests", "risk-based testing"
---

# Test Strategy Planner

## Workflow

### 1. Analyser le contexte du projet

Recueillir avant toute chose :
- Type d'application : API REST, SPA, mobile natif, microservices, batch…
- Stack technique et frameworks de test disponibles
- Contraintes réglementaires : PCI-DSS, RGPD, ISO 27001, HIPAA…
- Délais, budget QA, effectif QA vs Dev
- Niveau de maturité actuel (aucun test, legacy sans CI, CI partielle…)

**Décision rapide :**
| Contexte | Priorité |
|---|---|
| Startup MVP | Tests unitaires critiques + 2-3 E2E smoke |
| Fintech / banque | Couverture unitaire ≥ 80%, contrats API, tests de sécurité obligatoires |
| Microservices | Tests de contrat (Pact), tests d'intégration par service |
| Legacy sans tests | Characterization tests avant tout refactoring |

---

### 2. Définir la pyramide de tests

Proportion cible selon le contexte :

```
              [E2E / UI]        ~10 %   lents, coûteux, fragiles
           [Intégration]        ~20 %   API, BDD, contrats
        [Unitaires]             ~70 %   rapides, isolés, stables
```

Pour un projet microservices, substituer une partie des E2E par des **tests de contrat** (Pact) :

```
              [E2E smoke]       ~5 %
        [Contrats Pact]         ~15 %
    [Intégration service]       ~20 %
  [Unitaires]                   ~60 %
```

---

### 3. Appliquer les quadrants de tests agiles (Agile Testing Quadrants)

| Quadrant | Type | Objectif | Exemples |
|---|---|---|---|
| Q1 — Soutenir l'équipe, tech | Unitaires, composants | Guider le design (TDD) | JUnit, Jest, xUnit |
| Q2 — Soutenir l'équipe, métier | Fonctionnels, acceptance | Valider les stories | Cucumber, FitNesse, Playwright |
| Q3 — Critiquer le produit, métier | Exploratoires, usabilité | Trouver ce que les scripts ratent | Sessions exploratoires, UX testing |
| Q4 — Critiquer le produit, tech | Performance, sécurité | Non-régressions non-fonctionnelles | k6, OWASP ZAP, Gatling |

Vérifier qu'au moins un quadrant par sprint est couvert ; Q3 et Q4 sont souvent négligés.

---

### 4. Analyse de risques (Risk-Based Testing)

**Matrice risque = probabilité × impact :**

```
         │ Impact faible │ Impact élevé
─────────┼───────────────┼──────────────────
Proba    │               │
élevée   │  Surveiller   │  ★ Tester en priorité
─────────┼───────────────┼──────────────────
Proba    │               │
faible   │  Ignorer      │  Tester si temps dispo
```

Exemples de zones à haut risque à identifier : paiements, authentification, calculs métier critiques, intégrations tierces instables.

Template Markdown pour la matrice :

```markdown
| Fonctionnalité | Probabilité (1-5) | Impact (1-5) | Score | Couverture cible |
|---|---|---|---|---|
| Paiement carte | 3 | 5 | 15 | Unitaire + Intégration + E2E |
| Rapport PDF | 2 | 2 | 4 | Unitaire seul |
```

---

### 5. Planifier la couverture de tests

**Objectifs de couverture recommandés :**

| Domaine | Couverture ligne | Couverture branche |
|---|---|---|
| Logique métier critique | ≥ 90 % | ≥ 80 % |
| Services applicatifs | ≥ 75 % | ≥ 70 % |
| Infrastructure / adapters | ≥ 50 % | — |
| Code généré automatiquement | Exclure | — |

**Configurer Istanbul/NYC (JS/TS) :**

```json
// package.json
"jest": {
  "coverageThreshold": {
    "global": { "lines": 80, "branches": 70, "functions": 80 }
  },
  "coveragePathIgnorePatterns": ["generated/", "migrations/"]
}
```

**JaCoCo (Java/Kotlin) — build.gradle :**

```groovy
jacocoTestCoverageVerification {
  violationRules {
    rule { limit { minimum = 0.80 } }
  }
}
```

**Coverlet (.NET) :**

```bash
dotnet test --collect:"XPlat Code Coverage" \
  /p:Threshold=80 /p:ThresholdType=line
```

Bloquer le pipeline CI si les seuils ne sont pas atteints.

---

### 6. Définir les environnements et données de test

**Environnements :**

| Env | Usage | Refresh données |
|---|---|---|
| Local / Dev | Tests unitaires, intégration | Mocks / fixtures |
| CI | Smoke, intégration légère | Seed DB automatique |
| Staging | E2E, performance, UAT | Clone anonymisé prod |
| Pré-prod | Tests de charge, go/no-go | Jeu complet anonymisé |

**Stratégie données :**
- Utiliser des **builders / fixtures factories** (ex : FactoryBot, Bogus .NET, Faker.js) plutôt que des dumps SQL figés.
- Anonymiser systématiquement les dumps de production (RGPD) : outil recommandé `faker` + script de masquage.
- Versionner les seeds avec les migrations pour éviter les drifts.

---

### 7. Établir les critères d'entrée et de sortie

**Critères d'entrée (pour démarrer les tests d'intégration/E2E) :**
- Build CI vert
- Tests unitaires passants ≥ seuil défini
- Environnement de test disponible et configuré
- User stories avec critères d'acceptance définis

**Critères de sortie (Definition of Done QA) :**
- Couverture ≥ seuils définis
- 0 bug bloquant / critique ouvert
- Tests de régression passants
- Rapport de test généré et archivé
- Tests de performance dans les SLA définis

**Niveaux de sévérité de défauts :**

| Niveau | Définition | Seuil acceptable |
|---|---|---|
| Bloquant | Crash, perte de données | 0 |
| Critique | Fonctionnalité clé KO | 0 en release |
| Majeur | Dégradation significative | ≤ 2 en release |
| Mineur | Cosmétique, workaround dispo | À planifier |

---

### 8. Intégrer la stratégie dans le CI/CD

Pipeline type (GitHub Actions / Azure DevOps) :

```yaml
stages:
  - name: unit-tests        # < 2 min — bloque le merge
  - name: lint-and-coverage # contrôle seuils
  - name: integration-tests # < 10 min — bloque le merge
  - name: e2e-smoke         # < 5 min — bloque le déploiement
  - name: performance       # planifié nightly
  - name: security-scan     # OWASP ZAP, Snyk — planifié nightly
```

---

## Garde-fous et anti-patterns

- **Faux sentiment de sécurité du coverage** : 90 % de couverture sans assertions utiles ne détecte rien. Préférer la mutation testing (`Stryker`, `PITest`) pour valider la qualité des tests.
- **Trop d'E2E** : Chaque test E2E coûte 10x à 100x plus qu'un test unitaire en maintenance. Supprimer les E2E redondants dès qu'un test d'intégration couvre la même logique.
- **Tests couplés à l'implémentation** : Tester les comportements observables, pas les détails internes. Un refactoring ne doit pas casser les tests si le comportement est inchangé.
- **Données de test en dur dans le code** : utiliser des factories/fixtures pour éviter les tests fragiles et les conflits entre runs parallèles.
- **Ignorer les tests flaky** : Un test instable masque des problèmes réels. Politique stricte : quarantaine immédiate + fix dans le sprint courant.
- **Stratégie figée** : Réviser la stratégie à chaque release majeure ou changement d'architecture. C'est un document vivant.

## Bonnes pratiques 2026

- **Shift-left** : intégrer les tests dès la phase de design (Test-Driven Development, BDD avec Gherkin).
- **AI-assisted testing** : utiliser les outils de génération de tests (Diffblue, CodiumAI, GitHub Copilot) pour accélérer la couverture des cas limites — toujours relire et valider les tests générés.
- **Observabilité comme filet de sécurité** : traces distribuées (OpenTelemetry) + alertes en production complètent la stratégie de test.
- **Chaos engineering léger** : dès la staging, injecter des pannes simulées (Toxiproxy pour les dépendances réseau) pour valider la résilience.
- **Test contracts first** : pour les APIs exposées à des partenaires, définir le contrat OpenAPI avant l'implémentation et le valider en CI (Schemathesis, Dredd).
