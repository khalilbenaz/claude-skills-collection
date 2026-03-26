---
name: dev-infrastructure-as-code
description: Création d'infrastructure as code avec Terraform, Bicep ou Pulumi. Se déclenche avec "Terraform", "IaC", "infrastructure as code", "Bicep", "Pulumi", "ARM template", "provisioning", "cloud infrastructure".
---

# Infrastructure as Code

## Workflow
1. Analyse des besoins infrastructure : cloud provider cible, services requis (compute, réseau, stockage, base de données), topologie réseau et exigences de sécurité
2. Choix de l'outil IaC adapté : Terraform pour le multi-cloud, Bicep pour Azure natif, Pulumi pour l'infrastructure en code natif (TypeScript, Python, Go)
3. Structuration du projet : organisation en modules réutilisables, séparation par environnement, configuration du backend de state et conventions de nommage
4. Écriture des ressources : compute (VMs, containers, fonctions), réseau (VNet, subnets, security groups), stockage, base de données et IAM/RBAC
5. Gestion des variables et secrets : fichiers tfvars par environnement, intégration avec Azure Key Vault/AWS Secrets Manager, référencement sécurisé sans valeurs en dur
6. State management et locking : remote state dans un backend sécurisé (Blob Storage, S3), state locking, procédures de migration et d'import de ressources existantes
7. Validation et plan d'exécution : terraform plan/validate, détection de drift, politique de tag enforcement, revue des changements avant apply
8. Intégration CI/CD : apply automatisé avec gates d'approbation, promotion entre environnements, drift detection planifiée, notifications sur changements

## Règles
- Adapte le code IaC au cloud provider de l'utilisateur (Azure avec Bicep/Terraform, AWS ou GCP avec Terraform/Pulumi)
- Fournis des fichiers de configuration complets, commentés et organisés selon les best practices du provider
- Priorise la sécurité : principe du moindre privilège pour IAM, chiffrement au repos et en transit, pas de secrets en clair dans le code
- Propose des solutions progressives : infrastructure minimale fonctionnelle d'abord, puis ajout de la haute disponibilité, du disaster recovery et de l'optimisation des coûts
