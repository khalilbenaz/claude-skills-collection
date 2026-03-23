---
name: helm-chart-builder
description: Conception de charts Helm pour Kubernetes — templates, values, dépendances et stratégies de déploiement. À utiliser quand l'utilisateur crée ou modifie des charts Helm, configure des déploiements K8s ou gère des releases. Se déclenche aussi avec "helm", "chart helm", "helm template", "values.yaml", "helm install", "helm upgrade", "kubernetes helm".
---

# Constructeur de Charts Helm

## Workflow

1. **Structurer** : créer le squelette du chart avec les templates essentiels.
2. **Paramétrer** : définir les values avec des défauts sensibles.
3. **Tester** : `helm template` et `helm lint` avant l'installation.
4. **Déployer** : install/upgrade avec les values par environnement.

## Structure d'un chart

```
mychart/
├── Chart.yaml              # Métadonnées du chart
├── values.yaml             # Valeurs par défaut
├── values-dev.yaml         # Override par environnement
├── values-prod.yaml
├── templates/
│   ├── _helpers.tpl        # Fonctions réutilisables
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── serviceaccount.yaml
└── charts/                 # Dépendances
```

## Chart.yaml

```yaml
apiVersion: v2
name: payment-api
description: API de gestion des paiements
type: application
version: 1.2.0        # Version du chart
appVersion: "3.1.0"   # Version de l'application
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

## Templates essentiels

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
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
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          envFrom:
            - configMapRef:
                name: {{ include "mychart.fullname" . }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /health/live
              port: {{ .Values.service.targetPort }}
          readinessProbe:
            httpGet:
              path: /health/ready
              port: {{ .Values.service.targetPort }}
```

### Values par défaut

```yaml
# values.yaml
replicaCount: 2

image:
  repository: myregistry.azurecr.io/payment-api
  tag: ""
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.company.com
      paths:
        - path: /payments
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
  targetCPUUtilization: 70
```

## Commandes essentielles

```bash
helm create mychart              # Créer un nouveau chart
helm lint mychart                # Vérifier la syntaxe
helm template mychart            # Prévisualiser les manifestes
helm install myrelease mychart   # Installer
helm upgrade myrelease mychart   # Mettre à jour
helm rollback myrelease 1       # Rollback à la révision 1
helm diff upgrade myrelease mychart  # Voir les différences (plugin)
```

## Règles
- Toujours utiliser `helm lint` et `helm template` avant un déploiement.
- Les values par défaut doivent produire un chart fonctionnel en dev.
- Utiliser `_helpers.tpl` pour les labels et noms réutilisables.
- Versionner le chart (`version`) indépendamment de l'application (`appVersion`).
