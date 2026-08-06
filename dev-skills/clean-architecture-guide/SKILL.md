---
name: clean-architecture-guide
description: Guide d'implémentation de la Clean Architecture et Architecture Hexagonale. Se déclenche avec "clean architecture", "architecture hexagonale", "ports and adapters", "onion architecture", "séparation des couches", "dependency inversion". Also triggers on "hexagonal architecture".
---

# Clean Architecture Guide

## Critères de décision : quand l'appliquer

| Signal | Recommandation |
|---|---|
| CRUD simple, faible logique métier | Non — over-engineering garanti |
| Logique métier complexe, longue durée de vie | Oui — justifié |
| Plusieurs canaux d'entrée (API REST + CLI + message queue) | Oui — ports & adapters |
| Équipe > 3 devs, domaines bornés distincts | Oui — séparation forte |
| Prototype / MVP court terme | Non — préférer une architecture plate modulaire |

---

## Workflow en étapes

### 1. Modéliser le domaine (cercle intérieur)

Pas de framework, pas de DTO externe, pas de ORM mapping ici. Uniquement des classes métier pures.

```csharp
// Domain/Entities/Order.cs (.NET)
public class Order
{
    public Guid Id { get; private set; }
    public Money Total { get; private set; }
    public OrderStatus Status { get; private set; }

    public void Confirm()
    {
        if (Status != OrderStatus.Pending)
            throw new DomainException("Order already processed.");
        Status = OrderStatus.Confirmed;
        AddEvent(new OrderConfirmedEvent(Id));
    }
}
```

**Checklist domaine :**
- [ ] Zéro `using` vers des frameworks (EF, ASP.NET, NestJS…)
- [ ] Value Objects pour les concepts sans identité (`Money`, `Email`)
- [ ] Domain Events pour les effets de bord métier
- [ ] Validations métier dans les entités, pas dans les controllers

---

### 2. Définir les ports (interfaces)

Les ports sont des contrats dans la couche Application ou Domain. Ils décrivent *ce dont on a besoin*, pas *comment c'est implémenté*.

```typescript
// Application/Ports/IOrderRepository.ts (TypeScript)
export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

export interface IPaymentGateway {
  charge(amount: Money, token: string): Promise<PaymentResult>;
}
```

---

### 3. Implémenter les Use Cases (Application Services)

Un use case = une classe, une méthode publique, un résultat.

```typescript
// Application/UseCases/ConfirmOrder/ConfirmOrderUseCase.ts
export class ConfirmOrderUseCase {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly payment: IPaymentGateway,
    private readonly events: IEventBus,
  ) {}

  async execute(cmd: ConfirmOrderCommand): Promise<void> {
    const order = await this.orders.findById(cmd.orderId);
    if (!order) throw new NotFoundException('Order not found');

    order.confirm();
    await this.payment.charge(order.total, cmd.paymentToken);
    await this.orders.save(order);
    await this.events.publish(order.pullEvents());
  }
}
```

**Règles use case :**
- Ne retourne que des types simples ou DTOs (jamais d'Entity du domaine vers l'extérieur)
- N'instancie pas ses dépendances (DI uniquement)
- Ne connaît pas HTTP, SQL, ni aucun détail infrastructure

---

### 4. Créer les Adapters (Infrastructure / Frameworks)

```csharp
// Infrastructure/Adapters/Persistence/EfOrderRepository.cs
public class EfOrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public EfOrderRepository(AppDbContext db) => _db = db;

    public async Task<Order?> FindByIdAsync(Guid id) =>
        await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);

    public async Task SaveAsync(Order order)
    {
        _db.Orders.Update(order);
        await _db.SaveChangesAsync();
    }
}
```

Adapters typiques à créer : Repository (DB), Gateway (API externe), EmailSender, FileStorage, Cache, MessagePublisher.

---

### 5. Arborescence de projet recommandée

```
src/
├── Domain/              # Entités, Value Objects, Domain Events, interfaces de domaine
│   ├── Entities/
│   ├── ValueObjects/
│   └── Events/
├── Application/         # Use Cases, DTOs, interfaces de ports
│   ├── UseCases/
│   └── Ports/
├── Infrastructure/      # Adapters : DB, HTTP, Message Queue, Cache
│   ├── Persistence/
│   ├── Gateways/
│   └── Messaging/
└── Presentation/        # Controllers, CLI, Workers (dépend d'Application uniquement)
    ├── Http/
    └── Workers/
```

Pour les petits projets : organiser par **feature** à l'intérieur de chaque couche.

---

### 6. Composition Root (DI)

Tout l'assemblage se fait à la frontière externe, jamais dans le domaine.

```csharp
// Program.cs / Startup.cs (.NET)
builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
builder.Services.AddScoped<IPaymentGateway, StripePaymentAdapter>();
builder.Services.AddScoped<ConfirmOrderUseCase>();
```

```typescript
// NestJS Module
@Module({
  providers: [
    ConfirmOrderUseCase,
    { provide: IOrderRepository, useClass: TypeOrmOrderRepository },
    { provide: IPaymentGateway, useClass: StripeAdapter },
  ],
})
export class OrderModule {}
```

---

### 7. Stratégie de tests par couche

| Couche | Type de test | Isolation |
|---|---|---|
| Domain | Unit | Aucune dépendance — vitesse maximale |
| Application (Use Cases) | Unit | Mocks des ports (IOrderRepository, etc.) |
| Infrastructure (Adapters) | Integration | Vraie DB (Testcontainers, SQLite in-memory) |
| Presentation | E2E | Stack complète, HTTP réel |

```typescript
// Test unitaire use case — zéro infra
it('should confirm a pending order', async () => {
  const order = Order.create({ ... });
  const repo = { findById: vi.fn().mockResolvedValue(order), save: vi.fn() };
  const payment = { charge: vi.fn().mockResolvedValue({ success: true }) };

  await new ConfirmOrderUseCase(repo, payment, eventBus).execute({ orderId: order.id });

  expect(order.status).toBe(OrderStatus.Confirmed);
  expect(repo.save).toHaveBeenCalledWith(order);
});
```

---

## Anti-patterns / Pièges

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| **Anemic Domain Model** | Entités = getters/setters, logique dans les services | Déplacer la logique dans l'entité |
| **Fuite d'infrastructure** | `DbContext` ou `HttpClient` injecté dans le domaine | Créer un port + adapter |
| **Use Case trop gros** | Un use case orchestre 10 opérations | Découper en use cases ou domain services |
| **DTO dans le domaine** | L'entité expose des champs de mapping ORM | Séparer Entity et mapping model |
| **Composition Root éclaté** | DI configuré dans plusieurs couches | Centraliser dans le projet hôte |
| **Circular dependency** | Domain importe Application ou Infrastructure | Vérifier la flèche de dépendance : toujours vers l'intérieur |
| **Overuse d'abstractions** | Interface 1:1 avec implémentation unique, jamais swappée | Ne créer un port que s'il y a un vrai besoin d'inversion |

---

## Règle de dépendance — rappel absolu

```
Presentation → Application → Domain
Infrastructure → Application → Domain
```

**Jamais l'inverse.** Si le domaine importe un namespace infrastructure, c'est un bug d'architecture à corriger immédiatement via un port.

---

## Bonnes pratiques 2026

- **Vertical Slicing** : dans les grands projets, organiser d'abord par feature (Ordering, Billing…) puis par couche à l'intérieur — évite les dossiers monolithiques.
- **Minimal API / Thin Controllers** : le controller ne fait qu'appeler le use case et mapper le résultat HTTP — zéro logique.
- **Result Pattern** plutôt qu'exceptions pour les erreurs métier attendues (`Result<T, Error>`).
- **Testcontainers** pour les tests d'intégration des adapters (DB réelle éphémère).
- **Architecture tests** : utiliser `NetArchTest` (.NET) ou `dependency-cruiser` (Node) pour enforcer les règles de dépendance en CI.

```bash
# Enforcer les règles en CI (Node)
npx depcruise src --config .dependency-cruiser.js --output-type err
```
