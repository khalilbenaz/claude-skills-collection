---
name: dev-tdd-coach
description: Guide la pratique du Test-Driven Development pas à pas, avec exemples concrets, snippets copiables et anti-patterns. Se déclenche avec "TDD", "test driven", "red green refactor", "écrire le test d'abord", "BDD", "behaviour driven", "outside-in TDD".
---

# TDD Coach

## Workflow RED → GREEN → REFACTOR

### 1. Décomposer la feature avant d'ouvrir l'IDE

- Lire la user story et extraire les **comportements** (pas les classes ni les méthodes).
- Lister les cas : happy path, edge cases, cas d'erreur explicites.
- Trier par complexité croissante — commencer par le cas le plus simple.
- Critère d'arrêt : chaque comportement doit tenir dans un seul test lisible.

**Exemple — user story** : *"Un panier vide retourne un total de 0"* → un seul test.

---

### 2. RED — Écrire un test qui échoue

Règles strictes :
- Le test doit **compiler** mais **échouer** (pas une erreur de build).
- Un seul `assert` par test (ou un seul comportement observable).
- Nom expressif : `[Méthode]_[Contexte]_[Résultat attendu]`.

```csharp
// C# xUnit
[Fact]
public void GetTotal_WhenCartIsEmpty_ReturnsZero()
{
    var cart = new ShoppingCart();
    var total = cart.GetTotal();
    Assert.Equal(0, total);
}
```

```python
# Python pytest
def test_get_total_returns_zero_for_empty_cart():
    cart = ShoppingCart()
    assert cart.get_total() == 0
```

```typescript
// TypeScript Jest
it("returns 0 for an empty cart", () => {
  const cart = new ShoppingCart();
  expect(cart.getTotal()).toBe(0);
});
```

Lancer les tests → confirmer l'échec pour la **bonne raison** :
```bash
dotnet test          # .NET
pytest -v            # Python
npx jest --watch     # Node/TS
```

---

### 3. GREEN — Minimum viable pour passer le test

- Écrire le **code le plus stupide possible** qui fait passer le test.
- Hard-coder la valeur de retour si ça suffit : c'est intentionnel.
- Ne jamais écrire de code non couvert par un test existant.

```csharp
public class ShoppingCart
{
    public decimal GetTotal() => 0; // volontairement naïf
}
```

Lancer les tests → tous verts → committer :
```bash
git add -p && git commit -m "GREEN: GetTotal returns 0 for empty cart"
```

---

### 4. REFACTOR — Nettoyer sans casser

- Supprimer la duplication (code de prod **et** tests).
- Renommer pour exprimer l'intention métier.
- Extraire si une méthode dépasse ~10 lignes ou fait plus d'une chose.
- Les tests restent verts à chaque micro-étape du refactoring.

Checklist rapide :
- [ ] Noms de variables/méthodes auto-documentés ?
- [ ] Duplication supprimée (DRY) ?
- [ ] Couplage minimal entre tests et détails d'implémentation ?
- [ ] Tests lisibles sans commentaires ?

---

### 5. Itérer — prochain comportement

- Ajouter un item au panier → recalculer le total → relancer le cycle.
- Chaque cycle dure **2 à 10 minutes** idéalement.
- Committer à chaque GREEN stable.

```bash
# Historique propre : un commit par cycle
git log --oneline
# GREEN: GetTotal returns 0 for empty cart
# GREEN: GetTotal sums single item price
# GREEN: GetTotal sums multiple items
# REFACTOR: extract calculateItemTotal helper
```

---

## Choisir son école : London vs Chicago

| Critère | Chicago (classique) | London (mockiste) |
|---|---|---|
| Dépendances | Vraies instances / in-memory | Mocks systématiques |
| Feedback | Teste le résultat final | Teste les interactions |
| Risque | Couplage au state | Over-specification des mocks |
| Convient pour | Logique métier pure, DDD | Couche applicative, CQRS |

**Heuristique** : mocker uniquement les dépendances **externes** (I/O, base, API), jamais la logique interne.

---

## Double-loop TDD (Outside-in)

```
[Acceptance test — BDD Gherkin]   ← boucle externe, toujours rouge
        ↓
  [Unit test RED]
        ↓
  [Unit test GREEN]
        ↓
  [Unit REFACTOR]
        ↓
[Acceptance test — vérifier progression]
```

Scenario Gherkin :
```gherkin
Feature: Shopping cart total
  Scenario: Empty cart
    Given an empty cart
    When I request the total
    Then the total is 0

  Scenario: Cart with items
    Given a cart with 2 items at 5.00 each
    When I request the total
    Then the total is 10.00
```

Tooling BDD :
- **.NET** : SpecFlow (`dotnet add package SpecFlow.xUnit`)
- **Java/Kotlin** : Cucumber (`cucumber-junit5`)
- **JS/TS** : `@cucumber/cucumber` ou Playwright BDD

---

## Katas d'entraînement (ordre recommandé)

| Kata | Objectif | Durée estimée |
|---|---|---|
| FizzBuzz | Démarrer le cycle, conditions | 15 min |
| String Calculator | Cas progressifs, regex, parsing | 30 min |
| Roman Numerals | Découverte de patterns par triangulation | 45 min |
| Bowling Game | Refactoring agressif, logique complexe | 1h |
| Bank Account | State, CQRS simplifié, événements | 1h |

Ressources : [kata-log.rocks](https://kata-log.rocks) · [cyber-dojo.org](https://cyber-dojo.org)

---

## Garde-fous & Anti-patterns

### Anti-patterns fréquents

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| **Test-after** | Tests écrits après le code | Supprimer le code, repartir en RED |
| **Test trop large** | Un test vérifie 5 comportements | Un comportement = un test |
| **Mock everything** | Tests fragiles, cassent au moindre refactoring | Mocker uniquement les dépendances externes |
| **Pas de REFACTOR** | Code de prod naïf laissé en l'état | Refactorer obligatoirement avant le prochain RED |
| **Tests privés** | Tester les méthodes privées directement | Tester via l'interface publique |
| **Trop de setup** | `Arrange` de 40 lignes | Extraire des builders/factories de test |
| **Assert multiple** | `Assert.Equal` × 8 dans un test | Séparer en autant de tests |

### Pièges courants

- **Triangulation oubliée** : écrire au moins 2-3 exemples concrets avant de généraliser l'algorithme.
- **Refactoring dans GREEN** : on ne refactore que quand les tests sont verts, jamais pendant RED.
- **Tests couplés à l'implémentation** : tester `_privateField` ou l'ordre des appels internes fragilise la suite.
- **Fixtures globales mutables** : état partagé entre tests → non-déterminisme → flakiness.

---

## Bonnes pratiques 2026

- **Mutation testing** : valider la qualité des tests avec [Stryker](https://stryker-mutator.io) (.NET/JS) ou [PITest](https://pitest.org) (Java). Score cible > 80 %.
- **Test data builders** : pattern `Builder` pour construire les objets de test sans setup verbeux.
- **Property-based testing** : [FsCheck](https://fscheck.github.io) (.NET), [Hypothesis](https://hypothesis.works) (Python), [fast-check](https://fast-check.dev) (JS) — complémentaire au TDD classique.
- **Architecture testable** : préférer l'injection de dépendances native du framework ; éviter les singletons et `static`.
- **CI gate** : bloquer le merge si la couverture de test chute ou si des mutations survivent.
- **Living documentation** : générer les rapports HTML depuis SpecFlow/Cucumber et les publier dans la CI.


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
