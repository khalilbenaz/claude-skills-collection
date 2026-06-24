---
name: gitlab-ci-guide
description: Pipelines GitLab CI/CD — stages, jobs, runners, artifacts, environments et Auto DevOps. Se déclenche avec "GitLab CI", "gitlab-ci.yml", "pipeline GitLab", "runner GitLab", "GitLab CD".
---

# Guide GitLab CI/CD

## 1. Concevoir la structure du pipeline

Définir les stages dans l'ordre d'exécution logique. Les jobs d'un même stage tournent en parallèle ; `needs:` casse cette contrainte pour du DAG.

```yaml
stages:
  - build
  - test
  - analyze
  - deploy
```

**Critères de découpage :**
- Un stage = une responsabilité (ne pas mélanger build et test).
- Si un job doit démarrer avant la fin de son stage, utiliser `needs:` (DAG).
- Limiter à 6-7 stages max — au-delà, refactorer en pipelines enfants.

## 2. Écrire les jobs

Structure minimale d'un job de référence :

```yaml
build:app:
  stage: build
  image: node:22-alpine
  before_script:
    - npm ci --cache .npm --prefer-offline
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
```

**Règles d'exécution — préférer `rules:` à `only/except`** :

```yaml
deploy:production:
  stage: deploy
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: never
  environment:
    name: production
    url: https://app.example.com
```

## 3. Gérer les runners

| Type | Cas d'usage | Config clé |
|------|------------|------------|
| Shared runners | CI standard, projets publics | Tags vides ou `saas-linux-*` |
| Group runners | Équipe partageant des secrets d'infra | `group_runners_enabled: true` |
| Project runners | Accès réseau interne, GPU, Windows | Runner enregistré avec tag dédié |

**Enregistrer un runner (GitLab 17+) :**
```bash
gitlab-runner register \
  --url https://gitlab.example.com \
  --token $RUNNER_TOKEN \
  --executor docker \
  --docker-image alpine:latest \
  --tag-list "docker,linux,build"
```

**Auto-scaling avec Docker Machine (on-premise) :** utiliser `executor = "docker+machine"` + provider cloud dans `config.toml`. Pour Kubernetes : utiliser le runner Helm chart officiel.

## 4. Cache et artifacts

```yaml
# Cache partagé entre branches — clé sur fichier de lock
cache:
  key:
    files:
      - yarn.lock
  paths:
    - node_modules/
  policy: pull-push   # pull-push par défaut ; "pull" pour jobs read-only

# Artifact de test coverage
test:unit:
  script: pytest --cov=src --cov-report=xml
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
    expire_in: 7 days
```

**Règle :** toujours mettre `expire_in` sur les artifacts — sans ça, GitLab conserve par défaut selon la config instance (peut saturer le stockage).

**`dependencies: []`** sur les jobs de déploiement pour ne pas télécharger d'artifacts inutiles.

## 5. Pipelines avancés

### DAG avec `needs:`
```yaml
test:unit:
  stage: test
  needs: [build:app]   # démarre dès que build:app est terminé, pas toute la stage build

test:e2e:
  stage: test
  needs: [build:app, build:docker]
```

### Pipelines enfants (monorepo)
```yaml
trigger:backend:
  trigger:
    include: backend/.gitlab-ci.yml
    strategy: depend   # le parent attend la fin du pipeline enfant
  rules:
    - changes:
        - backend/**/*
```

### Templates partagés
```yaml
include:
  - project: 'infra/ci-templates'
    ref: main
    file: '/templates/docker-build.yml'
  - template: 'Security/SAST.gitlab-ci.yml'
```

## 6. Environnements et déploiements

```yaml
deploy:review:
  stage: deploy
  script: ./scripts/deploy-review.sh $CI_ENVIRONMENT_SLUG
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_ENVIRONMENT_SLUG.preview.example.com
    on_stop: stop:review
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

stop:review:
  stage: deploy
  script: ./scripts/teardown-review.sh $CI_ENVIRONMENT_SLUG
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  when: manual
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## 7. Sécurité intégrée

Activer les scanners natifs via les templates officiels :
```yaml
include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - template: Security/Container-Scanning.gitlab-ci.yml
  - template: Security/Secret-Detection.gitlab-ci.yml
```

**Variables sensibles :**
```bash
# Via CLI
glab variable set MY_SECRET "valeur" --masked --protected --project monprojet
```
Dans l'UI : Settings > CI/CD > Variables → cocher `Masked` + `Protected`.

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Utiliser `only/except` | Comportement imprévisible sur MR | Migrer vers `rules:` |
| Artifacts sans `expire_in` | Saturation stockage | Toujours fixer `expire_in` |
| Secrets en clair dans le script | Fuite dans les logs | Variables masked + protected |
| Un seul `.gitlab-ci.yml` de 500 lignes | Illisible, impossible à maintenir | `include:local:` par domaine |
| Cache sans `key:files:` | Cache invalidé ou réutilisé à tort | Clé sur fichier de lock |
| `when: always` sur les jobs de cleanup | Exécution même en cas d'échec upstream | `when: on_failure` ou `needs:` explicite |
| Pas de `interruptible: true` sur les jobs de build | Files de runners saturées | Marquer les jobs annulables |

## Bonnes pratiques 2026

- **Pipeline Component Catalog** (GitLab 16.9+) : publier des composants réutilisables dans le Catalog plutôt que des templates `include:remote`.
- **CI/CD Catalog** : préférer `component:` à `include:project:` pour la versioning sémantique.
- **`id_tokens:`** (OIDC) : remplacer les tokens statiques pour l'auth cloud (AWS, Azure, GCP) par des tokens OIDC courts-vivants.
- **Merge Train** : activer sur les branches protégées à fort trafic pour éviter les régressions post-merge.
- **`dast_configuration:`** : pointer sur un environnement de review pour le DAST plutôt qu'une URL codée en dur.
- Tester le pipeline localement avant push : `gitlab-runner exec docker build:app`.
