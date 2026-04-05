---
name: dev-image-processing-pipeline
description: Pipeline traitement d'image mobile (Kotlin ML Kit, OpenCV, CameraX). Crop, rotation, enhancement, compression, validation qualité. Se déclenche avec "traitement image", "image pipeline", "camera", "ML Kit", "OpenCV".
---

# Image Processing Pipeline (Mobile Kotlin)

## Workflow

* 1\. **Capture et prétraitement** -- Configurer CameraX (Preview + ImageCapture + ImageAnalysis) pour pipeline temps réel. Appliquer détection de bordure automatique (ML Kit Selfie Segmentation). Gestion orientation EXIF, rotation auto.
* 2\. **Détection de document/bordures** -- Utiliser ML Kit Document Scanner ou OpenCV (findContours, minAreaRect) pour détection automatique bordures document. Perspective transform (getPerspectiveTransform + warpPerspective) pour rectification.
* 3\. **Enhancement qualité image** -- Pipeline : noise reduction (OpenCV fastNlMeansDenoisingColored), sharpening (unsharp mask), contrast enhancement (CLAHE adaptive histogram), color correction (white balance auto). Binarisation adaptative pour OCR.
* 4\. **Compression et format** -- Compression JPEG intelligente : qualité dynamique selon taille (70-90%), WebP pour Android pour meilleur ratio taille/qualité. Réduire résolution si >4MP pour performance. Compression lossless pour documents légaux.
* 5\. **Validation qualité automatique** -- Scores qualité : blur detection (Laplacian variance >100), brightness (histogram mean 80-180), glare detection (saturation peaks), document coverage (>80% frame). Rejection automatique avec feedback utilisateur.
* 6\. **Intégration OCR et ML** -- Pipeline synchronisé : capture -> enhance -> OCR (ML Kit Text Recognition ar/fr/en) -> extract fields (regex patterns CIN, passeport, rib) -> validate format (Luhn, IBAN, MRZ). Feedback temps réel.
* 7\. **Cache et storage** -- Temp storage avec LifecycleAware storage, cleanup automatique. Encryption des images temporaires (Android Keystore). Purge après upload confirmé. Fallback offline avec Room cache metadata.
* 8\. **Performance optimisation** -- Coroutines pour processing asynchrone (Dispatchers.IO), batch processing, image tiling pour grandes images. Memory management : recycle Bitmaps, utiliser Glide/Coil avec size constraints. Profiling avec Android Profiler.

## Règles

* **Privacy by design** : Jamais stocker images brutes sur serveur. Traitement on-device quand possible. Auto-delete après 24h ou upload confirmé. Chiffrement AES-256 pour images en transit.
* **Quality gates** : Minimum 300 DPI équivalent, pas de blur, luminosité suffisante. Rejeter automatiquement avec message utilisateur clair ("Image floue, recommencez"). Pas de fallback silencieux.
* **ML Kit first** : Préférer ML Kit de Google (optimisé mobile, TFLite, support ar/fr) avant OpenCV. Utiliser CameraX ML Vision pour processing temps réel. Fallback OpenCV pour opérations avancées.
* **Async processing** : Toutes opérations IO sur Dispatchers.IO, UI update sur Main. Timeout max 5s par étape. Cancelable avec Job lifecycle. UI feedback progress (ProgressBar, Skeleton).
* **Cross-platform** : Kotlin Multiplatform avec shared processing logic. Expect/actual pour CameraX (Android) vs AVFoundation (iOS). Un API : processImage(Bitmap) -> Result<Image, Error>.


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
