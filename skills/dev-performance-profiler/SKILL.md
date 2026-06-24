---
name: dev-performance-profiler
description: Diagnostic et optimisation des performances d'applications. Se déclenche avec "performance", "lent", "optimiser", "profiling", "memory leak", "CPU", "latence", "bottleneck", "mon app est lente", "temps de réponse".
---

# Performance Profiler

## Workflow

### 1. Triage du symptôme

Recueillir **avant** de profiler :

| Symptôme | Métrique clé à mesurer | Outil de première ligne |
|---|---|---|
| Lenteur progressive | Mémoire RSS + GC pause | heap dump, dotMemory |
| Haute CPU constante | Flame graph CPU | perf, async-profiler |
| Timeouts / p99 élevé | Latence par percentile | APM (Datadog, Jaeger) |
| Throughput dégradé | RPS + error rate | wrk2, k6 |
| Memory leak | Heap usage over time | heapdump, PerfView |

Reproduire en local ou staging d'abord ; profiler prod seulement si le bug est non-reproductible.

---

### 2. Choisir l'outil adapté à la stack

```
.NET      → dotTrace (sampling/tracing), PerfView (ETW), BenchmarkDotNet, dotMemory
Node.js   → clinic.js (doctor/flame/bubbleprof), --inspect + Chrome DevTools, 0x
Python    → py-spy (sampling, zero overhead), cProfile + snakeviz, memray
Java/JVM  → async-profiler, JFR + JMC, VisualVM
Go        → pprof (net/http/pprof), trace, benchstat
Rust      → cargo flamegraph, criterion
HTTP/API  → wrk2, k6, hey, autocannon
DB (SQL)  → EXPLAIN ANALYZE, sys.dm_exec_query_stats, slow query log
```

Critère de choix : préférer le **sampling** (< 1 % overhead) en prod ; réserver **tracing** (instrumentation complète) à staging pour les bottlenecks fins.

---

### 3. Profiling CPU

```bash
# py-spy — snapshot sans redémarrer le process
py-spy record -o profile.svg --pid <PID> --duration 30

# async-profiler (JVM)
./profiler.sh -d 30 -f flamegraph.html <PID>

# Go — endpoint HTTP exposé
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30

# .NET — CLI
dotnet-trace collect --process-id <PID> --duration 00:00:30
dotnet-trace convert trace.nettrace --format Speedscope
```

Lire un flame graph : la **largeur** d'un bloc = % CPU total ; chercher les plateaux larges inattendus. Ignorer les frames system en bas, se concentrer sur le code applicatif.

Signaux d'alerte CPU :
- Fonction > 5 % du total sans raison métier évidente
- Boucle tight loop sur du parsing (JSON, XML) répété
- Regex compilée à chaque appel (recréer le pattern en boucle)
- Serialisation/désérialisation dans des hot paths

---

### 4. Profiling mémoire

```bash
# Python — memray
memray run --output out.bin mon_script.py
memray flamegraph out.bin

# Node.js — heap snapshot
node --inspect app.js
# puis Chrome DevTools > Memory > Take snapshot

# .NET — dotMemory CLI
dotmemory attach <PID> --save-to-dir snapshots/ --trigger-timer:interval=60s

# Go
curl http://localhost:6060/debug/pprof/heap > heap.prof
go tool pprof -http=:8080 heap.prof
```

Checklist memory leak :
- [ ] Event listeners non détachés (`removeEventListener`, `-=` en C#)
- [ ] Caches statiques sans TTL ni éviction (LRU)
- [ ] Closures capturant des gros objets
- [ ] `IDisposable` / `using` manquant (.NET)
- [ ] Connexions DB ou fichiers non fermés
- [ ] Références circulaires sans WeakReference

GC pressure : si GC pause > 50 ms ou fréquence > 1 collection/s en Gen2 (.NET) → réduire les allocations dans les hot paths (pooling, stackalloc, Span<T>).

---

### 5. Profiling I/O / Base de données

**Détection N+1 queries** (ORM) :

```csharp
// EF Core — activer logging des requêtes
options.LogTo(Console.WriteLine, LogLevel.Information)
       .EnableSensitiveDataLogging();
// Chercher des SELECT répétés dans une boucle
// Fix : .Include() ou projection explicite
```

```python
# Django — django-debug-toolbar ou:
from django.db import connection
print(len(connection.queries))  # doit être constant
```

Commandes SQL diagnostics :

```sql
-- SQL Server : top queries par CPU
SELECT TOP 10 total_worker_time/execution_count AS avg_cpu,
       total_logical_reads/execution_count AS avg_reads,
       execution_count, text
FROM sys.dm_exec_query_stats
CROSS APPLY sys.dm_exec_sql_text(sql_handle)
ORDER BY avg_cpu DESC;

-- PostgreSQL : slow queries (pg_stat_statements)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;
```

Index manquant : vérifier `EXPLAIN (ANALYZE, BUFFERS)` — un `Seq Scan` sur une grande table = candidat index.

---

### 6. Benchmarking avant/après

```bash
# HTTP — k6
k6 run --vus 50 --duration 30s script.js

# CLI binaries — hyperfine
hyperfine --warmup 5 'avant' 'apres'

# Python — pytest-benchmark
pytest tests/bench_*.py --benchmark-compare

# .NET — BenchmarkDotNet (dans un projet dédié)
# [Benchmark] sur la méthode, dotnet run -c Release
```

Règle : minimum **3 runs**, écarter les outliers, reporter **p50 / p95 / p99**, pas seulement la moyenne.

---

### 7. Optimisations classiques par catégorie

**CPU**
- Remplacer O(n²) par O(n log n) : trier + binary search, hashmap lookup
- Memoïsation/cache des calculs déterministes coûteux
- SIMD / intrinsics pour traitements vectorisables (Rust, C#, C++)

**Mémoire**
- Object pooling (`ArrayPool<T>`, `ObjectPool<T>` .NET, `sync.Pool` Go)
- Éviter les allocations dans les hot paths : `Span<T>`, value types, stackalloc
- Streaming au lieu de chargement en mémoire entière (fichiers, HTTP responses)

**I/O**
- Batching : regrouper 100 inserts en 1 bulk insert
- Connection pooling : ne jamais ouvrir une connexion par requête HTTP
- Async I/O partout : `await`, goroutines, asyncio — pas de sync-over-async
- CDN + cache HTTP (`Cache-Control`, ETags) pour les assets statiques

**Base de données**
- Index composites sur les colonnes filtrées ensemble fréquemment
- `SELECT` uniquement les colonnes nécessaires, jamais `SELECT *` dans les hot paths
- Read replicas pour les lectures intensives
- Connection pool sizing : `max_connections` = (CPU cores × 2) + disks (formule HikariCP)

---

## Garde-fous & anti-patterns

| Anti-pattern | Risque | Fix |
|---|---|---|
| Optimiser sans mesurer | Perdre du temps sur un non-bottleneck | Toujours profiler d'abord |
| Micro-benchmark isolé ≠ prod | Résultats trompeurs (JIT warmup, data size) | Benchmark sur données réalistes |
| Caching partout d'emblée | Staleness, invalidation complexe, mémoire | Cacher seulement ce qui est mesuré comme lent |
| Parallélisme naïf | Race conditions, contention, overhead > gain | Mesurer le speedup réel, Amdahl's Law |
| Ignorer le GC / allocations | Pauses imprévisibles en prod | Profiler les allocations, pas que le CPU |
| Index sur toutes les colonnes | Writes dégradés, taille disque | Indexer seulement les requêtes fréquentes et lentes |
| sync-over-async (.NET) | Deadlocks en prod | Async all the way, jamais `.Result` / `.Wait()` |

---

## Bonnes pratiques 2026

- **Continuous profiling** en prod : Datadog Continuous Profiler, Pyroscope, Parca — capturer les profils en continu sans overhead significatif.
- **eBPF** pour le profiling kernel-level sans instrumentation (Pixie, Parca sur Linux).
- **DORA metrics** : corréler les dégradations de perf avec les déploiements (change failure rate).
- **SLO-driven** : définir un SLO (ex : p99 < 200 ms) avant d'optimiser, arrêter dès que l'objectif est atteint.
- **Flamescope** pour analyser les profils dans le temps (détecter les pics périodiques).
- **OpenTelemetry** comme standard de tracing distribué — éviter les APM propriétaires lock-in.


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
