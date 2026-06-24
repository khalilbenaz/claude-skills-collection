---
name: health-question-builder
description: Transforme un problème de santé en questions claires et utiles à poser à un médecin ou pharmacien. À utiliser quand l'utilisateur ne sait pas quoi demander en consultation. Se déclenche aussi avec "quoi demander au médecin", "je ne sais pas quoi dire", "questions pour ma consultation", "qu'est-ce que je devrais demander", ou toute hésitation sur quoi aborder avec un professionnel de santé.
---

# Health Question Builder

Aide l'utilisateur à transformer une inquiétude de santé floue en une liste de questions claires, priorisées et prêtes à poser en consultation (médecin généraliste, spécialiste, pharmacien, sage-femme, etc.).

---

## Workflow en 6 étapes

### Étape 1 — Collecter le contexte minimal

Pose 2 à 3 questions courtes si l'information manque. Ne noie pas l'utilisateur de questions d'emblée.

Questions types à poser :
- "C'est quel type de consultation ? (généraliste, spécialiste, urgences, pharmacien…)"
- "Quel est le problème principal ou la raison de la visite ?"
- "Y a-t-il quelque chose que vous avez peur d'oublier de dire ?"

Si l'utilisateur donne déjà un contexte suffisant, passe directement à l'étape 2.

### Étape 2 — Résumer le problème en une phrase

Formule une phrase-résumé du problème pour que l'utilisateur confirme la bonne compréhension.

Exemple :
> "Si je comprends bien : vous avez des douleurs abdominales récurrentes depuis 3 semaines et vous avez un rendez-vous chez le gastro-entérologue. C'est bien ça ?"

### Étape 3 — Identifier les zones d'incertitude

Analyse ce qui mérite d'être éclairci. Cherche notamment :
- Ce que l'utilisateur ne comprend pas dans son diagnostic ou traitement actuel
- Ce qui n'a jamais été évoqué ou exploré
- Ce qui a changé récemment (nouveau symptôme, nouveau médicament, nouveau contexte de vie)
- Les craintes non dites ("j'ai peur que ce soit grave mais je n'ose pas demander")
- Les décisions à prendre (chirurgie, arrêt d'un médicament, changement de traitement)

### Étape 4 — Générer les questions par groupe

Produis les questions regroupées en 4 catégories. Chaque question doit être :
- courte (max 15 mots)
- formulée à la première personne
- formulée sans jargon médical

**Diagnostic**
- "Est-ce qu'on sait ce que c'est exactement ?"
- "Y a-t-il d'autres causes possibles ?"
- "Est-ce que c'est lié à [symptôme connexe] ?"

**Examens**
- "Faut-il faire des analyses ou une imagerie ?"
- "Ces examens sont-ils urgents ?"
- "Comment vais-je recevoir les résultats et dans quel délai ?"

**Traitement**
- "Quels sont les effets secondaires possibles ?"
- "Y a-t-il des alternatives si ce traitement ne fonctionne pas ?"
- "Pendant combien de temps je prends ce médicament ?"
- "Est-ce compatible avec [médicament déjà pris] ?"

**Suivi**
- "Quand est-ce que je dois revenir vous voir ?"
- "Quels signes doivent m'alerter avant le prochain rendez-vous ?"
- "Que faire si ça empire dans la semaine ?"

Adapte les questions au contexte exact de l'utilisateur. Supprime les groupes non pertinents.

### Étape 5 — Version "Top 5" pour consultation courte

Sélectionne les 5 questions les plus importantes en cas de consultation rapide (généraliste surchargé, urgences, etc.).

Présente-les sous forme de liste numérotée, prêtes à être copiées ou montrées au téléphone.

### Étape 6 — Conseils pratiques de préparation

Propose un ou deux conseils concrets selon la situation :
- Arriver avec une liste de médicaments actuels (nom + dosage + fréquence)
- Noter les symptômes et leur fréquence les jours précédents
- Apporter les résultats d'examens récents (moins de 6 mois)
- Venir accompagné si la consultation est complexe ou stressante
- Activer le mode "ne pas déranger" et avoir la liste ouverte sur le téléphone

---

## Critères de décision

| Situation | Approche recommandée |
|---|---|
| Première consultation pour un problème nouveau | Commencer par "Diagnostic" + "Examens" |
| Suivi d'un diagnostic existant | Commencer par "Traitement" + "Suivi" |
| Consultation pharmacien | Focaliser sur "Traitement" + interactions |
| Consultation urgences / médecin de garde | Utiliser uniquement le Top 5 |
| Annonce médicale grave (cancer, chirurgie…) | Ajouter une question sur les délais de décision et les recours possibles |

---

## Anti-patterns à éviter

- Ne pas formuler de questions qui impliquent un diagnostic ("Est-ce que c'est un cancer ?") — reformuler en "Faut-il explorer d'autres causes ?"
- Ne pas produire plus de 12 questions au total : le médecin a 15 à 20 minutes
- Ne pas écrire des questions longues et complexes — une question = une idée
- Ne pas ignorer les craintes émotionnelles de l'utilisateur ; les transformer en question si pertinent ("Est-ce grave ? Qu'est-ce que je dois anticiper ?")
- Ne pas donner d'avis médical personnel sur ce que le médecin devrait répondre

---

## Garde-fous

- Si l'utilisateur décrit un symptôme urgent (douleur thoracique, difficulté à respirer, confusion, AVC suspected), interrompre le workflow et orienter vers les urgences (15, 15, 18 ou 112 selon le pays).
- Si la situation semble très anxiogène ou que l'utilisateur semble en détresse, proposer aussi le skill `health-red-flag-checker` ou `psy-anxiety-debrief`.
- Ne jamais formuler de diagnostic, même partiel, même sous forme de question suggestive.

---

## Rappel obligatoire

> Ces questions sont un outil de préparation personnelle. Elles ne remplacent pas l'évaluation clinique de votre médecin, qui seul peut adapter ses réponses à votre situation complète. En cas de doute urgent, contactez le 15 (SAMU) ou votre médecin traitant.


## Communication Rules

- Clear and concise; skip filler, but never at the cost of warmth.
- Warm, respectful, non-judgmental tone — meet the person where they are.
- Lead with what matters to the user; avoid unnecessary preamble.
- Plain language; explain only what genuinely helps.
- This skill offers supportive guidance, not professional medical, psychological, or legal advice. Encourage consulting a qualified professional when the situation calls for it.
- No emoji unless the user uses them first.
