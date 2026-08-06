---
name: dev-kotlin-advanced
description: Kotlin avancé pour Android fintech. Coroutines, Flows, Sealed classes, inline functions, delegates, reified types. Se déclenche avec "Kotlin avancé", "coroutines", "Flow", "sealed", "extension". Also triggers on "Kotlin coroutines", "Kotlin Flow".
---

# Kotlin Advanced (Android Fintech)

## Workflow

### 1. Structurer la concurrence avec les Coroutines

- Utilise `viewModelScope` (ViewModel) et `lifecycleScope` (Activity/Fragment) — jamais `GlobalScope`.
- `SupervisorJob` pour isoler les échecs entre tâches parallèles.
- Dispatchers : `IO` pour réseau/DB, `Default` pour CPU, `Main` pour UI.

```kotlin
// Pattern sûr : error handling + timeout
viewModelScope.launch {
    val result = withContext(Dispatchers.IO) {
        withTimeout(5_000L) { api.fetchTransaction(id) }
    }
    _state.value = result.fold(::UiState.Success, ::UiState.Error)
}

// Parallel avec SupervisorJob
viewModelScope.launch {
    val (balance, history) = supervisorScope {
        async { repo.getBalance() } to async { repo.getHistory() }
    }
    // chaque deferred peut échouer indépendamment
}
```

### 2. State Management avec Flow

Critères de choix :

| Besoin | Solution |
|---|---|
| État UI courant (1 valeur) | `StateFlow` |
| Événements one-shot (nav, toast) | `SharedFlow(replay=0)` |
| Stream de données froid | `flow {}` |
| Combiner plusieurs sources | `combine()` |

```kotlin
// StateFlow exposition dans ViewModel
private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
val uiState: StateFlow<UiState> = _uiState.asStateFlow()

// Collect avec lifecycle-awareness dans Fragment
viewLifecycleOwner.lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { render(it) }
    }
}

// Operators utiles
repo.transactions()
    .filter { it.amount > 0 }
    .map { it.toUiModel() }
    .catch { emit(emptyList()) }
    .flowOn(Dispatchers.IO)
    .collectLatest { adapter.submit(it) }
```

### 3. Modéliser les états avec Sealed Classes

```kotlin
sealed class UiState<out T> {
    data object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val code: Int, val message: String) : UiState<Nothing>()
}

// when exhaustif — le compilateur garantit l'exhaustivité
when (state) {
    is UiState.Loading -> showSpinner()
    is UiState.Success -> render(state.data)
    is UiState.Error   -> showError(state.message)
}
```

Erreurs métier fintech :
```kotlin
sealed class PaymentError {
    data object InsufficientFunds : PaymentError()
    data class NetworkTimeout(val retryAfterMs: Long) : PaymentError()
    data class FraudBlock(val caseId: String) : PaymentError()
}
```

### 4. Extension Functions et DSLs

```kotlin
// Extension utilitaire sur Context
fun Context.toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

// DSL type-safe pour configurer une transaction
class TransactionBuilder {
    var amount: Long = 0
    var currency: String = "TND"
    var recipient: String = ""
    fun build() = Transaction(amount, currency, recipient)
}
fun transaction(block: TransactionBuilder.() -> Unit) =
    TransactionBuilder().apply(block).build()

// Usage lisible
val tx = transaction {
    amount = 15_000
    currency = "TND"
    recipient = "CLIENT_007"
}
```

### 5. Delegates et Property Delegation

```kotlin
// Chiffrement transparent via delegate
class EncryptedPrefsDelegate(private val prefs: SharedPreferences, private val key: String) :
    ReadWriteProperty<Any?, String?> {
    override fun getValue(thisRef: Any?, property: KProperty<*>) =
        prefs.getString(key, null)?.decrypt()
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: String?) {
        prefs.edit { putString(key, value?.encrypt()) }
    }
}

class UserSession(prefs: SharedPreferences) {
    var token: String? by EncryptedPrefsDelegate(prefs, "auth_token")
}

// Delegates Android courants
val viewModel: MyViewModel by viewModels()
val args: MyFragmentArgs by navArgs()
val binding by viewBinding(FragmentPaymentBinding::bind)
```

### 6. Inline Functions et Reified Types

```kotlin
// Parsing générique type-safe (évite Class<T> explicite)
inline fun <reified T> String.fromJson(): T =
    Moshi.Builder().build().adapter(T::class.java).fromJson(this)!!

val response: PaymentResponse = jsonString.fromJson()

// Mesure de performance sans overhead lambda
inline fun <T> measureMs(label: String, block: () -> T): T {
    val start = System.currentTimeMillis()
    return block().also { Log.d("PERF", "$label: ${System.currentTimeMillis() - start}ms") }
}

// Logging conditionnel sans allocation si désactivé
inline fun logDebug(tag: String, msg: () -> String) {
    if (BuildConfig.DEBUG) Log.d(tag, msg())
}
```

### 7. Jetpack Compose — Performance

```kotlin
// derivedStateOf pour éviter les recompositions inutiles
val isFormValid by remember {
    derivedStateOf { amount > 0 && recipient.isNotBlank() }
}

// LaunchedEffect pour effets side-effect UI
LaunchedEffect(Unit) {
    viewModel.events.collect { event ->
        when (event) {
            is Event.Navigate -> navController.navigate(event.route)
            is Event.ShowError -> scaffoldState.snackbarHostState.showSnackbar(event.msg)
        }
    }
}

// Stable keys pour les listes
LazyColumn {
    items(transactions, key = { it.id }) { tx ->
        TransactionRow(tx)
    }
}
```

### 8. Patterns Kotlin-natifs

```kotlin
// Strategy via function types (plus simple que classe abstraite)
fun processPayment(amount: Long, strategy: (Long) -> Result<Unit>) = strategy(amount)
val cardStrategy: (Long) -> Result<Unit> = { amount -> cardService.charge(amount) }

// Factory avec reified
inline fun <reified T : ViewModel> viewModelFactory(crossinline create: () -> T) =
    object : ViewModelProvider.Factory {
        override fun <VM : ViewModel> create(cls: Class<VM>): VM = create() as VM
    }
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Problème | Correctif |
|---|---|---|
| `GlobalScope.launch` | Memory leak, pas de cancellation | `viewModelScope` ou scope custom |
| `.collect {}` sans `repeatOnLifecycle` | Collect en background, crash config change | `repeatOnLifecycle(STARTED)` |
| `!!` sur nullable | NullPointerException en prod | `?: return`, `let {}`, `requireNotNull()` |
| `var` + `mutableListOf` dans ViewModel | Race condition, état incohérent | `val` + `StateFlow` immuable |
| `LiveData` en nouvelle feature | API obsolète, moins composable | `StateFlow` + `asLiveData()` si legacy |
| `runBlocking` dans coroutine | Deadlock si Dispatchers.Main | `withContext` à la place |
| `flow {}` avec emit depuis thread non-coroutine | Exception `IllegalStateException` | `callbackFlow {}` pour callbacks async |
| `copy()` data class non utilisé | Mutation directe d'état partagé | Toujours créer un nouvel objet |

## Bonnes pratiques 2026

- **Kotlin 2.x** : active le compilateur K2 (`kotlin.experimental.tryK2=true` dans `gradle.properties`). Meilleure inférence de types, smart casts élargis.
- **Context receivers** (stable K2) : prefer `context(CoroutineScope)` pour passer le scope implicitement aux fonctions de repository.
- **`data object`** : utilise `data object` (Kotlin 1.9+) pour les singletons dans sealed classes (`equals`, `toString` corrects).
- **Structured concurrency stricte** : `CoroutineScope` doit toujours être lié à un cycle de vie. Teste avec `UnconfinedTestDispatcher` + `runTest`.
- **Compose Stability** : annote les classes non-Kotlin (`@Stable`, `@Immutable`) pour éviter les recompositions. Utilise le Compose Compiler Report pour auditer.
- **Kotlinx Serialization** : préférer à Moshi/Gson pour les nouveaux projets — natif Kotlin, supporte `sealed`, moins de réflexion.


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
