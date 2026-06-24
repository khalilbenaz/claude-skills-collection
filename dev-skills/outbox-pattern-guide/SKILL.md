---
name: outbox-pattern-guide
description: Implémentation du pattern Outbox et Saga pour garantir la cohérence transactionnelle dans les architectures microservices. À utiliser quand l'utilisateur a besoin de fiabiliser la communication entre services, gérer des transactions distribuées ou implémenter des sagas. Se déclenche aussi avec "outbox pattern", "saga pattern", "transaction distribuée", "cohérence éventuelle", "dual write", "event sourcing", "transactional outbox".
---

# Guide du Pattern Outbox & Saga

## 1. Identifier le problème

**Symptômes qui déclenchent ce guide :**
- Événements perdus entre la DB et le broker de messages.
- État incohérent entre deux services après un crash entre deux opérations.
- Besoin de transaction distribuée sans 2PC (two-phase commit).
- Workflow multi-étapes qui doit être compensable.

**Arbre de décision :**
```
Besoin de publier un événement de façon fiable depuis un seul service ?
  → OUI → Transactional Outbox

Besoin de coordonner une transaction traversant plusieurs services ?
  → OUI + logique centralisée  → Saga Orchestrée (recommandée)
  → OUI + services totalement découplés → Saga Chorégraphiée (attention : complexité++)
```

---

## 2. Pattern Outbox — implémentation pas à pas

### Pourquoi le dual write échoue

```
❌ Dual Write
1. BEGIN TX  → INSERT order          → COMMIT
2. bus.Publish(OrderCreated)          → CRASH  ← message perdu, DB déjà commité
```

### Table SQL (SQL Server / PostgreSQL)

```sql
-- SQL Server
CREATE TABLE OutboxMessages (
    Id              UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
    EventType       NVARCHAR(256)       NOT NULL,
    Payload         NVARCHAR(MAX)       NOT NULL,   -- JSON sérialisé
    CreatedAt       DATETIMEOFFSET      NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ProcessedAt     DATETIMEOFFSET      NULL,
    RetryCount      INT                 NOT NULL DEFAULT 0,
    Error           NVARCHAR(1000)      NULL,

    INDEX IX_Outbox_Pending (ProcessedAt, CreatedAt)
        WHERE ProcessedAt IS NULL
);

-- PostgreSQL équivalent
CREATE INDEX CONCURRENTLY idx_outbox_pending
    ON outbox_messages (created_at)
    WHERE processed_at IS NULL;
```

### Étape A — Écrire dans la transaction applicative

```csharp
// Dans le handler de commande — un seul SaveChangesAsync = atomique
public async Task Handle(CreateOrderCommand cmd, CancellationToken ct)
{
    var order = Order.Create(cmd.CustomerId, cmd.Amount);

    _ctx.Orders.Add(order);
    _ctx.OutboxMessages.Add(new OutboxMessage
    {
        EventType = nameof(OrderCreated),
        Payload   = JsonSerializer.Serialize(new OrderCreated(order.Id, cmd.Amount))
    });

    await _ctx.SaveChangesAsync(ct); // atomique : les deux rows ou aucune
}
```

### Étape B — Worker de publication (polling simple)

```csharp
public class OutboxWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await ProcessBatchAsync(ct);
            await Task.Delay(Interval, ct);
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        // Verrouillage pessimiste pour multi-instances
        var pending = await _ctx.OutboxMessages
            .FromSqlRaw("""
                SELECT TOP 50 * FROM OutboxMessages WITH (UPDLOCK, READPAST)
                WHERE ProcessedAt IS NULL
                ORDER BY CreatedAt
            """)
            .ToListAsync(ct);

        foreach (var msg in pending)
        {
            try
            {
                await _bus.Publish(msg.EventType, msg.Payload, ct);
                msg.ProcessedAt = DateTimeOffset.UtcNow;
                msg.Error       = null;
            }
            catch (Exception ex)
            {
                msg.RetryCount++;
                msg.Error = ex.Message;
                // Backoff exponentiel : ne republier qu'après 2^retryCount minutes
            }
        }

        await _ctx.SaveChangesAsync(ct);
    }
}
```

> **Tip multi-instances** : `WITH (UPDLOCK, READPAST)` sur SQL Server évite que deux workers prennent le même message. Sous PostgreSQL, utiliser `FOR UPDATE SKIP LOCKED`.

### Étape C — Idempotence côté consommateur

Chaque consommateur doit ignorer un message déjà traité :

```csharp
public async Task Consume(ConsumeContext<OrderCreated> ctx)
{
    if (await _store.AlreadyProcessed(ctx.Message.MessageId)) return;

    // traitement métier...

    await _store.MarkProcessed(ctx.Message.MessageId);
}
```

### Variante — MassTransit Outbox (zéro code infrastructure)

```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UseSqlServer();   // ou UsePostgres()
        o.UseBusOutbox();   // intercepte tous les Publish/Send dans le scope EF
        o.QueryDelay = TimeSpan.FromSeconds(5);
        o.QueryTimeout = TimeSpan.FromSeconds(30);
    });

    x.UsingRabbitMq((ctx, cfg) => cfg.ConfigureEndpoints(ctx));
});
```

### Variante — CDC (Change Data Capture) avec Debezium

Aucun worker applicatif ; Debezium lit le WAL/binlog et pousse vers Kafka :

```yaml
# connector config (REST POST /connectors)
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.sqlserver.SqlServerConnector",
    "table.include.list": "dbo.OutboxMessages",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.type": "EventType",
    "transforms.outbox.route.by.field": "EventType"
  }
}
```

**Quand choisir CDC ?** Volume > 1 000 événements/s, latence < 1 s requise, infrastructure Kafka déjà en place.

---

## 3. Pattern Saga

### Chorégraphie vs Orchestration

| Critère | Chorégraphie | Orchestration |
|---------|-------------|---------------|
| Couplage | Faible (events) | Modéré (orchestrateur) |
| Visibilité du flux | Difficile | Centralisée |
| Complexité compensation | Dispersée dans chaque service | Centralisée |
| Recommandé si | ≤ 3 étapes simples | ≥ 3 étapes ou compensation complexe |

**Règle** : dès que le workflow dépasse 3 services ou nécessite des états intermédiaires, préférer l'orchestration.

### Saga Orchestrée avec MassTransit

```csharp
public class OrderSaga : MassTransitStateMachine<OrderSagaState>
{
    public State AwaitingPayment { get; private set; } = null!;
    public State AwaitingInventory { get; private set; } = null!;
    public State Completed { get; private set; } = null!;
    public State Cancelled { get; private set; } = null!;

    public Event<OrderSubmitted>    OrderSubmitted    { get; private set; } = null!;
    public Event<PaymentProcessed>  PaymentProcessed  { get; private set; } = null!;
    public Event<PaymentFailed>     PaymentFailed     { get; private set; } = null!;
    public Event<InventoryReserved> InventoryReserved { get; private set; } = null!;

    public OrderSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => OrderSubmitted,   x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentProcessed, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentFailed,    x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => InventoryReserved,x => x.CorrelateById(m => m.Message.OrderId));

        Initially(
            When(OrderSubmitted)
                .Then(ctx => { ctx.Saga.OrderId = ctx.Message.OrderId; ctx.Saga.Amount = ctx.Message.Amount; })
                .Publish(ctx => new ProcessPayment { OrderId = ctx.Saga.OrderId, Amount = ctx.Saga.Amount })
                .TransitionTo(AwaitingPayment)
        );

        During(AwaitingPayment,
            When(PaymentProcessed)
                .Publish(ctx => new ReserveInventory { OrderId = ctx.Saga.OrderId })
                .TransitionTo(AwaitingInventory),
            When(PaymentFailed)
                .Publish(ctx => new CancelOrder { OrderId = ctx.Saga.OrderId, Reason = "Payment declined" })
                .TransitionTo(Cancelled).Finalize()
        );

        During(AwaitingInventory,
            When(InventoryReserved)
                .Publish(ctx => new ConfirmOrder { OrderId = ctx.Saga.OrderId })
                .TransitionTo(Completed).Finalize()
        );

        SetCompletedWhenFinalized();
    }
}
```

### Actions de compensation obligatoires

Chaque étape doit avoir son inverse :

| Étape | Compensation |
|-------|-------------|
| `ProcessPayment` | `RefundPayment` |
| `ReserveInventory` | `ReleaseInventory` |
| `SendEmail` | (non compensable — log + alerte) |

---

## 4. Choisir entre Outbox et Saga

| Critère | Outbox seul | Outbox + Saga |
|---------|-------------|---------------|
| Portée | 1 service | N services |
| Rollback | Non nécessaire | Compensation explicite |
| Complexité | Faible | Élevée |
| Exemple | Publier `OrderCreated` après INSERT | Paiement → Stock → Notification |

---

## 5. Garde-fous, anti-patterns, pièges

### Anti-patterns

- **Publier dans le même thread avant le commit** — toujours écrire dans l'outbox, jamais `bus.Publish()` directement dans le handler.
- **Saga chorégraphiée pour des flux complexes** — les events se croisent, le debugging devient un cauchemar. Passer à l'orchestration.
- **Ne pas implémenter l'idempotence consommateur** — les retries (at-least-once delivery) peuvent dupliquer les effets métier.
- **Outbox sans index filtrant sur `ProcessedAt IS NULL`** — la table grossit, le worker ralentit. Purger régulièrement les messages traités.
- **Saga sans timeout** — un service qui ne répond jamais bloque la saga indéfiniment. Toujours définir un `TimeoutIn`.

### Pièges opérationnels

```csharp
// PIÈGE : lock contention si un seul worker lit sans SKIP LOCKED
// → plusieurs workers lisent le même batch → double publication
// SOLUTION : UPDLOCK/READPAST (SQL Server) ou FOR UPDATE SKIP LOCKED (PG)

// PIÈGE : sérialiser des types polymorphes sans discriminant
// → lors de la désérialisation, le type est perdu
// SOLUTION : stocker EventType + un champ TypeName dans le payload
var payload = JsonSerializer.Serialize(evt, evt.GetType());
// Et côté consommateur :
var type = Type.GetType(msg.TypeName)!;
var evt  = (IEvent)JsonSerializer.Deserialize(msg.Payload, type)!;
```

### Monitoring indispensable

```sql
-- Alerter si des messages sont bloqués depuis > 10 min
SELECT COUNT(*) AS Stuck
FROM OutboxMessages
WHERE ProcessedAt IS NULL
  AND CreatedAt < DATEADD(MINUTE, -10, SYSDATETIMEOFFSET());

-- Surveiller les RetryCount élevés
SELECT TOP 10 EventType, RetryCount, Error, CreatedAt
FROM OutboxMessages
WHERE RetryCount > 3
ORDER BY RetryCount DESC;
```

**Seuils d'alerte recommandés :**
- Messages en attente > 5 min → WARNING
- Messages en attente > 15 min → CRITICAL
- RetryCount > 5 → investigation manuelle

---

## 6. Bonnes pratiques 2026

- **Utiliser MassTransit Outbox** si déjà sur MassTransit — zéro code infrastructure, testable via `InMemoryTestHarness`.
- **CDC (Debezium)** pour les volumes élevés ou la faible latence ; sinon le polling est suffisant et plus simple.
- **Purge automatique** : supprimer les messages `ProcessedAt < NOW() - 7 days` via un job nocturne.
- **Saga state in DB, pas en mémoire** — la saga doit survivre aux redémarrages.
- **Tests** : tester chaque step de saga en isolation avec des fakes de bus ; tester le worker outbox avec une vraie DB de test (TestContainers).
- **Nommage des events** : `{Aggregate}{PastTense}` — `OrderCreated`, `PaymentFailed` — jamais de verbes au présent.
