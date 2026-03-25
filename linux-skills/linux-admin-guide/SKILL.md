---
name: linux-admin-guide
description: Administration Linux complète — gestion des utilisateurs, permissions, services, logs, cron et packages. Se déclenche avec "Linux", "administration Linux", "chmod", "chown", "systemctl", "apt", "yum".
---

# Linux Admin Guide

## Workflow

1. **Identifier le contexte système** — déterminer la distribution (Debian/Ubuntu, RHEL/CentOS, Arch), la version du noyau (`uname -r`), et l'architecture pour adapter les commandes et le gestionnaire de paquets approprié.

2. **Gestion des utilisateurs et groupes** — créer, modifier et supprimer des utilisateurs avec `useradd`, `usermod`, `userdel`, gérer les groupes avec `groupadd`/`groupmod`, configurer les mots de passe avec `passwd`, et vérifier les fichiers `/etc/passwd`, `/etc/shadow` et `/etc/group`.

3. **Configuration des permissions** — appliquer les permissions avec `chmod` (notation octale et symbolique), changer la propriété avec `chown` et `chgrp`, configurer les permissions spéciales (SUID, SGID, sticky bit), et utiliser les ACL (`setfacl`/`getfacl`) pour un contrôle fin.

4. **Gestion des services** — démarrer, arrêter et redémarrer les services avec `systemctl`, vérifier leur statut, activer ou désactiver le démarrage automatique avec `enable`/`disable`, et consulter les logs associés avec `journalctl -u <service>`.

5. **Planification des tâches** — configurer les tâches cron avec `crontab -e`, utiliser la syntaxe cron (minute, heure, jour, mois, jour de semaine), placer les scripts dans `/etc/cron.d/`, `/etc/cron.daily/`, et vérifier l'exécution avec les logs `/var/log/cron`.

6. **Gestion des paquets** — installer, mettre à jour et supprimer des paquets avec `apt`/`apt-get` (Debian) ou `yum`/`dnf` (RHEL), gérer les dépôts avec `add-apt-repository` ou les fichiers `.repo`, et nettoyer le cache avec `apt autoremove` ou `yum clean all`.

7. **Analyse des logs système** — consulter les logs avec `journalctl`, examiner `/var/log/syslog`, `/var/log/auth.log`, `/var/log/messages`, utiliser `tail -f` pour le suivi en temps réel, et configurer la rotation des logs avec `logrotate`.

8. **Gestion du stockage** — vérifier l'espace disque avec `df -h`, analyser l'utilisation avec `du -sh`, gérer les partitions avec `fdisk`/`parted`, monter les systèmes de fichiers avec `mount`/`fstab`, et surveiller la santé des disques avec `smartctl`.

## Règles

- Toujours tester les commandes critiques sur un environnement de staging avant la production — une erreur de `chmod -R` ou `chown -R` peut être désastreuse.
- Privilégier `sudo` pour les opérations root plutôt que de se connecter en root directement — tracer chaque action avec un utilisateur nommé.
- Documenter chaque modification système dans un fichier de changelog ou un outil de gestion de configuration (Ansible, Puppet).
- Vérifier les impacts avant de supprimer un paquet — utiliser `apt-get --simulate remove` ou `rpm -e --test` pour prévisualiser les dépendances affectées.
- Sauvegarder les fichiers de configuration avant toute modification avec un suffixe `.bak` ou via un système de versioning.
