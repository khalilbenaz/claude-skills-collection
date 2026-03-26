---
name: devops-terraform-guide
description: Guide Terraform pour l'Infrastructure as Code — modules, state management, workspaces et bonnes pratiques. À utiliser quand l'utilisateur écrit du Terraform, conçoit des modules ou gère de l'infrastructure cloud. Se déclenche aussi avec "terraform", "infrastructure as code", "terraform plan", "terraform apply", "module terraform", "tfstate", "HCL".
---

# Guide Terraform

## Workflow

1. **Concevoir** : identifier les ressources, organiser en modules.
2. **Écrire** : fichiers HCL avec variables, outputs et data sources.
3. **Planifier** : `terraform plan` pour prévisualiser les changements.
4. **Appliquer** : `terraform apply` avec review et approbation.
5. **Maintenir** : state management, drift detection, mises à jour.

## Structure d'un projet

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── production/
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── database/
│   └── app-service/
└── shared/
    └── providers.tf
```

## Module réutilisable

```hcl
# modules/app-service/main.tf
variable "app_name" {
  type        = string
  description = "Nom de l'application"
}

variable "environment" {
  type        = string
  description = "Environnement (dev, staging, production)"
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "L'environnement doit être dev, staging ou production."
  }
}

variable "sku" {
  type    = string
  default = "B1"
}

resource "azurerm_service_plan" "main" {
  name                = "plan-${var.app_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = var.sku

  tags = local.common_tags
}

resource "azurerm_linux_web_app" "main" {
  name                = "app-${var.app_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment == "production"

    application_stack {
      dotnet_version = "8.0"
    }
  }

  app_settings = var.app_settings

  tags = local.common_tags
}

output "app_url" {
  value = "https://${azurerm_linux_web_app.main.default_hostname}"
}

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = var.app_name
  }
}
```

## State Management

### Backend distant (recommandé)

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "myapp.dev.tfstate"
  }
}
```

### Commandes utiles

```bash
terraform init              # Initialiser le backend et les providers
terraform plan -out=plan.tf # Planifier et sauvegarder
terraform apply plan.tf     # Appliquer le plan sauvegardé
terraform state list        # Lister les ressources dans le state
terraform state show        # Afficher une ressource spécifique
terraform import            # Importer une ressource existante
```

## Bonnes pratiques

### À faire
- Utiliser des **modules** pour le code réutilisable
- Séparer les **environnements** dans des dossiers distincts
- Stocker le state dans un **backend distant** avec locking
- Utiliser `terraform plan` avant chaque `apply`
- Taguer toutes les ressources avec `ManagedBy = "terraform"`
- Valider les variables avec des blocs `validation`

### À éviter
- Stocker le state en local ou dans Git
- Hard-coder des valeurs — utiliser des variables
- Créer des modules trop granulaires ou trop monolithiques
- Ignorer le drift entre le state et la réalité
- Appliquer sans plan préalable

## Règles
- Le state Terraform ne doit **jamais** être commité dans Git.
- Chaque environnement a son propre state file.
- Les modules doivent avoir des `variables.tf` et `outputs.tf` documentés.
- Toujours utiliser `-out` avec `terraform plan` pour des applies déterministes.
