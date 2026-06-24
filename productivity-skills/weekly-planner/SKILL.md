---
name: weekly-planner
description: Organise une semaine avec priorités, blocs de temps et objectifs. À utiliser quand l'utilisateur veut planifier sa semaine ou organiser ses tâches. Se déclenche aussi avec "planifier ma semaine", "organiser ma semaine", "to-do list", "planning hebdomadaire", "quoi faire cette semaine".
---

# Weekly Planner

## Workflow en 6 étapes

### 1. Collecte des inputs
Pose ces questions avant tout planning (une seule fois, groupées) :

- Quelles sont les contraintes fixes ? (réunions, rdv, horaires de travail)
- Quel est le contexte ? (`travail salarié` / `freelance` / `études` / `mixte`)
- Y a-t-il une deadline critique cette semaine ?
- Niveau d'énergie/charge estimé : `normal` / `chargé` / `léger` ?

Si l'utilisateur liste des tâches directement, infère le contexte sans redemander.

### 2. Priorisation — Matrice Eisenhower
Classe chaque tâche dans une des 4 cases :

| | Urgent | Pas urgent |
|---|---|---|
| **Important** | ① Faire maintenant | ② Planifier (deep work) |
| **Pas important** | ③ Déléguer ou réduire | ④ Éliminer |

**Critères de décision :**
- Une deadline < 48 h = urgent
- Impact direct sur un livrable ou une relation clé = important
- En doute → demander "qu'est-ce qui arrive si cette tâche attend 1 semaine ?"

### 3. Estimation du temps
Ajoute un coefficient de réalisme × 1.3 sur les estimations spontanées.

Exemples types :
- Email complexe → 30 min (pas 10)
- Réunion de suivi → réserve 15 min de débrief après
- "Finir le rapport" non découpé → découpe en sous-tâches avant de placer

### 4. Time blocking — Règles d'or
- **Deep work** (quadrant ②) → matin, créneaux de ≥ 90 min sans interruption
- **Tâches réactives** (email, Slack, révisions) → fin de matinée ou après-midi
- **Maximum 6 h de travail focalisé** par jour productive ; 4 h les jours chargés en réunions
- **Buffer obligatoire** : 20 % du temps libre = non planifié (= marge pour imprévus)

### 5. Tableau hebdomadaire
Génère un tableau Markdown :

```markdown
| Créneau        | Lundi | Mardi | Mercredi | Jeudi | Vendredi | Sam/Dim |
|----------------|-------|-------|----------|-------|----------|---------|
| Matin (9-12)   |       |       |          |       |          |         |
| Après-midi     |       |       |          |       |          |         |
| Soir (option.) |       |       |          |       |          |         |
```

- Marque les blocs fixes en **gras**
- Marque les blocs deep work avec 🔵 ou `[FOCUS]`
- Marque les tâches reportées avec ~~strikethrough~~

### 6. Top 3 + backlog
Termine toujours par :

```
## Top 3 de la semaine
1. [Tâche la plus impactante]
2. [Tâche à deadline]
3. [Tâche d'investissement long terme]

## Backlog — à reporter ou déléguer
- [tâche X] → reporter à [date suggestion]
- [tâche Y] → peut être délégué à [qui/quoi]
```

---

## Anti-patterns à éviter

| Piège | Conséquence | Correctif |
|---|---|---|
| Planifier 8 h de travail focalisé/jour | Burnout, plan abandonné dès mardi | Max 5-6 h planifiées |
| Tâches sans durée estimée | Blocs impossibles à placer | Toujours estimer, même grossièrement |
| Lundi surchargé "pour démarrer fort" | Epuisement précoce, effet domino | Répartir uniformément ou pic mercredi |
| Mélanger réactif et deep work dans le même bloc | Focus brisé | Séparer les créneaux types |
| Aucune marge pour les imprévus | Plan obsolète dès le 1er imprévu | Règle du 20 % non planifié |
| Replanifier les tâches non faites sans révision | Accumulation de dette de planning | Identifier pourquoi la tâche a glissé |

---

## Adaptations par contexte

**Freelance / indépendant**
- Inclure du temps de prospection (quadrant ②, souvent négligé)
- Bloquer un créneau administratif hebdomadaire (facturation, suivi clients)

**Études**
- Alternance révision active (flashcards, exercices) et lecture passive
- Placer les matières difficiles en pic d'énergie cognitive (typiquement 9-11 h)

**Travail salarié avec réunions fréquentes**
- Identifier les jours "réunion lourde" → n'y placer que des tâches légères autour
- Regrouper les réunions sur 2 jours pour préserver 2-3 jours de deep work

**Semaine chargée / crise**
- Réduire le Top 3 à un Top 1 obligatoire
- Suspendre les tâches du quadrant ④ sans culpabilité

---

## Bonnes pratiques 2026

- **Revue du vendredi** : 15 min pour noter ce qui a glissé et pourquoi → ajuste la méthode, pas seulement le plan
- **Intention du lundi** : une phrase de mise en contexte avant le tableau ("Cette semaine, la priorité absolue est…")
- **Tâches énergivores vs légères** : alterne pour éviter la fatigue décisionnelle (ne pas enchaîner 3 deep work consécutifs)
- **Couplage calendrier** : si l'utilisateur mentionne un outil (Notion, Google Calendar, Obsidian), propose un format ou snippet compatible
