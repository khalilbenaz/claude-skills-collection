---
name: fastapi-guide
description: Développement d'APIs performantes avec FastAPI, Pydantic, async/await, OpenAPI et système de dépendances. Se déclenche avec "FastAPI", "Pydantic", "API Python", "async Python API", "uvicorn".
---

# Guide FastAPI

## Workflow

### 1. Bootstrapper le projet

```bash
pip install "fastapi[standard]" sqlalchemy[asyncio] alembic pydantic-settings httpx pytest pytest-asyncio
```

Structure recommandée :

```
app/
  main.py          # lifespan, include_router, middleware
  config.py        # Settings via pydantic-settings
  dependencies.py  # Depends() partagés (db, auth, pagination)
  routers/
    users.py
    items.py
  schemas/
    user.py        # UserCreate, UserUpdate, UserResponse
  models/
    user.py        # SQLAlchemy ORM
  services/
    user_service.py
  repositories/
    user_repo.py
tests/
  conftest.py      # fixtures DB, client async
  test_users.py
```

### 2. Config typée avec pydantic-settings

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False
    cors_origins: list[str] = []

    model_config = {"env_file": ".env"}

settings = Settings()
```

### 3. Schémas Pydantic v2 — séparer Create / Update / Response

```python
# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = Field(max_length=50)

class UserUpdate(BaseModel):
    username: str | None = Field(None, max_length=50)

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

**Règle** : jamais réutiliser `UserCreate` comme `response_model` — le schéma de réponse ne doit pas contenir le mot de passe.

### 4. Lifespan + application factory

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import users, items

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown

def create_app() -> FastAPI:
    app = FastAPI(
        title="Mon API",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
    )
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(items.router, prefix="/items", tags=["items"])
    return app

app = create_app()
```

### 5. Dépendances réutilisables

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_session
from app.services.auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session),
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return await user_repo.get_by_id(db, payload["sub"])

# Pagination simple
def pagination(skip: int = 0, limit: int = Query(20, le=100)):
    return {"skip": skip, "limit": limit}
```

### 6. Router et endpoints

```python
# app/routers/users.py
from fastapi import APIRouter, Depends, status
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService
from app.dependencies import get_current_user, pagination

router = APIRouter()

@router.get("/", response_model=list[UserResponse])
async def list_users(
    page: dict = Depends(pagination),
    service: UserService = Depends(),
):
    return await service.list(**page)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, service: UserService = Depends()):
    return await service.create(payload)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return current_user
```

### 7. Async — quand l'utiliser

| Cas | Décorateur |
|-----|-----------|
| Requête BDD async (asyncpg, asyncmy) | `async def` |
| Appel HTTP externe (httpx) | `async def` |
| Calcul CPU pur, bibliothèque sync | `def` (thread pool auto) |
| Lecture fichier blocking | `def` ou `run_in_executor` |

**Règle critique** : ne jamais appeler une librairie synchrone (ex: `requests`, `psycopg2` standard) dans un `async def` — ça bloque le event loop pour tous les workers.

### 8. SQLAlchemy async

```python
# app/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(settings.database_url, pool_size=10, max_overflow=20)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_session():
    async with AsyncSessionLocal() as session:
        yield session
```

### 9. Gestion des erreurs

```python
from fastapi import Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    def __init__(self, code: str, status: int = 400):
        self.code = code
        self.status = status

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status, content={"error": exc.code})
```

Utiliser `HTTPException` pour les erreurs HTTP standard, `AppError` pour les erreurs métier avec codes lisibles.

### 10. Tests avec httpx + pytest-asyncio

```python
# tests/conftest.py
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
```

```python
# tests/test_users.py
import pytest

@pytest.mark.asyncio
async def test_create_user(client):
    r = await client.post("/users/", json={"email": "a@b.com", "password": "secret123", "username": "alice"})
    assert r.status_code == 201
    assert r.json()["email"] == "a@b.com"
```

### 11. Déploiement

```bash
# Développement
fastapi dev app/main.py

# Production (Gunicorn + Uvicorn workers)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

```dockerfile
# Dockerfile multi-stage
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY . .
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

## Garde-fous / Anti-patterns

- **`async def` avec bibliothèques sync** — `requests`, `psycopg2`, `time.sleep()` dans un `async def` bloquent l'event loop. Remplacer par `httpx`, `asyncpg`, `asyncio.sleep`.
- **Même modèle Pydantic partout** — réutiliser `UserCreate` en réponse expose le mot de passe haché. Toujours séparer Create / Response.
- **Logique métier dans les routes** — les routes doivent rester < 10 lignes. La logique va dans les services.
- **`expire_on_commit=True` (défaut SQLAlchemy)** — provoque des `DetachedInstanceError` en async. Toujours `expire_on_commit=False` avec `async_sessionmaker`.
- **`@app.on_event("startup")` deprecated** — utiliser `lifespan` depuis FastAPI 0.93+.
- **Ignorer `response_model`** — sans `response_model`, FastAPI sérialise tout l'objet ORM (champs internes, relations lazy = erreur ou fuite de données).
- **`model.dict()` (Pydantic v1)** — en v2, utiliser `model.model_dump()`. `dict()` est déprécié.
- **Tests sans override de dépendances** — utiliser `app.dependency_overrides[get_session] = override_session` pour injecter une BDD de test.

## Bonnes pratiques 2026

- **Pydantic v2** obligatoire (v1 EOL). Annotations natives Python 3.10+ (`str | None` au lieu de `Optional[str]`).
- **`fastapi[standard]`** remplace `fastapi + uvicorn[standard]` depuis FastAPI 0.111+.
- **Rate limiting** : `slowapi` (basé sur `limits`) ou middleware custom — intégrer dès le début.
- **OpenTelemetry** : instrumenter avec `opentelemetry-instrumentation-fastapi` pour le tracing distribué.
- **Versioning d'API** : prefixer les routers (`/v1/users`) ou utiliser `APIVersion` middleware plutôt que dupliquer les fichiers.
- **Background jobs lourds** : `BackgroundTasks` pour les tâches légères (<1s) ; déléguer à Celery/ARQ pour les tâches longues.
- **Health checks** : exposer `/health` et `/ready` pour Kubernetes liveness/readiness probes.
