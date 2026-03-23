---
name: go-concurrency-guide
description: Développement Go avec focus sur la concurrence et les patterns idiomatiques. Se déclenche avec "Go", "Golang", "goroutine", "channel", "sync", "concurrency", "Go modules", "Go patterns", "interface Go".
---

# Go Concurrency Guide

## Workflow

1. **Fondamentaux Go** : Structurer le code avec des structs et méthodes (value vs pointer receivers), définir des comportements avec des interfaces implicites (duck typing), gérer les erreurs comme des valeurs de retour (`func f() (T, error)`), utiliser `defer` pour le cleanup garanti (close, unlock, log), comprendre les `init()` functions et leur ordre d'exécution dans les packages.

2. **Goroutines et channels** : Lancer des goroutines légères avec `go func()`, créer des channels typés unbuffered (synchrone) ou buffered (`make(chan T, n)`), utiliser `select` pour multiplexer plusieurs channels, implémenter le done pattern avec `chan struct{}` pour signaler l'arrêt, appliquer fan-in (merge de plusieurs channels) et fan-out (distribution vers plusieurs workers).

3. **Patterns de concurrence** : Implémenter le worker pool (N goroutines lisant depuis un channel de jobs), le pipeline (chaîne de stages transformant des données via channels), le semaphore avec un buffered channel (`make(chan struct{}, n)`) pour limiter la concurrence, le rate limiting avec `time.Ticker`, propager l'annulation et les deadlines avec `context.Context`.

4. **Sync primitives** : Protéger les données partagées avec `sync.Mutex` (exclusion mutuelle) et `sync.RWMutex` (lecture concurrente), synchroniser la fin de goroutines avec `sync.WaitGroup`, exécuter une initialisation unique avec `sync.Once`, utiliser `sync.Map` pour les maps concurrentes, les opérations atomiques avec `sync/atomic` pour les compteurs haute performance.

5. **Error handling Go** : Propager les erreurs avec wrapping (`fmt.Errorf("context: %w", err)`), définir des sentinel errors avec `var ErrNotFound = errors.New("not found")`, créer des erreurs custom en implémentant l'interface `error`, tester le type avec `errors.Is` (valeur) et `errors.As` (type), toujours handler les erreurs sans `_` dans le code de production.

6. **Testing Go** : Structurer les tests table-driven (`testCases := []struct{...}{{...}}`), benchmarker avec `func BenchmarkXxx(b *testing.B)` et `b.ResetTimer()`, utiliser le fuzzing (`func FuzzXxx(f *testing.F)`) pour les parseurs et fonctions critiques, tester les handlers HTTP avec `net/http/httptest`, utiliser `testify` (`assert`, `require`, `mock`) pour des assertions expressives.

7. **Packages et modules** : Initialiser avec `go mod init module/path`, organiser en packages cohésifs (éviter les packages `utils`/`common`), utiliser `internal/` pour le code non-exporté hors du module, gérer les versions avec `go get module@v1.2.3`, utiliser `go.work` pour le développement multi-modules en local, respecter les conventions de nommage des packages (court, sans underscore).

8. **Production Go** : Logger structuré avec `log/slog` (Go 1.21+) ou `zap`/`zerolog`, exposer les métriques avec `prometheus/client_golang`, profiler avec `net/http/pprof` (CPU, mémoire, goroutines), linter avec `golangci-lint` (configuration `.golangci.yml`), automatiser avec un `Makefile` (`build`, `test`, `lint`, `docker`), structurer les binaires avec `cmd/` et `internal/`.

## Règles

- Écrire du Go idiomatique : interfaces petites (1-2 méthodes), composition plutôt qu'héritage, nommage court en contexte local (`i` pas `index` dans une boucle courte).
- Ne jamais ignorer une erreur ; si une erreur est vraiment ignorable, commenter pourquoi avec `//nolint:errcheck // reason`.
- Respecter la règle "Don't communicate by sharing memory; share memory by communicating" : préférer les channels aux mutexes pour la coordination, les mutexes pour la protection de state.
- Utiliser `context.Context` systématiquement pour la propagation des deadlines, timeouts et annulations dans toutes les fonctions I/O-bound.
- Expliquer les invariants de concurrence : documenter quel goroutine possède quelle donnée, quels channels communiquent quoi, et pourquoi le design évite les race conditions.
