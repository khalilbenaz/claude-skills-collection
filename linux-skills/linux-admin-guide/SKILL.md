---
name: linux-admin-guide
description: Administration Linux complète — gestion des utilisateurs, permissions, services, logs, cron et packages. Se déclenche avec "Linux", "administration Linux", "chmod", "chown", "systemctl", "apt", "yum". Also triggers on "Linux administration", "manage users and permissions", "systemd services and cron".
---

# Linux Admin Guide

## 1. Identifier le contexte système

```bash
uname -r                      # version noyau
cat /etc/os-release           # distro + version
lscpu | grep -E 'Arch|CPU'    # architecture et nb de coeurs
hostnamectl                   # résumé complet (distro, kernel, arch)
```

**Critère de décision** — gestionnaire de paquets à utiliser :

| Distro              | Package manager | Dépôts config                      |
|---------------------|-----------------|-------------------------------------|
| Debian / Ubuntu     | `apt`           | `/etc/apt/sources.list.d/`         |
| RHEL / CentOS / Rocky | `dnf` (ou `yum`) | `/etc/yum.repos.d/*.repo`       |
| Arch / Manjaro      | `pacman`        | `/etc/pacman.conf`                  |
| Alpine              | `apk`           | `/etc/apk/repositories`            |

---

## 2. Gestion des utilisateurs et groupes

```bash
# Créer un utilisateur avec home + shell + groupe primaire
useradd -m -s /bin/bash -G sudo khalil
passwd khalil

# Modifier un utilisateur existant (ajouter un groupe secondaire)
usermod -aG docker khalil          # -a crucial : append, pas remplace

# Supprimer sans effacer le home (safer)
userdel khalil
# Supprimer avec home
userdel -r khalil

# Inspecter
id khalil                          # uid, gid, groupes
getent passwd khalil               # entrée dans /etc/passwd
chage -l khalil                    # expiration du mot de passe
```

**Piège** : `usermod -G docker khalil` SANS `-a` remplace tous les groupes secondaires — préférer toujours `-aG`.

---

## 3. Permissions et ACL

```bash
# Notation octale — mnémonique : owner/group/others
chmod 750 script.sh    # rwxr-x---
chmod 644 config.cfg   # rw-r--r--

# Notation symbolique
chmod u+x,g-w fichier
chmod o= fichier       # retire tout accès aux autres

# Changement de propriétaire
chown khalil:devteam fichier
chown -R www-data:www-data /var/www/   # récursif

# Bits spéciaux
chmod u+s /usr/bin/monprog   # SUID  → s'exécute comme owner
chmod g+s /srv/shared/       # SGID  → fichiers héritent du groupe
chmod +t /tmp/shared/        # Sticky → seul owner peut supprimer

# ACL fine (quand chmod ne suffit pas)
setfacl -m u:jenkins:rwx /deploy/
setfacl -m g:ci:rx /deploy/
getfacl /deploy/
```

**Anti-pattern** : `chmod -R 777` — n'est jamais la bonne réponse. Diagnostiquer d'abord avec `namei -l /chemin/complet`.

---

## 4. Gestion des services (systemd)

```bash
systemctl status nginx
systemctl start | stop | restart | reload nginx

# Activer au démarrage
systemctl enable nginx
systemctl enable --now nginx   # enable + start en une commande

# Lire les logs du service
journalctl -u nginx -n 100 --no-pager
journalctl -u nginx -f          # follow (temps réel)
journalctl -u nginx --since "1 hour ago"

# Créer ou modifier un service
systemctl edit nginx            # override sans écraser /lib/systemd/
systemctl daemon-reload         # après tout changement de unit file
```

**Critère de décision** : `reload` vs `restart` — `reload` fait un SIGHUP (rechargement de config sans coupure) ; `restart` tue et relance le processus. Préférer `reload` en production pour nginx/apache.

---

## 5. Planification des tâches (cron + systemd timers)

```bash
# Éditer la crontab de l'utilisateur courant
crontab -e
# Syntaxe : min heure jour_mois mois jour_semaine commande
0 2 * * *  /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
*/5 * * * * /usr/bin/check-health.sh   # toutes les 5 min

# Cron système
ls /etc/cron.{d,daily,weekly,monthly}/

# Vérifier les logs cron
grep CRON /var/log/syslog | tail -20
journalctl -t CRON -n 50
```

**Alternative moderne** — systemd timer (plus flexible, logs dans journald) :

```ini
# /etc/systemd/system/backup.timer
[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl enable --now backup.timer
systemctl list-timers --all
```

---

## 6. Gestion des paquets

```bash
# Debian/Ubuntu
apt update && apt upgrade -y
apt install -y curl git htop
apt remove --purge nginx             # supprime + config
apt autoremove                       # orphelins
apt-cache show nginx                 # infos paquet
apt list --installed | grep nginx

# RHEL/Rocky/CentOS (dnf)
dnf update -y
dnf install -y curl git htop
dnf remove nginx
dnf autoremove
dnf info nginx

# Simuler avant d'agir
apt-get --simulate remove nginx
dnf --assumeno remove nginx
```

---

## 7. Analyse des logs

```bash
# Logs systemd
journalctl -p err -n 50             # erreurs uniquement
journalctl --since "2026-06-24 08:00"
journalctl -k                        # messages kernel (dmesg via journald)

# Logs fichiers classiques
tail -f /var/log/syslog
tail -f /var/log/auth.log            # tentatives SSH, sudo
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn

# Rotation des logs — forcer un cycle
logrotate -f /etc/logrotate.d/nginx
```

---

## 8. Stockage et systèmes de fichiers

```bash
df -hT                              # espace + type FS
du -sh /var/log/* | sort -rh | head -10   # top gros répertoires
lsblk -f                            # disques, partitions, FS, UUID

# Monter un disque
blkid /dev/sdb1                     # obtenir UUID
echo "UUID=xxxx /data ext4 defaults,nofail 0 2" >> /etc/fstab
mount -a                            # tester le fstab

# Créer un FS et monter
mkfs.ext4 /dev/sdb1
mkdir /data && mount /dev/sdb1 /data

# Santé disque
smartctl -a /dev/sda                # SMART complet
smartctl -t short /dev/sda          # lancer un test rapide
```

---

## Garde-fous et anti-patterns

| Risque                             | Ce qu'il ne faut PAS faire          | Bonne pratique                                    |
|------------------------------------|-------------------------------------|---------------------------------------------------|
| Destruction de permissions         | `chmod -R 777 /`                    | Tester sur un sous-dossier, vérifier avec `namei` |
| Perte de groupes secondaires       | `usermod -G groupe user`            | Toujours `usermod -aG groupe user`                |
| Coupure SSH                        | Modifier `/etc/ssh/sshd_config` sans `sshd -t` | `sshd -t && systemctl reload sshd`      |
| Fstab cassé au reboot              | Ajouter une entrée sans tester      | `mount -a` avant de rebooter                      |
| Suppression paquet système         | `apt remove --purge systemd`        | `apt-get --simulate remove paquet` d'abord        |
| Root direct                        | `su -` en routine                   | `sudo -i` ou `sudo commande` — auditabilité       |
| Cron silencieux                    | Pas de redirection de sortie        | `cmd >> /var/log/job.log 2>&1`                    |

---

## Bonnes pratiques 2026

- **Sauvegarde avant modif** : `cp /etc/nginx/nginx.conf{,.bak-$(date +%F)}` — pattern idempotent.
- **Sudo minimal** : configurer `/etc/sudoers.d/khalil` avec `NOPASSWD` uniquement sur les commandes explicites, pas `ALL`.
- **Auditd** : activer `auditd` sur les serveurs de production (`apt install auditd`), écrire des règles sur `/etc/shadow`, `/etc/passwd`, exécutions `sudo`.
- **Gestion de configuration** : toute modification manuelle doit être rejouable via Ansible/Puppet — traiter le serveur comme immutable.
- **Mises à jour de sécurité automatiques** : activer `unattended-upgrades` (Debian) ou `dnf-automatic` (RHEL) en mode security-only.
- **Journaux centralisés** : rediriger `journald` vers un syslog centralisé (Loki, Graylog) en production pour ne pas perdre les logs après un crash.
