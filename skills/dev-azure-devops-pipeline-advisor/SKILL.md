---
name: dev-azure-devops-pipeline-advisor
description: Conception de pipelines CI/CD avec Azure DevOps (YAML pipelines, stages, templates, déploiement multi-environnement). À utiliser quand l'utilisateur travaille avec Azure DevOps, configure des pipelines YAML ou gère des releases. Se déclenche aussi avec "azure devops", "pipeline YAML", "azure pipeline", "CI/CD azure", "release pipeline", "azure artifacts".
---

# Conseiller Azure DevOps Pipelines

## Workflow en étapes

1. **Qualifier le besoin** — CI seul, CD seul, CI/CD complet ? Mono-repo ou multi-repo ? Type d'artefact (binaire, image Docker, package NuGet/npm) ? Environnements cibles (dev / staging / prod) ?
2. **Choisir la stratégie de déclenchement** — `trigger` pour push/merge, `pr` pour pull request, `schedules` pour planifié, `resources.pipelines` pour pipeline-en-aval.
3. **Concevoir le graphe stages → jobs → steps** — Identifier les parallélisations possibles, les dépendances (`dependsOn`), les conditions de déploiement.
4. **Extraire les templates** — Tout bloc dupliqué entre stages/pipelines devient un template YAML paramétré.
5. **Sécuriser** — Variable Groups liés à Key Vault, Service Connections à droits minimaux, Approvals sur les environments prod.
6. **Valider et optimiser** — Activer le cache, mesurer la durée de chaque job, ajouter un health check post-déploiement.

---

## Critères de décision clés

| Situation | Recommandation |
|---|---|
| Déploiement prod nécessite une validation humaine | `environment` avec **Approvals** dans Azure DevOps UI |
| Build identique sur plusieurs environnements | Template de job paramétré (`templates/build.yml`) |
| Secrets (connexion DB, API key) | Variable Group lié à **Azure Key Vault** |
| Temps de build > 5 min à cause des dépendances | `Cache@2` sur dossier NuGet/npm |
| Multi-repo (code + infra séparés) | `resources.repositories` + checkout multiple |
| Déploiement par rolling / blue-green | Strategy `rolling` ou `canary` dans le job deployment |

---

## Structure de référence CI/CD complète

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main, release/*]
  paths:
    exclude: [docs/*, '*.md']

pr:
  branches:
    include: [main]

pool:
  vmImage: ubuntu-latest

variables:
  - group: common-vars          # Variable Group partagé
  - name: buildConfiguration
    value: Release
  - name: dotnetVersion
    value: '8.0.x'

stages:
  - stage: Build
    displayName: Build & Test
    jobs:
      - job: BuildJob
        steps:
          - task: Cache@2
            inputs:
              key: 'nuget | "$(Agent.OS)" | **/packages.lock.json'
              restoreKeys: 'nuget | "$(Agent.OS)"'
              path: $(NUGET_PACKAGES)
            displayName: Cache NuGet

          - task: UseDotNet@2
            inputs:
              version: $(dotnetVersion)

          - script: dotnet restore --locked-mode
            displayName: Restore (locked)

          - script: dotnet build -c $(buildConfiguration) --no-restore
            displayName: Build

          - script: |
              dotnet test -c $(buildConfiguration) --no-build \
                --collect:"XPlat Code Coverage" \
                --results-directory $(Agent.TempDirectory)/TestResults
            displayName: Tests

          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '$(Agent.TempDirectory)/TestResults/**/coverage.cobertura.xml'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)'
              ArtifactName: drop

  - stage: DeployDev
    displayName: Deploy → Dev
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployDev
        environment: dev
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/deploy-steps.yml
                  parameters:
                    environment: dev

  - stage: DeployStaging
    displayName: Deploy → Staging
    dependsOn: DeployDev
    jobs:
      - deployment: DeployStaging
        environment: staging          # Approval configuré dans l'UI
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/deploy-steps.yml
                  parameters:
                    environment: staging

  - stage: DeployProd
    displayName: Deploy → Production
    dependsOn: DeployStaging
    condition: and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/heads/release/'))
    jobs:
      - deployment: DeployProd
        environment: production       # Approval obligatoire
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/deploy-steps.yml
                  parameters:
                    environment: production
```

---

## Templates réutilisables

### `templates/deploy-steps.yml`

```yaml
parameters:
  - name: environment
    type: string

steps:
  - download: current
    artifact: drop

  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'sc-myapp-${{ parameters.environment }}'
      appName: 'myapp-${{ parameters.environment }}'
      package: '$(Pipeline.Workspace)/drop/**/*.zip'
      deploymentMethod: zipDeploy

  - script: |
      for i in 1 2 3; do
        curl -sf https://myapp-${{ parameters.environment }}.azurewebsites.net/health && break
        echo "Retry $i..." && sleep 10
      done
    displayName: Health check (${{ parameters.environment }})
```

### `templates/dotnet-build-job.yml`

```yaml
parameters:
  - name: projects
    type: string
    default: '**/*.csproj'
  - name: testProjects
    type: string
    default: '**/*Tests.csproj'
  - name: dotnetVersion
    type: string
    default: '8.0.x'

jobs:
  - job: Build
    steps:
      - task: UseDotNet@2
        inputs:
          version: ${{ parameters.dotnetVersion }}
      - script: dotnet restore ${{ parameters.projects }} --locked-mode
      - script: dotnet build ${{ parameters.projects }} -c Release --no-restore
      - script: dotnet test ${{ parameters.testProjects }} -c Release --no-build
```

---

## Cache des dépendances (gains typiques : 40–70 %)

```yaml
# NuGet
- task: Cache@2
  inputs:
    key: 'nuget | "$(Agent.OS)" | **/packages.lock.json'
    restoreKeys: 'nuget | "$(Agent.OS)"'
    path: $(NUGET_PACKAGES)

# npm
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | package-lock.json'
    restoreKeys: 'npm | "$(Agent.OS)"'
    path: $(npm_config_cache)
```

---

## Sécurité

- **Secrets → Variable Group + Key Vault** : dans l'UI ADO, lier le Variable Group à un Azure Key Vault ; les secrets apparaissent comme variables masquées.
- **Service Connections** : créer un principal de service dédié par environnement avec uniquement le rôle `Contributor` sur le Resource Group cible.
- **Approvals** : configurer dans *Environments → [env] → Approvals and checks* ; ajouter un délai minimal et une liste d'approbateurs.
- **Branch policies** : bloquer les merges vers `main` si le pipeline PR échoue (Policy "Build validation").
- **Audit log** : activer l'audit ADO pour tracer les modifications de pipelines et de Variable Groups.

---

## Garde-fous / Anti-patterns

| Anti-pattern | Problème | Correction |
|---|---|---|
| Secrets en clair dans le YAML | Exposé dans l'historique Git | Variable Group lié à Key Vault |
| Un seul stage "Build+Deploy" | Pas de séparation CI/CD, rollback impossible | Stages distincts avec artifacts |
| `condition: always()` sur le deploy | Déploie même si le build échoue | Utiliser `succeeded()` explicitement |
| `pool: vmImage: windows-latest` pour tout | Lent et coûteux pour du Linux | Choisir l'OS en fonction de la cible |
| Pas de `--locked-mode` sur `dotnet restore` | Versions de packages non reproductibles | Committer `packages.lock.json` et ajouter le flag |
| Jobs séquentiels par défaut | Durée inutilement longue | Identifier les jobs parallélisables via `dependsOn: []` |
| Template avec logique métier hardcodée | Non réutilisable | Paramétrer systématiquement (`parameters`) |
| Déployer sur prod sans health check | Régression silencieuse | Health check avec retry dans le template de déploiement |

---

## Bonnes pratiques 2026

- **Environments** plutôt que classic Release Pipelines — meilleure traçabilité, approvals natifs, historique de déploiement.
- **`--locked-mode`** sur `dotnet restore` et `npm ci` à la place de `npm install` — builds reproductibles.
- **Scheduled trigger** pour les scans de sécurité (Dependabot, OWASP) séparément du pipeline principal.
- **Matrix builds** pour tester sur plusieurs versions de runtime :
  ```yaml
  strategy:
    matrix:
      dotnet8:
        dotnetVersion: '8.0.x'
      dotnet9:
        dotnetVersion: '9.0.x'
  ```
- **Conditional variable groups** par environnement pour isoler les configurations :
  ```yaml
  variables:
    - ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
      - group: prod-vars
    - ${{ else }}:
      - group: dev-vars
  ```
- **Self-hosted agents** pour les builds fréquents (> 20/jour) — réduit les coûts et améliore la latence.
- **Azure Artifacts** pour les packages internes : configurer le feed en upstream source et utiliser `dotnet nuget push` dans le pipeline.


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
