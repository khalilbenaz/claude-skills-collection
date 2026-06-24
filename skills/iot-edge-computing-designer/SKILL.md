---
name: iot-edge-computing-designer
description: Conception de systèmes edge computing avec traitement local, synchronisation cloud, latence et offline-first. Se déclenche avec "edge computing", "edge", "traitement local", "IoT edge", "fog computing", "offline IoT".
---

# Edge Computing Designer

## Workflow

### 1. Évaluation des contraintes

Avant toute architecture, répondre à ces questions :

| Critère | Edge obligatoire si… |
|---|---|
| Latence | < 50 ms requis pour l'action locale |
| Bande passante | > 10 MB/s de données brutes en continu |
| Disponibilité réseau | Coupures > 1 h/jour ou sites isolés |
| Conformité | Données ne peuvent pas quitter le site (RGPD, données industrielles) |
| Coût cloud | Traitement brut trop coûteux à envoyer (vidéo HD, capteurs HF) |

### 2. Découpage edge / fog / cloud

```
[Capteurs] → [Edge node] → [Fog gateway] → [Cloud]
               ↓ inférence       ↓ agrégation    ↓ analytics
               ↓ filtrage        ↓ buffer         ↓ modèles ML
               local < 10 ms     local < 500 ms   batch
```

- **Edge node** : Raspberry Pi 5, NVIDIA Jetson Orin, Coral Dev Board, PLC industriel
- **Fog gateway** : x86 mini-PC, routeur industriel (Moxa, Advantech)
- **Cloud** : AWS Greengrass hub, Azure IoT Hub, GCP Cloud IoT (ou on-prem)

**Règle d'affectation** : si la décision doit se prendre en < 100 ms ou si la donnée n'a pas de valeur au-delà du site, elle reste en edge. Tout le reste monte au cloud.

### 3. Sélection matérielle

```
Charge de calcul faible  → Raspberry Pi 5 (8 Go) + Coral USB Accelerator
Vision par ordinateur    → NVIDIA Jetson Orin NX (16 Go, 100 TOPS)
Industrie / -40°C/+85°C → Advantech MIC-720AI ou Moxa V2406C
Ultra-faible conso       → ESP32-S3 (inférence ML embarquée, ~240 MHz)
```

Checklist matérielle :
- [ ] Température opérationnelle compatible avec le site
- [ ] Stockage suffisant pour le buffer offline (min. 24 h de données)
- [ ] Watchdog hardware pour redémarrage automatique
- [ ] Interface réseau redondante (LTE + Ethernet)

### 4. Architecture offline-first

Toute application edge doit persister localement avant d'envoyer au cloud.

**Pattern Store-and-Forward avec SQLite :**

```python
import sqlite3, time, requests

DB = "/data/edge.db"

def init_db():
    with sqlite3.connect(DB) as cx:
        cx.execute("""
            CREATE TABLE IF NOT EXISTS queue (
                id INTEGER PRIMARY KEY,
                payload TEXT,
                created_at REAL,
                sent INTEGER DEFAULT 0
            )
        """)

def enqueue(payload: str):
    with sqlite3.connect(DB) as cx:
        cx.execute("INSERT INTO queue (payload, created_at) VALUES (?,?)",
                   (payload, time.time()))

def flush_to_cloud(endpoint: str):
    with sqlite3.connect(DB) as cx:
        rows = cx.execute(
            "SELECT id, payload FROM queue WHERE sent=0 ORDER BY id LIMIT 100"
        ).fetchall()
        if not rows:
            return
        ids = [r[0] for r in rows]
        batch = [r[1] for r in rows]
        try:
            requests.post(endpoint, json=batch, timeout=10)
            cx.execute(f"UPDATE queue SET sent=1 WHERE id IN ({','.join('?'*len(ids))})", ids)
        except Exception:
            pass  # retry au prochain cycle
```

**Gestion des conflits** : utiliser des timestamps logiques (Lamport clock) ou des CRDTs pour les données métriques. Pour les commandes, FIFO strict + idempotency key.

### 5. Synchronisation cloud

```bash
# MQTT avec rétention locale — Eclipse Mosquitto + store-and-forward
mosquitto.conf :
  persistence true
  persistence_location /var/lib/mosquitto/
  queue_qos0_messages true
  max_queued_messages 10000

# Publier avec QoS 1 (at-least-once) pour garantie de livraison
mosquitto_pub -h broker -t "site/sensor/temp" -m '{"v":42.1}' -q 1
```

Delta sync : n'envoyer que les changements significatifs (dead-band filtering).

```python
DEAD_BAND = 0.5  # °C

last_sent = None
def should_send(value):
    global last_sent
    if last_sent is None or abs(value - last_sent) >= DEAD_BAND:
        last_sent = value
        return True
    return False
```

### 6. Déploiement de modèles ML en edge

```bash
# Convertir un modèle PyTorch → TFLite optimisé
python -c "
import torch, torch.onnx
model.eval()
torch.onnx.export(model, dummy_input, 'model.onnx', opset_version=17)
"

# Quantiser en INT8 pour Coral / Jetson
tflite_convert \
  --saved_model_dir=./saved_model \
  --output_file=model_quant.tflite \
  --optimizations=DEFAULT \
  --inference_input_type=INT8 \
  --inference_output_type=INT8

# Inférence ONNX Runtime (edge x86/ARM)
import onnxruntime as ort
sess = ort.InferenceSession("model.onnx", providers=["CPUExecutionProvider"])
result = sess.run(None, {"input": data})
```

Cible : modèle < 5 MB, inférence < 20 ms sur CPU ARM Cortex-A55.

### 7. OTA et orchestration de flotte

```bash
# Mender.io — déploiement OTA signé avec rollback automatique
mender-artifact write rootfs-image \
  --device-type raspberry-pi-5 \
  --artifact-name firmware-2.4.1 \
  --file rootfs.img \
  --output-path firmware-2.4.1.mender

# Vérification d'intégrité post-déploiement (health check)
mender install firmware-2.4.1.mender && mender commit || mender rollback
```

Alternatives : Balena Fleet (containers), AWS Greengrass v2, Azure IoT Edge modules.

**Règle OTA** : déployer en canary (5 % de la flotte → 48 h de monitoring → 100 %). Ne jamais mettre à jour bootloader et application en même artefact.

### 8. Sécurité edge

```bash
# Boot sécurisé Raspberry Pi (config.txt)
program_usb_boot_mode=0
# + HAT TPM2.0 pour stockage de clés

# Chiffrement partition données
cryptsetup luksFormat /dev/mmcblk0p3
cryptsetup open /dev/mmcblk0p3 data_enc
mkfs.ext4 /dev/mapper/data_enc

# mTLS entre edge et cloud (certificats x.509)
mosquitto_pub --cafile ca.crt --cert edge.crt --key edge.key \
  -h broker -p 8883 -t "data" -m "payload"
```

Checklist sécurité :
- [ ] Certificats uniques par appareil (pas de clé partagée)
- [ ] Rotation des certificats automatisée (< 1 an)
- [ ] Firewall local : seuls ports MQTT (8883) et SSH (via bastion) ouverts
- [ ] Logs tamper-evident (append-only, hash chaîné)

### 9. Monitoring distribué

```yaml
# Prometheus Node Exporter sur chaque edge node
# prometheus.yml (scrape depuis fog gateway)
scrape_configs:
  - job_name: 'edge_nodes'
    static_configs:
      - targets: ['192.168.1.10:9100', '192.168.1.11:9100']
    scrape_interval: 30s

# Alerte Grafana : nœud silencieux depuis > 5 min
alert: EdgeNodeDown
expr: up{job="edge_nodes"} == 0
for: 5m
```

Métriques indispensables : CPU/mémoire/température, taille de la queue locale, latence d'inférence, dernière synchronisation réussie.

---

## Anti-patterns et pièges

| Anti-pattern | Conséquence | Correctif |
|---|---|---|
| Tout envoyer au cloud brut | Saturation bande passante, coût x10 | Dead-band filtering + agrégation locale |
| Pas de buffer offline | Perte de données à la moindre coupure | Store-and-forward systématique |
| Mise à jour sans rollback | Flotte brickée à distance | Mender/Balena avec commit/rollback |
| Certificat partagé entre nodes | Compromission = toute la flotte | Un certificat x.509 par appareil |
| Modèle ML non quantisé | Inférence > 500 ms, impossible temps-réel | TFLite INT8 ou ONNX avec optimisations |
| Logs en mémoire seule | Perte au reboot, diagnostic impossible | Écriture sur stockage persistant |
| NTP absent sur edge | Timestamps incohérents, conflits de sync | `chrony` ou PTP obligatoire sur chaque node |

## Bonnes pratiques 2026

- **WebAssembly en edge** : WASM + WASI pour déployer du code portable sur n'importe quel runtime edge (Wasmtime, WasmEdge) — isolation sandbox sans conteneur lourd.
- **tinyML** : modèles < 256 KB pour microcontrôleurs (TensorFlow Micro, Edge Impulse) — inférence sur ESP32 sans OS.
- **Matter / Thread** : protocole standard pour la couche réseau IoT locale (2026) — préférer à Zigbee propriétaire pour l'interopérabilité.
- **Edge AI lifecycle** : versionner les modèles edge comme du code (DVC + MLflow) et tracer chaque version déployée par appareil.
- **eBPF sur gateway Linux** : filtrage de paquets et observabilité réseau sans overhead kernel pour les passerelles Fog.


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
