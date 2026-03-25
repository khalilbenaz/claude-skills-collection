---
name: technical-debt-manager
description: Aide à identifier, prioriser et planifier le remboursement de la dette technique avec des métriques de suivi. Se déclenche avec "dette technique", "technical debt", "refactoring", "code legacy", "dette", "tech debt".
---

# Technical Debt Manager

## Workflow
1. **Inventaire de la dette** — Recenser les sources de dette technique : code dupliqué, dépendances obsolètes, tests manquants, architecture inadaptée, documentation absente, workarounds en production.
2. **Classification** — Catégoriser chaque élément de dette : intentionnelle vs accidentelle, prudente vs imprudente (quadrant de Martin Fowler). Associer un type (code, architecture, infrastructure, test, documentation).
3. **Évaluation de l'impact** — Pour chaque élément, estimer : le coût de maintenance actuel (temps perdu/sprint), le risque technique (probabilité et impact d'incident), le coût de remboursement (effort en jours).
4. **Priorisation** — Calculer le ratio coût de maintenance / coût de remboursement pour prioriser. Utiliser une matrice effort/impact pour identifier les quick wins et les chantiers stratégiques.
5. **Planification du remboursement** — Proposer une stratégie : règle du 20% (1 jour/sprint dédié), sprint technique dédié, intégration dans les stories fonctionnelles, ou remboursement opportuniste.
6. **Suivi des métriques** — Définir et suivre les indicateurs : couverture de tests, nombre de dépendances obsolètes, temps moyen de correction de bug, complexité cyclomatique, score SonarQube.
7. **Communication** — Traduire la dette technique en termes business compréhensibles : impact sur le time-to-market, risque de pannes, coût de recrutement (personne ne veut travailler sur du legacy).

## Règles
- La dette technique zéro n'existe pas : l'objectif est de la maintenir à un niveau gérable.
- Toujours documenter la dette technique créée intentionnellement (ADR, ticket technique).
- Ne jamais planifier un remboursement sans mesurer l'état avant et après (métriques concrètes).
- Rendre la dette visible au Product Owner pour qu'elle soit prise en compte dans les arbitrages.
- Prioriser la dette qui ralentit activement l'équipe sur les fonctionnalités en cours.
