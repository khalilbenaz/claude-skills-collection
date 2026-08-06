---
name: linux-linux-troubleshooter
description: Diagnostic de problèmes Linux — performance, disque, mémoire, réseau et processus. Se déclenche avec "Linux lent", "top", "htop", "df", "dmesg", "strace", "debug Linux". Also triggers on "Linux troubleshooting", "server is slow", "disk full", "high memory usage".
---

# Linux Troubleshooter

## Étape 0 — Snapshot initial (toujours en premier)

Avant tout : collecter les métriques de référence. Ne jamais agir sans baseline.

```bash
uptime                          # load average 1/5/15 min
free -h                         # mémoire physique + swap
df -h && df -i                  # espace disque + inodes
top -bn1 | head -20             # CPU / processus snapshot
dmesg -T | tail -30             # messages noyau récents
systemctl --failed              # services en échec
```

Critère de décision :
- Load average > nb_vCPU × 2 → diagnostic CPU/I-O
- `Mem available` < 5 % de la RAM totale → diagnostic mémoire
- `Use%` disque > 90 % ou inodes saturés → diagnostic disque
- Services `failed` listés → diagnostic service en priorité

---

## Étape 1 — CPU et processus

```bash
# Top 10 processus CPU
ps aux --sort=-%cpu | head -12

# Charge par core (q pour quitter)
mpstat -P ALL 1 5

# Profiling noyau temps réel
perf top -s comm,dso

# Trace appels système d'un PID (PROD : durée courte seulement)
strace -c -p <PID>              # résumé des appels, moins intrusif que -p seul
```

Critères :
- `us` (user) élevé → code applicatif ; profiler avec `perf` ou `async-profiler`
- `sy` (system) élevé → I/O ou appels système excessifs ; `strace`
- `wa` (iowait) élevé → goulot I/O disque → Étape 3
- `si`/`hi` élevés → interruptions réseau/hardware → vérifier NIC

---

## Étape 2 — Mémoire

```bash
free -h
vmstat 1 5                      # si/so > 0 = swap actif
cat /proc/meminfo | grep -E 'MemAvailable|Dirty|Writeback|Slab'

# OOM killer
dmesg -T | grep -i 'oom\|killed process'
journalctl -k --since "1h ago" | grep -i oom

# Top 10 consommateurs RAM
ps aux --sort=-%mem | head -12

# Détail mémoire d'un processus
cat /proc/<PID>/status | grep -E 'VmRSS|VmSwap'
smem -rs pss | head -15         # si smem installé
```

Critères :
- `si`/`so` dans `vmstat` > 0 → swap actif ; investiguer qui swapper
- Slab élevé (>20 % RAM) → fuite cache noyau ; `slabtop`
- OOM dans dmesg → le processus victime est dans les logs ; ajuster `vm.overcommit_memory`

---

## Étape 3 — Disque et I/O

```bash
# Saturation I/O
iostat -xz 1 5                  # %util > 80 % = disque saturé
iotop -o -b -n 3                # processus générateurs d'I/O

# Trouver les gros fichiers
du -ah /var /tmp /home 2>/dev/null | sort -rh | head -20

# Inodes épuisées (df -h OK mais df -i saturé)
df -i

# Fichiers ouverts supprimés mais non libérés
lsof | grep deleted | awk '{print $1, $7, $9}' | sort -k2 -rn | head -10
# Solution : redémarrer le process fautif pour libérer l'espace

# Vérification système de fichiers (hors production, FS démonté)
fsck -n /dev/sdX
```

Critères :
- `%util` iostat ≈ 100 % → ajouter du stockage ou passer à SSD/NVMe
- Inodes saturées → supprimer petits fichiers nombreux (logs, tmp, sockets)
- Fichiers `deleted` encore ouverts → libération immédiate par restart du processus

---

## Étape 4 — Réseau

```bash
# Connectivité et latence
ping -c 5 8.8.8.8
traceroute -n 8.8.8.8

# Interfaces et routes
ip addr show
ip route show

# Ports en écoute + PID
ss -tulnp

# Connexions établies / TIME_WAIT
ss -s
ss -tn state time-wait | wc -l  # > 10 000 = possible épuisement ports

# Capture réseau ciblée
tcpdump -i eth0 -n -c 200 host <IP>
tcpdump -i eth0 -n -c 200 port 443 -w /tmp/cap.pcap

# DNS
dig @8.8.8.8 example.com +short
resolvectl status               # systemd-resolved
```

Critères :
- Drop packets dans `ip -s link` → problème hardware/driver
- Beaucoup de `TIME_WAIT` → ajuster `net.ipv4.tcp_tw_reuse=1` + `tcp_fin_timeout`
- Latence DNS > 500 ms → changer resolver ou vérifier `/etc/resolv.conf`

---

## Étape 5 — Services et logs

```bash
# État d'un service
systemctl status nginx --no-pager -l

# Logs temps réel
journalctl -u nginx -f
journalctl -xe --since "30 min ago"

# Logs anciens (erreurs critiques)
grep -rE 'error|fail|crit|panic' /var/log/ --include='*.log' -l
journalctl -p err..emerg --since "2h ago"

# Dépendances d'un service qui ne démarre pas
systemctl list-dependencies nginx --failed

# Socket/port occupé
fuser 80/tcp
ss -tulnp | grep ':80'
```

---

## Étape 6 — Appliquer et valider

1. **Snapshot avant** (métriques de l'étape 0 sauvegardées)
2. Appliquer le correctif minimal (redémarrer service, libérer espace, tuer le bon processus)
3. **Snapshot après** — comparer avec l'avant
4. Si le problème revient → investiguer la cause racine, pas juste les symptômes

```bash
# Redémarrage propre d'un service
systemctl restart <service>
systemctl status <service>

# Libérer le cache page (urgence RAM — PROD avec précaution)
sync && echo 3 > /proc/sys/vm/drop_caches

# Augmenter swap temporairement
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Bonne pratique |
|---|---|---|
| `kill -9` sans investigation | Corruption de données, état inconsistant | Envoyer `SIGTERM` d'abord, attendre 10 s |
| `strace -p <PID>` en prod longtemps | Ralentit le processus de 2x à 10x | Utiliser `strace -c` (résumé) ou `perf trace` |
| `echo 3 > /proc/sys/vm/drop_caches` en prod | Spike I/O brutal, latences en cascade | Réservé aux urgences RAM critique hors heure |
| Modifier `/etc/sysctl.conf` sans tester | Régression réseau ou mémoire | Tester avec `sysctl -w` puis valider avant persistance |
| Supprimer des logs pour libérer de l'espace | Perte de preuves pour l'audit | `truncate -s 0 /var/log/app.log` si actif, ou logrotate |
| Relancer un service sans lire ses logs | Boucle de crash, masquage du problème | Toujours lire `journalctl -u <service> -n 50` avant restart |
| Diagnostiquer sur un snapshot prod sans baseline | Pas de référence pour valider | Toujours collecter métriques avant action |

---

## Monitoring préventif (post-incident)

```bash
# Activer collecte historique (sar)
systemctl enable --now sysstat
sar -u 1 10                     # CPU 10 dernières secondes

# Alertes simples sans Prometheus
# CPU > 80% pendant 5 min
nohup sh -c 'while true; do
  load=$(awk "{print \$1}" /proc/loadavg)
  ncpu=$(nproc)
  if awk "BEGIN{exit !($load > $ncpu * 0.8)}"; then
    echo "HIGH LOAD $load" | mail -s ALERT admin@example.com
  fi
  sleep 60
done' &
```

Pour les environnements avec Prometheus + Alertmanager, préférer les alertes sur `node_load15`, `node_memory_MemAvailable_bytes`, `node_filesystem_avail_bytes`.


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
