---
name: cloud-cost-optimizer
description: Optimise les coûts cloud (Azure, AWS, GCP). Se déclenche avec "coût cloud", "facture Azure", "AWS bill", "optimiser les coûts", "réduire la facture", "reserved instances", "FinOps", "cloud spending".
---

# Cloud Cost Optimizer

## Workflow
1. Auditer l'infrastructure actuelle : inventorier toutes les ressources (VMs, bases de données, stockage, réseau, services managés), leur utilisation réelle et leur coût mensuel via Cost Explorer (AWS), Cost Management (Azure) ou Cloud Billing (GCP).
2. Identifier les ressources sous-utilisées : repérer les instances avec CPU < 10% sur 14 jours, les idle instances (arrêtées mais facturées), les volumes détachés, les IPs publiques non utilisées et les ressources oversized par rapport à la charge.
3. Appliquer le right-sizing : ajuster la taille des VMs (downgrade de tier), des containers (limites CPU/mémoire), des bases de données (instance type, storage provisioned IOPS) en s'appuyant sur les recommandations natives du cloud provider.
4. Évaluer les Reserved Instances et Savings Plans : calculer le ROI pour 1 an vs 3 ans sur les workloads stables, comparer Reserved Instances (engagement de capacité) vs Savings Plans (flexibilité de service), estimer les économies (jusqu'à 72% vs on-demand).
5. Utiliser les Spot/Preemptible instances : identifier les workloads tolérants aux interruptions (batch, CI/CD, rendering, dev/test), configurer les interruption handlers et les stratégies de fallback on-demand.
6. Optimiser le stockage : mettre en place les lifecycle policies (S3 Intelligent-Tiering, Azure Blob tiers, GCS Archive), supprimer les snapshots obsolètes, compresser les données froides, utiliser le tier adapté au pattern d'accès.
7. Configurer l'auto-scaling et le scheduling : scale-to-zero pour les workloads non-continus (Lambda, Container Apps, Cloud Run), arrêt automatique des environnements dev/staging en dehors des heures de bureau (économies 70%+ sur ces envs).
8. Mettre en place le monitoring continu des coûts : budgets avec alertes par équipe/projet, cost anomaly detection, dashboards FinOps, tagging strategy pour l'attribution des coûts, revue mensuelle des recommandations.

## Règles
- Adapter les recommandations au cloud provider utilisé (Azure, AWS ou GCP) avec les noms de services exacts.
- Toujours calculer le ROI et les économies estimées en chiffres concrets avant de recommander un engagement (réservations).
- Commencer par les quick wins (ressources idle, right-sizing) avant les changements architecturaux.
- Fournir des commandes CLI et des configs IaC (Terraform, Bicep, CloudFormation) prêtes à l'emploi.
- Ne jamais supprimer de ressources sans confirmation : proposer un plan de nettoyage progressif avec rollback possible.
