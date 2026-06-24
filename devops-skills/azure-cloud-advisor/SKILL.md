---
name: azure-cloud-advisor
description: Conseils pour l'architecture et le déploiement sur Azure — App Service, Azure Functions, Container Apps, SQL Azure et bonnes pratiques cloud. À utiliser quand l'utilisateur déploie sur Azure, choisit des services cloud ou optimise ses coûts Azure. Se déclenche aussi avec "Azure", "App Service", "Azure Functions", "Container Apps", "Azure SQL", "déploiement Azure", "coûts Azure".
---

# Conseiller Azure Cloud

## Workflow

1. **Qualifier le besoin** : type de workload (web, event-driven, batch, temps réel), contraintes (SLA, latence, data residency), budget mensuel cible.
2. **Choisir le service de compute** : utiliser la matrice ci-dessous ; si ambiguïté, demander si l'équipe maîtrise déjà K8s.
3. **Architecturer** : topologie réseau (VNet, Private Endpoints), sécurité (Managed Identity, Key Vault), résilience (zones, geo-replication).
4. **Provisionner** : commandes `az` copiables ou Bicep/Terraform.
5. **Optimiser** : coûts (Reserved, Spot, scale-to-zero), performance (profiling via App Insights), scalabilité.

---

## Choix du service de compute

| Service | Usage idéal | Scale | Coût typique |
|---|---|---|---|
| **App Service** | API/app web .NET, Node, Python | Auto-scale par plan | ~40 €/mois (B2) |
| **Container Apps** | Microservices conteneurisés, Dapr | KEDA, scale-to-zero | ~0–80 €/mois |
| **Azure Functions** | Événementiel, triggers (HTTP, Queue, Timer) | Consumption auto | ~0 (< 1 M req/mois gratis) |
| **AKS** | Orchestration K8s complexe, multi-tenant | Node autoscaler + KEDA | > 100 €/mois |
| **VM / VMSS** | Legacy, contrôle réseau total | Manual ou VMSS | Variable |

### Arbre de décision

```
Nouveau projet ?
├── Traitements événementiels courts (< 10 min) → Azure Functions (Consumption)
├── Microservices conteneurisés, trafic variable → Container Apps
├── App web / API REST, équipe sans ops K8s    → App Service
├── Besoin Kubernetes avancé (CRD, helm, réseau custom) → AKS
└── Migration lift-and-shift ou workload GPU   → VM / VMSS

Migration d'un existant ?
├── App .NET monolithique IIS → App Service (Windows plan)
├── Docker Compose existant  → Container Apps
└── Contrôle réseau très fin (BGP, ASN)        → AKS ou VMs
```

---

## Provisionner — commandes copiables

### Créer un Container Apps Environment + app

```bash
# Variables
RG=rg-myapp-prod
LOCATION=westeurope
ENV=cae-myapp-prod
APP=api-backend

az group create -n $RG -l $LOCATION

az containerapp env create \
  --name $ENV --resource-group $RG --location $LOCATION

az containerapp create \
  --name $APP --resource-group $RG \
  --environment $ENV \
  --image myregistry.azurecr.io/api:latest \
  --target-port 8080 --ingress external \
  --min-replicas 0 --max-replicas 10 \
  --cpu 0.5 --memory 1Gi \
  --registry-server myregistry.azurecr.io \
  --system-assigned                         # Managed Identity
```

### Créer une Azure Function (Consumption)

```bash
az storage account create -n stfnmyapp -g $RG -l $LOCATION --sku Standard_LRS
az functionapp create \
  --name fn-myapp-prod --resource-group $RG \
  --storage-account stfnmyapp \
  --consumption-plan-location $LOCATION \
  --runtime dotnet-isolated --runtime-version 8 \
  --functions-version 4 \
  --assign-identity '[system]'
```

### App Service + slot de staging

```bash
az appservice plan create -n plan-myapp -g $RG --sku P2V3 --is-linux
az webapp create -n web-myapp -g $RG --plan plan-myapp --runtime "DOTNETCORE:8.0"
az webapp deployment slot create --name web-myapp -g $RG --slot staging
# Swap zero-downtime :
az webapp deployment slot swap --name web-myapp -g $RG --slot staging
```

---

## Architecture de référence — Container Apps (microservices)

```
Internet
  → Azure Front Door (CDN + WAF)
      → Container Apps Environment (VNet intégré)
            API Gateway (YARP / NGINX)
            ├── Service A  (scale-to-zero, KEDA Queue)
            ├── Service B  (min 1 replica)
            └── Worker     (trigger Azure Service Bus)
      → Azure SQL (Private Endpoint)
      → Azure Cache for Redis (Premium, clustering)
      → Azure Service Bus (Topics + DLQ)
      → Azure Key Vault   (Managed Identity, no secrets in env vars)
      → Application Insights + Log Analytics Workspace
```

---

## Bonnes pratiques par service

### Azure SQL
- **Elastic Pools** si > 3 bases avec charge variable : économie 30–50 %.
- **Active Geo-Replication** (lecture) ou **Failover Groups** (basculement auto) pour HA.
- Alertes sur `DTU percentage > 80 %` ou `CPU percent > 85 %`.
- Toujours se connecter via Managed Identity (pas de mot de passe SQL en config) :
  ```csharp
  // EF Core + Azure Identity
  services.AddDbContext<AppDbContext>(o =>
      o.UseSqlServer(conn, sql => sql.UseAzureIdentityAuthentication()));
  ```

### Azure Key Vault
- **Jamais** de secrets dans App Settings — référencer Key Vault :
  ```
  @Microsoft.KeyVault(SecretUri=https://kv-myapp.vault.azure.net/secrets/DbPassword/)
  ```
- Politique d'accès : RBAC (`Key Vault Secrets User`) plutôt qu'Access Policies (déprécié).
- Activer **Soft-Delete** (90 jours) et **Purge Protection** sur les KV de prod.

### Managed Identities
- System-assigned pour les ressources éphémères (Functions, Container Apps).
- User-assigned pour les identités partagées entre plusieurs services.
- Attribution de rôle :
  ```bash
  az role assignment create \
    --assignee <principal-id> \
    --role "Key Vault Secrets User" \
    --scope /subscriptions/<sub>/resourceGroups/$RG/providers/Microsoft.KeyVault/vaults/kv-myapp
  ```

### Application Insights
- **Toujours** activer le Connection String (pas l'InstrumentationKey, déprécié).
- Activer le **Sampling adaptatif** en prod pour limiter les coûts de télémétrie.
- Custom metrics métier via `TelemetryClient.TrackMetric()` pour les SLA fonctionnels.

---

## Optimisation des coûts

| Levier | Économie estimée | Effort |
|---|---|---|
| Reserved Instances 1 an (App Service, AKS nodes) | 30–45 % | Faible |
| Reserved Instances 3 ans | 50–65 % | Faible |
| Spot VMs (batch, CI workers) | 60–90 % | Moyen |
| Scale-to-zero (Container Apps, Functions) | Très élevé (idle = 0) | Nul |
| Right-sizing (Azure Advisor) | 20–40 % | Moyen |
| Azure Dev/Test subscription | 50–55 % sur VMs | Faible |

```bash
# Voir les recommandations Azure Advisor (coût)
az advisor recommendation list --category Cost -o table
```

---

## Garde-fous / Anti-patterns / Pièges

- **Ne jamais stocker des secrets dans les variables d'environnement** d'App Service ou Container Apps : utiliser Key Vault Reference.
- **Ne pas utiliser le tier Consumption pour des Functions à latence < 200 ms** : cold start 1–3 s sur Consumption ; préférer Premium ou Flex Consumption (2024+).
- **Éviter les connexions SQL avec SQL auth** en production : rotation de mots de passe coûteuse, Managed Identity est gratuit et plus sûr.
- **Ne pas ouvrir les Container Apps sur `--ingress external` si l'API est interne** : utiliser `internal` + communication VNet.
- **Pas de plan Shared/Free en prod** : absence de SLA, throttling CPU agressif.
- **Ne pas négliger les Private Endpoints** : sans eux, le trafic Azure SQL/Storage transite sur l'internet public même dans un VNet.
- **Log Analytics Workspace séparé par environnement** (pas prod + dev dans le même) : isolation des données et contrôle des coûts ingestion.
- **AKS sans Cluster Autoscaler = surprovisionnement systématique** : toujours activer `--enable-cluster-autoscaler`.

---

## Checklist déploiement production

- [ ] Managed Identity activée, aucun secret en clair
- [ ] Key Vault avec Soft-Delete + Purge Protection
- [ ] Private Endpoints sur SQL, Redis, Storage
- [ ] Application Insights connecté (Connection String)
- [ ] Alertes coût + métriques techniques configurées
- [ ] Auto-scaling (min/max replicas ou App Service scale rules)
- [ ] Slot de staging pour déploiement zero-downtime (App Service)
- [ ] Azure Defender / Defender for Cloud activé sur les ressources critiques
- [ ] Geo-Replication ou Failover Group sur Azure SQL si SLA > 99,9 %
