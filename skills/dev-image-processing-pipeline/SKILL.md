---
name: dev-image-processing-pipeline
description: Pipeline traitement d'image mobile (Kotlin ML Kit, OpenCV, CameraX). Crop, rotation, enhancement, compression, validation qualité, OCR, KYC. Se déclenche avec "traitement image", "image pipeline", "camera", "ML Kit", "OpenCV". Also triggers on "image processing pipeline", "crop and enhance images", "on-device image ML".
---

# Image Processing Pipeline (Mobile Kotlin)

## Choix de bibliothèque — critères de décision

| Besoin | Recommandation | Raison |
|---|---|---|
| Capture + analyse temps réel | CameraX + ML Kit | Optimisé mobile, entretenu par Google |
| Détection bordures / homographie | OpenCV Android | `findContours` + `warpPerspective` non dispo dans ML Kit |
| OCR multi-langues (ar/fr/en) | ML Kit Text Recognition v2 | On-device, pas de quota, faible latence |
| Segmentation / fond | ML Kit Selfie / Subject Segmentation | GPU-accelerated, simple API |
| Opérations matricielles avancées | OpenCV (`fastNlMeansDenoising`, CLAHE) | ML Kit n'expose pas ces primitives |
| Traitement hors ligne (KMP) | Kotlin Multiplatform + CIImage (iOS) | `expect`/`actual` sur `processImage(Bitmap)` |

Règle : ML Kit d'abord, OpenCV en complément pour ce qui dépasse son périmètre.

---

## Workflow en 8 étapes

### 1. Configuration CameraX

```kotlin
val cameraProvider = ProcessCameraProvider.getInstance(context).await()
val preview = Preview.Builder().build()
val imageCapture = ImageCapture.Builder()
    .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
    .setTargetResolution(Size(1920, 1080))
    .build()
val imageAnalysis = ImageAnalysis.Builder()
    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
    .build()

cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageCapture, imageAnalysis)
```

Correction EXIF obligatoire avant tout traitement :
```kotlin
val matrix = Matrix().apply { postRotate(exifOrientation.toFloat()) }
val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
```

### 2. Détection de document / rectification perspective

Avec ML Kit Document Scanner (API 23+) :
```kotlin
val options = GmsDocumentScannerOptions.Builder()
    .setGalleryImportAllowed(false)
    .setResultFormats(RESULT_FORMAT_JPEG, RESULT_FORMAT_PDF)
    .setScannerMode(SCANNER_MODE_FULL)
    .build()
val scanner = GmsDocumentScanning.getClient(options)
scanner.getStartScanIntent(activity).addOnSuccessListener { intentSender ->
    scannerLauncher.launch(IntentSenderRequest.Builder(intentSender).build())
}
```

Fallback OpenCV pour contrôle fin :
```kotlin
val gray = Mat(); Imgproc.cvtColor(src, gray, Imgproc.COLOR_BGR2GRAY)
Imgproc.GaussianBlur(gray, gray, Size(5.0, 5.0), 0.0)
Imgproc.Canny(gray, gray, 75.0, 200.0)
val contours = mutableListOf<MatOfPoint>()
Imgproc.findContours(gray, contours, Mat(), Imgproc.RETR_LIST, Imgproc.CHAIN_APPROX_SIMPLE)
// Trouver le plus grand quadrilatère -> warpPerspective
```

### 3. Enhancement qualité

Ordre d'application recommandé :
1. Débruitage : `Imgproc.fastNlMeansDenoisingColored(src, dst, 10f, 10f, 7, 21)`
2. Sharpening (unsharp mask) :
```kotlin
val blurred = Mat(); Imgproc.GaussianBlur(src, blurred, Size(0.0, 0.0), 3.0)
Core.addWeighted(src, 1.5, blurred, -0.5, 0.0, dst)
```
3. Contraste adaptatif (CLAHE) :
```kotlin
val clahe = Imgproc.createCLAHE(2.0, Size(8.0, 8.0))
clahe.apply(grayChannel, grayChannel)
```
4. Binarisation adaptative (pour OCR) :
```kotlin
Imgproc.adaptiveThreshold(gray, binary, 255.0,
    Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY, 11, 2.0)
```

### 4. Validation qualité — scores et seuils

```kotlin
data class QualityScore(
    val blur: Double,       // Laplacian variance — seuil min : 100
    val brightness: Double, // Histogram mean    — plage : 80–180
    val coverage: Double,   // % frame couvert   — seuil min : 0.80
    val glare: Boolean      // Pics saturation S > 200
)

// Extension utilitaire OpenCV — à définir une fois dans le projet
fun Bitmap.toMat(): Mat = Mat().also { org.opencv.android.Utils.bitmapToMat(this, it) }

fun computeBlur(bmp: Bitmap): Double {
    val mat = bmp.toMat()
    val laplacian = Mat()
    Imgproc.Laplacian(mat, laplacian, CvType.CV_64F)
    val stdDev = MatOfDouble(); Core.meanStdDev(laplacian, MatOfDouble(), stdDev)
    return stdDev.get(0, 0)[0].pow(2)
}
```

Feedback utilisateur clair à chaque rejet :
- blur < 100 → "Image floue, rapprochez-vous"
- brightness hors plage → "Trop sombre / surexposé"
- coverage < 80 % → "Cadrez mieux le document"

### 5. Compression et format

```kotlin
fun compressImage(bitmap: Bitmap, maxSizeKb: Int = 800): ByteArray {
    var quality = 90
    var bytes: ByteArray
    do {
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, quality, out)
        bytes = out.toByteArray()
        quality -= 5
    } while (bytes.size / 1024 > maxSizeKb && quality > 50)
    return bytes
}
```

- **Documents légaux** → `WEBP_LOSSLESS` ou JPEG 95 %
- **Aperçus UI** → `WEBP_LOSSY` 75 %, max 1 MP
- **Résolution** : réduire à 2 MP max avant OCR (ML Kit ne gagne rien au-delà)

### 6. Pipeline OCR + extraction champs

```kotlin
val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
val inputImage = InputImage.fromBitmap(enhancedBitmap, 0)
recognizer.process(inputImage)
    .addOnSuccessListener { visionText ->
        val cin = Regex("""[A-Z]\d{7}""").find(visionText.text)?.value
        val rib = Regex("""\d{20}""").find(visionText.text)?.value
        // Luhn check sur carte, MRZ parser pour passeport
    }
```

Dépendance ML Kit Text Recognition (modèle latin bundled, OCR 100 % on-device) :
```groovy
// app/build.gradle — bloc dependencies
implementation 'com.google.mlkit:text-recognition:16.0.1'
// Autres écritures via artefacts dédiés : text-recognition-chinese,
// -devanagari, -japanese, -korean (un par script à reconnaître).
```

### 7. Stockage temporaire sécurisé

```kotlin
// Fichier chiffré via EncryptedFile (Jetpack Security)
val encryptedFile = EncryptedFile.Builder(
    context, File(context.cacheDir, "img_${uuid}.tmp"),
    MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
    EncryptedFile.FileEncryptionScheme.AES256_GCM_HASHED_FILENAME
).build()
encryptedFile.openFileOutput().use { it.write(imageBytes) }

// Purge automatique via WorkManager après upload ou 24 h
```

### 8. Performance et gestion mémoire

```kotlin
// Processing asynchrone — toujours sur IO
viewModelScope.launch(Dispatchers.IO) {
    val result = processImage(bitmap)   // timeout : 5 s max
    withContext(Dispatchers.Main) { updateUI(result) }
}

// Libérer les Mat OpenCV explicitement
val mat = bitmap.toMat()
try { /* traitement */ } finally { mat.release() }

// Coil avec contrainte mémoire pour affichage
imageView.load(uri) { size(800, 600); allowHardware(false) }
```

---

## Garde-fous / Anti-patterns / Pièges

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Traiter le Bitmap sur le thread principal | ANR / freeze UI | `Dispatchers.IO` obligatoire |
| Ne pas appeler `mat.release()` | OOM natif non détecté par GC Java | Bloc `try/finally` systématique |
| Stocker images brutes non chiffrées dans le cache | Fuite données KYC | `EncryptedFile` + purge auto |
| Enhancement avant rectification perspective | Artefacts sur bords déformés | Toujours rectifier **avant** d'améliorer |
| Résolution 4K+ passée à ML Kit OCR | Lenteur sans gain qualité | Redimensionner à ≤ 2 MP avant OCR |
| Fallback silencieux en cas de qualité insuffisante | Données OCR corrompues | Rejet explicite + message utilisateur |
| Initialiser ML Kit dans le constructeur du ViewModel | Crash si contexte indisponible | Injection lazy ou Factory |

---

## Bonnes pratiques 2026

- **ML Kit Text Recognition v2** : scripts pris en charge = latin, chinois, devanagari, japonais, coréen (un artefact bundled par script). L'arabe n'est PAS supporté nativement — pour de l'OCR arabe, prévoir Tesseract (tessdata `ara`) ou un service cloud.
- **CameraX 1.4+** : utiliser `ZoomState` et `TapToFocus` via `CameraControl` plutôt que manipuler manuellement la mise au point.
- **Kotlin Multiplatform** : factoriser `processImage(ImageData) -> ProcessedResult` dans `:shared` ; `CameraX` (Android) et `AVFoundation` (iOS) restent dans les modules platform via `expect`/`actual`.
- **Privacy by design** : traitement 100 % on-device quand possible, pas de transfert d'image brute vers serveur, auto-delete après upload confirmé.
- **Profiling** : utiliser Android Studio Profiler (Memory + CPU) sur un appareil physique mid-range (≤ 3 Go RAM) — les émulateurs masquent les fuites de mémoire native OpenCV.


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
