---
name: grpc-service-designer
description: Conception de services gRPC, définition de contrats Protobuf, patterns de streaming et intégration dans des architectures microservices. À utiliser quand l'utilisateur conçoit des APIs gRPC, écrit des fichiers .proto ou implémente du streaming. Se déclenche aussi avec "gRPC", "protobuf", "fichier proto", "streaming gRPC", "service gRPC", "contrat protobuf".
---

# Concepteur de Services gRPC

## Workflow en étapes

1. **Qualifier la communication** — choisir le bon pattern (voir tableau ci-dessous) avant d'ouvrir un éditeur.
2. **Concevoir le contrat `.proto`** — package versionné, messages dédiés par RPC, enums avec valeur 0 `UNSPECIFIED`.
3. **Générer le code** — `protoc` ou plugin SDK ; vérifier que le code généré ne doit jamais être édité manuellement.
4. **Implémenter serveur puis client** — gestion d'erreurs gRPC status codes, deadlines, idempotence.
5. **Sécuriser et observer** — TLS mutuel, intercepteurs logging/métriques, health checks.
6. **Valider la compatibilité** — tester la rétrocompatibilité binaire avant tout déploiement.

## Critère de choix du pattern de communication

| Pattern | Quand l'utiliser | Exemple concret |
|---------|-----------------|-----------------|
| **Unaire** | Requête/réponse atomique, latence faible | CRUD, auth, paiement ponctuel |
| **Server streaming** | Serveur pousse un volume inconnu | Notifications, export CSV/JSON |
| **Client streaming** | Client envoie un flux puis attend le résultat | Upload fichiers, ingestion de logs |
| **Bidirectionnel** | Dialogue continu, ordre important | Chat temps réel, monitoring interactif |

Règle heuristique : si la réponse tient dans une seule trame TCP et que le serveur répond immédiatement → unaire. Dès qu'une des parties envoie plusieurs messages → streaming.

## Conception du contrat Protobuf

### Structure de référence

```protobuf
syntax = "proto3";

package myapp.payments.v1;

option csharp_namespace = "MyApp.Payments.V1";
option go_package = "github.com/myapp/payments/v1;paymentsv1";

import "google/protobuf/timestamp.proto";

service PaymentService {
  // Unaire
  rpc CreatePayment(CreatePaymentRequest) returns (CreatePaymentResponse);
  // Server streaming
  rpc WatchStatus(WatchStatusRequest) returns (stream PaymentStatusEvent);
  // Client streaming
  rpc BatchImport(stream ImportTransactionRequest) returns (BatchImportResponse);
  // Bidirectionnel
  rpc SyncLedger(stream LedgerEntry) returns (stream LedgerAck);
}

message CreatePaymentRequest {
  string idempotency_key = 1;  // UUID v4, obligatoire
  int64  amount_cents    = 2;
  string currency        = 3;  // ISO 4217
  string recipient_id    = 4;
  map<string, string> metadata = 5;
}

message CreatePaymentResponse {
  string payment_id = 1;
  PaymentStatus status = 2;
  google.protobuf.Timestamp created_at = 3;
}

enum PaymentStatus {
  PAYMENT_STATUS_UNSPECIFIED = 0;  // obligatoire
  PAYMENT_STATUS_PENDING     = 1;
  PAYMENT_STATUS_PROCESSING  = 2;
  PAYMENT_STATUS_COMPLETED   = 3;
  PAYMENT_STATUS_FAILED      = 4;
}

// Champs supprimés → reserved, jamais effacés
// reserved 6, 7;
// reserved "old_field_name";
```

### Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Package | `company.service.v1` | `myapp.payments.v1` |
| Service | PascalCase + `Service` | `PaymentService` |
| RPC | PascalCase, verbe d'action | `CreatePayment` |
| Request/Response | Propre à chaque RPC | `CreatePaymentRequest` |
| Champ | snake_case | `payment_id` |
| Enum | SCREAMING_SNAKE_CASE avec préfixe enum | `PAYMENT_STATUS_PENDING` |
| Enum valeur 0 | Toujours `UNSPECIFIED` | `PAYMENT_STATUS_UNSPECIFIED` |

### Génération du code

```bash
# Installer protoc + plugins
brew install protobuf          # macOS
apt install -y protobuf-compiler   # Debian/Ubuntu

# Go
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Générer
protoc --proto_path=proto \
       --go_out=gen --go_opt=paths=source_relative \
       --go-grpc_out=gen --go-grpc_opt=paths=source_relative \
       proto/payments/v1/payment.proto

# C# / .NET : via NuGet Grpc.Tools (MSBuild auto-génère à la build)
# Java : via grpc-java plugin Maven/Gradle
```

## Implémentation C# / ASP.NET Core

### Serveur

```csharp
public sealed class PaymentServiceImpl : PaymentService.PaymentServiceBase
{
    private readonly IPaymentRepository _repo;
    private readonly ILogger<PaymentServiceImpl> _log;

    public override async Task<CreatePaymentResponse> CreatePayment(
        CreatePaymentRequest req, ServerCallContext ctx)
    {
        // Idempotence
        var existing = await _repo.FindByIdempotencyKeyAsync(req.IdempotencyKey, ctx.CancellationToken);
        if (existing is not null) return Map(existing);

        if (req.AmountCents <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "amount_cents must be > 0"));

        var payment = await _repo.CreateAsync(req.AmountCents, req.Currency, req.RecipientId, ctx.CancellationToken);
        _log.LogInformation("Payment {Id} created", payment.Id);
        return Map(payment);
    }

    public override async Task WatchStatus(
        WatchStatusRequest req,
        IServerStreamWriter<PaymentStatusEvent> stream,
        ServerCallContext ctx)
    {
        while (!ctx.CancellationToken.IsCancellationRequested)
        {
            var status = await _repo.GetStatusAsync(req.PaymentId, ctx.CancellationToken);
            await stream.WriteAsync(new PaymentStatusEvent { PaymentId = req.PaymentId, Status = status });

            if (status is PaymentStatus.Completed or PaymentStatus.Failed) break;

            await Task.Delay(TimeSpan.FromSeconds(1), ctx.CancellationToken);
        }
    }
}
```

### Enregistrement ASP.NET Core

```csharp
// Program.cs
builder.Services.AddGrpc(opt =>
{
    opt.MaxReceiveMessageSize = 4 * 1024 * 1024; // 4 MB
    opt.EnableDetailedErrors  = builder.Environment.IsDevelopment();
    opt.Interceptors.Add<ServerLoggingInterceptor>();
    opt.Interceptors.Add<ServerMetricsInterceptor>();
});
builder.Services.AddGrpcHealthChecks();

app.MapGrpcService<PaymentServiceImpl>();
app.MapGrpcHealthChecksService();
```

### Client avec deadline et retry

```csharp
var channel = GrpcChannel.ForAddress("https://payments.internal:5001", new GrpcChannelOptions
{
    ServiceConfig = new ServiceConfig
    {
        MethodConfigs = { new MethodConfig
        {
            Names = { MethodName.Default },
            RetryPolicy = new RetryPolicy
            {
                MaxAttempts        = 3,
                InitialBackoff     = TimeSpan.FromMilliseconds(100),
                MaxBackoff         = TimeSpan.FromSeconds(2),
                BackoffMultiplier  = 2,
                RetryableStatusCodes = { StatusCode.Unavailable }
            }
        }}
    }
});

var client = new PaymentService.PaymentServiceClient(channel);

var reply = await client.CreatePaymentAsync(
    new CreatePaymentRequest { IdempotencyKey = Guid.NewGuid().ToString(), AmountCents = 1500, Currency = "TND" },
    deadline: DateTime.UtcNow.AddSeconds(5));
```

## Gestion des erreurs — Status codes à utiliser

| Situation | Status code gRPC |
|-----------|-----------------|
| Champ manquant / invalide | `INVALID_ARGUMENT` |
| Ressource introuvable | `NOT_FOUND` |
| Conflit (doublon) | `ALREADY_EXISTS` |
| Non authentifié | `UNAUTHENTICATED` |
| Accès refusé | `PERMISSION_DENIED` |
| Timeout / deadline dépassée | `DEADLINE_EXCEEDED` |
| Service indisponible | `UNAVAILABLE` |
| Erreur interne | `INTERNAL` |

Toujours lever `RpcException` côté serveur — ne jamais laisser remonter une exception .NET brute.

## Versionning et compatibilité

- **Rétrocompatible** : ajouter de nouveaux champs (numéros supérieurs), nouvelles valeurs d'enum.
- **Breaking change** : changer le type d'un champ, renommer, supprimer → nouvelle version (`v2`).
- Champs supprimés : `reserved 5; reserved "old_name";` — jamais effacés.
- Déployer les deux versions en parallèle pendant la période de migration.

## Garde-fous et anti-patterns

| Anti-pattern | Problème | Correction |
|---|---|---|
| Réutiliser `Request` entre plusieurs RPCs | Couplage fort, évolution impossible | Un `Request`/`Response` par RPC |
| Champ `string` pour les montants monétaires | Arrondi, parsing | `int64 amount_cents` |
| Pas de deadline côté client | Appels pendants indéfinis | Toujours passer `deadline:` |
| Écrire dans le code généré | Perdu à la prochaine génération | Ne toucher qu'aux fichiers `.proto` |
| Enum sans valeur 0 | Decode incohérent protobuf3 | Toujours `FOO_UNSPECIFIED = 0` |
| Message `google.protobuf.Empty` en réponse | Pas d'évolution possible | Toujours un message dédié `XxxResponse` |
| Streaming pour des requêtes unitaires simples | Complexité inutile | Unaire si un message suffit |
| TLS désactivé en prod | Données en clair | mTLS obligatoire hors cluster privé |

## Checklist avant livraison

- [ ] `.proto` dans un package versionné (`v1`)
- [ ] Chaque RPC a son propre `Request` et `Response`
- [ ] Enum valeur 0 = `UNSPECIFIED`
- [ ] Champs supprimés marqués `reserved`
- [ ] Deadlines configurées côté client
- [ ] Intercepteurs logging + métriques côté serveur
- [ ] Health check gRPC exposé
- [ ] Tests de compatibilité binaire (ex : `buf breaking`)
