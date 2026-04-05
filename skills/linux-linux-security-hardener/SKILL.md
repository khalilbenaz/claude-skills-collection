---
name: linux-linux-security-hardener
description: Durcissement sécurité Linux — SSH, fail2ban, SELinux, audit, gestion des utilisateurs et mises à jour. Se déclenche avec "sécurité Linux", "hardening Linux", "SSH sécurisé", "fail2ban", "SELinux", "audit Linux".
---

# Linux Security Hardener

## Workflow

1. **Audit de sécurité initial** — scanner le système avec `lynis audit system` pour obtenir un score de sécurité global, identifier les points faibles, vérifier les ports ouverts avec `ss -tulnp`, et lister les utilisateurs avec des shells interactifs dans `/etc/passwd`.

2. **Durcissement SSH** — modifier `/etc/ssh/sshd_config` pour désactiver l'accès root (`PermitRootLogin no`), imposer l'authentification par clé (`PasswordAuthentication no`), changer le port par défaut, limiter les utilisateurs autorisés (`AllowUsers`), et configurer `MaxAuthTries`, `ClientAliveInterval` et `ClientAliveCountMax`.

3. **Configuration fail2ban** — installer et configurer fail2ban pour protéger SSH et autres services, définir les paramètres `maxretry`, `bantime`, `findtime` dans `/etc/fail2ban/jail.local`, créer des filtres personnalisés si nécessaire, et vérifier les bans actifs avec `fail2ban-client status sshd`.

4. **Gestion des utilisateurs et privilèges** — appliquer le principe du moindre privilège, configurer `sudo` avec des règles granulaires dans `/etc/sudoers.d/`, désactiver les comptes inutilisés (`usermod -L`), imposer des politiques de mots de passe forts avec `pam_pwquality`, et configurer l'expiration avec `chage`.

5. **Configuration SELinux/AppArmor** — activer SELinux en mode `enforcing` (ou AppArmor sur Ubuntu), vérifier les contextes avec `ls -Z`, résoudre les AVC denials avec `ausearch -m AVC` et `audit2allow`, créer des politiques personnalisées si nécessaire, et utiliser `sestatus` pour vérifier l'état.

6. **Audit et surveillance** — configurer `auditd` avec des règles dans `/etc/audit/rules.d/` pour surveiller les fichiers critiques (`/etc/passwd`, `/etc/shadow`, `/etc/sudoers`), les commandes privilégiées, et les accès réseau, puis analyser avec `ausearch` et `aureport`.

7. **Mises à jour et gestion des vulnérabilités** — configurer les mises à jour automatiques de sécurité avec `unattended-upgrades` (Debian) ou `dnf-automatic` (RHEL), vérifier les CVE avec `apt list --upgradable` ou `yum updateinfo`, et planifier les redémarrages pour les mises à jour noyau.

## Règles

- Appliquer le principe de défense en profondeur — ne jamais compter sur une seule mesure de sécurité, combiner pare-feu, contrôle d'accès, chiffrement et surveillance.
- Tester chaque modification de sécurité avant de verrouiller l'accès — garder toujours une session SSH ouverte pendant la modification de `sshd_config` pour éviter de se retrouver exclu.
- Ne jamais désactiver SELinux/AppArmor pour résoudre un problème — identifier et corriger la politique plutôt que de contourner la protection.
- Automatiser les audits de sécurité avec des scans réguliers (Lynis, OpenSCAP) et alerter sur les régressions.
- Documenter toutes les exceptions de sécurité avec une justification, un responsable et une date de révision.


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
