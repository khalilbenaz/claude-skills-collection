---
name: ocr-document-scanner
description: OCR mobile et extraction de champs depuis CIN, passeport, permis, factures. Se déclenche avec "OCR", "scanner document", "extraire texte", "CIN", "passeport", "MRZ", "ID card", "document verification", "KYC document".
---

# OCR Document Scanner

## Workflow

*   1\. **Prétraitement d'image mobile** — Optimiser l'image capturée avant l'OCR : détection des bords du document (contour finding + perspective transform), correction de perspective (homographie matrix), ajustement automatique de la luminosité et du contraste (CLAHE — Contrast Limited Adaptive Histogram Equalization), détection et correction de la rotation (deskewing via Projection Profile Method), réduction du bruit (Gaussian blur ou bilateral filter), et upscaling si résolution < 72 DPI.

*   2\. **Détection de type de document** — Classifier le type de document avant d'appliquer le modèle OCR : CIN (recto/verso, format biométrique), passeport (page de données, MRZ line), permis de conduire, carte de séjour, RIB, facture, ou contrat. Utiliser un CNN léger (MobileNetV2 quantifié en TFLite pour le mobile) ou des heuristiques visuelles (présence de MRZ line, couleurs dominantes, dimensions). Retourner `document_type` et `confidence`.

*   3\. **Extraction de texte (OCR)** — Extraire le texte avec les moteurs OCR adaptés : Tesseract 5 LSTM (pré-entraîné avec langpacks ar/ara pour l'arabe et fra pour le français, page segmentation mode 3 ou 1 selon la mise en page), Google ML Kit Text Recognition v2 (on-device, supporte arabe/latin, rapide sur mobile), EasyOCR (Python, supporte 80+ langues avec détection de texte en diagonale), ou les OCR cloud (AWS Textract, Azure Form Recognizer) pour les documents complexes. Extraire les bounding boxes (coordonnées x, y, w, h) pour chaque ligne/mot.

*   4\. **Parsing MRZ (Machine Readable Zone)** — Pour passeport, CIN biométrique, carte de séjour : détecter la zone MRZ (les 2-3 lignes en bas du document avec police OCR-A), parser le format TD1 (3 lignes, 30 caractères) ou TD3 (2 lignes, 44 caractères), extraire les champs structurés (type de document, code pays, nom, prénoms, numéro de document, date de naissance, sexe, date d'expiration, numéro personnel), valider le checksum (chiffre de contrôle via algorithme ICAO 9303), et retourner une structure JSON avec `mrz_valid: boolean`.

*   5\. **Extraction de champs structurés** — Pour les champs non-MRZ (cin, passeport, permis) : utiliser regex spécifiques par pays (ex. CIN marocaine : `[A-Z]{2}[0-9]{6}`, numéros CIN, série, lieu de naissance), NER (Named Entity Recognition) pour extraire nom/prénom/adresse/date de naissance dans le texte brut, et des modèles de layout (LayoutLMv2/Donut) pour associer les labels aux zones du document. Gérer les champs multisegments (adresse sur plusieurs lignes, noms composés). Retourner un objet `extracted_fields` avec `confidence` par champ.

*   6\. **Post-processing et validation** — Nettoyer et valider les champs extraits : normaliser les encodages (UTF-8, suppression des diacritiques non nécessaires), standardiser les formats de dates (DD/MM/YYYY), trimmer et dedoubler les espaces, corriger les erreurs OCR typiques (0↔O, 1↔l↔I, 5↔S, 8↔B) via contexte et dictionnaire, valider les checksums (numéro CIN, numéro passeport), et flagger les champs à faible confiance (`confidence < 0.7`) pour review manuelle.

*   7\. **Qualité d'image et UX mobile** — Guider l'utilisateur pour capturer une image exploitable : détection de flou (Laplacian variance < 100 → flou), détection de reflets (zones saturées RGB > 250), vérification que le document occupe > 60% de l'image, détection de la main ou de doigts obstruant le document (segmentation sémantique), et feedback temps réel (cadre de superposition, guide de distance, alerte de mouvement). Si qualité insuffisante, rejeter la capture et inviter à refaire la photo.

*   8\. **Intégration mobile (SDK)** — Fournir les snippets pour intégration dans les apps mobile : Kotlin/Jetpack Compose avec ML Kit et Tesseract (CameraX + preview overlay), React Native avec react-native-vision-camera et react-native-ml-kit, Flutter avec Google ML Kit, ou intégration backend via REST API (image en base64 ou multipart/form-data avec image/jpg). Documenter les tailles max d'image (ex. 5MB), les formats acceptés (JPEG, PNG, WebP), et les limites de débit (rate limiting).

## Règles

*   •  Fournis du code complet dans le langage cible (Kotlin, Python, JS) avec les dépendances exactes (versions Gradle, build.gradle.kts, requirements.txt, package.json).

*   •  Supporte systématiquement le bilingue arabe/français : configure Tesseract avec `--oem 3 --psm 3` et `-l ara+fra` pour les documents marocains, ou le TFLite model de ML Kit v2 qui supporte les scripts arabes nativement.

*   •  Priorise l'on-device : pour les apps mobile fintech/KYC, le traitement doit se faire côté device (ML Kit, Tesseract mobile) pour garantir la confidentialité des données personnelles et éviter la latence réseau.

*   •  Indique les limites de précision par type de document : MRZ ~99%+ (format standardisé), champs imprimés ~95%, champs manuscrits ~70-80% (nécessite liveness ou review manuelle), et documents pliés/déchirés ~60% (nécessite preprocessing avancé).

*   •  Pour les documents marocains spécifiquement : pars le format CIN biométrique (recto : CIN, nom, prénom, date naissance, sexe, lieu naissance, date délivrance ; verso : adresse en arabe/français, profession, autorité délivrance), et le passeport marocain (MRZ TD3 ligne 1 P<MAR, ligne 2 avec numéro de passeport, checksum, date naissance, date expiration, checksum final).
