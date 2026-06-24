---
name: security-compliance-checker
description: Vérification de conformité sécurité incluant ISO 27001, SOC 2, HIPAA, NIST et audit trail. Se déclenche avec "ISO 27001", "SOC 2", "HIPAA", "NIST", "conformité sécurité", "audit sécurité", "compliance"
---

# Compliance Checker

## 1. Identifier les frameworks applicables

Critères de sélection rapide :

| Contexte                          | Framework prioritaire       |
|-----------------------------------|-----------------------------|
| SaaS / service cloud B2B          | SOC 2 Type II               |
| Données de santé (US)             | HIPAA                       |
| Paiement par carte                | PCI DSS v4.0                |
| Données personnelles EU           | RGPD + ISO 27001            |
| Administration / défense US       | NIST CSF 2.0 / CMMC         |
| Certification universelle         | ISO 27001:2022              |

Mappings communs à exploiter : ISO 27001 ↔ SOC 2 partagent ~70 % des contrôles. Éviter de dupliquer le travail avec une matrice unique.

## 2. Construire la matrice de contrôles (Gap Analysis)

Créer un fichier `compliance-matrix.csv` avec les colonnes :

```
Control_ID | Framework | Description | Status (OK/GAP/PARTIAL) | Owner | Evidence | Due_Date
```

Exemple pour ISO 27001 A.8.24 (chiffrement) :

```
A.8.24 | ISO27001:2022 | Chiffrement des données au repos et en transit | GAP | RSSI | - | 2026-09-01
```

Outils pour générer une gap analysis automatisée :
- AWS : `aws securityhub get-findings --filters '{"ComplianceStatus":[{"Value":"FAILED","Comparison":"EQUALS"}]}'`
- Azure : `az security assessment list --query "[?status.code=='Unhealthy']"`
- GCP : `gcloud scc findings list --filter="state=ACTIVE AND category=VULNERABILITY"`

## 3. Analyse de risques formelle

Méthode ISO 27005 / NIST RMF en 4 calculs :

```
Risque brut    = Probabilité × Impact
Risque résiduel = Risque brut × (1 - Efficacité du contrôle)
```

Grille de priorisation (agir immédiatement si Risque résiduel ≥ 12/25) :

| Probabilité ↓ / Impact → | Faible (1) | Moyen (3) | Élevé (5) |
|---------------------------|-----------|-----------|-----------|
| Rare (1)                  | 1         | 3         | 5         |
| Probable (3)              | 3         | 9         | **15**    |
| Quasi-certain (5)         | 5         | **15**    | **25**    |

## 4. Déployer les contrôles manquants

### Contrôles techniques essentiels (copiables)

**MFA obligatoire (AWS IAM) :**
```hcl
resource "aws_iam_account_password_policy" "strict" {
  require_uppercase_characters   = true
  require_lowercase_characters   = true
  minimum_password_length        = 14
  require_symbols                = true
  max_password_age               = 90
  password_reuse_prevention      = 12
}
```

**Chiffrement S3 at-rest (Terraform) :**
```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
```

**OPA — policy no-public-S3 (compliance-as-code) :**
```rego
deny[msg] {
  input.resource.type == "aws_s3_bucket"
  input.resource.config.acl == "public-read"
  msg := sprintf("Bucket %v est public : non conforme SOC 2 CC6.1", [input.resource.name])
}
```

**Azure Policy — TLS minimum 1.2 :**
```bash
az policy assignment create \
  --name "enforce-tls12" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/fa298e57-..." \
  --scope "/subscriptions/<sub-id>"
```

## 5. Configurer l'audit trail

Durées de rétention réglementaires :

| Framework  | Rétention minimale |
|------------|--------------------|
| ISO 27001  | 12 mois (recommandé 3 ans) |
| HIPAA      | 6 ans              |
| PCI DSS    | 12 mois online + 12 mois archivé |
| SOC 2      | Selon période d'audit (12 mois) |
| RGPD       | Durée de traitement + délai légal |

Activer les logs critiques (AWS CloudTrail) :
```bash
aws cloudtrail create-trail \
  --name org-compliance-trail \
  --s3-bucket-name audit-logs-immutable \
  --include-global-service-events \
  --is-multi-region-trail \
  --enable-log-file-validation   # chaînage SHA-256 des fichiers log
```

Stockage WORM sur Azure Blob :
```bash
az storage container immutability-policy create \
  --account-name auditstore \
  --container-name compliance-logs \
  --period 365   # jours — non modifiable après lock
```

## 6. Automatiser les vérifications continues

Outils de scan par cloud :

```bash
# Prowler (multi-cloud, CIS/ISO/SOC2/HIPAA)
prowler aws --compliance iso27001_2013_aws -M json -o ./reports/

# Checkov (IaC — Terraform, CloudFormation, Kubernetes)
checkov -d ./infra --framework terraform --check CKV_AWS_19,CKV_AWS_21

# Trivy (conteneurs + IaC)
trivy config ./infra --severity HIGH,CRITICAL
```

Pipeline CI/CD — bloquer sur non-conformité critique :
```yaml
# .github/workflows/compliance.yml
- name: Checkov scan
  uses: bridgecrewio/checkov-action@v12
  with:
    directory: infra/
    framework: terraform
    soft_fail: false          # fail le PR si contrôle critique KO
    output_format: sarif
```

## 7. Préparer et réussir l'audit

Structure du dossier de preuves (par contrôle) :
```
evidence/
  A.8.24-encryption/
    screenshot_kms_enabled.png
    terraform_plan_output.txt
    policy_encryption.pdf
  A.9.4-mfa/
    iam_policy_export.json
    mfa_enforcement_report.csv
```

Script de collecte automatique (AWS) :
```bash
#!/bin/bash
# Exporte la configuration IAM pour preuve d'audit
aws iam generate-credential-report
aws iam get-credential-report --query 'Content' --output text | base64 -d > evidence/iam-credential-report.csv
aws iam get-account-summary > evidence/iam-account-summary.json
```

Conduire un mock audit interne 4 semaines avant l'audit externe.

## 8. Maintenir la conformité dans le temps

- Revue annuelle obligatoire des politiques (nommer un owner par politique).
- Abonnement aux bulletins : [NIST NVD](https://nvd.nist.gov/), [CISA alerts](https://www.cisa.gov/known-exploited-vulnerabilities-catalog).
- Dashboard temps réel : AWS Security Hub Score ≥ 80 %, Defender Secure Score ≥ 75 %.
- Déclencher une revue extraordinaire à chaque incident de sécurité ou changement architectural majeur.

## Garde-fous / Anti-patterns / Pièges

**Ne jamais faire :**
- Marquer un contrôle "OK" sans preuve documentée — l'auditeur rejettera.
- Désactiver les logs pour réduire les coûts (coût d'audit manqué >> coût stockage).
- Considérer la certification ISO 27001 comme permanente — surveillance annuelle obligatoire.
- Confondre "chiffré en transit" (TLS) et "chiffré au repos" (KMS/AES-256) — les deux sont requis.
- Stocker les clés de chiffrement dans le même bucket que les données chiffrées.

**Pièges courants :**
- SOC 2 Type I ≠ Type II : Type I = photo instantanée, Type II = audit sur 6-12 mois. Les clients enterprise exigent Type II.
- RGPD : la conformité ISO 27001 ne couvre pas automatiquement le RGPD (droits des personnes, DPO, registre des traitements sont spécifiques).
- PCI DSS v4.0 (depuis mars 2024) : nouvelles exigences sur les scripts de page de paiement (req. 6.4.3) et l'authentification (req. 8.4.2).
- Les logs CloudTrail de management events sont gratuits ; les data events (S3, Lambda) sont payants — bien scopper.
- Un SIEM sans alertes actives ne remplace pas un vrai audit trail surveillé.


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
