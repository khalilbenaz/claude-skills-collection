---
name: devops-helm-chart-builder
description: Conception de charts Helm pour Kubernetes — templates, values, dépendances et stratégies de déploiement. À utiliser quand l'utilisateur crée ou modifie des charts Helm, configure des déploiements K8s ou gère des releases. Se déclenche aussi avec "helm", "chart helm", "helm template", "values.yaml", "helm install", "helm upgrade", "kubernetes helm".
---

# Constructeur de Charts Helm

## Workflow en étapes

1. **Analyser** — identifier : type d'app (stateless/stateful), dépendances externes, environnements cibles, besoins ingress/secret/HPA.
2. **Scaffolder** — `helm create mychart` puis nettoyer les exemples inutiles.
3. **Modéliser `values.yaml`** — définir des defaults qui fonctionnent en dev sans surcharge. Tout ce qui varie par env = exposé en value.
4. **Écrire les templates** — utiliser `_helpers.tpl` pour les labels/noms ; ajouter `checksum/config` pour forcer le rollout sur changement de ConfigMap.
5. **Valider localement** — `helm lint`, `helm template`, `helm diff` (plugin) avant tout push.
6. **Déployer par env** — `helm upgrade --install` avec `-f values-prod.yaml` et `--set image.tag=$TAG`.
7. **Opérations post-deploy** — vérifier `helm status`, inspecter les logs, prévoir `helm rollback` si nécessaire.

## Structure type

```
mychart/
├── Chart.yaml              # Métadonnées + dépendances
├── values.yaml             # Defaults (dev fonctionnel sans override)
├── values-staging.yaml
├── values-prod.yaml
├── templates/
│   ├── _helpers.tpl        # include réutilisables (labels, fullname…)
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── configmap.yaml
│   ├── secret.yaml         # ou ExternalSecret si ESO
│   ├── serviceaccount.yaml
│   └── NOTES.txt           # affiché après install
└── charts/                 # dépendances téléchargées
```

## Chart.yaml

```yaml
apiVersion: v2
name: payment-api
description: API de gestion des paiements
type: application          # ou "library" pour un chart utilitaire
version: 1.3.0             # SemVer du chart (indépendant de l'app)
appVersion: "3.2.0"        # version de l'image applicative
dependencies:
  - name: postgresql
    version: "15.x.x"
    repository: "oci://registry-1.docker.io/bitnamicharts"
    condition: postgresql.enabled   # désactivable via values
```

> **Critère** : incrémenter `version` à chaque changement de template ; incrémenter `appVersion` à chaque release applicative.

## `_helpers.tpl` — base minimale

```yaml
{{- define "mychart.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "mychart.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "mychart.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

## Deployment — template de référence

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "mychart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "mychart.selectorLabels" . | nindent 8 }}
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      serviceAccountName: {{ include "mychart.fullname" . }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
          envFrom:
            - configMapRef:
                name: {{ include "mychart.fullname" . }}
          {{- if .Values.secret.enabled }}
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "mychart.fullname" . }}
                  key: db-password
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: {{ .Values.probes.liveness.path }}
              port: http
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: {{ .Values.probes.readiness.path }}
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
```

## `values.yaml` — defaults complets

```yaml
replicaCount: 1   # override à 2+ en prod

image:
  repository: myregistry.azurecr.io/payment-api
  tag: ""          # vide = Chart.AppVersion
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: false   # activé par values-prod.yaml
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
  hosts:
    - host: api.company.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

probes:
  liveness:
    path: /health/live
  readiness:
    path: /health/ready

secret:
  enabled: false

postgresql:
  enabled: false   # activer localement si nécessaire
```

## Commandes essentielles

```bash
# Scaffolding
helm create mychart

# Validation locale (toujours avant push)
helm lint mychart
helm template myrelease mychart -f values-prod.yaml | kubectl apply --dry-run=client -f -

# Déploiement
helm upgrade --install myrelease ./mychart \
  -f values-prod.yaml \
  --set image.tag=v3.2.0 \
  --namespace prod \
  --create-namespace \
  --atomic \           # rollback auto si échec
  --timeout 5m

# Différences avant upgrade (plugin helm-diff requis)
helm diff upgrade myrelease ./mychart -f values-prod.yaml --set image.tag=v3.2.0

# Rollback
helm rollback myrelease 1   # révision 1

# Dépendances
helm dependency update mychart

# Inspecter une release
helm status myrelease -n prod
helm get values myrelease -n prod
helm history myrelease -n prod

# OCI registry (Helm 3.8+)
helm push mychart-1.3.0.tgz oci://myregistry.azurecr.io/charts
helm install myrelease oci://myregistry.azurecr.io/charts/mychart --version 1.3.0
```

## Critères de décision

| Besoin | Solution recommandée |
|---|---|
| Secret sensible en prod | ExternalSecret (ESO) ou Vault Agent Injector, pas `kind: Secret` en clair |
| Multi-environnements | `values-<env>.yaml` + `-f` à l'install, pas de Helm templating conditionnel excessif |
| Dépendance DB locale en dev | `postgresql.enabled: true` dans `values-dev.yaml` |
| App stateful (DB, Kafka…) | `StatefulSet` + PVC dans le template, pas `Deployment` |
| Chart réutilisable entre équipes | Chart de type `library` dans un registry OCI partagé |
| Rollout zero-downtime | `strategy.type: RollingUpdate` + `minReadySeconds` + probes correctes |

## Anti-patterns / pièges

- **`image.tag: latest`** — non reproductible. Toujours passer `--set image.tag=$CI_SHA`.
- **Secrets en clair dans values.yaml** — ne jamais committer des credentials ; utiliser ESO, Vault ou `--set secret.password=$VAR` depuis CI.
- **`helm install` sans `--atomic`** — laisse une release en état `FAILED` ; préférer `--atomic` en CI/CD.
- **Omettre `checksum/config`** — le pod ne redémarre pas quand la ConfigMap change sans cette annotation.
- **Oublier `helm dependency update`** — dossier `charts/` vide → install échoue silencieusement.
- **Versioning mal séparé** — ne pas synchroniser `version` (chart) et `appVersion` (image) : les deux bougent indépendamment.
- **Templates trop conditionnels** — `{{- if .Values.featureX }}…{{- end }}` partout rend le chart illisible ; préférer des charts séparés ou des overlays Kustomize pour des variantes majeures.
- **Pas de `NOTES.txt`** — priver les utilisateurs du mode d'emploi post-install.

## Bonnes pratiques 2026

- Publier dans un **registry OCI** (ACR, ECR, GHCR) plutôt qu'un chart repo HTTP classique.
- Utiliser **`helm diff`** en CI pour générer un résumé lisible dans la PR avant merge.
- Coupler avec **`ct` (chart-testing)** pour le lint et les tests d'intégration automatisés.
- Activer **`NetworkPolicy`** par défaut dans le chart pour limiter le blast radius.
- Générer la **documentation** des values avec `helm-docs` (annotations `# -- description`).
- Préférer **`--atomic --timeout`** en CD pour garantir un rollback automatique en cas d'échec de rollout.


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
