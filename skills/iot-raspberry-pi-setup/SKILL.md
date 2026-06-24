---
name: iot-raspberry-pi-setup
description: Configuration et projets Raspberry Pi incluant OS, GPIO, serveurs et domotique. Se déclenche avec "Raspberry Pi", "RPi", "Raspbian", "GPIO", "domotique", "serveur Raspberry".
---

# Raspberry Pi Setup

## 1. Choix du modèle

| Besoin | Modèle recommandé | Raison |
|---|---|---|
| Serveur, IA edge, desktop | Pi 5 (4/8 Go) | PCIe, NVMe, double 4K |
| Projet headless léger | Pi 4 (2 Go) | Bon rapport perf/prix |
| Caméra, capteurs simple | Pi Zero 2 W | Ultra compact, Wi-Fi |
| Microcontrôleur (pas Linux) | Pi Pico 2 | MicroPython, bare-metal |
| NAS/stockage | Pi 5 + HAT NVMe | Bande passante PCIe 2.0 |

Critère décisif : si le projet nécessite Docker, Python avec libs ML ou un serveur web → Pi 4/5. Si batterie/consommation prime → Zero 2 W ou Pico.

## 2. Installation OS

```bash
# Installer Raspberry Pi Imager (multi-OS)
# https://www.raspberrypi.com/software/

# Via CLI (Linux/macOS) avec rpi-imager ou directement dd :
# Recommandé : rpi-imager GUI → choisir "Raspberry Pi OS Lite 64-bit" pour headless

# Options à configurer AVANT flashage (bouton roue dentée dans Imager) :
# - Hostname : monpi.local
# - SSH activé, clé publique injectée
# - Wi-Fi SSID + mot de passe
# - Locale fr_FR, timezone Europe/Paris
```

Choix OS :
- **Raspberry Pi OS Lite 64-bit** : headless, léger, recommandé pour serveurs/GPIO
- **Ubuntu Server 24.04 LTS** : si besoin snap, cloud-init, écosystème standard
- **DietPi** : footprint minimal (~500 Mo RAM), optimisé IoT
- **Home Assistant OS** : uniquement si dédiée domotique (ne pas mélanger)

## 3. Configuration réseau et SSH

```bash
# Premier accès SSH
ssh pi@monpi.local          # mDNS via avahi-daemon
ssh pi@192.168.x.x          # IP fixe si mDNS indisponible

# IP statique via NetworkManager (Bookworm 2023+)
sudo nmcli con mod "Wired connection 1" \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8 1.1.1.1" \
  ipv4.method manual
sudo nmcli con up "Wired connection 1"

# Ancienne méthode dhcpcd (Bullseye et antérieur) — /etc/dhcpcd.conf :
# interface eth0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8
```

## 4. Sécurisation (obligatoire avant exposition réseau)

```bash
# Changer le mot de passe pi ou créer un nouvel utilisateur
sudo adduser khalil
sudo usermod -aG sudo khalil

# Désactiver login par mot de passe SSH — /etc/ssh/sshd_config :
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Pare-feu minimal
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw allow ssh
sudo ufw allow 80/tcp    # si serveur web
sudo ufw enable

# Fail2ban
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban

# Mises à jour automatiques de sécurité
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 5. GPIO — commandes et bibliothèques

```bash
# Installer gpiozero (recommandée 2024+) + lgpio backend
sudo apt install -y python3-lgpio python3-gpiozero

# Activer interfaces (I2C, SPI, 1-Wire) via raspi-config
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_spi 0

# Vérifier périphériques I2C connectés
i2cdetect -y 1
```

```python
# LED clignotante — gpiozero (Pi 4/5, BCM numbering)
from gpiozero import LED
from time import sleep

led = LED(17)          # GPIO17 = pin 11
while True:
    led.on(); sleep(0.5)
    led.off(); sleep(0.5)

# Bouton avec callback
from gpiozero import Button
btn = Button(18, pull_up=True)
btn.when_pressed = lambda: print("Appui détecté")
```

```python
# Lecture capteur DHT22 (température/humidité)
import board, adafruit_dht
dht = adafruit_dht.DHT22(board.D4)
print(f"Temp: {dht.temperature}°C  Hum: {dht.humidity}%")
```

## 6. Services système avec systemd

```ini
# /etc/systemd/system/monapp.service
[Unit]
Description=Mon application Pi
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=khalil
WorkingDirectory=/home/khalil/monapp
ExecStart=/usr/bin/python3 main.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now monapp
journalctl -u monapp -f        # logs en temps réel
```

## 7. Sauvegarde carte SD

```bash
# Sauvegarde image compressée (depuis une autre machine)
ssh pi@monpi.local "sudo dd if=/dev/mmcblk0 bs=4M status=progress" \
  | gzip > backup-$(date +%Y%m%d).img.gz

# Outil recommandé : rpi-clone (sauvegarde à chaud vers autre SD/USB)
git clone https://github.com/billw2/rpi-clone.git
sudo rpi-clone sda              # clone vers /dev/sda

# Cron sauvegarde hebdomadaire
0 3 * * 0 root rpi-clone -f sda >> /var/log/rpi-clone.log 2>&1
```

## 8. Cas d'usage courants — commandes clés

```bash
# Pi-hole (bloqueur DNS réseau local)
curl -sSL https://install.pi-hole.net | bash

# Home Assistant Supervised (sur Debian Bookworm)
curl -Lo haos_rpi4.img.xz https://github.com/home-assistant/operating-system/releases/...
# Mieux : flasher Home Assistant OS directement depuis Imager

# Node-RED
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
sudo systemctl enable --now nodered

# Monitoring ressources
sudo apt install -y htop glances
glances --webserver --port 61208   # dashboard web

# Température CPU
vcgencmd measure_temp              # Pi 4/5
cat /sys/class/thermal/thermal_zone0/temp   # universel, /1000 = °C
```

## Garde-fous / Anti-patterns / Pièges

- **Sous-tension** : le Pi 5 exige 5V/5A (27W). Un chargeur USB standard provoque des throttlings silencieux. Vérifier `vcgencmd get_throttled` — `0x0` = OK.
- **Carte SD bon marché** : les cartes SD A1/A2 de faible qualité se corrompent sous écriture intensive (logs, bases de données). Utiliser SSD USB ou NVMe via HAT pour tout projet critique.
- **Ne pas couper l'alimentation brutalement** : toujours `sudo shutdown -h now`. Mettre en place un onduleur ou un bouton GPIO avec script systemd pour Pi headless.
- **GPIO 3.3V uniquement** : les GPIOs Pi tolèrent max 3.3V. Un signal 5V (Arduino, capteur non adapté) détruit le SoC. Utiliser un level shifter.
- **Ne pas utiliser RPi.GPIO sur Pi 5** : RPi.GPIO ne supporte pas le Pi 5 (RP1 chip). Utiliser `lgpio` ou `gpiozero` avec backend `lgpio`.
- **Overlocking sans refroidissement** : le Pi 5 peut dépasser 85°C sans dissipateur. Activer `arm_freq=2400` uniquement avec refroidissement actif.
- **Ne pas exposer SSH sur IP publique** sans fail2ban + clés. Préférer un VPN WireGuard ou Tailscale.
- **Raspberry Pi Imager efface** : vérifier deux fois le device cible — une erreur formate le mauvais disque.

## Bonnes pratiques 2026

- Utiliser **NVMe HAT** (Pi 5) plutôt que carte SD pour tout projet en production.
- Préférer **gpiozero** + backend `lgpio` à `RPi.GPIO` (déprécié sur Pi 5+).
- **Tailscale** pour accès distant sécurisé sans ouvrir de ports : `curl -fsSL https://tailscale.com/install.sh | sh`.
- Logger vers **journald** (systemd), pas vers fichiers texte, pour rotation automatique.
- Versionner scripts et configs dans git ; utiliser **Ansible** dès qu'on gère plusieurs Pi.
- Monitorer température et voltage avec **Glances** ou **Netdata** dès la mise en production.


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
