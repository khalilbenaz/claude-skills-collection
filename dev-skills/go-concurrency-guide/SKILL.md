---
name: go-concurrency-guide
description: Développement Go avec focus sur la concurrence et les patterns idiomatiques. Se déclenche avec "Go", "Golang", "goroutine", "channel", "sync", "concurrency", "Go modules", "Go patterns", "interface Go".
---

# Go Concurrency Guide

## 1. Fondamentaux Go — critères de décision

| Situation | Choix |
|---|---|
| Méthode modifie le receiver | Pointer receiver `*T` |
| Méthode lit seulement | Value receiver `T` (sauf struct > ~64 bytes) |
| Comportement partagé | Interface implicite (duck typing) |
| Cleanup garanti | `defer f.Close()` / `defer mu.Unlock()` |
| Erreur attendue | Retour `(T, error)`, jamais panic |

```go
type Store struct{ db *sql.DB }

func (s *Store) Get(ctx context.Context, id int) (User, error) {
    var u User
    err := s.db.QueryRowContext(ctx, "SELECT ...").Scan(&u.Name)
    return u, fmt.Errorf("store.Get %d: %w", id, err)
}
```

## 2. Goroutines et channels

**Unbuffered** = synchrone (handshake). **Buffered** = découplage, ne pas abuser.

```go
// Done pattern — arrêt propre
done := make(chan struct{})
go func() {
    defer close(done)
    for {
        select {
        case <-ctx.Done():
            return
        case job := <-jobs:
            process(job)
        }
    }
}()

// Fan-out vers N workers
jobs := make(chan Task, 100)
var wg sync.WaitGroup
for range N {                          // Go 1.22+
    wg.Add(1)
    go func() {
        defer wg.Done()
        for t := range jobs { handle(t) }
    }()
}
close(jobs)
wg.Wait()
```

**Règle d'or** : le producteur ferme le channel, jamais le consommateur.

## 3. Patterns de concurrence — quand utiliser quoi

| Pattern | Usage | Snippet |
|---|---|---|
| Worker pool | CPU-bound, N fixe | `make(chan Job, buf)` + N goroutines |
| Pipeline | Transformations en chaîne | channels en entrée/sortie de chaque stage |
| Semaphore | Limiter I/O concurrent | `sem := make(chan struct{}, max)` |
| errgroup | Goroutines avec erreur remontée | `golang.org/x/sync/errgroup` |

```go
// Semaphore — max 10 requêtes HTTP parallèles
sem := make(chan struct{}, 10)
for _, url := range urls {
    sem <- struct{}{}
    go func(u string) {
        defer func() { <-sem }()
        fetch(u)
    }(url)
}

// errgroup — propagation d'erreur
g, ctx := errgroup.WithContext(ctx)
for _, item := range items {
    item := item
    g.Go(func() error { return process(ctx, item) })
}
if err := g.Wait(); err != nil { ... }
```

## 4. Sync primitives — choix raisonné

```go
// Mutex : protéger un état partagé simple
type Cache struct {
    mu    sync.RWMutex
    store map[string]string
}
func (c *Cache) Get(k string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.store[k]
    return v, ok
}

// Once : init lazy thread-safe
var once sync.Once
var client *http.Client
func getClient() *http.Client {
    once.Do(func() { client = &http.Client{Timeout: 5 * time.Second} })
    return client
}

// Atomic : compteur haute fréquence
var hits atomic.Int64
hits.Add(1)
fmt.Println(hits.Load())
```

**sync.Map** : seulement si le profiler le justifie (overhead élevé vs `map + RWMutex`).

## 5. Context — règles non négociables

```go
// Timeout sur appel externe
ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
defer cancel()                          // toujours defer cancel

resp, err := http.NewRequestWithContext(ctx, "GET", url, nil)

// Propager sans créer de goroutine leak
func worker(ctx context.Context, ch <-chan Work) {
    for {
        select {
        case <-ctx.Done():
            return                      // nettoyage immédiat
        case w, ok := <-ch:
            if !ok { return }
            handle(ctx, w)
        }
    }
}
```

Ne jamais stocker `context.Context` dans une struct ; le passer en premier paramètre.

## 6. Error handling

```go
// Sentinel error
var ErrNotFound = errors.New("not found")

// Error custom avec données
type ValidationError struct{ Field, Msg string }
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation %s: %s", e.Field, e.Msg)
}

// Wrapping + unwrapping
if err := repo.Get(id); err != nil {
    return fmt.Errorf("service.GetUser %d: %w", id, err)
}
if errors.Is(err, ErrNotFound) { ... }
var ve *ValidationError
if errors.As(err, &ve) { ... }
```

## 7. Testing

```go
// Table-driven
func TestAdd(t *testing.T) {
    cases := []struct{ a, b, want int }{
        {1, 2, 3}, {0, 0, 0}, {-1, 1, 0},
    }
    for _, tc := range cases {
        t.Run(fmt.Sprintf("%d+%d", tc.a, tc.b), func(t *testing.T) {
            got := Add(tc.a, tc.b)
            assert.Equal(t, tc.want, got)
        })
    }
}

// Race detector — toujours en CI
// go test -race ./...

// Benchmark
func BenchmarkWorkerPool(b *testing.B) {
    b.ResetTimer()
    for b.Loop() { runPool() }     // Go 1.24+ b.Loop()
}
```

## 8. Production checklist

```bash
# Lint
golangci-lint run ./...

# Profil CPU (30s)
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Build reproductible
go build -trimpath -ldflags="-s -w" ./cmd/myapp

# Vulnérabilités
govulncheck ./...
```

- Logger structuré : `log/slog` (stdlib Go 1.21+) ou `zap` si perf critique.
- Métriques : `prometheus/client_golang` + exposition sur `/metrics`.
- Layout : `cmd/myapp/main.go`, `internal/`, `pkg/` (si API publique), pas de `utils/`.

## Anti-patterns / pièges

| Piège | Symptôme | Correction |
|---|---|---|
| Goroutine leak | Goroutines qui ne se terminent jamais | Toujours `ctx.Done()` ou fermeture du channel |
| Race condition | `go test -race` détecte des accès concurrents | `sync.Mutex` ou ownership clair |
| Channel blocking | Deadlock au runtime | Buffered channel ou goroutine séparée pour envoyer |
| Capturer variable de loop | `go func() { use(i) }()` prend la dernière valeur | `i := i` avant le `go`, ou Go 1.22+ (loop var par itération) |
| Panic non récupéré | Crash du process entier | `defer func() { recover() }()` dans chaque goroutine long-lived |
| Context dans struct | API difficile à annuler | Toujours passer `ctx` en paramètre |
| `sync.Map` par défaut | Perf dégradée | N'utiliser que pour des maps avec insertions rares et lectures très fréquentes |
