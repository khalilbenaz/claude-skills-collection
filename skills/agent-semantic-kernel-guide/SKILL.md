---
name: agent-semantic-kernel-guide
description: Développement d'agents IA avec Microsoft Semantic Kernel en .NET/C# et Python. Plugins natifs, plugins prompts, planners et intégration enterprise Azure. Se déclenche avec "Semantic Kernel", "SK", "Microsoft Semantic Kernel", "kernel plugin", "planner", "agent .NET", "C# agent", "enterprise AI", "Azure OpenAI agent", "kernel function".
---

# Semantic Kernel Guide — Agents IA Enterprise Microsoft

## Quand utiliser ce skill

Utiliser ce skill quand l'utilisateur développe des applications IA en .NET/C# et veut intégrer des LLMs avec un framework enterprise-grade supportant l'injection de dépendances, les tests unitaires et l'intégration Azure. Également pertinent pour Python quand l'utilisateur a besoin de plugins structurés, de planification automatique (planners), ou d'une intégration profonde avec l'écosystème Microsoft (Azure AI, Cosmos DB, Azure Search). Semantic Kernel est le choix naturel pour les équipes .NET souhaitant adopter l'IA générative.

## Workflow

1. **Setup et installation**
   - **.NET/C#** : `dotnet add package Microsoft.SemanticKernel` (version 1.30.0+)
   - **Python** : `pip install semantic-kernel==1.14.0`
   - Structure de projet recommandée (.NET) :
     ```
     MyAIApp/
     ├── Plugins/
     │   ├── WeatherPlugin.cs
     │   └── Prompts/
     │       └── Summarize/
     │           ├── skprompt.txt
     │           └── config.json
     ├── Program.cs
     └── appsettings.json
     ```

2. **Configuration du Kernel**
   - Le `Kernel` est le conteneur central — il orchestre les services IA et les plugins :
     ```csharp
     using Microsoft.SemanticKernel;

     var builder = Kernel.CreateBuilder();

     // Azure OpenAI (recommandé enterprise)
     builder.AddAzureOpenAIChatCompletion(
         deploymentName: "gpt-4o",
         endpoint: Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!,
         apiKey: Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY")!
     );

     // Ou OpenAI direct
     builder.AddOpenAIChatCompletion(
         modelId: "gpt-4o",
         apiKey: Environment.GetEnvironmentVariable("OPENAI_API_KEY")!
     );

     // Injection de dépendances
     builder.Services.AddLogging(c => c.AddConsole().SetMinimumLevel(LogLevel.Information));

     var kernel = builder.Build();
     ```

3. **Plugins natifs (KernelFunction)**
   - Les plugins natifs sont des classes C# avec des méthodes annotées :
     ```csharp
     using Microsoft.SemanticKernel;
     using System.ComponentModel;

     public class WeatherPlugin
     {
         [KernelFunction("get_weather")]
         [Description("Obtient la météo actuelle pour une ville donnée")]
         public async Task<string> GetWeatherAsync(
             [Description("Le nom de la ville")] string city,
             [Description("L'unité : celsius ou fahrenheit")] string unit = "celsius")
         {
             // Appel API météo réel ici
             return $"La météo à {city} est de 22°{(unit == "celsius" ? "C" : "F")}, ensoleillé.";
         }

         [KernelFunction("list_cities")]
         [Description("Liste les villes disponibles pour la météo")]
         public List<string> GetAvailableCities() =>
             ["Paris", "Lyon", "Marseille", "Bordeaux"];
     }

     // Enregistrement du plugin
     kernel.Plugins.AddFromType<WeatherPlugin>("Weather");
     ```

4. **Plugins prompts (Prompt Templates)**
   - Définir dans des fichiers `.txt` + `config.json` pour une organisation claire
   - `skprompt.txt` :
     ```
     Vous êtes un assistant expert en synthèse. Résumez le texte suivant en {{$max_words}} mots maximum.
     Conservez les points clés et le ton original.

     TEXTE :
     {{$input}}

     RÉSUMÉ :
     ```
   - `config.json` :
     ```json
     {
       "schema": 1,
       "name": "Summarize",
       "description": "Résume un texte en un nombre de mots donné",
       "execution_settings": {
         "default": {
           "max_tokens": 500,
           "temperature": 0.3
         }
       },
       "input_variables": [
         {"name": "input", "description": "Texte à résumer", "is_required": true},
         {"name": "max_words", "description": "Nombre de mots max", "default": "100"}
       ]
     }
     ```
   - Chargement : `kernel.ImportPluginFromPromptDirectory("./Plugins/Prompts")`

5. **Function Calling et invocation**
   - Invocation directe d'une fonction :
     ```csharp
     var result = await kernel.InvokeAsync("Weather", "get_weather",
         new KernelArguments { ["city"] = "Paris", ["unit"] = "celsius" });
     Console.WriteLine(result.GetValue<string>());
     ```
   - Auto-invoke avec function calling activé :
     ```csharp
     var settings = new OpenAIPromptExecutionSettings
     {
         ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
     };
     var chatService = kernel.GetRequiredService<IChatCompletionService>();
     var history = new ChatHistory("Vous êtes un assistant météo.");
     history.AddUserMessage("Quelle est la météo à Paris et Lyon ?");
     var response = await chatService.GetChatMessageContentAsync(history, settings, kernel);
     ```

6. **Planners — exécution automatique de plans**
   - **Handlebars Planner** : génère un plan Handlebars template puis l'exécute
     ```csharp
     using Microsoft.SemanticKernel.Planning.Handlebars;

     var planner = new HandlebarsPlanner(new HandlebarsPlannerOptions
     {
         MaxTokens = 4000,
     });
     var plan = await planner.CreatePlanAsync(kernel, "Résume ce document et envoie par email");
     var result = await plan.InvokeAsync(kernel, new KernelArguments { ["document"] = text });
     ```
   - **Function Calling Planner** : utilise le function calling natif du LLM comme mécanisme de planning (recommandé pour GPT-4o+)
   - Piège : les planners peuvent appeler des fonctions non souhaitées — restreindre avec `ExcludedPlugins`

7. **Memory et embeddings**
   - Semantic Kernel Memory pour la recherche sémantique :
     ```csharp
     // Installation : dotnet add package Microsoft.SemanticKernel.Plugins.Memory
     var memoryBuilder = new MemoryBuilder();
     memoryBuilder.WithOpenAITextEmbeddingGeneration("text-embedding-3-small", apiKey);
     memoryBuilder.WithMemoryStore(new VolatileMemoryStore()); // ou Azure AI Search
     var memory = memoryBuilder.Build();

     await memory.SaveInformationAsync("docs", id: "doc1",
         text: "Semantic Kernel est un framework open-source Microsoft...");

     var results = await memory.SearchAsync("docs", "Microsoft AI framework", limit: 3);
     ```
   - Pour la production : `AzureAISearchMemoryStore`, `QdrantMemoryStore`, `ChromaMemoryStore`

8. **Agents (ChatCompletionAgent et OpenAIAssistantAgent)**
   - **ChatCompletionAgent** : agent léger basé sur le chat completion
     ```csharp
     using Microsoft.SemanticKernel.Agents;

     var agent = new ChatCompletionAgent
     {
         Name = "AnalystAgent",
         Instructions = "Vous êtes un analyste financier expert. Analysez les données fournies.",
         Kernel = kernel,
         Arguments = new KernelArguments(new OpenAIPromptExecutionSettings
         {
             ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
         }),
     };

     var thread = new ChatHistory();
     thread.AddUserMessage("Analysez ces résultats financiers : ...");
     await foreach (var response in agent.InvokeAsync(thread))
         Console.Write(response.Content);
     ```
   - **AgentGroupChat** : plusieurs agents qui collaborent avec des stratégies de sélection et de terminaison

9. **Filters et middleware**
   - Les filters interceptent les invocations pour logging, validation, cache :
     ```csharp
     public class LoggingFilter : IFunctionInvocationFilter
     {
         public async Task OnFunctionInvocationAsync(
             FunctionInvocationContext context,
             Func<FunctionInvocationContext, Task> next)
         {
             Console.WriteLine($"[AVANT] {context.Function.Name}");
             await next(context); // exécution de la fonction
             Console.WriteLine($"[APRÈS] {context.Function.Name}: {context.Result?.GetValue<string>()}");
         }
     }

     kernel.FunctionInvocationFilters.Add(new LoggingFilter());
     ```
   - `IPromptRenderFilter` : intercepte avant le rendu du prompt (modifier dynamiquement le contexte)
   - Utilisation : logging, rate limiting, content safety, A/B testing de prompts

10. **Intégration enterprise**
    - **Azure AI Foundry** : `AddAzureOpenAIChatCompletion` avec Managed Identity (sans API key !)
    - **Azure AI Search** : memory store pour RAG avec indexation et recherche vectorielle
    - **Cosmos DB** : persistance de l'état des agents et historiques de conversation
    - **Dependency Injection** : `services.AddKernel()` avec `IKernelBuilder` dans ASP.NET Core
    - **Testing** : mocker `IChatCompletionService` avec `Moq` pour des tests unitaires déterministes

## Exemples de code

### Application complète C# — Agent avec plugins et function calling automatique

```csharp
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using System.ComponentModel;

// ===== PLUGINS =====
public class MathPlugin
{
    [KernelFunction("calculate")]
    [Description("Effectue un calcul mathématique et retourne le résultat numérique")]
    public double Calculate(
        [Description("L'expression mathématique, ex: '15 * 23 + 7'")] string expression)
    {
        // Utiliser un parser en production (ex: NCalc)
        return new System.Data.DataTable().Compute(expression, null) is double r ? r : 0;
    }
}

public class DatePlugin
{
    [KernelFunction("get_date")]
    [Description("Retourne la date et l'heure actuelles")]
    public string GetCurrentDate() =>
        DateTime.Now.ToString("dddd d MMMM yyyy 'à' HH:mm", new System.Globalization.CultureInfo("fr-FR"));

    [KernelFunction("days_until")]
    [Description("Calcule le nombre de jours jusqu'à une date")]
    public int DaysUntil(
        [Description("La date cible au format YYYY-MM-DD")] string targetDate)
    {
        var target = DateOnly.Parse(targetDate);
        return target.DayNumber - DateOnly.FromDateTime(DateTime.Now).DayNumber;
    }
}

// ===== PROGRAMME PRINCIPAL =====
class Program
{
    static async Task Main()
    {
        // Configuration du kernel
        var builder = Kernel.CreateBuilder();
        builder.AddOpenAIChatCompletion(
            modelId: "gpt-4o",
            apiKey: Environment.GetEnvironmentVariable("OPENAI_API_KEY")!
        );

        var kernel = builder.Build();

        // Enregistrement des plugins
        kernel.Plugins.AddFromType<MathPlugin>("Math");
        kernel.Plugins.AddFromType<DatePlugin>("Date");

        // Configuration : function calling automatique
        var executionSettings = new OpenAIPromptExecutionSettings
        {
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
            Temperature = 0.1,
            MaxTokens = 1000,
        };

        var chatService = kernel.GetRequiredService<IChatCompletionService>();
        var history = new ChatHistory();
        history.AddSystemMessage(
            "Vous êtes un assistant intelligent qui peut effectuer des calculs " +
            "et répondre aux questions sur les dates. Répondez toujours en français."
        );

        // Boucle de conversation interactive
        Console.WriteLine("=== Assistant Semantic Kernel ===");
        Console.WriteLine("Tapez 'quit' pour quitter.\n");

        while (true)
        {
            Console.Write("Vous : ");
            var input = Console.ReadLine();
            if (input?.ToLower() == "quit") break;
            if (string.IsNullOrWhiteSpace(input)) continue;

            history.AddUserMessage(input);

            try
            {
                var response = await chatService.GetChatMessageContentAsync(
                    history, executionSettings, kernel);

                Console.WriteLine($"Assistant : {response.Content}\n");
                history.AddAssistantMessage(response.Content!);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur : {ex.Message}");
            }
        }
    }
}
```

### Python — Semantic Kernel avec AgentGroupChat

```python
import asyncio
import os
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion
from semantic_kernel.agents import ChatCompletionAgent, AgentGroupChat
from semantic_kernel.agents.strategies import (
    KernelFunctionSelectionStrategy,
    KernelFunctionTerminationStrategy,
)
from semantic_kernel.functions import KernelFunctionFromPrompt, kernel_function
from semantic_kernel.contents import ChatMessageContent, AuthorRole

# --- Configuration ---
kernel_writer = Kernel()
kernel_writer.add_service(OpenAIChatCompletion(
    ai_model_id="gpt-4o",
    api_key=os.environ["OPENAI_API_KEY"],
    service_id="writer_service",
))

kernel_reviewer = Kernel()
kernel_reviewer.add_service(OpenAIChatCompletion(
    ai_model_id="gpt-4o-mini",
    api_key=os.environ["OPENAI_API_KEY"],
    service_id="reviewer_service",
))

# --- Agents ---
writer_agent = ChatCompletionAgent(
    service_id="writer_service",
    kernel=kernel_writer,
    name="Rédacteur",
    instructions=(
        "Vous êtes un rédacteur créatif expert. "
        "Rédigez du contenu de qualité selon les demandes. "
        "Incorporez les retours du réviseur dans vos révisions."
    ),
)

reviewer_agent = ChatCompletionAgent(
    service_id="reviewer_service",
    kernel=kernel_reviewer,
    name="Réviseur",
    instructions=(
        "Vous êtes un éditeur exigeant. Donnez un feedback précis et constructif. "
        "Si le texte est satisfaisant, terminez votre message par [APPROUVÉ]. "
        "Sinon, listez les améliorations nécessaires."
    ),
)

# --- Group Chat ---
async def run_writing_session(topic: str):
    chat = AgentGroupChat(agents=[writer_agent, reviewer_agent])

    await chat.add_chat_message(
        ChatMessageContent(role=AuthorRole.USER, content=f"Rédigez un paragraphe sur : {topic}")
    )

    print(f"\n=== Session de rédaction : {topic} ===\n")
    max_rounds = 6
    rounds = 0

    async for message in chat.invoke():
        print(f"[{message.name}] : {message.content}\n{'-'*50}")
        rounds += 1

        # Terminer si approuvé ou max rounds atteint
        if "[APPROUVÉ]" in (message.content or "") or rounds >= max_rounds:
            break

    print(f"\n=== Terminé après {rounds} échanges ===")

if __name__ == "__main__":
    asyncio.run(run_writing_session("Les avantages de l'intelligence artificielle dans l'éducation"))
```

## Règles

1. **Utiliser les descriptions `[Description]` avec précision** — Le LLM choisit quelle fonction appeler uniquement sur la base des descriptions. Des descriptions vagues ou ambiguës provoquent des appels incorrects. Décrivez précisément ce que fait la fonction, ses paramètres et quand l'utiliser.

2. **Préférer `ToolCallBehavior.AutoInvokeKernelFunctions` pour les agents** — Ce mode délègue au LLM le choix et l'exécution automatique des fonctions. Pour les cas nécessitant un contrôle manuel, utiliser `EnableKernelFunctions` et traiter les tool calls manuellement.

3. **Utiliser l'injection de dépendances dans ASP.NET Core** — Ne jamais instancier `Kernel` manuellement dans une application web. Utiliser `services.AddKernel()` et `IKernelBuilder` pour un cycle de vie correct et une testabilité maximale.

4. **Versionner les prompt templates avec Git** — Les fichiers `skprompt.txt` + `config.json` sont du code au même titre que le C#. Les stocker dans le repo, les versionner, les tester avec des prompts de validation automatisés dans la CI/CD.

5. **Gérer les erreurs de function calling explicitement** — Les appels de fonctions peuvent échouer (timeout, API externe down). Toujours encapsuler les `KernelFunction` dans des try/catch et retourner des messages d'erreur descriptifs plutôt que de lever des exceptions qui interrompent le flow du LLM.
