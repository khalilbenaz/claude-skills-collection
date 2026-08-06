---
name: education-flashcard-generator
description: Génère des flashcards de révision à partir d'un cours, d'un texte ou d'un sujet. À utiliser quand l'utilisateur veut mémoriser du contenu. Se déclenche aussi avec "flashcards", "cartes de révision", "fiches mémoire", "aide-moi à mémoriser", "questions/réponses". Also triggers on "make flashcards", "spaced repetition cards", "quiz me on this".
---

# Flashcard Generator

## Workflow en 5 étapes

### 1. Identifier la source et le niveau

Avant de générer quoi que ce soit, établir :

- **Source** : texte brut, chapitre de cours, notes, sujet libre ?
- **Niveau** : débutant (définitions + exemples), intermédiaire (mécanismes, distinctions), avancé (edge cases, nuances, erreurs classiques).
- **Objectif** : examen proche → densité maximale ; révision légère → 15 cartes ciblées.

Si l'utilisateur ne précise pas le niveau, inférer depuis le vocabulaire du texte fourni.

---

### 2. Extraire les concepts mémorisables

Parcourir la source et classer les éléments en 4 catégories :

| Catégorie | Ce qu'on cherche | Priorité |
|-----------|-----------------|----------|
| Définitions | Termes techniques, concepts nommés | Haute |
| Mécanismes | Processus, algorithmes, étapes ordonnées | Haute |
| Distinctions | A vs B, quand utiliser X plutôt que Y | Moyenne |
| Faits isolés | Dates, valeurs numériques, auteurs | Basse (sauf si explicitement demandé) |

Écarter les détails périphériques et les exemples illustratifs qui ne valent pas une carte seule.

---

### 3. Rédiger les cartes selon le bon type

Choisir le type de carte adapté au contenu extrait :

**Type A — Définition**
```
Recto : Qu'est-ce que la mémoire de travail ?
Verso  : Système cognitif de capacité limitée (~7 éléments) qui maintient
         et manipule temporairement l'information pendant une tâche.
```

**Type B — Mécanisme / Processus**
```
Recto : Quelles sont les 3 phases de la consolidation mémorielle ?
Verso  : 1. Encodage (acquisition)
         2. Stockage (consolidation synaptique)
         3. Récupération (rappel ou reconnaissance)
```

**Type C — Distinction / Critère de décision**
```
Recto : Rappel vs Reconnaissance — quelle différence clé ?
Verso  : Rappel = reproduire sans indice (exam réponse libre)
         Reconnaissance = identifier parmi des options (QCM)
         → Rappel est plus difficile et plus durable pour la mémoire.
```

**Type D — Compléter la phrase (cloze)**
```
Recto : La répétition espacée repose sur l'effet _______.
Verso  : …de l'espacement (spacing effect) — réviser à intervalles
         croissants ancre mieux qu'une session longue unique.
```

**Type E — Vrai / Faux + justification**
```
Recto : Vrai ou Faux : relire un cours plusieurs fois suffit pour mémoriser.
Verso  : FAUX. La relecture passive crée une illusion de maîtrise
         (fluency illusion). Le rappel actif (testing effect) est 2×
         plus efficace selon Roediger & Karpicke (2006).
```

---

### 4. Critères de qualité par carte

Chaque carte doit passer ce filtre avant d'être incluse :

- [ ] **Une seule idée** — si le verso dépasse 3 lignes, couper en 2 cartes.
- [ ] **Question sans ambiguïté** — on ne peut pas répondre "ça dépend" sans autre information.
- [ ] **Verso auto-suffisant** — lisible seul, sans contexte extérieur.
- [ ] **Niveau adéquat** — ni trivial ("De quelle couleur est le ciel ?"), ni trop dense (5 faits entassés).
- [ ] **Ancrage concret** — inclure un exemple, une formule ou un contre-exemple si le concept est abstrait.

---

### 5. Organiser et formater la sortie

**Volume recommandé :**
- Session initiale : 15–25 cartes (au-delà, fatigue cognitive).
- Révision ciblée : 8–12 cartes sur un sous-thème.
- Deck complet d'un cours : découper par chapitre, pas en une liste unique.

**Format de sortie standard (Markdown tableau) :**

```markdown
| # | Recto (Question) | Verso (Réponse) |
|---|-----------------|-----------------|
| 1 | ... | ... |
| 2 | ... | ... |
```

**Format alternatif Anki-compatible (CSV copiable) :**

```
Question;Réponse;Étiquette
"Qu'est-ce que la potentialisation à long terme ?"; "Renforcement durable d'une synapse après stimulation répétée — mécanisme clé de l'apprentissage.";"neurosciences"
```

Proposer le format CSV si l'utilisateur mentionne Anki, Quizlet ou un outil de flashcards.

---

## Garde-fous et anti-patterns

| Anti-pattern | Pourquoi c'est un problème | Correction |
|-------------|--------------------------|------------|
| Question trop vague : "Parle-moi de X" | Impossible à évaluer, réponse ouverte infinie | Reformuler : "Quel est le rôle de X dans Y ?" |
| Verso encyclopédique (>5 lignes) | Surcharge cognitive, mémorisation impossible | Découper en N cartes atomiques |
| Recto contient la réponse | Aucune valeur de rappel actif | Reformuler sans indices dans la question |
| 100% de cartes de définition | Monotonie, pas de transfert | Varier les types (A à E ci-dessus) |
| Cartes sans ancrage | Mémorisation fragile, pas de sens | Ajouter exemple concret ou contexte d'usage |
| Traduire mot à mot un chapitre dense | Mauvaise sélection, signal/bruit faible | Filtrer : seuls les concepts *testables* deviennent des cartes |

---

## Bonnes pratiques 2026

- **Répétition espacée** : signaler à l'utilisateur d'importer dans Anki / RemNote pour bénéficier de l'algorithme SM-2 ou FSRS — ne pas faire des sessions de révision à la volée en une seule fois.
- **Interleaving** : mélanger les thèmes dans un deck plutôt que de bloquer par chapitre — améliore la discrimination des concepts.
- **Testing effect** : encourager l'utilisateur à se tester *avant* de relire le cours, pas après.
- **Génération active** : proposer quelques cartes incomplètes (type cloze) même pour un débutant — l'effort de complétion renforce l'encodage.
- **Revue des erreurs** : après une session, identifier les cartes ratées et créer des cartes "correctif" qui expliquent pourquoi l'erreur fréquente est fausse.


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
