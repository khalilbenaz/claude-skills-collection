---
name: unit-test-generator
description: Génère des tests unitaires complets pour tout langage et framework. Se déclenche avec "test unitaire", "unit test", "tester mon code", "jest", "xunit", "pytest", "mocha", "JUnit", "écrire des tests", "couverture de tests".
---

# Unit Test Generator

## Workflow

### Étape 1 — Analyser le code à tester
- Identifier toutes les méthodes/fonctions **publiques** (l'interface contractuelle).
- Cartographier les dépendances injectées (constructeur, DI, imports).
- Repérer les side effects : I/O, DB, HTTP, mutation d'état global, horloge.
- Détecter les branches conditionnelles (if/else, switch, early return, ternaire) — chaque branche = un cas de test distinct.

### Étape 2 — Choisir le bon framework
| Langage | Framework principal | Assertion / Mock |
|---|---|---|
| TypeScript / JS | **Jest** ou **Vitest** (ESM natif) | `@testing-library`, `vi.mock` |
| Python | **pytest** | `pytest-mock`, `unittest.mock` |
| C# / .NET | **xUnit** | `FluentAssertions`, `Moq` / `NSubstitute` |
| Java | **JUnit 5** | `AssertJ`, `Mockito` |
| Go | `testing` stdlib | `testify/assert`, `testify/mock` |
| Rust | `#[cfg(test)]` intégré | `mockall` si besoin |

> Critère de décision : si le projet a déjà un framework installé, l'utiliser ; si greenfield, préférer Vitest (TS), pytest (Python), xUnit (C#), JUnit 5 (Java).

### Étape 3 — Identifier tous les cas de test
Pour chaque méthode publique, couvrir systématiquement :
1. **Happy path** — entrée valide, résultat nominal.
2. **Edge cases** — `null`, `undefined`, chaîne vide, liste vide, zéro, négatif, max value.
3. **Error cases** — exception attendue, code d'erreur métier, état invalide.
4. **Interactions** — appels aux dépendances (mock appelé N fois avec tels args).

### Étape 4 — Mocker les dépendances

**Principe** : isoler la SUT (System Under Test) de tout ce qui n'est pas elle.

```python
# Python — pytest-mock
def test_get_user_returns_none_when_not_found(mocker):
    repo = mocker.MagicMock()
    repo.find_by_id.return_value = None
    svc = UserService(repo)
    assert svc.get_user(99) is None
    repo.find_by_id.assert_called_once_with(99)
```

```csharp
// C# — Moq + FluentAssertions
[Fact]
public void GetUser_ShouldReturnNull_WhenNotFound()
{
    var repo = new Mock<IUserRepository>();
    repo.Setup(r => r.FindById(99)).Returns((User?)null);
    var svc = new UserService(repo.Object);

    var result = svc.GetUser(99);

    result.Should().BeNull();
    repo.Verify(r => r.FindById(99), Times.Once);
}
```

```typescript
// TypeScript — Vitest
import { vi, describe, it, expect } from 'vitest';
import { UserService } from './UserService';

describe('UserService.getUser', () => {
  it('returns null when user not found', async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null) };
    const svc = new UserService(repo as any);
    expect(await svc.getUser(99)).toBeNull();
    expect(repo.findById).toHaveBeenCalledWith(99);
  });
});
```

### Étape 5 — Écrire avec le pattern AAA
```
Arrange → Act → Assert  (une seule assertion logique par test)
```
Nommage : `Should_<résultat>_When_<condition>` ou `<méthode>_<état>_<attendu>`.

### Étape 6 — Tests paramétrés pour les variations de données

```python
# pytest
@pytest.mark.parametrize("amount,expected", [
    (0,     False),
    (-1,    False),
    (0.01,  True),
    (10_000, True),
])
def test_is_valid_amount(amount, expected):
    assert is_valid_amount(amount) == expected
```

```csharp
// xUnit
[Theory]
[InlineData(0,      false)]
[InlineData(-1,     false)]
[InlineData(0.01,   true)]
[InlineData(10_000, true)]
public void IsValidAmount_ShouldMatchExpected(decimal amount, bool expected)
    => Assert.Equal(expected, PaymentValidator.IsValidAmount(amount));
```

```typescript
// Vitest / Jest
it.each([
  [0,      false],
  [-1,     false],
  [0.01,   true],
  [10_000, true],
])('isValidAmount(%s) → %s', (amount, expected) => {
  expect(isValidAmount(amount)).toBe(expected);
});
```

### Étape 7 — Vérifier la couverture
```bash
# Python
pytest --cov=src --cov-report=term-missing --cov-fail-under=80

# TypeScript (Vitest)
vitest run --coverage          # génère coverage/index.html

# .NET
dotnet test --collect:"XPlat Code Coverage"
reportgenerator -reports:coverage.cobertura.xml -targetdir:coverageReport

# Java (Maven + JaCoCo)
mvn test jacoco:report          # target/site/jacoco/index.html
```
Objectif minimal : **80 % lignes + 70 % branches** sur le code métier. Ne pas poursuivre la couverture sur les DTOs, générés, migrations.

### Étape 8 — Refactoring des tests
- Partager l'initialisation via `beforeEach` / fixture / builder factory — pas de copier-coller.
- Créer des `TestBuilders` (pattern Builder) pour les entités complexes.
- Regrouper par classe/feature dans des `describe` / `TestClass` / inner classes.
- Supprimer les tests qui vérifient un détail d'implémentation (ex : ordre exact des appels internes).

---

## Garde-fous — anti-patterns à éviter

| Anti-pattern | Pourquoi c'est problématique | Correction |
|---|---|---|
| Tester des méthodes privées directement | Couplage fort à l'implémentation | Tester via l'interface publique |
| Un seul test "dieu" qui couvre tout | Diagnostics impossibles, maintenance difficile | 1 test = 1 comportement |
| Mock de tout (y compris la SUT elle-même) | On ne teste plus rien de réel | Mocker uniquement les dépendances externes |
| `Assert.True(result != null)` flou | Message d'échec inutile | `result.Should().NotBeNull()` / `assertNotNull(result, "msg")` |
| Tests order-dependent (shared mutable state) | Flaky selon l'ordre d'exécution | Réinitialiser l'état dans `beforeEach` |
| Faux positifs sur les exceptions | `try/catch` silencieux ou `ThrowsAny` trop large | Vérifier le type exact + le message si critique |
| Tester des tiers (bibliothèques externes) | Pas votre responsabilité | Wrapper les tiers et tester le wrapper |
| Noms génériques (`test1`, `testOK`) | Impossible de diagnostiquer sans lire le corps | Convention `Should_X_When_Y` obligatoire |

## Bonnes pratiques 2026

- **Test Doubles hiérarchie** : préférer les `Fake` (implémentation légère en mémoire) aux `Mock` quand la logique est non triviale.
- **Snapshot testing** avec `jest-snapshot` / `Verify` (.NET) pour les sorties complexes (JSON, HTML, rapports) — évite les assertions fragiles ligne à ligne.
- **Contract testing** (Pact) pour les intégrations HTTP entre services : ne pas mocker le contrat, le valider.
- **Mutation testing** (`Stryker` .NET/JS, `mutmut` Python) : mesure la qualité réelle des assertions, pas juste la couverture de lignes.
- **Tests de propriétés** (`Hypothesis` Python, `fast-check` JS, `FsCheck` .NET) pour explorer l'espace des entrées au-delà des cas manuels.
- Placer les tests au plus proche du code : `src/services/user.service.spec.ts` ou `tests/` miroir de `src/` selon la convention du projet.
- Faire tourner les tests en mode watch pendant le développement (`vitest`, `pytest-watch`, `dotnet watch test`).
