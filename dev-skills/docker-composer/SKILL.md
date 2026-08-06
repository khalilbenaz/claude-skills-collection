---
name: docker-composer
description: Création et optimisation de Dockerfiles et docker-compose pour tout type de projet. Se déclenche avec "Docker", "Dockerfile", "docker-compose", "conteneur", "container", "image Docker", "multi-stage build", "optimiser mon image". Also triggers on "write a Dockerfile", "docker-compose setup", "containerize my app".
---

# Docker Composer

## Workflow en étapes

### 1. Analyser le contexte
Identifier avant d'écrire une seule ligne :
- **Runtime** : Node 22 / Python 3.12 / Java 21 / Go 1.22 / .NET 9 ?
- **Services** : DB (Postgres, Redis, MongoDB ?), broker (RabbitMQ, Kafka ?), reverse proxy ?
- **Usage cible** : dev local avec hot-reload / CI / image de prod déployée ?
- **Contraintes** : taille d'image, rootless obligatoire, registry cible ?

### 2. Choisir la base image

| Besoin | Base recommandée | Remarque |
|---|---|---|
| Prod légère | `node:22-alpine` / `python:3.12-slim` | ~50–80 Mo |
| Prod ultra-sécurisée | `gcr.io/distroless/nodejs22-debian12` | Pas de shell |
| Build seulement | `node:22-bookworm` / `maven:3.9-eclipse-temurin-21` | Jamais en prod |
| Go / Rust | `scratch` ou `distroless/static` | Binaire statique |

**Règle** : jamais utiliser `latest` en prod. Épingler le digest ou le tag mineur.

### 3. Rédiger le Dockerfile (multi-stage)

Pattern canonique Node.js :
```dockerfile
# ── Build stage ──────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
# Copier UNIQUEMENT les manifestes avant le code → cache layer npm install
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# User non-root AVANT de copier les fichiers
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

Pattern Java (Maven → JRE slim) :
```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /build/target/*.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

### 4. Créer le .dockerignore
```
.git
.gitignore
node_modules
dist
*.log
.env
.env.*
**/.DS_Store
coverage
.nyc_output
Dockerfile*
docker-compose*.yml
README.md
```

### 5. Configurer docker-compose (dev + prod)

`docker-compose.yml` (dev, hot-reload) :
```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder          # Stage dev avec devDeps
    volumes:
      - .:/app                 # Bind mount pour hot-reload
      - /app/node_modules      # Volume anonyme isole node_modules
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
    env_file: .env.local
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  pg_data:
```

`docker-compose.prod.yml` (override prod) :
```yaml
services:
  api:
    build:
      target: runtime          # Stage prod minimal
    volumes: []                # Pas de bind mount
    read_only: true            # FS en lecture seule
    tmpfs:
      - /tmp                   # Seul répertoire inscriptible
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

Lancer en prod :
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 6. Gérer les secrets
```bash
# .env.local → jamais commité (dans .gitignore)
DB_PASSWORD=supersecret

# Docker Secrets (swarm / compose v3.9+)
secrets:
  db_password:
    file: ./secrets/db_password.txt

# Dans le service
services:
  api:
    secrets:
      - db_password
```
Ne jamais passer de secret via `ARG` (il apparaît dans `docker history`).

### 7. Activer BuildKit et optimiser le cache
```bash
# Toujours activer BuildKit
export DOCKER_BUILDKIT=1
# Ou dans docker-compose
export COMPOSE_DOCKER_CLI_BUILD=1

# Cache registry (CI GitHub Actions / GitLab)
docker build \
  --cache-from type=registry,ref=ghcr.io/org/app:cache \
  --cache-to   type=registry,ref=ghcr.io/org/app:cache,mode=max \
  -t ghcr.io/org/app:latest .
```

### 8. Scanner l'image avant déploiement
```bash
# Trivy (open-source, rapide)
trivy image --exit-code 1 --severity HIGH,CRITICAL ghcr.io/org/app:latest

# Docker Scout (intégré Docker Desktop)
docker scout cves ghcr.io/org/app:latest
```

---

## Critères de décision

| Question | Si oui → |
|---|---|
| Image < 100 Mo nécessaire ? | Alpine ou distroless |
| Debug en prod parfois requis ? | slim (a un shell), pas distroless |
| Plusieurs environnements (dev/staging/prod) ? | Compose override files |
| Secrets sensibles ? | Docker Secrets ou vault externe (HashiCorp, Azure KV) |
| Monorepo multi-services ? | `build.context` + `build.dockerfile` distincts par service |

---

## Garde-fous / Anti-patterns

- **`COPY . .` trop tôt** : invalide le cache de `npm install` à chaque changement de code. Toujours copier les manifestes en premier.
- **`RUN apt-get install ...` en plusieurs layers** : combineer en une seule instruction `RUN && && && rm -rf /var/lib/apt/lists/*`.
- **`USER root` en prod** : vecteur d'escalade de privilèges. Toujours créer et basculer sur un user dédié.
- **Secrets dans `ENV` ou `ARG`** : visibles dans les métadonnées de l'image (`docker inspect`). Utiliser des fichiers montés ou Docker Secrets.
- **Pas de healthcheck** : `depends_on` sans `condition: service_healthy` démarre les services sans attendre qu'ils soient prêts.
- **Image `latest` en prod** : non reproductible. Toujours épingler (`node:22.4.0-alpine` ou `sha256:...`).
- **Bind mount en prod** : le code du conteneur devient modifiable depuis l'hôte. Supprimer les volumes de code dans l'override prod.
- **`.env` dans l'image** : même via `COPY`, les secrets restent dans les layers. Utiliser `--secret` de BuildKit à la place.

---

## Bonnes pratiques 2026

- **Compose Watch** (`watch` dans `docker-compose.yml`) remplace les bind mounts ad hoc pour le hot-reload et la synchronisation sélective.
- **`docker init`** génère un Dockerfile et un compose de base pour Node/Python/Go — bon point de départ à affiner.
- **OCI Artifacts** : pousser les images vers un registry OCI-compliant (ghcr.io, ECR, ACR) avec notation/cosign pour la signature.
- **Rootless Docker** (`dockerd-rootless-setuptool.sh`) ou Podman en mode rootless pour les environnements à sécurité renforcée.
- **`--platform linux/amd64,linux/arm64`** : builder en multi-arch avec `docker buildx` pour couvrir Apple Silicon et les instances ARM cloud.
