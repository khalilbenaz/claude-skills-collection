---
name: dev-infrastructure-as-code
description: Création d'infrastructure as code avec Terraform, Bicep ou Pulumi. Se déclenche avec "Terraform", "IaC", "infrastructure as code", "Bicep", "Pulumi", "ARM template", "provisioning", "cloud infrastructure".
---

# Infrastructure as Code

## Critères de choix d'outil

| Critère | Terraform | Bicep | Pulumi |
|---|---|---|---|
| Multi-cloud | ✅ | ❌ Azure only | ✅ |
| Langage | HCL (DSL) | Bicep DSL | TS / Python / Go / .NET |
| Maturité état | Élevée | Élevée (Azure) | Moyenne |
| Courbe apprentissage | Faible | Très faible (Azure) | Nécessite dev skills |
| Meilleur pour | Tout cloud, équipes mixtes | Azure full-native, Azure Devs | Teams avec devs, logique complexe |

**Règle** : si Azure only → Bicep. Si multi-cloud ou équipes mixtes → Terraform. Si la logique dépasse les templates → Pulumi.

---

## Workflow en étapes

### 1. Analyse du contexte
- Cloud provider(s) cibles, régions
- Services requis : compute, réseau, storage, DB, IAM
- Environnements : dev / staging / prod (séparés ?)
- Contraintes : conformité, coûts, équipe existante

### 2. Structure du projet

**Terraform (recommandé)**
```
infra/
├── modules/           # modules réutilisables (vnet, aks, sql…)
│   └── vnet/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
└── .terraform-version  # ex: 1.9.0
```

**Bicep**
```
infra/
├── modules/
│   └── storage.bicep
├── main.bicep
└── parameters/
    ├── dev.bicepparam
    └── prod.bicepparam
```

### 3. Backend de state (Terraform)

```hcl
# backend.tf — à créer AVANT terraform init
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate-prod"
    storage_account_name = "sttfstateprod001"
    container_name       = "tfstate"
    key                  = "myapp/prod.terraform.tfstate"
  }
}
```

Commandes de bootstrap du backend :
```bash
az group create -n rg-tfstate-prod -l westeurope
az storage account create -n sttfstateprod001 -g rg-tfstate-prod --sku Standard_LRS
az storage container create -n tfstate --account-name sttfstateprod001
```

### 4. Variables et secrets

```hcl
# variables.tf
variable "db_password" {
  description = "Mot de passe de la base de données"
  type        = string
  sensitive   = true  # masqué dans les logs
}

# Référence Key Vault (Azure)
data "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  key_vault_id = azurerm_key_vault.kv.id
}
```

Passer les secrets **sans les coder en dur** :
```bash
# Via variable d'environnement (CI/CD)
export TF_VAR_db_password="$(az keyvault secret show --name db-password --vault-name mykv --query value -o tsv)"
terraform apply
```

### 5. Cycle plan / apply

```bash
# Initialiser
terraform init

# Valider la syntaxe
terraform validate

# Voir les changements avant apply
terraform plan -var-file=environments/prod/terraform.tfvars -out=tfplan

# Appliquer (toujours à partir du plan généré)
terraform apply tfplan

# Vérifier le drift (détection manuelle)
terraform plan -detailed-exitcode   # exit 2 = drift détecté
```

**Bicep** :
```bash
az deployment group what-if \
  --resource-group rg-myapp-prod \
  --template-file main.bicep \
  --parameters parameters/prod.bicepparam

az deployment group create \
  --resource-group rg-myapp-prod \
  --template-file main.bicep \
  --parameters parameters/prod.bicepparam
```

### 6. Import de ressources existantes

```bash
# Terraform : importer une ressource créée manuellement
terraform import azurerm_resource_group.main /subscriptions/<sub>/resourceGroups/rg-existing

# Générer la config depuis une ressource existante (Terraform 1.5+)
terraform plan -generate-config-out=generated.tf
```

### 7. CI/CD (GitHub Actions, Azure DevOps)

```yaml
# .github/workflows/terraform.yml (extrait)
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.0"
      - run: terraform init
      - run: terraform plan -out=tfplan
      - uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: tfplan

  apply:
    needs: plan
    environment: production   # gate d'approbation manuelle
    steps:
      - uses: actions/download-artifact@v4
        with: { name: tfplan }
      - run: terraform apply tfplan
```

---

## Bonnes pratiques 2026

- **Versions épinglées** : always pin provider et terraform version dans `required_providers`
- **Tagging systématique** : `environment`, `owner`, `cost-center`, `managed-by=terraform` sur toutes les ressources
- **Outputs documentés** : exposer les `output` utiles aux autres modules (IDs, endpoints)
- **`moved` blocks** : utiliser `moved {}` pour renommer des ressources sans destroy/recreate
- **Drift detection** : planifier `terraform plan` en cron (daily) et alerter sur exit code 2
- **Workspaces** : éviter les workspaces Terraform pour les environnements — préférer des dossiers séparés (state isolation plus claire)
- **Checkov / tfsec** : scanner IaC avant merge (secrets, ports ouverts, chiffrement désactivé)

---

## Anti-patterns et pièges

| Piège | Conséquence | Remède |
|---|---|---|
| `terraform apply` sans `plan` préalable | Surprises en prod | Toujours `-out=tfplan` + apply depuis le plan |
| Secrets dans `.tfvars` commités | Fuite de credentials | `sensitive = true` + `.gitignore` sur `*.tfvars` |
| State en local | Pas de collaboration, perte | Backend remote dès le début |
| Trop de ressources dans un seul state | `plan` lent, blast radius élevé | Découper par domaine (réseau / app / data) |
| `count` pour les environnements | `terraform state` difficile à lire | `for_each` sur une map + workspaces séparés |
| Hardcoder la région | Pas réutilisable | Variable `location` systématique |
| Ignorer les `lifecycle` | Recreations non voulues | `lifecycle { prevent_destroy = true }` sur les bases de données |
| Bicep sans `what-if` | Changements destructifs silencieux | Toujours `what-if` avant deployment |


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
