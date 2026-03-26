---
name: agent-workflow-automation-agent
description: Construction d'agents d'automatisation de workflows métier incluant RPA intelligent, déclencheurs et actions chaînées. Se déclenche avec "workflow agent", "RPA", "automatisation métier", "agent d'automatisation", "process automation"
---

# Workflow Automation Agent

## Workflow
1. **Cartographier les processus métier** — Documenter les workflows existants avec leurs étapes, acteurs, systèmes impliqués et points de décision. Identifier les tâches répétitives et à faible valeur ajoutée. Calculer le ROI potentiel de l'automatisation pour prioriser les processus candidats.
2. **Concevoir l'architecture de l'agent** — Définir les composants : moteur de workflow (state machine ou DAG), connecteurs vers les systèmes tiers (API, UI, fichiers), module de décision (règles métier + LLM), module de monitoring. Choisir entre orchestration centralisée et chorégraphie événementielle.
3. **Implémenter les connecteurs** — Développer les intégrations avec les systèmes cibles : APIs REST/SOAP, bases de données, systèmes de fichiers, services email, outils SaaS (Salesforce, SAP, ServiceNow). Implémenter la RPA UI (Playwright, UiPath) pour les systèmes sans API. Gérer les retries et le circuit breaker.
4. **Définir les déclencheurs** — Configurer les événements qui initient les workflows : réception d'email, changement en base de données, webhook, timer/cron, upload de fichier, événement métier (nouveau client, commande validée). Implémenter le debouncing pour éviter les exécutions multiples.
5. **Orchestrer les actions chaînées** — Implémenter les séquences d'actions avec gestion de l'état entre les étapes. Gérer les branchements conditionnels, les boucles et les sous-workflows. Implémenter la compensation (undo) pour les étapes en cas d'échec. Supporter les workflows long-running avec persistence d'état.
6. **Intégrer la prise de décision intelligente** — Utiliser un LLM pour les décisions qui nécessitent du jugement : classification de documents, extraction d'informations non structurées, gestion des cas ambigus. Définir des seuils de confiance avec escalade humaine en dessous.
7. **Gérer les erreurs et la résilience** — Implémenter les retry policies avec backoff exponentiel. Configurer les dead-letter queues pour les messages non traités. Mettre en place des alertes sur les échecs et des dashboards de suivi. Implémenter les timeout par étape et globaux.
8. **Monitorer et améliorer** — Mesurer les KPIs : temps de cycle, taux de succès, volume traité, interventions humaines. Identifier les goulots d'étranglement. Analyser les cas d'échec pour enrichir les règles métier. Implémenter le A/B testing sur les variantes de workflow.

## Règles
- Toujours implémenter des mécanismes de compensation (rollback) pour chaque action modifiant un système externe afin de garantir la cohérence en cas d'échec partiel.
- Ne jamais automatiser un processus sans avoir d'abord documenté et validé le workflow manuel avec les parties prenantes métier.
- Toujours conserver un audit trail complet de chaque exécution de workflow (entrées, sorties, décisions, timestamps) pour la traçabilité et le debugging.
- Implémenter un circuit breaker sur chaque connecteur externe pour éviter les cascades de pannes quand un système tiers est indisponible.
- Toujours prévoir un mode de fallback manuel permettant aux utilisateurs de reprendre le contrôle quand l'agent ne peut pas traiter un cas automatiquement.
