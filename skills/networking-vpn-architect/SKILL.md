---
name: networking-vpn-architect
description: Conception et déploiement de VPN incluant WireGuard, OpenVPN, IPSec pour les architectures site-to-site et remote access. Se déclenche avec "VPN", "WireGuard", "OpenVPN", "IPSec", "tunnel VPN", "site-to-site. Also triggers on "set up a VPN", "WireGuard config", "site-to-site tunnel".
---

# VPN Architect

## 1. Analyse des besoins

Collecter avant toute chose :
- **Type de topologie** : remote access (utilisateurs nomades), site-to-site (interconnexion de réseaux), mesh (chaque pair parle à tous les autres)
- **Volume** : nombre de pairs/utilisateurs simultanés, débit attendu (Mbps), latence cible (ms)
- **Contraintes** : OS clients (Linux/Windows/macOS/mobile), pare-feux traversés (NAT, DPI), conformité (PCI-DSS, HDS, ISO 27001)
- **HA** : tolérance aux pannes requise ? actif/actif ou actif/passif ?

## 2. Critères de choix du protocole

| Critère | WireGuard | OpenVPN | IPSec/IKEv2 |
|---|---|---|---|
| Performance | Excellent (kernel) | Moyen (userspace) | Bon (kernel natif) |
| Traversée NAT | Facile (UDP 51820) | Facile (UDP/TCP 1194) | Difficile (NAT-T UDP 4500) |
| PKI/Certs | Non (clés Ed25519) | Oui (TLS/certs) | Oui (IKEv2 + certs) |
| Interop. équipements réseau | Faible | Moyen | Excellent (Cisco, Fortinet…) |
| Support mobile natif | Android/iOS (app) | App tierce | Natif iOS/Android/Windows |
| Auditabilité code | ~4 000 lignes | ~100 000 lignes | Variable |

**Règle de décision** : WireGuard en priorité pour les nouveaux déploiements Linux ; IPSec/IKEv2 si interopérabilité avec équipements existants ; OpenVPN si contrainte TCP 443 (pare-feu strict).

## 3. Conception de la topologie

**Hub-and-spoke** (remote access courant) :
```
Clients ──► WireGuard/OpenVPN Gateway ──► LAN 10.0.0.0/8
              |
              └── 10.8.0.0/24 (pool VPN)
```

**Site-to-site mesh (WireGuard)** :
```
Site A (10.1.0.0/24) ◄──► Hub (10.0.0.1) ◄──► Site B (10.2.0.0/24)
                            ▲
                            └── Site C (10.3.0.0/24)
```

Règles de subnetting : éviter les chevauchements avec RFC 1918 ; réserver /24 par site minimum.

## 4. Déploiement WireGuard (exemple serveur Linux)

```bash
# Installation (Debian/Ubuntu)
apt install wireguard

# Génération des clés serveur
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
chmod 600 /etc/wireguard/server_private.key

# /etc/wireguard/wg0.conf — Serveur
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <SERVER_PRIVATE_KEY>
PostUp   = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]  # Client 1
PublicKey  = <CLIENT1_PUBLIC_KEY>
AllowedIPs = 10.8.0.2/32

# Activer et démarrer
systemctl enable --now wg-quick@wg0

# Génération clé client
wg genkey | tee client1_private.key | wg pubkey > client1_public.key
```

```ini
# Profil client (wg0.conf côté client)
[Interface]
Address    = 10.8.0.2/24
PrivateKey = <CLIENT1_PRIVATE_KEY>
DNS        = 10.8.0.1

[Peer]
PublicKey  = <SERVER_PUBLIC_KEY>
Endpoint   = vpn.example.com:51820
AllowedIPs = 10.0.0.0/8   # split tunnel : seulement le LAN interne
# AllowedIPs = 0.0.0.0/0  # full tunnel
PersistentKeepalive = 25
```

## 5. Déploiement OpenVPN (site-to-site avec PKI)

```bash
# PKI avec easy-rsa 3
apt install easy-rsa
make-cadir /etc/openvpn/easy-rsa && cd /etc/openvpn/easy-rsa
./easyrsa init-pki
./easyrsa build-ca nopass
./easyrsa build-server-full vpn-server nopass
./easyrsa build-client-full client1 nopass
./easyrsa gen-dh
openvpn --genkey secret /etc/openvpn/ta.key

# server.conf (extrait chiffrement 2026)
tls-version-min 1.3
cipher AES-256-GCM
tls-ciphersuites TLS_AES_256_GCM_SHA384
auth SHA512
tls-auth /etc/openvpn/ta.key 0
```

## 6. IPSec/IKEv2 avec StrongSwan

```bash
# /etc/swanctl/conf.d/site-to-site.conf
connections {
  site-b {
    remote_addrs  = 203.0.113.2
    local { auth = psk; id = @site-a.example.com }
    remote { auth = psk; id = @site-b.example.com }
    children {
      net-net {
        local_ts  = 10.1.0.0/24
        remote_ts = 10.2.0.0/24
        esp_proposals = aes256gcm128-x25519
        start_action  = trap
      }
    }
    ike_sa_init_retransmit_timeout = 4
    proposals = aes256-sha512-x25519
  }
}
secrets { ike-site-b { secret = "ChangeMeViaVault" } }
```

## 7. Haute disponibilité

- **WireGuard** : déployer 2 gateways derrière un load balancer L4 (keepalived + VIP) ; les clés publiques des clients pointent la VIP.
- **OpenVPN** : mode `--mode server` + script `--up`/`--down` pour synchroniser état via rsync ; ou utiliser OpenVPN Access Server en cluster.
- **BGP over VPN** : injecter les routes dynamiquement via FRRouting pour le failover automatique site-to-site.

```bash
# Keepalived VIP pour WireGuard HA
vrrp_instance VPN_GW {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    virtual_ipaddress { 192.168.1.10/24 }
}
```

## 8. Monitoring et rotation des clés

```bash
# État des pairs WireGuard (dernière handshake, trafic)
wg show wg0

# Prometheus exporter
apt install prometheus-wireguard-exporter
# Alerte : LastHandshake > 3 min → pair potentiellement down

# Rotation clé WireGuard (zero-downtime)
NEW_PRIV=$(wg genkey)
NEW_PUB=$(echo "$NEW_PRIV" | wg pubkey)
wg set wg0 peer <OLD_PUB> remove
wg set wg0 peer "$NEW_PUB" allowed-ips 10.8.0.2/32
# Mettre à jour le client, puis supprimer l'ancienne entrée
```

Rotation des certificats OpenVPN : automatiser avec `certbot` ou `vault pki` ; alerter 30 jours avant expiration.

## 9. Garde-fous et anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| PPTP ou L2TP sans IPSec | Compromission triviale | Migrer vers WireGuard/IKEv2 |
| Pre-shared key identique pour tous les sites | Compromission d'un site = tous compromis | PSK unique par tunnel |
| `AllowedIPs = 0.0.0.0/0` sans DNS interne | Fuite DNS hors tunnel | Pousser DNS + forcer DNS leak protection |
| Certificat CA exposé sur le serveur VPN | Émission de faux certs | Stocker la CA offline ou dans un HSM/Vault |
| Pas de PersistentKeepalive derrière NAT | Tunnel silencieusement mort | Ajouter `PersistentKeepalive = 25` |
| Split tunneling sans audit des routes | Données sensibles hors tunnel | Auditer `ip route` côté client après connexion |
| Ports VPN standards non changés sur internet | Scan automatique + attaques | Changer le port ou utiliser port-knocking |

## 10. Bonnes pratiques 2026

- **Cryptographie** : préférer X25519 (ECDH) + ChaCha20-Poly1305 ou AES-256-GCM ; bannir RSA < 4096 bits, SHA-1, 3DES.
- **Zero Trust** : coupler le VPN à une vérification de posture (EDR, patch level) via un IdP (Tailscale, Cloudflare Access, Headscale).
- **Secrets** : stocker les PSK et clés privées dans HashiCorp Vault ou AWS Secrets Manager ; jamais en clair dans un dépôt git.
- **Logs** : activer le logging des connexions (IP source, durée, volume) avec rétention 90 jours minimum pour les audits.
- **IPv6** : prévoir un adressage dual-stack dès la conception ; WireGuard supporte nativement IPv6.
- **Segmentation** : utiliser des VLAN/VRF distincts par catégorie d'utilisateurs derrière le VPN (employés, partenaires, IoT).


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
