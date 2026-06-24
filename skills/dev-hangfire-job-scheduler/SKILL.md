---
name: dev-hangfire-job-scheduler
description: Planification et gestion de background jobs avec Hangfire en .NET. Patterns de retry, scheduling récurrent, queues, monitoring, idempotence et bonnes pratiques 2026. À utiliser quand l'utilisateur travaille avec Hangfire, des tâches de fond ou du job scheduling en .NET. Se déclenche aussi avec "hangfire", "background job", "tâche de fond .NET", "job récurrent", "cron job C#", "fire and forget".
---

# Hangfire Job Scheduler

## Workflow en étapes

1. **Choisir le type de job** — voir tableau ci-dessous ; le type détermine l'API.
2. **Concevoir le job** — interface DI, paramètres simples, idempotence, attribut `[AutomaticRetry]`.
3. **Configurer le storage** — SQL Server (standard), Redis (haute fréquence), PostgreSQL (Hangfire.PostgreSql).
4. **Configurer le serveur** — queues priorisées, `WorkerCount`, `ServerTimeout`.
5. **Enregistrer les jobs** — au démarrage via `IRecurringJobManager` ou `RecurringJob.AddOrUpdate`.
6. **Protéger et déployer le dashboard** — filtre d'auth, HTTPS uniquement en production.
7. **Monitorer** — dashboard, logs structurés, alertes sur jobs Failed/Expired.

---

## Critères de décision : quel type de job ?

| Type | Quand l'utiliser | API |
|------|-----------------|-----|
| **Fire-and-forget** | Traitement hors request pipeline, sans résultat attendu | `BackgroundJob.Enqueue` |
| **Delayed** | Action différée (ex: relance J+1) | `BackgroundJob.Schedule` |
| **Recurring** | Batch quotidien, rapport, purge CRON | `RecurringJob.AddOrUpdate` |
| **Continuation** | Chaînage (import → notification) | `BackgroundJob.ContinueJobWith` |
| **Batch (Pro)** | Fan-out + agrégation (Hangfire Pro requis) | `BatchJob.StartNew` |

> **Règle** : si le job peut dépasser 30 s ou doit survivre au redémarrage du process → Hangfire plutôt que `Task.Run`.

---

## Configuration complète (Program.cs)

```csharp
// NuGet : Hangfire, Hangfire.SqlServer, Hangfire.AspNetCore
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()          // Newtonsoft.Json avec camelCase
    .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout       = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout   = TimeSpan.FromMinutes(5),
        QueuePollInterval            = TimeSpan.FromSeconds(15),
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks           = true,     // recommandé Hangfire 1.8+
        SchemaName                   = "hangfire"
    }));

builder.Services.AddHangfireServer(options =>
{
    options.Queues      = ["critical", "default", "low"];
    options.WorkerCount = Environment.ProcessorCount * 2;   // ajuster selon le workload
    options.ServerTimeout = TimeSpan.FromMinutes(5);
});

// Dashboard — TOUJOURS derrière un filtre en production
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization   = [new HangfireRoleAuthFilter("Admin")],
    IsReadOnlyFunc  = ctx => !ctx.GetHttpContext().User.IsInRole("Admin")
});
```

---

## Conception d'un job robuste

```csharp
public interface IEmailJobService
{
    Task SendWelcomeEmailAsync(string userId, CancellationToken ct = default);
    Task SendMonthlyReportAsync(int month, int year, CancellationToken ct = default);
}

public class EmailJobService : IEmailJobService
{
    private readonly IEmailSender _sender;
    private readonly IUserRepository _users;

    public EmailJobService(IEmailSender sender, IUserRepository users)
        => (_sender, _users) = (sender, users);

    // Retry exponentiel, échoue proprement sur erreur métier
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = [60, 300, 900],
                    OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    [Queue("default")]
    public async Task SendWelcomeEmailAsync(string userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new InvalidOperationException($"User {userId} not found");
        await _sender.SendAsync(user.Email, "Bienvenue", "welcome-template", ct);
    }

    [AutomaticRetry(Attempts = 2)]
    [Queue("low")]
    public async Task SendMonthlyReportAsync(int month, int year, CancellationToken ct = default)
    {
        // Job long → vérifier l'annulation entre les étapes
        var users = await _users.GetAllActiveAsync(ct);
        foreach (var u in users)
        {
            ct.ThrowIfCancellationRequested();
            var report = await BuildReportAsync(u, month, year, ct);
            await _sender.SendAsync(u.Email, $"Rapport {month}/{year}", report, ct);
        }
    }
}
```

---

## Enregistrement des jobs

```csharp
// Fire-and-forget
BackgroundJob.Enqueue<IEmailJobService>(x => x.SendWelcomeEmailAsync(userId, CancellationToken.None));

// Delayed (dans 24 h)
BackgroundJob.Schedule<IEmailJobService>(
    x => x.SendWelcomeEmailAsync(userId, CancellationToken.None),
    TimeSpan.FromHours(24));

// Recurring — via IRecurringJobManager (testable)
services.AddScoped<IJobBootstrapper, JobBootstrapper>();

public class JobBootstrapper : IJobBootstrapper
{
    private readonly IRecurringJobManager _jobs;
    public JobBootstrapper(IRecurringJobManager jobs) => _jobs = jobs;

    public void Register()
    {
        _jobs.AddOrUpdate<IEmailJobService>(
            "monthly-report",
            x => x.SendMonthlyReportAsync(0, 0, CancellationToken.None),
            "0 8 1 * *",                        // 1er du mois à 8 h
            new RecurringJobOptions
            {
                TimeZone = TimeZoneInfo.FindSystemTimeZoneById("Africa/Tunis")
            });
    }
}

// Continuation (chaînage)
var importId = BackgroundJob.Enqueue<IDataService>(x => x.ImportDataAsync(CancellationToken.None));
BackgroundJob.ContinueJobWith<INotificationService>(
    importId,
    x => x.NotifyImportCompleteAsync(CancellationToken.None));
```

---

## Gestion avancée des erreurs

### Filtre : ne pas retenter les erreurs métier

```csharp
public class SmartRetryFilter : JobFilterAttribute, IElectStateFilter
{
    public void OnStateElection(ElectStateContext context)
    {
        if (context.CandidateState is FailedState { Exception: BusinessException })
            context.CandidateState = new DeletedState { Reason = "Erreur métier — pas de retry" };
    }
}

// Enregistrement global
GlobalJobFilters.Filters.Add(new SmartRetryFilter());
```

### Retry exponentiel avec délais personnalisés

```csharp
[AutomaticRetry(
    Attempts          = 5,
    DelaysInSeconds   = [30, 120, 600, 3600, 14400],   // 30 s → 4 h
    OnAttemptsExceeded = AttemptsExceededAction.Fail)]
public async Task ProcessPaymentAsync(string paymentId, CancellationToken ct = default) { ... }
```

---

## Queues et priorités

```csharp
// Serveur avec ordre de consommation strict
options.Queues = ["critical", "default", "low"];
// Le serveur vide "critical" avant de traiter "default", etc.

// Déploiement multi-serveurs : dédier des serveurs par queue
// Serveur 1 : critical + default
// Serveur 2 : low (batch nocturne)
```

---

## Idempotence — pattern clé

```csharp
public async Task ImportInvoiceAsync(string invoiceId, CancellationToken ct = default)
{
    // Vérifier si déjà traité avant tout side-effect
    if (await _db.Invoices.AnyAsync(i => i.ExternalId == invoiceId && i.Imported, ct))
        return; // idempotent : deuxième exécution sans effet

    var invoice = await _externalApi.GetInvoiceAsync(invoiceId, ct);
    await _db.Invoices.AddAsync(new Invoice { ExternalId = invoiceId, Data = invoice, Imported = true }, ct);
    await _db.SaveChangesAsync(ct);
}
```

---

## Surveillance & monitoring

```bash
# Vérifier les jobs Failed depuis le dashboard
# URL : https://myapp/hangfire → onglet "Failed"

# Requête SQL de diagnostic (SQL Server)
SELECT State, COUNT(*) AS Count
FROM hangfire.Job
GROUP BY State;

# Jobs bloqués depuis > 1 h
SELECT Id, StateName, CreatedAt, DATEDIFF(MINUTE, CreatedAt, GETUTCDATE()) AS AgeMinutes
FROM hangfire.Job
WHERE StateName IN ('Processing', 'Enqueued')
  AND DATEDIFF(MINUTE, CreatedAt, GETUTCDATE()) > 60;
```

Intégrer avec OpenTelemetry / Serilog :
```csharp
// Serilog sink — chaque job loggue son JobId automatiquement
Log.ForContext("HangfireJobId", PerformContext?.BackgroundJob.Id)
   .Information("Traitement démarré pour {UserId}", userId);
```

---

## Garde-fous / Anti-patterns / Pièges

| Anti-pattern | Risque | Correction |
|---|---|---|
| Passer un `DbContext` ou `HttpContext` en paramètre | Sérialisation échoue / contexte périmé | Passer un `id` simple, résoudre via DI dans le job |
| Capturer `DateTime.Now` dans un job récurrent | Valeur figée à l'enregistrement, pas à l'exécution | Calculer la date à l'intérieur du job |
| `Thread.Sleep` dans un job | Bloque un worker thread | `await Task.Delay(...)` |
| `WorkerCount` trop élevé sur SQL Server | Contention sur les tables Hangfire | Limiter à 2–4× CPU ; monitorer les deadlocks |
| Dashboard sans auth en production | Exposition des données sensibles et contrôle des jobs | Toujours un `IDashboardAuthorizationFilter` |
| Jobs non idempotents | Données dupliquées si retry ou déploiement blue/green | Vérifier l'état avant chaque side-effect |
| Expressions CRON sans timezone | Décalage heure d'été / UTC | Toujours `RecurringJobOptions { TimeZone = ... }` |
| Stocker de gros payloads dans les paramètres | Table `hangfire.Job` enflée | Stocker en DB/blob, passer seulement un identifiant |

---

## Bonnes pratiques 2026

- Utiliser **`IRecurringJobManager`** injecté plutôt que la méthode statique `RecurringJob` (testabilité).
- Avec .NET 8+ et `IHostedService`, démarrer `JobBootstrapper.Register()` dans `IHostApplicationLifetime.ApplicationStarted`.
- Pour la haute disponibilité : plusieurs instances du serveur Hangfire pointant le même storage ; Hangfire gère les verrous.
- Activer `DisableGlobalLocks = true` (SQL Server 1.8+) pour réduire la contention.
- En production, activer la rétention : `GlobalJobFilters.Filters.Add(new ProlongExpirationTimeAttribute(TimeSpan.FromDays(7)))`.
- Tester les jobs avec `BackgroundJobClientFake` (Hangfire.InMemory) ou un mock de l'interface de service.


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
