---
name: analytics-interpreter
description: Analyse et interprétation de données Google Analytics et Matomo — métriques, segments, conversions et rapports actionnables. Se déclenche avec "Google Analytics", "GA4", "Matomo", "analytics", "taux de conversion", "bounce rate".
---

# Analytics Interpreter

## Workflow

1. **Configurer le tracking correctement** — vérifier l'installation du tag Google Analytics 4 (via Google Tag Manager ou gtag.js) ou Matomo, s'assurer que toutes les pages sont trackées, configurer les flux de données (web, app), et valider en temps réel que les événements remontent correctement.

2. **Définir les objectifs et conversions** — identifier les actions clés du site (achat, inscription, téléchargement, soumission de formulaire), les configurer comme événements de conversion dans GA4 ou objectifs dans Matomo, et attribuer une valeur monétaire quand c'est pertinent pour mesurer le ROI.

3. **Analyser les métriques d'acquisition** — examiner les sources de trafic (organique, payant, social, referral, direct, email), comparer les volumes et la qualité par canal (sessions, taux de rebond, pages/session, durée moyenne), et identifier les canaux les plus performants en termes de conversions.

4. **Analyser le comportement des utilisateurs** — étudier les pages les plus visitées, les parcours de navigation (exploration du chemin dans GA4), les pages de sortie, le taux d'engagement, les événements déclenchés, et utiliser les rapports de flux pour identifier les points de friction dans le tunnel de conversion.

5. **Créer des segments avancés** — segmenter l'audience par critères démographiques (âge, localisation, appareil), comportementaux (nouveaux vs. récurrents, pages visitées, événements), et de source (canal, campagne, mot-clé) pour comparer les performances et identifier les audiences les plus rentables.

6. **Construire des rapports et dashboards** — créer des rapports personnalisés dans GA4 Explorations ou Matomo, construire des dashboards dans Looker Studio (Data Studio) avec les KPIs prioritaires, automatiser l'envoi par email, et inclure des annotations pour contextualiser les variations.

7. **Interpréter les données et recommander** — transformer les chiffres en insights actionnables : identifier les tendances (saisonnalité, croissance), expliquer les anomalies (pic ou chute de trafic), quantifier les opportunités d'amélioration, et formuler des recommandations concrètes avec impact estimé.

8. **Optimiser en continu** — mettre en place des tests A/B basés sur les données analytics, suivre les micro-conversions comme indicateurs avancés, comparer les cohortes dans le temps, et itérer sur les recommandations en mesurant l'impact de chaque changement.

## Règles

- Toujours vérifier la fiabilité des données avant d'analyser — un tracking mal configuré ou des filtres manquants (trafic interne, bots) faussent toutes les conclusions.
- Ne jamais tirer de conclusions sur des échantillons trop petits — attendre un volume statistiquement significatif avant de valider une tendance ou un résultat de test A/B.
- Corréler les données analytics avec le contexte business (campagnes lancées, changements de prix, saisonnalité, actualités) pour expliquer les variations.
- Présenter les données avec des visualisations claires et des recommandations actionnables — les stakeholders n'ont pas besoin de chiffres bruts mais de décisions à prendre.
- Respecter le RGPD et la vie privée des utilisateurs — configurer le consentement cookies, anonymiser les IP, et ne collecter que les données nécessaires.
