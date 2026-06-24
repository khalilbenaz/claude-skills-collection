---
name: devops-docker-swarm-guide
description: Orchestration avec Docker Swarm incluant services, stacks, overlay networks, secrets, rolling updates et haute disponibilité. Se déclenche avec "Docker Swarm", "swarm mode", "docker service", "docker stack", "overlay network"
---

# Docker Swarm Guide

## Critères de choix : Swarm vs Kubernetes

| Critère | Swarm | Kubernetes |
|---|---|---|
| Équipe < 5 devops | ✅ | ❌ complexité op |
| Infra on-premise simple | ✅ | possible mais lourd |
| Multitenancy avancé | ❌ | ✅ |
| RBAC fin, CRDs, Operators | ❌ | ✅ |
| Stack existante Docker Compose | ✅ migration facile | conversion nécessaire |

Choisis Swarm si tu as déjà des Compose files, une petite équipe, et pas besoin de scaling horizontal à 100+ nœuds.

---

## Workflow en étapes

### 1. Initialiser le cluster

```bash
# Sur le premier manager (remplace l'IP par l'IP privée réseau inter-nœuds)
docker swarm init --advertise-addr 192.168.1.10

# Récupérer les tokens
docker swarm join-token manager   # pour ajouter un manager
docker swarm join-token worker    # pour ajouter un worker

# Rejoindre depuis un autre nœud
docker swarm join --token SWMTKN-1-xxx 192.168.1.10:2377

# Vérifier l'état du cluster
docker node ls
```

**Règle de quorum Raft** : toujours un nombre impair de managers.
- 3 managers → tolère 1 panne
- 5 managers → tolère 2 pannes
- Ne jamais dépasser 7 managers (latence consensus)

```bash
# Promouvoir un worker en manager
docker node promote <node-id>

# Vérifier la santé du Raft
docker node inspect self --format '{{ .ManagerStatus.Reachability }}'
```

---

### 2. Configurer les overlay networks

```bash
# Réseau chiffré pour données sensibles
docker network create \
  --driver overlay \
  --opt encrypted \
  --subnet 10.0.1.0/24 \
  backend-net

# Réseau frontend non chiffré (moins de CPU)
docker network create --driver overlay frontend-net
```

**Pattern d'isolation recommandé** :
- `frontend-net` : load balancer ↔ app
- `backend-net` : app ↔ base de données
- `monitoring-net` : agents de monitoring (attachable)

```bash
# Réseau attachable pour debug/tests ad hoc
docker network create --driver overlay --attachable debug-net
```

---

### 3. Déployer un service

```bash
# Service minimal avec réplicas
docker service create \
  --name api \
  --replicas 3 \
  --network backend-net \
  --publish published=8080,target=3000 \
  --limit-cpu 0.5 \
  --limit-memory 256M \
  --reserve-cpu 0.25 \
  --reserve-memory 128M \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval 10s \
  --health-retries 3 \
  myrepo/api:1.2.0

# Inspecter les tasks et leur état
docker service ps api --no-trunc
```

**Contraintes de placement** :
```bash
# Forcer sur nœuds labellisés SSD
docker node update --label-add disk=ssd worker-1

docker service create \
  --constraint 'node.labels.disk == ssd' \
  --name db \
  postgres:16
```

---

### 4. Stacks avec docker-compose (méthode recommandée)

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  api:
    image: myrepo/api:${API_VERSION:-latest}
    networks:
      - frontend-net
      - backend-net
    secrets:
      - db_password
    environment:
      DB_HOST: db
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 15s
        failure_action: rollback
        monitor: 30s
        order: start-first       # zero-downtime : nouveau container avant l'arrêt
      rollback_config:
        parallelism: 1
        delay: 10s
        failure_action: pause
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
        reservations:
          cpus: "0.25"
          memory: 128M
      placement:
        constraints:
          - node.role == worker
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 20s

  db:
    image: postgres:16
    networks:
      - backend-net
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - db-data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.disk == ssd

networks:
  frontend-net:
    driver: overlay
  backend-net:
    driver: overlay
    driver_opts:
      encrypted: "true"

volumes:
  db-data:

secrets:
  db_password:
    external: true
```

```bash
# Déployer / mettre à jour la stack
docker stack deploy -c docker-compose.prod.yml myapp

# Lister les services de la stack
docker stack services myapp

# Retirer la stack (ne supprime pas les volumes)
docker stack rm myapp
```

---

### 5. Gérer secrets et configs

```bash
# Créer un secret depuis stdin (jamais depuis un fichier en clair en prod)
echo "S3cr3tP@ss" | docker secret create db_password -

# Depuis un fichier
docker secret create tls_cert ./cert.pem

# Lister / inspecter (le contenu n'est jamais affiché)
docker secret ls
docker secret inspect db_password

# Config (non sensible — fichiers de conf, templates)
docker config create nginx_conf ./nginx.conf

# Usage dans un service
docker service update \
  --config-add source=nginx_conf,target=/etc/nginx/nginx.conf \
  nginx
```

Les secrets sont montés en RAM (`tmpfs`) dans `/run/secrets/<nom>`. Ils ne touchent jamais le disque du worker.

---

### 6. Rolling updates et rollbacks

```bash
# Mise à jour de l'image (zero-downtime avec order: start-first)
docker service update \
  --image myrepo/api:1.3.0 \
  --update-parallelism 1 \
  --update-delay 15s \
  --update-failure-action rollback \
  api

# Suivre la progression
docker service ps api --filter desired-state=running

# Rollback manuel immédiat
docker service rollback api

# Forcer un redémarrage sans changer l'image (ex. secrets modifiés)
docker service update --force api
```

---

### 7. Services globaux et monitoring

```bash
# Déployer un agent Prometheus Node Exporter sur CHAQUE nœud
docker service create \
  --name node-exporter \
  --mode global \
  --network monitoring-net \
  --mount type=bind,src=/proc,dst=/host/proc,ro=true \
  --mount type=bind,src=/sys,dst=/host/sys,ro=true \
  prom/node-exporter:latest
```

---

## Garde-fous et anti-patterns

### ❌ Ne jamais faire

```bash
# DANGER : expose les secrets dans docker inspect / logs
docker service create -e DB_PASSWORD=secret123 myapp

# DANGER : manager utilisé comme worker en prod
# (le manager gère le Raft — surcharge CPU = instabilité quorum)
docker node update --availability drain manager-1  # ← correct pour drainer

# DANGER : volume local partagé entre réplicas sans NFS/Ceph
# Chaque réplica sur son nœud a sa propre copie locale → incohérence
```

### ⚠️ Pièges courants

| Piège | Symptôme | Solution |
|---|---|---|
| `update_config.order: stop-first` (défaut) | Downtime pendant update | Passer à `start-first` |
| Pas de `healthcheck` | Tasks "Running" mais app down | Toujours définir un healthcheck |
| Pas de `resource limits` | Un service OOM tue le nœud | Toujours limiter CPU + RAM |
| Quorum perdu (2 managers sur 3 HS) | Cluster en read-only | Restaurer via `docker swarm init --force-new-cluster` |
| Image `latest` en prod | Rollback impossible | Toujours tagger les versions |
| Drain d'un nœud sans vérifier les réplicas | Réplicas reschedulés sur nœuds surchargés | Surveiller `docker service ps` après drain |

---

## Commandes de diagnostic

```bash
# État global du cluster
docker node ls
docker service ls

# Tasks en échec
docker service ps <service> --filter desired-state=shutdown

# Logs d'un service (toutes les tasks)
docker service logs --follow --tail 100 api

# Inspecter un nœud (labels, ressources)
docker node inspect <node-id> --pretty

# Stats CPU/mémoire des containers sur le nœud local
docker stats --no-stream
```

---

## Bonnes pratiques 2026

- **Registre privé avec TLS** : configurer `--with-registry-auth` sur `docker stack deploy` pour que le swarm puisse puller depuis un registre privé.
- **Rotation des secrets** : créer un nouveau secret versionné (`db_password_v2`), mettre à jour le service, puis supprimer l'ancien — le Swarm ne supporte pas la mise à jour in-place d'un secret.
- **Drain avant maintenance** : `docker node update --availability drain <node>` migre proprement les tasks avant de toucher au nœud.
- **Labels structurés** : utiliser des labels hiérarchiques (`zone=eu-west`, `disk=ssd`, `gpu=true`) pour des contraintes de placement précises.
- **CI/CD** : coupler `docker stack deploy` à un pipeline GitLab/GitHub Actions avec le tag de commit comme version d'image — jamais de `latest` en production.


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
