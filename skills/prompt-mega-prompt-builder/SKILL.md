---
name: prompt-mega-prompt-builder
description: Construit un mega-prompt complet et structuré à partir d'un objectif simple. À utiliser quand l'utilisateur veut créer un prompt complexe et puissant de zéro. Se déclenche aussi avec "crée un prompt pour", "mega prompt", "prompt complet", "construis un prompt", "super prompt", ou toute demande de création de prompt élaboré. Also triggers on "build a full prompt", "write a prompt for me".
---

# Mega-Prompt Builder

## Workflow

### Étape 1 — Recueil des paramètres

Avant d'écrire quoi que ce soit, extraire :

| Paramètre | Question clé |
|-----------|-------------|
| **LLM cible** | GPT-4o, Claude 3.x, Gemini, local ? |
| **Objectif principal** | Une seule phrase : "Le LLM doit…" |
| **Audience finale** | Qui lit la sortie (dev, client, outil automatisé) ? |
| **Format de sortie** | JSON, Markdown, texte libre, bullet list… |
| **Ton** | Expert, pédagogique, neutre, concis ? |
| **Contraintes dures** | Longueur max, langue, ce qui est interdit |
| **Réutilisabilité** | Prompt one-shot ou template avec variables ? |

Si plusieurs paramètres sont ambigus, poser les questions groupées en une seule fois.

---

### Étape 2 — Choix de l'architecture

Sélectionner les blocs selon le besoin :

```
[RÔLE]        — Persona du LLM (expert, outil, agent…)
[CONTEXTE]    — Background nécessaire à la tâche
[OBJECTIF]    — Tâche principale en 1-2 phrases
[INSTRUCTIONS]— Étapes numérotées, ordre chronologique
[FORMAT]      — Structure exacte de la sortie
[EXEMPLES]    — Few-shot : 1-3 paires input → output
[CONTRAINTES] — Ce qu'il ne faut PAS faire (liste)
[QUALITÉ]     — Critères de succès mesurables
[VARIABLES]   — {{placeholders}} pour la réutilisation
```

**Critères de décision — quand inclure chaque bloc :**

- `[RÔLE]` : toujours, sauf prompts ultra-courts (< 3 lignes)
- `[EXEMPLES]` : dès que le format attendu est non trivial ou que le ton est très précis
- `[CONTRAINTES]` : dès qu'il y a un risque de dérive (hallucinations, hors-sujet, verbosité)
- `[VARIABLES]` : si le prompt sera utilisé > 1 fois avec des inputs variables
- `[QUALITÉ]` : si le prompt sera évalué automatiquement (CI, eval harness)

---

### Étape 3 — Rédaction du mega-prompt

Rédiger le prompt complet, prêt à copier-coller. Exemple de structure :

```markdown
# [RÔLE]
Tu es un expert en analyse de code Python spécialisé en performance et sécurité.

# [CONTEXTE]
L'utilisateur te soumet un extrait de code Python issu d'une API REST.
Les environnements cibles sont Python 3.11+ et déploiement serverless.

# [OBJECTIF]
Analyser le code soumis et produire un rapport de revue structuré.

# [INSTRUCTIONS]
1. Identifier les problèmes de performance (O(n²), I/O bloquant, etc.)
2. Signaler les vulnérabilités OWASP Top 10 pertinentes
3. Proposer une version corrigée du code avec commentaires inline
4. Donner un score de qualité global sur 10 avec justification

# [FORMAT]
## Problèmes détectés
- [PERF|SEC|STYLE] Description — ligne X

## Code corrigé
```python
...code...
```

## Score qualité : X/10
Justification : ...

# [CONTRAINTES]
- Ne pas réécrire intégralement si le code est fonctionnel à > 80%
- Ne pas mentionner de bibliothèques non disponibles en serverless standard
- Répondre uniquement en français

# [QUALITÉ]
- Chaque problème cite le numéro de ligne
- Le code corrigé est exécutable sans modification
- Le score est justifié en 2-3 phrases

# [VARIABLES]
CODE = {{code_python}}
```

---

### Étape 4 — Version template avec placeholders

Fournir systématiquement une version avec `{{variables}}` pour la réutilisation :

```python
# Exemple d'usage programmatique (Python)
template = open("prompt.md").read()
prompt = template.replace("{{code_python}}", code_to_review)
response = client.messages.create(model="claude-opus-4-5", messages=[{"role": "user", "content": prompt}])
```

```bash
# Substitution simple en shell
sed 's/{{code_python}}/'"$(cat myfile.py)"'/g' prompt.md | pbcopy
```

---

### Étape 5 — Guide d'utilisation

Livrer systématiquement avec le prompt :

1. **Variables à remplir** : liste avec format attendu pour chaque `{{placeholder}}`
2. **Paramètres LLM recommandés** : temperature (0.0–0.3 pour tâches factuelles, 0.7–1.0 pour créatif), max_tokens
3. **Test rapide** : un exemple d'input minimal pour vérifier que le prompt fonctionne
4. **Points d'adaptation** : quelles sections modifier selon le contexte

---

## Anti-patterns et garde-fous

### Ce qu'il ne faut PAS faire

| Anti-pattern | Problème | Correction |
|---|---|---|
| Instructions contradictoires | Le LLM choisit arbitrairement | Revoir la logique, une seule règle par cas |
| Surcontraindre sans exemples | Résultat trop rigide ou mauvais | Ajouter 1-2 few-shot examples |
| Prompt > 4 000 tokens sans nécessité | Coût élevé, distraction du modèle | Découper en prompts chaînés |
| `[RÔLE]` vague ("Tu es un assistant utile") | Aucun guidage de comportement | Préciser domaine + niveau d'expertise |
| Instructions en langage naturel flou | Interprétations variables | Utiliser des listes numérotées + mots-clés |
| Mélanger langue FR/EN dans les instructions | Confusion du modèle | Choisir une langue, termes techniques EN OK |
| Pas de `[CONTRAINTES]` | Dérives, hallucinations, verbosité | Toujours lister 3-5 interdits explicites |

### Pièges spécifiques 2025-2026

- **Context window** : Claude 3.x / GPT-4o supportent 128k–200k tokens, mais la précision décline au-delà de 50k tokens d'input ; éviter de coller des fichiers entiers si non nécessaire.
- **System vs User prompt** : les instructions de comportement stables vont dans le `system prompt`, le contenu variable dans le `user prompt`.
- **Few-shot ordering** : placer les exemples les plus représentatifs en dernier (effet de récence).
- **JSON mode** : si la sortie doit être du JSON strict, activer le mode `response_format: {type: "json_object"}` côté API plutôt que de l'imposer via le prompt seul.
- **Prompt injection** : si des données externes (fichiers, web) sont injectées, isoler avec des balises claires : `<user_data>...</user_data>`.

---

## Bonnes pratiques 2026

- **Versionner les prompts** comme du code : fichier `.md` ou `.txt` dans le repo, changelog.
- **Eval avant déploiement** : tester sur ≥ 10 exemples représentatifs avant usage en production.
- **Prompt court + RAG > prompt long** : injecter uniquement le contexte pertinent via retrieval plutôt que tout coller.
- **Séparation des responsabilités** : un prompt = une tâche. Chaîner pour les pipelines complexes.
- **Commentaires dans le prompt** : les LLM modernes ignorent les commentaires HTML `<!-- -->` ; utiliser pour documenter sans affecter la sortie.


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
