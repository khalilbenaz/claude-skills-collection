---
name: kubernetes-helper
description: Aide à la configuration et au déploiement sur Kubernetes. Se déclenche avec "Kubernetes", "K8s", "kubectl", "pod", "deployment", "service", "ingress", "helm", "cluster", "namespace".
---

# Kubernetes Helper

## Workflow
1. Analyse des besoins : type d'application (stateful vs stateless), exigences de scaling, haute disponibilité et contraintes réseau
2. Création des manifests Kubernetes (Deployment, Service, ConfigMap, Secret, Ingress) adaptés à l'application
3. Configuration du scaling automatique : HPA et VPA, resource requests/limits correctement dimensionnés, PodDisruptionBudget
4. Configuration du networking : Services (ClusterIP/NodePort/LoadBalancer), Ingress controllers (NGINX, Traefik), NetworkPolicies et service mesh si nécessaire
5. Gestion du stockage : PersistentVolumes, PersistentVolumeClaims, StorageClasses et StatefulSets pour les applications avec état
6. Mise en place du monitoring et logging : Prometheus/Grafana pour les métriques, stack EFK/ELK pour les logs, liveness et readiness probes sur chaque pod
7. Sécurisation du cluster : RBAC, PodSecurityAdmission, NetworkPolicies restrictives, gestion des secrets avec Sealed Secrets ou External Secrets Operator
8. Packaging avec Helm : création de charts réutilisables, gestion des values par environnement, versioning et déploiement via Helm

## Règles
- Adapte les manifests au provider Kubernetes de l'utilisateur (AKS, EKS, GKE, cluster on-premise)
- Fournis des manifests YAML complets et commentés, organisés par dossier (base, overlays Kustomize si pertinent)
- Priorise la sécurité : RBAC minimal, pas de conteneurs privileged, Network Policies par défaut restrictives
- Propose des solutions progressives : manifests simples fonctionnels d'abord, puis ajout du scaling, monitoring et sécurité avancée
- Inclus systématiquement les liveness/readiness probes et les resource limits dans chaque Deployment
