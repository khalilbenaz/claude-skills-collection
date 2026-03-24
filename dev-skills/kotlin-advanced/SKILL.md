---
name: kotlin-advanced
description: Kotlin avancé pour Android fintech. Coroutines, Flows, Sealed classes, inline functions, delegates, reified types. Se déclenche avec "Kotlin avancé", "coroutines", "Flow", "sealed", "extension".
---

# Kotlin Advanced (Android Fintech)

## Workflow

* 1\. **Coroutines et Concurrency** -- Structurer le code asynchrone avec suspend functions, CoroutineScope, SupervisorJob. Dispatchers.IO pour I/O (DB, réseau), Dispatchers.Main pour UI, Dispatchers.Default pour CPU. Timeout avec withTimeout, structured concurrency.
* 2\. **Kotlin Flows pour réactivité** -- StateFlow et SharedFlow pour state management (MVVM). Cold flows (flow{}, channelFlow) pour streams de données. Operators : map, filter, combine, zip, flatMapLatest. Backpressure handling avec buffer, conflate, collectLatest.
* 3\. **Sealed Classes et Pattern Matching** -- Modéliser états d'UI (sealed class UiState), erreurs métier (sealed class ApiError), résultats d'opérations (sealed class Result). Exhaustive when expressions pour sécurité type-safe. Nested sealed classes.
* 4\. **Extension Functions et DSLs** -- Créer DSLs métier pour APIs (ex: DSL pour définir transactions bancaires). Extensions sur collections, strings, Context. Builder pattern fluide avec lambda trailing. Type-safe builders pour config.
* 5\. **Delegates et Property Delegation** -- Delegation : by lazy, by viewModels(), by navArgs(). Custom delegates (ReadWriteProperty) pour logique réutilisable (encryption, validation). ObserverDelegate pour reactive properties.
* 6\. **Inline Functions et Reified Types** -- inline functions pour performance (avoid lambda allocation), reified pour type-safe generic parsing. reified pour JSON deserialization (Moshi, Gson), type-safe routing, generic adapters.
* 7\. **Jetpack Compose Modern** -- Declarative UI avec Compose. State hoisting, unidirectional data flow. Remember, derivedStateOf, snapshotFlow. Performance : rememberSaveable, LaunchedEffect, DisposableEffect. Interoperability avec XML.
* 8\. **Design Patterns Kotlin-native** -- Kotlin adaptations : Builder avec apply/run, Strategy avec function types, Visitor avec sealed classes, Factory avec inline reified. Avoid Java patterns anti-idiomatic (getters/setters -> properties, callbacks -> lambdas).

## Règles

* **Suspend functions seulement** : Jamais de thread/ExecutorService. Toutes I/O via suspend. ViewModelScope lifecycle-aware : cancellation automatique. Éviter GlobalScope (memory leak risk).
* **Flow > LiveData** : Préférer StateFlow/SharedFlow pour state, Flow pour streams. LiveData legacy support seulement si nécessaire. Un seul source de vérité (Flow) avec .asLiveData() pour observers anciens.
* **Kotlin-first** : Éviter Java interop quand possible. Properties au lieu de getters/setters. Named arguments, default parameters. Extension functions au lieu de Utils classes. Null safety stricte (?/!!).
* **Composition over inheritance** : Prefer sealed classes/interfaces over deep inheritance. Use delegation (by keyword) instead of inheritance. Avoid final classes only for testing needs (mockito).
* **Immutability by default** : val > var, immutable collections (listOf vs mutableListOf), data classes pour value objects. Functional transformations (map/filter) au lieu de for-loops mutables.
