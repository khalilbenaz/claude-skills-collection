---
name: agent-crewai-expert
description: Guide complet pour construire des systèmes multi-agents avec CrewAI. Création d'agents spécialisés, définition de tâches, orchestration de crews et intégration d'outils personnalisés. Se déclenche avec "CrewAI", "crew", "multi-agent CrewAI", "agent CrewAI", "tâche CrewAI", "créer un crew", "équipe d'agents", "orchestration agents", "agents collaboratifs".
---

# CrewAI Expert — Systèmes Multi-Agents Collaboratifs

## Quand utiliser ce skill

Utiliser ce skill quand l'utilisateur veut construire un système multi-agents collaboratifs avec CrewAI, où plusieurs agents IA spécialisés travaillent ensemble pour accomplir un objectif complexe. Typiquement : pipelines de recherche et rédaction, automatisation de workflows métier, systèmes d'analyse de données multi-étapes, ou tout projet nécessitant des agents avec des rôles distincts (researcher, writer, analyst, reviewer, etc.) qui se passent du contexte.

## Workflow

1. **Installation et setup du projet**
   - Installer les dépendances : `pip install crewai==0.80.0 crewai-tools==0.17.0`
   - Structure recommandée du projet :
     ```
     my_crew/
     ├── main.py
     ├── crew.py
     ├── agents.py
     ├── tasks.py
     ├── tools/
     │   └── custom_tool.py
     └── .env  # OPENAI_API_KEY, SERPER_API_KEY
     ```
   - Configurer les variables d'environnement (`OPENAI_API_KEY`, `OPENAI_MODEL_NAME`)

2. **Définition des agents**
   - Chaque agent possède : `role` (titre), `goal` (objectif précis), `backstory` (contexte narratif qui influe sur le comportement)
   - Paramètres avancés : `llm` (modèle LLM), `tools` (liste d'outils), `allow_delegation` (peut déléguer à d'autres agents), `verbose` (logging détaillé), `max_iter` (nombre max d'itérations), `memory` (activer la mémoire)
   - Piège courant : un `backstory` trop vague produit des résultats génériques — soyez précis et donnez un contexte métier réaliste

3. **Création des outils custom**
   - Méthode recommandée avec `@tool` decorator :
     ```python
     from crewai.tools import tool

     @tool("Outil de recherche web")
     def search_web(query: str) -> str:
         """Effectue une recherche web et retourne les résultats."""
         # implémentation
         return results
     ```
   - Méthode classe avec `BaseTool` pour plus de contrôle (validation Pydantic, gestion d'erreurs)
   - Outils intégrés disponibles : `SerperDevTool`, `ScrapeWebsiteTool`, `FileReadTool`, `CSVSearchTool`, `PDFSearchTool`

4. **Définition des tâches (Task)**
   - Paramètres clés : `description` (ce que l'agent doit faire, très détaillé), `expected_output` (format exact attendu), `agent` (agent assigné), `context` (liste de tâches dont dépend cette tâche)
   - Le champ `context` crée des dépendances : la tâche attend la completion des tâches listées
   - Utiliser `output_file` pour sauvegarder le résultat dans un fichier
   - `output_json` / `output_pydantic` pour forcer un format de sortie structuré

5. **Configuration du Crew**
   - `process=Process.sequential` : tâches exécutées dans l'ordre (défaut, le plus simple)
   - `process=Process.hierarchical` : un manager LLM orchestre et délègue dynamiquement (nécessite `manager_llm`)
   - Paramètres : `verbose=True` pour le debug, `max_rpm` pour limiter les appels API, `share_crew=False`

6. **Gestion de la mémoire**
   - Activer avec `memory=True` sur le Crew (utilise ChromaDB par défaut)
   - Types : `short_term_memory` (contexte de session), `long_term_memory` (base de données persistante), `entity_memory` (extraction d'entités)
   - Configurer l'embedder : `embedder={"provider": "openai", "config": {"model": "text-embedding-3-small"}}`
   - La mémoire améliore la cohérence sur des runs longs mais augmente les coûts

7. **Callbacks et monitoring**
   - `step_callback` : appelé après chaque action d'un agent (logging, UI updates)
   - `task_callback` : appelé après chaque tâche complétée
   - Intégration avec Langfuse ou Langsmith via les callbacks pour le tracing
   - Formater les outputs avec des templates Pydantic pour une meilleure observabilité

8. **Exécution et debug**
   - Lancement : `result = crew.kickoff(inputs={"topic": "IA générative", "year": "2025"})`
   - Variables d'input injectées dans les descriptions avec `{variable_name}`
   - Lancement asynchrone : `await crew.kickoff_async(inputs=...)`
   - Lancement sur une liste : `crew.kickoff_for_each(inputs=[{...}, {...}])`
   - Debug : activer `verbose=2`, vérifier les logs d'itération, inspecter `task.output`

9. **Patterns avancés**
   - **Hierarchical crew** : manager_llm délègue dynamiquement aux agents selon la tâche
   - **Crew pipelines** : `Pipeline(stages=[crew1, crew2])` pour chaîner plusieurs crews
   - **Conditional tasks** : utiliser des callbacks et des conditions dans les descriptions
   - **Async execution** : `kickoff_async` avec `asyncio.gather` pour parallélisme
   - **Crew comme outil** : un Crew peut être encapsulé comme outil d'un agent parent

10. **Déploiement en production**
    - **CrewAI+** : plateforme hébergée avec monitoring intégré
    - Encapsuler dans une API FastAPI : `@app.post("/run") async def run_crew(request: CrewRequest)`
    - Scheduling avec Celery ou APScheduler pour l'exécution périodique
    - Cost tracking : surveiller `usage_metrics` sur chaque agent après l'exécution
    - Rate limiting : `max_rpm=10` sur le Crew pour éviter les erreurs 429

## Exemples de code

### Crew de 3 agents : Recherche, Rédaction et Révision d'un article de blog

```python
import os
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool
from crewai_tools import SerperDevTool, ScrapeWebsiteTool
from pydantic import BaseModel

# Configuration
os.environ["OPENAI_API_KEY"] = "votre-clé"
os.environ["SERPER_API_KEY"] = "votre-clé-serper"

# Outils
search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()

# --- Agents ---
researcher = Agent(
    role="Chercheur Expert en IA",
    goal="Trouver des informations précises et récentes sur {topic}",
    backstory=(
        "Vous êtes un chercheur senior spécialisé en intelligence artificielle, "
        "avec 10 ans d'expérience dans l'analyse de tendances technologiques. "
        "Vous savez identifier les sources fiables et synthétiser l'information."
    ),
    tools=[search_tool, scrape_tool],
    llm="gpt-4o",
    verbose=True,
    allow_delegation=False,
    max_iter=5,
)

writer = Agent(
    role="Rédacteur Technique",
    goal="Rédiger un article de blog engageant et informatif sur {topic}",
    backstory=(
        "Vous êtes un rédacteur technique avec une expertise en IA et une "
        "capacité à rendre des sujets complexes accessibles. Vous écrivez "
        "pour un public de développeurs et de professionnels tech."
    ),
    llm="gpt-4o",
    verbose=True,
    allow_delegation=False,
)

reviewer = Agent(
    role="Éditeur et Réviseur",
    goal="Vérifier la qualité, l'exactitude et la clarté de l'article",
    backstory=(
        "Vous êtes un éditeur expérimenté qui vérifie la structure narrative, "
        "la cohérence technique et l'engagement du lecteur. Vous améliorez "
        "sans réécrire complètement."
    ),
    llm="gpt-4o-mini",
    verbose=True,
    allow_delegation=False,
)

# --- Tâches ---
research_task = Task(
    description=(
        "Effectuez une recherche approfondie sur {topic}. "
        "Identifiez les 5 tendances principales, les acteurs clés, "
        "les chiffres importants et les cas d'usage concrets. "
        "Citez vos sources avec les URLs."
    ),
    expected_output=(
        "Un rapport de recherche structuré avec : "
        "1) Résumé exécutif (200 mots), "
        "2) 5 tendances clés avec exemples, "
        "3) Liste des acteurs principaux, "
        "4) Données chiffrées pertinentes, "
        "5) URLs des sources."
    ),
    agent=researcher,
    output_file="research_report.md",
)

writing_task = Task(
    description=(
        "Rédigez un article de blog de 800-1000 mots sur {topic} "
        "basé sur les recherches fournies. "
        "Structure : titre accrocheur, introduction, 3-4 sections avec H2, "
        "conclusion avec call-to-action. Ton : professionnel mais accessible."
    ),
    expected_output=(
        "Un article de blog complet en Markdown avec : "
        "titre H1, introduction percutante, sections H2 développées, "
        "exemples concrets, conclusion et CTA. Entre 800 et 1000 mots."
    ),
    agent=writer,
    context=[research_task],  # dépend de la recherche
    output_file="draft_article.md",
)

review_task = Task(
    description=(
        "Révisez l'article de blog rédigé. Vérifiez : "
        "1) Exactitude technique, 2) Clarté et fluidité, "
        "3) Structure et cohérence, 4) SEO (mots-clés présents). "
        "Proposez des améliorations et produisez la version finale."
    ),
    expected_output=(
        "La version finale de l'article avec les corrections appliquées, "
        "suivi d'un rapport de révision listant les changements effectués."
    ),
    agent=reviewer,
    context=[writing_task],
    output_file="final_article.md",
)

# --- Crew ---
crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.sequential,
    verbose=True,
    memory=True,
    embedder={
        "provider": "openai",
        "config": {"model": "text-embedding-3-small"},
    },
)

# --- Exécution ---
if __name__ == "__main__":
    result = crew.kickoff(inputs={"topic": "Les agents IA en 2025"})
    print("=== RÉSULTAT FINAL ===")
    print(result.raw)
    print(f"\nTokens utilisés : {crew.usage_metrics}")
```

### Crew hiérarchique avec manager LLM

```python
from crewai import Agent, Task, Crew, Process

manager_agent = Agent(
    role="Chef de Projet IA",
    goal="Orchestrer l'équipe pour livrer {deliverable} dans les délais",
    backstory="Manager expérimenté qui délègue efficacement selon les compétences.",
    llm="gpt-4o",
    allow_delegation=True,
)

# Agents spécialisés...
data_analyst = Agent(role="Analyste Data", goal="...", backstory="...", llm="gpt-4o-mini")
strategist = Agent(role="Stratège", goal="...", backstory="...", llm="gpt-4o-mini")

hierarchical_crew = Crew(
    agents=[data_analyst, strategist],
    tasks=[...],  # tâches sans agent assigné — le manager délègue
    process=Process.hierarchical,
    manager_agent=manager_agent,  # ou manager_llm="gpt-4o"
    verbose=True,
)

result = hierarchical_crew.kickoff(inputs={"deliverable": "rapport stratégique"})
```

## Règles

1. **Toujours tester avec des agents simples d'abord** — Commencez avec 2 agents et `verbose=True` avant d'ajouter de la complexité. Débuggez chaque agent individuellement avant d'assembler le Crew.

2. **Rédiger des backstories précises et contextuelles** — La qualité du `backstory` est le principal levier de performance. Un backstory vague = résultats génériques. Donnez un contexte métier réel, des années d'expérience, des spécialités précises.

3. **Gérer les coûts avec `max_rpm` et `max_iter`** — En production, toujours définir `max_rpm` (requests per minute) et `max_iter` sur les agents pour éviter les boucles infinies et les dépassements de budget API.

4. **Utiliser `output_pydantic` pour les sorties structurées** — Quand l'output doit être parsé programmatiquement, définir un modèle Pydantic comme `output_pydantic=MonModele` sur la tâche pour garantir la structure.

5. **Préférer `Process.sequential` pour débuter** — Le process hiérarchique est puissant mais imprévisible. Utilisez `sequential` pour les workflows déterministes, `hierarchical` uniquement quand la délégation dynamique est vraiment nécessaire.
