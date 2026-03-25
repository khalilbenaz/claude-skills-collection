---
name: script-automation-expert
description: Automatisation par scripts (PowerShell, Python, Bash) pour tâches répétitives — cron jobs, batch processing et orchestration. Se déclenche avec "automatiser", "script d'automatisation", "tâche répétitive", "batch", "cron job", "PowerShell automation".
---

# Script Automation Expert

## Workflow

1. **Analyser la tâche répétitive** — identifier précisément les étapes manuelles à automatiser, les entrées/sorties attendues, la fréquence d'exécution, les dépendances système, et choisir le langage approprié (Bash pour Linux/CLI, PowerShell pour Windows/Azure, Python pour cross-platform/API).

2. **Concevoir l'architecture du script** — structurer le script avec un point d'entrée clair, des fonctions modulaires réutilisables, un fichier de configuration externe (YAML, JSON, `.env`) pour les paramètres variables, et un système de logging pour le suivi des exécutions.

3. **Implémenter la gestion des fichiers et données** — automatiser la lecture/écriture de fichiers (CSV, JSON, XML, Excel), le déplacement et renommage en batch, la compression/archivage, le nettoyage de fichiers anciens, et la synchronisation entre répertoires avec gestion des conflits.

4. **Intégrer les API et services externes** — utiliser les bibliothèques HTTP (`requests` en Python, `Invoke-RestMethod` en PowerShell, `curl` en Bash) pour interagir avec les API REST, gérer l'authentification (API keys, OAuth, tokens), et parser les réponses JSON/XML.

5. **Planifier l'exécution automatique** — configurer les cron jobs (Linux) avec `crontab`, les Task Scheduler (Windows) avec `schtasks` ou PowerShell `Register-ScheduledTask`, ou les timers systemd, en incluant la redirection des logs et la notification en cas d'échec.

6. **Implémenter la gestion d'erreurs robuste** — utiliser les blocs try/catch/finally (Python, PowerShell) ou `trap` (Bash), implémenter les retries avec backoff exponentiel pour les opérations réseau, logger les erreurs avec contexte, et envoyer des alertes (email, Slack) en cas d'échec critique.

7. **Tester et valider** — écrire des tests unitaires pour les fonctions critiques (pytest, Pester, bats), tester avec des données réelles dans un environnement de staging, simuler les cas d'erreur (timeout, fichier manquant, permission refusée), et valider les performances sur le volume attendu.

8. **Déployer et maintenir** — versionner le script dans Git, documenter l'installation et la configuration dans un README, créer un mécanisme de mise à jour, monitorer les exécutions planifiées, et réviser régulièrement le script pour l'adapter aux changements d'API ou d'environnement.

## Règles

- Toujours externaliser les paramètres configurables (chemins, credentials, seuils) dans un fichier de configuration — ne jamais coder en dur les valeurs qui peuvent changer entre environnements.
- Implémenter un système de logging dès le début avec horodatage, niveau de sévérité et contexte — un script sans logs est impossible à déboguer en production.
- Rendre chaque script idempotent — une ré-exécution ne doit pas dupliquer les données ni provoquer d'effets de bord indésirables.
- Ne jamais stocker les credentials en clair dans les scripts — utiliser des variables d'environnement, des gestionnaires de secrets (Vault, Azure Key Vault), ou des fichiers protégés avec permissions restrictives.
- Inclure un mode dry-run (`--dry-run`) qui affiche les actions sans les exécuter — indispensable pour valider le comportement avant l'exécution réelle.
