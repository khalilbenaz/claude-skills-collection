---
name: networking-wireshark-analyst
description: Analyse de trafic réseau avec Wireshark incluant capture, filtres, protocoles et diagnostic réseau. Se déclenche avec "Wireshark", "capture réseau", "analyse de trafic", "pcap", "packet capture", "tcpdump. Also triggers on "Wireshark capture", "analyze a pcap", "packet analysis".
---

# Wireshark Analyst

## Workflow

### 1. Définir le périmètre de capture
- Identifier l'interface réseau (NIC physique, loopback `lo`, VPN, VLAN).
- Déterminer le vecteur : client→serveur, serveur→serveur, broadcast.
- Évaluer la durée : capture courte (problème reproductible) vs. capture longue avec rotation.

**Décision — capture embarquée ou déportée ?**
- Accès SSH sur la machine cible → `tcpdump` en CLI, rapatriement du pcap.
- Machine locale → Wireshark directement.
- Équipement réseau → port mirroring (SPAN) ou tap physique.

### 2. Configurer les filtres BPF (capture)

Limiter dès la capture réduit le bruit et protège la confidentialité.

```bash
# Capturer uniquement le trafic HTTP/HTTPS vers un serveur précis
tcpdump -i eth0 -w /tmp/capture.pcap \
  'host 10.1.2.3 and (port 80 or port 443)'

# Capturer avec rotation (100 MB max, 5 fichiers)
tcpdump -i eth0 -C 100 -W 5 -w /tmp/cap.pcap \
  'tcp and host 192.168.1.0/24'

# Exclure SSH pour ne pas capturer sa propre session
tcpdump -i eth0 -w /tmp/cap.pcap 'not port 22'

# Capturer DNS + réponses ICMP seulement
tcpdump -i any -w /tmp/dns.pcap 'port 53 or icmp'
```

**Filtres BPF courants :**

| Besoin | Filtre BPF |
|---|---|
| Un hôte uniquement | `host 10.0.0.5` |
| Subnet | `net 192.168.1.0/24` |
| Port source ou dest | `port 8080` |
| TCP SYN uniquement | `tcp[tcpflags] & tcp-syn != 0` |
| UDP + DNS | `udp port 53` |
| ICMP | `icmp` |

### 3. Lancer la capture (Wireshark ou tcpdump)

```bash
# Capture headless longue durée, horodatage dans le nom de fichier
tcpdump -i eth0 -s 0 -w "/tmp/cap_$(date +%Y%m%dT%H%M%S).pcap" \
  'host 10.0.0.1'

# Capture Wireshark depuis la CLI (tshark)
tshark -i eth0 -a duration:60 -w /tmp/cap.pcap \
  -f 'port 443'

# Lire un pcap existant dans tshark (sans GUI)
tshark -r /tmp/cap.pcap -Y "http.response.code >= 400"
```

### 4. Appliquer les filtres d'affichage Wireshark

Les filtres d'affichage sont distincts des filtres BPF — syntaxe propre à Wireshark.

```
# Retransmissions TCP
tcp.analysis.retransmission

# Erreurs HTTP (4xx/5xx)
http.response.code >= 400

# Handshake TLS uniquement
tls.handshake

# Conversations d'un hôte
ip.addr == 10.0.0.5

# Paquets avec delta-time > 1 seconde (latence)
frame.time_delta > 1

# RST TCP (connexions coupées brutalement)
tcp.flags.reset == 1

# ICMP Destination Unreachable
icmp.type == 3

# Combiner : trafic HTTP d'un hôte précis sans les succès
ip.addr == 10.0.0.5 && http.response.code >= 400

# Requêtes DNS avec erreur NXDOMAIN
dns.flags.rcode == 3
```

### 5. Analyser les flux et statistiques

**Outils Wireshark :**
- `Statistics > Conversations` → classement par volume, latence par pair.
- `Statistics > IO Graph` → repérer les pics de trafic corrélés aux incidents.
- `Analyze > Follow > TCP Stream` → lire l'échange applicatif en clair.
- `Statistics > TCP Stream Graphs > Time-Sequence (tcptrace)` → visualiser les retransmissions et fenêtres.
- `Telephony > RTP Streams` → qualité VoIP (jitter, perte de paquets).

**tshark — statistiques en ligne de commande :**
```bash
# Top 10 conversations TCP par octets
tshark -r cap.pcap -q -z conv,tcp | sort -k6 -rn | head -10

# Statistiques HTTP
tshark -r cap.pcap -q -z http,tree

# Temps de réponse HTTP
tshark -r cap.pcap -T fields \
  -e http.request.uri -e http.time \
  -Y "http.time"
```

### 6. Identifier les anomalies réseau

**Checklist rapide :**

| Anomalie | Filtre d'affichage | Signification |
|---|---|---|
| Retransmissions TCP | `tcp.analysis.retransmission` | Perte de paquets, congestion |
| Fenêtre TCP à zéro | `tcp.analysis.zero_window` | Récepteur saturé |
| Duplicate ACK | `tcp.analysis.duplicate_ack` | Perte en transit |
| Reset inattendu | `tcp.flags.reset==1` | Connexion refusée ou timeout |
| Latence DNS élevée | `dns && frame.time_delta > 0.5` | Résolution lente |
| Retransmission SYN | `tcp.flags==0x002 && tcp.analysis.retransmission` | Serveur injoignable |
| TLS Alert | `tls.alert_message` | Erreur de certificat ou chiffrement |

**Analyse de latence :**
```bash
# Extraire RTT TCP (SYN → SYN-ACK) pour chaque connexion
tshark -r cap.pcap -T fields \
  -e ip.src -e ip.dst -e tcp.analysis.ack_rtt \
  -Y "tcp.analysis.ack_rtt > 0.1"
```

### 7. Croiser avec les logs applicatifs

- Synchroniser les timestamps : vérifier que le pcap et les logs ont le même fuseau horaire.
- Utiliser `frame.time` dans Wireshark en UTC (`View > Time Display Format > UTC`).
- Corréler les erreurs HTTP 5xx avec les pics de retransmissions TCP dans la même fenêtre temporelle.
- Pour les microservices : filtrer par `X-Request-Id` ou `trace-id` dans les headers HTTP capturés.

```bash
# Extraire les timestamps et URLs d'erreur en CSV
tshark -r cap.pcap -T fields \
  -e frame.time -e http.request.uri -e http.response.code \
  -Y "http.response.code >= 500" \
  -E header=y -E separator=, > erreurs_http.csv
```

### 8. Produire le rapport

- Inclure : interface, durée, filtres BPF utilisés, volume capturé.
- Joindre les filtres d'affichage qui reproduisent chaque anomalie.
- Exporter uniquement les paquets pertinents (`File > Export Specified Packets`).
- Anonymiser les IPs si le pcap est partagé (`File > Export Packet Dissections` ou `editcap` avec `--anonymize`).

```bash
# Anonymiser un pcap avant partage
editcap --anonymize -r cap.pcap cap_anonymized.pcap
```

---

## Garde-fous et pièges

**Pièges courants :**
- **Capturer sur loopback et manquer le problème** — le trafic loopback bypass le NIC, utiliser `lo` uniquement pour du local-local.
- **Taille de snap incorrecte** — `tcpdump -s 0` capture le paquet entier ; `-s 68` (défaut ancien) tronque les payloads applicatifs.
- **Timestamps décalés** — NTP non synchronisé rend la corrélation avec les logs impossible ; vérifier avant la capture.
- **Volume non maîtrisé** — sans filtre BPF ni rotation, un trafic de 1 Gbps remplit le disque en minutes.
- **TLS/HTTPS chiffré** — la capture montre l'enveloppe TCP mais pas le payload ; utiliser le SSLKEYLOGFILE si disponible.
- **Confusion BPF vs. display filter** — les filtres BPF s'appliquent à la capture (syntaxe tcpdump) ; les display filters s'appliquent après (syntaxe Wireshark/tshark).
- **Capturer la propre session SSH** — toujours exclure `not port 22` pour éviter la boucle.

**Sécurité et conformité :**
- Obtenir une autorisation écrite avant toute capture en production.
- Ne jamais stocker de pcap en clair sur un partage réseau ou un dépôt git.
- Supprimer les fichiers après analyse ; conserver uniquement les extraits anonymisés.
- En environnement réglementé (PCI-DSS, RGPD) : consulter le RSSI avant de capturer un segment portant des données cartes ou PII.

---

## Bonnes pratiques 2026

- Préférer **tshark** en CI/CD pour l'automatisation et les rapports scriptés.
- Utiliser **Zeek** (ex-Bro) pour l'analyse comportementale long terme et la génération de logs structurés.
- Intégrer les pcap dans **Arkime** (Moloch) pour la rétention et la recherche à grande échelle.
- Activer le **SSLKEYLOGFILE** dans les navigateurs/JVMs de test pour décrypter TLS en local sans casser le chiffrement en prod.
- Pour Kubernetes : utiliser `kubectl sniff` ou **Hubble** (Cilium) plutôt que tcpdump dans les pods.


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
