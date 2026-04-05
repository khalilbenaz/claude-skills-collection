---
name: dev-outbox-pattern-guide
description: Implémentation du pattern Outbox et Saga pour garantir la cohérence transactionnelle dans les architectures microservices. À utiliser quand l'utilisateur a besoin de fiabiliser la communication entre services, gérer des transactions distribuées ou implémenter des sagas. Se déclenche aussi avec "outbox pattern", "saga pattern", "transaction distribuée", "cohérence éventuelle", "dual write", "event sourcing", "transactional outbox".
---

# Guide du Pattern Outbox & Saga

## Workflow

1. **Identifier le problème** : dual write, perte de messages, incohérence entre services.
2. **Choisir le pattern** : Outbox pour la publication fiable, Saga pour les transactions multi-services.
3. **Concevoir** : tables, processus de polling/CDC, compensation.
4. **Implémenter** : avec le framework approprié (MassTransit, NServiceBus, custom).

## Le problème du Dual Write

```
❌ PROBLÈME : Dual Write
Service → Save to DB        ✅ Succès
Service → Publish to Broker  ❌ Échec
→ DB mis à jour mais message perdu = incohérence
```

## Pattern Outbox

### Principe

```
✅ SOLUTION : Outbox
Service → Transaction DB {
    Save entity to DB
    Save event to OutboxMessages table
} → Commit atomique

Background Worker → Poll OutboxMessages
    → Publish to Broker
    → Mark as processed
```

### Table Outbox

```sql
CREATE TABLE OutboxMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EventType NVARCHAR(256) NOT NULL,
    Payload NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ProcessedAt DATETIMEOFFSET NULL,
    RetryCount INT NOT NULL DEFAULT 0,
    Error NVARCHAR(MAX) NULL,

    INDEX IX_OutboxMessages_Unprocessed (ProcessedAt, CreatedAt)
        WHERE ProcessedAt IS NULL
);
```

### Implémentation C#

```csharp
// 1. Sauvegarder l'entité + l'événement dans la même transaction
public async Task CreateOrder(CreateOrderCommand command)
{
    var order = new Order(command);
    var outboxMessage = new OutboxMessage
    {
        EventType = nameof(OrderCreated),
        Payload = JsonSerializer.Serialize(new OrderCreated
        {
            OrderId = order.Id,
            CustomerId = command.CustomerId,
            Amount = command.Amount
        })
    };

    _context.Orders.Add(order);
    _context.OutboxMessages.Add(outboxMessage);
    await _context.SaveChangesAsync(); // Transaction atomique
}

// 2. Worker qui publie les messages en attente
public class OutboxProcessor : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var messages = await _context.OutboxMessages
                .Where(m => m.ProcessedAt == null)
                .OrderBy(m => m.CreatedAt)
                .Take(100)
                .ToListAsync(ct);

            foreach (var message in messages)
            {
                try
                {
                    await _bus.Publish(message.EventType, message.Payload);
                    message.ProcessedAt = DateTimeOffset.UtcNow;
                }
                catch (Exception ex)
                {
                    message.RetryCount++;
                    message.Error = ex.Message;
                }
            }

            await _context.SaveChangesAsync(ct);
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }
}
```

### Avec MassTransit (Outbox intégré)

```csharp
// Configuration automatique de l'outbox
builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UseSqlServer();
        o.UseBusOutbox();
        o.QueryDelay = TimeSpan.FromSeconds(5);
    });

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ConfigureEndpoints(context);
    });
});
```

## Pattern Saga

### Saga Chorégraphiée

```
Order Service → OrderCreated
    → Payment Service → PaymentProcessed
        → Inventory Service → InventoryReserved
            → Notification Service → OrderConfirmed

Si échec à n'importe quelle étape :
    → Compensation en sens inverse
```

### Saga Orchestrée (recommandée)

```csharp
public class OrderSaga : MassTransitStateMachine<OrderSagaState>
{
    public OrderSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => OrderSubmitted, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentProcessed, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentFailed, x => x.CorrelateById(m => m.Message.OrderId));

        Initially(
            When(OrderSubmitted)
                .Then(context =>
                {
                    context.Saga.OrderId = context.Message.OrderId;
                    context.Saga.Amount = context.Message.Amount;
                })
                .Publish(context => new ProcessPayment
                {
                    OrderId = context.Saga.OrderId,
                    Amount = context.Saga.Amount
                })
                .TransitionTo(AwaitingPayment)
        );

        During(AwaitingPayment,
            When(PaymentProcessed)
                .Publish(context => new ReserveInventory
                {
                    OrderId = context.Saga.OrderId
                })
                .TransitionTo(AwaitingInventory),

            When(PaymentFailed)
                .Publish(context => new CancelOrder
                {
                    OrderId = context.Saga.OrderId,
                    Reason = "Payment failed"
                })
                .TransitionTo(Cancelled)
                .Finalize()
        );
    }
}
```

## Choisir entre Outbox et Saga

| Critère | Outbox | Saga |
|---------|--------|------|
| **Portée** | Un seul service | Multi-services |
| **Complexité** | Faible | Élevée |
| **Usage** | Publication fiable d'événements | Transaction distribuée |
| **Compensation** | Non nécessaire | Obligatoire |
| **Latence** | Légère (polling) | Variable |

## Règles
- Ne jamais faire de dual write (DB + broker dans deux transactions séparées).
- Chaque étape d'une saga doit avoir une action de **compensation**.
- Les messages outbox doivent être **idempotents** côté consommateur.
- Préférer la saga orchestrée à la chorégraphiée pour les flux complexes.
- Monitorer la table outbox — une accumulation signale un problème.


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
