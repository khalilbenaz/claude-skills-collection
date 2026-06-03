---
name: workflows
description: Orchestration multi-agent déterministe avec le tool natif Workflow de Claude Code. Conçoit des scripts qui fan-out, vérifient et synthétisent sur de nombreux sous-agents (pipeline, parallel, adversarial verify, judge panel, loop-until-dry). Se déclenche avec "workflow", "orchestrer des agents", "fan-out", "multi-agent", "paralléliser des sous-agents", "audit exhaustif", "vérification adversariale", "/workflows".
---

# Workflows — Orchestration multi-agent native

## Quand utiliser ce skill
Utilise ce skill quand une tâche dépasse ce qu'un seul contexte peut traiter et bénéficie d'une **structure d'agents** : couvrir en parallèle (décomposer un large périmètre), gagner en confiance (perspectives indépendantes + vérification adversariale avant de conclure), ou absorber une échelle qu'un contexte ne tient pas (migrations, audits, sweeps). Le tool `Workflow` exécute un script JavaScript qui orchestre des sous-agents de façon **déterministe** (boucles, conditions, fan-out) — contrairement à un agent unique piloté par le modèle.

**Opt-in requis** : ne lance un workflow que si l'utilisateur l'a explicitement demandé (mot-clé "workflow", "fan-out", "orchestre avec des sous-agents", session ultracode, ou skill/commande qui l'impose). Sinon, propose-le brièvement avec une estimation de coût.

## Workflow

1. **Scoper le travail d'abord (inline)** — Avant d'orchestrer, découvre la work-list en ligne : liste les fichiers, trouve les cibles, scope le diff. Le hybride est souvent le bon move : scout inline → puis `Workflow` pour pipeliner sur la liste. Tu n'as pas besoin de connaître la forme avant la *tâche*, seulement avant l'*étape d'orchestration*.

2. **Choisir la phase** — Identifie une seule phase bien scopée par appel : `understand` (lecteurs parallèles → carte structurée), `design` (panel de juges sur N approches → synthèse scorée), `review` (dimensions → find → verify adversarial), `research` (sweep multi-modal → deep-read → synthèse), `migrate` (découvrir les sites → transformer chacun en worktree isolé → vérifier). Pour du multi-phase, enchaîne plusieurs workflows et lis chaque résultat avant de décider le suivant.

3. **Écrire le bloc `meta`** — Tout script commence par `export const meta = {...}` en **littéral pur** (pas de variables, d'appels, de spreads). Champs requis : `name`, `description`. Optionnels : `whenToUse`, `phases` (un objet par `phase()` avec `title` exact). Exemple :
   ```js
   export const meta = {
     name: 'review-changes',
     description: 'Revue multi-dimension du diff, chaque finding vérifié',
     phases: [{ title: 'Review' }, { title: 'Verify' }],
   }
   ```

4. **Préférer `pipeline()` par défaut** — `pipeline(items, stage1, stage2, ...)` fait passer chaque item par toutes les étapes **sans barrière** : l'item A peut être en stage 3 pendant que B est en stage 1. Wall-clock = chaîne la plus lente, pas somme-des-plus-lents-par-étape. Chaque callback reçoit `(prevResult, originalItem, index)`.
   ```js
   const results = await pipeline(
     DIMENSIONS,
     d => agent(d.prompt, {label: `review:${d.key}`, phase: 'Review', schema: FINDINGS}),
     review => parallel(review.findings.map(f => () =>
       agent(`Vérifie de façon adversariale: ${f.title}`, {phase: 'Verify', schema: VERDICT})
         .then(v => ({...f, verdict: v}))))
   )
   const confirmed = results.flat().filter(Boolean).filter(f => f.verdict?.isReal)
   ```

5. **N'utiliser `parallel()` (barrière) que si nécessaire** — `parallel(thunks)` attend TOUS les résultats. Justifié uniquement quand l'étape N a besoin du set complet de l'étape N-1 : dedup/merge global, early-exit sur count zéro, ou prompt qui référence "les autres findings". PAS justifié par "je dois flatten/filter d'abord" (fais-le dans une étape de pipeline) ni "c'est plus propre". Un thunk qui throw → `null` dans le résultat ; `.filter(Boolean)` avant usage.

6. **Sortie structurée via `schema`** — Sans schema, `agent()` renvoie son texte final (string). Avec `schema` (JSON Schema), le sous-agent est forcé d'appeler `StructuredOutput` et `agent()` renvoie l'objet validé — pas de parsing, retry automatique sur mismatch. Renvoie `null` si l'utilisateur skip l'agent → filtrer.

7. **Patterns qualité** — Compose selon la tâche :
   - **Adversarial verify** : N sceptiques indépendants par finding, chacun promptés pour *réfuter* ; on tue si majorité réfute.
   - **Perspective-diverse verify** : si un finding peut échouer de plusieurs façons, donne à chaque vérificateur une lentille distincte (correctness, security, perf, repro) plutôt que N réfuteurs identiques.
   - **Judge panel** : N tentatives sous angles différents (MVP-first, risk-first, user-first), scorées par juges parallèles, synthèse du gagnant + greffe des meilleures idées des autres.
   - **Loop-until-dry** : pour de la découverte de taille inconnue (bugs, edge cases), relance des finders jusqu'à K rounds consécutifs sans rien de neuf. Dedup contre `seen` (tout ce qui a été vu), PAS contre `confirmed` — sinon les findings rejetés réapparaissent et ça ne converge jamais.
   - **Completeness critic** : un agent final qui demande "qu'est-ce qui manque — modalité non explorée, claim non vérifié, source non lue ?". Ce qu'il trouve devient le round suivant.

8. **Scaler au budget** — `budget.total` (cible de tokens, `null` si non fixée), `budget.spent()`, `budget.remaining()`. Boucle dynamique avec garde sur `budget.total` (sinon `remaining()` vaut `Infinity` et tu cours jusqu'au cap de 1000 agents) :
   ```js
   while (budget.total && budget.remaining() > 50_000) {
     const r = await agent("Trouve des bugs.", {schema: BUGS})
     bugs.push(...r.bugs)
     log(`${bugs.length} trouvés, ${Math.round(budget.remaining()/1000)}k restants`)
   }
   ```

9. **Itérer & resume** — Chaque invocation persiste son script sous le dossier de session et renvoie le `scriptPath` + un `runId`. Pour itérer : édite le fichier et relance avec `{scriptPath}`. Pour reprendre après un kill/edit : `{scriptPath, resumeFromRunId}` — le plus long préfixe inchangé d'appels `agent()` renvoie en cache instantanément, le premier appel modifié et tout ce qui suit s'exécute en live.

10. **Rester dans la boucle** — `Workflow` tourne en arrière-plan et renvoie immédiatement un task ID ; une `<task-notification>` arrive à la fin. Suis la progression live via `/workflows`. Pour du travail large, enchaîne plusieurs workflows en séquence — lis chaque résultat avant de décider la phase suivante.

## Règles

- **`pipeline()` par défaut, `parallel()` seulement en cas de dépendance cross-item réelle** — une barrière injustifiée gaspille le wall-clock des agents rapides qui attendent le plus lent.
- **`meta` est un littéral pur** — pas de variables, d'appels de fonction, de spreads, ni d'interpolation de template, sinon parse error. Mêmes titres dans `meta.phases` que dans les `phase()`.
- **JavaScript, pas TypeScript** — annotations de type (`: string[]`), interfaces et generics échouent au parse. Corps en contexte async : `await` direct.
- **`Date.now()` / `Math.random()` / `new Date()` argless throw** — ils casseraient le resume. Passe les timestamps via `args`, stampe après le retour, varie l'aléatoire par index.
- **Concurrence cappée** à `min(16, cœurs-2)` simultanés par workflow ; le reste fait la queue. Cap de vie : 1000 agents (backstop anti-runaway).
- **Pas de cap silencieux** — si le workflow borne la couverture (top-N, no-retry, sampling), `log()` ce qui est laissé de côté ; une troncature silencieuse se lit comme "tout couvert" alors que non.
- **`opts.isolation: 'worktree'`** uniquement quand des agents mutent des fichiers en parallèle et entreraient en conflit (coûteux : ~200-500ms + disque par agent ; worktree auto-supprimé si inchangé).
- **`opts.model` à omettre par défaut** — l'agent hérite du modèle de la boucle principale, ce qui est presque toujours correct ; ne le force que si tu es très confiant qu'un autre tier convient.
- **Scaler à la demande** — "trouve les bugs" → quelques finders, vote simple. "audit exhaustif / sois complet" → grand pool de finders, pass adversarial 3-5 votes, étape de synthèse.


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
