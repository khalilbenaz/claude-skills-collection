---
name: automation-script-automation-expert
description: Automatisation par scripts (PowerShell, Python, Bash) pour tâches répétitives — cron jobs, batch processing et orchestration. Se déclenche avec "automatiser", "script d'automatisation", "tâche répétitive", "batch", "cron job", "PowerShell automation". Also triggers on "automate a repetitive task", "cron job script", "batch processing script".
---

# Script Automation Expert

## 1. Choisir le bon langage

| Critère | Bash | PowerShell | Python |
|---|---|---|---|
| OS cible | Linux/macOS | Windows/Azure | Cross-platform |
| Manipulation fichiers | ✅ natif | ✅ natif | ✅ via `pathlib` |
| API REST | `curl` | `Invoke-RestMethod` | `requests` / `httpx` |
| Parsing JSON/XML | `jq` requis | natif `ConvertFrom-Json` | natif `json` |
| Disponibilité par défaut | Linux/macOS | Windows Server 2016+ | à installer |
| Tests unitaires | `bats` | `Pester` | `pytest` |

**Règle** : si le script tourne sur plusieurs OS ou consomme des API complexes → Python. Si c'est pur Windows/AD/Azure → PowerShell. Si c'est du glue CLI Linux → Bash.

---

## 2. Workflow en étapes

### Étape 1 — Analyser et cadrer

Avant d'écrire une ligne de code, répondre à :
- Entrées/sorties : fichiers, API, base de données ?
- Fréquence : unitaire, planifié, déclenché sur événement ?
- Volume : combien d'items par exécution ?
- Dépendances système : outils CLI, credentials, réseau ?
- Idempotence requise ? (re-run sans effet de bord)

### Étape 2 — Structurer le script

Modèle Python minimal production-ready :

```python
#!/usr/bin/env python3
"""process_invoices.py — traitement batch des factures."""

import argparse, logging, sys
from pathlib import Path
from datetime import datetime

LOG_FORMAT = "%(asctime)s %(levelname)s %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT,
                    handlers=[logging.StreamHandler(),
                               logging.FileHandler(f"run_{datetime.now():%Y%m%d}.log")])
log = logging.getLogger(__name__)

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--input-dir", required=True)
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()

def process(path: Path, dry_run: bool) -> bool:
    log.info("Traitement %s", path.name)
    if dry_run:
        log.info("[DRY-RUN] %s ignoré", path.name)
        return True
    # ... logique métier ici
    return True

def main():
    args = parse_args()
    errors = 0
    for f in Path(args.input_dir).glob("*.csv"):
        if not process(f, args.dry_run):
            errors += 1
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
```

Modèle PowerShell équivalent :

```powershell
#Requires -Version 7
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$InputDir = "C:\data\invoices",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$logFile = "run_$(Get-Date -Format yyyyMMdd).log"

function Write-Log { param([string]$Msg, [string]$Level = "INFO")
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Msg"
    Add-Content $logFile $line; Write-Host $line }

try {
    Get-ChildItem $InputDir -Filter "*.csv" | ForEach-Object {
        Write-Log "Traitement $($_.Name)"
        if (-not $DryRun) {
            # logique métier ici
        } else { Write-Log "[DRY-RUN] $($_.Name) ignoré" }
    }
} catch {
    Write-Log $_.Exception.Message "ERROR"
    exit 1
}
```

### Étape 3 — Externaliser la configuration

Ne jamais hardcoder. Utiliser selon le contexte :

```bash
# Bash : fichier .env
source .env
# ou inline
DB_HOST="${DB_HOST:-localhost}"
```

```python
# Python : config.yaml + python-dotenv
from dotenv import load_dotenv; load_dotenv()
import os
DB_HOST = os.environ["DB_HOST"]  # erreur explicite si absent
```

```powershell
# PowerShell : fichier JSON
$cfg = Get-Content config.json | ConvertFrom-Json
$cfg.DbHost
```

Jamais de credential en clair. Options par priorité :
1. Variables d'environnement injectées par le scheduler/CI
2. Azure Key Vault / AWS Secrets Manager / HashiCorp Vault
3. Fichier protégé hors dépôt Git (`chmod 600`)

### Étape 4 — Gestion d'erreurs et retries

```python
import time, functools

def retry(max_attempts=3, backoff=2.0, exceptions=(Exception,)):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    wait = backoff ** attempt
                    log.warning("Tentative %d/%d échouée (%s) — retry dans %.1fs",
                                attempt, max_attempts, e, wait)
                    time.sleep(wait)
        return wrapper
    return decorator

@retry(max_attempts=3, exceptions=(requests.Timeout, requests.ConnectionError))
def fetch_data(url: str) -> dict:
    return requests.get(url, timeout=10).json()
```

### Étape 5 — Planifier l'exécution

**Cron Linux** — toujours rediriger stderr :
```cron
# Toutes les nuits à 02h30, log complet
30 2 * * * /usr/bin/python3 /opt/scripts/process.py --input-dir /data >> /var/log/process.log 2>&1
```

**systemd timer** (préférable à cron pour les services) :
```ini
# /etc/systemd/system/process.timer
[Unit]
Description=Process invoices nightly

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Windows Task Scheduler via PowerShell** :
```powershell
$action  = New-ScheduledTaskAction -Execute "pwsh" -Argument "-File C:\scripts\process.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "02:30"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName "ProcessInvoices" -Action $action `
    -Trigger $trigger -Settings $settings -RunLevel Highest
```

### Étape 6 — Alertes en cas d'échec

```python
import smtplib
from email.message import EmailMessage

def alert_failure(script_name: str, error: str):
    msg = EmailMessage()
    msg["Subject"] = f"[ALERTE] {script_name} en échec"
    msg["From"] = "monitoring@company.com"
    msg["To"] = "team@company.com"
    msg.set_content(f"Erreur:\n{error}")
    with smtplib.SMTP("smtp.company.com") as s:
        s.send_message(msg)
```

Slack (webhook) :
```bash
curl -s -X POST "$SLACK_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"❌ *process.sh* en échec : $ERROR_MSG\"}"
```

### Étape 7 — Tester

```bash
# Pré-commit : dry-run obligatoire
python process.py --input-dir test/fixtures --dry-run

# Tests pytest
pytest tests/ -v --tb=short
```

```powershell
# Pester
Invoke-Pester tests/ -Output Detailed
```

### Étape 8 — Versionner et documenter

Structure de dépôt minimale :
```
my-script/
├── process.py          # script principal
├── config.yaml.example # template de config (jamais le vrai)
├── requirements.txt
├── tests/
│   └── test_process.py
└── README.md           # installation, usage, variables requises
```

---

## 3. Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Credentials hardcodés | Fuite dans Git | Variables d'env / Vault |
| Pas de dry-run | Données corrompues en test | `--dry-run` systématique |
| Script non-idempotent | Doublons / effets de bord | Vérifier si déjà traité avant d'agir |
| Pas de logs | Débogage impossible | Logger chaque action significative |
| `rm -rf` sans vérification | Perte de données | Vérifier le chemin, demander confirmation |
| Ignorer le code de retour | Erreurs silencieuses | `set -euo pipefail` (Bash) / `$ErrorActionPreference = "Stop"` |
| Timeout absent sur les appels réseau | Blocage infini | Toujours définir un timeout explicite |
| Script monolithique | Maintenance impossible | Fonctions < 30 lignes, modules séparés |

---

## 4. Bonnes pratiques 2026

- **`set -euo pipefail`** en tête de tout script Bash — stoppe à la première erreur, détecte les variables non définies, propage les échecs dans les pipes.
- **`uv`** remplace `pip` + `venv` pour Python : `uv run process.py` gère l'environnement isolé sans setup préalable.
- **Structured logging JSON** en production (Python `structlog`, PowerShell `Write-Information` avec tags) pour l'ingestion dans ELK/Loki.
- **Limite de durée** sur les tâches planifiées : toujours définir un timeout max pour éviter les runs zombies.
- **Atomicité** : écrire dans un fichier `.tmp` puis renommer — jamais écrire directement le fichier destination (évite les lectures partielles).
- **Rapport d'exécution** : en fin de run, afficher `Succès: N | Échecs: M | Durée: Xs` — facilite le monitoring sans ouvrir les logs.


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
