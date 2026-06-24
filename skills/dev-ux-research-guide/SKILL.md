---
name: dev-ux-research-guide
description: Guide de recherche UX : interviews, tests utilisateurs, personas et analyse. Se déclenche avec "UX research", "recherche utilisateur", "interview utilisateur", "test utilisateur", "persona", "user testing", "usability", "parcours utilisateur".
---

# UX Research Guide

## 1. Définir l'objectif de recherche

Avant toute chose, formuler une **research question** précise et testable :

```
❌ "Améliorer l'expérience de checkout"
✅ "Pourquoi les utilisateurs abandonnent-ils leur panier à l'étape paiement ?"
```

Critères de décision — utiliser un framework **SMART** :
- Spécifique : une seule question par étude
- Mesurable : succès/échec quantifiable
- Atteignable : réaliste avec les ressources disponibles
- Relevant : directement liée à une décision produit
- Temporel : résultat attendu dans quel délai

## 2. Choisir la méthode adaptée

| Objectif | Méthode recommandée | Participants | Durée |
|---|---|---|---|
| Comprendre motivations/contexte | Entretiens semi-directifs | 5–8 | 45–60 min |
| Valider une interface | Usability test modéré | 5–8 | 30–60 min |
| Tester à grande échelle | Test non-modéré (Maze, Lookback) | 20–50 | 10–20 min |
| Valider une arborescence | Tree testing (Treejack) | 50+ | 10 min |
| Organiser le contenu | Card sorting (ouvert/fermé) | 15–30 | 20–30 min |
| Mesurer un changement | A/B test | 1000+/variante | selon trafic |
| Détecter des signaux faibles | Analytics + heatmaps (Hotjar) | — | continu |

**Règle des 5 participants** : pour les tests de facilité d'usage, 5 utilisateurs détectent ~85 % des problèmes. Augmenter l'échantillon si plusieurs segments cibles distincts.

## 3. Recruter les participants

Screener minimaliste (exemple pour une app fintech mobile) :

```
1. Avez-vous effectué un virement bancaire en ligne au cours des 3 derniers mois ? [oui/non]
2. Quel appareil utilisez-vous principalement ? [iOS / Android / Desktop]
3. Tranche d'âge ? [18-24 / 25-34 / 35-49 / 50+]
4. Avez-vous déjà utilisé [Produit X] ? [jamais / 1-5 fois / régulièrement]
```

- Recruter **20 % de plus** que nécessaire (no-shows, disqualifications tardives)
- Incentive : 15–30 € pour 30 min, 40–60 € pour 1h (B2C) ; cartes cadeaux ou rapport personnalisé (B2B)
- Canaux : UserTesting, Respondent.io, réseau LinkedIn, panel interne clients

## 4. Construire le protocole

### Guide d'entretien semi-directif

```markdown
## Introduction (5 min)
- "Je ne teste pas vos compétences, je teste le produit."
- Rappel : enregistrement audio, consentement, droit de stopper.

## Questions contextuelles (15 min)
- "Racontez-moi la dernière fois que vous avez fait [action clé]."
- "Qu'est-ce qui vous a amené à utiliser [solution actuelle] ?"
- "Quels problèmes rencontrez-vous avec votre solution actuelle ?"

## Questions exploratoires (20 min)
- "Montrez-moi comment vous faites habituellement [tâche]."
- "Qu'est-ce qui vous faciliterait la vie ici ?"

## Clôture (5 min)
- "Y a-t-il quelque chose que je n'ai pas abordé et qui vous semble important ?"
```

### Scénario de test d'utilisabilité

```
Contexte : "Vous venez de recevoir une facture de 250 € à régler."
Tâche : "Effectuez un paiement depuis votre compte principal."
Critère de succès : tâche réussie sans aide en < 3 min, ≤ 2 erreurs.
```

## 5. Conduire la session

Techniques de modération :
- **Thinking aloud** : "Dites ce que vous voyez / pensez à voix haute."
- **Relance neutre** : "Pouvez-vous m'en dire plus ?" / "Qu'est-ce que vous attendiez ?"
- **Silence volontaire** : attendre 5–7 secondes avant de relancer — les utilisateurs comblent eux-mêmes.
- **5 whys** : creuser les causes profondes, pas les symptômes.

Prise de notes structurée (template) :
```
Timestamp | Observation factuelle | Citation exacte | Émotion observée | Hypothèse
00:04:32  | Hésite sur le bouton  | "C'est où le paiement ?" | Frustration | Label ambigu
```

## 6. Analyser les données

### Affinity mapping (Miro/FigJam)

```
1. Une observation = un post-it
2. Regrouper par similarité (bottom-up)
3. Nommer les clusters (≠ les titres prédéfinis)
4. Compter les occurrences : n=X/Y participants (ex : n=6/8)
5. Prioriser par fréquence × sévérité
```

### Sévérité des problèmes (échelle Nielsen)

| Score | Signification | Priorité |
|---|---|---|
| 0 | Pas un problème | Ignorer |
| 1 | Cosmétique | Backlog |
| 2 | Mineur, contournable | Sprint futur |
| 3 | Majeur, ralentit | Sprint suivant |
| 4 | Bloquant, empêche la tâche | Urgent |

## 7. Créer les livrables

### Persona (basé sur données, pas sur intuitions)

```markdown
## Alex, 32 ans — Responsable comptable PME
**Citation réelle** : "Je perds 2h par semaine à réconcilier manuellement."
**Comportements** : vérifie ses comptes le matin sur mobile, Excel pour les exports
**Frustrations** : formats d'export incompatibles, pas de notifications en temps réel
**Objectifs** : clôture mensuelle rapide, zéro erreur de saisie
**Source** : composé de 6 participants sur 8 interrogés
```

### Journey map — colonnes minimales

```
Étape | Actions | Pensées | Émotions | Pain points | Opportunités
```

### Insight deck — structure par insight

```
Insight #3 : Les utilisateurs ne comprennent pas la distinction compte courant / compte épargne
Preuve : 5/8 participants ont cliqué sur le mauvais compte (tâche T2)
Impact : erreurs de virement, frustration (sévérité 3)
Recommandation : ajouter un libellé secondaire + solde visible dès la liste
Effort estimé : M (1 sprint)
```

## 8. Communiquer les résultats

Structure de présentation stakeholders :

```
1. Rappel objectif (1 slide)
2. Méthode + participants (1 slide)
3. Top 3 insights avec preuves (3 slides)
4. Recommandations priorisées (matrice impact/effort)
5. Prochaines étapes + responsables + dates
```

---

## Anti-patterns et pièges

| Piège | Symptôme | Correction |
|---|---|---|
| Biais de confirmation | On retient les observations qui valident la solution prévue | Coder en aveugle, faire coder par 2 personnes |
| Questions suggestives | "N'est-ce pas que ce bouton est confus ?" | Reformuler en neutre : "Que pensez-vous de ce bouton ?" |
| Sur-représentation de la UX | Designer dans la session = participants performent mieux | Modérateur ≠ designer du produit testé |
| Personas fictifs | Personas créés sans données ("Marie, 35 ans, aime la simplicité") | Chaque attribut doit être tracé à une source |
| Insights sans décision | Rapport lu puis ignoré | Chaque insight = 1 décision produit associée dans le backlog |
| Trop de participants qualitatif | 20 entretiens pour une question simple | S'arrêter à saturation (généralement 6–8) |
| Tester trop tôt | Test sur wireframes non finalisés = feedback sur l'esthétique | Tester le flow, masquer les éléments décoratifs |

## Bonnes pratiques 2026

- **Recherche continue** : sessions hebdomadaires courtes (20 min, non-modérées) en parallèle du développement plutôt que de grosses études ponctuelles.
- **Repository centralisé** : stocker tous les insights dans un outil dédié (Dovetail, Notion, Condens) pour réutilisabilité cross-équipe.
- **Triangulation** : croiser au minimum 2 sources (entretiens + analytics, ou tests + survey) avant de conclure.
- **Accessibilité dans les tests** : inclure systématiquement des participants avec handicaps (moteur, visuel, cognitif) pour détecter les barrières tôt.
- **Ethics by default** : anonymiser les données dès la collecte, consentement explicite, RGPD — ne stocker que ce qui est nécessaire.


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
