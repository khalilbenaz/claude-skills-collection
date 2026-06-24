---
name: medical-history-summary
description: Résume un historique médical long en version courte, chronologique et réutilisable. À utiliser quand l'utilisateur fournit beaucoup d'informations de santé dispersées. Se déclenche aussi avec "résume mon historique", "récapitulatif médical", "fiche santé", "tout ce que j'ai eu", ou quand l'utilisateur donne des informations médicales éparpillées sur plusieurs messages.
---

# Medical History Summary

Ce skill transforme un historique médical dispersé (messages successifs, liste orale, notes désordonnées) en un document structuré, fiable et réutilisable. Il ne pose aucun diagnostic et ne remplace pas un dossier médical officiel.

---

## Étape 1 — Collecte et clarification

Avant de résumer, détermine si tu disposes de suffisamment d'informations.

**Questions de cadrage à poser si l'historique est incomplet :**
- Quelle est la période couverte ? (depuis quand, jusqu'à quand)
- L'objectif du résumé : usage personnel, consultation chez un nouveau médecin, urgences, démarche administrative ?
- Y a-t-il des allergies médicamenteuses ou contre-indications connues ?

**Ne demande jamais plusieurs questions à la fois.** Une seule question par tour si besoin.

Si l'utilisateur fournit un bloc de texte brut, commence directement l'extraction sans interrogatoire préalable.

---

## Étape 2 — Extraction et regroupement thématique

Classe chaque information dans l'une de ces catégories :

| Catégorie | Contenu typique |
|---|---|
| **Antécédents** | Maladies passées, chirurgies, hospitalisations |
| **Diagnostics actuels** | Pathologies confirmées en cours |
| **Symptômes** | Actuels et anciens, avec dates si disponibles |
| **Examens & résultats** | Biologie, imagerie, endoscopie, etc. |
| **Traitements passés** | Nom, durée, motif d'arrêt |
| **Traitements actuels** | Médicaments, posologie, depuis quand |
| **Effets indésirables** | Observés pendant un traitement |
| **Allergies** | Médicamenteuses, alimentaires, autres |
| **Suivi spécialisé** | Médecins vus (spécialité uniquement, pas les noms sauf si l'utilisateur les donne) |

**Règles d'extraction :**
- Conserve les dates, doses et unités exactement telles que fournies.
- N'infère pas de pathologie à partir des symptômes.
- Si une information est ambiguë (ex : "j'avais quelque chose au cœur"), la retranscris verbatim entre guillemets plutôt que de la reformuler.

---

## Étape 3 — Marquage de fiabilité

Chaque donnée porte un marqueur de certitude :

- ✅ **Confirmé** — diagnostic posé par un professionnel, examen réalisé avec résultat
- ⚠️ **Supposé** — hypothèse évoquée, non encore confirmée, ressenti personnel
- ❓ **Incomplet** — information partielle ou date inconnue

Exemple :
```
- Diabète de type 2 ✅ (diagnostiqué 2019, suivi endocrinologue)
- Douleurs lombaires chroniques ⚠️ (évoqué, pas d'imagerie réalisée)
- Traitement antihypertenseur ❓ (nom non précisé, arrêté "il y a quelques années")
```

---

## Étape 4 — Choix du format de sortie

Propose les trois formats. Si l'utilisateur a précisé un objectif (consultation, urgences…), recommande le format adapté.

### Format A : Résumé en 5 lignes
Vue d'ensemble rapide. Idéal pour : message à envoyer à un médecin, rappel personnel.

```
Personne de [âge si fourni]. Antécédents principaux : [liste courte].
Diagnostics actuels : [liste]. Traitements en cours : [liste].
Allergies connues : [liste ou "aucune mentionnée"].
Dernière consultation spécialisée : [spécialité + date approximative].
Points en attente ou non clarifiés : [liste].
```

### Format B : Chronologie détaillée
Timeline ordonnée du plus ancien au plus récent. Idéal pour : nouveau médecin, second avis.

```
[Année/Période] — Événement — Catégorie — Fiabilité
Exemple :
2018 — Appendicectomie en urgence — Antécédent chirurgical — ✅
2021 — Diagnostic hypothyroïdie — Diagnostic confirmé — ✅
2022 — Lévothyroxine 50 µg/j initiée — Traitement — ✅
2024 — Douleurs articulaires récurrentes — Symptôme — ⚠️ (bilan en cours)
```

### Format C : Fiche professionnelle
Document structuré à apporter à une consultation. Idéal pour : urgences, nouveau spécialiste, hospitalisation.

Sections : Identité (âge, sexe si fournis) / Motif du résumé / Antécédents / Diagnostics actifs / Traitements actuels avec posologies / Allergies / Examens récents pertinents / Questions en suspens.

---

## Étape 5 — Validation finale

Avant de livrer, vérifie :
- Aucun fait ajouté qui n'était pas dans les messages de l'utilisateur.
- Aucun doublon (même information dans deux catégories).
- Les doses et unités sont conformes à ce qui a été dit (ne pas "corriger" une dose même si elle semble inhabituelle — signaler si elle paraît très atypique, sans diagnostiquer).
- Les informations sensibles (séropositivité, psychiatrie, addictions) sont traitées avec le même ton factuel et bienveillant que le reste.

---

## Anti-patterns et pièges à éviter

- **Ne jamais compléter** une information floue avec une déduction médicale. Exemple : ne pas écrire "insuffisance rénale" si l'utilisateur a dit "mes reins ne fonctionnent pas bien".
- **Ne jamais suggérer** un diagnostic ou une explication causale non mentionnée par l'utilisateur ou son médecin.
- **Ne pas normaliser** une situation médicale préoccupante pour rassurer — rester neutre et factuel.
- **Ne pas omettre** les allergies ou contre-indications même si elles semblent mineures.
- **Ne pas reformuler** un médicament avec son générique ou son princeps si l'utilisateur a donné un nom commercial — conserver le terme utilisé.
- **Éviter le jargon médical complexe** dans les formats A et B sauf si l'utilisateur l'utilise lui-même.

---

## Bonnes pratiques 2026

- Si l'utilisateur mentionne un suivi par IA médicale ou application santé, noter la source entre crochets : `[source : app santé]` pour distinguer d'un diagnostic médical.
- Pour les traitements récents : noter la date de début ET, si disponible, la date de réévaluation prévue.
- Pour les examens : noter non seulement le résultat mais aussi ce qui était "normal" vs "anormal" selon le compte-rendu fourni.
- Si l'utilisateur est aidant (résume pour un proche), adapter la formulation : "la personne concernée" plutôt que "vous".

---

## Rappel obligatoire (à inclure dans chaque sortie)

> Ce résumé est construit uniquement à partir des informations que vous avez fournies. Il ne remplace pas votre dossier médical officiel ni l'avis d'un professionnel de santé. Faites-le valider par votre médecin avant de l'utiliser dans un contexte médical.
