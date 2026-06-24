---
name: dotnet-csharp-advisor
description: Développement .NET/C# avec ASP.NET Core, EF Core et patterns modernes. Se déclenche avec ".NET", "C#", "ASP.NET", "EF Core", "Entity Framework", "Minimal API", "Blazor", "LINQ", "NuGet", "dotnet".
---

# .NET/C# Advisor

## Workflow

### 1. Créer et structurer le projet

```bash
dotnet new sln -n MonProjet
dotnet new webapi -n MonProjet.Api --use-minimal-apis
dotnet new classlib -n MonProjet.Domain
dotnet new classlib -n MonProjet.Infrastructure
dotnet new xunit -n MonProjet.Tests
dotnet sln add **/*.csproj
```

`Directory.Build.props` à la racine (partagé par tous les projets) :

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
  </PropertyGroup>
</Project>
```

`Directory.Packages.props` pour la gestion centralisée des versions NuGet :

```xml
<Project>
  <PropertyGroup><ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally></PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.EntityFrameworkCore.SqlServer" Version="9.0.0" />
    <PackageVersion Include="xunit" Version="2.9.0" />
  </ItemGroup>
</Project>
```

---

### 2. Utiliser C# moderne (C# 12/13)

**Records** pour DTOs et Value Objects immuables :

```csharp
public record CreateUserCommand(string Name, string Email);
public record UserId(Guid Value);
```

**Primary constructors** (C# 12) pour les services :

```csharp
public class UserService(IUserRepository repo, ILogger<UserService> logger)
{
    public async Task<User?> GetAsync(Guid id) => await repo.FindAsync(id);
}
```

**Pattern matching exhaustif** :

```csharp
var label = order.Status switch
{
    OrderStatus.Pending => "En attente",
    OrderStatus.Shipped => "Expédié",
    OrderStatus.Cancelled => "Annulé",
    _ => throw new UnreachableException()
};
```

**Raw string literals** pour JSON/SQL embarqués :

```csharp
var json = """
    {
      "key": "value"
    }
    """;
```

**Critère de décision C# 12 vs 13** : cibler .NET 9 + C# 13 pour les nouveaux projets ; .NET 8 LTS si contrainte de stabilité long terme.

---

### 3. ASP.NET Core — Minimal APIs vs Controllers

| Critère | Minimal APIs | Controllers |
|---|---|---|
| Microservice / API simple | ✅ | ➖ |
| CQRS, projet complexe | ➖ | ✅ |
| Filters globaux, conventions | Limité | ✅ |
| Performance (cold start) | Meilleure | Standard |

**Minimal API avec endpoint group** :

```csharp
var app = builder.Build();
app.MapGroup("/users").MapUsersEndpoints();
app.Run();

// UsersEndpoints.cs
public static class UsersEndpoints
{
    public static RouteGroupBuilder MapUsersEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/{id:guid}", async (Guid id, UserService svc) =>
            await svc.GetAsync(id) is { } user ? Results.Ok(user) : Results.NotFound());
        return group;
    }
}
```

**Ordre du middleware pipeline** (critique) :

```csharp
app.UseExceptionHandler("/error");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers(); // ou app.MapGroup(...)
```

---

### 4. Entity Framework Core

**DbContext** :

```csharp
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder model)
        => model.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
}
```

**Configuration Fluent API séparée** :

```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasMaxLength(256).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
    }
}
```

**Migrations** :

```bash
dotnet ef migrations add InitialCreate --project MonProjet.Infrastructure --startup-project MonProjet.Api
dotnet ef database update --startup-project MonProjet.Api
```

**Optimisations clés** :

```csharp
// Lecture seule — désactive le change tracking
var users = await db.Users.AsNoTracking().ToListAsync();

// Bulk update EF Core 7+ — pas de chargement en mémoire
await db.Users.Where(u => u.IsInactive)
    .ExecuteUpdateAsync(s => s.SetProperty(u => u.ArchivedAt, DateTime.UtcNow));

// Éviter N+1 avec Include explicite
var orders = await db.Orders.Include(o => o.Lines).ThenInclude(l => l.Product).ToListAsync();
```

---

### 5. Authentication & Security

**JWT Bearer** :

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new()
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });
```

**Authorization policy** :

```csharp
builder.Services.AddAuthorization(opts =>
    opts.AddPolicy("AdminOnly", p => p.RequireRole("Admin").RequireClaim("department", "IT")));

// Usage Minimal API
group.MapDelete("/{id}", handler).RequireAuthorization("AdminOnly");
```

---

### 6. Background processing

**BackgroundService** (tâche périodique) :

```csharp
public class CleanupWorker(IServiceScopeFactory factory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Logs.Where(l => l.CreatedAt < DateTime.UtcNow.AddDays(-30))
                         .ExecuteDeleteAsync(ct);
            await Task.Delay(TimeSpan.FromHours(1), ct);
        }
    }
}
```

**Critère Hangfire vs BackgroundService** : Hangfire si besoin de dashboard, retry configurable, jobs récurrents Cron persistés ; `BackgroundService` si tâche simple sans dépendance supplémentaire.

---

### 7. Testing

**Test unitaire avec xUnit + NSubstitute** :

```csharp
public class UserServiceTests
{
    [Fact]
    public async Task GetAsync_ExistingId_ReturnsUser()
    {
        var repo = Substitute.For<IUserRepository>();
        repo.FindAsync(Arg.Any<Guid>()).Returns(new User { Id = Guid.NewGuid() });
        var svc = new UserService(repo, NullLogger<UserService>.Instance);

        var result = await svc.GetAsync(Guid.NewGuid());

        Assert.NotNull(result);
    }
}
```

**Test d'intégration avec WebApplicationFactory** :

```csharp
public class UsersApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task GetUser_Returns200()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/users/some-id");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
```

**Testcontainers** pour SQL Server réel :

```csharp
var container = new MsSqlBuilder().Build();
await container.StartAsync();
// utiliser container.GetConnectionString() dans les options EF
```

---

### 8. Performance

```csharp
// Source generator JSON — zéro reflection en production
[JsonSerializable(typeof(UserDto))]
public partial class AppJsonContext : JsonSerializerContext { }

// Regex compilée au build
[GeneratedRegex(@"^\d{8}$")]
private static partial Regex CinRegex();

// Span<T> — pas d'allocation heap
public static bool StartsWithCode(ReadOnlySpan<char> input)
    => input.StartsWith("B3G", StringComparison.OrdinalIgnoreCase);
```

**Benchmarker avant d'optimiser** :

```bash
dotnet add package BenchmarkDotNet
dotnet run -c Release -- --filter *MyBenchmark*
```

---

## Garde-fous & Anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| `.Result` / `.Wait()` sur Task | Deadlock ASP.NET | `await` partout |
| `DbContext` Singleton | Concurrence, data stale | Toujours Scoped |
| `.ToList()` avant `.Where()` | Charge toute la table en mémoire | Filtrer avant `ToList` |
| `Include` en cascade sans limite | Query CartésienneExplosion | Projeter avec `Select` |
| Secrets dans `appsettings.json` | Fuite credentials | `dotnet user-secrets` / Azure Key Vault |
| Ignorer les warnings nullable | NullReferenceException prod | `TreatWarningsAsErrors` + corriger |
| Scoped dans Singleton | `ObjectDisposedException` | Injecter `IServiceScopeFactory` |

---

## Bonnes pratiques 2026

- **.NET 9** : cibler net9.0 pour les nouveaux projets ; .NET 8 LTS si stabilité requise 3 ans.
- **Native AOT** : activer pour les microservices sans reflection (`<PublishAot>true</PublishAot>`), vérifier la compatibilité EF Core (limité).
- **OpenTelemetry** : intégrer `AddOpenTelemetry()` dès le départ (traces, métriques, logs) — rétrofit coûteux.
- **Keyed DI** (ASP.NET Core 8+) : `AddKeyedSingleton<IPayment, StripePayment>("stripe")` pour injecter plusieurs implémentations.
- **Problem Details** : utiliser `AddProblemDetails()` + `UseExceptionHandler` pour des erreurs HTTP uniformes RFC 9457.
- **Health checks** : `AddHealthChecks().AddDbContextCheck<AppDbContext>()` + endpoint `/health` pour les sondes k8s/Docker.
