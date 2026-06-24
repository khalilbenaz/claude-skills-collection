---
name: dev-cloud-cost-optimizer
description: Optimise les coûts cloud (Azure, AWS, GCP) avec workflow FinOps structuré — audit, right-sizing, réservations, Spot, stockage, scheduling, monitoring. Se déclenche avec "coût cloud", "facture Azure", "AWS bill", "optimiser les coûts", "réduire la facture", "reserved instances", "FinOps", "cloud spending".
---

# Cloud Cost Optimizer

## Workflow en 8 étapes

### 1. Audit initial — inventaire & baseline

Collecte le coût mensuel réel par ressource avant toute action.

**AWS**
```bash
# Export Cost Explorer par service (derniers 30 jours)
aws ce get-cost-and-usage \
  --time-period Start=2026-05-24,End=2026-06-24 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output table
```

**Azure**
```bash
# Résumé de facturation par groupe de ressources
az consumption usage list \
  --start-date 2026-05-24 --end-date 2026-06-24 \
  --query "[].{Resource:instanceName, Cost:pretaxCost, Currency:currency}" \
  --output table
```

**GCP**
```bash
# Export vers BigQuery (recommandé) — requête sur le dataset billing
bq query --use_legacy_sql=false '
SELECT service.description, SUM(cost) AS total_cost
FROM `PROJECT.DATASET.gcp_billing_export_v1_*`
WHERE _PARTITIONTIME BETWEEN "2026-05-24" AND "2026-06-24"
GROUP BY 1 ORDER BY 2 DESC LIMIT 20'
```

> Critère de déclenchement : si une ressource représente > 5 % de la facture totale, elle mérite une analyse dédiée.

---

### 2. Identifier les ressources sous-utilisées (idle / oversized)

**Critères d'alerte :**
| Signal | Seuil | Action |
|---|---|---|
| CPU moyen sur 14 j | < 10 % | Downsize ou arrêt |
| Mémoire utilisée | < 20 % | Downsize |
| Volume EBS/Disk non attaché | > 7 j | Snapshot + suppression |
| IP publique non associée | toute durée | Libérer |
| DB connections actives | 0 sur 7 j | Arrêt planifié |

**AWS — lister les EBS volumes détachés**
```bash
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query "Volumes[*].{ID:VolumeId, Size:Size, Type:VolumeType}" \
  --output table
```

**Azure — VMs avec CPU < 10 % (Advisor)**
```bash
az advisor recommendation list \
  --category Cost \
  --query "[?shortDescription.problem=='Right-size or shutdown underutilized virtual machines']" \
  --output table
```

---

### 3. Right-sizing

Utiliser les recommandations natives **avant** de choisir manuellement.

- **AWS** : Compute Optimizer → export CSV des recommandations EC2/RDS/Lambda
- **Azure** : Advisor → blade "Cost" → recommandations VM/SQL
- **GCP** : Recommender API → `gcloud recommender recommendations list --recommender=google.compute.instance.MachineTypeRecommender`

Règle de décision :
- Downsize si l'utilisation peak sur 14 j < 40 % de la capacité provisionnée.
- Ne pas descendre en dessous de la P95 de la charge (éviter les throttlings).
- Tester sur staging avant de migrer la prod.

**Terraform — changer le type d'instance sans recréer la ressource**
```hcl
resource "aws_instance" "api" {
  instance_type = "t3.small"  # Était t3.medium
  # ...
  lifecycle { create_before_destroy = true }
}
```

---

### 4. Reserved Instances & Savings Plans

**Matrice de décision :**
| Cas | Recommandation |
|---|---|
| Workload stable 24/7, même région, même famille | RI 1 an (Standard) — jusqu'à 40 % |
| Workload stable mais famille/région variable | Savings Plan Compute — jusqu'à 66 % |
| Engagement fort, 3 ans, paiement anticipé | RI 3 ans — jusqu'à 72 % |
| Workload imprévisible | On-demand ou Spot |

**Calcul ROI rapide (AWS)**
```bash
# Estimation des économies Savings Plans sur 1 an
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --lookback-period-in-days THIRTY_DAYS
```

Ne pas acheter de réservations avant d'avoir au moins 30 jours d'historique de charge stable.

---

### 5. Spot / Preemptible instances

**Workloads compatibles Spot :**
- CI/CD (GitHub Actions runners, GitLab runners)
- Batch processing, ETL, ML training
- Environnements de dev/test
- Rendering, transcoding

**Non compatibles :** bases de données stateful, services critiques sans failover.

**AWS — Auto Scaling Group avec mix Spot/On-demand**
```json
{
  "MixedInstancesPolicy": {
    "InstancesDistribution": {
      "OnDemandPercentageAboveBaseCapacity": 20,
      "SpotAllocationStrategy": "capacity-optimized"
    }
  }
}
```

**Azure — VMSS avec Spot**
```bash
az vmss create --name myVMSS --resource-group myRG \
  --priority Spot --eviction-policy Deallocate \
  --max-price -1  # prix marché
```

Toujours configurer un interruption handler (SIGTERM sur AWS, Azure Scheduled Events).

---

### 6. Optimiser le stockage

**Lifecycle policies — S3**
```json
{
  "Rules": [{
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER_IR" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
  }]
}
```

**Azure Blob — lifecycle (Bicep)**
```bicep
resource lifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  name: 'default'
  properties: {
    policy: {
      rules: [{
        name: 'tiering'
        type: 'Lifecycle'
        definition: {
          actions: { baseBlob: { tierToCool: { daysAfterModificationGreaterThan: 30 }
                               , tierToArchive: { daysAfterModificationGreaterThan: 90 } } }
          filters: { blobTypes: ['blockBlob'] }
        }
      }]
    }
  }
}
```

Supprimer les snapshots orphelins : vérifier que le volume source existe encore avant tout nettoyage.

---

### 7. Auto-scaling & scheduling

**Scale-to-zero** pour tous les workloads non-continus :
- AWS Lambda, ECS Fargate (scale to 0 tasks)
- Azure Container Apps (min replicas: 0)
- GCP Cloud Run (concurrency 0)

**Arrêt automatique des envs dev/staging (économies 65-75 %)**

```bash
# AWS — Lambda schedulée via EventBridge (arrêt le soir, démarrage le matin)
aws events put-rule --schedule-expression "cron(0 19 ? * MON-FRI *)" \
  --name "StopDevInstances"

# Azure — Start/Stop VMs v2 (solution native gratuite)
az deployment group create --resource-group myRG \
  --template-uri https://aka.ms/startstopv2deploy
```

**Kubernetes — scale down la nuit**
```yaml
# kube-downscaler ou KEDA
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
spec:
  minReplicaCount: 0
  scaleTargetRef:
    name: api-deployment
```

---

### 8. Monitoring continu & FinOps

**Tagging strategy — obligatoire pour l'attribution des coûts**
```
Environment: prod | staging | dev
Team: backend | frontend | data
Project: rivora | access | wfc
CostCenter: 1234
```

**Budgets avec alertes (AWS)**
```bash
aws budgets create-budget --account-id 123456789 --budget '{
  "BudgetName": "monthly-prod",
  "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}' --notifications-with-subscribers '[{
  "Notification": {"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},
  "Subscribers": [{"SubscriptionType":"EMAIL","Address":"devops@company.com"}]
}]'
```

**Azure Cost Anomaly Detection**
```bash
az costmanagement alert create --scope /subscriptions/{sub-id} \
  --name anomaly-alert --type Anomaly
```

Revue mensuelle obligatoire : comparer la facture N vs N-1, valider les recommandations Advisor/Compute Optimizer non traitées.

---

## Garde-fous & anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| Supprimer directement les ressources idle | Perte de données, rollback impossible | Snapshot → désactivation → suppression après 7 j |
| Acheter des RI sans historique stable | Surengagement inutile | Attendre 30 j, commencer par Savings Plans flexibles |
| Spot pour les BDD ou services stateful | Perte de données sur eviction | On-demand obligatoire pour stateful |
| Ignorer le coût réseau (egress) | Facture cachée massive | Auditer le trafic inter-régions et vers internet |
| Tags inconsistants ou absents | Impossible d'imputer les coûts | Enforcer via Azure Policy / AWS SCP / GCP Org Policy |
| Over-provisioning "au cas où" | 40-60 % de gaspillage courant | Right-sizing + auto-scaling, jamais de marge fixe > 30 % |
| Optimiser dev/staging avant prod | Gains marginaux, risques réels en prod | Prioriser : prod > staging > dev |

## Ordre de priorité recommandé

1. **Quick wins (< 1 semaine)** : idle resources, IPs inutilisées, snapshots orphelins, arrêt env dev la nuit
2. **Medium term (1-4 semaines)** : right-sizing, lifecycle storage, auto-scaling
3. **Long term (> 1 mois)** : réservations 1 an, refactoring vers serverless, architecture multi-region optimisée


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
