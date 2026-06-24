---
name: dev-bug-debugger
description: Aide à diagnostiquer et résoudre un bug en suivant une méthodologie structurée. À utiliser quand l'utilisateur a une erreur, un comportement inattendu ou un crash. Se déclenche aussi avec "j'ai un bug", "ça ne marche pas", "erreur", "crash", "pourquoi ça fait ça", "TypeError", "undefined", ou tout message d'erreur collé.
---

# Bug Debugger

## Étape 0 — Collecter le contexte minimal

Avant toute hypothèse, s'assurer d'avoir :

| Info | Exemples |
|---|---|
| Message d'erreur complet | stack trace, code HTTP, errno |
| Comportement attendu vs observé | "devrait retourner 200, retourne 500" |
| Reproductibilité | toujours / parfois / en prod seulement |
| Dernière modification | commit, déploiement, changement config |
| Environnement | OS, version runtime, variables d'env |

Si un de ces éléments manque et bloque le diagnostic → demander uniquement ce qui est nécessaire, pas tout à la fois.

---

## Étape 1 — Lire l'erreur sans sauter aux conclusions

```
TypeError: Cannot read properties of undefined (reading 'id')
    at getUserName (user.js:42:18)
    at processRequest (api.js:17:5)
```

- **Lire le type d'erreur** : `TypeError`, `NullReferenceException`, `SIGSEGV`…
- **Localiser le premier frame applicatif** (ignorer les frames de libs tierces).
- **Identifier l'opération qui échoue** : accès propriété, appel fonction, cast, IO…

---

## Étape 2 — Formuler 3 hypothèses classées par probabilité

Format attendu :

1. **(Probable)** `user` est `undefined` car la DB ne retourne rien pour cet ID → vérifier avec `console.log(user)` avant la ligne 42.
2. **(Possible)** La fonction est appelée avant que la promesse soit résolue → ajouter `await`.
3. **(Moins probable)** Race condition sur un cache partagé → vérifier si ça arrive en parallèle.

Règle : ne pas proposer plus de 3 hypothèses sans validation intermédiaire.

---

## Étape 3 — Vérification rapide par hypothèse

### JavaScript/TypeScript
```ts
// Inspecter sans modifier le flux
console.log('[debug] user:', JSON.stringify(user, null, 2));
// Vérifier le type exact
console.log('[debug] typeof user:', typeof user, user instanceof Object);
```

### Python
```python
import pprint
print('[debug] user:', pprint.pformat(user))
# Ou avec breakpoint natif (Python 3.7+)
breakpoint()
```

### .NET / C#
```csharp
// Ajouter un point de log avant la ligne incriminée
_logger.LogDebug("user={User}", JsonSerializer.Serialize(user));
// Ou utiliser le debugger avec Watch sur l'expression
```

### Shell / CLI
```bash
# Activer le mode verbose
set -x          # bash : affiche chaque commande avant exécution
export DEBUG=*  # Node.js : active les logs de debug des modules
```

---

## Étape 4 — Correction

Toujours présenter un diff avant/après :

```ts
// AVANT
const name = user.profile.name;

// APRÈS — avec guard null
const name = user?.profile?.name ?? 'Inconnu';
```

Expliquer **pourquoi** la correction fonctionne, pas seulement **quoi** changer.

---

## Étape 5 — Prévention

Adapter selon le contexte :

| Type de bug | Prévention recommandée |
|---|---|
| Null/undefined | TypeScript strict, optional chaining, guards |
| Race condition | mutex, transactions, idempotence |
| Régression | test unitaire couvrant le cas exact |
| Config manquante | validation au démarrage (`zod`, `pydantic`) |
| Erreur silencieuse | logger sur les catch, ne jamais `catch {}` vide |

---

## Garde-fous et anti-patterns

**Ne pas faire :**
- Modifier le code sans reproduire le bug d'abord → on peut "corriger" la mauvaise chose.
- Ajouter plusieurs changements à la fois → impossible de savoir lequel a résolu.
- Ignorer le type d'erreur et chercher directement la "solution Stack Overflow".
- Supprimer l'erreur avec un try/catch vide au lieu de traiter la cause.

**Pièges fréquents :**
- *Works on my machine* : vérifier les variables d'environnement, versions, données de test.
- *Intermittent bug* : penser ordre d'initialisation, état partagé, timeouts.
- *Après un déploiement* : vérifier la migration DB, les secrets, les dépendances mises à jour.
- *Bug en prod seulement* : vérifier les logs de prod, les permissions, le volume de données.

---

## Commandes de diagnostic utiles (copiables)

```bash
# Git — trouver le commit qui a introduit le bug
git bisect start
git bisect bad HEAD
git bisect good <commit-ok>

# Node.js — lancer avec inspect
node --inspect-brk index.js

# Docker — logs du container
docker logs --tail=100 -f <container>

# Linux — tracer les appels système
strace -p <pid> 2>&1 | grep -v ENOENT

# .NET — heap dump
dotnet-dump collect -p <pid>
```

---

## Critères de décision — quand escalader

- Le bug est dans une dépendance externe non patchée → ouvrir une issue upstream + workaround temporaire.
- La reproduction nécessite des données de production → demander un dump anonymisé ou un jeu de test équivalent.
- Le fix implique une refonte architecturale → documenter en ADR, ne pas patcher à la va-vite.
- L'erreur est liée à la sécurité (injection, overflow) → traiter comme incident, pas comme bug ordinaire.


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
