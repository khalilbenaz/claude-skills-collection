---
name: argocd-guide
description: GitOps avec ArgoCD incluant applications, sync, rollbacks, multi-cluster et App of Apps pattern. Se déclenche avec "ArgoCD", "Argo CD", "GitOps", "sync ArgoCD", "application ArgoCD", "App of Apps"
---

# ArgoCD Guide

## 1. Installation et configuration initiale

```bash
# Helm (recommandé en prod)
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd \
  --namespace argocd --create-namespace \
  --set server.insecure=false \
  --set configs.params."server\.insecure"=false \
  -f argocd-values.yaml

# Récupérer le mot de passe admin initial
argocd admin initial-password -n argocd

# Login CLI
argocd login argocd.example.com --username admin --grpc-web
```

**SSO (Azure AD OIDC) — config minimale dans `argocd-cm` :**
```yaml
data:
  oidc.config: |
    name: Azure
    issuer: https://login.microsoftonline.com/<tenant-id>/v2.0
    clientID: <app-id>
    clientSecret: $oidc.azure.clientSecret
    requestedScopes: [openid, profile, email]
```

**RBAC — `argocd-rbac-cm` :**
```yaml
data:
  policy.csv: |
    p, role:developer, applications, sync, */*, allow
    p, role:developer, applications, get, */*, allow
    g, team-dev@example.com, role:developer
  policy.default: role:readonly
```

---

## 2. Connecter un repository Git

```bash
# SSH key
argocd repo add git@github.com:org/gitops-repo.git \
  --ssh-private-key-path ~/.ssh/id_ed25519

# HTTPS token
argocd repo add https://github.com/org/gitops-repo.git \
  --username argocd --password <token>
```

**Structure de repo recommandée (monorepo) :**
```
gitops-repo/
├── apps/                   # App of Apps (root)
│   ├── dev/
│   └── prod/
├── manifests/
│   ├── my-app/
│   │   ├── base/
│   │   └── overlays/
│   │       ├── dev/
│   │       └── prod/
└── infra/
    └── monitoring/
```

---

## 3. Déclarer une Application (déclaratif YAML)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-prod
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io   # cascade delete
spec:
  project: production
  source:
    repoURL: git@github.com:org/gitops-repo.git
    targetRevision: main
    path: manifests/my-app/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: false          # JAMAIS true en prod sans sync window
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - RespectIgnoreDifferences=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

**Critères sync policy :**
| Env | auto-sync | prune | selfHeal | Sync window |
|-----|-----------|-------|----------|-------------|
| dev | oui | oui | oui | non |
| staging | oui | oui | oui | optionnel |
| prod | non (ou oui) | **non** | oui | **obligatoire** |

---

## 4. App of Apps — bootstrapping cluster

```yaml
# root-app.yaml — appliqué une seule fois manuellement
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: default
  source:
    repoURL: git@github.com:org/gitops-repo.git
    targetRevision: HEAD
    path: apps/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Le dossier `apps/prod/` contient des `Application` YAML pour chaque workload. ArgoCD les crée en cascade. Un seul `kubectl apply -f root-app.yaml` bootstrap le cluster entier.

---

## 5. ApplicationSet — multi-cluster / multi-env

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-clusters
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            env: production
  template:
    metadata:
      name: "my-app-{{name}}"
    spec:
      project: production
      source:
        repoURL: git@github.com:org/gitops-repo.git
        targetRevision: main
        path: "manifests/my-app/overlays/{{metadata.labels.env}}"
      destination:
        server: "{{server}}"
        namespace: my-app
```

**Enregistrer un cluster distant :**
```bash
# Le context kubeconfig doit pointer sur le cluster cible
argocd cluster add prod-eu-west \
  --name prod-eu-west \
  --label env=production
```

---

## 6. Sync waves et hooks

Contrôler l'ordre de déploiement (ex: CRD avant opérateur, migration DB avant app) :

```yaml
# CRD déployée en wave -1 (avant tout)
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
# Job de migration en wave 0
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
---
# App en wave 1
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

---

## 7. Rollback

```bash
# Lister l'historique
argocd app history my-app-prod

# Rollback vers une révision précédente (ID depuis history)
argocd app rollback my-app-prod <revision-id>

# Forcer un sync sur un commit Git précis
argocd app set my-app-prod --revision abc1234
argocd app sync my-app-prod
```

Après rollback manuel, désactiver l'auto-sync sinon ArgoCD re-synce immédiatement vers HEAD :
```bash
argocd app set my-app-prod --sync-policy none
```

---

## 8. Secrets — ne jamais stocker en clair dans Git

| Outil | Quand l'utiliser |
|-------|-----------------|
| **External Secrets Operator** | Secrets dans Vault / AWS SSM / Azure Key Vault — recommandé 2026 |
| **SOPS + age/KMS** | Chiffrement in-repo, rotation manuelle, simple à auditer |
| **Sealed Secrets** | Cluster-specific, sans dépendance externe |

```yaml
# ExternalSecret (ESO)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-creds
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: db-creds
  data:
    - secretKey: password
      remoteRef:
        key: secret/my-app/db
        property: password
```

---

## 9. Monitoring et notifications

```bash
# Métriques Prometheus exposées par argocd-metrics:8082
# Alertes utiles :
# argocd_app_sync_total{phase="Error"} > 0
# argocd_app_health_status{health_status!="Healthy"} > 0
```

**Notification Slack (argocd-notifications) :**
```yaml
# argocd-notifications-cm
data:
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]
  template.app-sync-failed: |
    message: |
      App {{.app.metadata.name}} sync FAILED: {{.app.status.operationState.message}}
```

---

## Anti-patterns et pièges

- **prune: true en prod sans sync window** — supprime des ressources inattendues dès qu'elles disparaissent du repo (oubli d'un fichier = outage).
- **Créer des Applications via l'UI ou la CLI seulement** — non auditable, disparaît si ArgoCD est recréé. Toujours committer le YAML.
- **Stocker des secrets en clair dans le repo GitOps** — violation immédiate si le repo est compromis. Utiliser ESO ou SOPS.
- **Ignorer les sync waves pour les CRDs** — ArgoCD tente de créer des resources custom avant que la CRD existe → erreur de sync.
- **Un seul AppProject `default` pour tous les environnements** — perte de l'isolation RBAC. Créer un AppProject par équipe/env.
- **targetRevision: HEAD en prod** — un merge accidentel se déploie aussitôt. Préférer un tag ou un sha fixe, ou utiliser une sync window.
- **health checks manquants pour les CRDs** — ArgoCD rapporte `Healthy` même si l'opérateur est en erreur. Définir un custom health check Lua.

```lua
-- Exemple health check Lua pour un CRD custom
hs = {}
if obj.status ~= nil then
  if obj.status.phase == "Ready" then
    hs.status = "Healthy"
  elseif obj.status.phase == "Failed" then
    hs.status = "Degraded"
    hs.message = obj.status.message
  else
    hs.status = "Progressing"
  end
else
  hs.status = "Progressing"
end
return hs
```

---

## Bonnes pratiques 2026

- Utiliser **ArgoCD v2.12+** (image pull policy configurable, ApplicationSet matrix generator stable).
- Activer le **server-side apply** (`ServerSideApply=true` dans syncOptions) pour éviter les conflits de field managers.
- Préférer **Kustomize** pour les overlays d'environnement et **Helm** pour les charts de librairies tierces.
- Brancher **Argo Rollouts** pour les déploiements progressifs (canary, blue-green) plutôt que les rolling updates natifs K8s.
- Versionner les `AppProject` et les `ApplicationSet` dans Git comme toute autre ressource ArgoCD.
- Activer `impersonation` (ArgoCD 2.10+) pour que chaque Application s'exécute avec un ServiceAccount dédié, limitant le blast radius.
