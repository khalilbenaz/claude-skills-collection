---
name: python-best-practices
description: Bonnes pratiques Python pour code propre, performant et maintenable. Se déclenche avec "Python", "PEP 8", "pythonic", "virtualenv", "pip", "poetry", "FastAPI", "Django", "asyncio", "type hints". Also triggers on "Pythonic code", "Python project structure", "type hints and linting".
---

# Python Best Practices

## 1. Structure de projet

Adopter le **src layout** pour éviter les imports parasites :

```
mon_projet/
├── src/
│   └── mon_package/
│       ├── __init__.py
│       └── core.py
├── tests/
├── pyproject.toml
└── README.md
```

Fichier `pyproject.toml` comme source unique de vérité :

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mon-package"
version = "1.2.0"
requires-python = ">=3.12"
dependencies = ["httpx>=0.27"]

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "UP", "B", "SIM"]

[tool.mypy]
strict = true
```

Choix gestionnaire de packages :
- **`uv`** : rapide (10–100× pip), résout + installe + lock en une commande → préférer en 2026
- **`poetry`** : UI plus riche, monorepo OK
- **Jamais** requirements.txt mutable sans lock file

```bash
uv init mon-projet && cd mon-projet
uv add httpx
uv add --dev pytest ruff mypy
uv run pytest
```

## 2. Style et qualité

```bash
# Lint + format en une commande
uv run ruff check --fix src/ tests/
uv run ruff format src/ tests/

# Vérification des types
uv run mypy src/ --strict
```

Type hints obligatoires sur toutes les signatures publiques :

```python
from collections.abc import Sequence
from typing import TypeAlias

UserId: TypeAlias = int

def get_users(ids: Sequence[UserId], active: bool = True) -> list[dict[str, str]]:
    ...
```

Docstrings format Google (standard de facto pour FastAPI/Django) :

```python
def process(data: bytes, *, encoding: str = "utf-8") -> str:
    """Décode les données brutes en chaîne.

    Args:
        data: Payload binaire à décoder.
        encoding: Encodage cible. Défaut UTF-8.

    Returns:
        Chaîne décodée.

    Raises:
        UnicodeDecodeError: Si l'encodage est incompatible.
    """
```

## 3. Patterns pythoniques

```python
# Préférer
actifs = [u for u in users if u.active]

# Générateur pour gros volumes (lazy, O(1) mémoire)
def lignes_valides(fichier: str):
    with open(fichier) as f:
        yield from (l.strip() for l in f if l.strip())

# Dataclass plutôt qu'un dict ou tuple anonyme
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class Point:
    x: float
    y: float
    tags: list[str] = field(default_factory=list)

# Context manager personnalisé
from contextlib import contextmanager

@contextmanager
def timer(label: str):
    import time
    t = time.perf_counter()
    yield
    print(f"{label}: {time.perf_counter() - t:.3f}s")
```

## 4. Async Python

```python
import asyncio
import httpx

async def fetch_all(urls: list[str]) -> list[str]:
    async with httpx.AsyncClient(timeout=10) as client:
        # TaskGroup (Python 3.11+) : annule tout si une tâche échoue
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(client.get(url)) for url in urls]
    return [t.result().text for t in tasks]

# Appel de code bloquant depuis async
import asyncio
loop = asyncio.get_running_loop()
result = await loop.run_in_executor(None, blocking_function, arg)
```

Critères de décision async vs threads vs multiprocessing :
| Charge | Outil recommandé |
|---|---|
| I/O concurrente (HTTP, DB) | `asyncio` + librairie async |
| Code CPU-bound | `multiprocessing` ou `concurrent.futures.ProcessPoolExecutor` |
| Bibliothèque sync non-portable | `run_in_executor` dans async |
| Simple parallélisme I/O léger | `threading.Thread` ou `ThreadPoolExecutor` |

## 5. Testing

```bash
uv run pytest tests/ -v --cov=src --cov-report=term-missing
```

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def user():
    return {"id": 1, "name": "Alice"}

@pytest.mark.parametrize("n,expected", [(0, 1), (5, 120)])
def test_factorielle(n: int, expected: int):
    assert factorielle(n) == expected

@pytest.mark.asyncio
async def test_fetch():
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock:
        mock.return_value.text = "ok"
        result = await fetch("https://example.com")
    assert result == "ok"
```

Seuil de couverture minimal : **≥ 85 %** sur le code métier ; ne pas cibler 100 % sur les adapters.

## 6. Performance

```python
from functools import cache
import cProfile

# Mémoïsation
@cache
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

# Profiler avant d'optimiser
cProfile.run("mon_algo(grand_dataset)", sort="cumtime")
```

Outils de profiling :
- `cProfile` / `pstats` : profil d'appels, intégré
- `line_profiler` (`@profile`) : ligne par ligne
- `memray` : mémoire, idéal pour fuites
- `py-spy` : sampling sans modification du code (prod)

`__slots__` pour réduire l'empreinte mémoire sur des milliers d'instances :

```python
class Vecteur:
    __slots__ = ("x", "y")
    def __init__(self, x: float, y: float) -> None:
        self.x, self.y = x, y
```

## 7. Packaging et CI

```bash
# Build + publish
uv build
uv publish  # ou twine upload dist/*

# Versioning sémantique
uv run commitizen bump --changelog
```

GitHub Actions minimal :

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: uv sync --dev
      - run: uv run ruff check src/ tests/
      - run: uv run mypy src/
      - run: uv run pytest --cov=src
```

`pre-commit` hooks :

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

## 8. Pièges et anti-patterns

| Anti-pattern | Problème | Correction |
|---|---|---|
| `except Exception: pass` | Avale les erreurs silencieusement | `except Exception as e: raise RuntimeError("ctx") from e` |
| Argument mutable par défaut `def f(lst=[])` | Partagé entre appels | `def f(lst=None): lst = lst or []` |
| `import *` | Pollution du namespace | Import explicite |
| `requests` en async context | Bloque l'event loop | `httpx.AsyncClient` |
| Type hints `Dict`, `List` (majuscule) | Obsolète depuis Python 3.9 | `dict`, `list`, `set` minuscules |
| Chaîner `.format()` au lieu de f-strings | Lisibilité | `f"Bonjour {nom}"` |
| `os.path` partout | Verbeux | `pathlib.Path` |
| Ignorer `mypy` warnings | Bugs à runtime | Corriger ou annoter `# type: ignore[...]` |

## 9. Garde-fous en 2026

- Python **3.12+** minimum pour les projets nouveaux (perf GIL-free en 3.13 expérimental).
- `uv` remplace `pip` + `venv` + `pip-tools` dans la majorité des contextes.
- `ruff` remplace `flake8` + `isort` + `pylint` ; configuration unique dans `pyproject.toml`.
- Utiliser `tomllib` (stdlib 3.11+) pour lire les fichiers TOML, pas de dépendance externe.
- `httpx` à la place de `requests` pour avoir une API sync/async unifiée.
- Ne jamais pusher de secrets : `python-dotenv` pour le dev local, variables d'env injectées en prod.
