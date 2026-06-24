---
name: security-dependency-audit
description: Audit de sécurité des dépendances — détection de vulnérabilités connues, mises à jour critiques et gestion du cycle de vie des packages. À utiliser quand l'utilisateur veut vérifier la sécurité de ses dépendances, mettre à jour des packages vulnérables ou mettre en place un processus d'audit continu. Se déclenche aussi avec "audit dépendances", "vulnérabilité npm", "CVE", "dépendance vulnérable", "npm audit", "dotnet audit", "supply chain security", "dependabot".
---

# Audit de Sécurité des Dépendances

## Workflow en 5 étapes

### 1. Scanner — détecter les vulnérabilités

Lancer l'outil natif de l'écosystème, **toujours avec les transitives** :

```bash
# .NET
dotnet list package --vulnerable --include-transitive

# npm / pnpm / yarn
npm audit --json
pnpm audit --json
yarn npm audit --json

# Python
pip-audit -r requirements.txt --output json

# Go
govulncheck ./...

# Rust
cargo audit

# Multi-écosystème (recommandé en CI)
trivy fs . --scanners vuln --exit-code 1
```

### 2. Évaluer — prioriser par impact réel

Ne pas traiter toutes les CVE de la même façon. Critères de décision :

| Critère | Poids | Question à se poser |
|---|---|---|
| CVSS score | élevé | ≥ 7.0 = traiter en priorité |
| Exploitabilité | très élevé | Existe-t-il un exploit public (Exploit DB, PoC GitHub) ? |
| Accessibilité du code vulnérable | critique | Mon code appelle-t-il la fonction vulnérable ? |
| Exposition réseau | élevé | Le service est-il exposé sur Internet ? |
| Sévérité pour le domaine | modéré | Injection SQL ≠ DoS selon le contexte métier |

**Règle pratique** : une CVE High sur une lib utilisée uniquement en CLI de dev vaut moins qu'une CVE Medium sur un endpoint public.

### 3. Corriger — stratégies par cas

```bash
# Cas 1 : mise à jour mineure/patch disponible (idéal)
npm update <package>
dotnet add package <Package> --version <X.Y.Z>

# Cas 2 : la version fixée n'est pas compatible (conflict)
# → overrides npm (forcer une version transitive)
# package.json :
# "overrides": { "vulnerable-dep": ">=4.2.1" }

# Cas 3 : pas de fix disponible → remplacer ou isoler
# - Chercher un fork actif ou un package alternatif
# - Wrapper la lib pour limiter la surface d'attaque
# - Ajouter un contrôle applicatif (validation d'entrée) en attendant

# Cas 4 : faux positif documenté → ignorer avec justification
npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.severity=="high")'
# Puis documenter dans .auditignore / .snyk / audit-ignore.json
```

### 4. Générer un SBOM — inventaire des dépendances

```bash
# CycloneDX (standard recommandé 2025-2026)
# .NET
dotnet CycloneDX . -o ./sbom -j   # JSON

# npm
npx @cyclonedx/cyclonedx-npm --output-format JSON --output-file sbom.json

# Python
cyclonedx-py environment -o sbom.json

# Universel avec Syft
syft . -o cyclonedx-json=sbom.json
```

Stocker le SBOM en artifact CI et le comparer entre versions pour détecter les régressions.

### 5. Automatiser — CI/CD et alertes

#### GitHub Actions (polyglotte)

```yaml
name: Dependency Audit
on:
  pull_request:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 7 * * 1'  # lundi 7h

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # .NET
      - name: .NET audit
        run: |
          dotnet restore
          dotnet list package --vulnerable --include-transitive 2>&1 | tee audit.txt
          grep -q "has the following vulnerable packages" audit.txt && exit 1 || true

      # npm
      - name: npm audit
        working-directory: ./frontend
        run: npm ci && npm audit --audit-level=high

      # Scan universel (fallback)
      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          exit-code: '1'
          severity: 'HIGH,CRITICAL'
          format: sarif
          output: trivy.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy.sarif
```

#### Dependabot

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
    groups:
      minor-patch:
        update-types: ["minor", "patch"]

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    versioning-strategy: increase-if-necessary
```

## SLA de correction

| Sévérité | CVSS | Délai | Action |
|---|---|---|---|
| **Critique** | 9.0–10.0 | 24 h | Hotfix immédiat, bloquer le merge |
| **Haute** | 7.0–8.9 | 7 jours | Sprint courant, bloquer le merge |
| **Moyenne** | 4.0–6.9 | 30 jours | Planifier, ne bloque pas (sauf exposition réseau) |
| **Basse** | 0.1–3.9 | 90 jours | Maintenance ordinaire |

## Garde-fous et anti-patterns

**Ne pas faire :**
- `npm audit fix --force` sans lire ce qui change — peut introduire des breaking changes majeurs en cascade.
- Ignorer une CVE sans documenter la raison et une date de réévaluation.
- N'auditer que les dépendances directes — les transitives représentent ~80 % des vulnérabilités remontées.
- Supprimer le step d'audit de la CI "pour débloquer le build" — c'est exactement là que des incidents se produisent.
- Faire confiance à un seul scanner — coupler l'outil natif + un scanner généraliste (Trivy, Snyk).

**Pièges courants :**
- `dotnet list package --vulnerable` nécessite une connexion à NuGet.org ; en environnement air-gapped, utiliser OWASP Dependency-Check avec un NVD local.
- `npm audit` rapporte des vulnérabilités dans des `devDependencies` non embarquées en production : filtrer avec `--omit=dev` pour les audits de surface de déploiement.
- Les forks privés et les packages internes n'apparaissent pas dans les bases CVE publiques — prévoir un scan de composition du code source (SAST) en complément.
- Un SBOM obsolète de 2 semaines peut masquer une nouvelle CVE publiée — programmer la génération à chaque release.

## Bonnes pratiques 2026

- **Lock files obligatoires** : `package-lock.json`, `poetry.lock`, `Cargo.lock`, `packages.lock.json` (.NET) — committer et vérifier leur intégrité en CI (`npm ci` vs `npm install`).
- **Vérification d'intégrité supply-chain** : activer Sigstore/cosign pour les images Docker, vérifier les checksums des packages critiques.
- **Score OpenSSF** : intégrer la vérification du Scorecard des dépendances critiques (`ossf/scorecard-action`).
- **Politique de rétention** : définir une version minimale supportée par lib et automatiser les alertes de fin de vie (endoflife.date API).
- **Audit interne périodique** : revue trimestrielle manuelle des dépendances à fort risque (auth, crypto, parsing XML/YAML).


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
