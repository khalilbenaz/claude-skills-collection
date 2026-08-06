---
name: red-flag-checker
description: Repère les signes d'alerte nécessitant une évaluation médicale rapide. À utiliser quand l'utilisateur décrit des symptômes inquiétants, une aggravation brutale ou demande si une situation peut être urgente. Se déclenche aussi avec "c'est grave ?", "je dois aller aux urgences ?", "ça empire", "j'ai très mal", "je m'inquiète", ou toute description de détérioration rapide. Also triggers on "is this serious", "warning signs", "should I see a doctor now".
---

# Red Flag Checker

Ce skill aide l'utilisateur à évaluer si ses symptômes ou ceux d'un proche méritent une attention médicale rapide. Il ne pose pas de diagnostic. Il aide à décider quoi faire maintenant.

---

## Étape 1 — Reformulation empathique

Reformule brièvement ce que l'utilisateur a décrit pour valider la compréhension :

> "Si je comprends bien, tu ressens [symptôme principal] depuis [durée], avec [éléments associés]. C'est bien ça ?"

Si l'utilisateur est en détresse visible (panique, confusion), commence par une phrase de calme avant le workflow.

---

## Étape 2 — Collecte des éléments de gravité

Passe en revue ces 7 dimensions à partir de ce que l'utilisateur a partagé (ne pose pas toutes les questions si certaines sont déjà claires) :

| Dimension | Signal d'alerte |
|---|---|
| **Intensité** | "Pire douleur de ma vie", 8-10/10, insupportable |
| **Onset** | Brutal (en secondes/minutes), sans cause évidente |
| **Évolution** | Aggravation rapide en quelques heures |
| **Localisation** | Poitrine, tête, nuque, abdomen sévère |
| **Signes associés** | Fièvre > 39,5°C, essoufflement au repos, confusion, perte de connaissance, paralysie faciale, troubles de la parole, vomissements en jet |
| **Terrain** | Antécédent cardiaque, diabète, immunodépression, grossesse, âge > 65 ans ou < 3 ans |
| **Durée sans amélioration** | > 48 h pour symptômes inhabituels, > 3 jours pour fièvre sous traitement |

---

## Étape 3 — Classification en 3 niveaux

### Niveau 1 — Surveillance à domicile
Symptômes stables, bénins, sans aucun signal d'alerte.

**Exemples :** rhume sans fièvre, douleur musculaire après effort, légère fatigue passagère.

**Action :** repos, hydratation, automédication adaptée si connue. Réévaluer si aggravation.

---

### Niveau 2 — Consultation médicale dans les 24-72 h
Un ou plusieurs signaux modérés présents, sans urgence vitale immédiate.

**Exemples :** fièvre persistante > 48 h, douleur abdominale modérée non localisée, toux productive avec fièvre, plaie suspecte d'infection.

**Action :** médecin généraliste, SOS médecins, maison médicale de garde. Éviter les urgences si possible pour ne pas saturer.

---

### Niveau 3 — Urgence potentielle — agir maintenant
Un signal d'alerte majeur ou plusieurs signaux combinés.

**Exemples concrets de situations Niveau 3 :**
- Douleur thoracique avec essoufflement ou irradiation dans le bras gauche/mâchoire
- Céphalée brutale "en coup de tonnerre"
- Déficit neurologique soudain (paralysie, trouble de la parole, vision double)
- Fièvre > 40°C avec raideur de nuque et photophobie
- Détresse respiratoire (lèvres bleues, incapacité à finir une phrase)
- Perte de connaissance, convulsion
- Saignement abondant incontrôlable
- Suspicion d'AVC (test FAST : Face-Arms-Speech-Time)

**Action :** appeler le 15 (SAMU), le 18 (pompiers) ou le 112. Ne pas conduire soi-même si état grave.

---

## Étape 4 — Justification factuelle

Explique en 2-3 phrases pourquoi tu as choisi ce niveau. Base-toi uniquement sur ce que l'utilisateur a décrit. Ne projette pas de causes non mentionnées.

Exemple :
> "L'apparition brutale de la céphalée et son intensité inhabituelle sont deux critères qui nécessitent une évaluation médicale rapide, car certaines causes graves (hémorragie sous-arachnoïdienne) peuvent ressembler à une migraine ordinaire."

---

## Étape 5 — Recommandation d'action claire

- Indique le niveau (1, 2 ou 3) et l'action concrète.
- En Niveau 3 : donne les numéros d'urgence adaptés au contexte de l'utilisateur si connu (France : 15/18/112 ; Tunisie : 190 SAMU / 198 protection civile ; Maroc : 141 SAMU / 150 pompiers).
- Propose toujours de réévaluer si l'état évolue.
- Si l'utilisateur parle d'un enfant ou d'une personne âgée, augmente d'un cran la vigilance.

---

## Garde-fous et anti-patterns

**Ne jamais faire :**
- Poser un diagnostic ("c'est probablement une appendicite")
- Minimiser une douleur que l'utilisateur décrit comme intense
- Rassurer systématiquement pour éviter de stresser ("ce n'est rien")
- Demander 10 questions avant de donner un premier niveau d'alerte
- Suggérer d'attendre quand plusieurs signaux de niveau 3 sont présents

**Pièges fréquents :**
- L'utilisateur banalise lui-même ses symptômes ("c'est sûrement rien mais...") — ne pas se laisser influencer par cette minimisation
- Symptômes vagues chez un immunodéprimé ou un diabétique : seuil d'alerte plus bas
- Douleur abdominale chez la femme en âge de procréer : toujours évoquer grossesse extra-utérine si douleur latéralisée
- Enfant de moins de 3 mois avec fièvre > 38°C : toujours Niveau 3

---

## Rappel systématique en fin de réponse

> Cette évaluation est indicative et ne remplace pas un avis médical. En cas de doute ou d'aggravation, contactez un professionnel de santé ou les services d'urgence (15 / 18 / 112 en France).
