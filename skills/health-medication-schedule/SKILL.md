---
name: health-medication-schedule
description: Organise les prises de médicaments et compléments dans une journée sans remplacer l'ordonnance. À utiliser quand l'utilisateur veut un planning horaire simple ou éviter les oublis. Se déclenche aussi avec "planning médicaments", "quand prendre mes cachets", "organiser mes prises", "rappel médicament", "emploi du temps traitement". Also triggers on "medication schedule", "when to take my pills", "organize my treatment".
---

# Medication Schedule

Aide l'utilisateur à structurer ses prises de médicaments dans la journée de façon claire et sûre, sans jamais se substituer à l'ordonnance ni au conseil du professionnel de santé.

---

## Étape 1 — Inventaire des médicaments

Demande à l'utilisateur de lister chaque médicament ou complément. Pour chacun, recueille :

| Info | Exemple |
|---|---|
| Nom (commercial ou DCI) | Levothyrox 75 µg |
| Posologie prescrite | 1 cp/j |
| Moment conseillé | À jeun le matin |
| Avec/sans nourriture | À jeun, 30 min avant le repas |
| Durée du traitement | Traitement chronique / 10 jours |
| Contraintes spéciales | Espacer de 4h des antiacides |

> Si l'utilisateur ne connaît pas certains détails, demande-lui de vérifier sa notice ou son ordonnance avant de continuer.

---

## Étape 2 — Identifier les contraintes critiques

Avant de construire le planning, repère les règles qui imposent un ordre ou un espacement :

**Contraintes fréquentes à vérifier :**
- **À jeun** : hormones thyroïdiennes (Levothyrox), certains antifongiques → au moins 30 min avant le premier repas.
- **Espacement obligatoire** : fer + calcium se bloquent mutuellement → espacer d'au moins 2h.
- **Avec repas** : AINS (ibuprofène, diclofénac), metformine, corticoïdes → protège la muqueuse gastrique.
- **Pas de pamplemousse** : statines, certains immunosuppresseurs.
- **Heure fixe critique** : contraceptifs oraux, antirétroviraux, anticoagulants → noter l'importance de la régularité.
- **Au coucher** : statines (efficacité nocturne), hypnotiques.

Si l'utilisateur mentionne plusieurs médicaments à espacement requis, signale explicitement l'ordre et les délais avant de construire le tableau.

---

## Étape 3 — Construction du planning

Génère un tableau horaire adapté au rythme de vie de l'utilisateur. Propose des heures indicatives ajustables.

**Exemple de planning généré :**

```
PLANNING JOURNALIER — [Nom utilisateur]
Valide à partir du : [date]

⏰ 07h00 — Au lever, à jeun
  • Levothyrox 75 µg — 1 comprimé
    → Attendre 30 min avant le petit-déjeuner

☕ 07h30 — Petit-déjeuner
  • Metformine 500 mg — 1 comprimé (avec le repas)
  • Vitamine D3 1000 UI — 1 capsule (avec corps gras)

🍽️ 12h30 — Déjeuner
  • Ibuprofène 400 mg — 1 comprimé (avec nourriture, si douleur)
  • Fer 80 mg — 1 comprimé
    → À prendre AU MOINS 2h après le calcium du matin

🌙 21h00 — Soir / Repas
  • Atorvastatine 20 mg — 1 comprimé (au dîner ou au coucher)

🛏️ 22h30 — Coucher
  • Mélatonine 1 mg (si besoin)
```

Sous le tableau, ajoute un récapitulatif des règles clés en bullets (au maximum 5 lignes).

---

## Étape 4 — Cas particuliers et adaptations

### Travail de nuit
Décale tous les créneaux en conservant les intervalles relatifs (ex. "à jeun = 30 min avant le premier repas", peu importe l'heure).

### Ramadan / jeûne intermittent
Regroupe les prises aux fenêtres alimentaires (Imsak / Iftar). Signaler que certains médicaments NE PEUVENT PAS être différés sans avis médical (antiépileptiques, anticoagulants, insuline).

### Voyage avec décalage horaire
Recommande une transition progressive (décaler de 1-2h/jour) et souligne que les règles strictes (contraceptifs, immunosuppresseurs) nécessitent une consigne médicale avant le départ.

### Enfants / personnes âgées
Adapter les libellés (dose en ml, fractionnement des prises). Rappeler que les posologies pédiatriques et gériatriques varient fortement — toujours confirmer avec le médecin ou le pharmacien.

---

## Étape 5 — Récapitulatif et export

Propose à l'utilisateur un résumé imprimable ou un format copier-coller simple :

```
RÉSUMÉ RAPIDE
Matin à jeun   : Levothyrox 75 µg
Petit-déjeuner : Metformine 500 mg + Vit D3
Déjeuner       : Fer 80 mg (2h après calcium)
Soir           : Atorvastatine 20 mg
Coucher        : Mélatonine 1 mg si besoin
```

---

## Garde-fous et anti-patterns

| ❌ À ne jamais faire | ✅ Bonne pratique |
|---|---|
| Inventer ou modifier une posologie | Reprendre exactement ce qui est prescrit |
| Ignorer les incompatibilités médicamenteuses | Signaler tout espacement nécessaire |
| Dire "ce médicament n'interagit pas" sans source | Recommander de vérifier avec le pharmacien |
| Supprimer une prise "pour simplifier" | Proposer une heure alternative, jamais supprimer |
| Ignorer les contre-indications alimentaires | Mentionner pamplemousse, alcool, lait si pertinent |
| Diagnostiquer un symptôme secondaire | Orienter vers un professionnel |

---

## Bonnes pratiques 2026

- **Applications de rappel** : Clock (iOS/Android), MedHelper, Medisafe — suggère-les pour les traitements complexes ou chroniques.
- **Pilulier semainier** : recommander pour les polythérapies (5 médicaments ou plus).
- **Fiche de liaison** : encourager l'utilisateur à remettre ce planning à son médecin ou pharmacien lors de la prochaine consultation pour validation.
- **Révision régulière** : tout changement de traitement (ajout, arrêt, dosage) nécessite de mettre à jour le planning.
- **Cohérence heure d'été/hiver** : pour les traitements à heure fixe stricte, rappeler l'ajustement lors du changement d'heure.

---

## Rappel obligatoire

> ⚠️ Ce planning est un outil d'organisation personnelle. Il ne remplace pas les instructions de votre médecin ou pharmacien. En cas de doute sur une posologie, une interaction ou un symptôme inhabituel, consultez un professionnel de santé qualifié.


## Communication Rules

- Clear and concise; skip filler, but never at the cost of warmth.
- Warm, respectful, non-judgmental tone — meet the person where they are.
- Lead with what matters to the user; avoid unnecessary preamble.
- Plain language; explain only what genuinely helps.
- This skill offers supportive guidance, not professional medical, psychological, or legal advice. Encourage consulting a qualified professional when the situation calls for it.
- No emoji unless the user uses them first.
