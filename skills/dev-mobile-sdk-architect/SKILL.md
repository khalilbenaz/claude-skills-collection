---
name: dev-mobile-sdk-architect
description: Architecture d'un SDK mobile fintech en Kotlin Multiplatform — découpage en modules, API publique, couches, design patterns, sécurité et taille du binaire. Se déclenche avec "architecture SDK", "SDK mobile", "multiplatform", "KMP", "SDK fintech", "API publique du SDK", "module KMP". Also triggers on "mobile SDK design", "Kotlin Multiplatform SDK", "public API for an SDK".
---

# Mobile SDK Architect (Fintech Kotlin)

## Workflow en étapes

### 1. Analyse des besoins et périmètre

- Identifier les cas d'usage : KYC, onboarding, paiements P2P, notifications push, réconciliation offline.
- Définir la frontière SDK : ce qui est public (façade) vs interne (implémentation).
- Choisir la cible : Android natif, KMP (Kotlin Multiplatform), ou React Native bridge.

**Critère de décision — KMP vs natif vs bridge :**

| Contexte | Choix |
|---|---|
| Équipe Kotlin existante, logique métier à partager | KMP (shared `commonMain`) |
| App mobile unique, Android only | Module Gradle natif |
| App Flutter/RN existante | Bridge natif (FFI ou JNI/Obj-C) |
| Time-to-market prioritaire | React Native SDK |

---

### 2. Structure modulaire Gradle / KMP

```
sdk/
├── core/            # entités, use cases, interfaces (pas d'Android)
├── network/         # Retrofit/Ktor, Serialization
├── storage/         # Room / SQLDelight (KMP)
├── auth/            # OAuth2, JWT, token refresh
├── payments/        # logique paiement, state machine
└── sample-app/      # démo intégration
```

Déclaration multiplatform (`build.gradle.kts`) :

```kotlin
kotlin {
    androidTarget()
    iosX64(); iosArm64(); iosSimulatorArm64()

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-core:2.3.12")
                implementation("app.cash.sqldelight:runtime:2.0.2")
            }
        }
        val androidMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-okhttp:2.3.12")
            }
        }
        val iosMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-darwin:2.3.12")
            }
        }
    }
}
```

---

### 3. API publique — design et rétrocompatibilité

- Exposer uniquement via une **façade** (`internal` pour tout le reste).
- Appliquer **semver strict** : MAJOR = breaking, MINOR = ajout, PATCH = fix.
- Marquer les deprecations avec `@Deprecated(level = DeprecationLevel.WARNING)` avant retrait.

```kotlin
// facade publique
class FintechSDK private constructor(private val config: SDKConfig) {
    companion object {
        fun init(config: SDKConfig): FintechSDK = FintechSDK(config)
    }
    val payments: PaymentsApi get() = PaymentsApiImpl(...)
    val kyc: KycApi get() = KycApiImpl(...)
}

// jamais exposer :
internal class PaymentsApiImpl(...) : PaymentsApi { ... }
```

- Versionner les endpoints : `/api/v2/payments`, jamais supprimer v1 sans migration guide.
- Feature flags via `SDKConfig` pour activer/désactiver modules sans rebuild.

---

### 4. Sécurité et conformité (fintech 2026)

- **TLS 1.3 obligatoire** + certificate pinning (OkHttp `CertificatePinner`).
- **Android Keystore** pour clés AES-256-GCM ; **iOS Keychain** côté Swift.
- **Token refresh** : rotation JWT avec sliding window, révocation côté serveur.
- **RGPD / CNDP Maroc** : anonymisation PII dans les logs, droit à l'effacement via API dédiée.

```kotlin
// Certificate pinning OkHttp
val client = OkHttpClient.Builder()
    .certificatePinner(
        CertificatePinner.Builder()
            .add("api.myfintech.com", "sha256/AAAA...==")
            .build()
    )
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .build()
```

- Ne jamais logger de données sensibles (PAN, IBAN, token) — utiliser un `SensitiveDataFilter` sur le logger.
- Root/jailbreak detection (SafetyNet/Play Integrity API 2026 ; `DCAppAttestService` iOS).

---

### 5. Error handling standardisé

Sealed class pour erreurs métier, jamais de `try/catch` silencieux :

```kotlin
sealed class SdkResult<out T> {
    data class Success<T>(val data: T) : SdkResult<T>()
    sealed class Failure : SdkResult<Nothing>() {
        data class Network(val code: Int, val msg: String) : Failure()
        data class Business(val errorCode: String, val msg: String) : Failure()
        data class Unexpected(val cause: Throwable) : Failure()
    }
}

// codes métier exhaustifs
object ErrorCodes {
    const val KYC_FAILED       = "ERR_KYC_001"
    const val AUTH_EXPIRED     = "ERR_AUTH_002"
    const val INSUFFICIENT_BALANCE = "ERR_PAY_003"
}
```

---

### 6. Performance mobile

- **Offline-first** : Room / SQLDelight comme source de vérité locale ; sync via WorkManager.
- **Pagination cursor-based** (`after=<id>`) — jamais offset sur grandes collections.
- **Cache HTTP** : OkHttp Cache 10 MB pour endpoints stables ; `Cache-Control: max-age` côté serveur.
- **Lazy init** des modules lourds (ex. : caméra KYC) — ne pas tout charger au `SDK.init()`.

```kotlin
// WorkManager sync périodique
val syncRequest = PeriodicWorkRequestBuilder<TransactionSyncWorker>(
    repeatInterval = 15, TimeUnit.MINUTES
).setConstraints(
    Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
).build()
WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "tx_sync", ExistingPeriodicWorkPolicy.KEEP, syncRequest
)
```

---

### 7. Testing

| Couche | Outil | Cible |
|---|---|---|
| Domain (use cases, entities) | JUnit5 + MockK | > 90 % |
| Data (Retrofit, Room) | Hilt test + Robolectric | > 75 % |
| UI / Compose | Compose Testing + Espresso | smoke tests |
| Contrat API | WireMock / MockWebServer | régression |
| Performance | Android Profiler + Benchmark | baseline |

```kotlin
// MockK use case test
@Test
fun `transfer fails on insufficient balance`() = runTest {
    coEvery { repository.getBalance(any()) } returns 10.0
    val result = transferUseCase(TransferRequest(amount = 500.0, ...))
    assertIs<SdkResult.Failure.Business>(result)
    assertEquals(ErrorCodes.INSUFFICIENT_BALANCE, result.errorCode)
}
```

---

### 8. Documentation et publication

- **KDoc** sur tout symbole public ; générer la référence via `./gradlew dokkaHtml`.
- README avec quickstart en < 10 lignes (copier-coller prêt).
- Sample app dans `sample-app/` couvrant les 3 flux principaux.
- Publier sur Maven Central ou dépôt privé (Nexus/GitHub Packages) :

```kotlin
// publishing block (build.gradle.kts)
publishing {
    publications {
        create<MavenPublication>("release") {
            groupId = "com.mycompany"
            artifactId = "fintech-sdk"
            version = "2.1.0"
            from(components["release"])
        }
    }
}
```

---

## Garde-fous / Anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Exposer des classes internes dans l'API publique | Breaking changes incontrôlés | `internal` + façade |
| Crasher au lieu de retourner une erreur métier | App cliente plante | `SdkResult.Failure` systématique |
| Bloquer le main thread (réseau, DB) | ANR | Coroutines + `Dispatchers.IO` |
| Stocker tokens en SharedPreferences non chiffrées | Vol de session | `EncryptedSharedPreferences` / Keystore |
| Pagination offset sur > 10 000 lignes | Timeouts, duplicats | Cursor-based (`after=<id>`) |
| Logger PAN/IBAN en clair | Non-conformité PCI-DSS | `SensitiveDataFilter` obligatoire |
| Init SDK bloquant au démarrage | Temps de lancement > 500 ms | Lazy init + coroutine scope |
| Semver ignoré (breaking en MINOR) | Intégrations cassées en prod | Revue API diff avant release |

---

## Bonnes pratiques 2026

- **Play Integrity API** remplace SafetyNet depuis 2024 — migrer si pas fait.
- **Predictive Back Gesture** Android 15+ : tester les transitions SDK dans le back stack.
- **KMP stable** (Kotlin 2.x) : privilégier `commonMain` pour la logique métier, éviter les `expect/actual` inutiles.
- **Kotlin Coroutines Structured Concurrency** : toujours lier les coroutines à un `CoroutineScope` géré par le cycle de vie ; jamais `GlobalScope`.
- **Ktor 3.x** : multiplatform natif, remplace OkHttp côté KMP shared layer.
- **SQLDelight 2.x** : préférer à Room pour KMP, schéma vérifié à la compilation.


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
