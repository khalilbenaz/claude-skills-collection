---
name: security-audit-automation
description: Automatisation d'audits de sécurité incluant scanning, reporting, intégration CI/CD et remediation tracking. Se déclenche avec "audit automatisé", "security scanning", "SAST", "DAST", "Trivy", "Snyk", "audit CI/CD"
---

# Security Audit Automation

## Workflow
1. **Définir le périmètre d'audit** — Identifier les assets à auditer : code source, dépendances, images Docker, infrastructure as code, APIs, applications web. Définir les catégories de vulnérabilités ciblées (OWASP Top 10, CWE Top 25). Établir les seuils de sévérité acceptables par environnement.
2. **Configurer les scanners SAST** — Intégrer les outils d'analyse statique du code : SonarQube, Semgrep, CodeQL, Bandit (Python), ESLint security plugin (JS). Configurer les règles personnalisées selon le contexte métier. Exclure les faux positifs identifiés et documenter les suppressions.
3. **Configurer les scanners DAST** — Déployer les outils de test dynamique : OWASP ZAP, Burp Suite, Nuclei. Configurer les scans authentifiés pour couvrir les fonctionnalités protégées. Planifier les scans réguliers sur les environnements de staging. Gérer les scans avec des rate limits pour ne pas impacter les performances.
4. **Scanner les dépendances et containers** — Intégrer Trivy, Snyk ou Grype pour l'analyse des vulnérabilités dans les dépendances (SCA). Scanner les images Docker avec Trivy ou Anchore. Vérifier les licences open source. Configurer les alertes sur les nouvelles CVE affectant les dépendances utilisées.
5. **Intégrer dans le pipeline CI/CD** — Ajouter les étapes de scan dans les pipelines (GitHub Actions, GitLab CI, Azure DevOps). Configurer les quality gates : bloquer le merge/deploy si des vulnérabilités critiques ou hautes sont détectées. Générer des rapports SARIF pour l'intégration dans les outils de review de code.
6. **Centraliser et prioriser les findings** — Agréger les résultats de tous les scanners dans un dashboard centralisé (DefectDojo, Security Hub). Dédupliquer les findings. Prioriser par sévérité CVSS, exploitabilité et exposition. Assigner les remédiations aux équipes responsables avec des SLAs définis.
7. **Suivre la remédiation** — Implémenter un workflow de remediation tracking : finding détecté → assigné → en cours → corrigé → vérifié. Configurer les rappels automatiques pour les SLAs dépassés. Mesurer le MTTR (Mean Time To Remediate) par sévérité et par équipe. Escalader les findings critiques non résolus.
8. **Générer les rapports d'audit** — Produire des rapports automatisés : résumé exécutif (tendances, risques majeurs), détail technique (findings, remédiation), métriques (couverture, MTTR, dette de sécurité). Planifier l'envoi périodique aux stakeholders. Archiver les rapports pour la conformité.

## Règles
- Toujours configurer des quality gates bloquants dans le CI/CD pour les vulnérabilités critiques et hautes afin d'empêcher le déploiement de code vulnérable.
- Ne jamais ignorer un finding sans le documenter formellement avec une justification (faux positif, risque accepté) et une approbation du responsable sécurité.
- Toujours scanner les images Docker et les dépendances à chaque build et pas seulement lors de leur ajout, car de nouvelles CVE sont publiées quotidiennement.
- Définir des SLAs de remédiation par sévérité (critique: 48h, haute: 7j, moyenne: 30j, basse: 90j) et les respecter strictement.
- Centraliser tous les findings dans un outil unique de suivi pour éviter la dispersion et garantir une vue consolidée de la posture de sécurité.
