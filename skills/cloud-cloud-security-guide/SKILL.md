---
name: cloud-cloud-security-guide
description: Sécurité cloud incluant IAM, encryption, networking, compliance, secrets management et CSPM. Se déclenche avec "sécurité cloud", "cloud security", "IAM", "encryption at rest", "CSPM", "compliance cloud. Also triggers on "IAM hardening", "secrets management in the cloud".
---

# Cloud Security Guide

## Workflow en 8 étapes

### 1. Auditer et durcir l'IAM

**Critère de déclenchement** : nouveau compte cloud, audit trimestriel, onboarding d'un service.

```bash
# AWS — lister les utilisateurs sans MFA
aws iam generate-credential-report
aws iam get-credential-report --query 'Content' --output text | base64 -d | grep ',false,'

# AWS — trouver les politiques permissives (Action: *)
aws iam list-policies --scope Local --query "Policies[*].Arn" --output text | \
  xargs -I{} aws iam get-policy-version --policy-arn {} --version-id v1 \
  --query "PolicyVersion.Document" 2>/dev/null | grep -B5 '"Action": "\*"'

# Azure — Access Review via CLI
az ad user list --query "[?accountEnabled==\`true\`].{UPN:userPrincipalName}" --output table
```

Règles d'or :
- Pas de credentials longue durée sur les machines : utiliser des **Instance Profiles / Managed Identities / Workload Identity**.
- Séparer les comptes par environnement (dev / staging / prod) avec **AWS Organizations SCPs** ou **Azure Management Groups**.
- Imposer MFA via une SCP/Policy bloquant toutes les actions si MFA absent.

```json
// AWS SCP — forcer MFA
{
  "Effect": "Deny",
  "NotAction": ["iam:CreateVirtualMFADevice","iam:EnableMFADevice","sts:GetSessionToken"],
  "Resource": "*",
  "Condition": {"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}}
}
```

---

### 2. Segmenter le réseau

```bash
# AWS — VPC avec sous-réseaux isolés (Terraform snippet)
resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }
resource "aws_subnet" "public"   { cidr_block = "10.0.1.0/24" ... }
resource "aws_subnet" "private"  { cidr_block = "10.0.2.0/24" ... }
resource "aws_subnet" "data"     { cidr_block = "10.0.3.0/24" ... }

# Activer les VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC --resource-ids vpc-xxx \
  --traffic-type ALL --log-destination-type cloud-watch-logs \
  --log-group-name /vpc/flowlogs
```

Décision rapide :
| Ressource | Exposition autorisée |
|---|---|
| Base de données | Jamais publique — Private endpoint obligatoire |
| Application web | Via ALB/WAF uniquement |
| API interne | Via VPN ou Service Mesh |
| Bucket/Blob | Jamais public sauf CDN explicite |

---

### 3. Chiffrer les données

```bash
# AWS — activer le chiffrement SSE-KMS sur un bucket S3
aws s3api put-bucket-encryption --bucket mon-bucket \
  --server-side-encryption-configuration '{
    "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms","KMSMasterKeyID":"arn:aws:kms:..."}}]
  }'

# Azure — activer CMK sur un Storage Account
az storage account update \
  --name monstorage --resource-group monrg \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault https://monkeyvault.vault.azure.net/ \
  --encryption-key-name maclé --encryption-key-version latest
```

Critères CMK vs clés gérées par le provider :
- **Clés provider (SSE-S3, Microsoft-managed)** : acceptable pour données non réglementées.
- **CMK obligatoire** : données médicales, financières, PII soumises à RGPD/HIPAA/PCI-DSS.
- Activer la **rotation automatique annuelle** des CMK.

---

### 4. Gérer les secrets sans les exposer

```bash
# AWS — créer un secret avec rotation
aws secretsmanager create-secret \
  --name prod/myapp/db-password \
  --secret-string '{"username":"admin","password":"xxx"}'

aws secretsmanager rotate-secret \
  --secret-id prod/myapp/db-password \
  --rotation-lambda-arn arn:aws:lambda:...

# Récupérer au runtime (Python)
import boto3, json
secret = json.loads(
  boto3.client("secretsmanager").get_secret_value(SecretId="prod/myapp/db-password")["SecretString"]
)
```

Règles :
- Scan automatique des secrets dans le code : `git-secrets`, `trufflehog`, `detect-secrets` en pre-commit hook.
- Variables d'environnement en CI/CD : toujours via le secret store du pipeline (GitHub Secrets, Azure Key Vault linked variable groups) — jamais en clair dans le YAML.

---

### 5. Déployer un CSPM et automatiser la remédiation

```bash
# AWS Security Hub — activer CIS Benchmark
aws securityhub enable-security-hub --enable-default-standards
aws securityhub batch-enable-standards \
  --standards-subscription-requests '[
    {"StandardsArn":"arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"}
  ]'

# Azure — activer Defender for Cloud sur tous les plans
az security pricing create -n VirtualMachines --tier Standard
az security pricing create -n StorageAccounts --tier Standard
```

Remédiation automatique : utiliser **AWS Config Remediation Actions** ou **Azure Policy DeployIfNotExists** pour corriger automatiquement les findings récurrents (ex: activer CloudTrail si désactivé).

---

### 6. Détection de menaces et SIEM

```bash
# AWS — activer GuardDuty sur tous les comptes d'une org
aws guardduty create-detector --enable --finding-publishing-frequency FIFTEEN_MINUTES
# Déléguer à un compte sécurité centralisé
aws guardduty enable-organization-admin-account --admin-account-id 123456789012

# Centraliser les logs CloudTrail → S3 → CloudWatch → SIEM
aws cloudtrail create-trail \
  --name org-trail --s3-bucket-name audit-logs-bucket \
  --is-multi-region-trail --enable-log-file-validation
```

Alertes prioritaires à configurer :
- Root account login
- IAM policy modification
- S3 bucket rendu public
- Connexion depuis IP suspecte / pays inhabituel
- Exfiltration de données (volume anormal d'accès sortants)

---

### 7. Conformité as Code

```bash
# OPA — policy interdisant les buckets S3 publics (Rego)
deny[msg] {
  input.resource.type == "aws_s3_bucket"
  input.resource.config.acl == "public-read"
  msg := sprintf("Bucket %v ne doit pas être public", [input.resource.name])
}

# AWS Config Rule custom
aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "s3-no-public-acl",
  "Source": {"Owner":"AWS","SourceIdentifier":"S3_BUCKET_PUBLIC_READ_PROHIBITED"}
}'
```

Mapping frameworks 2026 :
| Contrôle | CIS | ISO 27001 | SOC 2 | PCI-DSS |
|---|---|---|---|---|
| MFA obligatoire | 1.10 | A.9.4.2 | CC6.1 | 8.4 |
| Chiffrement at-rest | 2.1 | A.10.1 | CC6.7 | 3.4 |
| Logs d'audit 12 mois | 3.1 | A.12.4 | CC7.2 | 10.5 |

---

### 8. Réponse aux incidents cloud

Procédure d'isolation rapide :

```bash
# AWS — isoler une instance compromise
aws ec2 create-security-group --group-name quarantine --description "No ingress/egress"
aws ec2 modify-instance-attribute \
  --instance-id i-xxxx --groups sg-quarantine

# Snapshot pour préservation des preuves
aws ec2 create-snapshot --volume-id vol-xxxx \
  --description "forensics-$(date +%Y%m%d-%H%M%S)" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=incident,Value=INC-001}]'
```

Décisions clés lors d'un incident :
1. Isoler SANS éteindre (préserver la mémoire volatile si forensics nécessaire).
2. Révoquer les credentials immédiatement (pas juste désactiver).
3. Notifier le DPO si données personnelles concernées (RGPD : 72h).

---

## Anti-patterns et pièges

| Piège | Conséquence | Correction |
|---|---|---|
| IAM `*:*` sur un rôle Lambda | Blast radius total si compromis | Scope minimal sur les ARNs nécessaires |
| Bucket S3 public "pour simplifier" | Fuite de données, amende RGPD | CloudFront + OAC obligatoire |
| Secrets dans les variables Terraform en clair | Exposés dans le state | `sensitive = true` + state chiffré + backend sécurisé |
| MFA uniquement sur root, pas sur les admins | Élévation facile via un compte admin | SCP MFA obligatoire sur tous les comptes humains |
| CloudTrail désactivé en dev | Pas de traces en cas d'incident | Trail org couvrant tous les comptes y compris dev |
| Rotation des clés KMS jamais activée | Clé compromise = données indéchiffrables à terme | Rotation automatique annuelle |
| Partage de credentials entre services | Traçabilité impossible | Une identité par service (service account / role) |
| Security groups `0.0.0.0/0` en entrée | Exposition totale | Restreindre au CIDR minimal ou au SG source |

---

## Bonnes pratiques 2026

- **Zero Trust** : ne pas faire confiance au réseau interne — vérifier chaque appel avec des tokens courts (SPIFFE/SPIRE pour les workloads).
- **Supply chain** : signer les images container (Sigstore/Cosign), scanner les CVEs avant le push en registry (Trivy, Grype).
- **Infrastructure immutable** : pas de SSH direct en prod — utiliser AWS SSM Session Manager / Azure Bastion sans port 22 exposé.
- **Shift-left security** : intégrer les checks SAST/SCA/IaC-scan dans la PR (Checkov pour Terraform, Semgrep, Dependabot).
- **Tagging obligatoire** : `env`, `owner`, `data-classification`, `cost-center` sur toutes les ressources — prérequis pour les politiques automatisées.


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
