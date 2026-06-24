---
name: concept-explainer
description: Explique un concept complexe de manière simple, progressive et avec des analogies. À utiliser quand l'utilisateur ne comprend pas quelque chose et a besoin d'une explication claire. Se déclenche aussi avec "explique-moi", "c'est quoi", "je ne comprends pas", "en termes simples", "comme si j'avais 5 ans".
---

# Concept Explainer

## Workflow

### Étape 1 — Calibrer le niveau
Avant d'expliquer, identifier :
- **Audience** : débutant complet / praticien adjacent / expert qui change de domaine ?
- **Contexte** : la question vient d'une erreur de code ? d'une lecture ? d'un entretien ?
- **Objectif** : comprendre pour utiliser / pour expliquer à autrui / pour aller plus loin ?

Si le contexte est absent, démarrer niveau "praticien adjacent" et ajuster au premier retour.

### Étape 2 — Ancrage en une phrase
Formule : **"[Concept] = [analogie simple] sauf que [différence clé]."**

Exemples :
- Un mutex = un jeton de salle de bain partagé, sauf qu'un seul thread peut l'avoir à la fois.
- Un index SQL = la table des matières d'un livre, sauf que le moteur la construit et la maintient automatiquement.
- Un JWT = une carte d'identité signée numériquement, sauf qu'aucun serveur ne doit appeler une base pour la vérifier.

### Étape 3 — Mécanisme core (comment ça marche)
Expliquer le fonctionnement interne avec :
- un schéma textuel ASCII si utile (`A → B → C`)
- un snippet copiable minimal pour les concepts techniques

Exemple pour le concept "Promise" en JS :
```js
// Une Promise = un résultat futur. Trois états : pending / fulfilled / rejected.
fetch('/api/data')          // retourne une Promise (pending)
  .then(res => res.json())  // fulfilled → on traite
  .catch(err => console.error(err)); // rejected → on gère
```

### Étape 4 — Cas concret / scénario réel
Ancrer dans un exemple qui résonne avec le contexte de l'utilisateur :
- Si contexte web → donner un exemple HTTP ou navigateur
- Si contexte data → donner un exemple SQL ou pipeline
- Si généraliste → donner un exemple de la vie quotidienne

### Étape 5 — Ce que ce N'EST PAS (frontières du concept)
Toujours préciser au moins 2 confusions fréquentes :
- "Ce n'est pas la même chose que X parce que..."
- "Attention : beaucoup confondent Y et [concept], la différence est..."

### Étape 6 — Critères de décision / Quand l'utiliser
Pour les concepts techniques, ajouter un tableau ou une liste de décision :

| Situation | Choisir |
|-----------|---------|
| Données relationnelles avec jointures | SQL (PostgreSQL/MySQL) |
| Documents JSON flexibles | MongoDB |
| Cache clé-valeur haute perf | Redis |

### Étape 7 — Prochaine question naturelle
Proposer 2-3 points d'approfondissement sous forme de questions que l'utilisateur devrait se poser :
- "La question suivante est souvent : comment gérer les erreurs ?"
- "Si tu veux aller plus loin : [sous-concept A] et [sous-concept B]."

---

## Critères de décision du format

| Contexte | Format à utiliser |
|----------|-------------------|
| Concept purement abstrait | Analogie + schéma textuel |
| Concept avec code | Snippet minimal + explication ligne par ligne |
| Concept avec plusieurs variantes | Tableau comparatif |
| Audience non-technique | Métaphore + zéro code |
| Demande express ("en 2 lignes") | Étape 2 uniquement + lien vers détail |

---

## Anti-patterns / Pièges

- **Jargon sur jargon** : expliquer un terme inconnu avec d'autres termes inconnus → toujours partir d'un ancrage connu.
- **Exemple trop abstrait** : `foo`, `bar`, `baz` dans les snippets → utiliser des noms de domaine réels (`userId`, `orderTotal`).
- **Sur-simplification trompeuse** : une analogie qui induit une fausse croyance → toujours nommer la limite de l'analogie.
- **Explication monolithique** : un bloc de texte sans structure → toujours découper en étapes ou bullet points.
- **Ignorer le "pourquoi"** : expliquer le comment sans dire à quoi ça sert → le "pourquoi" vient en Étape 1 obligatoirement.
- **Faux niveau de précision** : dire "toujours" ou "jamais" pour des concepts qui ont des exceptions → qualifier avec "en général" ou "sauf si...".

---

## Bonnes pratiques 2026

- **Interactif d'abord** : proposer de couper l'explication en niveaux plutôt qu'un monologue long ; l'utilisateur peut dire "stop, j'ai compris" ou "continue".
- **Snippets exécutables** : pour les concepts de code, privilégier des exemples qu'on peut copier-coller dans un REPL ou terminal immédiatement.
- **Lier au contexte projet** : si l'utilisateur a un projet ouvert, illustrer avec les fichiers présents plutôt qu'un exemple générique.
- **Différencier théorie et pratique** : indiquer clairement quand une règle est "théoriquement correcte mais rarement vue en production".
- **Sources sans hallucination** : ne pas citer de documentation si on n'est pas certain de l'URL exacte ; dire "voir la doc officielle de [outil]" plutôt qu'inventer un lien.
