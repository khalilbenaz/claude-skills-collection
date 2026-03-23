---
name: python-best-practices
description: Bonnes pratiques Python pour code propre, performant et maintenable. Se déclenche avec "Python", "PEP 8", "pythonic", "virtualenv", "pip", "poetry", "FastAPI", "Django", "asyncio", "type hints".
---

# Python Best Practices

## Workflow

1. **Structure du projet** : Adopter le src layout (`src/mon_package/`), configurer `pyproject.toml` comme source unique de vérité, gérer les environnements virtuels avec `poetry` ou `uv` (plus rapide), définir les dépendances avec groupes dev/prod, versionner le package avec `__version__` centralisé.

2. **Style et conventions** : Appliquer PEP 8 via `ruff` (lint + format), utiliser les type hints PEP 484 sur toutes les signatures publiques, rédiger des docstrings au format Google ou NumPy, configurer `black` ou `ruff format` pour le formatage automatique, définir les règles dans `pyproject.toml` section `[tool.ruff]`.

3. **Patterns pythoniques** : Préférer les list/dict/set comprehensions aux boucles impératives, utiliser les générateurs (`yield`) pour les séquences paresseuses, exploiter les context managers (`with`, `__enter__`/`__exit__`, `contextlib`), maîtriser les décorateurs (`functools.wraps`, stacking), remplacer les classes de données simples par `@dataclass` ou `attrs`.

4. **Async Python** : Structurer avec `asyncio` (event loop, `async def`, `await`), utiliser `aiohttp` ou `httpx` pour les requêtes HTTP asynchrones, implémenter des async generators (`async for`), appliquer la structured concurrency avec `asyncio.TaskGroup` (Python 3.11+), éviter les blocages en ne mixant pas sync/async sans `run_in_executor`.

5. **Testing** : Organiser les tests avec `pytest` et le dossier `tests/`, utiliser les fixtures pour l'injection de dépendances, `@pytest.mark.parametrize` pour les cas multiples, `unittest.mock` ou `pytest-mock` pour le mocking, mesurer la couverture avec `pytest-cov`, utiliser `hypothesis` pour le property-based testing.

6. **Performance** : Profiler avec `cProfile` et `line_profiler` avant d'optimiser, utiliser `functools.lru_cache` / `functools.cache` pour la mémoïsation, paralléliser les tâches CPU avec `multiprocessing`, les tâches I/O avec `asyncio`, envisager `Cython` ou `numba` pour les hot paths, optimiser la mémoire avec `__slots__` et les générateurs.

7. **Packaging et distribution** : Configurer `pyproject.toml` avec `[build-system]`, `[project]`, `[project.optional-dependencies]`, construire avec `python -m build`, publier sur PyPI via `twine` ou `poetry publish`, gérer le versioning sémantique avec `bump2version` ou `commitizen`, créer des scripts d'entrée avec `[project.scripts]`.

8. **Outils essentiels** : Automatiser avec `ruff` (lint+format), vérifier les types avec `mypy` en mode strict, configurer `pre-commit` hooks (ruff, mypy, tests), utiliser `tox` pour tester sur plusieurs versions Python, structurer les commandes dans un `Makefile`, intégrer dans CI/CD (GitHub Actions, `.github/workflows/ci.yml`).

## Règles

- Écrire du code pythonique : explicite > implicite, lisibilité > concision excessive, suivre le Zen of Python (`import this`).
- Typer systématiquement le code public avec les type hints et valider avec `mypy --strict` ; les types sont de la documentation executable.
- Ne jamais ignorer les exceptions silencieusement (`except Exception: pass`) ; logger ou re-raise avec contexte (`raise ValueError("msg") from e`).
- Utiliser les outils de l'écosystème moderne : `uv` pour la vitesse, `ruff` remplace `flake8`+`isort`+`pylint`, `httpx` remplace `requests` pour l'async.
- Expliquer le "pourquoi" dans les commentaires, pas le "quoi" ; le code doit s'auto-documenter via des noms explicites et des type hints précis.
