---
name: code-reviewer
description: Revue de code structurée avec détection de bugs, suggestions d'amélioration et bonnes pratiques. À utiliser quand l'utilisateur colle du code et demande un avis, une revue ou des améliorations. Se déclenche aussi avec "revois mon code", "code review", "améliore ce code", "qu'est-ce qui ne va pas dans mon code", "est-ce que ce code est bon". Also triggers on "review my code", "check this PR", "is this code good".
---

# Code Reviewer

## Workflow de revue (étapes dans l'ordre)

### 1. Contexte avant tout
Avant d'analyser une ligne : identifier le langage, le framework, et l'intention du code. Si le contexte manque et est déterminant, poser UNE question ciblée. Sinon, déduire et avancer.

### 2. Analyse sur 5 axes — ordre de criticité décroissant

#### 🔴 Axe 1 — Bugs & correctness
- Race conditions, nullpointer / undefined, edge cases non gérés (tableau vide, valeur négative, overflow)
- Mauvaise gestion des erreurs : `catch` vide, erreur avalée, retry sans backoff
- Off-by-one, mauvaise comparaison (`==` vs `===`, `=` au lieu de `==`)

**Exemple concret :**
```python
# ❌ Bug silencieux
def get_user(id):
    try:
        return db.query(f"SELECT * FROM users WHERE id={id}")
    except:
        pass  # exception avalée, retourne None sans le signaler

# ✅ Correct
def get_user(user_id: int) -> User | None:
    try:
        return db.query("SELECT * FROM users WHERE id = ?", (user_id,))
    except DatabaseError as e:
        logger.error("get_user failed: %s", e)
        raise
```

#### 🔴 Axe 2 — Sécurité
- Injection SQL/NoSQL/command : interpolation de chaîne dans une requête → requête paramétrée
- Secrets en dur : clé API, mot de passe dans le code → variable d'environnement / vault
- Données sensibles exposées dans les logs ou les réponses API
- Autorisation manquante (endpoint accessible sans auth)
- Désérialisation non sécurisée, path traversal

**Commande rapide audit dépendances :**
```bash
# npm / Node
npm audit --audit-level=high

# Python
pip-audit

# .NET
dotnet list package --vulnerable
```

#### 🟡 Axe 3 — Performance
- Complexité algorithmique : O(n²) évitable, boucle dans une boucle avec accès DB
- N+1 : requête dans une boucle → eager load ou batch
- Allocation inutile en boucle critique (création d'objets, concaténation de string)
- Pas de cache sur des résultats coûteux et stables

**Exemple N+1 → batch :**
```typescript
// ❌ N+1
for (const order of orders) {
  order.user = await db.users.findById(order.userId); // 1 requête/itération
}

// ✅ Batch
const ids = orders.map(o => o.userId);
const users = await db.users.findByIds(ids); // 1 requête
const userMap = Object.fromEntries(users.map(u => [u.id, u]));
orders.forEach(o => (o.user = userMap[o.userId]));
```

#### 🟡 Axe 4 — Lisibilité & maintenabilité
- Nommage : `data`, `temp`, `x` → noms qui expriment l'intention
- Fonction longue (>30 lignes) → extraire des sous-fonctions nommées
- Commentaires qui paraphrasent le code au lieu d'expliquer le *pourquoi*
- Magic numbers : `86400` → `const SECONDS_PER_DAY = 86_400`
- Nesting profond (>3 niveaux) → early return / guard clauses

#### 🟢 Axe 5 — Bonnes pratiques & patterns
- DRY : copier-coller détecté → extraire
- SOLID : classe qui fait trop de choses, dépendances dures au lieu d'injection
- Gestion des types : `any` en TypeScript, absence de type hints en Python
- Tests : code non testable (dépendances statiques, side effects cachés)
- Immutabilité : mutation de paramètres, state partagé sans lock

### 3. Priorisation & format de sortie

Classer chaque finding selon ce tableau :

| Niveau | Critère | Action |
|--------|---------|--------|
| **CRITIQUE** | Bug fonctionnel ou faille de sécurité exploitable | Bloquer le merge |
| **IMPORTANT** | Dégradation significative perf/maintenabilité | Corriger avant merge |
| **SUGGESTION** | Amélioration de style ou pattern alternatif | À discuter |

### 4. Format de chaque finding

```
[NIVEAU] Titre court
Problème : ...
Correction :
```code corrigé```
```

### 5. Résumé final obligatoire

- **Note globale** : ✅ Prêt à merger / ⚠️ À corriger / 🚫 Refactoring nécessaire
- **Top 3 actions prioritaires** (numérotées)
- **Points forts** du code (au moins 1 si applicable)

---

## Garde-fous & anti-patterns à signaler systématiquement

| Anti-pattern | Symptôme | Remède |
|---|---|---|
| Swallowed exception | `catch {}` vide ou `catch (e) { }` | Logger + propager ou retourner Result |
| God function | Fonction > 50 lignes avec 3+ responsabilités | Extraire, nommer, tester |
| Primitive obsession | `userId: string` partout sans type dédié | Value object ou branded type |
| Couplage fort | `new ServiceX()` dans la logique métier | Injection de dépendance |
| Boolean trap | `doThing(true, false, true)` | Named params ou options object |
| Mutation de tableau en place | `array.sort()` modifie l'original | `[...array].sort()` |
| Await dans une boucle | `for...of` avec `await` séquentiel inutile | `Promise.all(items.map(async...))` |

---

## Checklist rapide par langage

**TypeScript/JavaScript**
- [ ] `any` absent ou justifié
- [ ] Pas de `==` (utiliser `===`)
- [ ] Promesses gérées (`await` ou `.catch`)
- [ ] `const` par défaut, `let` si mutation nécessaire

**Python**
- [ ] Type hints présents sur les fonctions publiques
- [ ] Context managers (`with`) pour les ressources
- [ ] f-strings ou `.format()`, pas de `%s` mélangé
- [ ] Pas d'argument mutable par défaut (`def f(x=[])`)

**C# / .NET**
- [ ] `IDisposable` implémenté et appelé (`using`)
- [ ] `async/await` sur toute la chaîne (pas de `.Result` bloquant)
- [ ] Nullability annotations activées
- [ ] EF Core : pas de `ToList()` prématuré avant filtrage

**SQL (embedded)**
- [ ] Requêtes paramétrées uniquement
- [ ] Index sur les colonnes filtrées/jointures fréquentes
- [ ] Pas de `SELECT *` en production

---

## Règles opérationnelles

- Si le code est bon → le dire clairement, citer 2-3 points forts.
- Ne jamais lister plus de 7 findings : regrouper les problèmes similaires.
- Toujours proposer le code corrigé, pas seulement la critique.
- Adapter le niveau de détail au contexte : snippet de 10 lignes ≠ PR de 500 lignes.
- Signaler si des tests unitaires seraient suffisants pour couvrir les risques identifiés.
