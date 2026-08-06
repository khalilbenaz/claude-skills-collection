---
name: gcp-guide
description: Services Google Cloud Platform incluant Cloud Run, BigQuery, GKE, Cloud Functions et Firestore. Se déclenche avec "GCP", "Google Cloud", "BigQuery", "Cloud Run", "GKE", "Firestore. Also triggers on "BigQuery setup", "GKE cluster".
---

# GCP Guide

## Workflow

### 1. Structurer la hiérarchie des ressources

```
Organization
└── Folder (prod / staging / dev)
    └── Project (une app ou un domaine)
        └── Resources (Cloud Run, BigQuery, etc.)
```

- Crée un projet distinct par environnement ; jamais partager des projets entre prod et non-prod.
- Attribue un budget + alerte à chaque projet dès la création.

```bash
gcloud projects create my-app-prod --folder=FOLDER_ID
gcloud billing projects link my-app-prod --billing-account=BILLING_ID
gcloud alpha billing budgets create \
  --billing-account=BILLING_ID \
  --display-name="my-app-prod budget" \
  --budget-amount=500USD \
  --threshold-rule=percent=0.8
```

### 2. IAM — moindre privilège dès le départ

- Un **service account** par workload, jamais la clé par défaut Compute.
- Préfère **Workload Identity Federation** (pas de clé JSON) pour les pipelines CI/CD.
- Rôles custom > rôles primitifs (Owner/Editor/Viewer).

```bash
# Créer un SA dédié
gcloud iam service-accounts create sa-cloud-run-api \
  --display-name="API Cloud Run"

# Binding minimal
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:sa-cloud-run-api@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 3. Choisir le bon service de calcul

| Besoin | Service recommandé |
|---|---|
| API HTTP / microservice conteneurisé, trafic variable | **Cloud Run** |
| Workloads Kubernetes existants, GPU, état local | **GKE Autopilot** |
| Traitement event-driven simple (<10 min) | **Cloud Functions 2nd gen** |
| Batch HPC ou ML training | **Batch** + GPU/TPU |
| VM legacy ou contrôle OS total | **Compute Engine** |

```bash
# Déployer sur Cloud Run depuis une image Artifact Registry
gcloud run deploy my-api \
  --image=europe-west1-docker.pkg.dev/PROJECT_ID/repo/my-api:latest \
  --region=europe-west1 \
  --platform=managed \
  --service-account=sa-cloud-run-api@PROJECT_ID.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=20 \
  --concurrency=80 \
  --no-allow-unauthenticated
```

### 4. Choisir le bon stockage de données

| Pattern | Service |
|---|---|
| Analytique OLAP, PB+ | **BigQuery** |
| Transactionnel SQL managé | **Cloud SQL** (Postgres/MySQL) ou **AlloyDB** |
| NoSQL document temps réel (mobile/web) | **Firestore** |
| Clé-valeur faible latence (< 10 ms) | **Bigtable** |
| Fichiers, backups, assets | **Cloud Storage** |
| Cache in-memory | **Memorystore (Redis)** |

**BigQuery — optimisations essentielles :**

```sql
-- Toujours créer les tables partitionnées
CREATE TABLE `project.dataset.events`
PARTITION BY DATE(created_at)
CLUSTER BY user_id, event_type
OPTIONS (require_partition_filter = true)
AS SELECT * FROM staging.events WHERE FALSE;

-- Lire seulement les partitions nécessaires
SELECT user_id, COUNT(*) as cnt
FROM `project.dataset.events`
WHERE DATE(created_at) BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY user_id;
```

### 5. Réseau et sécurité

```bash
# VPC dédié avec sous-réseaux régionaux
gcloud compute networks create vpc-prod --subnet-mode=custom
gcloud compute networks subnets create subnet-west1 \
  --network=vpc-prod \
  --region=europe-west1 \
  --range=10.0.1.0/24 \
  --enable-private-ip-google-access

# Firewall — deny-all ingress par défaut, allow uniquement ce qui est nécessaire
gcloud compute firewall-rules create allow-internal \
  --network=vpc-prod \
  --action=ALLOW \
  --rules=tcp:8080 \
  --source-ranges=10.0.0.0/8
```

- Active **VPC Service Controls** pour confiner BigQuery / GCS dans un périmètre.
- Chiffrement CMEK obligatoire pour les données sensibles (clés dans Cloud KMS).
- Active **Cloud Armor** devant les Load Balancers exposés à Internet.

### 6. Pipeline de données événementiels

```
Source → Pub/Sub → Dataflow → BigQuery / Firestore
                 ↘ Cloud Run (webhook consumer)
```

```bash
# Créer un topic Pub/Sub et un abonnement avec dead-letter
gcloud pubsub topics create events-topic
gcloud pubsub topics create events-dead-letter
gcloud pubsub subscriptions create events-sub \
  --topic=events-topic \
  --dead-letter-topic=events-dead-letter \
  --max-delivery-attempts=5 \
  --ack-deadline=60
```

Utilise **Dataflow** (Apache Beam managé) pour les transformations à fort volume ; **Cloud Composer** (Airflow) pour l'orchestration batch planifiée.

### 7. Infrastructure as Code avec Terraform

```hcl
# provider.tf
terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
  backend "gcs" {
    bucket = "tfstate-my-app-prod"
    prefix = "terraform/state"
  }
}

# Cloud Run minimal
resource "google_cloud_run_v2_service" "api" {
  name     = "my-api"
  location = "europe-west1"
  template {
    service_account = google_service_account.run_sa.email
    containers {
      image = "europe-west1-docker.pkg.dev/${var.project_id}/repo/my-api:latest"
      resources { limits = { cpu = "1", memory = "512Mi" } }
    }
  }
}
```

- Un workspace Terraform par environnement (ou modules + `tfvars`).
- Stocke le state dans **GCS** avec versioning activé.

### 8. Observabilité

```bash
# Voir les logs Cloud Run en temps réel
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="my-api"' \
  --project=PROJECT_ID \
  --freshness=1h \
  --format="table(timestamp,jsonPayload.message)"

# Créer une alerte sur erreurs 5xx
gcloud monitoring policies create --policy-from-file=alert-5xx.yaml
```

- Utilise **Cloud Trace** + **Error Reporting** dès le dev (zero-cost en dessous des quotas).
- Exporte les logs vers BigQuery pour des analyses long terme à moindre coût.

---

## Critères de décision rapides

- **Cloud Run vs GKE** : préfère Cloud Run si pas de dépendance Kubernetes-native (DaemonSet, CRD, GPU) ; GKE sinon.
- **Firestore vs Cloud SQL** : Firestore si schéma flexible et accès mobile/web direct ; Cloud SQL si SQL strict et transactions complexes.
- **Région** : `europe-west1` (Belgique) ou `europe-west9` (Paris) pour la conformité RGPD Europe.

---

## Anti-patterns et pièges

- **Pas de partitionnement BigQuery** → factures qui explosent ; toujours partitionner sur une colonne date.
- **Clés JSON de service account committées** → rotation immédiate + audit ; utiliser Workload Identity à la place.
- **min-instances=0 sans warm-up** → cold starts sur Cloud Run ; ajoute `--min-instances=1` sur les APIs latency-sensitive.
- **Requêtes BigQuery sans filtre de partition** → full table scan à chaque exécution ; active `require_partition_filter`.
- **IAM Owner sur un projet de prod** → accès trop large ; utiliser des rôles granulaires ou custom.
- **Pas de VPC pour Cloud SQL** → exposé via IP publique ; toujours connecter via Cloud SQL Auth Proxy ou Private IP.
- **Ignorer les quotas** → erreurs 429 imprévues en prod ; vérifier et demander les augmentations en amont.

---

## Bonnes pratiques 2026

- **Artifact Registry** remplace Container Registry (GCR deprecated) ; migrer les images existantes.
- **Cloud Run Jobs** pour les tâches batch ponctuelles sans serveur Kubernetes.
- **AlloyDB Omni** si besoin Postgres ultra-performant avec cache columnar intégré.
- **Gemini in BigQuery** (Vertex AI intégré) pour les analyses ML directement dans le data warehouse.
- **Assured Workloads** pour les projets sous contrainte réglementaire (FedRAMP, C5, RGPD souverain).
- Chiffrement **CMEK + Cloud KMS** obligatoire pour tout stockage de données personnelles en production.
