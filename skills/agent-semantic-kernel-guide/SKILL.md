---
name: agent-semantic-kernel-guide
description: Développement d'agents IA avec Microsoft Semantic Kernel en .NET/C# et Python. Plugins natifs, plugins prompts, planners, filters, AgentGroupChat et intégration enterprise Azure. Se déclenche avec "Semantic Kernel", "SK", "Microsoft Semantic Kernel", "kernel plugin", "planner", "agent .NET", "C# agent", "enterprise AI", "Azure OpenAI agent", "kernel function".
---

# Semantic Kernel Guide — Agents IA Enterprise Microsoft

## Quand utiliser ce skill

Utiliser quand l'utilisateur développe des applications IA en .NET/C# ou Python avec un besoin d'architecture structurée : plugins typés, planification automatique, injection de dépendances, tests unitaires, ou intégration Azure (Azure OpenAI, Azure AI Search, Cosmos DB). SK est le choix naturel pour les équipes .NET adoptant l'IA générative en production.

**Ne pas utiliser SK si** : projet Python pur sans besoin enterprise → LangChain ou LlamaIndex suffisent. Script one-shot sans plugins → appel API direct suffit.

## Workflow en étapes

### 1. Installation et structure de projet

```bash
# .NET (recommandé : toujours figer la version)
dotnet add package Microsoft.SemanticKernel --version 1.30.0
dotnet add package Microsoft.SemanticKernel.Agents.Core
dotnet add package Microsoft.SemanticKernel.Plugins.Memory  # si RAG

# Python
pip install "semantic-kernel==1.14.0"
```

Structure .NET recommandée :
```
MyAIApp/
├── Plugins/
│   ├── WeatherPlugin.cs
│   └── Prompts/
│       └── Summarize/
│           ├── skprompt.txt
│           └── config.json
├── Filters/
│   └── LoggingFilter.cs
├── Program.cs
└── appsettings.json
```

### 2. Configuration du Kernel

```csharp
using Microsoft.SemanticKernel;

var builder = Kernel.CreateBuilder();

// Azure OpenAI avec Managed Identity (recommandé production — pas de clé API en dur)
builder.AddAzureOpenAIChatCompletion(
    deploymentName: "gpt-4o",
    endpoint: config["AzureOpenAI:Endpoint"]!,
    credential: new DefaultAzureCredential()  // Managed Identity
);

// Fallback : clé API (dev/test seulement)
// builder.AddOpenAIChatCompletion("gpt-4o", Environment.GetEnvironmentVariable("OPENAI_API_KEY")!);

builder.Services.AddLogging(c => c.AddConsole().SetMinimumLevel(LogLevel.Warning));

var kernel = builder.Build();
```

**ASP.NET Core** — ne jamais instancier `Kernel` manuellement :
```csharp
// Program.cs
builder.Services.AddKernel()
    .AddAzureOpenAIChatCompletion(deploymentName, endpoint, credential);
builder.Services.AddSingleton<WeatherPlugin>();
builder.Services.AddFromType<WeatherPlugin>("Weather");
```

### 3. Plugins natifs — règles critiques

Les `[Description]` sont lues par le LLM pour choisir quelle fonction appeler. **Des descriptions vagues = appels incorrects.**

```csharp
using Microsoft.SemanticKernel;
using System.ComponentModel;

public class WeatherPlugin
{
    private readonly IHttpClientFactory _httpFactory;
    public WeatherPlugin(IHttpClientFactory httpFactory) => _httpFactory = httpFactory;

    [KernelFunction("get_current_weather")]
    [Description("Obtient la météo actuelle (température, conditions) pour une ville. N'utiliser que pour des informations météo en temps réel.")]
    public async Task<string> GetWeatherAsync(
        [Description("Nom de la ville, ex: 'Paris', 'Lyon'")] string city,
        [Description("Unité de température : 'celsius' (défaut) ou 'fahrenheit'")] string unit = "celsius")
    {
        try
        {
            // Appel API réel
            var client = _httpFactory.CreateClient("weather");
            var response = await client.GetStringAsync($"/weather?city={city}&unit={unit}");
            return response;
        }
        catch (HttpRequestException ex)
        {
            // Toujours retourner une string — ne jamais lever une exception vers le LLM
            return $"Impossible d'obtenir la météo pour {city} : {ex.Message}";
        }
    }
}

// Enregistrement
kernel.Plugins.AddFromType<WeatherPlugin>("Weather");
// Ou depuis une instance (avec DI)
kernel.Plugins.AddFromObject(new WeatherPlugin(httpFactory), "Weather");
```

### 4. Plugins prompts — template fichier

`Plugins/Prompts/Summarize/skprompt.txt` :
```
Résumez le texte suivant en {{$max_words}} mots maximum. Conservez les points clés et le ton original.

TEXTE :
{{$input}}

RÉSUMÉ :
```

`Plugins/Prompts/Summarize/config.json` :
```json
{
  "schema": 1,
  "name": "Summarize",
  "description": "Résume un texte en un nombre maximum de mots",
  "execution_settings": {
    "default": { "max_tokens": 500, "temperature": 0.3 }
  },
  "input_variables": [
    {"name": "input", "description": "Texte à résumer", "is_required": true},
    {"name": "max_words", "description": "Nombre de mots maximum", "default": "100"}
  ]
}
```

Chargement :
```csharp
kernel.ImportPluginFromPromptDirectory("./Plugins/Prompts");
var result = await kernel.InvokeAsync("Summarize", "Summarize",
    new KernelArguments { ["input"] = longText, ["max_words"] = "50" });
```

### 5. Function Calling — deux modes

```csharp
var chatService = kernel.GetRequiredService<IChatCompletionService>();
var history = new ChatHistory("Vous êtes un assistant expert.");
history.AddUserMessage("Quelle est la météo à Paris et Lyon ?");

// Mode AUTO : le LLM choisit et exécute les fonctions automatiquement
var autoSettings = new OpenAIPromptExecutionSettings
{
    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
    Temperature = 0.1,
    MaxTokens = 1000,
};
var response = await chatService.GetChatMessageContentAsync(history, autoSettings, kernel);

// Mode MANUEL : récupérer les tool calls et les traiter soi-même
var manualSettings = new OpenAIPromptExecutionSettings
{
    ToolCallBehavior = ToolCallBehavior.EnableKernelFunctions,
};
```

**Critère de choix** : utiliser `AutoInvoke` pour les agents conversationnels. Utiliser `EnableKernelFunctions` (manuel) si besoin de validation, d'audit, ou de contrôle des coûts par appel.

### 6. Agents et AgentGroupChat

```csharp
using Microsoft.SemanticKernel.Agents;

var agent = new ChatCompletionAgent
{
    Name = "AnalystAgent",
    Instructions = "Vous êtes un analyste financier. Analysez les données avec précision et citez vos sources.",
    Kernel = kernel,
    Arguments = new KernelArguments(new OpenAIPromptExecutionSettings
    {
        ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
    }),
};

// Invocation streaming
var thread = new ChatHistory();
thread.AddUserMessage("Analysez ces résultats : ...");
await foreach (var chunk in agent.InvokeStreamingAsync(thread))
    Console.Write(chunk.Content);
```

**AgentGroupChat** — plusieurs agents collaborant :
```csharp
var chat = new AgentGroupChat(writerAgent, reviewerAgent)
{
    ExecutionSettings = new AgentGroupChatSettings
    {
        SelectionStrategy = new SequentialSelectionStrategy(),
        TerminationStrategy = new RegexTerminationStrategy("[APPROUVÉ]") { MaximumIterations = 6 },
    }
};
await chat.AddChatMessageAsync(new ChatMessageContent(AuthorRole.User, "Rédigez un article sur..."));
await foreach (var msg in chat.InvokeAsync())
    Console.WriteLine($"[{msg.AuthorName}] {msg.Content}");
```

### 7. Filters — middleware d'interception

```csharp
// Logging + sécurité sur chaque appel de fonction
public class SafetyFilter : IFunctionInvocationFilter
{
    public async Task OnFunctionInvocationAsync(
        FunctionInvocationContext context,
        Func<FunctionInvocationContext, Task> next)
    {
        var fnName = context.Function.PluginName + "." + context.Function.Name;
        Console.WriteLine($"[CALL] {fnName} — args: {JsonSerializer.Serialize(context.Arguments)}");

        await next(context);  // exécution effective

        Console.WriteLine($"[DONE] {fnName} — result: {context.Result?.GetValue<string>()?.Substring(0, 100)}");
    }
}

kernel.FunctionInvocationFilters.Add(new SafetyFilter());
// Également disponible : IPromptRenderFilter (intercepte avant rendu du prompt)
```

### 8. Memory et RAG

```csharp
// dotnet add package Microsoft.SemanticKernel.Plugins.Memory
var memoryBuilder = new MemoryBuilder();
memoryBuilder.WithAzureOpenAITextEmbeddingGeneration(
    "text-embedding-3-small", endpoint, credential);

// Dev : in-memory. Production : AzureAISearchMemoryStore, QdrantMemoryStore
memoryBuilder.WithMemoryStore(new VolatileMemoryStore());
var memory = memoryBuilder.Build();

await memory.SaveInformationAsync("docs", id: "doc1", text: "Contenu du document...");
var results = await memory.SearchAsync("docs", "question utilisateur", limit: 3, minRelevanceScore: 0.7);
foreach (var r in results)
    Console.WriteLine($"Score: {r.Relevance:F2} — {r.Metadata.Text}");
```

**Stores production recommandés** : Azure AI Search (intégration native Azure), Qdrant (self-hosted open-source), Redis (faible latence).

### 9. Intégration enterprise

| Besoin | Solution SK |
|--------|------------|
| Auth sans clé API | `DefaultAzureCredential` + Managed Identity |
| Persistance historique | Cosmos DB + `ISemanticTextMemory` |
| RAG vectoriel | Azure AI Search `AzureAISearchMemoryStore` |
| Observabilité | `IFunctionInvocationFilter` + OpenTelemetry |
| Tests unitaires | Mock `IChatCompletionService` avec Moq |

Test unitaire sans appel LLM réel :
```csharp
var mockChat = new Mock<IChatCompletionService>();
mockChat.Setup(s => s.GetChatMessageContentsAsync(It.IsAny<ChatHistory>(), It.IsAny<PromptExecutionSettings>(), It.IsAny<Kernel>(), It.IsAny<CancellationToken>()))
    .ReturnsAsync([new ChatMessageContent(AuthorRole.Assistant, "réponse mockée")]);

var kernel = Kernel.CreateBuilder()
    .Build();
kernel.GetAllServices<IChatCompletionService>(); // injecter le mock
```

## Garde-fous et anti-patterns

- **Descriptions `[Description]` vagues** → le LLM appelle la mauvaise fonction ou hallucine des paramètres. Toujours être précis et inclure un exemple dans la description si le format est non-trivial.
- **Exception non catchée dans un `KernelFunction`** → interrompt le loop du LLM. Toujours retourner une `string` d'erreur descriptive.
- **`Kernel` instancié `new Kernel()` dans ASP.NET Core** → pas de cycle de vie, pas de DI, pas testable. Utiliser `services.AddKernel()`.
- **Planner sans restriction de plugins** → un `HandlebarsPlanner` ou `FunctionCallingPlanner` peut appeler n'importe quelle fonction enregistrée, y compris destructives. Filtrer avec `ExcludedPlugins` ou des kernel séparés par scope.
- **`ToolCallBehavior.AutoInvokeKernelFunctions` sans timeout** → boucle infinie possible si le LLM ne sait pas quand s'arrêter. Ajouter `MaxAutoInvokeAttempts = 5` dans `OpenAIPromptExecutionSettings`.
- **Versionner les prompts comme du texte** → les fichiers `skprompt.txt` et `config.json` sont du code. Les inclure dans la CI, les tester avec des cas de régression automatisés.
- **Memory store volatile en production** → `VolatileMemoryStore` ne persiste pas entre les redémarrages. Remplacer par un store durable dès le premier déploiement.

## Bonnes pratiques 2026

- Utiliser **SK 1.30+** : l'API `Agents` est stable, `AgentGroupChat` est en GA.
- Préférer **GPT-4o** + `AutoInvokeKernelFunctions` aux anciens planners (StepwisePlanner déprécié).
- Activer **OpenTelemetry** : SK émet des spans pour chaque invocation de fonction — intégrer avec Azure Monitor ou Jaeger.
- **Séparer les kernels par agent** dans un `AgentGroupChat` : chaque agent peut avoir son propre modèle et ses propres plugins sans interférence.
- **`KernelArguments` est thread-safe** : réutiliser les instances entre requêtes, mais créer un `ChatHistory` par session utilisateur.
- Définir `MaxTokens` dans chaque `execution_settings` des prompts templates — sans limite, un résumé peut consommer tout le contexte.


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
