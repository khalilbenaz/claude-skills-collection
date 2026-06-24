---
name: dev-cicd-pipeline-builder
description: Conception de pipelines CI/CD pour tout type de plateforme. Se déclenche avec "CI/CD", "pipeline", "GitHub Actions", "Azure DevOps", "GitLab CI", "déploiement automatique", "continuous integration", "continuous deployment".
---

# CI/CD Pipeline Builder

## Workflow en étapes

### 1. Cadrage projet
Identifier avant tout :
- Langage / runtime (Node.js, .NET, Python, Go…) et gestionnaire de paquets
- Registre d'artefacts cible (Docker Hub, GHCR, Azure Container Registry, npm…)
- Environnements : `dev` / `staging` / `prod` — isolés ou partagés ?
- Contraintes réglementaires : approbations manuelles obligatoires en prod ? audit trail ?

### 2. Choix de plateforme

| Contexte | Plateforme recommandée |
|---|---|
| Repo GitHub, cloud agnostique | **GitHub Actions** |
| Azure DevOps + AKS / App Service | **Azure Pipelines** |
| GitLab auto-hébergé | **GitLab CI** |
| On-premise, legacy, multi-repo | **Jenkins** |

Critère décisif : la plateforme doit être là où vit le code ou là où tourne l'infra. Éviter les ponts cross-plateforme sauf nécessité absolue.

### 3. Pipeline CI — structure minimale

```yaml
# .github/workflows/ci.yml (GitHub Actions)
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }

      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage

      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

Équivalent Azure Pipelines minimal :
```yaml
# azure-pipelines.yml
trigger: [main, develop]
pool: { vmImage: ubuntu-latest }
steps:
  - task: NodeTool@0
    inputs: { versionSpec: '22.x' }
  - script: npm ci && npm run lint && npm test -- --coverage
    displayName: Build & Test
  - task: PublishTestResults@2
    inputs:
      testResultsFormat: JUnit
      testResultsFiles: '**/test-results.xml'
```

### 4. Security scan — intégrer dès la CI

```yaml
# Trivy (container vulnerabilities)
      - name: Trivy scan
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ${{ env.IMAGE_TAG }}
          severity: CRITICAL,HIGH
          exit-code: '1'

# SAST léger avec CodeQL (GitHub Advanced Security)
      - uses: github/codeql-action/analyze@v3
        with: { languages: javascript }
```

Pour Azure DevOps : utiliser la task `CredScan` ou l'extension **Microsoft Security DevOps**.

### 5. Pipeline CD — gates et stratégies

**Gate d'approbation manuelle (GitHub Actions) :**
```yaml
  deploy-prod:
    needs: deploy-staging
    environment:
      name: production          # configure reviewers dans les Settings GitHub
    runs-on: ubuntu-24.04
    steps:
      - uses: azure/webapps-deploy@v3
        with:
          app-name: my-app-prod
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

**Blue-Green sur Kubernetes :**
```bash
kubectl apply -f k8s/deployment-green.yaml
kubectl rollout status deployment/app-green --timeout=120s
kubectl patch service app-svc -p '{"spec":{"selector":{"slot":"green"}}}'
# En cas d'échec :
kubectl patch service app-svc -p '{"spec":{"selector":{"slot":"blue"}}}'
```

**Canary avec Argo Rollouts (critère de choix : trafic progressif sans downtime) :**
```yaml
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 10m }
```

### 6. Gestion des secrets

- **GitHub Actions** : `${{ secrets.MY_SECRET }}` — jamais en clair dans les logs
- **Azure Pipelines** : Variable group lié à Azure Key Vault
- **GitLab CI** : `CI/CD > Variables` avec flag `Masked` obligatoire

Règle absolue : aucun secret dans le code ou les artefacts. Scanner avec `truffleHog` ou `git-secrets` avant merge.

```bash
# Scan local avant push
trufflehog git file://. --since-commit HEAD --only-verified
```

### 7. Optimisation build — leviers principaux

```yaml
# Cache npm (GitHub Actions)
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
          restore-keys: ${{ runner.os }}-npm-

# Jobs parallèles
  jobs:
    lint:   { ... }
    test:   { needs: [] }   # parallèle à lint
    build:  { needs: [lint, test] }
```

Pour .NET : activer `--configuration Release` + cache NuGet via `actions/cache` sur `~/.nuget/packages`.

### 8. Notifications

```yaml
# Slack en fin de pipeline (succès ou échec)
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {"text": "${{ job.status }}: ${{ github.repository }} @ ${{ github.sha }}"}
```

---

## Garde-fous / Anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| Secrets en clair dans le YAML | Exposition immédiate | Toujours via variables masquées ou vault |
| `git push --force` sur main sans protection | Historique corrompu | Activer branch protection rules + required reviews |
| Pipeline monolithique (tout en 1 job) | Impossible à debugger, pas de parallélisme | Découper en jobs lint / test / build / deploy |
| Deploy direct en prod sans staging | Régressions en prod | Toujours staging → approbation → prod |
| Image Docker `latest` en prod | Non-reproductible, rollback impossible | Tags immuables : SHA court ou version sémantique |
| Caches trop larges (cache sur `node_modules/`) | Dépendances corrompues entre branches | Cache sur `~/.npm` keyed par lockfile hash |
| Tests ignorés si flaky | Dégradation silencieuse de la qualité | `--ci` flag (no watch, exit on fail), retry max 2 |

## Bonnes pratiques 2026

- **Pinning des actions** : utiliser le SHA de commit (`uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`) pour éviter les supply-chain attacks.
- **SLSA Level 2+** : générer des attestations de build avec `attest-build-provenance` (GitHub Actions native depuis 2024).
- **Ephemeral runners** : préférer les runners éphémères (Actions Large Runners ou Azure VMSS) pour l'isolation des jobs sensibles.
- **Fail-fast par défaut** : `strategy.fail-fast: true` pour les matrices, évite de gâcher des minutes de compute.
- **Convention de nommage** : `<type>/<scope>/<action>` pour les jobs (`ci/lint`, `cd/staging/deploy`) — lisibilité dans les dashboards.
- **IaC pipeline-as-code** : versionner les templates de pipeline dans le même repo que le code applicatif (pas de pipelines configurés uniquement via UI).


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
