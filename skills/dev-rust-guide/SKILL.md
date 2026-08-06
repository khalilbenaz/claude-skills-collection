---
name: dev-rust-guide
description: Guide Rust pour ownership, lifetimes et patterns systèmes. Se déclenche avec "Rust", "ownership", "borrow checker", "lifetime", "cargo", "traits", "async Rust", "systems programming", "memory safety". Also triggers on "Rust ownership", "borrow checker error", "lifetimes in Rust".
---

# Rust Guide

## Workflow

### 1. Ownership & Borrowing

Trois règles fondamentales :
- Une valeur = un seul owner.
- L'owner drop la valeur à la fin de son scope.
- Passer une valeur = move (le transfert invalide la source).

```rust
let s1 = String::from("hello");
let s2 = s1;          // move : s1 invalide
let s3 = s2.clone();  // copie profonde explicite

fn inspect(s: &str) { /* lecture seule */ }
fn mutate(s: &mut String) { s.push('!'); } // ref exclusive
```

Règle d'emprunt : soit N références partagées `&T`, soit UNE seule `&mut T`, jamais les deux simultanément.

### 2. Lifetimes

Les lifetimes décrivent des **relations entre références**, elles ne créent pas de durée de vie.

```rust
// Nécessaire : le compilateur ne peut pas inférer quelle ref est retournée
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// Struct avec référence : lifetime obligatoire
struct Excerpt<'a> {
    part: &'a str,
}
```

Critères :
- Une seule ref en entrée → élision suffit (pas d'annotation).
- Plusieurs refs en entrée, une ref en sortie → annoter la relation.
- `'static` = données vivant toute la durée du programme (string literals, globaux) ; ne pas en abuser.

### 3. Error Handling

| Contexte | Crate recommandée | Pourquoi |
|---|---|---|
| Bibliothèque (API publique) | `thiserror` | Erreurs typées, messages contrôlés |
| Application (binaire) | `anyhow` | Context riche, propagation facile |
| Proto / script rapide | `Box<dyn Error>` | Zéro configuration |

```rust
// Bibliothèque
use thiserror::Error;
#[derive(Error, Debug)]
pub enum AppError {
    #[error("fichier introuvable : {0}")]
    NotFound(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

// Application : propagation avec contexte
use anyhow::{Context, Result};
fn load(path: &str) -> Result<String> {
    std::fs::read_to_string(path)
        .with_context(|| format!("lecture de {path}"))
}
```

Règle : ne jamais `unwrap()` en production ; réserver `.expect("raison")` aux invariants impossibles à violer.

### 4. Traits & Generics

```rust
// Trait bound statique (monomorphisation, zéro overhead)
fn affiche<T: std::fmt::Display>(val: T) { println!("{val}"); }

// impl Trait en retour (opaque type)
fn make_adder(x: i32) -> impl Fn(i32) -> i32 { move |y| x + y }

// dyn Trait : dispatch dynamique (heap, vtable)
fn process(items: &[Box<dyn Draw>]) { items.iter().for_each(|i| i.draw()); }
```

Critères `impl Trait` vs `dyn Trait` :
- `impl Trait` : un seul type concret connu à la compilation → perf optimale.
- `dyn Trait` : types hétérogènes dans une collection, ou taille inconnue à la compile → `Box<dyn Trait>`.

### 5. Patterns idiomatiques

**Newtype** — type safety sans overhead :
```rust
struct Meters(f64);
struct Kilograms(f64);
// impossible de confondre Meters et Kilograms à la compile
```

**Builder avec validation** :
```rust
struct Config { host: String, port: u16 }
struct ConfigBuilder { host: String, port: Option<u16> }
impl ConfigBuilder {
    pub fn port(mut self, p: u16) -> Self { self.port = Some(p); self }
    pub fn build(self) -> Result<Config, String> {
        Ok(Config { host: self.host, port: self.port.ok_or("port requis")? })
    }
}
```

**Typestate** — états vérifiés à la compilation :
```rust
struct Connection<S> { _state: std::marker::PhantomData<S> }
struct Disconnected; struct Connected;
impl Connection<Disconnected> {
    fn connect(self) -> Connection<Connected> { /* ... */ todo!() }
}
impl Connection<Connected> {
    fn send(&self, data: &[u8]) { /* interdit si Disconnected */ }
}
```

### 6. Async Rust

```toml
# Cargo.toml
tokio = { version = "1", features = ["full"] }
```

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Tâche concurrente
    let handle = tokio::spawn(async { fetch_data().await });

    // Race entre futures
    tokio::select! {
        res = handle => println!("{res:?}"),
        _ = tokio::time::sleep(std::time::Duration::from_secs(5)) => eprintln!("timeout"),
    }
    Ok(())
}
```

Points d'attention :
- Les `Future` sont **lazy** : sans `.await` ou `spawn`, rien ne s'exécute.
- Ne pas bloquer dans une tâche async (`std::thread::sleep`, I/O synchrone) → utiliser `tokio::time::sleep` et `tokio::fs`.
- Partager l'état entre tâches : `Arc<Mutex<T>>` (ou `Arc<tokio::sync::RwLock<T>>` pour reads fréquents).
- `Pin<Box<dyn Future>>` requis pour les futures auto-référentielles (trait objects async).

### 7. Unsafe & FFI

```rust
// SAFETY: le pointeur est valide et exclusif pour toute la durée de l'appel.
unsafe fn raw_write(ptr: *mut u8, val: u8) {
    *ptr = val;
}

// Binding C
extern "C" {
    fn strlen(s: *const std::ffi::c_char) -> usize;
}
```

Règles strictes :
- Chaque bloc `unsafe` doit avoir un commentaire `// SAFETY:` justifiant pourquoi l'invariant est respecté.
- Préférer `bindgen` pour générer les bindings C/C++ plutôt que les écrire manuellement.
- `std::mem::transmute` = dernier recours ; toujours justifier.

### 8. Cargo & Écosystème 2026

Commandes essentielles :
```bash
cargo new mon_projet --lib   # nouveau projet bibliothèque
cargo add tokio --features full  # ajouter dépendance
cargo clippy -- -D warnings  # lints stricts (CI)
cargo fmt --check            # vérification style (CI)
cargo test                   # tests unitaires + intégration
cargo bench                  # benchmarks (criterion)
cargo doc --open             # documentation locale
cargo audit                  # audit sécurité dépendances
```

Crates incontournables :

| Domaine | Crate |
|---|---|
| Sérialisation | `serde` + `serde_json` / `serde_yaml` |
| CLI | `clap` v4 (derive) |
| Web async | `axum` (Tower ecosystem) |
| HTTP client | `reqwest` |
| Async runtime | `tokio` |
| Parallélisme CPU | `rayon` |
| Logging | `tracing` + `tracing-subscriber` |
| Testing fixtures | `rstest` |
| Benchmarks | `criterion` |

---

## Garde-fous & Anti-patterns

| Anti-pattern | Impact | Alternative |
|---|---|---|
| `clone()` systématique pour contourner le borrow checker | Perf, allocation inutile | Refactoriser les lifetimes ou passer des références |
| `unwrap()` / `expect("")` sans justification | Panic en prod | `?`, `if let`, error handling explicite |
| `Arc<Mutex<T>>` sur tout | Contention, deadlocks | Passer la donnée par canal (`tokio::sync::mpsc`) quand possible |
| `unsafe` sans commentaire SAFETY | Undefined behavior silencieux | Toujours justifier l'invariant |
| Ignorer `clippy` | Code non-idiomatique, bugs latents | CI bloquante sur `cargo clippy -- -D warnings` |
| Spawner des threads OS pour I/O async | Bloque le runtime tokio | Utiliser les primitives `tokio::` |
| Édition `2018` ou absente | Manque les améliorations récentes | `edition = "2021"` dans `Cargo.toml` |

## Bonnes pratiques 2026

- Toujours spécifier `edition = "2021"` dans `Cargo.toml`.
- Activer `#![deny(missing_docs)]` sur les bibliothèques publiques.
- Utiliser `#[non_exhaustive]` sur les enums publics pour la compatibilité ascendante.
- Préférer les itérateurs aux boucles `for` avec index (`iter().enumerate()`, `map`, `filter`, `flat_map`).
- Utiliser `tracing` plutôt que `println!` pour l'observabilité (spans, niveaux, JSON output).
- Structurer les workspaces Cargo dès qu'un projet dépasse 2 crates (`[workspace]` dans la racine).
- Versionner avec SemVer strict ; utiliser `cargo-semver-checks` pour valider avant publication.


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
