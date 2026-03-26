---
name: linux-linux-troubleshooter
description: Diagnostic de problèmes Linux — performance, disque, mémoire, réseau et processus. Se déclenche avec "Linux lent", "top", "htop", "df", "dmesg", "strace", "debug Linux".
---

# Linux Troubleshooter

## Workflow

1. **Évaluation initiale du système** — obtenir une vue d'ensemble avec `uptime` (charge moyenne), `free -h` (mémoire), `df -h` (disque), `top` ou `htop` (processus), et `dmesg -T | tail` (messages noyau récents) pour identifier rapidement la catégorie de problème.

2. **Diagnostic CPU et processus** — analyser la charge avec `top` (trier par CPU avec `P`), identifier les processus gourmands avec `ps aux --sort=-%cpu`, tracer les appels système avec `strace -p <PID>`, et profiler avec `perf top` pour les problèmes de performance applicative.

3. **Diagnostic mémoire** — vérifier l'utilisation avec `free -h`, analyser le swap avec `swapon --show` et `vmstat 1`, identifier les fuites mémoire avec `smem` ou `/proc/<PID>/smaps`, et examiner l'OOM killer dans les logs (`dmesg | grep -i oom`).

4. **Diagnostic disque et I/O** — mesurer les performances I/O avec `iostat -x 1`, identifier les processus générant le plus d'I/O avec `iotop`, vérifier l'espace avec `df -h` et les inodes avec `df -i`, et chercher les gros fichiers avec `du -sh /* | sort -rh | head`.

5. **Diagnostic réseau** — tester la connectivité avec `ping` et `traceroute`, vérifier les interfaces avec `ip addr` et `ip route`, analyser les connexions avec `ss -tulnp` ou `netstat -tulnp`, capturer le trafic avec `tcpdump`, et tester les DNS avec `dig` ou `nslookup`.

6. **Analyse des logs** — examiner les logs système avec `journalctl -xe`, les logs d'authentification dans `/var/log/auth.log`, les messages noyau avec `dmesg -T`, et utiliser `grep -r "error\|fail\|critical" /var/log/` pour une recherche large des erreurs récentes.

7. **Diagnostic des services** — vérifier l'état des services avec `systemctl status <service>`, lister les services en échec avec `systemctl --failed`, examiner les dépendances avec `systemctl list-dependencies`, et tester les ports avec `curl` ou `telnet`.

8. **Résolution et documentation** — appliquer le correctif identifié, vérifier que le problème est résolu avec les mêmes outils de diagnostic, documenter la cause racine et la solution, et mettre en place un monitoring (Prometheus, Nagios, Zabbix) pour prévenir la récurrence.

## Règles

- Toujours collecter les métriques avant d'appliquer un correctif — comparer l'avant et l'après pour valider l'efficacité de la solution.
- Ne jamais tuer un processus (`kill -9`) sans d'abord comprendre pourquoi il consomme des ressources — un `kill -9` peut provoquer une corruption de données.
- Utiliser `strace` et `ltrace` avec parcimonie en production — ces outils ralentissent significativement le processus tracé.
- Documenter chaque incident avec la chronologie, les symptômes, la cause racine et la résolution pour constituer une base de connaissances.
- Privilégier les commandes en lecture seule pour le diagnostic initial — éviter toute action corrective tant que la cause racine n'est pas identifiée.
