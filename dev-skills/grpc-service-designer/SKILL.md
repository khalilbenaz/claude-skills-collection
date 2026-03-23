---
name: grpc-service-designer
description: Conception de services gRPC, définition de contrats Protobuf, patterns de streaming et intégration dans des architectures microservices. À utiliser quand l'utilisateur conçoit des APIs gRPC, écrit des fichiers .proto ou implémente du streaming. Se déclenche aussi avec "gRPC", "protobuf", "fichier proto", "streaming gRPC", "service gRPC", "contrat protobuf".
---

# Concepteur de Services gRPC

## Workflow

1. **Comprendre le besoin** : identifier le type de communication (unaire, streaming serveur, streaming client, bidirectionnel).
2. **Concevoir le contrat** : définir les messages et services dans un fichier `.proto`.
3. **Implémenter** : proposer le code serveur et client adapté au langage.
4. **Valider** : vérifier la compatibilité, la gestion d'erreurs et la performance.

## Types de communication gRPC

| Type | Usage | Exemple |
|------|-------|---------|
| **Unaire** | Requête/réponse classique | CRUD, authentification |
| **Server streaming** | Serveur envoie un flux | Notifications, feeds temps réel |
| **Client streaming** | Client envoie un flux | Upload de fichiers, logs batch |
| **Bidirectionnel** | Flux dans les deux sens | Chat, jeux en ligne, monitoring |

## Conception de contrats Protobuf

### Structure d'un fichier .proto

```protobuf
syntax = "proto3";

package myapp.payments.v1;

option csharp_namespace = "MyApp.Payments.V1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

// Service de gestion des paiements
service PaymentService {
  // Créer un paiement (unaire)
  rpc CreatePayment(CreatePaymentRequest) returns (PaymentResponse);

  // Suivre le statut en temps réel (server streaming)
  rpc WatchPaymentStatus(WatchPaymentRequest) returns (stream PaymentStatusUpdate);

  // Envoyer des transactions par lot (client streaming)
  rpc BatchTransactions(stream TransactionRequest) returns (BatchTransactionResponse);
}

message CreatePaymentRequest {
  string idempotency_key = 1;
  int64 amount_cents = 2;
  string currency = 3;
  string recipient_id = 4;
  map<string, string> metadata = 5;
}

message PaymentResponse {
  string payment_id = 1;
  PaymentStatus status = 2;
  google.protobuf.Timestamp created_at = 3;
}

enum PaymentStatus {
  PAYMENT_STATUS_UNSPECIFIED = 0;
  PAYMENT_STATUS_PENDING = 1;
  PAYMENT_STATUS_PROCESSING = 2;
  PAYMENT_STATUS_COMPLETED = 3;
  PAYMENT_STATUS_FAILED = 4;
}
```

### Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Package | `company.service.v1` | `myapp.payments.v1` |
| Service | PascalCase + `Service` | `PaymentService` |
| RPC | PascalCase, verbe d'action | `CreatePayment` |
| Message | PascalCase + `Request`/`Response` | `CreatePaymentRequest` |
| Champ | snake_case | `payment_id` |
| Enum | SCREAMING_SNAKE_CASE avec préfixe | `PAYMENT_STATUS_PENDING` |
| Enum valeur 0 | Toujours `UNSPECIFIED` | `PAYMENT_STATUS_UNSPECIFIED` |

## Implémentation C# / ASP.NET

### Serveur gRPC

```csharp
public class PaymentServiceImpl : PaymentService.PaymentServiceBase
{
    private readonly IPaymentRepository _repo;

    public override async Task<PaymentResponse> CreatePayment(
        CreatePaymentRequest request, ServerCallContext context)
    {
        // Vérifier l'idempotence
        var existing = await _repo.FindByIdempotencyKey(request.IdempotencyKey);
        if (existing != null)
            return MapToResponse(existing);

        var payment = new Payment
        {
            Amount = request.AmountCents,
            Currency = request.Currency,
            RecipientId = request.RecipientId
        };

        await _repo.CreateAsync(payment);
        return MapToResponse(payment);
    }

    public override async Task WatchPaymentStatus(
        WatchPaymentRequest request,
        IServerStreamWriter<PaymentStatusUpdate> responseStream,
        ServerCallContext context)
    {
        while (!context.CancellationToken.IsCancellationRequested)
        {
            var status = await _repo.GetStatus(request.PaymentId);
            await responseStream.WriteAsync(new PaymentStatusUpdate
            {
                PaymentId = request.PaymentId,
                Status = status
            });

            if (status is PaymentStatus.Completed or PaymentStatus.Failed)
                break;

            await Task.Delay(1000, context.CancellationToken);
        }
    }
}
```

### Enregistrement dans ASP.NET

```csharp
// Program.cs
builder.Services.AddGrpc(options =>
{
    options.MaxReceiveMessageSize = 4 * 1024 * 1024; // 4 MB
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.Interceptors.Add<LoggingInterceptor>();
});

app.MapGrpcService<PaymentServiceImpl>();
```

## Bonnes pratiques

### Versionning
- Utiliser des packages versionnés (`v1`, `v2`)
- Ne jamais supprimer ou renommer des champs — les marquer comme `reserved`
- Ajouter de nouveaux champs avec des numéros incrémentaux

### Performance
- Utiliser le streaming pour les gros volumes de données
- Configurer les deadlines côté client (pas de requêtes infinies)
- Implémenter des intercepteurs pour logging et métriques

### Gestion d'erreurs
- Utiliser les status codes gRPC standards (`NOT_FOUND`, `ALREADY_EXISTS`, etc.)
- Inclure des détails d'erreur structurés via `Status.DebugException`
- Implémenter des retry policies côté client

## Règles
- Toujours commencer la valeur 0 d'un enum par `UNSPECIFIED`.
- Chaque RPC doit avoir son propre message Request/Response (pas de réutilisation).
- Les champs supprimés doivent être marqués `reserved`, jamais supprimés.
- Configurer des deadlines sur chaque appel client.
