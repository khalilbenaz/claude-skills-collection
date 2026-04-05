---
name: dev-rust-guide
description: Guide Rust pour ownership, lifetimes et patterns systèmes. Se déclenche avec "Rust", "ownership", "borrow checker", "lifetime", "cargo", "traits", "async Rust", "systems programming", "memory safety".
---

# Rust Guide

## Workflow

1. **Ownership et borrowing** : Comprendre les trois règles d'ownership (une valeur = un owner, drop à la fin du scope, move sémantique), distinguer move (transfert) de clone (copie profonde), utiliser les références partagées `&T` (lecture seule, multiples) et exclusives `&mut T` (une seule), respecter les règles d'emprunt pour éviter les data races à la compilation.

2. **Lifetimes** : Comprendre que les lifetimes annotent les relations entre références (ne créent pas de durée de vie), appliquer l'élision de lifetime pour les cas simples, annoter explicitement quand le compilateur ne peut pas inférer (`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str`), utiliser `'static` uniquement pour les données vivant toute la durée du programme, placer les lifetimes dans les structs contenant des références.

3. **Error handling** : Utiliser `Result<T, E>` pour les erreurs récupérables, `Option<T>` pour les valeurs absentes, l'opérateur `?` pour propager les erreurs élégamment, créer des erreurs custom avec `thiserror` (`#[derive(Error)]`), utiliser `anyhow` pour les applications (context riche), `thiserror` pour les bibliothèques (API publique stable).

4. **Traits et generics** : Définir des comportements abstraits avec les traits (`trait Display { fn fmt(...) }`), appliquer des trait bounds (`fn print<T: Display>(val: T)`), utiliser `impl Trait` en paramètre/retour pour la concision, `dyn Trait` pour le dispatch dynamique (runtime), les associated types pour les traits avec un seul type lié (`type Item`), les blanket implementations pour étendre des types tiers.

5. **Patterns courants** : Builder pattern avec méthodes chaînées et validation finale, newtype pattern (`struct Meters(f64)`) pour la type safety, typestate pattern pour les machines à état vérifiées à la compilation (`struct Connection<S: State>`), enum-based state machines pour la logique métier, le pattern `From`/`Into` pour les conversions idiomatiques.

6. **Async Rust** : Utiliser `tokio` comme runtime async principal (`#[tokio::main]`), comprendre que les `Future` sont paresseux (ne s'exécutent que si pollés), écrire des fonctions `async fn` et les `await`, utiliser `tokio::spawn` pour les tâches concurrentes, `tokio::select!` pour les races, les streams pour les séquences asynchrones, comprendre le pinning (`Pin<Box<dyn Future>>`) pour les self-referential types.

7. **Unsafe et FFI** : Utiliser `unsafe` uniquement quand les invariants sont vérifiés manuellement (raw pointers, appel FFI, implémentation de traits unsafe), documenter les invariants avec `// SAFETY:` comments, interagir avec C via `extern "C"` et `#[no_mangle]`, utiliser `bindgen` pour générer les bindings automatiquement, éviter `std::mem::transmute` sauf si absolument nécessaire avec justification.

8. **Écosystème Cargo** : Gérer les dépendances avec `Cargo.toml` (features, workspace), utiliser `cargo clippy` pour les lints idiomatiques, `cargo fmt` pour le formatage, `cargo test` pour les tests intégrés, `cargo bench` pour les benchmarks (criterion.rs), les crates essentielles : `serde`/`serde_json` (sérialisation), `clap` (CLI), `axum`/`actix-web` (web), `tokio` (async runtime), `rayon` (parallélisme).

## Règles

- Faire confiance au borrow checker : si le code ne compile pas, c'est souvent qu'il y a un vrai problème de concurrence ou de durée de vie ; refactoriser plutôt que contourner.
- Écrire du code idiomatique Rust : utiliser les itérateurs et méthodes fonctionnelles (`map`, `filter`, `fold`) plutôt que les boucles impératives quand c'est plus clair.
- Minimiser les clones : comprendre pourquoi le clone est nécessaire, considérer les références ou le refactoring si les clones prolifèrent dans le code critique.
- Utiliser les dernières éditions Rust (`edition = "2021"` dans `Cargo.toml`) pour bénéficier des améliorations du langage (imports, closures, etc.).
- Expliquer le modèle mémoire : chaque décision d'ownership, de lifetime ou d'unsafe mérite un commentaire expliquant pourquoi cette approche garantit la safety.


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
