---
name: dev-hangfire-job-scheduler
description: Planification et gestion de background jobs avec Hangfire en .NET. Patterns de retry, scheduling récurrent, monitoring et bonnes pratiques. À utiliser quand l'utilisateur travaille avec Hangfire, des tâches de fond ou du job scheduling en .NET. Se déclenche aussi avec "hangfire", "background job", "tâche de fond .NET", "job récurrent", "cron job C#", "fire and forget".
---

# Hangfire Job Scheduler

## Workflow

1. **Identifier le type de job** : fire-and-forget, delayed, récurrent ou continuation.
2. **Concevoir le job** : définir la classe, les paramètres et la logique de retry.
3. **Configurer** : storage, dashboard, queues et options de sérialisation.
4. **Monitorer** : dashboard Hangfire, alertes sur les échecs.

## Types de jobs

| Type | Usage | API |
|------|-------|-----|
| **Fire-and-forget** | Exécution immédiate en arrière-plan | `BackgroundJob.Enqueue` |
| **Delayed** | Exécution différée | `BackgroundJob.Schedule` |
| **Recurring** | Planifié (CRON) | `RecurringJob.AddOrUpdate` |
| **Continuation** | Chaînage après un autre job | `BackgroundJob.ContinueJobWith` |
| **Batch** | Groupe de jobs (Hangfire Pro) | `BatchJob.StartNew` |

## Configuration de base

```csharp
// Program.cs
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
        QueuePollInterval = TimeSpan.FromSeconds(15),
        UseRecommendedIsolationLevel = true,
        SchemaName = "hangfire"
    }));

builder.Services.AddHangfireServer(options =>
{
    options.Queues = new[] { "critical", "default", "low" };
    options.WorkerCount = Environment.ProcessorCount * 2;
});

// Dashboard (protéger en production !)
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() }
});
```

## Conception de jobs

### Structure recommandée

```csharp
public interface IEmailJobService
{
    Task SendWelcomeEmail(string userId);
    Task SendMonthlyReport(string userId, int month, int year);
}

public class EmailJobService : IEmailJobService
{
    private readonly IEmailSender _sender;
    private readonly IUserRepository _users;

    public EmailJobService(IEmailSender sender, IUserRepository users)
    {
        _sender = sender;
        _users = users;
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    [Queue("default")]
    public async Task SendWelcomeEmail(string userId)
    {
        var user = await _users.GetByIdAsync(userId)
            ?? throw new InvalidOperationException($"User {userId} not found");

        await _sender.SendAsync(user.Email, "Bienvenue", "welcome-template");
    }

    [AutomaticRetry(Attempts = 5)]
    [Queue("low")]
    public async Task SendMonthlyReport(string userId, int month, int year)
    {
        // Job longue durée — vérifier l'annulation
        var user = await _users.GetByIdAsync(userId);
        var report = await GenerateReport(user, month, year);
        await _sender.SendAsync(user.Email, $"Rapport {month}/{year}", report);
    }
}
```

### Enregistrement des jobs

```csharp
// Fire-and-forget
BackgroundJob.Enqueue<IEmailJobService>(x => x.SendWelcomeEmail(userId));

// Delayed (dans 24h)
BackgroundJob.Schedule<IEmailJobService>(
    x => x.SendWelcomeEmail(userId),
    TimeSpan.FromHours(24));

// Récurrent (tous les jours à 8h)
RecurringJob.AddOrUpdate<IEmailJobService>(
    "daily-report",
    x => x.SendMonthlyReport(userId, DateTime.Now.Month, DateTime.Now.Year),
    "0 8 * * *",
    new RecurringJobOptions { TimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Paris") });

// Continuation
var parentId = BackgroundJob.Enqueue<IDataService>(x => x.ImportData());
BackgroundJob.ContinueJobWith<INotificationService>(
    parentId,
    x => x.NotifyImportComplete());
```

## Patterns de retry

### Stratégie exponentielle

```csharp
[AutomaticRetry(
    Attempts = 5,
    DelaysInSeconds = new[] { 30, 120, 600, 3600, 14400 },
    OnAttemptsExceeded = AttemptsExceededAction.Delete)]
public async Task ProcessPayment(string paymentId) { /* ... */ }
```

### Gestion des erreurs

```csharp
// Filtrer les erreurs non-retryable
public class SmartRetryAttribute : JobFilterAttribute, IElectStateFilter
{
    public void OnStateElection(ElectStateContext context)
    {
        if (context.CandidateState is FailedState failedState)
        {
            // Ne pas retry les erreurs métier
            if (failedState.Exception is BusinessException)
            {
                context.CandidateState = new DeletedState();
            }
        }
    }
}
```

## Bonnes pratiques

### À faire
- Rendre les jobs **idempotents** (exécution multiple = même résultat)
- Utiliser des **interfaces** pour les services de jobs (testabilité)
- Séparer les queues par priorité (`critical`, `default`, `low`)
- Monitorer le dashboard et configurer des alertes sur les échecs
- Utiliser des paramètres **simples et sérialisables** (pas d'objets complexes)
- Protéger le dashboard avec de l'authentification en production

### À éviter
- Passer des objets complexes ou des DbContext en paramètre
- Faire des jobs trop longs sans vérifier l'annulation
- Ignorer les jobs en échec dans le dashboard
- Utiliser `Thread.Sleep` au lieu de `Task.Delay`
- Oublier de configurer la timezone pour les jobs récurrents

## Règles
- Chaque job doit être idempotent.
- Toujours protéger le dashboard Hangfire en production.
- Les paramètres de jobs doivent être des types simples sérialisables.
- Configurer la timezone explicitement pour les jobs récurrents.


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
