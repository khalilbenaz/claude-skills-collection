---
name: tcp-ip-troubleshooter
description: Diagnostic et résolution de problèmes réseau TCP/IP incluant latence, perte de paquets, DNS et routing. Se déclenche avec "TCP/IP", "problème réseau", "latence réseau", "ping", "traceroute", "DNS", "perte de paquets"
---

# TCP/IP Troubleshooter

## Workflow de diagnostic en 8 étapes

### 1. Qualifier le symptôme

Avant toute commande, déterminer :
- **Type** : timeout, connexion refusée, lenteur intermittente, résolution DNS échouée, perte de paquets
- **Portée** : un hôte, un sous-réseau, tous les clients, intermittent ou permanent
- **Couche OSI probable** : physique/liaison (1-2) → réseau (3) → transport (4) → application (7)

Exemple d'arbre décisionnel rapide :
```
Ping gateway KO  → couche 1-3 (câble, IP, route)
Ping gateway OK, ping DNS KO → routing ou firewall
DNS OK, port cible KO → couche 4 (port bloqué, service down)
Port OK, appli KO → couche 7 (TLS, auth, timeout app)
```

---

### 2. Connectivité de base (couche 3)

```bash
# Linux/Mac — tester loopback, gateway, DNS, cible
ping -c 4 127.0.0.1
ping -c 4 192.168.1.1          # gateway locale
ping -c 4 8.8.8.8              # DNS public (bypass résolution)
ping -c 4 example.com          # résolution + connectivité

# Windows
ping -n 4 8.8.8.8
Test-NetConnection 8.8.8.8 -Port 443   # PowerShell — teste port aussi
```

Critère de décision :
- Loopback KO → stack TCP/IP corrompue (reinitialiser : `netsh int ip reset` Windows)
- Gateway KO → problème L2/L3 local (VLAN, ARP, IP incorrecte)
- 8.8.8.8 KO mais gateway OK → routing ou firewall upstream

---

### 3. Analyse du chemin réseau

```bash
# Linux
traceroute -n 8.8.8.8          # -n évite la résolution inverse (plus rapide)
mtr --report --report-cycles 20 8.8.8.8   # outil préféré : stats par saut

# Windows
tracert -d 8.8.8.8
Test-NetConnection -TraceRoute 8.8.8.8
```

Interpréter `mtr` :
- **Loss% > 0 sur un saut intermédiaire mais 0 sur les suivants** → ICMP rate-limiting, pas de vraie perte
- **Loss% croissant et persistant à partir d'un saut** → congestion ou filtre à ce nœud
- **Latence qui double brutalement** → saut intercontinental ou lien saturé

---

### 4. Diagnostic DNS

```bash
# Résolution standard
nslookup example.com
dig example.com A              # plus détaillé, voir AUTHORITY/ANSWER section

# Tester un serveur spécifique
dig @1.1.1.1 example.com A
nslookup example.com 8.8.8.8

# Résolution inverse
dig -x 93.184.216.34
nslookup 93.184.216.34

# Vider le cache DNS
sudo systemd-resolve --flush-caches    # Linux systemd
ipconfig /flushdns                     # Windows
```

Pièges DNS courants :
- TTL élevé après changement d'IP → attendre ou forcer `dig +nocache`
- Split-horizon DNS : réponse différente interne/externe → tester depuis les deux zones
- DNSSEC invalide → `dig +dnssec` montre `SERVFAIL`

---

### 5. Interfaces et table de routage

```bash
# Linux
ip addr show                   # IPs, masques, état UP/DOWN
ip route show                  # table de routage
ip neigh show                  # cache ARP
ss -tuln                       # ports en écoute (remplace netstat)

# Windows
ipconfig /all
route print
arp -a
netstat -ano | findstr LISTEN
```

Vérifier :
- Interface active avec la bonne IP et masque
- Route par défaut (0.0.0.0/0) présente et correcte
- Pas d'entrées ARP périmées (`ip neigh flush all` pour réinitialiser)

---

### 6. Analyse de paquets (couche 2-4)

```bash
# Capturer le trafic vers une IP/port cible
sudo tcpdump -i eth0 -nn host 93.184.216.34 and port 443 -w /tmp/cap.pcap

# Afficher en direct les retransmissions TCP
sudo tcpdump -i eth0 'tcp[tcpflags] & (tcp-rst|tcp-syn) != 0' -nn

# Statistiques de retransmission sans capture complète
ss -ti dst 93.184.216.34       # retrans, rtt, cwnd
```

Indicateurs critiques dans Wireshark/tcpdump :
- `[RST]` immédiat → port fermé ou firewall stateful
- Retransmissions > 1 % → congestion ou perte sur le lien
- `ICMP Fragmentation Needed` → MTU mismatch (tester : `ping -M do -s 1472 gateway`)

---

### 7. Vérification des services et ports

```bash
# Tester un port TCP depuis le client
nc -zv 192.168.1.10 443        # Linux (netcat)
telnet 192.168.1.10 443        # cross-platform basique
Test-NetConnection 192.168.1.10 -Port 443   # Windows PowerShell

# Voir ce qui écoute côté serveur
ss -tlnp | grep :443           # Linux
netstat -ano | findstr :443    # Windows

# Tracer une connexion applicative avec strace (Linux)
strace -e trace=network -p <pid>
```

Critère : si `nc` KO depuis client mais `ss` montre le port ouvert → firewall intermédiaire ou binding incorrect (écoute sur 127.0.0.1 au lieu de 0.0.0.0).

---

### 8. Remédiation et validation

1. Documenter l'état avant modification (snapshots `ip route`, `iptables -L`, etc.)
2. Appliquer **un seul changement à la fois** et tester immédiatement
3. Valider end-to-end avec le même chemin que l'utilisateur final
4. Pour un rollback réseau Linux : `ip route replace` / `ip addr replace` ou redémarrage interface `ip link set eth0 down && ip link set eth0 up`

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Alternative |
|---|---|---|
| Modifier plusieurs paramètres en même temps | Impossible d'isoler la cause | Un changement, un test |
| Se fier uniquement au ping ICMP | Bloqué par firewalls, pas représentatif TCP | Compléter avec `nc`/`Test-NetConnection` |
| Ignorer `Loss%` intermédiaire sans vérifier les sauts suivants | Faux positif mtr | Comparer avec le saut N+1 |
| Vider le cache ARP en prod sans coordination | Micro-coupure sur tous les flux actifs | Attendre expiration naturelle ou fenêtre de maintenance |
| Capturer sans filtre sur un lien haut débit | Saturation disque en secondes | Toujours filtrer : `host X and port Y` |
| Changer le DNS resolver en prod sans test préalable | Rupture des résolutions internes | Tester d'abord depuis une VM isolée |

## Bonnes pratiques 2026

- Préférer `ss` à `netstat` (déprécié sur les kernels modernes)
- Utiliser `mtr` plutôt que `traceroute` seul (statistiques sur 20 cycles)
- Sur les environnements cloud (AWS/Azure/GCP) : vérifier les Security Groups / NSG avant toute capture — 80 % des blocages sont des règles de firewall cloud
- En conteneurs Kubernetes : débugger avec `kubectl exec` + `netshoot` image (`nicolaka/netshoot`) qui embarque tous les outils réseau
- IPv6 : toujours tester en parallèle (`ping6`, `traceroute6`, `dig AAAA`) — un hôte dual-stack peut avoir une connectivité IPv4 OK et IPv6 KO
- Journaliser chaque commande exécutée avec timestamp (`script` ou `tee`) pour le rapport d'incident
