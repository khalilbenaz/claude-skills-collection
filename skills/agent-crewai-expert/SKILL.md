---
name: agent-crewai-expert
description: Guide complet pour construire des systèmes multi-agents avec CrewAI. Création d'agents spécialisés, définition de tâches, orchestration de crews et intégration d'outils personnalisés. Se déclenche avec "CrewAI", "crew", "multi-agent CrewAI", "agent CrewAI", "tâche CrewAI", "créer un crew", "équipe d'agents", "orchestration agents", "agents collaboratifs". Also triggers on "CrewAI crew", "build a crew of agents", "CrewAI tasks".
---

# CrewAI Expert — Systèmes Multi-Agents Collaboratifs

## Critères de décision — Quand utiliser CrewAI

| Situation | Recommandation |
|-----------|---------------|
| Tâche décomposable en sous-rôles distincts (chercheur, rédacteur, réviseur…) | ✅ CrewAI |
| Pipeline séquentiel simple (A → B → C) avec LLM unique | ⚠️ LangChain chain suffisante |
| Parallélisme massif ou orchestration conditionnelle complexe | ⚠️ LangGraph ou Temporal |
| Workflow métier avec mémoire partagée entre sessions | ✅ CrewAI + memory |
| Prototype rapide < 1 jour | ✅ CrewAI (API haut niveau) |
| Budget API serré, chaque token compte | ⚠️ Surveiller `usage_metrics`, limiter `max_iter` |

---

## Workflow en étapes

### 1. Installation et structure du projet

```bash
pip install crewai==0.100.0 crewai-tools==0.20.0
# Avec CLI officielle (recommandé pour nouveaux projets)
pip install crewai[tools]
crewai create crew mon_projet
```

Structure recommandée :
```
mon_projet/
├── src/mon_projet/
│   ├── crew.py          # définition du Crew principal
│   ├── agents.py        # factory d'agents
│   ├── tasks.py         # définition des tâches
│   └── tools/
│       └── custom_tool.py
├── .env                 # OPENAI_API_KEY, SERPER_API_KEY
├── pyproject.toml
└── README.md
```

Variables `.env` minimum :
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL_NAME=gpt-4o
SERPER_API_KEY=...        # si SerperDevTool
```

---

### 2. Définition des agents

Chaque agent = `role` + `goal` + `backstory` (les trois piliers du comportement).

```python
from crewai import Agent

researcher = Agent(
    role="Analyste Financier Senior",
    goal="Extraire les indicateurs clés de {company} à partir de rapports publics",
    backstory=(
        "Vous êtes analyste financier avec 12 ans d'expérience chez un cabinet de conseil Tier-1. "
        "Expert en lecture de bilans IFRS, vous détectez les signaux faibles que d'autres ignorent. "
        "Vous citez toujours vos sources avec l'URL et la date."
    ),
    llm="gpt-4o",
    tools=[search_tool, scrape_tool],
    allow_delegation=False,   # évite les délégations involontaires en sequential
    max_iter=5,               # stoppe les boucles runaway
    verbose=True,
)
```

**Paramètres avancés utiles :**

| Paramètre | Valeur par défaut | Usage |
|-----------|------------------|-------|
| `max_iter` | 25 | Limiter en production (5–10) |
| `max_rpm` | None | Throttle appels API de cet agent |
| `allow_delegation` | False | Activer seulement en process hiérarchique |
| `memory` | False | Activer pour cohérence longue session |
| `cache` | True | Désactiver si les outils doivent toujours être rappelés |
| `step_callback` | None | Passer une fonction pour logger chaque action |

---

### 3. Création des outils custom

**Option A — decorator `@tool` (simple, rapide) :**

```python
from crewai.tools import tool

@tool("Calculateur de marge brute")
def calculate_margin(revenue: float, cost: float) -> str:
    """Calcule la marge brute en pourcentage à partir du CA et du coût."""
    if revenue == 0:
        return "Erreur : CA ne peut pas être zéro."
    margin = ((revenue - cost) / revenue) * 100
    return f"Marge brute : {margin:.2f}%"
```

**Option B — classe `BaseTool` (validation Pydantic, gestion d'erreurs robuste) :**

```python
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

class SQLQueryInput(BaseModel):
    query: str = Field(description="Requête SQL SELECT à exécuter")

class SQLTool(BaseTool):
    name: str = "Outil SQL"
    description: str = "Exécute une requête SQL en lecture seule sur la base de données."
    args_schema: type[BaseModel] = SQLQueryInput

    def _run(self, query: str) -> str:
        # connexion + exécution
        return results_as_str
```

**Outils intégrés les plus utiles :**
- `SerperDevTool` — recherche Google
- `ScrapeWebsiteTool` / `SeleniumScrapingTool` — scraping
- `FileReadTool` / `FileWriterTool` — I/O fichiers
- `CSVSearchTool` / `PDFSearchTool` — RAG sur fichiers
- `CodeInterpreterTool` — exécution Python sandboxée

---

### 4. Définition des tâches

```python
from crewai import Task
from pydantic import BaseModel

class AnalysisOutput(BaseModel):
    company: str
    revenue_2024: float
    growth_rate: float
    key_risks: list[str]

analysis_task = Task(
    description=(
        "Analysez les données financières publiques de {company} pour l'exercice 2024. "
        "Cherchez les rapports annuels, communiqués de presse et données Boursorama. "
        "Identifiez le CA, la croissance YoY, et les 3 principaux risques."
    ),
    expected_output=(
        "Un rapport JSON structuré avec : company, revenue_2024 (en M€), "
        "growth_rate (en %), key_risks (liste de 3 phrases max chacune)."
    ),
    agent=researcher,
    output_pydantic=AnalysisOutput,   # force la structure de sortie
    output_file="analysis.json",
)
```

**Chaîner les tâches avec `context` :**

```python
synthesis_task = Task(
    description="Rédigez un executive summary à partir des analyses fournies pour {company}.",
    expected_output="Executive summary de 300 mots max en français.",
    agent=writer,
    context=[analysis_task],    # attend la complétion de analysis_task
)
```

---

### 5. Configuration et exécution du Crew

```python
from crewai import Crew, Process

# Process séquentiel (défaut, déterministe)
crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[analysis_task, writing_task, review_task],
    process=Process.sequential,
    verbose=True,
    memory=True,
    embedder={"provider": "openai", "config": {"model": "text-embedding-3-small"}},
    max_rpm=20,           # limite globale appels/minute
)

# Exécution standard
result = crew.kickoff(inputs={"company": "Société Générale", "year": "2024"})
print(result.raw)
print(f"Tokens : {crew.usage_metrics}")

# Exécution sur une liste (batch)
results = crew.kickoff_for_each(inputs=[
    {"company": "BNP Paribas"},
    {"company": "Crédit Agricole"},
])

# Exécution asynchrone
import asyncio
result = asyncio.run(crew.kickoff_async(inputs={"company": "AXA"}))
```

**Process hiérarchique — quand le manager délègue dynamiquement :**

```python
hierarchical_crew = Crew(
    agents=[analyst, researcher, writer],  # sans agent dans les Task
    tasks=[task1, task2, task3],           # le manager choisit qui fait quoi
    process=Process.hierarchical,
    manager_llm="gpt-4o",   # ou manager_agent=Agent(...)
    verbose=True,
)
```

---

### 6. Crew Pipelines (chaîner plusieurs crews)

```python
from crewai import Pipeline

pipeline = Pipeline(
    stages=[
        data_collection_crew,   # output → input du suivant automatiquement
        analysis_crew,
        reporting_crew,
    ]
)
result = pipeline.kickoff(inputs={"topic": "march IA 2026"})
```

---

### 7. Monitoring et callbacks

```python
from crewai.agents.agent_builder.base_agent_executor_mixin import CrewAgentExecutorMixin

def on_step(step_output):
    print(f"[STEP] {step_output}")

def on_task(task_output):
    print(f"[TASK DONE] {task_output.description[:60]}")

crew = Crew(
    ...,
    step_callback=on_step,
    task_callback=on_task,
)
```

**Intégration Langfuse (tracing en production) :**

```bash
pip install langfuse
```

```python
import os
os.environ["LANGFUSE_SECRET_KEY"] = "..."
os.environ["LANGFUSE_PUBLIC_KEY"] = "..."
os.environ["LANGFUSE_HOST"] = "https://cloud.langfuse.com"
# CrewAI détecte automatiquement Langfuse via OpenTelemetry
```

---

## Exemple complet : pipeline recherche → rédaction → révision

```python
import os
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, ScrapeWebsiteTool

os.environ["OPENAI_API_KEY"] = "sk-..."
os.environ["SERPER_API_KEY"] = "..."

search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()

researcher = Agent(
    role="Chercheur Expert en IA",
    goal="Trouver des informations précises et récentes sur {topic}",
    backstory=(
        "Chercheur senior spécialisé en IA avec 10 ans d'expérience. "
        "Identifie les sources fiables, cite les URLs, synthétise efficacement."
    ),
    tools=[search_tool, scrape_tool],
    llm="gpt-4o", max_iter=5, verbose=True,
)

writer = Agent(
    role="Rédacteur Technique",
    goal="Rédiger un article de blog engageant sur {topic}",
    backstory="Rédacteur tech ciblant un public de développeurs. Ton clair, exemples concrets.",
    llm="gpt-4o", max_iter=3, verbose=True,
)

reviewer = Agent(
    role="Éditeur",
    goal="Vérifier qualité, exactitude et clarté de l'article",
    backstory="Éditeur expérimenté : structure, cohérence technique, engagement.",
    llm="gpt-4o-mini", max_iter=3, verbose=True,
)

research_task = Task(
    description=(
        "Recherche approfondie sur {topic}. "
        "5 tendances, acteurs clés, chiffres, cas d'usage. Cite les URLs."
    ),
    expected_output="Rapport structuré : résumé (200 mots), 5 tendances, acteurs, chiffres, URLs.",
    agent=researcher, output_file="research.md",
)

writing_task = Task(
    description="Article de blog 800-1000 mots sur {topic}. Titre, intro, 3-4 H2, conclusion CTA.",
    expected_output="Article Markdown complet entre 800 et 1000 mots.",
    agent=writer, context=[research_task], output_file="draft.md",
)

review_task = Task(
    description="Révise l'article : exactitude, clarté, SEO. Produis la version finale.",
    expected_output="Version finale Markdown + rapport de révision.",
    agent=reviewer, context=[writing_task], output_file="final.md",
)

crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.sequential,
    verbose=True, memory=True, max_rpm=20,
    embedder={"provider": "openai", "config": {"model": "text-embedding-3-small"}},
)

if __name__ == "__main__":
    result = crew.kickoff(inputs={"topic": "Agents IA en 2026"})
    print(result.raw)
    print(f"Tokens : {crew.usage_metrics}")
```

---

## Garde-fous, anti-patterns et pièges

### Anti-patterns fréquents

| Anti-pattern | Problème | Correction |
|---|---|---|
| `backstory` vague ("Tu es un expert") | Résultats génériques | Contexte métier précis, spécialité, style attendu |
| `max_iter` non défini | Boucles infinies, budget explosé | Toujours fixer 5–10 en production |
| `allow_delegation=True` en process sequential | Délégations involontaires qui bloquent | N'activer qu'en hiérarchique avec manager |
| Tâches avec `context` circulaire (A → B → A) | Deadlock silencieux | Vérifier le DAG des dépendances |
| Trop d'agents pour une tâche simple | Coût × latence × hallucinations | 2–3 agents = sweet spot pour 80% des cas |
| `output_pydantic` sans `expected_output` détaillé | L'agent ne sait pas le format attendu | Décrire le format dans `expected_output` + schema Pydantic |
| Memory activée sans nettoyage | ChromaDB grossit indéfiniment | `crew.reset_memories()` entre les runs de prod |
| Outils sans gestion d'erreur | Un 404 plante tout le crew | Wrapper try/except dans `_run()`, retourner un message d'erreur |

### Pièges de déploiement

- **Variables d'environnement manquantes** : CrewAI charge `.env` via `python-dotenv` — vérifier le cwd ou passer `load_dotenv()` explicitement.
- **Versions incompatibles** : `crewai` et `crewai-tools` doivent être compatibles — toujours épingler ensemble dans `pyproject.toml`.
- **ChromaDB en multi-process** : la mémoire partagée ChromaDB n'est pas thread-safe. En production, utiliser `memory=False` ou un backend externe (Qdrant, Pinecone).
- **Rate limits OpenAI** : `max_rpm` sur le Crew est global mais ne gère pas les retries exponentiels — ajouter un wrapper retry avec `tenacity` si besoin.
- **Coût non anticipé** : `gpt-4o` sur un crew de 5 agents × 10 itérations = des centaines de milliers de tokens. Utiliser `gpt-4o-mini` pour les agents non-critiques.

---

## Bonnes pratiques 2026

1. **Tester chaque agent seul** avant l'assemblage : `agent.execute_task(task)` pour valider le comportement isolément.
2. **Séparer config et logique** : agents/tasks dans des fichiers YAML (supporté nativement via `crewai create`) pour une gestion propre des prompts.
3. **Tracer en production** : Langfuse ou AgentOps pour capturer chaque step, token et latence — indispensable pour optimiser les coûts.
4. **Pinning des versions** : `crewai==0.100.0` dans `pyproject.toml` — l'API change fréquemment entre minor versions.
5. **`output_pydantic` systématique** pour les outputs consommés programmatiquement — évite le parsing fragile du texte libre.
6. **Process `sequential` par défaut** — réserver `hierarchical` aux cas où la délégation dynamique apporte une vraie valeur (tâches imprévisibles, volume variable).
7. **Monitorer `usage_metrics`** après chaque run et logguer dans un CSV ou DB pour tracker la dérive des coûts.


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
