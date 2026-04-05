---
name: security-dependency-audit
description: Audit de sécurité des dépendances — détection de vulnérabilités connues, mises à jour critiques et gestion du cycle de vie des packages. À utiliser quand l'utilisateur veut vérifier la sécurité de ses dépendances, mettre à jour des packages vulnérables ou mettre en place un processus d'audit continu. Se déclenche aussi avec "audit dépendances", "vulnérabilité npm", "CVE", "dépendance vulnérable", "npm audit", "dotnet audit", "supply chain security", "dependabot".
---

# Audit de Sécurité des Dépendances

## Workflow

1. **Scanner** : identifier les vulnérabilités connues (CVE) dans les dépendances.
2. **Évaluer** : prioriser par sévérité (critique > haute > moyenne > basse).
3. **Corriger** : mettre à jour, patcher ou remplacer.
4. **Automatiser** : CI/CD, Dependabot, alertes.

## Outils par écosystème

| Écosystème | Outil natif | Outil avancé |
|-----------|-------------|--------------|
| **.NET** | `dotnet list package --vulnerable` | Snyk, OWASP Dependency-Check |
| **npm** | `npm audit` | Snyk, Socket.dev |
| **Python** | `pip-audit` | Safety, Snyk |
| **Go** | `govulncheck` | Snyk |
| **Rust** | `cargo audit` | — |

## Commandes d'audit

### .NET

```bash
# Lister les packages vulnérables
dotnet list package --vulnerable --include-transitive

# Format JSON pour CI
dotnet list package --vulnerable --format json

# Mettre à jour un package spécifique
dotnet add package PackageName --version X.Y.Z
```

### npm

```bash
# Audit complet
npm audit

# Audit avec fix automatique (non-breaking)
npm audit fix

# Rapport JSON pour CI
npm audit --json

# Fix incluant les major versions (attention !)
npm audit fix --force
```

### Python

```bash
# Avec pip-audit
pip-audit
pip-audit --fix
pip-audit -r requirements.txt

# Avec safety
safety check -r requirements.txt
```

## Intégration CI/CD

### GitHub Actions

```yaml
name: security-dependency-audit
on:
  schedule:
    - cron: '0 8 * * 1'  # Chaque lundi à 8h
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: .NET Audit
        run: |
          dotnet restore
          dotnet list package --vulnerable --include-transitive 2>&1 | tee audit.txt
          if grep -q "has the following vulnerable packages" audit.txt; then
            echo "::error::Vulnérabilités détectées"
            exit 1
          fi

      - name: npm Audit
        working-directory: ./frontend
        run: npm audit --audit-level=high
```

### Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "nuget"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels: ["dependencies", "security"]
    reviewers: ["team-security"]

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
```

## Processus de correction

| Sévérité | SLA de correction | Action |
|----------|------------------|--------|
| **Critique** (CVSS 9-10) | 24 heures | Patch immédiat, hotfix si nécessaire |
| **Haute** (CVSS 7-8.9) | 7 jours | Inclure dans le prochain sprint |
| **Moyenne** (CVSS 4-6.9) | 30 jours | Planifier la mise à jour |
| **Basse** (CVSS 0-3.9) | 90 jours | Inclure dans la maintenance |

## Règles
- L'audit de dépendances doit tourner **automatiquement** en CI sur chaque PR.
- Les vulnérabilités **critiques** et **hautes** doivent bloquer le merge.
- Revoir les dépendances **transitives** (pas seulement les directes).
- Maintenir un **inventaire** (SBOM) des dépendances de chaque projet.
- Ne jamais ignorer un audit échoué sans documenter la raison.


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
