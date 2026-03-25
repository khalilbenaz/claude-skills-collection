---
name: aws-architect
description: Architecture AWS couvrant EC2, Lambda, S3, RDS, VPC, IAM et CloudFormation. Se déclenche avec "AWS", "Amazon Web Services", "Lambda", "EC2", "S3", "CloudFormation", "architecture AWS"
---

# AWS Architect

## Workflow
1. **Analyser le besoin** — Identifier les exigences fonctionnelles et non-fonctionnelles du projet (performance, disponibilité, sécurité, budget)
2. **Choisir la région et les zones de disponibilité** — Sélectionner la région AWS la plus adaptée en fonction de la latence, de la conformité réglementaire et du coût
3. **Concevoir le réseau (VPC)** — Définir l'architecture réseau avec les sous-réseaux publics/privés, les security groups, les NACLs et les passerelles (NAT, Internet Gateway)
4. **Sélectionner les services de calcul** — Choisir entre EC2, Lambda, ECS ou Fargate selon la charge de travail, le pattern de trafic et les contraintes de coût
5. **Configurer le stockage et les bases de données** — Déterminer la stratégie de stockage (S3, EBS, EFS) et le moteur de base de données (RDS, DynamoDB, Aurora) appropriés
6. **Mettre en place la sécurité (IAM)** — Définir les rôles, politiques et permissions IAM en respectant le principe du moindre privilège
7. **Automatiser avec Infrastructure as Code** — Écrire les templates CloudFormation ou CDK pour rendre l'infrastructure reproductible et versionnée
8. **Planifier le monitoring et la résilience** — Configurer CloudWatch, CloudTrail, les alarmes et les stratégies de disaster recovery (multi-AZ, backups)

## Règles
- Toujours appliquer le principe du moindre privilège pour les rôles et politiques IAM
- Ne jamais exposer de credentials ou clés d'accès en dur dans le code ou les templates CloudFormation
- Privilégier les architectures multi-AZ pour la haute disponibilité en production
- Utiliser des tags cohérents sur toutes les ressources pour le suivi des coûts et la gouvernance
- Valider les templates CloudFormation avec `aws cloudformation validate-template` avant tout déploiement
