---
name: code-documentation-pro
description: Documentation de code avec commentaires, docstrings et annotations de qualité. Se déclenche avec "documenter mon code", "commentaires", "docstring", "JSDoc", "XML doc", "annotations", "code comments", "autodoc". Also triggers on "document this code", "write docstrings", "add code comments".
---

# Code Documentation Pro

## Philosophie : commenter le POURQUOI, pas le QUOI

Le code bien écrit s'auto-documente (noms clairs, fonctions courtes, types expressifs).
Un commentaire qui répète le code est du bruit. Un commentaire qui explique une décision non-évidente est de la valeur.

```python
# BAD — répète le code
i += 1  # incrémente i

# GOOD — explique la contrainte métier
i += 1  # l'index commence à 1 côté API fournisseur (spec §4.2), pas 0
```

---

## Workflow en étapes

### 1. Choisir le format adapté au langage

| Langage | Format | Outils de génération |
|---------|--------|----------------------|
| Python | Google style / NumPy style | Sphinx + autodoc, pdoc |
| TypeScript / JavaScript | JSDoc (`/** */`) | TypeDoc |
| C# | XML doc (`///`) | DocFX, Sandcastle |
| Java | Javadoc (`/** */`) | Javadoc CLI, Dokka |
| Go | GoDoc (commentaire au-dessus du symbole) | `go doc`, pkg.go.dev |
| C++ | Doxygen | Doxygen |

### 2. Structurer chaque docstring publique

Ordre canonique : description courte → paramètres → retour → exceptions → exemple.

**Python (Google style) :**
```python
def charge_payment(amount: Decimal, currency: str, idempotency_key: str) -> PaymentResult:
    """Débite le montant depuis la passerelle configurée.

    N'effectue aucune opération si la clé d'idempotence est déjà connue (replay safe).

    Args:
        amount: Montant en unité principale (ex: 10.50 pour 10,50 TND).
        currency: Code ISO 4217 en majuscules (ex: "TND").
        idempotency_key: UUID v4 unique par tentative, persisté avant l'appel.

    Returns:
        PaymentResult avec status, transaction_id et timestamp.

    Raises:
        InsufficientFundsError: Si le solde est insuffisant.
        GatewayTimeoutError: Si la passerelle ne répond pas en < 10 s.

    Examples:
        >>> result = charge_payment(Decimal("50.00"), "TND", str(uuid4()))
        >>> assert result.status == "SUCCESS"
    """
```

**TypeScript (JSDoc) :**
```typescript
/**
 * Génère un token JWT signé avec rotation automatique des clés.
 *
 * @param payload - Données à embarquer ; ne pas inclure de PII sensibles.
 * @param ttlSeconds - Durée de validité en secondes (défaut : 3600).
 * @returns Token signé ou lève une erreur si le keystore est indisponible.
 * @throws {KeystoreUnavailableError} Quand aucune clé active n'est trouvée.
 * @example
 * const token = generateJwt({ userId: "u_123", role: "admin" });
 */
export function generateJwt(payload: JwtPayload, ttlSeconds = 3600): string { ... }
```

**C# (XML doc) :**
```csharp
/// <summary>
/// Calcule la commission nette après déduction des frais plateforme.
/// </summary>
/// <param name="grossAmount">Montant brut en millimes.</param>
/// <param name="feeRate">Taux plateforme entre 0 et 1 (ex: 0.015 = 1,5 %).</param>
/// <returns>Commission nette en millimes, toujours positive.</returns>
/// <exception cref="ArgumentOutOfRangeException">
/// Levée si <paramref name="feeRate"/> est hors [0, 1].
/// </exception>
public static long ComputeNetCommission(long grossAmount, decimal feeRate) { ... }
```

### 3. Commenter les cas non-évidents dans le corps

```typescript
// Intentionnellement séquentiel (pas Promise.all) : la passerelle rejette
// les appels parallèles avec le même merchantId — ticket #4521
for (const batch of batches) {
  await processBatch(batch);
}
```

```python
# Workaround SDK v2.3 : le champ `created_at` arrive en epoch ms malgré la spec ISO 8601
# Supprimer après upgrade vers v3.x (voir issue #892)
ts = datetime.fromtimestamp(raw["created_at"] / 1000, tz=timezone.utc)
```

### 4. Utiliser les types comme documentation exécutable

Préférer des types expressifs aux primitives nues :

```typescript
// BAD
function transfer(from: string, to: string, amount: number): boolean

// GOOD
function transfer(from: AccountId, to: AccountId, amount: MoneyMillimes): TransferResult
```

En Python, utiliser `TypeAlias` et `NewType` :
```python
from typing import NewType
UserId = NewType("UserId", str)
AmountMillimes = NewType("AmountMillimes", int)
```

### 5. Documenter les TODO/FIXME avec contexte

Format recommandé :
```python
# TODO(k.benazzouz, 2026-06): supprimer après migration schéma v4 — voir ADR-012
# FIXME(team-payment): race condition possible si deux workers traitent le même idempotency_key simultanément
```

### 6. Configurer la génération automatique

**Python (Sphinx + autodoc) :**
```bash
pip install sphinx sphinx-autodoc-typehints
sphinx-quickstart docs/
# Dans conf.py :
extensions = ["sphinx.ext.autodoc", "sphinx_autodoc_typehints"]
# Générer :
make -C docs html
```

**TypeScript (TypeDoc) :**
```bash
npx typedoc --entryPointStrategy expand src --out docs/api
```

**CI GitHub Actions :**
```yaml
- name: Generate docs
  run: npx typedoc --out docs/api
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v4
  with:
    publish_dir: docs/api
```

### 7. Linter la documentation

```bash
# Python
pip install pydocstyle
pydocstyle --convention=google src/

# TypeScript (ESLint)
npm install eslint-plugin-jsdoc
# .eslintrc : "plugins": ["jsdoc"], "extends": ["plugin:jsdoc/recommended"]
npx eslint src/ --rule 'jsdoc/require-jsdoc: warn'

# C# (via Roslyn analyzer, dans .csproj)
# <GenerateDocumentationFile>true</GenerateDocumentationFile>
```

### 8. Documenter l'architecture au niveau module

Chaque package/module expose un `README.md` minimal :
- Rôle du module (1-2 phrases)
- Dépendances directes et leurs raisons
- Patterns utilisés (ex: Repository, CQRS)
- Invariants et contraintes (ex: "toutes les mutations passent par le CommandBus")

---

## Critères de décision

| Situation | Action |
|-----------|--------|
| Fonction publique d'une librairie/API | Docstring complète obligatoire |
| Fonction privée triviale (< 5 lignes, nom explicite) | Pas de docstring nécessaire |
| Algorithme complexe ou optimisation non-évidente | Commentaire + référence (article, issue, ADR) |
| Workaround ou hack temporaire | Commentaire avec auteur, date, lien ticket |
| Code de sécurité / paiement | Documenter les invariants, pré/post-conditions |
| Module public stable | README + génération auto dans CI |

---

## Anti-patterns et pièges

- **Commentaire qui ment** : un commentaire obsolète est pire qu'aucun commentaire. Revoir en même temps que le code qu'il décrit.
- **Sur-documentation du code trivial** : `// retourne true si actif` au-dessus de `return this.isActive` — inutile.
- **Docstring sans exemple pour les cas complexes** : les exemples réduisent les allers-retours des consommateurs de l'API.
- **TODO sans propriétaire ni date** : devient un commentaire fantôme jamais traité.
- **Documentation séparée du code** : le code change, le doc Word ne suit pas. Seul autodoc est fiable.
- **Traduire le type dans le texte** : `@param amount {number}` en JSDoc quand TypeScript infère déjà le type — redondant, peut diverger.
- **Oublier les exceptions** : la moitié des bugs consommateur vient d'une exception non-documentée.

---

## Bonnes pratiques 2026

- Activer `strict` TypeScript + `py.typed` marker pour que l'IDE affiche les docstrings inline.
- Utiliser des LLM pour générer un premier jet de docstring, puis relire / corriger la sémantique métier.
- Intégrer un diff de documentation dans les PR reviews (TypeDoc, Sphinx supportent les outputs comparables).
- Préférer les tests nommés explicitement comme complément de documentation (`should_reject_payment_when_wallet_frozen`) — ils ne se désynchronisent jamais.
- Pour les APIs REST, garder OpenAPI comme source de vérité et générer le client + la doc depuis le contrat (contract-first).
