---
name: dev-dotnet-csharp-advisor
description: Développement .NET/C# avec ASP.NET Core, EF Core et patterns modernes. Se déclenche avec ".NET", "C#", "ASP.NET", "EF Core", "Entity Framework", "Minimal API", "Blazor", "LINQ", "NuGet", "dotnet".
---

# .NET/C# Advisor

## Workflow

1. **Setup projet** : Créer avec `dotnet new` (webapi, console, classlib, solution), organiser en multi-projets (API, Domain, Infrastructure, Tests), configurer les `global usings` dans `GlobalUsings.cs`, centraliser les propriétés dans `Directory.Build.props` (versions NuGet, nullable, warnings), utiliser `Directory.Packages.props` pour la gestion centralisée des versions de packages.

2. **C# moderne** : Utiliser les `record` pour les DTOs et Value Objects immutables (`record UserDto(string Name, string Email)`), le pattern matching exhaustif (`switch` expressions, `is` patterns, list patterns), activer les `nullable reference types` (`<Nullable>enable</Nullable>`) pour éliminer les NullReferenceExceptions, les primary constructors (C# 12) pour la concision, les raw string literals (`"""..."""`) pour JSON/SQL embarqués.

3. **ASP.NET Core** : Choisir entre Minimal APIs (projets simples, microservices) et Controllers (projets complexes, CQRS), comprendre le middleware pipeline (ordre critique : exception handler → HTTPS → auth → routing → endpoints), configurer l'injection de dépendances (Singleton, Scoped, Transient), utiliser l'options pattern (`IOptions<T>`, `IOptionsSnapshot<T>`) pour la configuration typée.

4. **Entity Framework Core** : Définir le `DbContext` avec des `DbSet<T>`, configurer les entités via Fluent API (`modelBuilder.Entity<T>().HasKey(...)`), générer et appliquer les migrations (`dotnet ef migrations add`, `dotnet ef database update`), optimiser les queries (éviter N+1 avec `.Include()`, utiliser `.AsNoTracking()` en lecture seule), les bulk operations avec `ExecuteUpdateAsync`/`ExecuteDeleteAsync` (EF Core 7+), les interceptors pour le soft delete.

5. **Authentication et security** : Implémenter ASP.NET Core Identity pour l'authentification locale, configurer JWT Bearer authentication (`AddAuthentication().AddJwtBearer(...)`), intégrer OAuth2/OIDC avec des providers externes (Microsoft, Google), définir des authorization policies (`RequireRole`, `RequireClaim`, policy-based), protéger les données sensibles avec l'API Data Protection, appliquer HTTPS, CORS et les security headers.

6. **Background processing** : Implémenter des tâches récurrentes avec `IHostedService` et `BackgroundService`, planifier des jobs avec Hangfire (dashboard intégré, retry automatique, jobs récurrents Cron), utiliser les Worker Services (template dédié) pour les processus longue durée, les `System.Threading.Channels` pour les pipelines producteur/consommateur in-process haute performance.

7. **Testing .NET** : Structurer les tests avec xUnit (`[Fact]`, `[Theory]`, `[InlineData]`), mocker les dépendances avec Moq (`Mock<T>`) ou NSubstitute (API plus fluide), tester les endpoints ASP.NET Core avec `WebApplicationFactory<T>` (sans démarrer de vrai serveur), utiliser Testcontainers pour les tests d'intégration avec vraies bases de données, générer des données de test réalistes avec Bogus (`Faker<T>`).

8. **Performance .NET** : Utiliser `Span<T>` et `Memory<T>` pour éviter les allocations sur le tas dans les hot paths, `StringBuilder` pour la concaténation de strings en boucle, les source generators (`[GeneratedRegex]`, `JsonSerializerContext`) pour déplacer le travail à la compilation, la compilation AOT (Native AOT) pour les temps de démarrage rapides, benchmarker avec BenchmarkDotNet (`[Benchmark]`, `[MemoryDiagnoser]`) avant/après optimisation.

## Règles

- Utiliser les dernières features C# (C# 12/13) et cibler .NET 8/9 LTS pour bénéficier des améliorations de performance (JIT, GC) et des nouvelles APIs.
- Activer `<Nullable>enable</Nullable>` et `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` dans `Directory.Build.props` ; traiter les warnings nullability comme des bugs.
- Préférer les Minimal APIs pour les nouveaux projets de microservices : moins de boilerplate, plus de performance, structure claire avec les endpoint groups.
- Ne jamais bloquer sur des opérations async (`Task.Result`, `.Wait()`) dans du code async ; utiliser `await` jusqu'au bout pour éviter les deadlocks.
- Expliquer les choix d'architecture DI et les lifetimes (Singleton vs Scoped vs Transient) ; une lifetime incorrecte peut causer des bugs subtils de concurrence ou des memory leaks.
