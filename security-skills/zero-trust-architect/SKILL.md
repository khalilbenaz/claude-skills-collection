---
name: zero-trust-architect
description: Architecture Zero Trust — never trust always verify, micro-segmentation réseau, approche identity-centric et accès conditionnel. Se déclenche avec "Zero Trust", "zero trust architecture", "never trust", "micro-segmentation", "BeyondCorp". Couvre l'évaluation de maturité, le design ZTNA, la micro-segmentation, l'accès conditionnel, le device trust, et la feuille de route d'implémentation progressive.
---

# Zero Trust Architect

## Workflow

### 1. Évaluer la maturité actuelle

Avant tout design, auditer l'existant sur 5 axes :

| Axe | Signe de confiance implicite (à corriger) |
|-----|------------------------------------------|
| Réseau | VPN = accès total, réseau plat, pas de segmentation est-ouest |
| Identité | Pas de MFA, sessions longues, comptes de service partagés |
| Devices | Pas de vérification de conformité à la connexion |
| Données | Chiffrement absent ou partiel, accès en masse non audités |
| Visibilité | Logs insuffisants, pas de détection comportementale |

Outil de référence : **CISA Zero Trust Maturity Model v2** (5 piliers, 4 niveaux : Traditional → Initial → Advanced → Optimal).

---

### 2. Poser les fondations Identity-Centric

**Objectif** : L'identité remplace le réseau comme périmètre de confiance.

```yaml
# Politique d'accès conditionnel — exemple Azure AD / Entra ID
conditions:
  users: [all]
  cloud_apps: [all]
  device_platforms: [all]
grant_controls:
  operator: AND
  built_in_controls:
    - mfa
    - compliant_device       # Intune enrollment + patch level
    - approved_client_app
session_controls:
  sign_in_frequency: 4h      # pas de session éternelle
  persistent_browser: never
```

Actions concrètes :
- Activer MFA sur **tous** les comptes (commencer par admins, 100% coverage obligatoire)
- Centraliser l'IdP (Azure AD Entra ID, Okta, PingFederate) — fédérer les apps legacy via SAML/OIDC
- Définir des groupes d'accès par rôle métier, pas par département réseau
- Implémenter RBAC + ABAC (attribute-based) pour les données sensibles

---

### 3. Micro-segmentation réseau

**Règle** : zéro communication implicite est-ouest ; chaque flux doit être déclaré.

```bash
# Kubernetes NetworkPolicy — isoler un namespace par workload
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: payments
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: payment-api
    ports:
    - port: 5432
EOF
```

Pour les environnements non-Kubernetes (VMs, bare metal) :
- **Illumio / Guardicore / Akamai Guardicore** : micro-segmentation agentless ou agent-based
- **AWS** : Security Groups + VPC endpoints + PrivateLink (pas de trafic public entre services internes)
- **Azure** : NSG + Azure Firewall Premium + Private Endpoints

Critère de décision segmentation :
- Workloads critiques (PCI-DSS, données santé) → segment dédié dès J1
- Workloads internes standard → macro-segmentation par BU puis affiner
- Legacy non-patchable → quarantaine réseau + accès par bastion uniquement

---

### 4. ZTNA — Remplacer le VPN

**Zero Trust Network Access** : accès granulaire par application, pas par réseau.

Comparatif rapide :

| Solution | Usage typique | Notes |
|----------|--------------|-------|
| Cloudflare Access | SaaS/web apps, équipes distribuées | Simple, rapide à déployer |
| Zscaler ZPA | Enterprise, apps internes | Tunnel chiffré sans exposition IP |
| Tailscale | Infra devops, équipes techniques | WireGuard overlay, PKI automatique |
| Azure AD App Proxy | Apps on-prem exposées via Entra | Sans VPN, MFA intégré |

```bash
# Tailscale — accès ZTNA en 3 commandes
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --auth-key=<tskey-auth-xxx> --advertise-tags=tag:prod-server
# Côté client : tailscale up → accès SSH direct sans VPN, avec MFA Tailscale
```

---

### 5. Device Trust & Endpoint Compliance

La décision d'accès doit inclure la santé du device, pas seulement l'identité.

Signaux à évaluer (en temps réel) :
- OS version + patch level (ex : Windows < 22H2 → blocage ou session restreinte)
- MDM enrollment (Intune, Jamf)
- Disk encryption actif (BitLocker, FileVault)
- EDR présent et actif (CrowdStrike, Defender for Endpoint)
- Certificat machine émis par la PKI interne

```powershell
# Vérifier la conformité Intune via Graph API
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod `
  -Uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?`$filter=complianceState eq 'noncompliant'" `
  -Headers $headers | Select-Object -ExpandProperty value | Format-Table deviceName, userPrincipalName, lastSyncDateTime
```

---

### 6. Protéger les données (Data-Centric ZT)

```bash
# Exemple : chiffrement S3 + policy de refus sans clé KMS
aws s3api put-bucket-policy --bucket mon-bucket-sensible --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::mon-bucket-sensible/*",
    "Condition": {
      "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }
    }
  }]
}'
```

Actions :
- Classifier les données (Public / Internal / Confidential / Restricted) — outil : Microsoft Purview, Varonis
- DLP : bloquer exfiltration via email, upload cloud non autorisé
- Chiffrement au repos obligatoire pour Confidential+
- Audit log de chaque accès aux données Restricted (SIEM integration)

---

### 7. Monitoring Continu & Réponse

**Assume breach** : détecter vite, répondre automatiquement.

```yaml
# Règle SIEM — détection accès anormal (pseudo-Sigma)
title: ZT - Accès depuis pays non autorisé
status: production
detection:
  selection:
    EventID: 4624          # Logon success
    LogonType: 3
  filter_allowed_countries:
    country|contains:
      - FR
      - TN
      - MA
  condition: selection and not filter_allowed_countries
action:
  - block_session
  - revoke_refresh_tokens  # via Graph API / Okta API
  - alert_soc
```

Intégrations clés :
- **SIEM** : Microsoft Sentinel, Splunk, Elastic SIEM
- **SOAR** : playbook automatique révocation token sur anomalie comportementale (UEBA)
- **Threat Intel** : enrichir les décisions d'accès avec les IOC connus

---

### 8. Feuille de route (Quick Wins → Transformation)

| Phase | Délai | Actions prioritaires |
|-------|-------|---------------------|
| **P0 — Quick Wins** | 0–4 sem | MFA 100% comptes privilégiés, inventaire des accès, désactivation comptes dormants |
| **P1 — Fondations** | 1–3 mois | IdP centralisé, accès conditionnel, segmentation DMZ / prod / dev |
| **P2 — ZTNA** | 3–6 mois | Remplacement VPN, device compliance, RBAC granulaire |
| **P3 — Maturité** | 6–12 mois | Micro-segmentation complète, DLP, UEBA, automatisation réponse |
| **P4 — Optimal** | 12 mois+ | Continuous verification, AI-driven access decisions, least-privilege automatisé |

---

## Anti-patterns & Pièges

- **ZT = projet réseau uniquement** — Erreur : ZT est d'abord un projet identité. Sans IdP solide, la micro-segmentation ne suffit pas.
- **MFA par SMS** — MITM/SIM-swap possible. Préférer TOTP (Authenticator) ou passkeys/FIDO2.
- **Segmentation sans inventaire complet** — Segmenter sans connaître tous les flux crée des coupures en production. Toujours commencer par un mode observe-only (audit mode).
- **Politique trop restrictive dès le départ** — Génère du shadow IT et du contournement. Déployer en mode report-only, analyser, puis enforcer.
- **Confiance au device seul** — Un device conforme avec un credential volé reste dangereux. Croiser device + identité + contexte (heure, géoloc, comportement).
- **Sessions infinies** — Token refresh sans réévaluation de la posture. Configurer sign-in frequency + re-authentication sur actions sensibles.
- **PKI interne négligée** — Certificats machine auto-signés ou expirés invalident la chaîne de confiance device. Automatiser avec ACME/Vault.

## Bonnes Pratiques 2026

- **Passkeys / FIDO2** : standard de facto — éliminer les mots de passe là où c'est possible (support natif Windows Hello, iOS, Android)
- **Continuous Access Evaluation (CAE)** : révocation de token quasi-temps-réel sur événement (changement de localisation, révocation admin) — activer dans Entra ID et Okta
- **Service Mesh mTLS** : tout trafic service-à-service chiffré + authentifié via certificat (Istio / Linkerd / Consul Connect)
- **SPIFFE/SPIRE** : identité cryptographique des workloads (remplace les comptes de service et les clés API statiques entre microservices)
- **AI-assisted policy** : Entra ID Identity Protection + Defender XDR pour décisions d'accès adaptatives basées sur le risque calculé en temps réel
