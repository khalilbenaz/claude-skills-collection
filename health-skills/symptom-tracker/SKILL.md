---
name: symptom-tracker
description: Suit les symptômes de santé dans le temps et identifie les déclencheurs possibles. À utiliser quand l'utilisateur décrit un problème, une évolution, une douleur, une diarrhée, une fatigue, un inconfort digestif ou des épisodes répétés. Se déclenche aussi avec "j'ai mal", "je me sens", "ça revient souvent", "journal de santé", "préparer mon rendez-vous médecin", ou toute description de gêne physique ou mentale récurrente. Also triggers on "track my symptoms", "symptom diary", "symptom patterns over time".
---

# Symptom Tracker

Ce skill aide l'utilisateur à consigner, organiser et analyser ses symptômes dans le temps afin de préparer au mieux une consultation médicale. Il ne pose aucun diagnostic et ne remplace jamais un avis médical.

---

## Étape 1 — Cadrage temporel

1. Extrais la date ou la période mentionnée (ex. "depuis lundi", "3 fois cette semaine", "depuis 2 mois").
2. Si aucun repère temporel n'est donné, pose la question directement :
   > "Depuis quand ressentez-vous ce symptôme ? Et est-ce la première fois, ou cela s'est déjà produit avant ?"
3. Note la chronologie : premier épisode → épisodes récurrents → évolution (amélioration, aggravation, stabilité).

---

## Étape 2 — Inventaire des symptômes

Chaque symptôme distinct = une entrée séparée. Ne regroupe pas des symptômes différents sous une même ligne.

Exemples de distinctions importantes :
- Douleur abdominale haute vs basse
- Fatigue constante vs fatigue post-effort
- Nausée sans vomissement vs nausée avec vomissement

Si l'utilisateur décrit plusieurs gênes d'un coup, liste-les et valide la liste avec lui avant de continuer.

---

## Étape 3 — Détail de chaque symptôme

Pour chaque entrée, collecte les dimensions suivantes (pose des questions ciblées si des éléments manquent) :

| Dimension | Question type |
|---|---|
| **Intensité** | "Sur 10, à combien évaluez-vous cette douleur/gêne ?" |
| **Fréquence** | "Combien de fois par jour/semaine cela arrive-t-il ?" |
| **Durée** | "Combien de temps dure chaque épisode ? Minutes ? Heures ?" |
| **Localisation** | "Où exactement ? Irradiation vers d'autres zones ?" |
| **Contexte** | "Dans quelle situation cela survient-il ? Nuit/jour, repos/effort ?" |
| **Facteurs aggravants** | "Qu'est-ce qui empire le symptôme ?" |
| **Facteurs soulageants** | "Qu'est-ce qui le calme (position, médicament, repas, etc.) ?" |
| **Signes associés** | "D'autres signes apparaissent-ils en même temps ?" |

Ne surcharge pas l'utilisateur : priorise les 3-4 dimensions les plus pertinentes selon le symptôme décrit.

---

## Étape 4 — Identification des déclencheurs

Repère dans le récit de l'utilisateur les déclencheurs potentiels et classe-les par catégorie :

- **Alimentation** : gras, épicé, lactose, gluten, alcool, café, jeûne prolongé
- **Médicaments** : nouveaux traitements, changement de dose, AINS, antibiotiques, contraceptifs
- **Psychologique** : stress aigu, anxiété chronique, charge mentale, émotions fortes
- **Sommeil** : manque, décalage horaire, insomnie, apnée suspectée
- **Physique** : effort intense, sédentarité prolongée, posture
- **Hormonal** : cycle menstruel, ménopause, thyroïde connue
- **Environnement** : allergènes, saison, température, pollution
- **Social** : isolement, conflits, changement de rythme de vie

Présente toujours les déclencheurs comme des **hypothèses à explorer**, jamais comme des causes certifiées.

---

## Étape 5 — Tableau récapitulatif

Génère un tableau clair et directement copiable :

```
| Date / Période | Symptôme          | Intensité (/10) | Durée   | Déclencheur possible | Facteur soulageant | Remarques        |
|----------------|-------------------|-----------------|---------|----------------------|--------------------|------------------|
| 20 juin        | Douleur abdominale| 6               | 2 h     | Repas copieux        | Position allongée  | Apparaît le soir |
| 22 juin        | Fatigue intense   | 7               | Journée | Mauvaise nuit        | —                  | 5h de sommeil    |
```

Adapte les colonnes si certaines dimensions sont non pertinentes pour le cas. La lisibilité prime.

---

## Étape 6 — Synthèse et préparation à la consultation

### Tendances observées
Résume en 2-4 phrases les patterns qui se dégagent : fréquence, déclencheurs récurrents, évolution dans le temps. Reste factuel et non alarmiste.

Exemple de formulation correcte :
> "Les épisodes semblent survenir principalement le soir et après des repas riches. La durée est stable (environ 2h) mais la fréquence a augmenté cette semaine. Cela peut valoir la peine d'en parler à votre médecin."

### Informations encore manquantes
Liste ce qui serait utile à noter avant la consultation :
- Antécédents personnels ou familiaux pertinents
- Traitements en cours (y compris compléments alimentaires)
- Résultats d'examens récents (bilan sanguin, imagerie…)
- Évolution du poids, de l'appétit, du sommeil

### 5 questions à poser au médecin
Propose 5 questions personnalisées et concrètes. Exemples de structure :

1. "Ces symptômes peuvent-ils être liés à [déclencheur hypothétique identifié] ?"
2. "Faut-il tenir un journal alimentaire/de sommeil avant le prochain rendez-vous ?"
3. "Quels examens complémentaires seraient pertinents ici ?"
4. "Ces épisodes peuvent-ils s'aggraver si rien n'est fait ?"
5. "Y a-t-il des signaux d'alarme qui devraient m'amener aux urgences ?"

---

## Garde-fous et anti-patterns

**Ne jamais faire :**
- Nommer une pathologie ou un diagnostic ("vous avez probablement un SII / une gastrite / une dépression…")
- Recommander un médicament, même courant, sans précaution
- Minimiser un symptôme signalé comme sévère ou soudain
- Surcharger l'utilisateur avec 10 questions d'affilée

**Signaux d'alarme à signaler explicitement** (sans dramatiser, mais clairement) :
- Douleur thoracique intense ou irradiant dans le bras/mâchoire
- Perte de conscience, convulsions
- Sang dans les selles, urines ou vomissements
- Fièvre élevée (> 39 °C) persistante
- Symptôme neurologique soudain (vision double, perte de force, trouble de la parole)

Dans ces cas, recommande de **consulter rapidement** ou d'appeler le 15 (SAMU) / 112 selon l'urgence perçue.

---

## Bonnes pratiques 2026

- **Fréquence de journalisation** : inviter l'utilisateur à noter les symptômes au moment où ils surviennent, pas de mémoire le lendemain (biais de rappel élevé).
- **Format export** : proposer un résumé en texte brut copiable dans l'application de santé de l'utilisateur (Apple Santé, Google Health, dossier patient partagé avec le médecin).
- **Continuité** : si l'utilisateur revient avec de nouveaux épisodes, consolider les entrées dans le même tableau plutôt que de repartir de zéro.
- **Confidentialité** : rappeler que les informations partagées restent dans la conversation ; éviter de demander des données d'identification (nom complet, numéro de sécurité sociale).

---

## Rappel obligatoire

Termine TOUJOURS la réponse par ce rappel :

> ⚠️ Ce suivi ne remplace pas un diagnostic médical. Il est conçu pour vous aider à organiser vos observations avant une consultation avec un professionnel de santé. En cas de symptômes graves, soudains ou persistants, consultez un médecin ou appelez le 15 (SAMU).
