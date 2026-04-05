---
name: devops-argocd-guide
description: GitOps avec ArgoCD incluant applications, sync, rollbacks, multi-cluster et App of Apps pattern. Se déclenche avec "ArgoCD", "Argo CD", "GitOps", "sync ArgoCD", "application ArgoCD", "App of Apps"
---

# ArgoCD Guide

## Workflow
1. **Installer et configurer ArgoCD** — Déployer ArgoCD sur le cluster Kubernetes de management avec Helm ou les manifestes officiels. Configurer l'accès SSO (OIDC, LDAP, Azure AD). Définir les RBAC policies pour séparer les rôles admin, developer et viewer.
2. **Connecter les repositories Git** — Enregistrer les repos Git (GitHub, GitLab, Bitbucket) comme sources. Configurer l'authentification par SSH keys ou tokens. Organiser la structure du repo GitOps : un répertoire par application, un par environnement (dev, staging, prod).
3. **Définir les Applications** — Créer les ressources Application ArgoCD en déclaratif (YAML). Spécifier la source (repo, path, revision), la destination (cluster, namespace) et la sync policy. Utiliser les ApplicationSets pour générer dynamiquement des applications à partir de templates.
4. **Configurer la synchronisation** — Définir la sync policy : auto-sync (avec ou sans self-heal et prune), ou sync manuelle pour la production. Configurer les sync windows pour restreindre les déploiements à certaines plages horaires. Utiliser les sync waves et hooks pour orchestrer l'ordre de déploiement.
5. **Implémenter le pattern App of Apps** — Créer une application racine qui gère toutes les autres applications. Structurer en arbre hiérarchique : root app → cluster apps → namespace apps → workload apps. Permettre le bootstrapping complet d'un cluster à partir d'un seul point d'entrée.
6. **Gérer les rollbacks** — Utiliser l'historique des sync pour revenir à une version précédente. Configurer les health checks personnalisés pour détecter les déploiements défaillants. Implémenter des progressive rollouts avec Argo Rollouts (canary, blue-green, analysis).
7. **Configurer le multi-cluster** — Enregistrer les clusters distants avec `argocd cluster add`. Déployer les applications sur plusieurs clusters avec les ApplicationSets et les generators (list, cluster, Git). Centraliser la gestion depuis un seul ArgoCD de management.
8. **Monitorer et auditer** — Intégrer les notifications (Slack, Teams, email) pour les événements de sync. Exporter les métriques Prometheus d'ArgoCD. Auditer toutes les opérations via les logs d'ArgoCD et l'historique Git comme source de vérité.

## Règles
- Toujours utiliser le mode déclaratif (Application YAML dans Git) plutôt que la CLI ou l'UI pour créer des applications, afin de respecter le principe GitOps.
- Ne jamais activer auto-sync avec prune sur les environnements de production sans sync windows et sans approbation manuelle préalable.
- Toujours configurer des health checks personnalisés pour les CRDs et les ressources non-standard afin qu'ArgoCD puisse évaluer correctement l'état de santé.
- Séparer les credentials et secrets du repo GitOps en utilisant Sealed Secrets, SOPS ou External Secrets Operator pour ne jamais stocker de secrets en clair dans Git.
- Implémenter le pattern App of Apps pour tout nouveau cluster afin de garantir un bootstrapping reproductible et une gestion centralisée.


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
