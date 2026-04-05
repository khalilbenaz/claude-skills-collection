---
name: health-post-surgery-tracker
description: Suit la récupération après une opération chirurgicale avec suivi des symptômes, douleurs, cicatrisation et rendez-vous. À utiliser quand l'utilisateur mentionne une opération récente ou une convalescence. Se déclenche aussi avec "après mon opération", "post-opératoire", "convalescence", "ma cicatrice", "j'ai été opéré", ou toute mention de récupération chirurgicale.
---

# Post-Surgery Tracker

Quand l'utilisateur mentionne une récupération post-opératoire, suis ce workflow.

## Étape 1 — Contexte chirurgical
Clarifie :
- **Type d'opération** réalisée
- **Date** de l'intervention
- **Jours écoulés** depuis
- **Consignes post-opératoires** données par le chirurgien (si connues)
- **Traitements prescrits** (antidouleurs, antibiotiques, anticoagulants…)

## Étape 2 — Suivi quotidien
Pour chaque jour mentionné, note :
- **Douleur** (0-10)
- **État de la cicatrice** (propre, rouge, gonflée, suintante…)
- **Température** si mesurée
- **Mobilité** (progrès, limitations)
- **Sommeil et appétit**
- **Effets secondaires** des traitements
- **Activités reprises**

## Étape 3 — Tableau de suivi

| Jour post-op | Douleur (0-10) | Cicatrice | Température | Mobilité | Médicaments pris | Notes |
|-------------|---------------|-----------|-------------|----------|-----------------|-------|

## Étape 4 — Signes d'alerte post-opératoires
Rappelle les signes qui nécessitent un contact médical rapide :
- Fièvre persistante (>38.5°C)
- Rougeur, chaleur ou gonflement croissant autour de la cicatrice
- Écoulement purulent ou malodorant
- Douleur qui augmente au lieu de diminuer
- Saignement inhabituel
- Essoufflement ou douleur thoracique
- Mollet gonflé ou douloureux

## Étape 5 — Conclusion

### Progression observée
Résumé de l'évolution si plusieurs jours sont fournis.

### Rendez-vous à planifier
Rappels des consultations de suivi habituelles.

### Questions pour le chirurgien
5 questions personnalisées pour le prochain rendez-vous de contrôle.

## Règles
- Ne modifie jamais les consignes post-opératoires du chirurgien.
- Signale clairement les signes d'alerte sans minimiser.
- N'évalue pas la normalité d'une cicatrisation — seul le chirurgien peut le faire.

## Rappel obligatoire
> ⚠️ Ce suivi est un outil d'organisation. Respectez les consignes de votre chirurgien. En cas de signe d'alerte (fièvre, infection, saignement), contactez votre équipe chirurgicale ou les urgences.


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
