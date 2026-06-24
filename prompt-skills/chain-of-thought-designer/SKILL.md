---
name: chain-of-thought-designer
description: Conçoit des prompts avec raisonnement en chaîne pour des tâches complexes nécessitant de la logique multi-étapes. À utiliser pour analyse, résolution de problèmes, mathématiques, logique ou décisions complexes. Se déclenche aussi avec "chain of thought", "raisonnement étape par étape", "prompt logique", "tâche complexe", "décomposer le raisonnement", ou toute tâche nécessitant un raisonnement structuré.
---

# Chain of Thought Designer

## Critères de décision — Quand utiliser CoT ?

| Situation | Approche recommandée |
|---|---|
| Réponse factuelle simple | Prompt direct, pas de CoT |
| Calcul ou logique multi-étapes | **Zero-shot CoT** |
| Tâche répétitive avec format strict | **Structured CoT** |
| Erreurs fréquentes sur un type de raisonnement | **Few-shot CoT** |
| Agents autonomes / tool calling | **Self-consistency + vérification** |
| Sortie critique (finance, médical, code) | **CoT + validation explicite** |

Règle de base : si un humain expert ferait une brouillon avant de répondre, utilisez CoT.

---

## Étape 1 — Cadrer la tâche

Répondre à ces 4 questions avant de concevoir le prompt :

1. **Input** : quel format d'entrée (texte libre, JSON, question, code) ?
2. **Output attendu** : nombre, décision binaire, texte structuré, code ?
3. **Complexité** : combien de sous-étapes de raisonnement minimum ?
4. **Sensibilité** : une erreur intermédiaire silencieuse est-elle acceptable ?

---

## Étape 2 — Décomposition logique

Lister les sous-questions dans l'ordre de dépendance :

```
Tâche : "Évaluer si une transaction est frauduleuse"

1. Quel est le montant et la devise ? → normaliser
2. L'heure est-elle inhabituelle pour ce compte ?
3. La localisation correspond-elle au profil ?
4. Y a-t-il eu plusieurs tentatives récentes ?
5. Score de risque global → décision binaire
```

Chaque étape doit produire une valeur utilisée par la suivante. Si ce n'est pas le cas, la décomposition est incomplète.

---

## Étape 3 — Patterns de prompt

### Zero-shot CoT
La formule la plus simple. Ajouter à la fin du prompt :

```
Raisonne étape par étape avant de donner ta réponse finale.
```

Variantes efficaces (2026) :
```
Avant de répondre, expose ton raisonnement en détail.
Pense à voix haute, puis conclus.
Let's think step by step.   # anglais reste plus performant sur certains modèles
```

### Structured CoT
Pour forcer un format de sortie prévisible :

```
Réponds en suivant exactement cette structure :

ÉTAPE 1 — Identification : [que sais-tu avec certitude ?]
ÉTAPE 2 — Analyse : [quelles déductions logiques ?]
ÉTAPE 3 — Vérification : [y a-t-il une contradiction ou un cas limite ?]
ÉTAPE 4 — Conclusion : [réponse finale et niveau de confiance]
```

### Few-shot CoT
Fournir 1 à 3 exemples complets avec le raisonnement visible :

```
Exemple :
Q : Un train part à 14h00 à 120 km/h. Un autre part à 15h00 à 160 km/h dans le même sens. À quelle heure le second rattrape-t-il le premier ?

Raisonnement :
- À 15h00, le premier train a 1h d'avance = 120 km d'écart.
- Vitesse relative du second = 160 - 120 = 40 km/h.
- Temps pour combler l'écart = 120 / 40 = 3 heures.
- Le second rattrape le premier à 15h00 + 3h = 18h00.

Réponse : 18h00.

---
Maintenant résous : [NOUVELLE QUESTION]
```

### Self-Consistency (pour tâches critiques)
Demander N raisonnements indépendants, prendre la réponse majoritaire :

```
Résous ce problème de 3 façons différentes, en partant d'angles différents.
Compare tes 3 réponses. Si elles divergent, identifie l'erreur et corrige.
Donne ensuite ta réponse finale.
```

### Plan-then-Execute (agents / tâches longues)
```
PHASE 1 — Plan : liste les étapes nécessaires sans encore les exécuter.
PHASE 2 — Validation du plan : y a-t-il des dépendances manquantes ou des risques ?
PHASE 3 — Exécution : exécute chaque étape dans l'ordre, en marquant chaque résultat intermédiaire.
PHASE 4 — Synthèse finale.
```

---

## Étape 4 — Prompt final prêt à l'emploi

Structure type à copier :

```
[CONTEXTE / RÔLE]
Tu es un expert en [domaine]. 

[TÂCHE]
[Description précise de ce que tu demandes]

[DONNÉES D'ENTRÉE]
[Insérer ici les données ou laisser un placeholder {{input}}]

[INSTRUCTIONS DE RAISONNEMENT]
Avant de donner ta réponse, raisonne étape par étape :
1. Identifie les éléments clés.
2. Analyse chaque élément.
3. Vérifie les hypothèses.
4. Conclus.

[FORMAT DE SORTIE]
Réponds avec :
- Raisonnement : [ton analyse en bullet points]
- Réponse finale : [réponse concise]
- Niveau de confiance : [élevé / moyen / faible] + justification si moyen/faible
```

---

## Étape 5 — Validation du prompt

Tester avec au moins 3 cas :

| Type de cas | Objectif |
|---|---|
| **Cas nominal** | Vérifier que le raisonnement mène au bon résultat |
| **Cas limite** | Input ambigu ou incomplet — le modèle doit signaler l'incertitude |
| **Cas piège** | Problème où l'intuition est fausse mais le CoT corrige |

**Exemple de cas piège classique :**
```
Q : "Si 5 machines fabriquent 5 pièces en 5 minutes, combien de minutes faut-il
     à 100 machines pour fabriquer 100 pièces ?"
Réponse intuitive (fausse) : 100 minutes.
CoT correct : 1 machine = 1 pièce en 5 min → 100 machines = 100 pièces en 5 min.
```

---

## Garde-fous et anti-patterns

**Ne pas faire :**
- Demander CoT sur une tâche triviale → surcharge inutile, verbosité sans valeur
- Oublier de spécifier le format de sortie → raisonnement visible mais conclusion noyée
- Utiliser CoT seul pour des tâches critiques sans validation externe
- Chaîner plus de 7-8 étapes sans checkpoint intermédiaire (dérive du contexte)
- Mélanger raisonnement et exécution dans le même token stream sans séparateur clair

**Signaux d'alerte sur un prompt CoT existant :**
- Le modèle saute des étapes ou les réordonne → reforcer avec `Structured CoT`
- Le raisonnement est correct mais la conclusion est erronée → ajouter `Vérifie ta conclusion par rapport à ton raisonnement`
- Résultats incohérents entre runs → utiliser `Self-Consistency`
- Le raisonnement est verbeux sans valeur → simplifier le nombre d'étapes demandées

---

## Bonnes pratiques 2026

- **Séparer raisonnement et réponse** avec des balises XML (`<thinking>...</thinking>` puis `<answer>...</answer>`) — Claude et GPT-4o les respectent mieux que les headers Markdown dans les pipelines programmatiques.
- **Préférer l'anglais** pour les instructions de raisonnement sur les benchmarks numériques et logiques — les modèles ont été davantage entraînés en anglais sur ces domaines.
- **Limiter la température** (0.0–0.3) pour les tâches de raisonnement logique strict ; monter à 0.5–0.7 uniquement pour la génération créative avec CoT.
- **Cacher le raisonnement** à l'utilisateur final si nécessaire : générer en deux appels (1er appel CoT interne, 2e appel synthèse uniquement).
- **Versionner les prompts CoT** comme du code — un changement mineur de formulation peut dégrader significativement les performances.
