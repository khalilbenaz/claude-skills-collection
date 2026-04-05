---
name: devops-azure-cloud-advisor
description: Conseils pour l'architecture et le déploiement sur Azure — App Service, Azure Functions, Container Apps, SQL Azure et bonnes pratiques cloud. À utiliser quand l'utilisateur déploie sur Azure, choisit des services cloud ou optimise ses coûts Azure. Se déclenche aussi avec "Azure", "App Service", "Azure Functions", "Container Apps", "Azure SQL", "déploiement Azure", "coûts Azure".
---

# Conseiller Azure Cloud

## Workflow

1. **Qualifier le besoin** : type de workload, contraintes de performance, budget.
2. **Recommander** : services Azure adaptés avec justification.
3. **Architecturer** : topologie réseau, sécurité, résilience.
4. **Optimiser** : coûts, performance, scalabilité.

## Choix du service de compute

| Service | Usage | Scaling | Coût |
|---------|-------|---------|------|
| **App Service** | APIs, apps web | Auto-scale par plan | Moyen |
| **Container Apps** | Microservices conteneurisés | KEDA-based, scale to zero | Faible à moyen |
| **Azure Functions** | Event-driven, serverless | Automatique, par exécution | Très faible (consumption) |
| **AKS** | Orchestration complexe K8s | Node auto-scaler | Variable |
| **VM** | Legacy, contrôle total | Manual/VMSS | Variable |

### Matrice de décision

```
Nouveau projet cloud-native ?
├── Événementiel / petits traitements → Azure Functions
├── Microservices conteneurisés → Container Apps
├── App web/API simple → App Service
└── Orchestration K8s complexe → AKS

Migration d'un existant ?
├── App .NET monolithique → App Service
├── Conteneurs Docker existants → Container Apps
└── Besoin de contrôle réseau fort → AKS ou VMs
```

## Patterns d'architecture Azure

### Microservices avec Container Apps

```
Internet → Front Door (CDN + WAF)
    → Container Apps Environment
        → API Gateway (YARP)
            → Payment Service (Container App)
            → Order Service (Container App)
            → User Service (Container App)
        → Worker Service (Container App, scale to zero)
    → Azure SQL (bases par service)
    → Azure Cache for Redis
    → Azure Service Bus (messaging)
    → Azure Key Vault (secrets)
    → Application Insights (monitoring)
```

### Bonnes pratiques par service

#### Azure SQL
- Utiliser les **Elastic Pools** pour mutualiser les ressources entre bases
- Activer le **Geo-Replication** pour la haute disponibilité
- Configurer les **alertes DTU/vCore** avant saturation

#### Azure Cache for Redis
- Utiliser le tier **Premium** pour la persistance et le clustering
- Configurer les **eviction policies** adaptées au use case
- Séparer les caches par domaine métier

#### Azure Service Bus
- Préférer les **Topics** aux Queues pour le pub/sub
- Configurer les **Dead Letter Queues** avec alertes
- Utiliser les **Sessions** pour le traitement ordonné

## Optimisation des coûts

| Levier | Économie | Effort |
|--------|---------|--------|
| **Reserved Instances** (1-3 ans) | 30-60% | Faible |
| **Spot VMs** (workloads interruptibles) | 60-90% | Moyen |
| **Auto-scaling** | Variable | Moyen |
| **Right-sizing** | 20-40% | Moyen |
| **Azure Advisor** | Recommandations auto | Nul |
| **Scale to zero** (Container Apps, Functions) | Très élevé | Faible |

## Règles
- Toujours activer **Application Insights** pour la télémétrie.
- Les secrets doivent être dans **Azure Key Vault**, jamais dans les app settings.
- Utiliser les **Managed Identities** au lieu des connection strings quand possible.
- Évaluer les **Reserved Instances** pour les workloads prévisibles (> 30% d'économie).


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
