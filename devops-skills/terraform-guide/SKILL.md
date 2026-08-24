---
name: terraform-guide
description: Guide Terraform — écriture de modules, state management, workspaces, providers et bonnes pratiques HCL. À utiliser quand l'utilisateur écrit ou débogue du Terraform précisément ; pour le choix d'outil IaC, voir dev-infrastructure-as-code. Se déclenche aussi avec "terraform", "terraform plan", "terraform apply", "module terraform", "tfstate", "HCL", "terraform import". Also triggers on "Terraform module", "terraform state", "provision with Terraform".
---

# Guide Terraform

## 1. Workflow opérationnel (étapes numérotées)

1. **Initialiser** — configurer le backend et télécharger les providers.
   ```bash
   terraform init -upgrade          # première fois ou mise à jour providers
   terraform init -reconfigure      # changer de backend sans migrer l'état
   ```
2. **Valider** — vérifier la syntaxe avant de planifier.
   ```bash
   terraform validate
   terraform fmt -recursive         # formater tout le répertoire
   ```
3. **Planifier** — toujours sauvegarder le plan pour un apply déterministe.
   ```bash
   terraform plan -out=tfplan.bin
   terraform show -json tfplan.bin | jq '.resource_changes[] | select(.change.actions != ["no-op"])'
   ```
4. **Appliquer** — uniquement depuis le plan sauvegardé.
   ```bash
   terraform apply tfplan.bin
   ```
5. **Vérifier le drift** — détecter les divergences entre state et réalité.
   ```bash
   terraform plan -refresh-only     # voir ce qui a changé hors Terraform
   terraform apply -refresh-only    # re-synchroniser le state sans modifier les ressources
   ```
6. **Détruire proprement** — cibler d'abord, jamais en masse sans review.
   ```bash
   terraform destroy -target=module.networking.azurerm_subnet.main
   ```

---

## 2. Structure de projet recommandée

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf          # appels aux modules
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── production/
├── modules/
│   ├── networking/          # un module = une responsabilité
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── database/
│   └── app-service/
└── shared/
    └── versions.tf          # contraintes de version providers
```

**Critère de découpage** : un module par "domaine fonctionnel" (réseau, stockage, compute). Éviter les modules à 1 ressource (sur-découpage) et les modules "tout en un" (couplage fort).

---

## 3. Module réutilisable — exemple complet

```hcl
# modules/app-service/variables.tf
variable "app_name"           { type = string }
variable "environment"        {
  type    = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Valeurs acceptées : dev, staging, production."
  }
}
variable "sku"                { type = string; default = "B1" }
variable "location"           { type = string }
variable "resource_group_name"{ type = string }
variable "app_settings"       { type = map(string); default = {} }

# modules/app-service/main.tf
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = var.app_name
  }
}

resource "azurerm_service_plan" "this" {
  name                = "plan-${var.app_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = var.sku
  tags                = local.common_tags
}

resource "azurerm_linux_web_app" "this" {
  name                = "app-${var.app_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.this.id
  tags                = local.common_tags

  site_config {
    always_on = var.environment == "production"
    application_stack { dotnet_version = "8.0" }
  }

  app_settings = var.app_settings
}

# modules/app-service/outputs.tf
output "app_url"     { value = "https://${azurerm_linux_web_app.this.default_hostname}" }
output "app_id"      { value = azurerm_linux_web_app.this.id }
output "plan_id"     { value = azurerm_service_plan.this.id }
```

Appel depuis un environnement :
```hcl
module "api" {
  source              = "../../modules/app-service"
  app_name            = "myapi"
  environment         = "production"
  sku                 = "P1v3"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}
```

---

## 4. State management

### Backend distant avec locking (Azure)
```hcl
# environments/production/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstprod"
    container_name       = "tfstate"
    key                  = "myapp.production.tfstate"
    use_azuread_auth     = true   # évite les clés de compte (2025+)
  }
}
```

### Backend S3 + DynamoDB (AWS)
```hcl
terraform {
  backend "s3" {
    bucket         = "myco-tfstate-prod"
    key            = "myapp/production/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

### Commandes de gestion du state
```bash
terraform state list                              # toutes les ressources
terraform state show azurerm_linux_web_app.this   # détail d'une ressource
terraform state mv  module.old.res module.new.res # renommer sans recréer
terraform state rm  azurerm_resource_group.legacy # retirer du state sans détruire
terraform import    azurerm_resource_group.legacy /subscriptions/.../rg-name
```

---

## 5. Versions et contraintes providers

```hcl
# shared/versions.tf — à copier dans chaque environnement
terraform {
  required_version = ">= 1.7, < 2.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
```

Verrouiller le `.terraform.lock.hcl` dans Git — il garantit la reproductibilité des builds.

---

## 6. Garde-fous et pièges fréquents

| Piège | Symptôme | Remède |
|-------|----------|--------|
| State en local / commité dans Git | Conflits d'équipe, secrets exposés | Backend distant + `.gitignore` sur `*.tfstate*` |
| `terraform apply` sans plan sauvegardé | Apply incohérent si state a changé entre-temps | Toujours `-out=tfplan.bin` + `apply tfplan.bin` |
| Hard-coding de secrets dans HCL | Secrets dans Git | `var` + Key Vault / Secrets Manager ou `sensitive = true` |
| Modules trop fins (1 ressource) | Overhead de composition, appels imbriqués | Regrouper par domaine fonctionnel |
| `terraform destroy` sans `-target` | Destruction de toute l'infra | Toujours cibler ou utiliser des workspaces isolés |
| Drift ignoré | État réel diverge du plan | `plan -refresh-only` en CI hebdomadaire |
| Pas de `lifecycle.prevent_destroy` sur ressources critiques | Suppression accidentelle BDD/stockage | Ajouter `prevent_destroy = true` sur les ressources stateful |

```hcl
# Protéger une base de données critique
resource "azurerm_postgresql_flexible_server" "main" {
  # ...
  lifecycle {
    prevent_destroy = true
  }
}
```

---

## 7. Bonnes pratiques 2026

- **Épingler les versions** providers via `.terraform.lock.hcl` (commité dans Git).
- **Secrets** : ne jamais les mettre dans `.tfvars`; utiliser `sensitive = true` + injection CI (env vars `TF_VAR_*`).
- **Tagging systématique** : module `locals` avec `common_tags` hérité par toutes les ressources.
- **Outputs sensibles** : marquer `sensitive = true` pour éviter les logs en clair.
- **CI/CD** : `terraform plan` en PR (commentaire automatique), `terraform apply` uniquement sur merge main.
- **Workspaces** : réservés aux environnements éphémères (feature branches) — ne pas les utiliser pour prod/staging (préférer des dossiers séparés avec leur propre state).
- **Tflint + Checkov** : linting et scan de sécurité avant le plan.
  ```bash
  tflint --recursive
  checkov -d . --framework terraform
  ```

---

## 8. Commandes de référence rapide

```bash
# Init & format
terraform init -upgrade && terraform fmt -recursive && terraform validate

# Plan sécurisé
terraform plan -var-file=environments/prod.tfvars -out=tfplan.bin

# Inspection du plan
terraform show tfplan.bin                   # lisible humain
terraform show -json tfplan.bin | jq '.'   # JSON pour scripts

# State ops
terraform state list
terraform state show <resource_address>
terraform state mv   <src> <dst>
terraform state rm   <resource_address>

# Import ressource existante
terraform import <resource_address> <cloud_id>

# Drift
terraform plan -refresh-only
```
