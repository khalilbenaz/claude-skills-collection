---
name: cloud-cloud-security-guide
description: Sécurité cloud incluant IAM, encryption, networking, compliance, secrets management et CSPM. Se déclenche avec "sécurité cloud", "cloud security", "IAM", "encryption at rest", "CSPM", "compliance cloud"
---

# Cloud Security Guide

## Workflow
1. **Auditer la posture IAM** — Inventorier tous les comptes, rôles et politiques d'accès. Appliquer le principe du moindre privilège. Supprimer les accès inutilisés avec IAM Access Analyzer (AWS), Azure AD Access Reviews ou GCP Policy Analyzer. Imposer le MFA sur tous les comptes humains.
2. **Sécuriser le réseau cloud** — Configurer les VPC/VNET avec segmentation par sous-réseaux (public, privé, données). Implémenter les security groups et NACLs restrictifs. Déployer des WAF devant les applications exposées. Activer les VPC Flow Logs pour la visibilité réseau.
3. **Chiffrer les données** — Activer le chiffrement at-rest sur tous les services de stockage (S3, Blob Storage, RDS, disques). Configurer le chiffrement in-transit avec TLS 1.2+. Gérer les clés avec KMS/Key Vault en utilisant des Customer Managed Keys (CMK) pour les données sensibles.
4. **Gérer les secrets** — Centraliser les secrets dans un vault dédié (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault). Implémenter la rotation automatique des secrets. Interdire les secrets en dur dans le code ou les variables d'environnement non chiffrées.
5. **Déployer un CSPM** — Configurer un outil de Cloud Security Posture Management (AWS Security Hub, Microsoft Defender for Cloud, Prisma Cloud). Définir des benchmarks de conformité (CIS). Automatiser la remédiation des findings critiques avec des playbooks.
6. **Implémenter la détection de menaces** — Activer les services de détection natifs (GuardDuty, Sentinel, Security Command Center). Configurer les alertes sur les comportements anormaux : accès inhabituel, exfiltration de données, escalade de privilèges. Centraliser les logs dans un SIEM.
7. **Assurer la conformité** — Mapper les contrôles cloud aux frameworks réglementaires (ISO 27001, SOC 2, RGPD, HIPAA). Automatiser les audits de conformité avec des policies-as-code (OPA, AWS Config Rules, Azure Policy). Générer des rapports de conformité périodiques.
8. **Planifier la réponse aux incidents** — Documenter les procédures de réponse aux incidents cloud (isolation de ressource, forensics, notification). Tester régulièrement avec des exercices de tabletop. Configurer les snapshots automatiques pour la préservation des preuves.

## Règles
- Toujours appliquer le principe du moindre privilège sur chaque rôle IAM et réviser les permissions trimestriellement pour supprimer les accès non utilisés.
- Ne jamais exposer de ressources de données (bases de données, buckets, queues) directement sur Internet ; toujours utiliser des endpoints privés ou des VPN.
- Toujours chiffrer les données sensibles avec des Customer Managed Keys (CMK) et activer la rotation automatique des clés.
- Implémenter le tagging obligatoire sur toutes les ressources cloud pour assurer la traçabilité, la gestion des coûts et l'application des politiques de sécurité.
- Ne jamais désactiver les logs d'audit (CloudTrail, Activity Log, Audit Logs) ; les conserver au minimum 12 mois dans un stockage immuable.


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
