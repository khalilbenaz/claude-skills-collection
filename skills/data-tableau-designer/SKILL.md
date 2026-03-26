---
name: data-tableau-designer
description: Conception de dashboards Tableau incluant calculated fields, LOD expressions, actions et storytelling. Se déclenche avec "Tableau", "dashboard Tableau", "LOD expression", "calculated field", "Tableau Server"
---

# Tableau Designer

## Workflow
1. **Analyser les besoins de visualisation** — Identifier les questions métier auxquelles le dashboard doit répondre. Définir les KPIs, dimensions et métriques clés. Déterminer le public cible (exécutif, opérationnel, analytique) et adapter le niveau de détail en conséquence.
2. **Préparer les sources de données** — Connecter les sources (bases de données, fichiers, APIs) via Tableau Desktop. Créer les jointures, unions et relations dans le modèle de données. Optimiser les extracts (.hyper) pour les performances. Définir les hiérarchies, groupes et alias pour faciliter l'exploration.
3. **Concevoir les calculated fields** — Créer les métriques calculées : agrégations conditionnelles (IF/CASE), calculs de table (RUNNING_SUM, RANK, WINDOW_AVG), différences temporelles (DATEDIFF, DATETRUNC). Organiser les calculs dans des dossiers logiques. Tester chaque calcul sur un échantillon de données.
4. **Maîtriser les LOD expressions** — Utiliser les expressions FIXED, INCLUDE et EXCLUDE pour contrôler le niveau de granularité des calculs indépendamment des filtres et dimensions de la vue. Appliquer pour les ratios, moyennes pondérées, cohortes et comparaisons entre niveaux de détail.
5. **Construire les visualisations** — Créer les feuilles de travail avec les types de graphiques appropriés (barres, lignes, cartes, scatter, treemap). Appliquer les bonnes pratiques visuelles : palette de couleurs cohérente, étiquettes lisibles, axes bien calibrés, légendes claires. Limiter à 3-4 couleurs par vue.
6. **Assembler le dashboard** — Organiser les feuilles dans un layout responsive. Configurer les actions de filtrage, de surbrillance et de navigation entre dashboards. Ajouter les filtres interactifs, paramètres et conteneurs dynamiques. Optimiser pour les performances avec le Performance Recorder.
7. **Implémenter le storytelling** — Créer des Story Points pour guider l'utilisateur à travers une narration analytique. Annoter les insights clés directement sur les visualisations. Configurer les alertes et abonnements sur Tableau Server/Cloud pour la distribution automatique.
8. **Publier et gouverner** — Déployer sur Tableau Server ou Tableau Cloud. Configurer les permissions par projet et groupe. Planifier les rafraîchissements d'extracts. Certifier les sources de données fiables. Monitorer l'adoption avec les vues d'administration.

## Règles
- Toujours concevoir les dashboards pour répondre à des questions métier précises et non pour afficher un maximum de données ; chaque visualisation doit avoir un objectif clair.
- Ne jamais utiliser plus de 7-8 visualisations par dashboard pour maintenir la lisibilité et les performances de rendu.
- Toujours utiliser les LOD expressions FIXED plutôt que des sous-requêtes ou des blending complexes pour les calculs multi-niveaux de granularité.
- Préférer les extracts (.hyper) aux connexions live pour les dashboards fréquemment consultés afin d'améliorer les temps de chargement.
- Toujours tester les dashboards sur les données de production réelles et avec les volumes attendus avant la publication pour éviter les problèmes de performance.
