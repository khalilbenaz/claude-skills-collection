---
name: data-data-governance-guide
description: Gouvernance des données incluant catalogues, lineage, qualité, ownership, politiques et metadata management. Se déclenche avec "data governance", "gouvernance données", "data catalog", "data lineage", "metadata", "data ownership"
---

# Data Governance Guide

## Workflow
1. **Définir le framework de gouvernance** — Établir la stratégie de gouvernance alignée sur les objectifs métier. Créer le comité de gouvernance (Data Governance Council). Définir les rôles : Data Owner (responsable métier), Data Steward (gardien qualité), Data Custodian (technique). Rédiger la charte de gouvernance.
2. **Déployer le catalogue de données** — Implémenter un data catalog (Apache Atlas, Collibra, Alation, DataHub) pour inventorier tous les assets de données. Documenter chaque dataset : description, schéma, propriétaire, classification, fréquence de mise à jour. Automatiser la découverte avec des crawlers.
3. **Cartographier le data lineage** — Tracer l'origine et les transformations de chaque donnée de la source au reporting. Implémenter le lineage automatique via les outils ETL (dbt, Airflow) et le catalog. Visualiser les dépendances pour l'analyse d'impact avant toute modification de schéma ou de pipeline.
4. **Implémenter la qualité des données** — Définir les dimensions de qualité : complétude, exactitude, cohérence, fraîcheur, unicité. Implémenter des contrôles automatisés avec Great Expectations, dbt tests ou Soda. Configurer des alertes sur les violations de qualité. Mesurer un Data Quality Score global.
5. **Classifier et protéger les données** — Définir les niveaux de classification (public, interne, confidentiel, restreint). Appliquer les politiques de masquage, anonymisation et rétention selon la classification. Implémenter le tagging automatique avec des outils de découverte de données sensibles (PII, PHI, PCI).
6. **Établir les politiques et standards** — Rédiger les politiques de gestion des données : naming conventions, formats, rétention, accès, partage. Définir les data contracts entre les producteurs et consommateurs de données. Automatiser la conformité avec des policies-as-code.
7. **Gérer le cycle de vie des données** — Définir les durées de rétention par type de données et réglementation (RGPD, HIPAA). Automatiser l'archivage et la suppression. Implémenter le droit à l'effacement. Gérer les versions et l'historisation des données de référence (master data).
8. **Mesurer et améliorer** — Définir des KPIs de gouvernance : couverture du catalogue, score de qualité, conformité aux politiques, adoption par les équipes. Générer des rapports mensuels pour le comité de gouvernance. Itérer sur les processus en fonction des retours utilisateurs.

## Règles
- Toujours assigner un Data Owner métier identifié pour chaque dataset critique ; la gouvernance ne peut pas fonctionner sans responsabilité claire.
- Ne jamais modifier un schéma de données partagé sans consulter le data lineage et notifier tous les consommateurs impactés en amont.
- Toujours automatiser les contrôles de qualité dans les pipelines de données plutôt que de compter sur des vérifications manuelles ponctuelles.
- Classifier toutes les données contenant des informations personnelles (PII) dès leur ingestion et appliquer automatiquement les politiques de masquage appropriées.
- Documenter chaque dataset dans le catalogue avec au minimum : description, propriétaire, classification, schéma et fréquence de mise à jour.


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
