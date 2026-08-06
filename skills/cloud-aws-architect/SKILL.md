---
name: cloud-aws-architect
description: Architecture AWS couvrant EC2, Lambda, S3, RDS, VPC, IAM et CloudFormation. Se déclenche avec "AWS", "Amazon Web Services", "Lambda", "EC2", "S3", "CloudFormation", "architecture AWS. Also triggers on "AWS architecture", "design on AWS", "EC2 Lambda S3 setup".
---

# AWS Architect

## Workflow

### 1. Analyser le besoin
Recueillir les exigences avant tout choix de service :
- **Trafic** : pic RPS, pattern (régulier / burst / batch)
- **SLA** : RTO/RPO attendus (ex. RTO < 1h → multi-AZ obligatoire)
- **Données** : volume, structure, latence acceptable, conformité (RGPD, PCI-DSS)
- **Budget** : CapEx vs OpEx, réserves vs On-Demand

### 2. Choisir région et AZ
| Critère | Recommandation |
|---|---|
| Latence utilisateurs EU | `eu-west-1` (Irlande) ou `eu-west-3` (Paris) |
| Conformité données françaises | `eu-west-3` |
| Coût réduit (non-prod) | `us-east-1` (services les moins chers) |
| Résilience maximale | 3 AZ min en production |

```bash
# Lister les AZ disponibles dans une région
aws ec2 describe-availability-zones --region eu-west-3 \
  --query 'AvailabilityZones[*].ZoneName'
```

### 3. Concevoir le VPC
Architecture en 3 couches minimale (prod) :

```
Internet → IGW → [Public subnet] ALB/NAT GW
                → [Private subnet] App (EC2/ECS/Lambda in VPC)
                → [Isolated subnet] RDS / ElastiCache
```

Règles de base :
- CIDR `/16` pour le VPC, `/24` par sous-réseau (évite la pénurie d'IPs)
- Un NAT Gateway par AZ pour la résilience (coût ~30 $/mois/AZ)
- Security Groups stateful sur les ressources, NACLs stateless sur les sous-réseaux
- VPC Flow Logs activés dès le départ

```bash
# Vérifier les flux inter-subnets refusés
aws logs filter-log-events \
  --log-group-name /aws/vpc/flowlogs \
  --filter-pattern "REJECT" \
  --limit 20
```

### 4. Choisir le service de calcul

| Cas d'usage | Service | Critère de décision |
|---|---|---|
| API REST < 15 min, event-driven | Lambda | Pas de serveur à gérer, paiement à l'usage |
| Workload conteneurisé, long-running | ECS Fargate | Pas de gestion EC2, scaling automatique |
| Workload GPU / licences spécifiques | EC2 | Besoin de contrôle OS ou matériel spécifique |
| ML inference haute fréquence | EC2 + Auto Scaling | Latence maîtrisée, coût Savings Plan |
| Job batch parallèle | AWS Batch | File de jobs managée, optimisation spot |

```bash
# Lambda : déployer une fonction depuis un zip local
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://function.zip \
  --region eu-west-3
```

### 5. Stockage et bases de données

**Décision storage :**
- **S3** : objets, assets statiques, backups, data lake — coût ~0,023 $/GB/mois
- **EBS gp3** : volume bloc pour EC2, 3000 IOPS inclus — préférer gp3 à gp2 (20 % moins cher)
- **EFS** : système de fichiers partagé entre instances/conteneurs (NFS managé)

**Décision base de données :**
| Besoin | Service |
|---|---|
| Relationnel managed, multi-AZ | RDS Aurora PostgreSQL (auto-scaling storage) |
| Relationnel classique, budget limité | RDS PostgreSQL/MySQL |
| Clé-valeur / latence <10 ms | DynamoDB (on-demand ou provisionné) |
| Cache applicatif | ElastiCache Redis (Serverless depuis 2024) |
| Search full-text | OpenSearch Service |

```bash
# Activer les backups automatiques RDS (7 jours)
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --backup-retention-period 7 \
  --apply-immediately
```

### 6. IAM — Sécurité minimale viable

Principe : **jamais de credentials long-lived sur les instances**.

```json
// Politique IAM — accès S3 en lecture seule sur un bucket précis
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::mon-bucket",
      "arn:aws:s3:::mon-bucket/*"
    ]
  }]
}
```

- Rôles EC2/Lambda via Instance Profile / Execution Role (jamais de clés AWS dans le code)
- MFA obligatoire pour tous les comptes humains
- Rotation des access keys via AWS IAM Identity Center (SSO) plutôt que users IAM
- Activer AWS Organizations + SCPs pour bloquer les actions critiques au niveau compte

### 7. Infrastructure as Code (CDK / CloudFormation)

Préférer **AWS CDK v2** (TypeScript) en 2026 pour les nouveaux projets :

```typescript
// CDK v2 — Bucket S3 avec versioning et chiffrement
import * as s3 from 'aws-cdk-lib/aws-s3';

const bucket = new s3.Bucket(this, 'DataBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

```bash
# Valider un template CloudFormation avant déploiement
aws cloudformation validate-template \
  --template-body file://template.yaml

# Déploiement CDK avec confirmation manuelle
cdk deploy --require-approval broadening
```

### 8. Monitoring et résilience

Alarmes CloudWatch indispensables en production :
- CPU EC2/ECS > 80 % sur 5 min → notification SNS
- Lambda errors > 1 % → alerte immédiate
- RDS FreeStorageSpace < 10 GB → alerte
- ALB 5xx > 1 % → alerte

```bash
# Créer une alarme sur les erreurs Lambda
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:eu-west-3:123456789:AlertsTopic
```

Stratégie de résilience :
- **RTO < 1h** → Multi-AZ RDS + ALB + Auto Scaling
- **RTO < 15 min** → Aurora Global Database + Route 53 health checks
- **RTO < 1 min** → Active-Active multi-région (coût x3-5)

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Correctif |
|---|---|---|
| Credentials AWS en dur dans le code | Exposition accidentelle (git leak) | Variables d'env via Secrets Manager / Parameter Store |
| Security Group `0.0.0.0/0` en entrée | Surface d'attaque maximale | Restreindre au CIDR ou à un SG source |
| Un seul AZ en production | SPOF réseau AWS | Minimum 2 AZ, idéalement 3 |
| Lambda sans timeout configuré | Coût runaway, file bloquée | Timeout explicite (max 15 min) |
| S3 bucket ACL public | Fuite de données | `BlockPublicAccess` activé, S3 Object Ownership = Bucket owner enforced |
| Ignorer les Savings Plans | Surcoût 30-60 % On-Demand | Compute Savings Plan 1 an pour workloads stables |
| CDK/CFN sans drift detection | Infrastructure hors IaC | `aws cloudformation detect-stack-drift` en CI |
| CloudTrail désactivé | Pas d'audit trail | Activer dès le premier jour, conserver 365 jours |

## Bonnes pratiques 2026

- **Cost optimization** : AWS Cost Anomaly Detection + Budgets avec alertes ; Graviton4 (ARM) pour EC2/RDS = -40 % coût
- **Sécurité** : AWS Security Hub centralisé multi-comptes ; GuardDuty activé partout ; IMDSv2 obligatoire sur EC2
- **Observabilité** : CloudWatch Logs Insights pour queries ad-hoc ; AWS X-Ray ou OpenTelemetry pour le tracing distribué
- **Réseau** : AWS PrivateLink pour exposer des services sans Internet ; VPC Lattice (2024+) pour communication service-to-service
- **IaC** : CDK Aspects pour appliquer des politiques transverses (tags, chiffrement) à toute la stack automatiquement


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
