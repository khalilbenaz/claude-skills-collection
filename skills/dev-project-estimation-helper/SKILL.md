---
name: dev-project-estimation-helper
description: Estimation de projets logiciels avec méthodes éprouvées. Se déclenche avec "estimation", "combien de temps", "planning", "story points", "estimation projet", "délai", "effort", "PERT", "t-shirt sizing".
---

# Project Estimation Helper

## Workflow

1. **Décomposer le scope** : Construire un Work Breakdown Structure (WBS) en partant des livrables majeurs, puis découper en user stories, puis en tâches techniques. Aucune tâche ne doit dépasser 2 jours de travail. Une tâche mal découpée est une estimation non-fiable. Identifier et lister explicitement ce qui est hors scope (out of scope) pour éviter les malentendus.

2. **Choisir la technique d'estimation** : Sélectionner selon le contexte. T-shirt sizing (XS/S/M/L/XL) pour une estimation rapide en début de projet. Planning poker pour l'estimation collective et collaborative en équipe Agile. Three-point PERT ((optimiste + 4×réaliste + pessimiste) / 6) pour les tâches à haute incertitude. Estimation par analogie quand une tâche similaire a déjà été faite — la plus fiable sur du connu.

3. **Estimer par complexité** : Utiliser la suite de Fibonacci (1, 2, 3, 5, 8, 13, 21) pour les story points, car elle reflète l'incertitude croissante des grandes tâches. Décomposer toute tâche > 8 points. Séparer l'effort de développement, les tests, la revue, le déploiement et la documentation. Inclure les risques techniques identifiés dans l'estimation.

4. **Ajouter buffers et contingence** : Appliquer le cone d'incertitude : en phase de conception, l'estimation peut varier de ±50 à 100%. Ajouter 20% de buffer minimum pour les projets bien maîtrisés, 40-50% pour les technologies nouvelles ou les équipes récentes. Distinguer la contingence (risques connus) de la réserve de management (risques inconnus). Ne jamais présenter une estimation "sans marge".

5. **Identifier les risques** : Lister explicitement : dépendances sur d'autres équipes ou systèmes externes, technologies jamais utilisées par l'équipe, intégrations avec des systèmes legacy, turnover potentiel, flou dans les spécifications. Quantifier chaque risque (probabilité × impact) et intégrer le risque élevé directement dans l'estimation.

6. **Construire la timeline et les milestones** : Identifier le chemin critique (les tâches qui déterminent la durée totale). Paralléliser les tâches indépendantes. Définir des milestones clairs et mesurables (ex: "MVP déployé en staging avec les 3 features core"). Intégrer les congés, les sprints de stabilisation et les périodes de freeze (fin d'année, lancements). Prévoir des deadlines réalistes, pas optimistes.

7. **Communiquer l'estimation avec honnêteté** : Toujours présenter une fourchette (min/réaliste/max) jamais un chiffre unique. Indiquer le niveau de confiance ("80% de chances de livrer dans cette fourchette"). Documenter et partager explicitement les hypothèses faites. Présenter les trade-offs : "Si on réduit le scope de 20%, on peut livrer 6 semaines plus tôt". Former le management à interpréter les fourchettes correctement.

8. **Suivre et recalibrer en continu** : Mesurer la velocity réelle de l'équipe sprint après sprint. Utiliser les burndown charts pour détecter les dérives tôt. Re-estimer formellement à chaque fin de sprint ou à chaque changement de scope majeur. Organiser des rétrospectives d'estimation pour améliorer la précision de l'équipe. Documenter les écarts et les causes dans un log d'apprentissage.

## Règles

- **Toujours une fourchette, jamais un point** : Donner une estimation unique donne une fausse précision. La fourchette min/réaliste/max est honnête et aide à la prise de décision éclairée.
- **Décomposer avant d'estimer** : Estimer une tâche floue ou trop grande est une source d'erreur majeure. Si ça ne peut pas être découpé, l'incertitude doit être explicitement augmentée.
- **Documenter les hypothèses** : Chaque estimation repose sur des hypothèses (scope stable, équipe complète, specs claires). Les rendre explicites protège l'équipe en cas de changement.
- **Recalibrer régulièrement** : Une estimation faite en début de projet est une prédiction, pas un engagement. La recalibration continue est une pratique saine, pas un aveu d'échec.
- **Intégrer les coûts non-fonctionnels** : Tests, revue de code, documentation, déploiement et réunions représentent souvent 30-40% du temps total. Les ignorer conduit systématiquement à des dépassements.


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
