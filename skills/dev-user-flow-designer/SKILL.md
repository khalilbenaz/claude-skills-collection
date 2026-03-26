---
name: dev-user-flow-designer
description: Conception de parcours utilisateurs et flows d'interaction optimaux. Se déclenche avec "user flow", "parcours utilisateur", "flow", "onboarding flow", "checkout flow", "navigation", "funnel", "conversion".
---

# User Flow Designer

## Workflow
1. **Identifier les objectifs utilisateur et business** : clarifier les jobs-to-be-done (ce que l'utilisateur cherche à accomplir), les métriques de succès business (activation, conversion, rétention), et les tensions potentielles entre ces deux types d'objectifs.
2. **Mapper le flow actuel** : si un flow existant est en place, le documenter étape par étape, identifier les friction points (drops, erreurs fréquentes, hésitations mesurées par analytics ou tests), et quantifier l'impact de chaque point de friction.
3. **Designer le happy path** : concevoir le chemin idéal — le minimum d'étapes nécessaires pour atteindre l'objectif, la progressive disclosure (ne montrer que ce dont l'utilisateur a besoin à chaque étape), et l'élimination de toute décision non essentielle.
4. **Gérer les edge cases** : cartographier tous les chemins alternatifs — erreurs de validation, perte de connexion, retours arrière et annulations, états vides (premier usage), permissions refusées (caméra, localisation), timeouts, et conflits de données.
5. **Optimiser la conversion** : réduire la charge cognitive (chunking des étapes), utiliser l'auto-fill et la persistance des données, intégrer la social proof et les éléments de réassurance au bon moment, créer un sentiment de progression (progress indicator, steps restants).
6. **Concevoir l'onboarding** : définir le moment d'activation (aha moment), structurer la first-time experience (guided vs. exploratoire), placer les tooltips et coachmarks de manière non intrusive, et concevoir un wizard progressif qui démontre la valeur avant de demander un effort.
7. **Représentation visuelle** : créer un flowchart clair (rectangles = étapes, losanges = décisions, cylindres = data), une user story map (activités → tâches → stories), ou un service blueprint si des acteurs backend sont impliqués.
8. **Mesure et itération** : définir les événements analytics à tracker sur chaque étape du flow, analyser le funnel de conversion, utiliser les heatmaps et les session recordings pour identifier les frictions non anticipées, et mettre en place des A/B tests sur les étapes critiques.

## Règles
- Base-toi sur des principes de design éprouvés (loi de Hick, loi de Miller, paradoxe du choix, principes de Fogg).
- Sois constructif : chaque friction identifiée doit être accompagnée d'une solution concrète de simplification.
- Fournis des exemples visuels de référence (flows notables comme Duolingo onboarding, Stripe checkout) quand possible.
- Adapte le flow au contexte et à la plateforme cible (un checkout mobile doit être pensé différemment d'un checkout desktop).
- Prioritise le happy path : les edge cases sont importants, mais ne doivent pas complexifier le parcours principal.
