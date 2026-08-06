---
name: mqtt-architect
description: Architecture de messaging IoT avec MQTT incluant brokers, topics, QoS, sécurité et patterns. Se déclenche avec "MQTT", "broker MQTT", "Mosquitto", "IoT messaging", "topic MQTT", "QoS". Also triggers on "MQTT broker", "MQTT topics and QoS".
---

# MQTT Architect

## Workflow

### 1. Cadrage du système IoT

Recueillir avant toute conception :
- Nombre d'appareils connectés (maintenant et à 2 ans)
- Volume de messages/seconde par appareil et total
- Contraintes réseau : bande passante, intermittence, mobile vs filaire
- Criticité des données : perte acceptable ou non ?
- Cloud vs on-premise vs hybride

**Critère de décision broker** :

| Contexte | Broker recommandé |
|---|---|
| Dev/petit projet (<1000 appareils) | Mosquitto |
| Production scalable (>10k appareils) | EMQX ou HiveMQ |
| Cloud managé sans ops | AWS IoT Core, Azure IoT Hub |
| Edge gateway local | Mosquitto ou NanoMQ |

### 2. Conception de la hiérarchie de topics

Schéma canonique recommandé :
```
{organisation}/{site}/{zone}/{device_id}/{metric}
```

Exemples concrets :
```
acme/tunis/atelier-a/machine-42/temperature
acme/tunis/atelier-a/machine-42/status
acme/paris/entrepot/capteur-07/humidity
acme/+/+/+/status          # wildcard single-level
acme/#                     # wildcard multi-level (usage monitoring)
```

Règles de nommage :
- Minuscules, tirets, pas de caractères spéciaux ni espaces
- Device ID unique global (ex: MAC address ou UUID)
- Séparer les topics de commande des topics de télémétrie :
  ```
  cmd/{device_id}/restart    # commande → appareil
  tel/{device_id}/uptime     # télémétrie → broker
  ```
- Ne jamais utiliser `#` en production pour un subscriber unique — volume incontrôlé

### 3. Choix du niveau QoS

| QoS | Garantie | Cas d'usage | Coût réseau |
|---|---|---|---|
| 0 | Au plus une fois (fire & forget) | Télémetrie haute fréquence, température | Minimal |
| 1 | Au moins une fois (avec ack) | Alertes, événements métier | Moyen |
| 2 | Exactement une fois (4-way handshake) | Facturation, ordres critiques, actionneurs | Élevé |

Règle pratique : 80 % des topics → QoS 0 ; monter uniquement si la perte est inacceptable.

### 4. Configuration du broker (Mosquitto)

Installation Debian/Ubuntu :
```bash
apt install mosquitto mosquitto-clients
```

Fichier `/etc/mosquitto/mosquitto.conf` minimal sécurisé :
```conf
listener 8883
cafile   /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile  /etc/mosquitto/certs/server.key
require_certificate true
tls_version tlsv1.3

allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file      /etc/mosquitto/acl

persistence true
persistence_location /var/lib/mosquitto/
log_dest file /var/log/mosquitto/mosquitto.log
log_type all
```

Créer un utilisateur :
```bash
mosquitto_passwd -c /etc/mosquitto/passwd device01
```

Fichier ACL (`/etc/mosquitto/acl`) :
```
# device01 ne publie que sur ses propres topics
user device01
topic write tel/device01/#
topic read  cmd/device01/#
```

Tester la connexion TLS :
```bash
mosquitto_pub -h broker.example.com -p 8883 \
  --cafile ca.crt --cert client.crt --key client.key \
  -u device01 -P secret \
  -t "tel/device01/temperature" -m '{"v":22.5,"ts":1719220000}'
```

### 5. Sécurité

Checklist obligatoire en production :
- [ ] TLS 1.3 activé, port 8883 uniquement (bannir le port 1883 non chiffré)
- [ ] Authentification par certificats clients (x.509) pour les appareils embarqués
- [ ] ACL par device_id : chaque appareil ne peut publier que sur ses propres topics
- [ ] Rotation des certificats automatisée (Let's Encrypt ou PKI interne)
- [ ] Rate-limiting côté broker (EMQX : `max_publish_rate`, Mosquitto : plugin externe)
- [ ] Isolation réseau : broker non exposé directement sur Internet (reverse proxy ou VPN)

Rotation de mot de passe sans redémarrage Mosquitto :
```bash
mosquitto_passwd /etc/mosquitto/passwd device01
kill -HUP $(pidof mosquitto)
```

### 6. Implémentation client (Python — paho-mqtt)

```python
import paho.mqtt.client as mqtt
import ssl, json, time

BROKER = "broker.example.com"
PORT   = 8883
TOPIC  = "tel/device01/temperature"

def on_connect(client, userdata, flags, rc, props=None):
    if rc == 0:
        print("Connecté")
        client.subscribe("cmd/device01/#", qos=1)
    else:
        print(f"Erreur connexion : {rc}")

def on_disconnect(client, userdata, rc, props=None):
    print(f"Déconnecté ({rc}), reconnexion auto...")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="device01")
client.tls_set(ca_certs="ca.crt", certfile="client.crt", keyfile="client.key",
               tls_version=ssl.PROTOCOL_TLS_CLIENT)
client.username_pw_set("device01", "secret")

# Last Will Testament — détection déconnexion inattendue
client.will_set("tel/device01/status", payload='{"online":false}', qos=1, retain=True)

client.on_connect    = on_connect
client.on_disconnect = on_disconnect
client.connect(BROKER, PORT, keepalive=60)
client.loop_start()

# Publication périodique
while True:
    payload = json.dumps({"v": 22.5, "ts": int(time.time())})
    client.publish(TOPIC, payload, qos=0)
    time.sleep(5)
```

### 7. Patterns avancés

**Request / Response** (MQTT 5 `response_topic`) :
```python
# Publisher envoie avec response_topic
props = mqtt.Properties(mqtt.PacketTypes.PUBLISH)
props.ResponseTopic = "response/device01/restart"
client.publish("cmd/device01/restart", "{}", qos=1, properties=props)
```

**Shared Subscriptions** (consommateurs multiples, EMQX/HiveMQ) :
```
$share/groupe-workers/tel/+/temperature
```
Charge répartie entre tous les subscribers du groupe — équivalent Kafka consumer group.

**Bridge entre brokers** (site → cloud) dans `mosquitto.conf` :
```conf
connection cloud-bridge
address cloud.example.com:8883
topic tel/# out 1
topic cmd/# in  1
remote_username bridge_user
remote_password secret
bridge_cafile /etc/mosquitto/certs/ca.crt
```

**Retained messages** — état courant accessible aux nouveaux subscribers :
```bash
mosquitto_pub -r -t "tel/device01/status" -m '{"online":true}' -q 1
```

### 8. Monitoring

Topics `$SYS` natifs Mosquitto :
```bash
mosquitto_sub -t '$SYS/#' -v
# $SYS/broker/clients/connected
# $SYS/broker/messages/received
# $SYS/broker/publish/messages/dropped
```

Intégration Prometheus via `mqtt_exporter` :
```bash
docker run -d -p 9234:9234 \
  -e MQTT_BROKER_HOST=broker.example.com \
  -e MQTT_BROKER_PORT=8883 \
  hikhvar/mqtt2prometheus:latest
```

Alertes critiques à configurer :
- `clients/connected` chute brutale → déconnexion en masse
- `messages/dropped` > 0 → subscriber trop lent ou réseau saturé
- Latence publish → ack > 500 ms → problème broker ou réseau

## Anti-patterns et pièges

| Piège | Conséquence | Correction |
|---|---|---|
| Port 1883 exposé sans TLS | Interception de tous les messages | Forcer 8883 + TLS dès le départ |
| Topic unique pour tout (ex: `data/all`) | Impossibilité de filtrer, surcharge subscribers | Granularité topic = 1 métrique |
| QoS 2 partout | Latence x4, congestion en masse | QoS 2 uniquement pour actionneurs critiques |
| Client ID dupliqué | Déconnexions en boucle des deux clients | UUID ou MAC par appareil |
| `allow_anonymous true` en prod | N'importe qui peut publier/souscrire | Authentification obligatoire |
| Payload non structuré (valeur brute) | Évolution impossible | JSON `{"v": 22.5, "ts": 1719220000, "unit": "C"}` |
| Absence de Last Will | Déconnexions silencieuses non détectées | `will_set` systématique sur topic `status` |
| Topics avec espaces ou majuscules | Inconsistances, bugs clients | Convention : snake_case ou kebab-case |

## Bonnes pratiques 2026

- **MQTT 5 en priorité** : utilisez les propriétés `User Properties`, `Message Expiry Interval` et `Response Topic` pour les nouveaux projets.
- **Payload : JSON + Timestamp** : inclure toujours `ts` (epoch Unix) dans chaque message pour la traçabilité et la déduplication.
- **Schema registry** : documenter le format de chaque topic dans un fichier `topics.yaml` versionné dans le dépôt.
- **Edge buffering** : sur appareils avec connectivité intermittente, utiliser une file locale (SQLite ou LevelDB) et vider vers MQTT à la reconnexion.
- **Compression** : activer la compression Zstandard côté broker (EMQX 5.x natif) pour les payloads > 512 octets sur réseau contraint.
- **MQTT over WebSocket** : port 9001/9443 pour les clients navigateur — sécuriser avec les mêmes ACL que le port 8883.
