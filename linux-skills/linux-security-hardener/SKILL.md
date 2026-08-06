---
name: linux-security-hardener
description: Durcissement sécurité Linux — SSH, fail2ban, SELinux, audit, gestion des utilisateurs et mises à jour. Se déclenche avec "sécurité Linux", "hardening Linux", "SSH sécurisé", "fail2ban", "SELinux", "audit Linux". Also triggers on "harden a Linux server", "SSH hardening", "fail2ban and SELinux".
---

# Linux Security Hardener

## Étape 1 — Audit initial (baseline)

Avant toute modification, mesurer l'état de sécurité actuel.

```bash
# Score global Lynis
lynis audit system --quick 2>/dev/null | grep -E "Hardening index|Warning|Suggestion"

# Ports en écoute
ss -tulnp

# Comptes avec shell interactif (hors root et comptes système)
awk -F: '$7 ~ /bash|sh|zsh/ && $3 >= 1000' /etc/passwd

# Services actifs
systemctl list-units --type=service --state=running

# SUID/SGID non attendus
find / -xdev \( -perm -4000 -o -perm -2000 \) -type f 2>/dev/null | sort
```

**Critère de décision :** Lynis score < 65 = hardening prioritaire. Score 65-80 = corrections ciblées. > 80 = maintenance continue.

---

## Étape 2 — Durcissement SSH

**Toujours garder une session SSH ouverte avant de modifier `sshd_config`.**

```bash
# /etc/ssh/sshd_config — paramètres minimaux (2026)
Port 2222                          # changer le port par défaut
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
AllowUsers deployer ops-user       # liste blanche explicite
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
Banner /etc/ssh/banner.txt
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,diffie-hellman-group16-sha512
```

```bash
# Valider la config avant reload
sshd -t && systemctl reload sshd
```

---

## Étape 3 — fail2ban

```bash
# /etc/fail2ban/jail.local
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 4
backend  = systemd

[sshd]
enabled  = true
port     = 2222
logpath  = %(sshd_log)s

[nginx-http-auth]
enabled  = true
```

```bash
# Statut et bans actifs
fail2ban-client status sshd
fail2ban-client banned          # liste toutes les IP bannies
fail2ban-client set sshd unbanip 1.2.3.4   # débannir manuellement
```

---

## Étape 4 — Gestion utilisateurs et privilèges

```bash
# Verrouiller un compte inutilisé
usermod -L -e 1 ancien-user     # -e 1 = date expiration passée

# Politique mots de passe (pam_pwquality)
# /etc/security/pwquality.conf
minlen = 14
dcredit = -1
ucredit = -1
lcredit = -1
ocredit = -1
maxrepeat = 3

# Expiration des mots de passe
chage -M 90 -W 14 -I 30 username
chage -l username               # vérifier

# Sudoers granulaire (jamais éditer /etc/sudoers directement)
# /etc/sudoers.d/deployer
deployer ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx
```

---

## Étape 5 — SELinux / AppArmor

**SELinux (RHEL/CentOS/Fedora)**

```bash
sestatus                        # vérifier le mode
setenforce 1                    # enforcing temporairement
# /etc/selinux/config : SELINUX=enforcing

# Diagnostiquer un AVC denial
ausearch -m AVC -ts recent | audit2why
# Générer une politique minimale
ausearch -m AVC -ts recent | audit2allow -M mypolicy
semodule -i mypolicy.pp
```

**AppArmor (Debian/Ubuntu)**

```bash
aa-status                       # profils actifs
aa-enforce /etc/apparmor.d/*    # passer en enforce
aa-logprof                      # générer profil depuis les logs
```

**Critère :** Toujours enforcing en prod. `complain` uniquement pendant le test d'un nouveau service.

---

## Étape 6 — auditd (traçabilité)

```bash
# /etc/audit/rules.d/hardening.rules
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k sudoers
-w /etc/ssh/sshd_config -p wa -k sshd_config
-a always,exit -F arch=b64 -S execve -F euid=0 -k root_commands
-a always,exit -F arch=b64 -S open,openat -F exit=-EACCES -k access_denied
```

```bash
augenrules --load               # appliquer les règles
auditctl -l                     # lister les règles actives
ausearch -k sudoers -ts today   # recherche par clé
aureport --summary              # rapport synthétique
```

---

## Étape 7 — Firewall (nftables / firewalld)

```bash
# nftables — exemple minimal
nft add table inet filter
nft add chain inet filter input  '{ type filter hook input priority 0; policy drop; }'
nft add rule inet filter input iif lo accept
nft add rule inet filter input ct state established,related accept
nft add rule inet filter input tcp dport 2222 ct state new limit rate 5/minute accept
nft list ruleset > /etc/nftables.conf
```

---

## Étape 8 — Mises à jour automatiques

```bash
# Debian/Ubuntu
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
# /etc/apt/apt.conf.d/50unattended-upgrades : activer "security" uniquement

# RHEL/CentOS
dnf install dnf-automatic
# /etc/dnf/automatic.conf : apply_updates = yes, upgrade_type = security
systemctl enable --now dnf-automatic-install.timer
```

---

## Garde-fous et anti-patterns

| Piège | Conséquence | Solution |
|---|---|---|
| `setenforce 0` pour débloquer un service | Désactive toute isolation SELinux | Utiliser `audit2allow` pour créer une politique ciblée |
| `PermitRootLogin yes` "temporairement" | Oubli fréquent, vecteur d'attaque majeur | Créer un compte dédié avec sudo limité |
| Modifier `sshd_config` sans session ouverte | Exclusion complète du serveur | Garder 2 sessions actives, valider avec `sshd -t` |
| `NOPASSWD: ALL` dans sudoers | Escalade de privilèges triviale | Lister les commandes exactes autorisées |
| Désactiver `auditd` pour les perfs | Aucune traçabilité forensique | Tuner `backlog_limit` dans `/etc/audit/auditd.conf` |
| fail2ban sans `backend = systemd` | Faux négatifs si journald utilisé | Toujours préciser le backend |
| Oublier les mises à jour du noyau | Vulnérabilités persistantes | `needrestart -r a` post-upgrade, planifier reboot maintenance |

---

## Checklist finale

```bash
# Vérifications post-hardening
lynis audit system --quick | grep "Hardening index"
sshd -T | grep -E "permitrootlogin|passwordauthentication|port"
fail2ban-client status
sestatus || aa-status
auditctl -l | wc -l
ss -tulnp | grep -v "127.0.0.1\|::1"
awk -F: '$2 == "" {print $1}' /etc/shadow  # comptes sans mot de passe
```
