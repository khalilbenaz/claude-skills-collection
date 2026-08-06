---
name: integration-test-builder
description: Crée des tests d'intégration pour vérifier l'interaction entre composants. Se déclenche avec "test d'intégration", "integration test", "tester l'API", "tester la DB", "test end-to-end", "test E2E", "Testcontainers", "WebApplicationFactory". Also triggers on "integration tests", "test with a real database", "end-to-end API test".
---

# Integration Test Builder

## Critères de décision : quel type de test choisir ?

| Scénario | Choix recommandé |
|---|---|
| Controller + DB + auth sur vrai schéma | `WebApplicationFactory` + Testcontainers |
| Microservice consommant une API tierce | WireMock/MockServer + Testcontainers DB |
| Message broker (Kafka, RabbitMQ) | Testcontainers (image officielle) |
| Lambda/Cloud Function légère, pas de DB | Base in-memory + `TestClient` |
| Contrat entre deux microservices | Pact (CDC) |
| Smoke test post-déploiement | Test E2E contre l'environnement staging |

Ne simuler avec un mock que ce qui est **impossible ou coûteux** à démarrer localement.

---

## Workflow en étapes

### 1. Cartographier les points d'intégration

Lister explicitement :
- Endpoints REST/GraphQL exposés
- Accès DB (requêtes, transactions, contraintes FK, migrations)
- Broker de messages (topics/queues consommés ou produits)
- Services tiers appelés (paiement, email, stockage, SSO)

Chaque point doit avoir au moins un scénario nominal et un scénario d'erreur.

---

### 2. Choisir et configurer l'infrastructure de test

**Testcontainers — .NET (xUnit)**
```csharp
// NuGet : Testcontainers, Testcontainers.PostgreSql
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public string ConnectionString => _db.GetConnectionString();

    public Task InitializeAsync() => _db.StartAsync();
    public Task DisposeAsync() => _db.StopAsync();
}
```

**Testcontainers — Node.js (Jest/Vitest)**
```ts
// npm i testcontainers
import { PostgreSqlContainer } from "@testcontainers/postgresql";
let container: StartedPostgreSqlContainer;
beforeAll(async () => { container = await new PostgreSqlContainer().start(); });
afterAll(async () => { await container.stop(); });
```

**Base in-memory (EF Core) — acceptable pour tests ultra-rapides uniquement**
```csharp
services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase("test_" + Guid.NewGuid()));
// Attention : pas de contraintes FK, pas de SQL brut, pas de migrations.
```

---

### 3. Configurer le serveur de test

**.NET — WebApplicationFactory**
```csharp
public class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder().Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            // Remplacer la vraie connexion par celle du conteneur
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o =>
                o.UseNpgsql(_db.GetConnectionString()));
        });
    }

    public async Task InitializeAsync() => await _db.StartAsync();
    public new async Task DisposeAsync() => await _db.StopAsync();
}
```

**Python FastAPI**
```python
# pip install httpx pytest-asyncio
from httpx import AsyncClient, ASGITransport
import pytest

@pytest.fixture
async def client(db_session):  # db_session = session sur DB de test
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

**Node.js / Express**
```ts
// npm i supertest @types/supertest
import request from "supertest";
import { app } from "../src/app";

describe("POST /orders", () => {
  it("creates order and returns 201", async () => {
    const res = await request(app).post("/orders").send({ productId: 1, qty: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(Number) });
  });
});
```

---

### 4. Fixtures et seed data

- Utiliser des **builders/factories** pour générer des entités cohérentes (pas de magic strings éparpillées).
- Seed minimal : créer uniquement les données nécessaires au test, pas un jeu de données global.
- Nettoyage : **rollback de transaction** (le plus propre) ou truncate après chaque test.

```csharp
// Builder pattern C#
var user = new UserBuilder().WithRole("admin").WithEmail("test@example.com").Build();
await dbContext.Users.AddAsync(user);
await dbContext.SaveChangesAsync();
```

```sql
-- Rollback via transaction xUnit
// Utiliser Respawn (NuGet) pour un truncate rapide entre tests
var respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
{
    DbAdapter = DbAdapter.Postgres,
    SchemasToInclude = ["public"]
});
await respawner.ResetAsync(connection);
```

---

### 5. Écrire les scénarios d'intégration

Structure d'un test : **Arrange → Act → Assert → Cleanup**

```csharp
[Fact]
public async Task CreateOrder_ValidPayload_Returns201AndPersists()
{
    // Arrange
    var client = _factory.CreateClient();
    var payload = new { productId = 42, quantity = 3 };

    // Act
    var response = await client.PostAsJsonAsync("/api/orders", payload);

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.Created);
    var body = await response.Content.ReadFromJsonAsync<OrderDto>();
    body!.Id.Should().BePositive();

    // Vérification en DB (pas seulement via l'API)
    using var scope = _factory.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Orders.Should().ContainSingle(o => o.Id == body.Id);
}
```

Couvrir systématiquement :
- Cas nominal (200/201/204)
- Validation échouée (400 + message d'erreur structuré)
- Ressource absente (404)
- Conflit (409)
- Accès non autorisé (401/403)

---

### 6. Simuler les services externes

**WireMock.Net (.NET)**
```csharp
// NuGet : WireMock.Net
var server = WireMockServer.Start();
server.Given(Request.Create().WithPath("/payments/charge").UsingPost())
      .RespondWith(Response.Create().WithStatusCode(200)
          .WithBodyAsJson(new { transactionId = "txn_123" }));

// Injecter l'URL dans la config de test
builder.UseSetting("PaymentService:BaseUrl", server.Url);
```

**LocalStack (AWS S3, SQS) via Testcontainers**
```csharp
var localstack = new LocalStackBuilder().WithServices(Service.S3, Service.SQS).Build();
await localstack.StartAsync();
```

---

### 7. Contract testing avec Pact

```ts
// Consumer side (Jest + @pact-foundation/pact)
const provider = new PactV3({ consumer: "OrderService", provider: "PaymentService" });

it("expects a charge endpoint", async () => {
  await provider
    .addInteraction({ uponReceiving: "a charge request", ... })
    .executeTest(async (mockServer) => {
      const result = await chargeCard(mockServer.url, { amount: 100 });
      expect(result.transactionId).toBeDefined();
    });
});
```

Publier le contrat sur Pact Broker et déclencher la vérification côté fournisseur dans la CI.

---

### 8. Isolation et parallélisation

- Chaque test doit pouvoir tourner **seul et dans n'importe quel ordre**.
- Ports dynamiques : Testcontainers gère cela automatiquement.
- Collections xUnit : `[Collection("db")]` pour partager un conteneur sans le redémarrer à chaque test — économise 5-15 s par suite.
- Ne jamais partager de données mutables entre tests sans transaction/rollback.

---

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Correctif |
|---|---|---|
| Tests qui partagent l'état DB sans rollback | Flakiness, ordre-dépendance | Respawn ou transaction rollback |
| Mocker la couche repository dans un test d'intégration | On ne teste plus l'intégration | Utiliser la vraie DB via Testcontainers |
| `Thread.Sleep` pour attendre un message broker | Lenteur, flakiness | `WaitUntil` / `Polly` avec timeout |
| Une seule WebApplicationFactory pour tous les tests | Config partagée, couplage | Fixture par suite ou `WithWebHostBuilder` par test |
| Ignorer les migrations : créer le schéma à la main | Désynchronisation avec prod | Toujours exécuter `DbContext.Database.MigrateAsync()` dans le fixture |
| Tests E2E en CI sur prod | Risque de side effects | Environnement staging dédié, données synthétiques |

---

## Commandes utiles

```bash
# Lancer uniquement les tests d'intégration (xUnit + filtre par category)
dotnet test --filter "Category=Integration"

# Vitest avec tag
vitest run --reporter=verbose integration/

# Pytest avec marker
pytest -m integration -v

# Générer le rapport de couverture (coverage uniquement sur tests d'intégration)
dotnet test --filter "Category=Integration" --collect:"XPlat Code Coverage"
```

---

## Bonnes pratiques 2026

- **Testcontainers Cloud** : décharger le démarrage des conteneurs sur un démon distant en CI pour réduire la durée des pipelines de 40-60 %.
- **Nommer les tests** comme des spécifications : `[Méthode]_[Contexte]_[Résultat attendu]` — lisible dans les rapports sans ouvrir le code.
- **Vérifier en DB** après un POST, pas seulement via la réponse HTTP — un bug de persistance silencieux passe sinon.
- **Séparer les collections CI** : `unit` (< 30 s), `integration` (< 3 min), `e2e` (optionnel sur merge seulement).
- **Ne pas tester la logique métier pure** dans un test d'intégration — c'est le rôle des tests unitaires. Un test d'intégration vérifie que les composants se parlent correctement.
