---
name: education-exam-prep
description: Prépare un examen avec quiz de test, points clés et stratégie de révision. À utiliser quand l'utilisateur veut se tester ou préparer un examen spécifique. Se déclenche aussi avec "teste-moi", "quiz", "préparer l'examen", "QCM", "révision active", "simule un examen".
---

# Exam Prep

## Workflow en 6 étapes

### 1. Collecte du contexte (obligatoire avant tout)

Demander :
- Matière / sujet précis (ex : "algorithmique — tris et arbres", "SQL avancé", "réseau TCP/IP")
- Date de l'examen et temps disponible
- Format connu : QCM seul, questions ouvertes, exercices pratiques, oral ?
- Niveau : licence L2, prépa, certification pro (AWS, Azure, LFCS…) ?
- Ressources disponibles : cours, TP déjà faits ?

> Si l'utilisateur fournit un cours ou du code : extraire soi-même les concepts clés sans redemander.

---

### 2. Points clés — carte mentale textuelle

Produire un résumé structuré des concepts **must-know** avant de lancer le quiz :

```
SUJET : Complexité algorithmique
├── Notation Big-O : O(1) O(log n) O(n) O(n log n) O(n²)
├── Cas moyen vs pire cas (Quicksort : O(n log n) moy / O(n²) pire)
├── Espace mémoire : in-place (tri à bulles) vs non in-place (mergesort)
└── Comparatifs : tri rapide vs tri fusion — stabilité, pivot, diviser pour régner
```

Règle : **max 15 points** par sujet. Si plus → découper en sous-sessions.

---

### 3. Construction du quiz

#### Calibrage de la difficulté

| Niveau | Part du quiz | Critère |
|--------|-------------|---------|
| Facile | 30 % | Définition, rappel direct |
| Moyen | 50 % | Application, distinction de cas |
| Difficile | 20 % | Analyse, contre-exemple, piège |

#### Types de questions selon l'examen réel

**QCM (4 options)** — pour toute certification ou concours :
```
Q3. Quelle complexité pour un tri fusion sur n éléments ?
  A) O(n)
  B) O(n log n)  ← correcte
  C) O(n²)
  D) O(log n)
```

**Vrai/Faux + justification** — renforce la compréhension :
```
Q7. Le tri rapide est toujours plus efficace que le tri fusion. Vrai ou Faux ?
→ FAUX. Dans le pire cas (tableau déjà trié, mauvais choix de pivot), Quicksort = O(n²).
```

**Question ouverte courte** (2-3 lignes max) :
```
Q12. Expliquer pourquoi on préfère un arbre AVL à un BST non équilibré.
```

**Exercice d'application** (code ou calcul) :
```
Q15. Calculer la complexité de cette fonction :
def f(n):
    for i in range(n):        # O(n)
        for j in range(n):    # O(n)
            print(i+j)        # O(1)
→ O(n²)
```

Nombre de questions recommandé : **10 questions** pour une session < 30 min, **20** pour simuler un examen complet.

---

### 4. Session de quiz interactive

- Poser **une question à la fois** (sans afficher la réponse immédiatement).
- Attendre la réponse de l'utilisateur.
- Valider ou corriger avec explication détaillée.
- Consigner mentalement le score et les erreurs.

Mode simulation : si l'utilisateur demande un "vrai" examen, poser toutes les questions d'un coup, puis corriger à la fin.

---

### 5. Correction et analyse

Après le quiz, produire :

```
SCORE : 14/20 (70 %)

✓ Points forts  : Big-O notation, tri fusion, complexité spatiale
✗ Points faibles : Quicksort pire cas, arbres AVL rotations, récursivité terminale

ERREURS DÉTAILLÉES :
Q5 — Tu as répondu O(n log n) mais c'est O(n²) car le tableau était déjà trié
     → Piège classique du pivot "premier élément"
```

---

### 6. Plan de rattrapage ciblé

Générer des micro-sessions sur les lacunes uniquement :

```
SESSION RATTRAPAGE — Quicksort (20 min)
1. Relire : choix du pivot (médiane, aléatoire, premier élément)
2. Exercice : dérouler Quicksort à la main sur [5,1,4,2,8]
3. Re-quiz : 5 questions sur le pire cas et la stabilité
```

---

## Critères de décision — comment adapter le quiz

| Situation | Action |
|-----------|--------|
| Certification avec banque de questions connue | Coller au format officiel, taux difficile → 30 % |
| Oral / soutenance | Ajouter des questions "pourquoi" et "comparer X vs Y" |
| TP noté / examen pratique (code, SQL) | Exercices sur machine, snippets à compléter |
| 48 h avant l'examen | Révision flash : uniquement les points faibles identifiés |
| Matière très large | Découper par chapitre, une session par bloc |

---

## Garde-fous / anti-patterns

- **Ne jamais** afficher toutes les réponses avant que l'utilisateur ait répondu : ça annule l'effet de récupération active.
- **Ne pas** surcharger : plus de 20 questions d'affilée = baisse d'attention, contre-productif.
- **Éviter** les questions ambiguës sans contexte précis ("expliquer X" sans délimiter la profondeur attendue).
- **Ne pas** inventer des faits si le domaine est inconnu : signaler explicitement les limites et demander le cours.
- **Ne pas** ignorer le format réel : un étudiant qui prépare un QCM ne bénéficie pas de questions rédactionnelles longues.

---

## Bonnes pratiques 2026

- **Récupération espacée** : proposer de revenir sur le même quiz dans 24 h puis 72 h (effet spacing).
- **Interleaving** : mélanger les chapitres dans un même quiz plutôt que de les grouper — meilleure rétention à long terme.
- **Elaborative interrogation** : systématiser les questions "pourquoi ?" après chaque concept validé.
- **Feedback immédiat** : corriger chaque question au moment de la réponse (mode interactif), pas seulement à la fin.
- Pour les certifications techniques (AWS SAA, CKAD, DP-900…) : simuler la contrainte temps (ex : 1 min 30 par question).


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
