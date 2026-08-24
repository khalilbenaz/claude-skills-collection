---
name: kubernetes-helper
description: Aide à la configuration et au déploiement sur Kubernetes. Se déclenche avec "Kubernetes", "K8s", "kubectl", "pod", "deployment", "service Kubernetes", "ingress", "helm", "cluster", "namespace". Also triggers on "Kubernetes manifest", "deploy to k8s", "pod is crashlooping".
---

# Kubernetes Helper

## Workflow

### 1. Qualifier le besoin
- Stateless ou Stateful ? (StatefulSet + PVC si données persistantes)
- Provider : AKS / EKS / GKE / on-premise — impacte StorageClass, LB, CNI
- Nombre de réplicas cible, SLA, contraintes réseau (NetworkPolicy), GitOps ou CLI ?

### 2. Structure des manifests

Organiser par dossier :
```
k8s/
  base/
    deployment.yaml
    service.yaml
    configmap.yaml
    secret.yaml         # ou ExternalSecrets / SealedSecret
    ingress.yaml
  overlays/
    dev/kustomization.yaml
    prod/kustomization.yaml
```

### 3. Deployment minimal prêt pour la prod

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-ns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: my-app
          image: my-registry/my-app:1.2.3   # tag fixe, jamais latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: my-app-secret
                  key: db-password
```

### 4. Scaling automatique

**HPA (charge CPU/mémoire)**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

**PodDisruptionBudget** (toujours ajouter en prod)
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-app
```

### 5. Networking

| Besoin | Type Service |
|--------|-------------|
| Interne cluster | ClusterIP |
| Debug local | NodePort (temp) |
| Exposition externe | LoadBalancer ou Ingress |

**Ingress NGINX minimal**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
  tls:
    - hosts:
        - app.example.com
      secretName: my-app-tls
```

### 6. Sécurité RBAC minimale

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: my-ns
  name: my-app-role
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-rolebinding
  namespace: my-ns
subjects:
  - kind: ServiceAccount
    name: my-app-sa
    namespace: my-ns
roleRef:
  kind: Role
  name: my-app-role
  apiGroup: rbac.authorization.k8s.io
```

### 7. Commandes kubectl utiles

```bash
# Vérifier l'état du rollout
kubectl rollout status deployment/my-app -n my-ns

# Rollback rapide
kubectl rollout undo deployment/my-app -n my-ns

# Logs multi-pods avec label
kubectl logs -l app=my-app -n my-ns --tail=100 -f

# Describe pod crashant
kubectl describe pod -l app=my-app -n my-ns

# Exec dans un pod
kubectl exec -it deploy/my-app -n my-ns -- sh

# Top ressources
kubectl top pods -n my-ns --sort-by=memory

# Port-forward debug
kubectl port-forward svc/my-app 8080:80 -n my-ns
```

### 8. Helm : packaging par environnement

```bash
# Créer un chart
helm create my-app

# Installer avec values spécifiques
helm upgrade --install my-app ./my-app \
  -n my-ns --create-namespace \
  -f values-prod.yaml \
  --set image.tag=1.2.3

# Diff avant apply (plugin helm-diff)
helm diff upgrade my-app ./my-app -f values-prod.yaml
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Correctif |
|---|---|---|
| `image: latest` | rollouts non déterministes | Tag fixe ou digest SHA |
| Pas de `resources.limits` | node starvation | Toujours définir requests + limits |
| Pas de probes | trafic vers pod non prêt | readiness + liveness sur chaque container |
| Secrets en clair dans le YAML | fuite dans git | ExternalSecrets ou SealedSecrets |
| `privileged: true` | escalade de privilèges | `runAsNonRoot: true` + drop ALL capabilities |
| 1 seul replica en prod | SPOF | min 2 replicas + PDB |
| NetworkPolicy absente | mouvement latéral | default-deny + allow explicite |
| `kubectl apply` manuel en prod | désynchronisation | GitOps : ArgoCD ou Flux |

## Bonnes pratiques 2026

- **Kustomize** pour la gestion multi-environnements (overlays dev/staging/prod), intégré nativement à kubectl
- **Server-Side Apply** (`kubectl apply --server-side`) pour éviter les conflits de field managers
- **OPA Gatekeeper / Kyverno** pour les politiques d'admission (remplace PodSecurityPolicy déprécié)
- **KEDA** pour le scaling event-driven (files de messages, métriques custom) en complément de HPA
- **Cilium** comme CNI pour des NetworkPolicies L7 et l'eBPF observability sans sidecar
- **Cosign + policy-controller** pour la vérification des signatures d'images en cluster
- Utiliser `topologySpreadConstraints` pour répartir les pods sur plusieurs zones AZ
- Activer `minReadySeconds` sur le Deployment pour absorber les faux positifs au démarrage
