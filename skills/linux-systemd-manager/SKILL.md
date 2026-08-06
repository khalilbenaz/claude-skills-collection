---
name: linux-systemd-manager
description: Gestion de services avec systemd — units, timers, journalctl, boot et dépendances entre services. Se déclenche avec "systemd", "systemctl", "service Linux", "journalctl", "unit file", "timer systemd". Also triggers on "systemd unit", "systemd timer", "journalctl logs".
---

# Systemd Manager

## Workflow

### 1. Identifier le besoin et le type d'unité

| Besoin | Type d'unité |
|---|---|
| Démon applicatif | `.service` |
| Tâche planifiée | `.timer` + `.service` |
| Démarrage sur connexion réseau | `.socket` |
| Montage de système de fichiers | `.mount` / `.automount` |
| Regrouper des services | `.target` |
| Surveiller un fichier/dossier | `.path` |

Vérifier si une unité existe déjà :
```bash
systemctl list-unit-files | grep monapp
systemctl cat monapp.service        # lire le fichier actuel
```

---

### 2. Créer un fichier `.service`

Emplacement : `/etc/systemd/system/monapp.service`

```ini
[Unit]
Description=Mon application Go
Documentation=https://example.com/docs
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple                   # simple | forking | oneshot | notify | idle
User=monapp
Group=monapp
WorkingDirectory=/opt/monapp
ExecStart=/opt/monapp/bin/monapp --config /etc/monapp/config.yaml
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5s
StartLimitIntervalSec=60s
StartLimitBurst=3

# Sécurité minimale recommandée
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/var/lib/monapp /var/log/monapp

# Variables d'environnement
EnvironmentFile=-/etc/monapp/env       # le "-" rend le fichier optionnel
Environment="LOG_LEVEL=info"

[Install]
WantedBy=multi-user.target
```

Activer et démarrer :
```bash
systemctl daemon-reload
systemctl enable --now monapp.service
systemctl status monapp.service
```

---

### 3. Créer un timer (remplacement cron)

Deux fichiers du même nom (`backup.timer` + `backup.service`) :

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Sauvegarde quotidienne à 2h

[Timer]
OnCalendar=*-*-* 02:00:00      # syntaxe calendaire
RandomizedDelaySec=300          # étalement aléatoire jusqu'à 5 min
Persistent=true                 # rattraper si machine éteinte à l'heure prévue

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Script de sauvegarde

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
User=backup
```

```bash
systemctl enable --now backup.timer
systemctl list-timers --all          # voir prochaine activation
```

Syntaxes `OnCalendar=` utiles :
```
daily                    # 00:00:00 chaque jour
weekly                   # lundi 00:00
Mon-Fri 09:00            # jours ouvrés à 9h
*:0/15                   # toutes les 15 minutes
2026-*-1 00:00           # 1er de chaque mois
```

---

### 4. Cycle de vie et commandes essentielles

```bash
# Contrôle
systemctl start|stop|restart|reload monapp
systemctl enable|disable monapp        # activation au boot
systemctl mask|unmask monapp           # empêche tout démarrage
systemctl status monapp                # état + dernières lignes de log

# Introspection
systemctl show monapp                  # toutes les propriétés
systemctl list-dependencies monapp     # arbre de dépendances
systemctl list-units --state=failed    # services en erreur

# Modifier sans casser
systemctl edit monapp                  # drop-in dans /etc/systemd/system/monapp.d/override.conf
systemctl edit --full monapp           # copie complète éditable
systemctl revert monapp                # supprimer les drop-ins
```

Après toute modification de fichier unit :
```bash
systemctl daemon-reload
```

---

### 5. Analyser les logs avec journalctl

```bash
# Basique
journalctl -u monapp                   # tous les logs de l'unité
journalctl -u monapp -n 100 --no-pager # 100 dernières lignes
journalctl -u monapp -f                # suivi temps réel

# Filtres temporels
journalctl -u monapp --since "1 hour ago"
journalctl -u monapp --since "2026-06-24 08:00" --until "2026-06-24 09:00"

# Filtres par priorité (0=emerg à 7=debug)
journalctl -u monapp -p err            # erreurs et au-dessus
journalctl -u monapp -p warning..err  # plage de priorités

# Boots précédents
journalctl --list-boots                # liste des boots enregistrés
journalctl -u monapp -b -1             # boot précédent

# Export
journalctl -u monapp -o json-pretty    # JSON structuré
journalctl -u monapp --output=cat      # lignes brutes sans métadonnées

# Purge (libérer de l'espace)
journalctl --vacuum-size=500M
journalctl --vacuum-time=30d
```

---

### 6. Diagnostiquer les problèmes de boot

```bash
systemd-analyze                        # temps total de boot
systemd-analyze blame                  # services triés par durée de démarrage
systemd-analyze critical-chain         # chemin critique (goulot d'étranglement)
systemd-analyze plot > boot.svg        # graphe SVG du boot
systemd-analyze verify monapp.service  # valider la syntaxe d'un unit file
```

---

### 7. Sécuriser un service

Évaluer le score de sécurité actuel :
```bash
systemd-analyze security monapp.service
```

Options de sandboxing par ordre d'impact :
```ini
[Service]
NoNewPrivileges=yes            # interdit l'escalade de privilèges
ProtectSystem=strict           # / en lecture seule (sauf /dev, /proc, /sys)
ProtectHome=yes                # /home, /root, /run/user inaccessibles
PrivateTmp=yes                 # /tmp isolé pour ce service
PrivateDevices=yes             # pas d'accès aux devices raw
ProtectKernelTunables=yes      # /proc/sys en lecture seule
ProtectControlGroups=yes       # cgroups en lecture seule
RestrictSUIDSGID=yes           # interdit création de fichiers SUID/SGID
SystemCallFilter=@system-service  # whitelist d'appels système
CapabilityBoundingSet=         # vide = aucune capability
AmbientCapabilities=           # vide = aucune capability ambiante
```

---

## Garde-fous / Anti-patterns

**Ne jamais modifier `/lib/systemd/system/`** — écrasé à chaque mise à jour du paquet. Toujours utiliser `/etc/systemd/system/` ou `systemctl edit`.

**Oublier `daemon-reload`** après modification d'un fichier unit : systemd continue d'utiliser la version en mémoire. Le service peut sembler "fonctionner" avec la vieille config.

**`Type=forking` mal configuré** sans `PIDFile=` : systemd ne peut pas suivre le PID du processus fils et le considère mort immédiatement.

**Boucle de redémarrage infinie** avec `Restart=always` sans `StartLimitBurst` : un service qui plante immédiatement monopolise les ressources. Toujours coupler :
```ini
Restart=on-failure
RestartSec=10s
StartLimitIntervalSec=120s
StartLimitBurst=5
```

**`After=network.target` insuffisant** pour les services qui ont besoin d'une IP assignée : utiliser `After=network-online.target` + `Wants=network-online.target`.

**Variables d'env dans ExecStart** via `$VAR` sans les déclarer dans `Environment=` ou `EnvironmentFile=` : elles ne sont PAS héritées du shell courant.

**Timer sans `Persistent=true`** pour les tâches critiques : si la machine est éteinte à l'heure prévue, la tâche ne sera jamais rattrapée.

---

## Bonnes pratiques 2026

- **Prefer `Type=notify`** pour les services modernes qui supportent `sd_notify()` — systemd sait exactement quand le service est prêt.
- **Utiliser `RuntimeDirectory=` / `StateDirectory=` / `LogsDirectory=`** plutôt que de créer les dossiers manuellement dans les scripts d'init.
- **Isoler les credentials** avec `LoadCredential=` (systemd 247+) : stocker les secrets hors de l'EnvironmentFile, accessibles via `$CREDENTIALS_DIRECTORY`.
- **Activer le rate-limiting des logs** via `LogRateLimitIntervalSec=` et `LogRateLimitBurst=` pour éviter la saturation du journal sur un service verbeux.
- **Versionner les unit files** dans un dépôt Git et les déployer via Ansible/Salt — pas de modification manuelle en production.
- **Tester la syntaxe** avant de déployer : `systemd-analyze verify /etc/systemd/system/monapp.service`.


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
