---
name: scalability-planner
description: Planification de la scalabilité d'une application ou infrastructure. Se déclenche avec "scalabilité", "scaling", "montée en charge", "millions d'utilisateurs", "haute disponibilité", "scale", "horizontal scaling". Also triggers on "scale my app", "handle more traffic", "horizontal scaling plan".
---

# Scalability Planner

## Workflow

### 1. Établir le baseline et les objectifs

Collecter les métriques actuelles avant toute décision :

```bash
# Baseline rapide avec wrk
wrk -t4 -c100 -d30s https://api.example.com/health

# Métriques PostgreSQL actives
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# Saturation CPU/mémoire courante
top -bn1 | head -20
```

Critères à documenter : RPS moyen/pic, latence p50/p95/p99, utilisateurs concurrents, croissance mensuelle observée, SLA uptime cible.

**Seuils décisionnels :**
| Charge cible | Approche recommandée |
|---|---|
| < 500 RPS | Scale vertical + connection pooling |
| 500–5 000 RPS | Scale horizontal + cache L2 |
| > 5 000 RPS | Sharding DB + CDN + async obligatoires |

### 2. Identifier les bottlenecks réels

Ne jamais supposer : mesurer d'abord.

```bash
# Load test ciblé avec k6
k6 run --vus 200 --duration 60s script.js

# Profiling Go sous charge
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Slow queries PostgreSQL
SELECT query, calls, mean_exec_time FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;
```

Ordre typique de saturation : DB connections → CPU compute → IOPS stockage → bande passante réseau.

### 3. Choisir la stratégie de scaling

**Critère principal : le service est-il stateless ?**

- Si OUI → horizontal scaling direct (Kubernetes HPA, ECS auto-scaling)
- Si NON → externaliser l'état d'abord (sessions → Redis, uploads → S3)

```yaml
# Kubernetes HPA basé sur CPU + custom metric
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

Vertical scaling : pertinent pour les DB (instance type upgrade) mais atteint vite ses limites. Prévoir l'horizontal dès la conception.

### 4. Scaler la couche base de données

```ini
# PgBouncer — connection pooling (postgresql.ini)
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

```sql
-- Partitionnement PostgreSQL par date (haute volumétrie)
CREATE TABLE events (
  id BIGSERIAL,
  created_at TIMESTAMPTZ NOT NULL,
  payload JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_q1 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

**Décision read replica vs sharding :**
- Read replicas : 70 %+ de trafic en lecture → ajouter 1–3 replicas
- Sharding : > 500 GB ou clé de partition naturelle (tenant_id, region) → évaluer Citus, Vitess ou migration NoSQL

### 5. Caching multi-niveaux

```nginx
# Nginx — micro-cache API (évite thundering herd)
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m inactive=1m;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5s;
    proxy_cache_lock on;           # une seule requête upstream pendant le miss
    add_header X-Cache-Status $upstream_cache_status;
}
```

```python
# Redis — cache-aside avec TTL
import redis, json, hashlib

r = redis.Redis(host='localhost', decode_responses=True)

def get_user(user_id: int):
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    user = db.query(User).get(user_id)
    r.setex(key, 300, json.dumps(user.to_dict()))  # TTL 5 min
    return user
```

Ordre de mise en place : CDN (assets, pages statiques) → reverse proxy cache → cache applicatif → query cache DB.

### 6. Traitement asynchrone

Découpler les opérations > 200 ms ou non bloquantes pour l'utilisateur.

```python
# Celery — tâche asynchrone Python
from celery import Celery

app = Celery('tasks', broker='redis://localhost:6379/0')

@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email(self, user_id, template):
    try:
        _do_send(user_id, template)
    except Exception as exc:
        raise self.retry(exc=exc)
```

Patterns : queue par priorité (email low, paiement high), DLQ pour les échecs, idempotency key sur chaque message.

### 7. Multi-région et haute disponibilité

**Active-passive** : failover DNS, RPO ≈ minutes — simple, pour DR.
**Active-active** : routing latency-based, RPO ≈ 0 — complexe, cohérence éventuelle.

```hcl
# Terraform — Route53 latency-based routing
resource "aws_route53_record" "api" {
  for_each       = { eu-west-1 = "...", us-east-1 = "..." }
  zone_id        = var.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = each.key
  latency_routing_policy { region = each.key }
  alias { name = aws_lb.api[each.key].dns_name ... }
}
```

Toujours implémenter : health checks actifs, circuit breaker (Resilience4j, Polly), retry avec jitter.

### 8. Valider en load test

```javascript
// k6 — scénario réaliste avec ramp-up
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp-up
    { duration: '5m', target: 500 },   // charge cible
    { duration: '2m', target: 1000 },  // pic
    { duration: '1m', target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p95<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

Mesurer le **breaking point** (pas juste la charge nominale), valider que l'auto-scaling déclenche et stabilise avant 60 s, documenter le plan de capacité.

---

## Anti-patterns et pièges

- **Pré-optimiser sans mesurer** : sur-architecturer avant d'atteindre le bottleneck coûte 3× plus cher et ralentit le delivery.
- **Thundering herd** : sans `proxy_cache_lock` ou mutex côté cache, un cache miss massif effondre la DB.
- **Sessions en mémoire locale** : dès qu'on scale horizontal, les sessions locales cassent — externaliser dès le départ.
- **Connection pool trop grand** : 1 000 connexions directes à Postgres tuent le serveur ; pooler d'abord (PgBouncer transaction mode).
- **Ignorer le CAP theorem** : en active-active, toute donnée partagée doit accepter la cohérence éventuelle ou payer le coût de la coordination.
- **Auto-scaling sans warm-up** : les nouvelles instances froides (JVM, connexions DB) répondent lentement ; configurer des readiness probes et un pre-warming.
- **Pas de circuit breaker** : un service lent en aval cascade et fait tomber tout le cluster.
- **Shard key mal choisie** : une clé non uniforme (ex. `created_at` séquentiel) crée des hot shards — préférer un hash distribué.

## Bonnes pratiques 2026

- Adopter KEDA (Kubernetes Event-Driven Autoscaling) pour scaler sur des métriques métier réelles (longueur de queue, RPS custom).
- Utiliser OpenTelemetry pour corréler les traces, logs et métriques sur l'ensemble de la stack avant de planifier le scaling.
- Privilégier les bases de données managées avec auto-scaling natif (Aurora Serverless v2, AlloyDB, PlanetScale) pour réduire l'opérationnel.
- Tester le chaos engineering (Chaos Monkey, LitmusChaos) dès que l'architecture est distribuée.
- Documenter la décision architecture dans un ADR (Architecture Decision Record) avec les compromis retenus.
