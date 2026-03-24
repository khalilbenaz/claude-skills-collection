---
name: face-matching-kyc
description: Vérification biométrique d'identité : face matching selfie vs document, liveness detection, deepfake detection. Se déclenche avec "face matching", "vérification identité", "KYC biométrique", "selfie vs document", "liveness", "deepfake", "biometrie", "one-to-one matching".
---

# Face Matching KYC

## Workflow

*   1\. **Détection de visage et alignement** — Détecter les visages dans les deux images (selfie et photo document) avec MTCNN (Multi-task Cascaded CNN, précise et rapide pour mobile), RetinaFace (SOTA pour détection robuste en conditions difficiles : faible luminosité, angle oblique), ou MediaPipe Face Mesh (468 points faciaux, très rapide sur mobile). Aligner les visages via 5 points de repères (yeux gauche/droite, nez, coins bouche) avec une transform affine (similarity transform), normaliser à 112x112 pixels, et appliquer la normalisation des couleurs (mean = [0.5, 0.5, 0.5], std = [0.5, 0.5, 0.5]).

*   2\. **Extraction d'embedding facial** — Générer le vecteur d'embedding 128-D ou 512-D pour chaque visage avec ArcFace (margin-based softmax, SOTA pour face recognition), FaceNet (Inception-ResNetV1 backbone, embedding 128-D), ou MobileFaceNet (optimisé mobile, 560k paramètres, embedding 128-D, accuracy >99.5% sur LFW). Les embeddings doivent être L2-normalisés pour que le calcul de similarité soit un produit scalaire (dot product). Pour le mobile, utiliser les modèles quantifiés INT8 (TFLite) avec délégué GPU/NNAPI pour l'accélération hardware.

*   3\. **Similarity scoring et seuils** — Calculer la similarité cosinus entre les deux embeddings (score = 1 - cosine_distance = 1 - (1 - dot_product) = dot_product). Appliquer les seuils métier par niveau de confiance : > 0.65 = match à faible confiance (flag review manuelle), > 0.75 = match moyen (pass automatique si combiné avec liveness), > 0.85 = match haute confiance (requis pour transactions critiques). Pour les apps fintech/KYC, recommander le seuil 0.85+ pour les flux d'ouverture de compte, 0.75+ pour les flux de login biométrique. Le FAR (False Accept Rate) à 0.75 est ~0.1% et le FRR (False Reject Rate) ~2-3%.

*   4\. **Liveness Detection (anti-spoofing)** — Détecter si le selfie provient d'une personne réelle ou d'un écran/photo/impression 3D. Technique Passive : analyser les micro-mouvements de la peau (rPPG pour détecter le pouls via variations de couleur), les reflets cornéens (specular reflection), la texture de la peau (Local Binary Patterns pour détecter l'impression écran), et les distorsions de Moiré (artefacts de ré-photographie d'écran). Technique Active : défi liveness avec mouvement guidé (tourner la tête gauche/droite/haut/bas, sourire, cligner des yeux) via le flux caméra temps réel. Combiner les deux approches : passive pour le premier frame, active si score passive < seuil. Retourner `liveness_score: float (0-1)` et `liveness_result: PASS/FAIL`.

*   5\. **Deepfake et spoofing avancé** — Détecter les attaques sophistiquées : deepfake génératif (GANs, diffusion models pour générer des visages synthétiques réalistes), presentation attacks (photo imprimée, masque 3D, vidéo replay sur écran), et injection attacks (man-in-the-middle sur le flux caméra). Utiliser des modèles de détection de deepfake comme XceptionNet (pré-entraîné sur FaceForensics++), MesoNet (détection rapide de meso-scale artefacts), ou EfficientNet-B4 (SOTA sur DFDC). Signaler `deepfake_probability` et bloquer les scores > 0.5 sans review humaine. Pour les apps fintech, intégrer la vérification de l'authenticité du hardware (Android SafetyNet Attestation API / Play Integrity API, iOS DeviceCheck) pour détecter les émulateurs et les dispositifs rootés/jailbreakés.

*   6\. **Pipeline complet KYC (onboarding)** — Orchestrer le workflow complet : (1) Capture selfie + OCR document (via ocr-document-scanner skill) → (2) Vérification qualité image (face-matching-kyc step 1) → (3) Extraction embedding selfie + embedding photo document → (4) Similarity score + seuil décision → (5) Liveness detection → (6) Deepfake check → (7) Compilation du rapport KYC avec `overall_result: PASS/FAIL/REVIEW`, `face_match_score`, `liveness_score`, `deepfake_score`, `document_mrz_valid`, `extracted_fields`, et `timestamp`. Le rapport doit être signé cryptographiquement (HMAC-SHA256) pour audit trail.

*   7\. **Préservation de la vie privée et conformité** — Ne jamais stocker les images brutes ou les embeddings faciaux après la session (privacy by design). Utiliser le chiffrement de bout en bout (AES-256-GCM en transit, chiffrement au repos pour les logs). Respecter le RGPD/lois marocaines (loi 09-08 sur la protection des données personnelles) : consentement explicite de l'utilisateur, droit à l'effacement, limitation de la finalité (vérification identité uniquement), et durée de conservation minimale. Pour les données biométriques, appliquer les mesures de sécurité renforcées (chiffrement avec HSM/KMS, accès restreint aux opérations cryptographiques).

*   8\. **Intégration mobile et backend** — Fournir le code pour intégration : Kotlin avec ML Kit Face Detection + FaceNet TFLite (CameraX pour la capture temps réel), React Native avec react-native-vision-camera et react-native-fast-tflite (inference on-device), Flutter avec google_mlkit_face_detection et tflite_flutter. Pour le backend : FastAPI/Python avec DeepFace (facade library unifiée), InsightFace (ArcFace embeddings), ou Amazon Rekognition (managed service). Documenter les APIs REST avec endpoints POST `/face/verify` (selfie + document_photo → similarity score) et POST `/face/liveness` (video_frames ou selfie → liveness score).

## Règles

*   •  Fournis le code avec les dépendances exactes : pour Kotlin/Android, inclure les build.gradle.kts avec les versions TFLite 2.13+, ML Kit 16.1.5+, CameraX 1.3+ ; pour Python, requirements.txt avec `deepface==0.0.90`, `insightface==0.7.3`, `opencv-python==4.9.0`.

*   •  Utilise ArcFace comme modèle d'embedding par défaut (SOTA, margin de 0.5, embedding 512-D) pour les applications critique (KYC bancaire, accès sécurisé). Pour les cas mobiles contraints, recommande MobileFaceNet (embedding 128-D, <1ms inference sur flagship).

*   •  Combine toujours face matching + liveness detection dans les flux KYC : un match élevé sans liveness est vulnérable aux presentation attacks (photo de la photo du document). Le score final doit être une fonction pondérée (ex. final_score = 0.6 * face_match + 0.4 * liveness).

*   •  Pour les documents marocains (CIN biométrique, passeport) : la photo sur la CIN contient un filigrane micro-texte et une hologramme. Si l'image document a une qualité insuffisante (photo recadrée, faible résolution < 200x250 pixels), flag `document_photo_quality: LOW` et exiger une re-capture.

*   •  Logue tous les événements de décision (audit log immutable) : timestamp, device_fingerprint, face_match_score, liveness_score, decision, et reviewer_id (si review manuelle). Stocke les logs dans un système append-only (ex. AWS CloudWatch Logs avec KMS, ou ELK Stack avec WORM storage).
