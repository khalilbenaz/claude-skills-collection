---
name: dev-security-auditor
description: Audit de sécurité complet d'une application ou d'un code source — OWASP Top 10, analyse de dépendances, configuration serveur, cryptographie, secrets exposés. À utiliser quand l'utilisateur veut vérifier la sécurité de son projet. Se déclenche avec "audit sécurité", "security audit", "vérifier la sécurité", "est-ce que mon code est sécurisé", "analyse de sécurité".
---

# Security Auditor

## 1. Cadrage du périmètre

Avant toute analyse, établir :

| Dimension | Questions clés |
|---|---|
| Type d'app | Web SPA, API REST/GraphQL, mobile, desktop, micro-services ? |
| Stack | Langages, frameworks, BDD, cloud provider |
| Surface d'attaque | Endpoints exposés, jobs batch, websockets, webhooks, S3 public ? |
| Assets critiques | PII, données bancaires, tokens, secrets, configs infra |
| Contexte réglementaire | PCI-DSS, RGPD, HIPAA, ISO 27001 ? |

## 2. Authentification & Sessions

**JWT — vérifications immédiates :**
```bash
# Décoder un JWT sans vérifier la signature
echo "eyJ..." | cut -d. -f2 | base64 -d 2>/dev/null | jq .
# Vérifier alg: jamais "none", préférer RS256/ES256 à HS256 sur API publique
```

Checklist :
- `alg` != `none` ; signature vérifiée côté serveur
- `exp` présent et court (≤15 min pour access token)
- Refresh token stocké en HttpOnly cookie, pas en localStorage
- Révocation possible (blacklist Redis ou rotation de clé)
- MFA sur comptes privilégiés ; protection brute-force (rate-limit + lockout)

**Cookies :**
```http
Set-Cookie: session=xxx; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600
```

**OAuth 2.0 / OIDC — pièges courants :**
- Absence de `state` param → CSRF sur le callback
- `redirect_uri` trop permissive (`*.example.com` match `evil.example.com`)
- PKCE absent sur app mobile/SPA → authorization code interception

## 3. Contrôle d'accès & Autorisations

```python
# MAUVAIS — contrôle côté client uniquement
if user.role == "admin":  # validé dans le JS du front
    show_admin_panel()

# BON — contrôle systématique côté serveur
@require_permission("admin:read")
def admin_view(request):
    ...
```

Vérifier :
- IDOR : `GET /api/orders/1234` accessible par un autre utilisateur ?
- Mass assignment : `PATCH /users/me` accepte-t-il `role` ou `is_admin` ?
- Élévation horizontale et verticale de privilèges
- Endpoints admin non protégés par IP allowlist ou header interne

## 4. Validation des entrées & Injections

**SQL Injection :**
```python
# VULNÉRABLE
query = f"SELECT * FROM users WHERE id = {user_id}"

# BON — paramétré
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

**XSS :**
```javascript
// VULNÉRABLE
element.innerHTML = userInput;

// BON
element.textContent = userInput;
// + CSP header : Content-Security-Policy: default-src 'self'; script-src 'self'
```

**Autres vecteurs à tester :**
- Path traversal : `../../etc/passwd` dans paramètres de fichier
- Command injection : `os.system(f"convert {filename}")` → `filename = "x; rm -rf /"`
- SSRF : URL fournie par l'utilisateur appelée côté serveur (AWS metadata endpoint)
- XXE : parsing XML sans désactiver les entités externes
- Open redirect : `?next=https://evil.com`

## 5. Headers HTTP & Configuration TLS

**Headers à vérifier (réponse serveur) :**
```bash
curl -sI https://example.com | grep -iE "strict|content-security|x-frame|x-content|referrer|permissions"
```

| Header | Valeur recommandée |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | policy stricte, pas de `unsafe-inline` |
| `X-Frame-Options` | `DENY` ou `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | désactiver caméra/micro si non nécessaire |

**TLS :**
```bash
# Tester avec ssllabs CLI ou nmap
nmap --script ssl-enum-ciphers -p 443 example.com
# Rejeter : TLS 1.0, TLS 1.1, SSLv3, RC4, DES, 3DES, NULL ciphers
```

**CORS — configuration dangereuse :**
```javascript
// VULNÉRABLE
app.use(cors({ origin: '*', credentials: true }));
// credentials:true avec origin:* = erreur navigateur mais risque de mauvaise config
// Toujours whitelister les origines explicitement
```

## 6. Secrets & Configuration

```bash
# Scan de secrets dans le dépôt (à lancer en local ou CI)
trufflehog git file://. --only-verified
gitleaks detect --source . --verbose

# Vérifier l'historique git aussi
git log --all --full-history -- "**/*.env" "**/*secret*" "**/*key*"
```

Pièges fréquents :
- `.env` committé (vérifier `.gitignore`)
- Clés hardcodées dans le code : `API_KEY = "sk-..."`
- Credentials dans les logs applicatifs
- Secrets en clair dans les variables d'environnement exposées via `/actuator/env` (Spring) ou debug endpoints

## 7. Dépendances & Supply Chain

```bash
# Node.js
npm audit --audit-level=high
npx snyk test

# Python
pip-audit
safety check -r requirements.txt

# .NET
dotnet list package --vulnerable

# Java / Maven
mvn dependency-check:check

# Multi-langages
docker run --rm -v $(pwd):/app aquasec/trivy fs /app
```

Critères de décision :
- CVE CVSS ≥ 9.0 → bloquer le merge immédiatement
- CVE CVSS 7.0–8.9 → corriger dans le sprint courant
- Dépendance sans maintenance depuis >2 ans → planifier remplacement
- Vérifier les dépendances transitives, pas seulement directes

## 8. Cryptographie & Stockage

```python
# MAUVAIS — MD5 ou SHA1 pour les mots de passe
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()

# BON — bcrypt ou argon2
from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=3, memory_cost=65536)
hashed = ph.hash(password)
```

Vérifier :
- Chiffrement au repos pour PII et données sensibles (AES-256-GCM)
- TLS partout en transit (y compris BDD interne)
- Clés de chiffrement séparées des données (KMS, Vault)
- IV/nonce unique par opération de chiffrement
- Pas d'ECB mode pour le chiffrement symétrique

## 9. Logging & Monitoring

**Ce qui ne doit PAS apparaître dans les logs :**
```
# Anti-patterns
logger.info(f"User login: {username} / {password}")
logger.debug(f"JWT: {token}")
logger.error(f"DB error for query: {raw_sql_with_params}")
```

Checklist :
- Events de sécurité loggés : logins (succès/échec), changements de rôle, accès admin
- Logs sans PII (hash ou masquage des identifiants)
- Alerting sur tentatives brute-force, accès anormaux, erreurs 5xx en pic

## 10. Rapport de Findings

Classifier chaque finding :

| Sévérité | Critère | Action |
|---|---|---|
| **Critique** | RCE, SQLi exploitable, credentials exposés | Hotfix immédiat, notifier CISO |
| **Élevé** | Auth bypass, IDOR sur données sensibles, XSS stocké | Corriger avant mise en prod |
| **Moyen** | CSRF, mauvais headers, secrets dans logs | Corriger dans le sprint |
| **Faible** | Headers manquants, verbose errors | Backlog priorisé |
| **Informatif** | Best practices, recommandations archi | Documentation |

Structure d'un finding :
```
## [CRITIQUE] Injection SQL — endpoint /api/search

**Description** : Le paramètre `q` est interpolé directement dans la requête SQL.
**Preuve** : `GET /api/search?q=' OR '1'='1` → retourne tous les enregistrements.
**Impact** : Exfiltration complète de la base de données.
**Remédiation** :
  - Remplacer l'interpolation par des requêtes paramétrées (exemple ci-dessous)
  - Auditer tous les autres endpoints avec paramètres dynamiques
**Exemple corrigé** : [snippet de code]
```

## Anti-patterns & Pièges

- **Ne pas auditer uniquement le frontend** : les vraies vulnérabilités sont côté serveur
- **Éviter le security theater** : headers sans CSP stricte, HTTPS avec TLS 1.0 encore actif
- **Ne pas ignorer les dépendances transitives** : la CVE est souvent dans un sous-package
- **Pas de "sécurité par obscurité"** : cacher l'URL admin n'est pas un contrôle d'accès
- **Attention aux edge cases** : les fichiers de backup (`.bak`, `.old`, `~`) souvent oubliés dans le webroot
- **JWT sans révocation** : un token volé reste valide jusqu'à expiration
- **Rate-limiting uniquement côté client** : facilement contourné ; toujours côté serveur

## Règles d'usage

- Adapter les recommandations au stack réel (Spring Security, Express middleware, ASP.NET filters…)
- Rester éthique : ne pas fournir d'exploit offensif sans contexte de pentest explicitement autorisé
- Prioriser par criticité métier (ex : données bancaires > logs analytics)
- Chaque remédiation = exemple de code dans le langage du projet
- Ne pas conclure sans avoir analysé le contexte réel de l'application


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
