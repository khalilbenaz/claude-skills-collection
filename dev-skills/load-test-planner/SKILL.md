---
name: load-test-planner
description: Planifie et exécute des tests de charge et performance. Se déclenche avec "test de charge", "load test", "stress test", "performance test", "k6", "JMeter", "Gatling", "benchmark", "combien d'utilisateurs".
---

# Load Test Planner

## Workflow

### 1. Définir les objectifs de performance
Avant toute chose, fixer des seuils mesurables :

| Métrique | Exemple cible |
|---|---|
| Utilisateurs simultanés | 500 VU (virtual users) |
| Throughput | 300 req/s |
| p50 latence | < 150 ms |
| p95 latence | < 500 ms |
| p99 latence | < 1 200 ms |
| Taux d'erreurs | < 0.5 % |

Critère de décision : si pas de SLA formalisé, partir des mesures de production actuelles × 2 comme baseline cible.

---

### 2. Identifier les scénarios critiques
- Extraire les top 5 endpoints par volume depuis les logs Nginx/APM (`access.log`, Datadog, New Relic).
- Prioriser : opérations avec état (login + panier + checkout) > GET simples cachés.
- Cas particuliers à ne pas oublier : upload fichier, websocket long-lived, job asynchrone déclenché par HTTP.

---

### 3. Choisir l'outil

| Outil | Quand choisir |
|---|---|
| **k6** | CI/CD, équipe dev, scripts JS, output InfluxDB/Prometheus natif |
| **Gatling** | Rapports HTML riches, DSL Kotlin/Scala, scénarios complexes |
| **JMeter** | Équipe QA non-dev, protocoles non-HTTP (JDBC, JMS, FTP) |
| **Artillery** | Stacks Node.js/AWS, config YAML rapide, plugins serverless |
| **Locust** | Python, logique de scénario très custom, debugging facile |
| **wrk/wrk2** | Microbenchmark HTTP brut, mesure de débit max sans logique |

---

### 4. Écrire le script — exemple k6 complet

```javascript
// k6 run --vus 100 --duration 5m script.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp-up
    { duration: '5m', target: 100 },   // charge nominale
    { duration: '1m', target: 200 },   // spike
    { duration: '2m', target: 0   },   // ramp-down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.005'],          // < 0.5 % erreurs
    http_req_duration: ['p(95)<500', 'p(99)<1200'],
  },
};

export default function () {
  const user = users[__VU % users.length];

  // 1. Login
  const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
    email: user.email,
    password: user.password,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login 200': (r) => r.status === 200 });
  const token = loginRes.json('access_token');

  sleep(1); // think time

  // 2. Appel métier
  const res = http.get('https://api.example.com/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { 'orders 200': (r) => r.status === 200 });

  sleep(Math.random() * 2 + 1); // think time 1–3 s
}
```

**Équivalent Gatling (Kotlin DSL) — ramp-up :**
```kotlin
setUp(
  scn.injectOpen(
    rampUsers(100).during(2.minutes),
    constantUsersPerSec(20.0).during(5.minutes)
  )
).protocols(httpProtocol)
 .assertions(
   global().responseTime().percentile3().lt(500),
   global().failedRequests().percent().lt(0.5)
 )
```

---

### 5. Séquence de tests à exécuter dans l'ordre

1. **Smoke test** — 1–2 VU, 30 s : valider que le script est correct, pas d'erreur évidente.
2. **Baseline test** — charge actuelle de production, 10 min : établir la référence.
3. **Load test** — cible nominale, 30 min : vérifier les SLA.
4. **Stress test** — augmenter jusqu'à rupture (binary search sur les VU) : trouver le breaking point.
5. **Spike test** — 0 → cible × 3 en 30 s, redescente : résilience aux pics soudains.
6. **Soak test** — charge nominale, 2–4 h : détecter memory leaks et dégradation progressive.

Règle : **ne pas sauter l'étape smoke**. Un bug de script sous 500 VU coûte du temps et fausse les métriques.

---

### 6. Monitoring pendant le test

Lancer ces commandes en parallèle dans des terminaux séparés :

```bash
# CPU / RAM serveur
watch -n2 'mpstat 1 1 && free -h'

# Connexions DB actives (PostgreSQL)
watch -n5 "psql -U postgres -c \"SELECT count(*) FROM pg_stat_activity WHERE state='active';\""

# Pool de connexions (si HikariCP)
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.active | jq .

# Logs erreurs en direct
tail -f /var/log/app/error.log | grep -E 'ERROR|WARN|timeout'
```

Stack recommandée : k6 → InfluxDB → Grafana (dashboard k6 officiel ID `2587`).

---

### 7. Analyser les résultats

Checklist d'interprétation :
- **p95 dépasse le SLA** → chercher d'abord les slow queries (EXPLAIN ANALYZE, APM traces).
- **Error rate > seuil** → distinguer 4xx (données test, auth) de 5xx (vrai bug serveur).
- **CPU > 80 % soutenu** → bottleneck CPU : profiler (async-profiler, py-spy), envisager le scaling horizontal.
- **Latence augmente linéairement avec les VU** → souvent le pool DB ou le thread pool applicatif.
- **Latence stable puis cliff soudain** → saturation d'une file d'attente (queue depth, connection pool).
- **Memory croissante sur soak test** → memory leak : heap dump + analyse (Eclipse MAT, jmap).

```bash
# k6 — extraire p95 du rapport JSON
k6 run --out json=results.json script.js
cat results.json | jq '.metrics.http_req_duration.values["p(95)"]'
```

---

### 8. Rapport et capacity planning

Template de synthèse :
```
## Résultats — [Date] — [Version app] — [Infra : 2×c5.xlarge RDS t3.large]

| Scénario    | VU  | p50  | p95   | p99    | Errors | Throughput |
|-------------|-----|------|-------|--------|--------|-----------|
| Login       | 100 | 45ms | 210ms | 480ms  | 0.1%   | 95 req/s  |
| Checkout    | 100 | 120ms| 550ms | 1100ms | 0.3%   | 42 req/s  |

Breaking point : 340 VU (p95 > 1 s, errors > 2 %)
Recommandation : ajouter index sur orders.user_id — gain estimé 40 % sur p95 checkout
```

Capacity planning : `VU_max_safe = breaking_point × 0.7` (marge 30 %).

---

## Anti-patterns / Pièges

- **Tester sans think time** → tous les VU frappent en continu, scénario irréaliste, résultats trop pessimistes.
- **Pool de données unique** → un seul user en cache, latence biaisée à la baisse.
- **Ignorer le ramp-up** → pic immédiat de connexions, échec précoce non représentatif.
- **Mélanger smoke et load dans la même run** → métriques parasitées par la phase de démarrage.
- **Lancer depuis la machine locale** → bande passante du client devient le bottleneck.
- **Comparer p99 entre tests sans fixer la seed random** → think time variable rend la comparaison impossible.
- **Ne pas isoler l'environnement** → un autre déploiement ou job parallèle fausse les mesures.
- **Tester en production sans coupure** → risque SLA réel, données corrompues, alertes PagerDuty intempestives.

## Bonnes pratiques 2026

- Intégrer le load test dans la CI sur chaque release candidate (k6 + GitHub Actions, seuil `thresholds` comme gate).
- Versionner les scripts avec le code applicatif (même repo, dossier `tests/load/`).
- Utiliser des environnements de staging iso-prod (même SKU VM/DB) pour des résultats transposables.
- Activer le tracing distribué (OpenTelemetry) pendant le test pour relier la latence HTTP aux spans internes.
- Documenter systématiquement : version app, sha commit, infra exacte, heure, paramètres k6 — sans cela, la reproductibilité est impossible.
