---
name: linux-systemd-manager
description: Gestion de services avec systemd — units, timers, journalctl, boot et dépendances entre services. Se déclenche avec "systemd", "systemctl", "service Linux", "journalctl", "unit file", "timer systemd".
---

# Systemd Manager

## Workflow

1. **Comprendre l'architecture systemd** — identifier les types d'unités (service, timer, socket, mount, target, path), comprendre l'arborescence des fichiers (`/etc/systemd/system/` pour les personnalisations, `/lib/systemd/system/` pour les unités fournies par les paquets), et utiliser `systemctl list-units` pour l'état global.

2. **Créer un fichier unit service** — rédiger un fichier `.service` avec les sections `[Unit]` (description, dépendances `After=`, `Requires=`, `Wants=`), `[Service]` (type, ExecStart, ExecReload, Restart, User, WorkingDirectory, Environment), et `[Install]` (WantedBy pour le target de démarrage).

3. **Configurer les timers** — remplacer les cron jobs par des timers systemd en créant un fichier `.timer` avec `OnCalendar=` (syntaxe calendaire) ou `OnBootSec=`/`OnUnitActiveSec=` (monotonic), associer le timer à son service correspondant, et activer avec `systemctl enable --now mon-timer.timer`.

4. **Gérer le cycle de vie des services** — démarrer (`start`), arrêter (`stop`), redémarrer (`restart`), recharger la configuration (`reload`), vérifier le statut (`status`), et utiliser `daemon-reload` après chaque modification d'un fichier unit pour recharger la configuration systemd.

5. **Analyser les logs avec journalctl** — filtrer par unité (`-u service`), par priorité (`-p err`), par période (`--since`, `--until`), suivre en temps réel (`-f`), afficher les boots précédents (`-b -1`), et exporter les logs au format JSON (`-o json-pretty`).

6. **Gérer les dépendances et l'ordre de boot** — utiliser `systemd-analyze` pour mesurer le temps de démarrage, `systemd-analyze blame` pour identifier les services lents, `systemd-analyze critical-chain` pour la chaîne critique, et configurer les dépendances avec `Before=`, `After=`, `Requires=`, `Wants=`.

7. **Sécuriser les services** — appliquer les options de sandboxing : `ProtectSystem=strict`, `ProtectHome=yes`, `NoNewPrivileges=yes`, `PrivateTmp=yes`, `ReadOnlyPaths=`, et utiliser `systemd-analyze security <service>` pour évaluer le score de sécurité.

## Règles

- Toujours exécuter `systemctl daemon-reload` après toute modification d'un fichier unit — sans cela, systemd utilise l'ancienne version en mémoire.
- Placer les unités personnalisées dans `/etc/systemd/system/` et non dans `/lib/systemd/system/` — ce dernier est géré par le gestionnaire de paquets et sera écrasé lors des mises à jour.
- Configurer `Restart=on-failure` et `RestartSec=5s` pour les services critiques afin d'assurer la résilience automatique sans boucle de redémarrage trop rapide.
- Utiliser les overrides avec `systemctl edit <service>` plutôt que modifier directement les fichiers unit fournis par les paquets — cela crée un fichier drop-in dans `/etc/systemd/system/<service>.d/`.
- Toujours vérifier les logs avec `journalctl -u <service> -n 50 --no-pager` avant de déclarer un service fonctionnel.
