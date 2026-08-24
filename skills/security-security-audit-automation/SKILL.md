---
name: security-security-audit-automation
description: Automatisation d'audits de sécurité incluant scanning, reporting, intégration CI/CD et remediation tracking. Se déclenche avec "audit automatisé", "security scanning", "SAST", "DAST", "Trivy", "Snyk", "audit CI/CD. Also triggers on "automate security scans", "security in CI/CD", "continuous security audit".
---

# Security Audit Automation

## 1. Définir le périmètre

Avant tout outil, cartographier précisément :

| Asset | Outils recommandés | Priorité |
|---|---|---|
| Code source | Semgrep, CodeQL, SonarQube | Haute |
| Dépendances (SCA) | Trivy, Snyk, Grype | Haute |
| Images Docker | Trivy, Anchore, Grype | Haute |
| Infrastructure as Code | Checkov, tfsec, kics | Moyenne |
| APIs / Web apps (DAST) | OWASP ZAP, Nuclei, Burp Suite | Moyenne |
| Secrets dans le code | Gitleaks, TruffleHog | Critique |

Référentiels de vulnérabilités cibles : OWASP Top 10 (2021), CWE Top 25, NIST NVD (CVE).

---

## 2. SAST — Analyse statique du code

### Semgrep (polyglotte, règles custom)
```bash
# Installation
pip install semgrep

# Scan avec ruleset OWASP
semgrep scan --config "p/owasp-top-ten" --sarif -o semgrep.sarif ./src

# Règle custom (ex: interdire MD5)
# fichier: rules/no-md5.yaml
# rules:
#   - id: no-md5
#     pattern: hashlib.md5(...)
#     message: "MD5 interdit, utiliser SHA-256"
#     languages: [python]
#     severity: ERROR
semgrep scan --config rules/ ./src
```

### CodeQL (GitHub Actions)
```yaml
# .github/workflows/codeql.yml
- uses: github/codeql-action/init@v3
  with:
    languages: javascript, python
    queries: security-extended
- uses: github/codeql-action/analyze@v3
  with:
    output: codeql-results.sarif
```

### SonarQube — quality gate bloquant
```bash
sonar-scanner \
  -Dsonar.projectKey=mon-projet \
  -Dsonar.sources=./src \
  -Dsonar.qualitygate.wait=true \   # bloque le pipeline si gate KO
  -Dsonar.host.url=$SONAR_URL \
  -Dsonar.token=$SONAR_TOKEN
```

---

## 3. SCA + Docker — Dépendances et images

### Trivy (recommandé en 2026, polyvalent)
```bash
# Dépendances du projet
trivy fs --severity HIGH,CRITICAL --exit-code 1 .

# Image Docker
trivy image --severity HIGH,CRITICAL --exit-code 1 mon-app:latest

# IaC (Terraform, Helm, Kubernetes)
trivy config --exit-code 1 ./infra/

# Sortie SARIF pour intégration GitHub/Azure DevOps
trivy fs --format sarif -o trivy.sarif .
```

**Critère de décision `--exit-code`** : mettre `1` uniquement pour les sévérités HIGH et CRITICAL sur les pipelines de production. Sur les branches feature, logguer sans bloquer.

### Gitleaks — secrets dans l'historique git
```bash
# Scanner tout l'historique
gitleaks detect --source . --log-opts="HEAD~50..HEAD" --report-format sarif --report-path gitleaks.sarif

# Pre-commit hook (`.pre-commit-config.yaml`)
# - repo: https://github.com/gitleaks/gitleaks
#   rev: v8.20.0
#   hooks:
#     - id: gitleaks
```

---

## 4. DAST — Tests dynamiques

### OWASP ZAP (staging uniquement)
```bash
# Scan baseline (passif, sans authentification)
docker run --rm ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://staging.monapp.com -r zap-report.html

# Scan complet authentifié
docker run --rm ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py \
  -t https://staging.monapp.com \
  -z "-config replacer.full_list(0).description=auth \
      -config replacer.full_list(0).enabled=true \
      -config replacer.full_list(0).matchtype=REQ_HEADER \
      -config replacer.full_list(0).matchstr=Authorization \
      -config replacer.full_list(0).replacement=Bearer $TOKEN"
```

**Règle impérative** : ne jamais pointer ZAP sur un environnement de production.

### Nuclei (templates CVE récents)
```bash
# Mise à jour des templates et scan
nuclei -update-templates
nuclei -u https://staging.monapp.com \
  -severity high,critical \
  -t cves/ -t misconfigurations/ \
  -o nuclei-findings.json -json
```

---

## 5. Intégration CI/CD

### GitHub Actions — pipeline complet
```yaml
name: Security Audit
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: SAST — Semgrep
        run: semgrep scan --config "p/owasp-top-ten" --sarif -o semgrep.sarif ./src

      - name: SCA + IaC — Trivy
        run: trivy fs --severity HIGH,CRITICAL --format sarif -o trivy.sarif .

      - name: Secrets — Gitleaks
        run: gitleaks detect --source . --report-format sarif --report-path gitleaks.sarif

      - name: Upload SARIF (Code Scanning)
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif

      - name: Quality gate bloquant
        run: |
          trivy fs --severity CRITICAL --exit-code 1 .
          semgrep scan --config "p/owasp-top-ten" --error ./src
```

### Azure DevOps — étape équivalente
```yaml
- task: CmdLine@2
  displayName: 'Trivy SCA scan'
  inputs:
    script: |
      trivy fs --severity HIGH,CRITICAL --exit-code 1 --format table .
  continueOnError: false   # bloque le pipeline
```

**SLAs de remédiation** à encoder dans les quality gates :

| Sévérité | Blocage pipeline | SLA correction |
|---|---|---|
| CRITICAL | Immédiat (exit 1) | 48h |
| HIGH | Immédiat (exit 1) | 7 jours |
| MEDIUM | Warning seulement | 30 jours |
| LOW | Log uniquement | 90 jours |

---

## 6. Centralisation et suivi — DefectDojo

```bash
# Importer un rapport Trivy dans DefectDojo via API
curl -X POST "$DEFECTDOJO_URL/api/v2/import-scan/" \
  -H "Authorization: Token $DEFECTDOJO_TOKEN" \
  -F "scan_type=Trivy Scan" \
  -F "file=@trivy.json" \
  -F "product_name=mon-projet" \
  -F "engagement_name=Sprint-42" \
  -F "auto_create_context=true"
```

Workflow finding : `New → Accepted Risk / False Positive / Active → In Review → Mitigated → Closed`

Toute suppression de finding doit inclure : justification documentée, approbation RSSI, date d'expiration de l'exception.

---

## 7. Reporting automatisé

```bash
# Rapport HTML Trivy
trivy fs --format template \
  --template "@contrib/html.tpl" \
  -o security-report.html .

# Agrégation multi-outils avec jq
jq -s '{ total: (map(.Results[]?.Vulnerabilities // [] | length) | add),
         critical: (map(.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")) | length) }' \
  trivy.json > summary.json
```

Planifier l'envoi hebdomadaire du résumé exécutif (tendances MTTR, dette de sécurité, top 5 CVE) aux stakeholders via webhook ou email automatisé.

---

## Garde-fous et anti-patterns

**Ne pas faire :**
- Scanner uniquement lors de l'ajout d'une dépendance — les CVE sont publiées quotidiennement, scanner à chaque build.
- Désactiver un quality gate "temporairement" sans ticket de suivi avec date d'expiration.
- Exécuter un DAST sur la production — toujours sur staging, avec rate limiting.
- Stocker les tokens des scanners en clair dans les fichiers de config (utiliser les secrets du CI).
- Ignorer les findings sans documentation formelle — crée une dette de sécurité invisible.
- Utiliser uniquement un outil SAST ou uniquement DAST — les deux sont complémentaires.

**Pièges courants :**
- Trivy en mode `--exit-code 1` sur MEDIUM peut bloquer inutilement des MRs pour des vulnérabilités non exploitables dans le contexte.
- Semgrep génère des faux positifs sur du code de test — exclure `**/test/**` et `**/fixtures/**` dans la config.
- Les scans DAST authentifiés peuvent créer des données dans la base de staging — prévoir un cleanup post-scan.
- Les images Docker de base avec de nombreuses CVE LOW/MEDIUM polluent les rapports — utiliser des images distroless ou alpine comme base.

**Bonnes pratiques 2026 :**
- Adopter le format SARIF comme standard d'échange entre outils (compatible GitHub, Azure DevOps, GitLab).
- Intégrer les scans dans les pre-commit hooks (Gitleaks, Semgrep) pour un feedback immédiat au développeur.
- Pratiquer le "shift-left" : feedback de sécurité à la PR, pas uniquement au déploiement.
- Versionner les configurations des scanners (règles Semgrep, policies Trivy) dans le repo pour la traçabilité.
- Mesurer et publier le MTTR par sévérité — indicateur clé de maturité DevSecOps.

## Périmètre d'exécution

- N'automatiser des scans que contre des systèmes qu'on possède ou pour lesquels on dispose d'une autorisation écrite, avec le périmètre (domaines, IP, comptes) fixé avant le premier lancement.
- Les scans actifs peuvent dégrader un service : les cadrer dans une fenêtre convenue et prévoir un moyen d'arrêt immédiat.
- Les rapports contiennent des vulnérabilités exploitables : les traiter comme des données confidentielles, avec accès restreint et durée de rétention définie.


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
