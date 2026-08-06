---
name: android-kotlin-advisor
description: Développement Android natif avec Kotlin et Jetpack Compose — architecture MVVM/MVI, UI Compose, Hilt, Room, Coroutines, Flow, tests, Gradle KTS, Play Store. Se déclenche avec "Android", "Kotlin", "Jetpack Compose", "Android Studio", "Gradle", "Room", "Hilt", "Coroutines", "Play Store". Also triggers on "Android with Kotlin", "MVVM on Android".
---

# Android Kotlin Advisor

## 1. Choix d'architecture

| Contexte | Pattern recommandé |
|---|---|
| App simple, 1–3 écrans | MVVM + Repository (StateFlow) |
| App Compose multi-écrans | MVI (état immuable, `sealed class UiState`) |
| Large équipe / multi-feature | Clean Architecture + multi-module Gradle |

Structure recommandée multi-module :
```
app/
feature/home/
feature/profile/
core/data/
core/domain/
core/ui/
build-logic/               ← convention plugins partagés
```

## 2. UI avec Jetpack Compose

Toujours préférer les composables **stateless** (state hoisting) :

```kotlin
// BON : state hissé, composable testable et réutilisable
@Composable
fun LoginForm(
    state: LoginUiState,
    onEmailChange: (String) -> Unit,
    onSubmit: () -> Unit,
) { ... }

// MAUVAIS : état caché dans le composable, non testable
@Composable
fun LoginForm() {
    var email by remember { mutableStateOf("") }
    ...
}
```

Checklist Compose :
- Material 3 BOM : `implementation(platform("androidx.compose:compose-bom:2025.05.00"))`
- Dynamic Color (Android 12+) : `dynamicLightColorScheme(context)`
- Navigation : `NavHost` + `NavController`, arguments typés via `NavType`
- Éviter `LocalContext.current` profondément imbriqué → passer en paramètre

## 3. State management

```kotlin
// ViewModel pattern recommandé
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: PostRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init { loadPosts() }

    private fun loadPosts() = viewModelScope.launch {
        repo.getPosts()
            .catch { _uiState.value = HomeUiState.Error(it.message) }
            .collect { _uiState.value = HomeUiState.Success(it) }
    }
}

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(val posts: List<Post>) : HomeUiState()
    data class Error(val msg: String?) : HomeUiState()
}
```

Collecte lifecycle-aware dans un composable :
```kotlin
val state by viewModel.uiState.collectAsStateWithLifecycle()
```

## 4. Injection de dépendances

**Hilt** (recommandé pour projets standard Google) :
```kotlin
// App
@HiltAndroidApp class App : Application()

// Fragment/Activity
@AndroidEntryPoint class HomeFragment : Fragment()

// Module
@Module @InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideRetrofit(): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.BASE_URL)
        .build()
}
```

**Koin** (léger, sans génération de code) :
```kotlin
val appModule = module {
    singleOf(::UserRepository)
    viewModelOf(::HomeViewModel)
}
// App: startKoin { modules(appModule) }
```

Critère de choix : Hilt si AGP 8+, équipe > 3, besoin de validation compile-time. Koin si prototype, équipe Dagger-phobe, ou KMP envisagé.

## 5. Couche Data

**Room** (ORM local) :
```kotlin
@Entity data class Post(@PrimaryKey val id: Int, val title: String)

@Dao interface PostDao {
    @Query("SELECT * FROM post") fun getAll(): Flow<List<Post>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insert(post: Post)
}

@Database(entities = [Post::class], version = 2)
abstract class AppDatabase : RoomDatabase() {
    abstract fun postDao(): PostDao
    // migration : addMigrations(MIGRATION_1_2)
}
```

**Retrofit + kotlinx.serialization** :
```kotlin
@Serializable data class PostDto(val id: Int, val title: String)

interface PostApi {
    @GET("posts") suspend fun getPosts(): List<PostDto>
}
// OkHttp : ajouter HttpLoggingInterceptor en DEBUG seulement
```

**DataStore** (remplace SharedPreferences) :
```kotlin
val Context.dataStore by preferencesDataStore("settings")
val DARK_MODE = booleanPreferencesKey("dark_mode")
// write: dataStore.edit { it[DARK_MODE] = true }
// read:  dataStore.data.map { it[DARK_MODE] ?: false }
```

## 6. Concurrence — Coroutines & Flow

```kotlin
// NE PAS utiliser GlobalScope
// NE PAS bloquer avec runBlocking dans le code de prod

// Dispatchers : IO pour réseau/disk, Default pour CPU, Main pour UI
viewModelScope.launch(Dispatchers.IO) {
    val result = api.getPosts()      // suspend fun
    withContext(Dispatchers.Main) { /* màj UI */ }
}

// Canal one-shot (navigation, snackbar)
private val _events = Channel<UiEvent>(Channel.BUFFERED)
val events = _events.receiveAsFlow()
// emit: _events.send(UiEvent.NavigateToDetail(id))
```

## 7. Tests

```kotlin
// Unit test ViewModel avec Turbine + MockK
@Test fun `loading posts emits Success state`() = runTest {
    val repo = mockk<PostRepository>()
    every { repo.getPosts() } returns flowOf(listOf(Post(1, "titre")))
    val vm = HomeViewModel(repo)
    vm.uiState.test {
        assertEquals(HomeUiState.Loading, awaitItem())
        assertTrue(awaitItem() is HomeUiState.Success)
        cancelAndIgnoreRemainingEvents()
    }
}

// Compose UI test
@get:Rule val composeRule = createComposeRule()

@Test fun `login button is disabled when email is empty`() {
    composeRule.setContent { LoginForm(state = LoginUiState(), ...) }
    composeRule.onNodeWithTag("btn_submit").assertIsNotEnabled()
}
```

Dépendances test :
```kotlin
testImplementation("io.mockk:mockk:1.13.x")
testImplementation("app.cash.turbine:turbine:1.x")
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.x")
androidTestImplementation("androidx.compose.ui:ui-test-junit4")
```

## 8. Gradle KTS & build

Convention plugin partagé (`build-logic/`) :
```kotlin
// build-logic/src/.../AndroidFeatureConventionPlugin.kt
class AndroidFeatureConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply("com.android.library")
        pluginManager.apply("org.jetbrains.kotlin.android")
        extensions.configure<LibraryExtension> {
            compileSdk = 35
            defaultConfig.minSdk = 24
        }
    }
}
```

Signature en CI (ne jamais committer le keystore) :
```bash
# Variables CI : KEY_ALIAS, KEY_PASSWORD, STORE_PASSWORD, KEYSTORE_BASE64
echo "$KEYSTORE_BASE64" | base64 -d > release.jks
```

## Garde-fous / Anti-patterns

| Anti-pattern | Correctif |
|---|---|
| Context dans un Singleton/ViewModel | Utiliser `applicationContext` ou injecter via Hilt `@ApplicationContext` |
| Recomposition excessive | Wrapper lambda en `remember { {} }`, utiliser `derivedStateOf` pour les calculs coûteux |
| `runBlocking` en prod | Toujours `launch` ou `async` dans un scope approprié |
| Mutation d'état UI depuis le thread IO | Toujours `withContext(Dispatchers.Main)` ou `StateFlow` |
| SharedPreferences dans code Compose | Migrer vers DataStore |
| Hardcoder les URLs / clés API | `BuildConfig` + variables CI / secrets manager |
| Ignorer les migrations Room | Toujours définir `Migration(oldV, newV)`, ne jamais utiliser `fallbackToDestructiveMigration()` en prod |
| Fragment backstack manuel en Compose | Déléguer entièrement à `navigation-compose` |

## Versions de référence (2026)

- Kotlin : **2.0.x**
- AGP : **8.5.x**
- Compose BOM : **2025.05.00**
- `compileSdk` / `targetSdk` : **35**
- `minSdk` recommandé : **24** (Android 7.0, ~97 % devices)
- Lifecycle / ViewModel : **2.8.x**
- Hilt : **2.51.x**
- Room : **2.7.x**
- Coroutines : **1.8.x**
