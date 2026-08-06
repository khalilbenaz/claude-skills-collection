---
name: secrets-scanner
description: Détecte les secrets, clés API et credentials exposés dans le code source, l'historique Git et les fichiers de configuration. À utiliser pour vérifier qu'aucun secret n'est dans le code. Se déclenche avec "secrets", "clé API exposée", "credential leak", "mot de passe dans le code", "token exposé", ".env", "secret scanner". Also triggers on "exposed secrets", "leaked API key", "scan git history for credentials".
---

# Secrets Scanner

## Workflow en 8 étapes

### 1. Scan rapide du working tree (commencer ici)

```bash
# Installation ponctuelle
brew install gitleaks          # macOS
choco install gitleaks         # Windows
pip install detect-secrets     # multi-plateforme

# Scan du répertoire courant
gitleaks detect --source . --report-format json --report-path leaks.json

# Baseline detect-secrets (ignore les faux positifs existants validés)
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline
```

> **Critère de décision** : si `gitleaks` retourne 0 findings ET la baseline est propre → passer à l'étape 3. Sinon, traiter chaque finding avant de continuer.

---

### 2. Analyse de l'historique Git complet

```bash
# gitleaks — historique complet
gitleaks detect --source . --log-opts="--all" --report-format json --report-path leaks-history.json

# truffleHog — haute entropie + patterns, branches et stash inclus
trufflehog git file://. --only-verified --json > trufflehog-report.json

# Repérer les commits "correctifs" (indice qu'un secret a été exposé)
git log --all --oneline | grep -iE "remove|delete|fix.*secret|fix.*key|fix.*token|fix.*pass"
```

**Anti-pattern fréquent** : croire qu'un `git rm` ou un commit de suppression efface un secret. Le secret reste dans l'historique tant que le repo n'est pas réécrit.

---

### 3. Fichiers de configuration à risque

| Fichier | Piège courant |
|---|---|
| `.env`, `.env.local` | Pas dans `.gitignore` |
| `appsettings.json` | Connexion strings en clair |
| `docker-compose.yml` | `environment:` avec valeurs |
| Manifests K8s `Secret` | Base64 ≠ chiffrement |
| `.github/workflows/*.yml` | `echo $SECRET` dans les logs |
| `Jenkinsfile` | `withCredentials` mal utilisé |

```bash
# Vérifier que les fichiers sensibles sont bien ignorés
git check-ignore -v .env .env.local *.pem *.key secrets/

# Détecter les fichiers sensibles déjà trackés (= en danger)
git ls-files | grep -E "\.(env|pem|key|p12|pfx|jks|ppk)$"
```

---

### 4. Patterns regex par provider cloud

```
AWS Access Key ID   : AKIA[0-9A-Z]{16}
AWS Secret Key      : [0-9a-zA-Z/+]{40}
GCP API Key         : AIza[0-9A-Za-z\-_]{35}
GCP Service Account : "type": "service_account"
Azure Conn String   : DefaultEndpointsProtocol=https;AccountName=
Azure Client Secret : [0-9a-f]{8}-[0-9a-f]{4}-...(avec contexte client_secret)
JWT secret faible   : (jwt|secret)[_-]?(key|secret)\s*[:=]\s*["'][^"']{1,20}["']
Stripe live key     : sk_live_[0-9a-zA-Z]{24}
Slack bot token     : xoxb-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}
GitHub PAT          : ghp_[0-9a-zA-Z]{36}
```

```bash
# Grep manuel ciblé dans les sources
grep -rE "AKIA[0-9A-Z]{16}" . --include="*.{js,ts,py,java,go,cs,yml,json}"
grep -rE "sk_live_" . --include="*.{js,ts,py,rb,php}"
```

---

### 5. Détection de haute entropie (secrets non étiquetés)

```bash
# truffleHog — détecte les chaînes aléatoires longues même sans label
trufflehog filesystem . --entropy --json

# Python rapide : entropie de Shannon sur les chaînes longues
python3 - <<'EOF'
import math, re, sys

def entropy(s):
    counts = {c: s.count(c) for c in set(s)}
    return -sum((v/len(s)) * math.log2(v/len(s)) for v in counts.values())

for line in open(sys.argv[1]):
    for token in re.findall(r'[A-Za-z0-9+/=_\-]{20,}', line):
        if entropy(token) > 4.5:
            print(f"{entropy(token):.2f}  {token}")
EOF suspicious_file.txt
```

**Seuil recommandé** : entropie > 4.5 bits/char sur une chaîne > 20 caractères = suspect.

---

### 6. Vérification des variables d'environnement vs hardcoded

```bash
# Détecter les assignations directes à risque (Node.js / Python)
grep -rE "(api_key|password|secret|token)\s*[:=]\s*[\"'][^\"']{8,}" . \
  --include="*.{js,ts,py,java,go,cs}" \
  --exclude-dir={node_modules,.git,dist,build}
```

**Bonne pratique** : les valeurs par défaut dans le code ne doivent JAMAIS être des credentials valides — utiliser `"CHANGE_ME"` ou lever une exception au démarrage si la variable est vide.

```python
# Python — pattern sûr
import os
SECRET_KEY = os.environ["SECRET_KEY"]  # KeyError explicite si absent
```

```typescript
// TypeScript — pattern sûr avec validation au boot
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("API_KEY manquante — vérifiez votre .env");
```

---

### 7. Outillage CI/CD — bloquer en amont

```yaml
# .github/workflows/secrets-scan.yml
name: Secrets Scan
on: [push, pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# Pre-commit hook (ajouter dans .pre-commit-config.yaml)
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks
```

```bash
# Activer le pre-commit hook localement
pre-commit install
pre-commit run --all-files
```

---

### 8. Remédiation : rotation + réécriture + vault

**Ordre impératif :**

1. **Révoquer immédiatement** le secret (avant toute autre action)
2. **Générer un nouveau secret** dans le provider concerné
3. **Réécrire l'historique Git** pour supprimer la trace

```bash
# BFG Repo Cleaner — plus rapide que git filter-branch
java -jar bfg.jar --replace-text secrets-to-remove.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force-with-lease

# secrets-to-remove.txt : une valeur par ligne (regex supporté)
AKIA1234EXAMPLE5678==>REMOVED
```

4. **Migrer vers un vault**

```bash
# Azure Key Vault
az keyvault secret set --vault-name mon-vault --name MonSecret --value "$MA_VALEUR"
# Lecture dans l'appli : SDK Azure.Identity + SecretClient

# HashiCorp Vault
vault kv put secret/myapp db_password=MonPass
vault kv get -field=db_password secret/myapp

# AWS Secrets Manager
aws secretsmanager create-secret --name prod/myapp/db --secret-string '{"password":"xyz"}'
```

5. **Notifier** les équipes de sécurité si le repo est/était public

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Correctif |
|---|---|---|
| `.env` commité | Exposition directe | Ajouter `.env*` au `.gitignore` AVANT le premier commit |
| `git rm .env` sans réécrire l'historique | Secret toujours accessible | BFG + force push |
| Secrets en base64 dans K8s `Secret` | Base64 ≠ chiffrement | Utiliser External Secrets Operator + vault |
| Valeur par défaut valide dans le code | Prod tourne avec le secret de dev | Lever une exception si non défini |
| Scan uniquement sur le HEAD | Secrets dans l'historique non détectés | `--log-opts="--all"` ou `trufflehog` |
| Ignorer les fichiers de test | Les fixtures contiennent souvent de vrais tokens | Scanner `**/test/**` et `**/__tests__/**` |
| Stocker les secrets dans les logs | Trace durable et difficile à effacer | Masquer avec `***` avant tout log |

## Priorisation par criticité

1. **Critique** — secret de production actif (AWS, DB prod, Stripe live) → rotation dans l'heure
2. **Haute** — secret de staging ou token avec accès en écriture → rotation sous 24h
3. **Moyenne** — secret de dev/test ou token lecture seule → rotation sous 1 semaine
4. **Faible** — secret révoqué mais présent dans l'historique → réécriture planifiée
