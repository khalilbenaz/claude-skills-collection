---
name: cloud-cloud-migration-planner
description: Planification de migration vers le cloud incluant assessment, stratégie, lift-and-shift et refactoring. Se déclenche avec "migration cloud", "lift and shift", "cloud migration", "on-premise vers cloud", "migration strategy", "6 R's. Also triggers on "migrate to the cloud", "lift and shift plan", "cloud migration assessment".
---

# Cloud Migration Planner

## Workflow en 8 étapes

### 1. Inventaire applicatif
Cartographier chaque application : stack technique, dépendances inter-services, flux réseau, volumes de données, SLAs.

Outils recommandés :
- **AWS** : AWS Application Discovery Service (`aws discovery start-import-task`)
- **Azure** : Azure Migrate (`az migrate project create`)
- **GCP** : Migrate to Virtual Machines + Service Catalog

Livrable minimal : tableur avec colonnes `App | Stack | Deps | Trafic (Go/mois) | RTO | RPO | Owner`.

---

### 2. Assessment de compatibilité
Pour chaque application, évaluer sur 4 axes (noter de 1 à 5) :

| Axe | Questions clés |
|-----|---------------|
| Complexité technique | Couplage fort ? API propriétaire ? OS obsolète ? |
| Criticité métier | Impact si down > 1h ? Régulé ? |
| Dépendances | Combien de services liés ? Dépendances cycliques ? |
| Portabilité | Stateless ? Containerisable ? Licences cloud-compatible ? |

Score ≤ 8/20 → candidat Retire/Retain. Score ≥ 15/20 → candidat Refactor.

---

### 3. Stratégie par application (6 R's)

| Stratégie | Quand choisir | Effort | Gain cloud |
|-----------|-------------|--------|-----------|
| **Rehost** (lift-and-shift) | VM legacy, contrainte temps | Faible | Faible |
| **Replatform** | DB vers RDS/Managed, peu de code | Moyen | Moyen |
| **Refactor** | App stratégique, cloud-native cible | Élevé | Fort |
| **Repurchase** | Remplacer par SaaS (ex. CRM → Salesforce) | Moyen | Variable |
| **Retire** | App inutilisée ou redondante | Minimal | — |
| **Retain** | App réglementée ou trop risquée pour migrer | — | — |

> Règle empirique 2026 : 40-50 % Rehost pour la 1ère vague, puis réduire à mesure que les équipes montent en compétence.

---

### 4. Architecture cloud cible

Concevoir avant de migrer. Points incontournables :

**Réseau** :
```
On-premise ──[ VPN IPSec / ExpressRoute / Direct Connect ]──► VPC/VNet
                                                              ├── Subnet public (Load Balancer, Bastion)
                                                              ├── Subnet privé (App Tier)
                                                              └── Subnet data (DB, Cache)
```

**Sécurité** :
- IAM : principe du moindre privilège, rôles par environnement
- Chiffrement at-rest (KMS/CMK) et in-transit (TLS 1.2+)
- WAF + DDoS protection dès la 1ère vague

**Conformité RGPD** : choisir une région EU (`eu-west-*`, `westeurope`, `europe-west1`). Activer audit logs.

---

### 5. Planification des vagues

Critères de priorisation d'une vague :
1. Faible dépendance aux autres apps
2. Criticité métier modérée (pas de cœur de métier en V1)
3. Équipe applicative disponible pour les tests

Structure type :
```
Vague 1 (semaines 1-4)  : apps Rehost stateless, non critiques
Vague 2 (semaines 5-10) : apps Replatform (DB managées, queues)
Vague 3 (semaines 11+)  : apps Refactor, services critiques
```

Créer une fiche de vague avec : `Apps migrées | Date bascule | Rollback deadline | Owner`.

---

### 6. Connectivité hybride

**AWS** :
```bash
aws ec2 create-vpn-connection \
  --type ipsec.1 \
  --customer-gateway-id cgw-xxx \
  --vpn-gateway-id vgw-xxx
```

**Azure** :
```bash
az network vpn-connection create \
  --name onprem-to-azure \
  --resource-group rg-migration \
  --vnet-gateway1 vgw-prod \
  --local-gateway2 lng-onprem \
  --shared-key "ChangeMe!2026"
```

**GCP** :
```bash
gcloud compute vpn-tunnels create onprem-tunnel \
  --peer-address=<IP_ONPREM> \
  --shared-secret=<SECRET> \
  --target-vpn-gateway=vpn-gw-prod \
  --region=europe-west1
```

Valider avec un ping entre sous-réseaux avant toute migration de données.

---

### 7. Exécution et validation

Checklist par application avant bascule :
- [ ] Tests fonctionnels smoke OK en environnement cloud staging
- [ ] Latence P95 ≤ SLA défini
- [ ] Logs et métriques remontés dans l'observability stack (CloudWatch / Azure Monitor / Cloud Logging)
- [ ] Certificats TLS valides
- [ ] DNS TTL abaissé à 60s au moins 24h avant la bascule
- [ ] Plan de rollback testé (snapshot VM ou Blue/Green)

Bascule progressive recommandée : 5 % → 25 % → 100 % via weighted DNS ou load balancer rules.

---

### 8. Optimisation post-migration

Actions systématiques à J+30 :
- **Right-sizing** : analyser CPU/RAM réelle sur 2 semaines, redimensionner
- **Reserved Instances / Savings Plans** : committer sur les workloads stables (économies 30-60 %)
- **Auto-scaling** : remplacer les instances fixes par des groupes auto-scalants
- **Désinstallation on-premise** : décommissionner les serveurs migrés après 30 jours de stabilité cloud

```bash
# AWS — rapport de recommandations de sizing
aws compute-optimizer get-ec2-instance-recommendations \
  --filters Name=Finding,Values=OVER_PROVISIONED
```

---

## Garde-fous / Anti-patterns

| Anti-pattern | Risque | Correction |
|-------------|--------|-----------|
| Migration big-bang de tout le SI | Incident majeur, rollback impossible | Toujours par vagues |
| Lift-and-shift d'une DB Oracle sans license check | Facture x10 | Vérifier BYOL vs License Included avant |
| Ouvrir les security groups trop large (`0.0.0.0/0`) | Exposition critique | Principe du moindre privilège dès le départ |
| Ignorer les egress costs | Surprise de facturation | Chiffrer les flux inter-régions/inter-clouds |
| Migrer sans monitoring | Impossible de détecter régressions | Observability stack AVANT la 1ère vague |
| Oublier les secrets dans le code (env vars hardcodées) | Fuite de credentials | Scan automatique (GitGuardian, truffleHog) + Secrets Manager |
| Négliger la formation des équipes | Dette opérationnelle | FinOps + CloudOps training dès la vague 1 |

## Bonnes pratiques 2026

- **FinOps dès le jour 1** : tagging systématique (`env`, `team`, `app`, `cost-center`) — sans tags, pas de chargeback possible.
- **Infrastructure as Code obligatoire** : Terraform ou Bicep pour tout ce qui est créé (pas de clic console en production).
- **GitOps pour les déploiements** : pipelines CI/CD cloud-native (GitHub Actions, Azure DevOps, Cloud Build) dès la vague 1.
- **Zero Trust Networking** : segmenter par workload, pas par périmètre réseau.
- **Sustainability** : choisir des régions à faible PUE / énergie renouvelable si SLA le permet (ex. `northeurope`, `us-west-2`).


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
