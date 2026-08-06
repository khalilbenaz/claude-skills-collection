---
name: dev-system-design-helper
description: Aide à la conception de systèmes à grande échelle. Se déclenche avec "system design", "architecture système", "concevoir un système", "comment architecturer", "high availability", "load balancing", "scalability". Also triggers on "design a large-scale system", "architecture interview question".
---

# System Design Helper

## Workflow en 8 étapes

### 1. Clarification des requirements
Avant tout design, fixer le périmètre exact.

**Questions à poser :**
- Fonctionnels : quelles features, quels acteurs, quels flux critiques ?
- Non-fonctionnels : SLA de disponibilité (99.9 % = 8h downtime/an, 99.99 % = 52 min), latence cible (p99), cohérence des données (strong vs eventual)
- Contraintes : budget infra, stack imposé, réglementations (PCI-DSS, GDPR, DORA)

**Critère de sortie :** une phrase résumant le contrat : _"Lecture-heavy (95 %), 10 k RPS peak, latence p99 < 200 ms, 99.9 % dispo, données EU uniquement."_

---

### 2. Estimations de charge (back-of-the-envelope)

```
DAU = 1 M utilisateurs
Lectures/utilisateur/jour = 20 → RPS lectures = (1M × 20) / 86400 ≈ 230 RPS
Écritures : 5 % → 12 RPS
Storage : 1 KB/entrée × 12 RPS × 86400 × 365 ≈ 380 GB/an
Bandwidth sortante : 1 KB × 230 RPS × 8 bits ≈ 1.8 Mbps
```

**Règle :** si RPS < 1 k → un seul serveur suffit probablement. > 10 k → scaling horizontal obligatoire. > 100 k → sharding + CDN + cache agressif.

---

### 3. Architecture haut niveau

Partir toujours du schéma minimal : **Client → LB → App Servers → DB**.
Ajouter des couches uniquement si les estimations l'imposent.

```
[Client]
   │ HTTPS
[CDN / WAF]          ← assets statiques, protection DDoS
   │
[Load Balancer]      ← L7 (Nginx, ALB, Traefik)
   │
[API Gateway]        ← auth, rate-limit, routing
   │
[Services]           ← monolithe ou microservices selon taille
   ├── [Cache Redis]  ← read-through, TTL 60 s
   ├── [DB primaire]  ← writes
   └── [DB réplica(s)] ← reads
```

---

### 4. Choix de base de données

| Besoin | Technologie | Pourquoi |
|---|---|---|
| Relations, transactions ACID | PostgreSQL / SQL Server | Joins, intégrité référentielle |
| Lecture massive, schema flexible | MongoDB / DynamoDB | Scale horizontal, JSON natif |
| Time-series (métriques, IoT) | InfluxDB / TimescaleDB | Compression, requêtes temporelles |
| Recherche full-text | Elasticsearch | Inverted index, agrégations |
| Cache / sessions | Redis | Sub-ms, structures natives (sorted set, pub/sub) |
| Graph | Neo4j | Traversal O(1) vs JOIN O(n) |

**Règle CAP :** distributed systems ne peuvent garantir que 2 sur 3 (Consistency, Availability, Partition tolerance). Pour la finance : CP. Pour le feed social : AP.

---

### 5. Stratégies de scalabilité

**Horizontal scaling (stateless services) :**
```yaml
# docker-compose / K8s HPA
replicas: 3
resources:
  requests: { cpu: "250m", memory: "512Mi" }
  limits:    { cpu: "1",    memory: "1Gi"  }
```

**Sharding DB (hash-based) :**
```
shard_id = hash(user_id) % N_SHARDS
# Attention : resharding coûteux → prévoir N_SHARDS × 4 dès le départ
```

**Read replicas :**
- 1 primary (writes) + 2–3 replicas (reads)
- Lag typique : < 100 ms en même région

**Cache-aside pattern (Redis) :**
```python
def get_user(user_id):
    data = redis.get(f"user:{user_id}")
    if data:
        return json.loads(data)
    data = db.query("SELECT * FROM users WHERE id = ?", user_id)
    redis.setex(f"user:{user_id}", 300, json.dumps(data))  # TTL 5 min
    return data
```

---

### 6. Haute disponibilité et résilience

**Objectifs à fixer d'abord :**
- **RPO** (Recovery Point Objective) : perte de données max acceptable → dicte la fréquence des backups/réplication
- **RTO** (Recovery Time Objective) : temps de remise en service max → dicte le failover automatique ou manuel

**Patterns :**
- **Active-Passive** : basculement manuel ou semi-auto (DNS TTL court), RPO = lag réplication
- **Active-Active** multi-région : latence cross-région, conflict resolution requise (CRDT ou last-write-wins)
- **Circuit breaker** (Hystrix / Polly / Resilience4j) : évite la cascade de pannes
- **Bulkhead** : isoler les pools de threads par downstream pour ne pas saturer globalement

**Checklist résilience :**
- [ ] Health checks `/health` + `/ready` exposés
- [ ] Retries avec backoff exponentiel + jitter
- [ ] Timeouts explicites sur tous les appels externes
- [ ] Dead Letter Queue pour les messages non traités
- [ ] Chaos testing planifié (kill aléatoire de pods/instances)

---

### 7. Sécurité (intégrée dès la conception)

```
Authentication  → JWT (RS256) ou OAuth2/OIDC ; refresh token rotation
Authorization   → RBAC ou ABAC selon la granularité
Transport       → TLS 1.3 minimum, HSTS
Data at rest    → AES-256, clés en KMS (AWS KMS, Azure Key Vault)
Rate limiting   → par IP + par user : token bucket ou sliding window
WAF             → règles OWASP Top 10, géo-blocking si EU-only
Secrets         → jamais en clair dans le code ; Vault ou env variables injectées
```

---

### 8. Observabilité et monitoring

**Les 4 golden signals (Google SRE) :**
1. **Latency** : p50, p95, p99 par endpoint
2. **Traffic** : RPS, messages/s
3. **Errors** : taux d'erreurs 4xx/5xx, exceptions
4. **Saturation** : CPU, mémoire, connexions DB pool

**Stack recommandée 2026 :**
```
Métriques  → Prometheus + Grafana (ou Datadog)
Logs       → ELK / OpenSearch ou Loki
Traces     → OpenTelemetry → Tempo / Jaeger
Alerting   → PagerDuty / OpsGenie, SLO-based alerts
```

---

## Critères de décision rapides

| Question | < 1k RPS | 1k–50k RPS | > 50k RPS |
|---|---|---|---|
| Architecture | Monolithe + une DB | Services + cache | Microservices + sharding + CDN |
| DB | PostgreSQL seul | Postgres + Redis | Multi-DB polyglot |
| Déploiement | Un VPS | Docker + K8s | K8s multi-région |

---

## Anti-patterns / pièges

- **Over-engineering précoce** : ne pas sharding dès le jour 1 si le traffic ne le justifie pas ; prématuré = dette opérationnelle certaine
- **Single point of failure** : toute dépendance sans failover est un risque, y compris le load balancer lui-même (prévoir un second LB ou DNS failover)
- **N+1 queries** : charger 1 objet puis N sous-objets en boucle → DataLoader, eager loading ou batch query
- **Cache stampede** : expiration simultanée de milliers de clés → probabilistic early expiration ou lock-based refresh
- **Long transactions DB** : bloquent les locks → découper en micro-transactions, utiliser des sagas pour les workflows distribués
- **Ignorer le réseau** : appels synchrones en chaîne entre microservices = latence cumulée + couplage fort → préférer async (message queue) quand la cohérence immédiate n'est pas requise
- **Pas de rate limiting** : une API publique sans rate limit est un vecteur de DoS et de coût excessif
- **TTL trop long sur le cache** : données périmées visibles longtemps ; TTL trop court : cache miss storm → tester avec des TTLs graduels


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
