---
name: gradle-build-expert
description: Expert en configuration et optimisation Gradle pour Android Kotlin. Gère build.gradle, Kotlin DSL, dépendances, flavours, variants, performance, CI/CD et troubleshooting avancé. Se déclenche avec "gradle", "build error", "dépendance", "build config".
---

# Gradle Build Expert (Android Kotlin)

## Workflow

### 1. Lire et auditer la configuration existante

Avant tout changement, cartographier ce qui est en place :

```bash
./gradlew projects          # liste les modules
./gradlew dependencies      # arbre complet des dépendances du module :app
./gradlew :app:dependencies --configuration releaseRuntimeClasspath
./gradlew buildEnvironment  # plugins et leurs versions
```

Points à vérifier : DSL (Groovy vs Kotlin), AGP version, Kotlin version, usage ou non du Version Catalog, présence de `buildSrc` ou `convention plugins`.

---

### 2. Migrer vers Kotlin DSL (si pas encore fait)

Renommer `build.gradle` → `build.gradle.kts`. Changements clés :

```kotlin
// Groovy                          // Kotlin DSL
apply plugin: 'kotlin-android'  →  plugins { id("org.jetbrains.kotlin.android") }
compileSdkVersion 35             →  compileSdk = 35
buildConfigField "String", "A"   →  buildConfigField("String", "A", "\"val\"")
```

Critère de décision : utiliser Kotlin DSL dès qu'il y a plus d'un module ou que l'on veut l'autocomplétion IDE.

---

### 3. Centraliser les versions avec Version Catalog

`gradle/libs.versions.toml` :

```toml
[versions]
agp             = "8.5.2"
kotlin          = "2.0.21"
compose-bom     = "2024.12.01"
hilt            = "2.52"
coroutines      = "1.9.0"

[libraries]
androidx-core-ktx         = { module = "androidx.core:core-ktx",         version = "1.15.0" }
hilt-android              = { module = "com.google.dagger:hilt-android",  version.ref = "hilt" }
hilt-compiler             = { module = "com.google.dagger:hilt-compiler", version.ref = "hilt" }
compose-bom               = { module = "androidx.compose:compose-bom",   version.ref = "compose-bom" }

[plugins]
android-application  = { id = "com.android.application",           version.ref = "agp" }
kotlin-android       = { id = "org.jetbrains.kotlin.android",       version.ref = "kotlin" }
hilt                 = { id = "com.google.dagger.hilt.android",     version.ref = "hilt" }
kotlin-ksp           = { id = "com.google.devtools.ksp",            version.ref = "ksp" }
```

Référencer dans `build.gradle.kts` : `implementation(libs.hilt.android)`, `ksp(libs.hilt.compiler)`.

---

### 4. Structurer les Build Types et Product Flavors

```kotlin
android {
    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable        = true
            isMinifyEnabled     = false
        }
        release {
            isMinifyEnabled   = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    flavorDimensions += "env"
    productFlavors {
        create("dev")  { dimension = "env"; buildConfigField("String", "BASE_URL", "\"https://api.dev.example.com\"") }
        create("prod") { dimension = "env"; buildConfigField("String", "BASE_URL", "\"https://api.example.com\"") }
    }
}
```

Critère : un flavor par axe variable (env, tier, market). Ne pas multiplier les dimensions sans raison.

---

### 5. Optimiser la performance du build

**`gradle.properties` (racine du projet) :**

```properties
org.gradle.jvmargs=-Xmx4g -XX:+UseParallelGC
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configuration-cache=true
kotlin.incremental=true
kotlin.incremental.useClasspathSnapshot=true
android.enableR8.fullMode=true
```

**Cibles de performance (2026) :**

| Type de build | Cible |
|---|---|
| Incremental (1 fichier) | < 5 s |
| Clean build modulaire | < 45 s |
| Clean build mono-module | < 90 s |

Diagnostiquer un build lent :

```bash
./gradlew assembleDebug --profile          # rapport HTML dans build/reports/profile/
./gradlew assembleDebug --scan             # Gradle Build Scan (cloud)
```

---

### 6. Convention Plugins (multi-modules >3 modules)

Remplacer `buildSrc` par des **convention plugins** dans un module `build-logic` :

```
build-logic/
  convention/src/main/kotlin/
    AndroidApplicationConventionPlugin.kt
    AndroidLibraryConventionPlugin.kt
    HiltConventionPlugin.kt
```

Chaque plugin configure les règles communes (compileSdk, Kotlin options, Lint). Les modules `build.gradle.kts` deviennent minimalistes :

```kotlin
plugins {
    id("convention.android.library")
    id("convention.hilt")
}
```

---

### 7. Signatures et release sécurisé

Ne jamais committer un keystore ou des mots de passe. Lire depuis l'environnement :

```kotlin
signingConfigs {
    create("release") {
        storeFile     = file(System.getenv("KEYSTORE_PATH") ?: "debug.jks")
        storePassword = System.getenv("KEYSTORE_PASS") ?: ""
        keyAlias      = System.getenv("KEY_ALIAS")     ?: ""
        keyPassword   = System.getenv("KEY_PASS")      ?: ""
    }
}
```

Versioning automatique depuis git tags :

```kotlin
fun gitVersionCode(): Int = "git rev-list --count HEAD".execute().trim().toInt()
fun gitVersionName(): String = "git describe --tags --always".execute().trim()
```

---

### 8. Intégration CI/CD (GitHub Actions)

```yaml
- name: Build release APK
  run: ./gradlew :app:assembleProdRelease
  env:
    KEYSTORE_PATH: ${{ secrets.KEYSTORE_PATH }}
    KEYSTORE_PASS: ${{ secrets.KEYSTORE_PASS }}
    KEY_ALIAS:     ${{ secrets.KEY_ALIAS }}
    KEY_PASS:      ${{ secrets.KEY_PASS }}

- name: Run unit tests
  run: ./gradlew testProdReleaseUnitTest

- name: Lint
  run: ./gradlew :app:lintProdRelease
```

Utiliser `gradle/actions/setup-gradle@v4` pour activer automatiquement le Build Cache sur CI.

---

### 9. Troubleshooting des erreurs fréquentes

**Conflit de dépendances :**

```bash
./gradlew :app:dependencyInsight --dependency okhttp --configuration releaseRuntimeClasspath
```

Forcer une version :

```kotlin
configurations.all {
    resolutionStrategy.force("com.squareup.okhttp3:okhttp:4.12.0")
}
```

**Erreur R8/ProGuard (class not found en release) :**

Ajouter dans `proguard-rules.pro` :

```
-keep class com.example.model.** { *; }
-keepattributes Signature, InnerClasses
```

Tester le mapping : `build/outputs/mapping/release/mapping.txt`.

**Configuration Cache incompatible :**

```bash
./gradlew assembleDebug --configuration-cache --info 2>&1 | grep "configuration cache"
```

Identifier le plugin incompatible et contacter le maintainer, ou l'exclure via `configurationCacheProblems = ConfigurationCacheProblems.WARN`.

---

## Anti-patterns et pièges

| Anti-pattern | Conséquence | Correctif |
|---|---|---|
| `kapt` sur un projet KSP-ready | Build 2× plus lent | Migrer vers `ksp()` |
| `implementation fileTree(dir: 'libs')` | Non reproducible, shadowing | Déclarer les AAR nommément |
| Versions en dur dans chaque module | Drift de versions | Version Catalog |
| `buildSrc` sur projet >5 modules | Recompilation globale trop fréquente | Convention plugins |
| `resolutionStrategy.failOnVersionConflict()` sans alignment | Build cassé sur BOM | Utiliser `platform()` + BOM |
| `minifyEnabled false` en release | APK non obfusqué, ressources non purgées | Toujours activer R8 en release |
| Stocker le keystore dans le repo | Fuite de clé privée | Variables d'environnement / secrets CI |

## Bonnes pratiques 2026

- **AGP 8.5+ / Gradle 8.10+** : utiliser `declarativeDsl` (expérimental) pour simplifier la configuration.
- **KSP** remplace `kapt` pour tous les nouveaux projets (Hilt 2.48+, Room 2.6+, Moshi 1.15+).
- **Isolated Projects** (Gradle 8.8+) : activer pour paralléliser la configuration et préparer la scalabilité.
- **Baseline Profiles** : générer via `./gradlew generateBaselineProfile` pour améliorer le startup de l'app en production.
- **Dependency Guard** : ajouter `com.dropbox.dependency-guard` pour détecter les changements involontaires de dépendances en CI.
