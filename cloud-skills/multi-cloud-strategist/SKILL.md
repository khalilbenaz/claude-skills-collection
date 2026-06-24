---
name: multi-cloud-strategist
description: Stratégie multi-cloud et cloud hybride couvrant la portabilité, le vendor lock-in et le networking inter-cloud. Se déclenche avec "multi-cloud", "hybrid cloud", "vendor lock-in", "cloud agnostic", "cloud hybride"
---

# Multi-Cloud Strategist

## Workflow

### 1. Qualifier la motivation réelle

Avant toute décision architecturale, identifier POURQUOI le multi-cloud est envisagé :

| Motivation | Approche recommandée |
|---|---|
| Résilience géographique | Active-active ou active-passive sur 2 clouds |
| Best-of-breed services | Couplage ciblé + abstraction aux interfaces |
| Contrainte réglementaire (souveraineté) | Cloud souverain ou zone dédiée + federation |
| Levier tarifaire / négociation | Single-cloud suffisant ; éviter la complexité inutile |
| Évitement du lock-in | Évaluer le surcoût opérationnel réel avant de continuer |

> **Règle d'or** : si la seule raison est "au cas où", le surcoût multi-cloud n'est pas justifié.

---

### 2. Inventaire et scoring des workloads

Pour chaque service, noter sur 3 axes (0–3) :

- **Couplage cloud-natif** : utilise-t-il des services propriétaires (DynamoDB, BigQuery, CosmosDB…) ?
- **Criticité métier** : impact business si le cloud hôte tombe ?
- **Portabilité intrinsèque** : l'app est-elle déjà conteneurisée / 12-factor ?

```bash
# Inventaire rapide avec AWS CLI (adapter pour GCP/Azure)
aws resourcegroupstaggingapi get-resources \
  --output json | jq '.ResourceTagMappingList[].ResourceARN' > inventory-aws.txt
```

Score élevé couplage + criticité haute = candidat prioritaire à la stratégie de portabilité ou de mitigation.

---

### 3. Cartographier les points de lock-in

Catégories à évaluer systématiquement :

1. **Données** : format propriétaire, egress fees, réplication cross-cloud
2. **Compute** : Lambda vs Cloud Functions vs Azure Functions — divergences d'API
3. **Réseau** : Peering interne, Private Link, équivalents sur chaque cloud
4. **Identité** : IAM natif vs fédération externe (OIDC, SAML)
5. **Observabilité** : CloudWatch vs Cloud Monitoring vs Azure Monitor

Outil de référence pour l'analyse lock-in : [CNCF Cloud Native Landscape](https://landscape.cncf.io/)

---

### 4. Définir la stratégie de répartition

**Patterns courants :**

- **Workload affinity** — chaque cloud héberge ce qu'il fait le mieux (ex : ML sur GCP Vertex AI, SAP sur Azure, analytics sur AWS Redshift)
- **Segmentation réglementaire** — données sensibles sur cloud souverain (OVHcloud HDS, S3NS…), reste sur hyperscaler
- **Burst to cloud** — on-prem principal + cloud pour les pics de charge

**Critères de choix par workload :**

```
Si workload ML lourd        → GCP (TPU, Vertex AI)
Si workload Windows/Active Directory → Azure (AD natif)
Si workload serverless/event-driven  → AWS Lambda + EventBridge
Si contrainte souveraineté FR/EU     → OVHcloud / Outscale / S3NS
```

---

### 5. Couche d'abstraction et portabilité

**Infrastructure as Code — Terraform (recommandé)**

```hcl
# modules/compute/main.tf — module portable
variable "provider" {}  # "aws" | "gcp" | "azure"

module "vm" {
  source = "./providers/${var.provider}"
  name   = var.name
  size   = var.size
}
```

**Kubernetes comme couche d'abstraction compute :**

```bash
# Federation de clusters multi-cloud avec Argo CD
kubectl config use-context aws-prod
argocd cluster add gcp-prod --name gcp-prod
argocd app create myapp --dest-server https://gcp-cluster --repo https://git.example.com/myapp
```

**Éviter les abstractions maison** — préférer des outils éprouvés :

| Besoin | Outil recommandé 2026 |
|---|---|
| IaC multi-cloud | Terraform / OpenTofu |
| Container orchestration | Kubernetes (EKS / GKE / AKS) |
| Service mesh inter-cloud | Istio + multicluster ou Cilium |
| Secrets management | HashiCorp Vault (avec auto-unseal cloud) |
| GitOps | Argo CD |

---

### 6. Réseau inter-cloud

**Options de connectivité classées par coût/latence :**

1. **Internet + TLS (mTLS)** — simple, latence variable, coût faible
2. **VPN site-to-site** — chiffré, latence prévisible, débit limité (~1 Gbps)
3. **Peering dédié** (AWS Direct Connect + Azure ExpressRoute + GCP Interconnect) — SLA fort, coût élevé
4. **SD-WAN overlay** (ex : Aviatrix, Alkira) — abstraction totale, visibilité centralisée

```bash
# Exemple : VPN inter-cloud AWS ↔ GCP avec Strongswan
# Sur AWS : créer Customer Gateway avec l'IP publique GCP VPN
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip <GCP_VPN_IP> \
  --bgp-asn 65000

# Sur GCP : Cloud VPN avec BGP dynamique
gcloud compute vpn-tunnels create tunnel-to-aws \
  --region europe-west1 \
  --peer-address <AWS_VPN_IP> \
  --ike-version 2 \
  --shared-secret <SECRET>
```

**DNS inter-cloud :** utiliser un resolver centralisé (Route53 + Private Zones GCP/Azure peered) ou adopter un mesh DNS comme CoreDNS fédéré.

---

### 7. Observabilité et gouvernance unifiées

**Stack recommandée 2026 :**

```yaml
# Prometheus scrape multi-cloud via remote_write
scrape_configs:
  - job_name: 'aws-workloads'
    ec2_sd_configs: [{ region: eu-west-1 }]
  - job_name: 'gcp-workloads'
    gce_sd_configs: [{ project: my-project, zone: europe-west1-b }]

remote_write:
  - url: https://grafana-cloud-endpoint/prometheus/api/v1/push
```

**Gestion des coûts :**

- **OpenCost** (CNCF) — attribution de coûts Kubernetes multi-cloud
- **Infracost** — estimation IaC avant déploiement
- **AWS Cost Explorer + GCP Billing Export + Azure Cost Management** — agréger dans un outil tiers (Apptio Cloudability, CloudHealth)

---

## Garde-fous et anti-patterns

### Anti-patterns critiques

- **Multi-cloud washing** — adopter le multi-cloud pour le marketing sans plan opérationnel : doublement des compétences DevOps requises, coût total souvent +40–60 %
- **Abstraction universelle over-engineered** — créer une couche d'abstraction maison qui masque les APIs cloud mais devient elle-même un lock-in interne
- **Replication synchrone inter-cloud pour les BDD** — latence réseau inter-cloud (>10 ms typiquement) incompatible avec les transactions ACID strictes
- **IAM silos** — gérer les permissions séparément sur chaque cloud sans fédération : surface d'attaque multipliée
- **Ignorer les egress fees** — le coût de sortie des données peut représenter 10–30 % de la facture cloud en mode multi-cloud intensif

### Pièges opérationnels

- Les SLA de disponibilité multi-cloud ne s'additionnent pas naïvement : 99.9 % × 99.9 % ≠ 99.99 % si l'orchestration applicative est un SPOF
- Les certifications sécurité (PCI-DSS, HDS, ISO 27001) doivent être vérifiées sur **chaque** cloud de la chaîne de traitement
- Les équipes ont besoin de compétences sur N clouds : prévoir le budget formation ou limiter à 2 clouds max en phase initiale

---

## Bonnes pratiques 2026

1. **Politique "cloud-first but not cloud-only"** : partir d'un hyperscaler principal, n'ajouter un second cloud que pour un besoin spécifique démontré
2. **Adopter OpenTofu** (fork open-source de Terraform post-changement de licence BSL) pour l'IaC multi-cloud sans dépendance commerciale
3. **FinOps dès le départ** : tagger systématiquement les ressources avec `project`, `env`, `team`, `cost-center` sur tous les clouds
4. **Zero Trust networking** : ne jamais supposer que le trafic inter-cloud est sécurisé parce qu'il est "interne" — mTLS partout
5. **Disaster Recovery testé** : un runbook DR multi-cloud non testé n'existe pas — planifier des exercices trimestriels de failover
6. **Platform Engineering** : créer une Internal Developer Platform (IDP) avec Backstage ou Port pour abstraire la complexité multi-cloud vis-à-vis des équipes produit
