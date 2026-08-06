---
name: face-matching-kyc
description: Vérification biométrique d'identité : face matching selfie vs document, liveness detection, deepfake detection, pipeline KYC complet avec seuils décision, conformité RGPD/loi 09-08. Se déclenche avec "face matching", "vérification identité", "KYC biométrique", "selfie vs document", "liveness", "deepfake", "biometrie", "one-to-one matching". Also triggers on "selfie vs ID verification", "KYC biometrics".
---

# Face Matching KYC

## Workflow KYC — étapes numérotées

### 1. Détection et alignement de visage

Librairies recommandées (par priorité) :

| Contexte | Librairie | Points repères |
|---|---|---|
| Mobile Android/iOS (offline) | MediaPipe FaceMesh | 468 points |
| Qualité maximale (backend) | RetinaFace | 5 points |
| Équilibre vitesse/qualité | MTCNN | 5 points |

Transform affine sur 5 points (yeux G/D, nez, coins bouche) → normalisation 112×112 px.

```python
# Python – alignement avec insightface
from insightface.app import FaceAnalysis
app = FaceAnalysis(allowed_modules=["detection", "recognition"])
app.prepare(ctx_id=0, det_size=(640, 640))

def align_and_embed(img_bgr):
    faces = app.get(img_bgr)
    if not faces:
        raise ValueError("Aucun visage détecté")
    return faces[0].normed_embedding  # float32 array 512-D, L2-normalisé
```

Critères de rejet image avant traitement :
- Résolution < 224×224 px → `IMAGE_QUALITY_LOW`
- Confiance détection < 0.90 → `NO_FACE_DETECTED`
- Plus d'un visage détecté → `MULTIPLE_FACES`
- Blur score (Laplacien) < 100 → `BLURRY_IMAGE`

### 2. Extraction d'embedding facial

Modèle par contexte :

| Modèle | Embedding | FAR @ threshold 0.75 | Cas d'usage |
|---|---|---|---|
| ArcFace R100 | 512-D | ~0.05% | KYC bancaire, onboarding critique |
| MobileFaceNet | 128-D | ~0.3% | Mobile, contrainte latence |
| FaceNet InceptionResNetV1 | 128-D | ~0.1% | Backend général |

**Règle** : toujours L2-normaliser l'embedding avant le calcul de similarité.

```python
import numpy as np

def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    # Les embeddings insightface/ArcFace sont déjà L2-normalisés
    return float(np.dot(emb1, emb2))  # dot product = cosine similarity si normalisés
```

### 3. Seuil de décision — similarity score

```
Score cosinus   Décision             Cas d'usage
─────────────   ──────────────────   ─────────────────────────────────
< 0.65          REJECT               Blocage systématique
0.65 – 0.75     REVIEW               File de revue manuelle obligatoire
0.75 – 0.85     PASS (medium)        Login biométrique, flux secondaires
≥ 0.85          PASS (high)          Ouverture compte, transaction critique
```

Score final pondéré (à adapter selon contexte réglementaire) :

```python
def compute_final_score(face_score: float, liveness_score: float) -> dict:
    final = 0.6 * face_score + 0.4 * liveness_score
    if final >= 0.85:
        decision = "PASS_HIGH"
    elif final >= 0.75:
        decision = "PASS_MEDIUM"
    elif final >= 0.65:
        decision = "REVIEW"
    else:
        decision = "REJECT"
    return {"final_score": round(final, 4), "decision": decision}
```

### 4. Liveness Detection (anti-spoofing)

**Passive (premier frame, zéro friction utilisateur)**
- Détection pouls via rPPG (variations de couleur peau)
- Analyse texture LBP (Local Binary Patterns) → détecter impression papier
- Détection artefacts Moiré (ré-photographie d'écran)
- Reflets cornéens (specular reflection absents sur photo 2D)

**Active (si passive score < 0.7 — défi challenge)**
- Tourner la tête gauche/droite, cligner, sourire
- Validé frame-by-frame avec MediaPipe FaceMesh (468 points, mesure angle 3D)

```python
# Passive liveness avec Silent Face Anti-Spoofing (miniFASNet)
# pip install silent-face-anti-spoofing
from silent_face import SilentFaceAntiSpoofing
model = SilentFaceAntiSpoofing()

def check_liveness(img_bgr) -> dict:
    score = model.predict(img_bgr)  # 0=spoof, 1=real
    return {
        "liveness_score": round(float(score), 4),
        "liveness_result": "PASS" if score >= 0.7 else "FAIL"
    }
```

### 5. Deepfake et attaques avancées

Modèles de détection (par ordre de précision décroissante) :

| Modèle | Dataset entraîn. | Vitesse | Notes |
|---|---|---|---|
| EfficientNet-B4 | DFDC | ~150ms GPU | SOTA, recommandé backend |
| XceptionNet | FaceForensics++ | ~80ms GPU | Bonne généralisation |
| MesoNet | Custom | ~10ms CPU | Léger, embarqué possible |

Types d'attaques à couvrir :
- **Presentation attack** : photo imprimée, masque 3D, replay vidéo
- **Digital injection** : remplacement flux caméra (V4L2 loopback, virtual cam)
- **Deepfake génératif** : GAN/diffusion model (FaceSwap, SimSwap, DALL-E avatars)

Contre-mesures injection attack (mobile) :
- Android : Play Integrity API (remplace SafetyNet 2024) → détecter émulateur/root
- iOS : DeviceCheck + App Attest → vérifier intégrité device

```python
# Seuil deepfake — bloquer sans review si probabilité haute
def evaluate_deepfake(deepfake_prob: float) -> str:
    if deepfake_prob > 0.5:
        return "BLOCK"       # Blocage immédiat, alerter équipe fraude
    elif deepfake_prob > 0.3:
        return "REVIEW"      # Revue humaine obligatoire
    return "PASS"
```

### 6. Pipeline KYC complet — orchestration

```python
from dataclasses import dataclass, asdict
import hmac, hashlib, json, time

@dataclass
class KYCReport:
    timestamp: str
    face_match_score: float
    liveness_score: float
    deepfake_probability: float
    document_photo_quality: str   # OK | LOW
    overall_result: str           # PASS | REVIEW | REJECT
    signature: str = ""

def run_kyc(selfie_bgr, document_bgr) -> dict:
    emb_selfie   = align_and_embed(selfie_bgr)
    emb_document = align_and_embed(document_bgr)

    face_score   = cosine_similarity(emb_selfie, emb_document)
    liveness     = check_liveness(selfie_bgr)
    deepfake     = evaluate_deepfake(get_deepfake_prob(selfie_bgr))

    decision = compute_final_score(face_score, liveness["liveness_score"])

    if deepfake == "BLOCK":
        overall = "REJECT"
    elif deepfake == "REVIEW" or decision["decision"] == "REVIEW":
        overall = "REVIEW"
    elif decision["decision"].startswith("PASS"):
        overall = "PASS"
    else:
        overall = "REJECT"

    report = KYCReport(
        timestamp=str(int(time.time())),
        face_match_score=face_score,
        liveness_score=liveness["liveness_score"],
        deepfake_probability=0.0,  # à remplir
        document_photo_quality="OK",
        overall_result=overall,
    )
    payload = json.dumps(asdict(report), separators=(",", ":")).encode()
    report.signature = hmac.new(SECRET_KEY, payload, hashlib.sha256).hexdigest()
    return asdict(report)
```

### 7. Intégration mobile

**Android (Kotlin)**
```kotlin
// build.gradle.kts
implementation("com.google.mlkit:face-detection:16.1.5")
implementation("org.tensorflow:tensorflow-lite:2.14.0")
implementation("org.tensorflow:tensorflow-lite-gpu:2.14.0")
implementation("androidx.camera:camera-camera2:1.3.2")
```

```kotlin
val options = FaceDetectorOptions.Builder()
    .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
    .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
    .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
    .build()
val detector = FaceDetection.getClient(options)
```

**React Native**
```
yarn add react-native-vision-camera react-native-fast-tflite
```

**API REST — endpoints backend**
```
POST /face/verify
  Body : { selfie: base64, document_photo: base64 }
  Return: { face_match_score, liveness_score, deepfake_probability, overall_result }

POST /face/liveness
  Body : { frames: [base64, ...] }   # 5-10 frames pour active liveness
  Return: { liveness_score, liveness_result }
```

### 8. Conformité et vie privée

- **Ne jamais persister** les embeddings faciaux ou images brutes au-delà de la session
- **Chiffrement en transit** : TLS 1.3 + certificate pinning mobile
- **Chiffrement au repos** : AES-256-GCM via KMS (AWS KMS / Azure Key Vault)
- **RGPD / Loi 09-08 (Maroc)** : consentement explicite avant capture, finalité limitée (identification uniquement), droit à l'effacement, durée rétention minimale (recommandé : supprimer après validation ou 30 jours max)
- **Audit log immuable** (append-only) : timestamp, device_fingerprint, scores, décision, reviewer_id

---

## Garde-fous / Anti-patterns / Pièges

| Piège | Conséquence | Contre-mesure |
|---|---|---|
| Seuil unique pour tous les flux | FAR trop élevé sur les cas critiques | Seuils différenciés par flux (0.75 login, 0.85 onboarding) |
| Face matching sans liveness | Attaque photo-sur-photo triviale | Toujours combiner matching + liveness |
| Stocker embeddings bruts | Données biométriques persistées = RGPD violation | Privacy by design : effacer post-session |
| Photo document trop petite | Embedding de mauvaise qualité → faux rejets | Vérifier résolution ≥ 200×250 px avant embedding |
| Ignorer les injections digitales | Contournement via caméra virtuelle | Play Integrity API (Android) + App Attest (iOS) |
| Score deepfake sans seuil de blocage | Deepfake validé automatiquement | Bloquer strictement si deepfake_prob > 0.5 |
| Modèle non fine-tuné sur CIN marocaine | Dégradation qualité sur hologramme/filigrane | Fine-tuner ou tester sur dataset CIN biométrique marocaine |
| Un seul modèle pour détection + embedding | Point de défaillance unique | Pipeline modulaire : détection / embedding / liveness séparés |

## Bonnes pratiques 2026

- **Play Integrity API** (Google, remplace SafetyNet depuis 2024) : obligatoire pour KYC Android en prod
- **ISO/IEC 30107-3** : standard liveness detection — viser niveau PAD (Presentation Attack Detection) Level 2 minimum pour KYC réglementé
- **eIDAS 2.0 / PVID** (contexte EU) : si votre app vise la conformité européenne, auditer avec un prestataire PVID certifié ANSSI
- **Model versioning** : versionner les modèles d'embedding (ArcFace v1 ≠ v2) — un changement de modèle invalide tous les embeddings stockés → prévoir migration ou re-enrollment
- **Biais démographique** : évaluer FAR/FRR par groupe (genre, ethnie, âge) — les modèles entraînés sur datasets non représentatifs pénalisent certains groupes
- **Fallback humain** : tout flux REVIEW doit avoir un chemin de revue manuelle documenté avec SLA (ex. < 4h ouvrées)
