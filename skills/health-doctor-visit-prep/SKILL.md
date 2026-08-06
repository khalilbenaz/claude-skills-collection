---
name: health-doctor-visit-prep
description: Prépare un rendez-vous médical avec un résumé structuré, une chronologie et des questions à poser. À utiliser quand l'utilisateur veut aller chez le médecin, le gastro, l'endocrino, l'ORL ou un spécialiste. Se déclenche aussi avec "rendez-vous médecin", "je vois le docteur", "consultation", "préparer ma visite", "qu'est-ce que je dis au médecin". Also triggers on "prepare for a doctor visit", "summary for my doctor", "questions for the appointment".
---

# Doctor Visit Prep

Accompagne l'utilisateur pour préparer un rendez-vous médical de façon structurée, sans jugement, en restant dans le rôle d'un outil de préparation — jamais de diagnostic ni de conseil thérapeutique.

---

## Étape 1 — Recueillir le contexte

Commence par poser 3 à 5 questions ciblées si l'utilisateur n'a pas encore fourni les informations de base :

- Quel est le **motif principal** de la consultation ?
- Depuis **combien de temps** les symptômes sont-ils présents ?
- Y a-t-il des **examens récents** (analyses, imagerie) déjà réalisés ?
- Prend-il des **médicaments** ou des **compléments** en ce moment ?
- Y a-t-il des **allergies ou intolérances** connues ?

> Ne pose qu'une seule question à la fois si l'utilisateur semble dépassé ou anxieux.

---

## Étape 2 — Résumé du problème principal

Rédige un résumé du motif en **2 phrases maximum**, en langage clair (ni trop technique, ni vague) :

**Exemple :**
> "Je consulte pour des douleurs abdominales basses récurrentes depuis 3 semaines, accompagnées de ballonnements après les repas. Ces symptômes n'ont pas répondu aux antispasmodiques prescrits il y a 10 jours."

---

## Étape 3 — Chronologie structurée

Construis une chronologie des faits pertinents, du plus ancien au plus récent :

| Date / période | Événement |
|---|---|
| Il y a 3 semaines | Apparition des douleurs abdominales |
| Il y a 10 jours | Début du traitement antispasmodique |
| Hier | Douleur aggravée après repas |

Inclure : symptômes, évolution, traitements essayés, examens réalisés, changements de mode de vie ou facteurs déclencheurs identifiés.

---

## Étape 4 — Inventaire médicamenteux et médical

Liste les éléments suivants si mentionnés par l'utilisateur :

- **Médicaments en cours** (nom, dosage, fréquence)
- **Compléments alimentaires / phytothérapie**
- **Allergies ou intolérances** (médicaments, aliments)
- **Antécédents médicaux** pertinents (chirurgie, maladies chroniques)
- **Antécédents familiaux** si l'utilisateur les mentionne spontanément
- **Effets secondaires** observés depuis la dernière consultation

---

## Étape 5 — Document final structuré

Génère un document en 4 sections, prêt à montrer ou à lire à voix haute au médecin :

### 1. Motif de consultation
Pourquoi je viens — en 2 phrases claires.

### 2. Historique
Chronologie des événements (tableau ou liste à puces datées).

### 3. Traitements et prises en cours
Tout ce que l'utilisateur prend actuellement, avec posologie si connue.

### 4. Questions à poser
Questions personnalisées, priorisées de la plus importante à la moins urgente.

**Exemples de questions génériques à personnaliser :**
- "Est-ce que des examens complémentaires sont nécessaires ?"
- "Ce traitement est-il compatible avec [médicament en cours] ?"
- "À quel moment dois-je m'inquiéter et revenir en urgence ?"
- "Y a-t-il des changements alimentaires ou d'hygiène de vie à envisager ?"
- "Quelle est la prochaine étape si le traitement ne fonctionne pas ?"

---

## Étape 6 — Version express (1 minute)

Termine par une version ultra-courte lisible en moins de 60 secondes pour un médecin pressé :

```
MOTIF : [1 phrase]
DEPUIS : [durée]
DÉJÀ ESSAYÉ : [traitement + résultat]
MÉDICAMENTS EN COURS : [liste courte]
QUESTION PRIORITAIRE : [1 question]
```

---

## Garde-fous et anti-patterns

**Ne jamais faire :**
- Formuler un diagnostic, même hypothétique ("ça ressemble à…", "c'est probablement…")
- Recommander de modifier, arrêter ou remplacer un traitement prescrit
- Prioriser une plainte par rapport à une autre en suggérant laquelle est "plus grave"
- Inventer des informations non fournies par l'utilisateur pour compléter le document

**Pièges fréquents à éviter :**
- Utiliser du jargon médical que l'utilisateur ne comprendra pas lui-même
- Produire un document trop long (le médecin ne lira pas plus de 10 lignes)
- Négliger les médicaments "non prescrits" (automédication, compléments) qui ont pourtant un impact clinique
- Oublier de demander l'heure et le type de consultation (généraliste, spécialiste, urgences) pour adapter le niveau de détail

**Critère de qualité du document produit :**
Un proche sans formation médicale doit pouvoir le lire et comprendre la situation en 1 minute.

---

## Bonnes pratiques 2026

- Proposer une **version texte simple** (sans tableau) pour les utilisateurs qui impriment ou dictent au médecin.
- Si l'utilisateur mentionne une **téléconsultation**, rappeler de préparer un espace calme, une bonne connexion et d'avoir les documents d'examens scannés.
- Si des **documents médicaux** (ordonnances, comptes-rendus) sont partagés, les synthétiser dans la section historique sans en altérer le sens.
- En cas d'anxiété visible de l'utilisateur, commencer par valider ses inquiétudes avant de structurer le document.

---

> Ce document est un outil de préparation personnelle. Il ne remplace ni l'examen clinique, ni l'avis d'un professionnel de santé. En cas de symptômes graves ou soudains, consulter en urgence sans attendre le rendez-vous préparé.


## Communication Rules

- Clear and concise; skip filler, but never at the cost of warmth.
- Warm, respectful, non-judgmental tone — meet the person where they are.
- Lead with what matters to the user; avoid unnecessary preamble.
- Plain language; explain only what genuinely helps.
- This skill offers supportive guidance, not professional medical, psychological, or legal advice. Encourage consulting a qualified professional when the situation calls for it.
- No emoji unless the user uses them first.
