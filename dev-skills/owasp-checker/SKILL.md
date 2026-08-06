---
name: owasp-checker
description: Vérifie un projet contre le OWASP Top 10 (2021) et propose des remédiations concrètes avec exemples de code. À utiliser pour vérifier la conformité OWASP. Se déclenche avec "OWASP", "top 10", "failles web", "sécurité web", "A01 broken access", "injection", "vérifier OWASP". Also triggers on "OWASP Top 10 check", "web vulnerabilities", "is my app vulnerable".
---

# OWASP Checker

## Workflow

### Étape 1 — Cadrage initial
Avant d'auditer, demande (ou infère du contexte) :
- **Stack** : langage, framework, ORM, moteur de template
- **Type** : web MPA, SPA+API, API REST/GraphQL, microservices, mobile backend
- **Scope** : toute l'app ou un composant précis (auth, paiement, upload…)
- **Profondeur** : revue de code statique / checklist / test dynamique (pentest)

Adapte les catégories à auditer : une API sans UI n'a pas de XSS stocké, un monolithe sans Docker n'a pas de misconfiguration container.

---

### Étape 2 — A01 Broken Access Control *(criticité : critique)*

**Vérifications clés :**
- Chaque endpoint applique l'autorisation côté serveur (jamais côté client)
- Pas d'IDOR : les IDs en URL/paramètres sont vérifiés contre l'utilisateur courant
- Pas de force browsing : les routes protégées retournent 401/403, pas 200
- Séparation des rôles testée (admin, user, guest)

**Exemple de faille IDOR — Node.js Express :**
```js
// ❌ Vulnérable
app.get('/orders/:id', auth, (req, res) => {
  db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
});

// ✅ Corrigé
app.get('/orders/:id', auth, (req, res) => {
  db.query('SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]);
});
```

**Commande de test rapide :**
```bash
# Tester l'accès cross-user avec curl
curl -H "Authorization: Bearer <token_user_A>" https://api.example.com/orders/42
# 42 appartient à user B → doit retourner 403, pas les données
```

---

### Étape 3 — A02 Cryptographic Failures *(criticité : critique)*

**Checklist :**
- [ ] TLS 1.2+ obligatoire, TLS 1.0/1.1 désactivés (`testssl.sh` ou SSLLabs)
- [ ] Passwords : bcrypt (cost ≥ 12) ou Argon2id — jamais MD5/SHA1/SHA256 plain
- [ ] Secrets absents du code source (scan avec `trufflehog` ou `gitleaks`)
- [ ] Données sensibles absentes des logs, URLs, et réponses d'erreur

**Scan de secrets dans git :**
```bash
# Installer gitleaks et scanner le repo complet
docker run -v $(pwd):/path zricethezav/gitleaks:latest detect --source /path --verbose
```

**Hashing correct en Node.js :**
```js
import bcrypt from 'bcrypt';
// ✅ cost factor 12, résistant aux GPU
const hash = await bcrypt.hash(password, 12);
const ok   = await bcrypt.compare(input, hash);
```

---

### Étape 4 — A03 Injection *(criticité : critique)*

**Vecteurs à couvrir :**
- SQL (raw queries, ORM mal utilisés, stored procedures)
- NoSQL (MongoDB `$where`, opérateurs injectés dans le body JSON)
- OS Command (`exec`, `shell_exec`, `subprocess`)
- SSTI (templates Jinja2/Twig avec input utilisateur non échappé)
- XSS stocké/réfléchi/DOM

**SQL injection — Python SQLAlchemy :**
```python
# ❌ Injection directe
query = f"SELECT * FROM users WHERE email = '{email}'"

# ✅ Paramétré
result = db.execute(text("SELECT * FROM users WHERE email = :e"), {"e": email})
```

**Test NoSQL injection (MongoDB) :**
```bash
# Tester un login — envoyer un objet au lieu d'une string
curl -X POST https://api.example.com/login \
  -H "Content-Type: application/json" \
  -d '{"username": {"$gt": ""}, "password": {"$gt": ""}}'
# Si 200 → injection confirmée
```

---

### Étape 5 — A04 Insecure Design *(criticité : haute)*

**Points de contrôle :**
- Threat modeling réalisé sur les flux critiques (paiement, reset password, upload)
- Rate limiting présent sur login, SMS/email OTP, reset password
- Anti-automation (CAPTCHA, device fingerprint) sur les formulaires publics
- Failles logiques métier : contournement de prix, abus de promotions, skip d'étapes workflow

**Rate limiting — Express (exemple) :**
```js
import rateLimit from 'express-rate-limit';
app.use('/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Trop de tentatives, réessayez plus tard.' }
}));
```

---

### Étape 6 — A05 à A10 (synthèse actionnable)

| ID | Nom | Vérifications prioritaires | Outil/commande rapide |
|----|-----|---------------------------|-----------------------|
| A05 | Security Misconfiguration | Headers de sécurité, comptes par défaut, stack trace exposée, permissions fichiers | `curl -I https://site.com` ; `securityheaders.com` |
| A06 | Vulnerable Components | Dépendances avec CVE connues, packages abandonnés | `npm audit --audit-level=high` / `pip-audit` / `trivy fs .` |
| A07 | Auth Failures | Brute force, credential stuffing, tokens prévisibles, session fixation, MFA absent | Vérifier logs de tentatives échouées ; tester reset password flow |
| A08 | Data Integrity Failures | Désérialisation non sécurisée, vérification de signature des updates, CI/CD pipeline poisoning | Éviter `pickle.loads(user_data)` ; vérifier checksums des assets |
| A09 | Logging Failures | Logs insuffisants sur auth/accès, absence d'alertes sur anomalies, PII dans les logs | Vérifier que login fail / 403 / 500 sont logués avec contexte |
| A10 | SSRF | Validation stricte des URLs distantes, metadata cloud accessible, rebind DNS | Tester `http://169.254.169.254/latest/meta-data/` depuis un champ URL |

**Headers de sécurité — configuration Nginx minimale :**
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Permissions-Policy "geolocation=(), microphone=()" always;
```

**Audit dépendances NPM/Python :**
```bash
npm audit --audit-level=high
pip-audit --requirement requirements.txt
trivy fs . --severity HIGH,CRITICAL
```

---

### Étape 7 — Matrice de conformité

Produis un tableau récapitulatif :

| Catégorie | Statut | Criticité | Effort remédiation |
|-----------|--------|-----------|-------------------|
| A01 Broken Access Control | ✅ Conforme | — | — |
| A02 Cryptographic Failures | ⚠️ Partiel | Critique | Moyen |
| A03 Injection | ❌ Non conforme | Critique | Faible |
| … | … | … | … |

**Score global** : X/10 catégories conformes. Catégories bloquantes (critiques non conformes) à traiter avant mise en production.

---

### Étape 8 — Plan de remédiation priorisé

Classe les actions selon la matrice **Impact × Effort** :

1. **Immédiat (< 1 semaine)** : failles critiques exploitables (injection, IDOR, secrets exposés)
2. **Court terme (1–4 semaines)** : misconfiguration, composants vulnérables, headers manquants
3. **Long terme (1–3 mois)** : refonte design (rate limiting, threat modeling, logging structuré)

Pour chaque item : fournir l'extrait de code avant/après + la référence OWASP officielle (ex : [A03:2021](https://owasp.org/Top10/A03_2021-Injection/)).

---

## Garde-fous et anti-patterns

- **Ne jamais fournir d'exploit fonctionnel** sans mandat de pentest explicite — donner des PoC conceptuels uniquement
- **Ne pas cocher "conforme" par défaut** si l'information est insuffisante — signaler le manque d'info
- **ORM ≠ immunité SQL** : Hibernate, Prisma, SQLAlchemy peuvent être contournés avec `raw()` ou `text()` mal utilisés
- **HTTPS ≠ chiffrement complet** : valider aussi le chiffrement au repos et dans les logs
- **Dépendances transitives** : `npm audit` ne couvre pas toujours les sous-dépendances — utiliser `trivy` ou `snyk`
- **A04 Insecure Design** ne se corrige pas avec du code : nécessite une revue d'architecture

## Bonnes pratiques 2026

- Utiliser **OWASP ASVS** (Application Security Verification Standard) pour un audit structuré par niveau (L1/L2/L3)
- Intégrer **SAST** (Semgrep, Sonarqube) et **SCA** (Trivy, Snyk) dans la CI pour détecter les régressions
- Adopter **OpenID Connect / OAuth 2.1** pour l'authentification plutôt que les sessions custom
- Préférer **Passkeys (WebAuthn)** au mot de passe pour éliminer structurellement A07
- Pour les APIs, appliquer les vérifications **OWASP API Security Top 10 2023** en complément
