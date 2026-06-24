---
name: coding-agent-builder
description: Construction d'agents de coding autonomes capables de lire, écrire et modifier du code. Se déclenche avec "coding agent", "agent de code", "agent développeur", "Devin", "SWE-agent", "agent qui code", "AI coder", "code generation agent", "auto-coder".
---

# Coding Agent Builder

## Quand utiliser ce skill

Conception ou implémentation d'un agent autonome qui interagit avec une base de code : lecture/écriture de fichiers, exécution de commandes, gestion Git, tests automatisés. S'applique à un agent SWE-bench-style, un assistant intégré dans un IDE, ou un pipeline CI/CD.

## Critères d'architecture : mono-agent vs multi-agents

| Critère | Mono-agent | Multi-agents (planner + executor + reviewer) |
|---|---|---|
| Tâche simple (<5 fichiers) | ✅ | Surcharge inutile |
| Tâche complexe, multi-modules | ❌ fragile | ✅ |
| Budget tokens serré | ✅ | ❌ |
| Cohérence inter-fichiers critique | ❌ | ✅ |

## Workflow en 10 étapes

### 1. Définir les tools fondamentaux

Chaque tool renvoie un dict structuré (stdout, stderr, exit code). Pas d'exception silencieuse.

```python
import subprocess, pathlib

def read_file(path: str) -> dict:
    p = pathlib.Path(path)
    return {"content": p.read_text(encoding="utf-8"), "exists": p.exists()}

def write_file(path: str, content: str) -> dict:
    pathlib.Path(path).write_text(content, encoding="utf-8")
    return {"written": True, "path": path}

def run_command(cmd: str, timeout: int = 30) -> dict:
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return {"stdout": r.stdout, "stderr": r.stderr, "returncode": r.returncode}

def run_tests(suite: str = ".") -> dict:
    return run_command(f"pytest {suite} --tb=short -q")
```

Outils minimaux requis : `read_file`, `write_file`, `run_command`, `search_code`, `git_diff`, `run_tests`.

### 2. Sandbox d'exécution (obligatoire en production)

**Docker** (auto-hébergé) :
```bash
docker run --rm \
  --network=none \          # pas d'accès réseau
  --memory=512m \
  --cpus=1 \
  --read-only \
  -v $(pwd)/workspace:/workspace \
  python:3.12-slim \
  bash -c "cd /workspace && python agent_task.py"
```

**E2B** (sandbox managé, plus simple) :
```python
from e2b_code_interpreter import Sandbox
with Sandbox() as sbx:
    result = sbx.run_code("print('hello')")
    print(result.text)
```

Choix : E2B si tu veux du managed sans infra ; Docker si tu veux le contrôle total et l'air-gap réseau.

### 3. Indexation et retrieval du codebase

Avant toute génération, l'agent doit connaître la structure :

```python
# Indexation AST pour Python — récupère les symboles exportés
import ast, pathlib

def index_repo(root: str) -> dict[str, list[str]]:
    index = {}
    for f in pathlib.Path(root).rglob("*.py"):
        tree = ast.parse(f.read_text())
        index[str(f)] = [n.name for n in ast.walk(tree)
                         if isinstance(n, (ast.FunctionDef, ast.ClassDef))]
    return index
```

Pour le retrieval sémantique : embeddings `sentence-transformers` (local) ou Voyage/OpenAI (API). Chunk par fonction, pas par fichier entier. Injecte les 3-5 fichiers les plus pertinents dans le contexte.

### 4. Phase plan-before-code (non négociable)

Format de plan attendu en sortie LLM avant toute écriture :

```
## Plan
1. Fichiers à lire : [liste]
2. Fichiers à créer/modifier : [liste + raison]
3. Tests à écrire : [liste]
4. Ordre d'exécution : [séquence]
5. Risques identifiés : [liste]
```

Utilise un modèle fort (Claude Opus / GPT-4o) pour la planification, un modèle plus rapide pour l'exécution. Sépare les deux appels.

### 5. Génération de code contextualisée

```python
system_prompt = """
Tu es un agent développeur expert. Règles strictes :
- Respecte le style de code existant (indentation, naming, imports).
- N'introduis aucune dépendance non listée dans requirements.txt/package.json.
- Génère TOUJOURS les tests en même temps que le code.

Fichiers pertinents du repo :
{relevant_files}

Style détecté : {code_style}  # extrait via ruff/pylint
"""
```

Passe toujours le diff attendu, pas juste la description de la tâche.

### 6. Boucle TDD automatique

```
écrire tests → générer code → run tests → analyser erreurs → corriger → itérer
```

```python
MAX_ITER = 8
for attempt in range(MAX_ITER):
    code = llm_generate(plan, context)
    write_file("solution.py", code)
    result = run_tests("tests/")
    if result["returncode"] == 0:
        break
    context += f"\n## Erreur tentative {attempt+1}\n{result['stderr']}"
else:
    raise RuntimeError("Agent bloqué après 8 tentatives — escalade manuelle requise")
```

### 7. Code review automatique avant commit

```bash
# Pipeline de review — exécute dans l'ordre, bloque au premier échec critique
ruff check . --select=E,W,F          # lint Python
bandit -r . -ll                       # sécurité (low severity ignorée)
semgrep --config=auto .               # patterns de vulnérabilité
```

```python
def auto_review(files: list[str]) -> bool:
    critical_issues = []
    for tool, cmd in [("ruff", "ruff check {f}"), ("bandit", "bandit {f} -ll")]:
        for f in files:
            r = run_command(cmd.format(f=f))
            if r["returncode"] != 0:
                critical_issues.append(f"{tool}: {r['stdout']}")
    return len(critical_issues) == 0, critical_issues
```

### 8. Git workflow automatisé

```python
import git

def agent_commit(task_id: str, task_desc: str, modified_files: list[str]) -> str:
    repo = git.Repo(".")
    branch = f"feat/agent-{task_id}"
    repo.git.checkout("-b", branch)
    repo.index.add(modified_files)
    msg = f"feat: {task_desc[:72]}\n\nGenerated by coding-agent v2"
    repo.index.commit(msg)
    return branch
```

Convention de commits : `feat:`, `fix:`, `refactor:`, `test:` — jamais de commit fourre-tout. Un commit = une tâche atomique.

### 9. Observabilité et métriques

Instrumente dès le début, pas en post-prod :

```python
import time, logging

def traced_tool_call(tool_name: str, fn, *args, **kwargs):
    start = time.perf_counter()
    result = fn(*args, **kwargs)
    elapsed = time.perf_counter() - start
    logging.info({"tool": tool_name, "duration_s": elapsed,
                  "success": result.get("returncode", 0) == 0})
    return result
```

Métriques clés : task completion rate, taux de vert au 1er essai, nb d'itérations moyen, taux de régression introduit.

### 10. Benchmark et évaluation

- **SWE-bench** : résolution de vraies issues GitHub — référence du secteur.
- **HumanEval / MBPP** : génération de fonctions isolées.
- **Tests internes** : crée un jeu de 20 tâches représentatives de ton domaine, rejoue-les à chaque release.

Seuils cibles pour un agent production-ready : >40% SWE-bench verified, >85% tests verts au 1er essai, <5 itérations en moyenne.

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Remède |
|---|---|---|
| Exécuter du code généré sans sandbox | RCE, destruction de données | Docker / E2B obligatoire |
| Contexte trop large (>100 fichiers) | Hallucinations, lenteur | Retrieval + top-5 fichiers max |
| Pas de plan structuré | Code incohérent, régression | Étape plan non négociable |
| Boucle sans limite d'itérations | Coût infini, blocage | MAX_ITER=8 + escalade |
| Commit multi-tâches | Diff illisible, rollback impossible | Un commit = une tâche atomique |
| Review LLM-only (pas d'outil statique) | Bugs et vulnérabilités passent | ruff + bandit + semgrep en pipeline |
| Modèle unique pour plan + exécution | Gaspillage de tokens | Plan=modèle fort, exec=modèle rapide |

## Frameworks recommandés (2026)

- **SWE-agent** : référence open-source pour agents SWE-bench.
- **Aider** : CLI mature, intègre git nativement, support multi-modèle.
- **AutoGen** : multi-agents, bonne orchestration planner/executor.
- **E2B** : sandboxing managé, prêt en 5 min, facturation à l'usage.
- **LangChain Agents** : si tu as déjà l'écosystème LangChain.
- **Claude Code SDK** (Anthropic) : pour intégrer directement dans des pipelines Claude.

Priorise **fiabilité** (sandbox, tests, limites d'itérations) avant performance brute.
