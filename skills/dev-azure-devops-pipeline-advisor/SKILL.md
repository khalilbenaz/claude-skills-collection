---
name: dev-azure-devops-pipeline-advisor
description: Conception de pipelines CI/CD avec Azure DevOps (YAML pipelines, stages, templates, déploiement multi-environnement). À utiliser quand l'utilisateur travaille avec Azure DevOps, configure des pipelines YAML ou gère des releases. Se déclenche aussi avec "azure devops", "pipeline YAML", "azure pipeline", "CI/CD azure", "release pipeline", "azure artifacts".
---

# Conseiller Azure DevOps Pipelines

## Workflow

1. **Comprendre le besoin** : CI seul, CD, ou CI/CD complet. Mono-repo ou multi-repo.
2. **Concevoir le pipeline** : stages, jobs, steps et conditions.
3. **Implémenter** : YAML pipeline avec templates réutilisables.
4. **Sécuriser** : variables secrètes, approvals, gates.

## Structure d'un pipeline YAML

```yaml
trigger:
  branches:
    include:
      - main
      - release/*
  paths:
    exclude:
      - docs/*
      - '*.md'

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: 'common-variables'
  - name: buildConfiguration
    value: 'Release'
  - name: dotnetVersion
    value: '8.0.x'

stages:
  - stage: Build
    displayName: 'Build & Test'
    jobs:
      - job: BuildJob
        steps:
          - task: UseDotNet@2
            inputs:
              version: $(dotnetVersion)

          - script: dotnet restore
            displayName: 'Restore packages'

          - script: dotnet build --configuration $(buildConfiguration) --no-restore
            displayName: 'Build solution'

          - script: dotnet test --configuration $(buildConfiguration) --no-build --collect:"XPlat Code Coverage"
            displayName: 'Run tests'

          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '**/coverage.cobertura.xml'

  - stage: DeployDev
    displayName: 'Deploy to Dev'
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployDev
        environment: 'dev'
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/deploy-steps.yml
                  parameters:
                    environment: 'dev'

  - stage: DeployStaging
    displayName: 'Deploy to Staging'
    dependsOn: DeployDev
    jobs:
      - deployment: DeployStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/deploy-steps.yml
                  parameters:
                    environment: 'staging'

  - stage: DeployProd
    displayName: 'Deploy to Production'
    dependsOn: DeployStaging
    condition: and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/heads/release/'))
    jobs:
      - deployment: DeployProd
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/deploy-steps.yml
                  parameters:
                    environment: 'production'
```

## Templates réutilisables

### Template de déploiement

```yaml
# templates/deploy-steps.yml
parameters:
  - name: environment
    type: string

steps:
  - download: current
    artifact: drop

  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'azure-service-connection-${{ parameters.environment }}'
      appName: 'myapp-${{ parameters.environment }}'
      package: '$(Pipeline.Workspace)/drop/**/*.zip'

  - script: |
      curl -f https://myapp-${{ parameters.environment }}.azurewebsites.net/health
    displayName: 'Health check post-deploy'
```

### Template de job .NET

```yaml
# templates/dotnet-build.yml
parameters:
  - name: projects
    type: string
    default: '**/*.csproj'
  - name: testProjects
    type: string
    default: '**/*Tests.csproj'

jobs:
  - job: Build
    steps:
      - script: dotnet restore ${{ parameters.projects }}
      - script: dotnet build ${{ parameters.projects }} -c Release --no-restore
      - script: dotnet test ${{ parameters.testProjects }} -c Release --no-build
```

## Bonnes pratiques

### Sécurité
- Stocker les secrets dans des **Variable Groups** liés à Azure Key Vault
- Utiliser des **Service Connections** avec des principaux à droits minimaux
- Configurer des **Approvals** sur les environnements de production
- Ne jamais logger de secrets dans les steps

### Performance
- Utiliser le **cache** pour les dépendances (NuGet, npm)
- Paralléliser les jobs indépendants
- Utiliser des agents self-hosted pour les builds fréquents
- Conditionner les stages pour éviter les exécutions inutiles

### Organisation
- Un fichier `azure-pipelines.yml` à la racine du repo
- Templates dans un dossier `templates/`
- Variable Groups par environnement
- Nommer les stages et jobs de manière descriptive

## Règles
- Toujours utiliser des templates pour le code dupliqué entre stages.
- Les secrets doivent être dans des Variable Groups, jamais en clair dans le YAML.
- Chaque déploiement en production doit avoir un approval gate.
- Inclure un health check post-déploiement dans chaque stage de déploiement.
