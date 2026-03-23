---
name: rabbitmq-patterns-guide
description: Patterns de messaging avec RabbitMQ — exchanges, queues, routing, dead letter, pub/sub et intégration avec MassTransit/.NET. À utiliser quand l'utilisateur travaille avec RabbitMQ, conçoit des architectures event-driven ou implémente du messaging asynchrone. Se déclenche aussi avec "RabbitMQ", "exchange", "queue", "dead letter", "pub/sub RabbitMQ", "MassTransit", "message broker".
---

# Guide des Patterns RabbitMQ

## Workflow

1. **Identifier le pattern** : point-à-point, pub/sub, routing, topics ou RPC.
2. **Concevoir la topologie** : exchanges, queues, bindings et routing keys.
3. **Implémenter** : producteur, consommateur et gestion des erreurs.
4. **Fiabiliser** : dead letter, retry, idempotence et monitoring.

## Types d'exchanges

| Exchange | Routing | Usage |
|----------|---------|-------|
| **Direct** | Routing key exacte | Commandes ciblées, work queues |
| **Fanout** | Broadcast à toutes les queues | Notifications, événements globaux |
| **Topic** | Pattern matching (`*.order.#`) | Routing flexible par catégorie |
| **Headers** | Attributs des headers | Routing complexe multi-critères |

## Patterns fondamentaux

### Work Queue (répartition de charge)

```
Producer → [Queue] → Consumer 1
                   → Consumer 2
                   → Consumer 3
```

- Round-robin par défaut entre les consumers
- Utiliser `prefetchCount = 1` pour une répartition équitable
- ACK manuel après traitement réussi

### Pub/Sub (diffusion d'événements)

```
Producer → [Fanout Exchange] → Queue A → Consumer A
                             → Queue B → Consumer B
                             → Queue C → Consumer C
```

- Chaque consumer a sa propre queue
- L'exchange copie le message vers toutes les queues liées

### Topic Routing

```
Producer → [Topic Exchange] → order.created.* → Queue Orders
                            → payment.*.failed → Queue Alerts
                            → #.audit → Queue Audit
```

- `*` = exactement un mot
- `#` = zéro ou plusieurs mots

## Implémentation avec MassTransit (.NET)

### Configuration

```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<OrderCreatedConsumer>();
    x.AddConsumer<PaymentFailedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq://localhost", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("order-service", e =>
        {
            e.PrefetchCount = 16;
            e.UseMessageRetry(r => r.Intervals(
                TimeSpan.FromSeconds(1),
                TimeSpan.FromSeconds(5),
                TimeSpan.FromSeconds(30)));

            e.ConfigureConsumer<OrderCreatedConsumer>(context);
        });

        cfg.ConfigureEndpoints(context);
    });
});
```

### Consumer

```csharp
public class OrderCreatedConsumer : IConsumer<OrderCreated>
{
    private readonly IOrderRepository _repo;

    public OrderCreatedConsumer(IOrderRepository repo) => _repo = repo;

    public async Task Consume(ConsumeContext<OrderCreated> context)
    {
        var message = context.Message;

        // Idempotence : vérifier si déjà traité
        if (await _repo.ExistsAsync(message.OrderId))
            return;

        await _repo.ProcessOrder(message);

        // Publier un événement de suite
        await context.Publish(new OrderProcessed
        {
            OrderId = message.OrderId,
            ProcessedAt = DateTime.UtcNow
        });
    }
}
```

### Messages

```csharp
// Événement (passé, notification)
public record OrderCreated
{
    public Guid OrderId { get; init; }
    public string CustomerId { get; init; }
    public decimal Amount { get; init; }
    public DateTime CreatedAt { get; init; }
}

// Commande (impératif, action)
public record ProcessPayment
{
    public Guid PaymentId { get; init; }
    public Guid OrderId { get; init; }
    public decimal Amount { get; init; }
}
```

## Dead Letter & Retry

### Stratégie de retry progressive

```
Message → Queue principale → Consumer
              ↓ (échec)
         Queue retry (delay 5s) → retry
              ↓ (échec x3)
         Queue retry (delay 30s) → retry
              ↓ (échec x3)
         Dead Letter Queue → alerte + investigation manuelle
```

### Configuration Dead Letter

```csharp
cfg.ReceiveEndpoint("order-processing", e =>
{
    // Retry immédiat (erreurs transitoires)
    e.UseMessageRetry(r => r.Intervals(
        TimeSpan.FromSeconds(1),
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(30)));

    // Redelivery (erreurs plus longues)
    e.UseDelayedRedelivery(r => r.Intervals(
        TimeSpan.FromMinutes(1),
        TimeSpan.FromMinutes(5),
        TimeSpan.FromMinutes(30)));

    // Après tous les retries → dead letter
    e.ConfigureConsumer<OrderConsumer>(context);
});
```

## Monitoring

| Métrique | Seuil d'alerte | Action |
|----------|---------------|--------|
| Queue depth | > 10 000 messages | Ajouter des consumers |
| Consumer lag | > 5 minutes | Vérifier la performance |
| Dead letter count | > 0 | Investiguer les échecs |
| Connection drops | > 1/heure | Vérifier le réseau |
| Memory usage | > 80% | Purger ou ajouter des nœuds |

## Règles
- Chaque consumer doit être **idempotent**.
- Toujours configurer une dead letter queue.
- ACK manuel uniquement après traitement réussi.
- Les événements sont au passé (`OrderCreated`), les commandes à l'impératif (`ProcessPayment`).
- Ne jamais stocker d'état dans les messages — utiliser des IDs et requêter la base.
