---
name: blood-pressure-log
description: Suit la tension artérielle et/ou la glycémie dans le temps avec tableaux et tendances. À utiliser quand l'utilisateur note des mesures de tension ou de glycémie et veut les organiser. Se déclenche aussi avec "ma tension", "ma glycémie", "tensio", "12/8", "j'ai pris ma tension", "taux de sucre", ou toute mention de mesures de constantes vitales régulières. Also triggers on "blood pressure log", "track blood sugar", "BP readings over time".
---

# Blood Pressure & Vitals Log

Outil de suivi structuré pour tension artérielle, glycémie et constantes vitales. Objectif : organiser les données, repérer des tendances, faciliter l'échange avec le médecin. Aucun diagnostic ne sera posé.

---

## Étape 1 — Qualification de la mesure

Avant d'enregistrer, clarifier :

| Question | Raison |
|----------|--------|
| Type de constante ? (tension / glycémie / pouls / SpO2) | Détermine le tableau à utiliser |
| Appareil ? (bras / poignet / glucomètre / oxymètre) | Les appareils poignet sont moins fiables |
| Moment ? (matin à jeun / post-repas / coucher) | Conditionne l'interprétation |
| Position pour la tension ? (assis, dos calé, bras au niveau du cœur) | Protocole OMS recommandé |
| Contexte particulier ? (stress, sport, sel, alcool, médicament oublié) | Facteurs confondants |

Si l'utilisateur donne juste un chiffre (ex. "13/8"), demander le moment et la date avant de remplir le tableau.

---

## Étape 2 — Saisie dans le tableau de suivi

### Tension artérielle (mmHg)

```
| Date       | Heure | Sys | Dia | Pouls | Position | Contexte              | Notes |
|------------|-------|-----|-----|-------|----------|-----------------------|-------|
| 2026-06-24 | 07h30 | 132 |  84 |  68   | assis    | matin, avant café     |       |
| 2026-06-24 | 19h45 | 128 |  80 |  72   | assis    | après dîner, repos    |       |
```

**Raccourcis de saisie acceptés :**
- `"13/8 ce matin"` → Sys=130, Dia=80, heure=matin
- `"12/7 poignet"` → noter l'appareil poignet (valeur indicative uniquement)
- `"TAS 145"` → systolique seule (noter que la diastolique manque)

### Glycémie

```
| Date       | Heure | Valeur  | Unité  | Moment              | Notes              |
|------------|-------|---------|--------|---------------------|--------------------|
| 2026-06-24 | 07h15 | 1.05    | g/L    | à jeun              |                    |
| 2026-06-24 | 12h45 | 1.65    | g/L    | 2h post-déjeuner    | repas copieux      |
```

**Conversion rapide :** `mmol/L × 0.18 = g/L` (ex. 5.5 mmol/L ≈ 0.99 g/L)

### Autres constantes (optionnel)

```
| Date       | Heure | SpO2 (%) | Pouls | Température (°C) | Notes |
|------------|-------|----------|-------|-----------------|-------|
```

---

## Étape 3 — Analyse des tendances (si ≥ 3 mesures)

Calculs à effectuer automatiquement :

1. **Moyenne générale** — systolique, diastolique, glycémie sur la période
2. **Moyenne matin vs soir** — repérer le profil diurne
3. **Valeur max et min** — avec date et contexte associé
4. **Variabilité** — écart entre les mesures (forte variabilité = signal à noter)
5. **Tendance sur la semaine** — hausse, baisse ou stable

Exemple de résumé produit :

```
Période : 10 au 24 juin 2026 (18 mesures)
Tension moyenne : 131/83 mmHg  |  Pouls moyen : 70 bpm
Matin : 134/85  |  Soir : 128/81
Pic observé : 148/92 le 18/06 (après réunion stressante)
Tendance : légère hausse sur les 5 derniers jours
```

---

## Étape 4 — Repères de référence (sans interprétation individuelle)

### Tension artérielle — classification ESC/ESH 2023

| Catégorie | Systolique | Diastolique |
|-----------|-----------|-------------|
| Optimale | < 120 | < 80 |
| Normale | 120–129 | 80–84 |
| Normale haute | 130–139 | 85–89 |
| HTA grade 1 | 140–159 | 90–99 |
| HTA grade 2 | 160–179 | 100–109 |
| HTA grade 3 | ≥ 180 | ≥ 110 |

> Ces seuils sont des repères populationnels. Les objectifs individuels (surtout chez les personnes âgées, diabétiques, rénales) sont fixés par le médecin traitant.

### Glycémie — repères généraux

| Moment | Valeur normale (g/L) | Signal d'alerte |
|--------|---------------------|-----------------|
| À jeun | 0.70 – 1.10 | > 1.26 (à confirmer) ou < 0.60 |
| 2h post-repas | < 1.40 | > 2.00 |
| HbA1c | < 5.7 % | > 6.5 % (seuil diagnostique) |

---

## Étape 5 — Alertes immédiates

Signaler clairement (sans alarmer) les valeurs suivantes et recommander un contact médical rapide :

**Tension :**
- Sys ≥ 180 ou Dia ≥ 110 → urgence hypertensive possible
- Sys < 90 ou Dia < 60 avec symptômes (vertiges, malaise) → hypotension symptomatique

**Glycémie :**
- < 0.60 g/L → hypoglycémie, resucrage immédiat recommandé
- > 3.00 g/L → hyperglycémie sévère

Formulation recommandée :
> "Cette valeur sort des fourchettes habituelles. Si elle se confirme ou si vous ressentez des symptômes (maux de tête, vision floue, vertiges, essoufflement), contactez votre médecin ou le 15."

---

## Étape 6 — Synthèse pour le médecin

Produire à la demande un résumé structuré prêt à l'impression ou au copier-coller :

```
=== Synthèse de suivi — à remettre au médecin ===
Période : [dates]
Nombre de mesures : [n]
Appareil : [modèle si connu]
Protocole : [matin à jeun / soir / autre]

TENSION
  Moyenne : [Sys]/[Dia] mmHg
  Matin : ... | Soir : ...
  Valeur max : ... le [date] ([contexte])
  Valeur min : ... le [date] ([contexte])

GLYCÉMIE
  Moyenne à jeun : ... g/L
  Moyenne post-prandiale : ... g/L

OBSERVATIONS
  - [tendance notable]
  - [facteur associé identifié]

QUESTIONS POUR LE MÉDECIN
  1. Mes cibles personnelles sont-elles atteintes ?
  2. Faut-il ajuster le moment des prises de mesure ?
  3. [question personnalisée selon les données]
```

---

## Bonnes pratiques de mesure (2026)

**Tension — protocole OMS :**
- Repos de 5 min avant la prise
- Assis, dos calé, bras nu à hauteur du cœur
- Éviter café, tabac, sport dans les 30 min précédentes
- Prendre 2 mesures à 1–2 min d'intervalle, noter la moyenne
- Toujours le même bras (le bras qui donne les valeurs les plus hautes)

**Glycémie :**
- Mains propres et sèches avant la pique
- Ne pas utiliser la première goutte (essuyer)
- Noter l'heure exacte par rapport au repas
- Stocker les bandelettes au sec, vérifier la date de péremption

---

## Garde-fous / pièges courants

- **Arrondi trompeur** : "12/8" peut signifier 120/80 ou 125/85 selon l'utilisateur — toujours clarifier les chiffres exacts.
- **Appareil poignet** : valeurs souvent 5–10 mmHg plus élevées ; noter systématiquement l'appareil utilisé.
- **Effet blouse blanche** : mesures chez le médecin souvent 10–15 mmHg plus hautes — le suivi à domicile est complémentaire, pas contradictoire.
- **Fausse glycémie basse** : mains non lavées (trace de sucre) → valeur artificielle.
- **Unités mélangées** : ne jamais mélanger g/L et mmol/L dans le même tableau sans conversion explicite.
- **Interprétation unique** : une seule mesure élevée ne fait pas de diagnostic ; la tendance sur plusieurs jours compte.
- **Modification de traitement** : ne jamais suggérer d'ajustement de dose ou d'arrêt de médicament sur la base de ces mesures.

---

> **Rappel important :** Ce suivi est un outil d'observation personnelle. L'interprétation clinique de vos mesures et toute décision thérapeutique appartiennent exclusivement à votre médecin ou professionnel de santé.
