---
name: testing-mock-designer
description: Conception de mocks, stubs et fakes pour les tests unitaires et d'intégration avec les principaux frameworks de mocking. Se déclenche avec "mock", "stub", "fake", "Moq", "NSubstitute", "Mockito", "jest.mock", "test double"
---

# Mock Designer

## Critères de décision — quel test double choisir ?

| Besoin | Type | Exemple |
|--------|------|---------|
| Fournir une valeur de retour fixe | **Stub** | `repo.GetById()` retourne un objet préconfiguré |
| Vérifier qu'un appel a eu lieu | **Mock** | `emailSender.Send()` appelé exactement 1 fois |
| Remplacer une dépendance lourde | **Fake** | `InMemoryRepository` à la place d'une vraie BDD |
| Capturer les arguments d'un appel | **Spy** | Logger — lire le message qui a été loggué |
| Remplacer une fonction globale | **Monkey patch** | `Date.now`, `Math.random` en JS |

Règle simple : **stub si tu consommes, mock si tu produis un effet observable.**

---

## Workflow en étapes

### 1. Identifier les dépendances à simuler

- Lister toutes les dépendances injectées dans le constructeur / méthode sous test.
- Ne cibler que les **frontières du système** : I/O, BDD, HTTP, horloge, générateur d'ID.
- Ignorer les value objects, DTOs, services purement fonctionnels (pas d'état, pas d'I/O).

```
Code sous test : OrderService(IOrderRepository, IPaymentGateway, IClock)
→ mocker : IOrderRepository, IPaymentGateway, IClock
→ NE PAS mocker : Money, OrderId, OrderStatus
```

### 2. Choisir le framework et configurer

**.NET — Moq**
```csharp
// Installer : dotnet add package Moq
var repo = new Mock<IOrderRepository>();
repo.Setup(r => r.GetById(42)).ReturnsAsync(new Order { Id = 42 });
```

**.NET — NSubstitute** (plus lisible, préféré en Arrange/Act/Assert pur)
```csharp
// Installer : dotnet add package NSubstitute
var repo = Substitute.For<IOrderRepository>();
repo.GetById(42).Returns(new Order { Id = 42 });
```

**Java — Mockito**
```java
// Maven : org.mockito:mockito-core
OrderRepository repo = mock(OrderRepository.class);
when(repo.findById(42L)).thenReturn(Optional.of(new Order(42L)));
```

**JavaScript/TypeScript — Jest**
```ts
jest.mock('../services/emailService');
const emailService = emailService as jest.Mocked<typeof emailService>;
emailService.send.mockResolvedValue({ messageId: 'abc' });
```

**Python — unittest.mock**
```python
from unittest.mock import MagicMock, patch

repo = MagicMock()
repo.get_by_id.return_value = Order(id=42)
```

### 3. Configurer les stubs (données)

Couvrir systématiquement **trois scénarios** :

```csharp
// Succès nominal
repo.Setup(r => r.GetById(1)).ReturnsAsync(ValidOrder());

// Cas limite (entité inexistante)
repo.Setup(r => r.GetById(0)).ReturnsAsync((Order?)null);

// Erreur infrastructure
repo.Setup(r => r.GetById(99)).ThrowsAsync(new DbException("timeout"));
```

Utiliser un **Object Mother** pour factoriser les données de test :
```csharp
public static class OrderMother
{
    public static Order Valid() => new Order { Id = 1, Amount = 100m, Status = OrderStatus.Pending };
    public static Order Expired() => Valid() with { CreatedAt = DateTime.UtcNow.AddDays(-31) };
}
```

### 4. Implémenter les mocks avec vérifications d'interaction

Ne vérifier les interactions **que si l'interaction est le comportement à tester** (effet de bord observable).

```csharp
// Moq — vérifier qu'un email a été envoyé exactement une fois
emailSender.Verify(e => e.Send(It.Is<Email>(m => m.To == "user@example.com")), Times.Once);

// NSubstitute
emailSender.Received(1).Send(Arg.Is<Email>(m => m.To == "user@example.com"));
```

```java
// Mockito
verify(emailSender, times(1)).send(argThat(e -> e.getTo().equals("user@example.com")));
```

```ts
// Jest
expect(emailService.send).toHaveBeenCalledTimes(1);
expect(emailService.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'user@example.com' }));
```

### 5. Créer des fakes pour tests d'intégration légers

Un fake est une vraie implémentation simplifiée, préférable aux mocks pour les tests qui couvrent plusieurs couches.

```csharp
public class InMemoryOrderRepository : IOrderRepository
{
    private readonly Dictionary<int, Order> _store = new();

    public Task<Order?> GetById(int id) =>
        Task.FromResult(_store.TryGetValue(id, out var o) ? o : null);

    public Task Save(Order order) { _store[order.Id] = order; return Task.CompletedTask; }
}
```

```python
class FakeEmailService:
    def __init__(self):
        self.sent: list[Email] = []

    def send(self, email: Email) -> None:
        self.sent.append(email)
```

### 6. Pattern Builder pour mocks réutilisables

```csharp
public class OrderRepositoryMockBuilder
{
    private readonly Mock<IOrderRepository> _mock = new();

    public OrderRepositoryMockBuilder WithOrder(Order order)
    {
        _mock.Setup(r => r.GetById(order.Id)).ReturnsAsync(order);
        return this;
    }

    public OrderRepositoryMockBuilder ThatThrowsOnSave()
    {
        _mock.Setup(r => r.Save(It.IsAny<Order>())).ThrowsAsync(new DbException());
        return this;
    }

    public Mock<IOrderRepository> Build() => _mock;
}

// Usage dans le test
var repo = new OrderRepositoryMockBuilder().WithOrder(OrderMother.Valid()).Build();
```

---

## Anti-patterns et pièges

| Anti-pattern | Problème | Correction |
|---|---|---|
| Mocker le code sous test | Test circulaire, aucune valeur | Ne tester que les dépendances |
| Plus de 3 mocks par test | Couplage excessif, test fragile | Refactorer le SUT (ex: Facade) |
| `It.IsAny<T>()` partout | Assertions trop laxistes | Matcher sur les valeurs pertinentes |
| Partial mock (Spy sur classe concrète) | Mélange réel/simulé → faux positifs | Extraire une interface |
| Mock sans `Verify` | Interaction non testée, mock inutile | Supprimer ou ajouter `Verify` |
| Setup non utilisé | Test trompeur | Activer `MockBehavior.Strict` (Moq) |
| Fake avec logique complexe | Le fake devient un bug en lui-même | Tester le fake séparément |

---

## Bonnes pratiques 2026

- **Préférer les fakes aux mocks** pour les repositories : plus stables, moins de fragmentation setup/verify.
- **MockBehavior.Strict** (Moq) ou `NSubstitute.CheckCallsFor` : faire échouer les appels non configurés — évite les silences trompeurs.
- **Contract tests** : valider que les fakes respectent le même contrat que les vraies implémentations (ex: Pact, Spring Contract).
- **Horloge injectable** : ne jamais appeler `DateTime.UtcNow` en direct ; injecter `IClock` / `TimeProvider` (.NET 8+) pour contrôler le temps dans les tests.
- **Éviter `Thread.Sleep` / délais réels** : mocker les timers, utiliser `FakeTimeProvider` (.NET 8).
- **Un fichier de mocks partagé par domaine** : `Mocks/OrderMocks.cs`, pas de setup inline dupliqué dans chaque test.
- **Réinitialiser les mocks entre les tests** : `MockRepository.VerifyAll()` dans `TearDown`, ou `jest.clearAllMocks()` dans `afterEach`.


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
