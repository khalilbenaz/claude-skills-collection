---
name: education-study-planner
description: Organise un planning de révision ou d'étude avec répétition espacée, priorisation et checkpoints de rétention. À utiliser quand l'utilisateur prépare un examen ou veut organiser ses études. Se déclenche aussi avec "planning de révision", "organiser mes études", "je passe un examen", "comment réviser", "programme d'étude". Also triggers on "study plan", "revision schedule", "spaced repetition planning".
---

# Study Planner

## Workflow en 7 étapes

### 1. Collecte du contexte (obligatoire avant tout)

Demander (ou déduire du message) :

| Information | Exemple |
|---|---|
| Sujet / examen | "Cloud AWS Practitioner", "maths S1" |
| Date limite | "dans 3 semaines", "15 juillet" |
| Temps dispo/jour | "2 h le soir, 5 h le week-end" |
| Niveau actuel | "débutant", "déjà vu en cours", "besoin de réviser" |
| Ressources dispo | syllabus, livres, cours Udemy, docs officielles |

Sans la date et le temps disponible, aucun planning ne peut être construit. Bloquer là si manquant.

### 2. Inventaire des chapitres / sujets

Lister exhaustivement les thèmes à couvrir. Si l'utilisateur n'a pas de liste, proposer un squelette basé sur le syllabus standard du domaine.

Exemple pour AWS Cloud Practitioner :
```
1. Concepts cloud (15 %)
2. Sécurité & conformité (25 %)
3. Services clés AWS (33 %)
4. Facturation & pricing (17 %)
5. Support & SLA (10 %)
```

### 3. Priorisation — matrice 3 critères

Évaluer chaque chapitre sur 1-3 :

```
Score = Difficulté × Importance × (3 - Familiarité)
```

- **Difficulté** : 1 = facile, 3 = complexe
- **Importance** : 1 = optionnel, 3 = incontournable (pondération exam)
- **Familiarité** : 1 = déjà maîtrisé, 3 = inconnu

Trier par score décroissant → ceux-là passent en premier dans le planning.

### 4. Construction du planning avec répétition espacée

Intervalles de révision à respecter (courbe d'Ebbinghaus) :

```
J0  : apprentissage initial (lecture + prise de notes)
J1  : première révision (résumé / flashcards)
J3  : deuxième révision (quiz)
J7  : troisième révision (exercices pratiques)
J14 : consolidation (test complet)
```

**Format tableau semaine par semaine** — toujours générer ce tableau :

```
| Semaine | Lundi | Mardi | Mercredi | Jeudi | Vendredi | Week-end |
|---------|-------|-------|----------|-------|----------|----------|
| S1      | Ch1 J0 | Ch1 J1 | Ch2 J0 | Ch2 J1 + Ch1 J3 | Repos | Ch3 J0 + Ch1 J7 |
```

Contraintes de génération :
- Max 3 nouveaux chapitres par semaine
- Alterner apprentissage neuf et révisions
- Conserver au moins 1 jour de repos complet par semaine

### 5. Structure des sessions de travail

Blocs recommandés selon durée disponible :

```
≤ 1 h/jour  → 1 bloc de 50 min (pas de Pomodoro, trop fragmenté)
1-3 h/jour  → blocs 25 min + pause 5 min, long break après 4 blocs (Pomodoro)
> 3 h/jour  → blocs 45 min + pause 15 min (deep work)
```

Ordre des matières dans une session :
1. Matière difficile (énergie haute)
2. Révision d'une session précédente
3. Matière légère ou exercices pratiques

### 6. Checkpoints de rétention

Prévoir systématiquement :
- **Quiz quotidien** (5-10 min) : 5 questions sur la session du jour — Anki, Quizlet, ou questions générées ici
- **Test hebdomadaire** : examen blanc ou QCM sur la semaine (30-60 min)
- **Test global J-7** avant l'examen : conditions réelles, chrono

Si le score au quiz < 60 % → reprogrammer le chapitre J+1 au lieu de J+3.

### 7. Livrable final

Toujours terminer avec :
1. Tableau planning semaine par semaine (markdown)
2. Liste des ressources recommandées pour chaque chapitre
3. Rappel des dates clés (révisions, tests blancs, examen)

---

## Garde-fous et anti-patterns

| Anti-pattern | Problème | Alternative |
|---|---|---|
| Relire passivement ses notes | Illusion de maîtrise, rétention faible | Active recall : fermer le livre, écrire de mémoire |
| Tout réviser la veille | Surcharge, stress, oubli immédiat | Étaler sur minimum 2 semaines |
| Sauter les jours de repos | Fatigue cognitive, contre-productif après J4 | Imposer 1 jour off/semaine |
| Commencer par ce qu'on sait déjà | Fausse confiance, gaps cachés | Priorité aux chapitres score élevé |
| Planning trop dense | Abandon après 3 jours | Réserver 20 % du temps comme buffer |
| Changer de méthode chaque semaine | Perte de repères, pas de mesure | Choisir une méthode, tenir 2 semaines avant d'ajuster |

---

## Bonnes pratiques 2026

- **Anki + IA** : générer les flashcards Anki depuis le résumé de chaque chapitre — taux de rétention supérieur à toute autre méthode pour les connaissances factuelles.
- **Calendrier externe** : exporter le planning en bloc `.ics` ou le coller dans Google Calendar / Notion pour les rappels.
- **Révisions actives > passives** : Feynman Technique — expliquer le concept à voix haute comme si on l'enseignait.
- **Suivi de progrès** : tenir un journal simple (date, chapitre, score quiz) pour ajuster le planning si les scores stagnent.
- **Groupes de révision (optionnel)** : 1 session/semaine en groupe pour les questions difficiles ; le reste en solo pour le focus.


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
