---
name: coding-agent-builder
description: Construction d'agents de coding autonomes capables de lire, écrire et modifier du code. Se déclenche avec "coding agent", "agent de code", "agent développeur", "Devin", "SWE-agent", "agent qui code", "AI coder", "code generation agent", "auto-coder".
---

# Coding Agent Builder

## Quand utiliser ce skill

Utilise ce skill lorsque tu dois concevoir ou implémenter un agent autonome capable d'interagir avec une base de code : lire des fichiers, écrire ou modifier du code, exécuter des commandes, gérer des branches Git et faire tourner des tests. S'applique aussi bien à la création d'un agent SWE-bench-style qu'à un assistant développeur intégré dans un IDE ou un pipeline CI/CD.

## Workflow

1. **Architecture générale** — Définis les composantes principales : accès au système de fichiers (`file system access`), sandbox d'exécution de code, interface Git, runner de tests et couche LLM. Choisis entre une architecture mono-agent ou multi-agents (planner + executor + reviewer).

2. **Définition des tools du coding agent** — Implémente les outils fondamentaux : `read_file(path)`, `write_file(path, content)`, `run_command(cmd)`, `search_code(query, repo)`, `git_diff()`, `run_tests(suite)`. Chaque tool doit renvoyer un résultat structuré (stdout, stderr, exit code).

   ```python
   # Exemple de tool run_command avec timeout
   import subprocess
   def run_command(cmd: str, timeout: int = 30) -> dict:
       result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
       return {"stdout": result.stdout, "stderr": result.stderr, "returncode": result.returncode}
   ```

3. **Sandbox d'exécution sécurisée** — Isole l'exécution du code dans un environnement contrôlé : Docker container (image minimale), [E2B](https://e2b.dev/) sandbox, ou local sandbox avec restrictions réseau. Applique des limites de CPU/mémoire, bloque les appels systèmes dangereux, et journalise toutes les opérations.

4. **Planning strategy (plan-before-code)** — Avant toute modification, l'agent doit : (a) explorer et indexer le codebase, (b) comprendre la demande en profondeur, (c) générer un plan structuré (quels fichiers modifier, dans quel ordre, quels tests écrire). Utilise un LLM fort (Claude Opus, GPT-4o) pour la phase de planification.

5. **Code generation contextuelle** — Génère du code en tenant compte du style existant (indentation, naming conventions, imports), des types présents, du framework utilisé. Injecte les fichiers pertinents dans le contexte via un mécanisme de retrieval (embeddings + similarité cosinus sur le repo).

   ```python
   # Exemple de prompt de génération contextualisé
   system_prompt = """Tu es un agent développeur expert. 
   Voici les fichiers pertinents du repo : {relevant_files}
   Style de code détecté : {code_style}
   Génère du code cohérent avec l'existant."""
   ```

6. **Testing loop (TDD automatique)** — Applique un cycle strict : écrire les tests unitaires → générer le code → exécuter les tests → analyser les erreurs → corriger → itérer jusqu'au vert. Limite les itérations à 5-10 pour éviter les boucles infinies. Log chaque tentative.

7. **Code review intégré** — Avant tout commit, l'agent effectue une auto-review : (a) lint avec `ruff`/`eslint`, (b) vérification de sécurité avec `bandit`/`semgrep`, (c) style check, (d) review LLM pour la cohérence logique. Bloque le commit si des issues critiques sont détectées.

8. **Git workflow automatisé** — Gère le cycle Git complet : création de branche (`feat/agent-task-{id}`), commits atomiques avec messages conventionnels (`feat:`, `fix:`, `refactor:`), création de PR avec description auto-générée, résumé du diff. Utilise `gitpython` ou l'API GitHub/GitLab.

   ```python
   import git
   repo = git.Repo(".")
   repo.git.checkout("-b", f"feat/agent-task-{task_id}")
   repo.index.add(modified_files)
   repo.index.commit(f"feat: {task_description[:72]}")
   ```

9. **Context management et indexation** — Maintiens un index du codebase avec embeddings (OpenAI, Voyage, ou local avec `sentence-transformers`). Utilise un dependency graph (AST parsing) pour identifier les fichiers impactés par une modification. Implémente un mécanisme de smart retrieval pour limiter le contexte envoyé au LLM.

10. **Évaluation et métriques** — Benchmark l'agent sur [SWE-bench](https://swebench.com/) (résolution de vraies issues GitHub), HumanEval pour la génération, et des métriques internes : task completion rate, taux de tests verts au premier essai, nombre d'itérations moyen, taux de régression introduit.

## Règles

- **Toujours sandboxer** : n'exécute jamais de code généré par l'agent directement sur la machine hôte sans isolation. Utilise Docker ou E2B en production.
- **Plan avant code** : un agent qui code sans planifier produit du code incohérent. Exige toujours une phase de réflexion et de plan structuré avant la première ligne générée.
- **Tests obligatoires** : tout code généré doit être accompagné de tests. Le taux de couverture cible est ≥ 80%. Refuse de committer du code non testé.
- **Limiter les itérations** : implémente un mécanisme de timeout et de compteur d'itérations pour éviter les boucles infinies coûteuses. Maximum 10 tentatives par tâche.
- **Frameworks recommandés** : [LangChain Agents](https://python.langchain.com/), [AutoGen](https://microsoft.github.io/autogen/), [SWE-agent](https://swe-agent.com/), [Aider](https://aider.chat/), [E2B](https://e2b.dev/) pour le sandboxing. Priorise la fiabilité sur la performance brute.
