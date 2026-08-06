---
name: optimizer
description: Analyse et améliore un prompt existant pour obtenir de meilleurs résultats avec un LLM. À utiliser quand l'utilisateur a un prompt qui ne donne pas les résultats voulus ou veut l'améliorer. Se déclenche aussi avec "améliore mon prompt", "optimise ce prompt", "mon prompt ne marche pas", "meilleur prompt", "prompt engineering", ou toute demande d'amélioration de prompt. Also triggers on "improve my prompt", "optimize this prompt", "better results from the model".
---

# Prompt Optimizer

## Étape 1 — Collecte d'infos (si manquantes)

Avant d'analyser, vérifie que tu as :
- **Le prompt brut** à optimiser (obligatoire).
- **Le LLM cible** : GPT-4o, Claude, Gemini, Llama 3, Mistral… (influence les délimiteurs et la longueur optimale).
- **Le problème observé** : sortie trop vague, format non respecté, hallucinations, trop longue, hors-sujet.
- **L'usage** : system prompt, one-shot, few-shot, chain, RAG, agent.

Si rien n'est précisé, optimise pour Claude Sonnet et documente les hypothèses.

---

## Étape 2 — Audit (grille 7 critères)

Score rapide 1-5 ; ne justifie que les cases ≤ 3.

| Critère | Score | Problème identifié |
|---------|-------|--------------------|
| Clarté de la tâche | | |
| Spécificité / périmètre | | |
| Contexte (rôle, audience, domaine) | | |
| Exemples few-shot (0 = aucun) | | |
| Contraintes / garde-fous | | |
| Format de sortie défini | | |
| Longueur / densité adaptée | | |

**Seuils d'action** :
- Score moyen < 3 → réécriture complète.
- 1-2 critères ≤ 2 → réécriture ciblée.
- Tous ≥ 4 → micro-ajustements + variante.

---

## Étape 3 — Techniques disponibles (choisir selon diagnostic)

### Rôle + contexte
```
Tu es un [rôle expert] travaillant pour [contexte].
Ton audience est [profil]. Ton objectif est [but précis].
```

### Few-shot (2-3 exemples structurés)
```
Entrée : [exemple 1]
Sortie : [sortie attendue 1]

Entrée : [exemple 2]
Sortie : [sortie attendue 2]

Entrée : {{USER_INPUT}}
Sortie :
```
> Règle : les exemples doivent couvrir des cas-limites, pas seulement le cas nominal.

### Chain-of-thought
```
Avant de répondre, raisonne étape par étape dans un bloc <thinking>…</thinking>.
Fournis uniquement la réponse finale hors de ce bloc.
```

### Contraintes négatives
```
Ne génère PAS de code commenté en français si les noms de variables sont en anglais.
Ne dépasse PAS 200 mots.
N'invente JAMAIS de référence bibliographique.
```

### Format de sortie explicite
```
Réponds UNIQUEMENT en JSON valide, sans markdown, avec ce schéma :
{"titre": string, "score": number, "recommandations": string[]}
```

### Délimiteurs XML (recommandés pour Claude)
```xml
<context>…</context>
<instructions>…</instructions>
<examples>…</examples>
<input>{{USER_INPUT}}</input>
```

### Décomposition (prompts longs)
Découpe en sous-prompts enchaînés : extraction → analyse → formatage.
Utilise un prompt de coordination si c'est un agent.

---

## Étape 4 — Prompt optimisé

Produis le prompt réécrit **en bloc de code copiable**, puis annote chaque section avec `// → raison`.

Exemple de structure annotée :
```
Tu es un expert en sécurité applicative (OWASP Top 10). // → rôle ancré
Analyse le code suivant et identifie les vulnérabilités. // → tâche précise

<code>
{{CODE}}
</code>

Pour chaque vulnérabilité trouvée :
1. Nom (CWE si disponible) // → format structuré
2. Ligne concernée
3. Risque (critique/haut/moyen/faible)
4. Correction recommandée (max 3 lignes de code)

Ne signale PAS les warnings de style ou de linting. // → contrainte négative
```

---

## Étape 5 — Variantes

Fournis systématiquement deux versions :

**Version minimale** — efficace en tokens, idéale pour API à coût par token :
```
[version courte — ≤ 5 lignes, essentiel uniquement]
```

**Version complète** — contrôle maximal, idéale pour production / system prompt :
```
[version longue — rôle + contexte + exemples + contraintes + format]
```

---

## Étape 6 — Validation

Propose 3 inputs de test couvrant :
1. **Cas nominal** — entrée standard.
2. **Cas limite** — entrée ambiguë ou incomplète.
3. **Cas adversarial** — entrée qui pourrait faire dérailler le prompt original.

Indique le comportement attendu pour chacun.

---

## Garde-fous et anti-patterns

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| Prompt "mille-feuille" | > 10 instructions mélangées | Décomposer en sous-prompts |
| Rôle générique | "Tu es un assistant utile" | Spécifier le domaine et le niveau d'expertise |
| Format implicite | Le LLM choisit markdown ou prose aléatoirement | Toujours déclarer le format de sortie attendu |
| Few-shot biaisé | Tous les exemples sont du même type | Diversifier (cas limites inclus) |
| Contraintes en double négatif | "Ne pas ne pas faire X" | Reformuler en positif clair |
| Température ignorée | Créativité vs déterminisme non contrôlée | Mentionner `temperature=0` pour tâches déterministes |
| Variables non balisées | `{input}` confondu avec texte littéral | Utiliser `{{double_accolades}}` ou balises XML |

---

## Bonnes pratiques 2026

- **Claude Sonnet / Opus** : préférer les balises XML aux triples backticks pour délimiter les blocs de données.
- **GPT-4o** : les instructions system + user séparées surpassent un prompt unique long.
- **Llama 3 / Mistral** : éviter les instructions imbriquées profondes ; privilégier les listes numérotées.
- **RAG** : toujours isoler le contexte récupéré dans une balise dédiée (`<retrieved_context>`) pour éviter la contamination du raisonnement.
- **Agents** : chaque tool call doit avoir une instruction de fallback explicite en cas d'échec.
- **Coût** : un prompt few-shot bien construit réduit souvent les tokens de sortie de 30-50 % (moins de reformulations inutiles).
