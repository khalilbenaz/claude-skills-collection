---
name: github-actions-expert
description: Maîtrise de GitHub Actions — workflows CI/CD, actions custom, matrix builds, secrets, environments et reusable workflows. Se déclenche avec "GitHub Actions", "workflow GitHub", "actions", "CI/CD GitHub", ".github/workflows".
---

# GitHub Actions Expert

## Workflow

1. **Analyser le pipeline requis** — Identifier les étapes (build, test, lint, SAST, déploiement), les triggers adaptés et les branches concernées.

   | Trigger | Quand l'utiliser |
   |---------|-----------------|
   | `push` sur `main` | CI post-merge, déploiement continu |
   | `pull_request` | Validation avant merge, checks obligatoires |
   | `schedule` | Jobs de maintenance, audit de sécurité nocturne |
   | `workflow_dispatch` | Déploiement manuel avec paramètres |
   | `release` (published) | Publication de packages, binaires |

2. **Structurer le YAML** — Organiser les jobs avec dépendances explicites et conditions.

   ```yaml
   name: CI
   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]
   permissions:           # Principe du moindre privilège global
     contents: read
   jobs:
     build:
       runs-on: ubuntu-latest
       permissions:
         contents: read
       steps:
         - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
         - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020  # v4.4.0
           with:
             node-version: '22'
             cache: 'npm'
         - run: npm ci
         - run: npm run build
     test:
       needs: build
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
         - run: npm ci && npm test
   ```

3. **Configurer les matrix builds** — Tester plusieurs environnements sans duplication.

   ```yaml
   strategy:
     fail-fast: false        # Ne pas annuler les autres axes si un échoue
     matrix:
       node: ['20', '22']
       os: [ubuntu-latest, windows-latest]
       include:
         - node: '22'
           os: ubuntu-latest
           coverage: true     # Variable custom pour un axe précis
       exclude:
         - node: '20'
           os: windows-latest
   runs-on: ${{ matrix.os }}
   steps:
     - if: matrix.coverage
       run: npm run test:coverage
   ```

4. **Gérer les secrets et variables** — Hiérarchie : Organization > Repository > Environment.

   ```yaml
   env:
     DATABASE_URL: ${{ vars.DATABASE_URL }}      # Variable non-sensible
   steps:
     - name: Deploy
       env:
         API_KEY: ${{ secrets.PROD_API_KEY }}    # Secret injecté en env, jamais en arg CLI
       run: ./deploy.sh
   ```

   **OIDC (recommandé sur AWS/Azure/GCP)** — supprime les secrets statiques cloud :
   ```yaml
   permissions:
     id-token: write
     contents: read
   steps:
     - uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502  # v4
       with:
         role-to-assume: arn:aws:iam::123456789012:role/GitHubActions
         aws-region: eu-west-1
   ```

5. **Cacher les dépendances** — Impact direct sur la durée du pipeline.

   ```yaml
   - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
     with:
       node-version: '22'
       cache: 'npm'           # Gère le cache automatiquement (préférer cette option)
   # Ou cache manuel pour des cas custom :
   - uses: actions/cache@5a3ec84eff668545956fd18022155c47e93e2684  # v4
     with:
       path: ~/.m2/repository
       key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
       restore-keys: |
         ${{ runner.os }}-maven-
   ```

6. **Créer des reusable workflows** — Extraire les patterns communs dès qu'ils se répètent.

   ```yaml
   # .github/workflows/reusable-deploy.yml
   on:
     workflow_call:
       inputs:
         environment:
           required: true
           type: string
       secrets:
         DEPLOY_TOKEN:
           required: true
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment: ${{ inputs.environment }}
       steps:
         - run: echo "Deploying to ${{ inputs.environment }}"
   ```

   Appel depuis un autre workflow :
   ```yaml
   jobs:
     deploy-prod:
       uses: my-org/.github/.github/workflows/reusable-deploy.yml@main
       with:
         environment: production
       secrets:
         DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
   ```

7. **Sécuriser le pipeline** — Checklist obligatoire.

   ```yaml
   # Épingler sur SHA (jamais sur tag mutable)
   - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

   # Attester la provenance du build
   permissions:
     id-token: write
     attestations: write
   steps:
     - uses: actions/attest-build-provenance@v2
       with:
         subject-path: dist/app.tar.gz
   ```

8. **Optimiser les temps d'exécution** — Techniques d'accélération.

   ```yaml
   # Skip jobs si les fichiers concernés n'ont pas changé
   - uses: dorny/paths-filter@de90cc6fb38fc0963ad72b210f1f284cd68cea36  # v3
     id: changes
     with:
       filters: |
         backend:
           - 'src/**'
   - if: steps.changes.outputs.backend == 'true'
     run: npm run test:backend

   # Partager des artifacts entre jobs
   - uses: actions/upload-artifact@v4
     with:
       name: dist
       path: dist/
       retention-days: 1
   ```

## Anti-patterns et pièges

| Anti-pattern | Risque | Correction |
|---|---|---|
| `uses: actions/checkout@v4` (tag mutable) | Supply chain attack | Épingler sur le SHA du commit |
| `permissions: write-all` global | Élévation de privilèges | Déclarer seulement les permissions nécessaires par job |
| Secrets affichés dans les `run` | Fuite dans les logs | Injecter via `env:` jamais via `${{ secrets.X }}` dans les commandes shell |
| `continue-on-error: true` sans logging | Masquer des défaillances silencieuses | Utiliser avec un step de reporting explicite |
| Pas de `timeout-minutes` | Job bloqué indéfiniment = facture | Toujours fixer un timeout (par défaut GitHub : 6h) |
| Stocker des credentials dans les variables (vars) | Exposition accidentelle | Vars = config publique, secrets = credentials |
| Concurrence non gérée sur déploiements | Double déploiement | Utiliser `concurrency` avec `cancel-in-progress: true` |

```yaml
# Gestion de la concurrence pour les déploiements
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

## Bonnes pratiques 2026

- **Dependabot pour les actions** — Ajouter `.github/dependabot.yml` pour maintenir les SHA à jour automatiquement :
  ```yaml
  updates:
    - package-ecosystem: "github-actions"
      directory: "/"
      schedule:
        interval: "weekly"
  ```
- **Required status checks** — Protéger `main` : activer les branch protection rules avec au moins un check CI obligatoire et `Require branches to be up to date`.
- **Environments de déploiement** — Toujours utiliser un Environment GitHub (`Settings > Environments`) avec reviewers pour la production ; les secrets d'environnement écrasent les secrets repo.
- **Self-hosted runners** — Isoler dans des VMs éphémères (ou containers) ; ne jamais utiliser sur des repos publics sans `if: github.event.pull_request.head.repo.full_name == github.repository` pour bloquer les forks.
- **Audit des logs** — Activer `ACTIONS_STEP_DEBUG` et `ACTIONS_RUNNER_DEBUG` en secrets (valeur `true`) pour le debugging ; les désactiver en production.
