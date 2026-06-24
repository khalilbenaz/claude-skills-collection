---
name: ocr-document-scanner
description: OCR mobile et extraction de champs depuis CIN, passeport, permis, factures. Se déclenche avec "OCR", "scanner document", "extraire texte", "CIN", "passeport", "MRZ", "ID card", "document verification", "KYC document".
---

# OCR Document Scanner

## Workflow en 8 étapes

### 1. Prétraitement d'image

Corriger l'image AVANT d'envoyer à l'OCR — c'est l'étape qui impacte le plus la précision.

```python
import cv2
import numpy as np

def preprocess_document(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # CLAHE pour le contraste adaptatif
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    # Débruitage
    denoised = cv2.fastNlMeansDenoising(enhanced, h=10)
    # Binarisation Otsu
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary
```

Critères qualité à vérifier **avant** OCR :
- Variance Laplacien ≥ 100 (sinon flou → rejeter)
- Document occupe ≥ 60 % de l'image
- Aucune zone RGB > 250 (reflet)
- Rotation ≤ 5° (sinon deskew via Projection Profile Method)

Si l'image ne passe pas les critères → demander une nouvelle capture avec feedback précis ("document trop petit", "image floue", "reflet détecté").

---

### 2. Détection du type de document

Classifier avant d'appliquer les regex/modèles spécialisés.

**Heuristiques rapides (sans ML)** :
| Signal | Document probable |
|---|---|
| 2 lignes OCR-A en bas | Passeport (TD3) ou CIN biométrique |
| 3 lignes OCR-A 30 chars | Titre de voyage TD1 |
| Champ IBAN / RIB | Relevé bancaire |
| QR code + montant | Facture |

**Avec ML Kit (on-device)** : utiliser un MobileNetV2 TFLite quantifié INT8 pour ≤ 15 ms d'inférence. Retourner `{ "document_type": "CIN_MA_RECTO", "confidence": 0.94 }`.

---

### 3. Extraction OCR — choix du moteur

| Moteur | Cas d'usage | Précision | Déploiement |
|---|---|---|---|
| **Google ML Kit v2** | Mobile Kotlin/Flutter, arabe+latin | ~96 % | On-device |
| **Tesseract 5 LSTM** | Backend Python, arabe+français | ~92 % | Serveur / Edge |
| **EasyOCR** | Python, texte incliné/diagonal | ~90 % | Backend |
| **AWS Textract** | Documents complexes, tableaux | ~98 % | Cloud |
| **Azure Form Recognizer** | Formulaires structurés avec labels | ~97 % | Cloud |

**Tesseract — configuration minimale pour documents marocains** :
```bash
tesseract image.png output --oem 3 --psm 3 -l ara+fra \
  --dpi 300 -c preserve_interword_spaces=1
```

**ML Kit (Kotlin)** :
```kotlin
val recognizer = TextRecognition.getClient(
    TextRecognizerOptions.Builder()
        .setExecutor(Dispatchers.Default.asExecutor())
        .build()
)
val result = recognizer.process(InputImage.fromBitmap(bitmap, 0)).await()
result.textBlocks.forEach { block ->
    val text = block.text
    val boundingBox = block.boundingBox
}
```

---

### 4. Parsing MRZ (Machine Readable Zone)

Formats ICAO 9303 à connaître :
- **TD3** : 2 lignes × 44 chars → passeport marocain (`P<MAR...`)
- **TD1** : 3 lignes × 30 chars → CIN biométrique marocaine
- Checksum : algorithme pondéré 7-3-1 sur chaque champ critique

```python
# Lib recommandée : passporteye ou mrz-python
from mrz.checker.td3 import TD3CodeChecker

checker = TD3CodeChecker("P<MARBENBRAHIM<<KHALIL<<<<<<<<<<<<<<<<<<<<<\nAB1234567MAR9001011M3012315<<<<<<<<<<<<<<02")
if checker.valid():
    fields = checker.fields()
    print(fields.surname, fields.name, fields.date_of_birth)
```

**Pièges MRZ** :
- OCR-A mal reconnu : `0` vs `O`, `1` vs `I` → normaliser avant parse
- Ligne MRZ souvent en bas du document : crop la zone `y > 80%` avant OCR MRZ
- Checksum invalide → ne jamais valider le document, demander retry

---

### 5. Extraction de champs structurés

**Regex par document marocain** :
```python
import re

# CIN marocaine
CIN_PATTERN = re.compile(r'\b([A-Z]{1,2}[0-9]{5,6})\b')

# Numéro passeport marocain
PASSPORT_PATTERN = re.compile(r'\b([A-Z]{2}[0-9]{7})\b')

# Date format DD/MM/YYYY ou DD-MM-YYYY
DATE_PATTERN = re.compile(r'\b(\d{2})[/-](\d{2})[/-](\d{4})\b')

# CIN recto — extraction NER via spaCy (fr_core_news_md)
import spacy
nlp = spacy.load("fr_core_news_md")
doc = nlp(raw_text)
names = [ent.text for ent in doc.ents if ent.label_ == "PER"]
```

Pour les champs structurés complexes (LayoutLM) :
- **Donut** (Microsoft) : modèle end-to-end sans OCR séparé, efficace sur documents uniformes
- **LayoutLMv3** : requiert paires texte + coordonnées bounding box en entrée

---

### 6. Post-processing et validation

```python
def clean_ocr_field(value: str, field_type: str) -> dict:
    value = value.strip().upper()
    # Corrections OCR typiques
    ocr_fixes = {"0": "O", "1": "I", "5": "S", "8": "B"}
    if field_type in ("NAME", "SURNAME"):
        for wrong, right in ocr_fixes.items():
            value = value.replace(wrong, right)
    # Dates → format ISO
    if field_type == "DATE":
        match = re.match(r'(\d{2})[/-](\d{2})[/-](\d{4})', value)
        if match:
            value = f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
    confidence = compute_field_confidence(value, field_type)
    return {"value": value, "confidence": confidence, "needs_review": confidence < 0.7}
```

Seuils de confiance recommandés :
- MRZ : `< 0.99` → retry obligatoire
- Champs imprimés : `< 0.80` → marquer pour review
- Champs manuscrits : `< 0.65` → rejeter, saisie manuelle

---

### 7. Feedback UX mobile en temps réel

Implémenter un **live preview overlay** dans CameraX (Kotlin) :
```kotlin
val imageAnalysis = ImageAnalysis.Builder()
    .setTargetResolution(Size(1280, 720))
    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
    .build()

imageAnalysis.setAnalyzer(executor) { imageProxy ->
    val laplacianVariance = computeBlurScore(imageProxy.toBitmap())
    runOnUiThread {
        when {
            laplacianVariance < 100 -> showOverlay("Image floue — stabilisez l'appareil", RED)
            documentCoverage < 0.60 -> showOverlay("Rapprochez l'appareil du document", YELLOW)
            else -> showOverlay("Capture prête", GREEN)
        }
    }
    imageProxy.close()
}
```

---

### 8. Intégration API backend

Format d'entrée recommandé (REST) :
```http
POST /api/v1/ocr/scan
Content-Type: multipart/form-data

image: <fichier JPEG/PNG/WebP, max 5 MB>
document_type: CIN_MA | PASSPORT_MA | DRIVING_LICENSE | INVOICE | AUTO
```

Format de sortie :
```json
{
  "document_type": "CIN_MA_RECTO",
  "mrz_valid": true,
  "extracted_fields": {
    "cin_number": { "value": "AB123456", "confidence": 0.98 },
    "surname": { "value": "BENBRAHIM", "confidence": 0.95 },
    "date_of_birth": { "value": "1990-01-01", "confidence": 0.92, "needs_review": false }
  },
  "processing_ms": 340,
  "image_quality": { "blur_score": 210, "coverage": 0.73 }
}
```

---

## Garde-fous et anti-patterns

**Ne jamais faire** :
- Envoyer l'image brute à Tesseract sans prétraitement → précision -20 à -30 %
- Ignorer le checksum MRZ → faux positifs en KYC
- Utiliser `--psm 6` (bloc uniforme) sur des documents bilingues arabe/français → segmentation cassée
- Stocker les images de documents en clair côté serveur → violation RGPD / loi 09-08 (Maroc)
- Valider un document uniquement sur la confiance OCR sans vérification de checksum

**Pièges fréquents** :
- CIN marocaines anciennes (format `I<chiffres>`) : regex `[A-Z]{2}[0-9]{6}` ne match pas → ajouter pattern legacy `[A-Z][0-9]{7}`
- Arabe RTL avec Tesseract : ajouter `--psm 6` ET charger `ara.traineddata` depuis tessdata_best, pas tessdata_fast
- Images HEIC (iPhone) : convertir en JPEG avant envoi, ML Kit ne supporte pas HEIC directement
- ML Kit v2 sur Android < API 23 : non supporté → fallback Tesseract

**Limites de précision par type** :
| Document | MRZ | Imprimé | Manuscrit |
|---|---|---|---|
| Passeport | ~99.5 % | ~97 % | N/A |
| CIN biométrique | ~99 % | ~95 % | ~75 % |
| Permis de conduire | N/A | ~93 % | ~70 % |
| Facture | N/A | ~95 % | ~65 % |

---

## Bonnes pratiques 2026

- **On-device first** : ML Kit v3 (2025) supporte 100+ scripts ; préférer au cloud pour KYC afin de respecter la confidentialité
- **Donut vs Tesseract** : pour les formulaires avec layout fixe (CIN, passeport), Donut donne de meilleurs résultats sans étape OCR séparée
- **Liveness check couplé** : coupler l'OCR document avec une vérification de vivacité (liveness) pour les flux KYC — ne pas traiter l'OCR seul comme preuve d'identité
- **Versioning des modèles** : toujours versionner les modèles TFLite embarqués et prévoir un mécanisme de mise à jour OTA (Firebase Remote Config ou équivalent)
- **Rate limiting** : appliquer un rate limit par userId côté backend (ex. 10 scans/min) pour éviter les abus et les coûts cloud OCR
- **Audit trail** : loguer les tentatives OCR (sans stocker l'image) avec hash SHA-256 de l'image et le résultat de validation pour audit KYC
