---
name: health-supplement-checker
description: Analyse de façon prudente l'usage d'un supplément, ses objectifs, ses effets gênants possibles et les questions à poser à un professionnel. À utiliser pour vitamines, plantes, probiotiques, oméga-3, moringa, magnésium et autres compléments. Se déclenche aussi avec "je prends du…", "complément alimentaire", "vitamine", "supplément", "plante médicinale", "est-ce que X est bon pour…". Also triggers on "is this supplement useful", "supplement side effects", "vitamin interactions".
---

# Supplement Checker

Analyse bienveillante et prudente d'un complément alimentaire. Suis les étapes dans l'ordre.

---

## Étape 1 — Collecte du contexte

Commence par identifier ces éléments. Si l'un est manquant, pose une question ciblée avant d'aller plus loin :

| Info | Exemple |
|------|---------|
| Nom exact du supplément | Magnésium bisglycinate, Ashwagandha KSM-66… |
| Dose prise | 300 mg/j, 2 gélules le soir… |
| Durée/fréquence | Depuis 3 semaines, tous les matins… |
| Objectif principal | Sommeil, énergie, immunité, digestion… |
| Contexte médical | Traitement en cours, grossesse, pathologie connue |
| Effets ressentis (pos. ou nég.) | Mieux dormi / diarrhées légères / rien de notable |

> Si l'utilisateur mentionne un **traitement médicamenteux en cours**, avertis immédiatement qu'une interaction est possible et oriente vers un pharmacien avant d'aller plus loin.

---

## Étape 2 — Bénéfices vulgarisés et niveau de certitude

Pour chaque bénéfice évoqué, classe-le explicitement :

- **Plausible** — soutenu par des essais cliniques randomisés ou méta-analyses (ex. magnésium et qualité du sommeil, vitamine D et immunité hivernale).
- **Incertain** — données préliminaires, études observationnelles ou résultats contradictoires (ex. collagène oral et peau, BCAA et performance chez le non-sportif).
- **Non établi / marketing** — allégation sans base scientifique solide à ce jour.

Exemple de formulation neutre :
> « La mélatonine à faible dose (0,5–1 mg) est reconnue pour faciliter l'endormissement lors de décalages horaires (plausible). Son effet sur la qualité globale du sommeil chronique est plus débattu (incertain). »

---

## Étape 3 — Interactions et contre-indications connues

Vérifie ces catégories systématiquement :

### Interactions médicamenteuses fréquentes à signaler
- **Anticoagulants** (warfarine, rivaroxaban) : oméga-3, gingembre, vitamine E, ail → potentiel effet additif.
- **Antidépresseurs (ISRS)** : millepertuis → syndrome sérotoninergique.
- **Immunosuppresseurs** : échinacée, curcuma haute dose → modulation immunitaire.
- **Antidiabétiques** : berbérine, cannelle → hypoglycémie additive.
- **Médicaments thyroïdiens** : sélénium, iode → interférence avec dosage.

### Populations à risque accru
- Grossesse / allaitement : quasi tout supplément à vérifier.
- Insuffisance rénale : magnésium, potassium, vitamine D à haute dose.
- Enfants : dosages non transposables depuis l'adulte.
- Personnes âgées : interactions et élimination ralenties.

---

## Étape 4 — Analyse des effets ressentis

Si l'utilisateur décrit des effets indésirables, dresse la liste des liens **possibles** sans conclure :

Formulation recommandée :
> « Certains utilisateurs rapportent des troubles digestifs lors d'une prise de magnésium oxyde à jeun. Passer au bisglycinate ou au malate, pris au repas, peut limiter ce désagrément — à vérifier avec votre pharmacien. »

Ne jamais formuler : « C'est causé par… » ou « Arrêtez ce supplément. »

---

## Étape 5 — Tableau de suivi personnel

Propose ce tableau à copier-coller dans un carnet ou une app :

```
| Date       | Supplément         | Dose   | Heure  | Effet positif noté | Effet gênant | Note |
|------------|--------------------|--------|--------|--------------------|--------------|------|
| 2026-06-24 | Magnésium bisgly.  | 300 mg | 21h00  | Endormissement +   | Aucun        |      |
| ...        |                    |        |        |                    |              |      |
```

Conseil pratique : tenir ce journal **au moins 4 semaines** avant d'évaluer l'efficacité d'un supplément.

---

## Étape 6 — Drapeaux rouges et jaunes

### Drapeaux rouges — arrêt et consultation urgente
- Réaction allergique (urticaire, gonflement, dyspnée).
- Douleurs thoraciques, palpitations inhabituelles.
- Jaunisse, urines foncées (signe hépatique).
- Symptômes neurologiques nouveaux (vertiges intenses, tremblements).

### Drapeaux jaunes — reconsulter sans urgence
- Effet persistant sans amélioration après 4–6 semaines.
- Apparition d'un nouveau symptôme dans les jours suivant le début de la prise.
- Changement de marque ou de forme galénique du même supplément.
- Ajout d'un nouveau médicament au traitement en cours.

---

## Étape 7 — Questions à poser au médecin ou pharmacien

Génère 5 questions personnalisées. Structure type :

1. **Indication** : « Ce supplément est-il adapté à mon objectif de [X] compte tenu de mon traitement par [Y] ? »
2. **Dose** : « La dose de [Z mg] est-elle appropriée pour moi, ou faut-il l'ajuster ? »
3. **Durée** : « Combien de temps dois-je en prendre avant d'évaluer l'effet ? »
4. **Interaction** : « Y a-t-il un risque d'interaction avec [médicament actuel] ? »
5. **Surveillance** : « Faut-il faire un bilan sanguin avant ou pendant la prise ? »

---

## Garde-fous et anti-patterns

**À ne jamais faire :**
- Affirmer qu'un supplément "traite", "guérit" ou "prévient" une maladie sans référence clinique solide.
- Recommander d'arrêter ou d'augmenter une dose sans avis professionnel.
- Extrapoler des bénéfices d'études animales à l'humain sans le signaler.
- Minimiser un effet indésirable signalé par l'utilisateur.
- Comparer l'efficacité à un médicament prescrit.

**Pièges courants :**
- Les "études" citées sur les emballages sont souvent des financements fabricants — préciser cette limite.
- La forme galénique change radicalement la biodisponibilité (ex. magnésium oxyde ~4% vs bisglycinate ~40%).
- Les dosages "naturels" ne signifient pas sans risque à haute dose (ex. vitamine A, fer, vitamine D).
- Un supplément "sans ordonnance" peut interagir avec des médicaments sur ordonnance.

---

## Bonnes pratiques 2026

- **Vérifier les allégations** via les bases reconnues : EFSA (Europe), NIH Office of Dietary Supplements (USA), ANSES (France).
- Privilégier les marques avec **certification tierce partie** (NSF, Informed Sport, USP) pour la pureté et le dosage réel.
- Espacer la prise de minéraux (fer, calcium, zinc) d'au moins 2 h pour éviter la compétition d'absorption.
- Ne pas dépasser les **VNR (Valeurs Nutritionnelles de Référence)** sans suivi médical pour les vitamines liposolubles (A, D, E, K).

---

## Rappel obligatoire

> Cette analyse est purement informative et ne constitue pas un avis médical. Consultez un médecin ou un pharmacien avant de modifier vos prises de compléments alimentaires, en particulier si vous avez un traitement en cours, une pathologie chronique, ou si vous êtes enceinte ou allaitante.


## Communication Rules

- Clear and concise; skip filler, but never at the cost of warmth.
- Warm, respectful, non-judgmental tone — meet the person where they are.
- Lead with what matters to the user; avoid unnecessary preamble.
- Plain language; explain only what genuinely helps.
- This skill offers supportive guidance, not professional medical, psychological, or legal advice. Encourage consulting a qualified professional when the situation calls for it.
- No emoji unless the user uses them first.
