---
name: threat-modeling
description: Modélisation des menaces pour applications et systèmes — identification des surfaces d'attaque, classification STRIDE, arbres d'attaque, scoring DREAD/CVSS et stratégies de mitigation priorisées. À utiliser quand l'utilisateur veut sécuriser une architecture, identifier des vulnérabilités potentielles ou réaliser une analyse de risques. Se déclenche aussi avec "threat modeling", "modélisation des menaces", "surface d'attaque", "STRIDE", "risques de sécurité", "analyse de menaces", "DREAD". Also triggers on "STRIDE analysis", "attack surface review".
---

# Modélisation des Menaces

## Workflow en 5 étapes

### 1. Cartographier le système (DFD)

Décompose l'architecture en éléments atomiques avant tout classement.

- **Entités externes** : acteurs humains, systèmes tiers, IoT
- **Processus** : services, fonctions, microservices
- **Flux de données** : API REST, queues, fichiers, DB
- **Stores** : bases de données, caches, fichiers

```text
[Utilisateur] --HTTPS--> [API Gateway] --> [Service Auth]
                                      --> [Service Métier] --> [DB PostgreSQL]
                                                           --> [Queue RabbitMQ] --> [Worker]
Limite de confiance : Internet / DMZ / Réseau interne
```

Règle : **toute flèche qui traverse une limite de confiance est une surface d'attaque**.

---

### 2. Appliquer STRIDE par composant

Pour chaque flux/composant, passe en revue les 6 catégories.

| Menace | Propriété violée | Cible typique | Exemples concrets |
|--------|-----------------|---------------|-------------------|
| **S**poofing | Authentification | Identity provider, tokens | JWT forgé, session fixation, SSRF via redirect |
| **T**ampering | Intégrité | Requêtes, DB, fichiers | SQL injection, mass assignment, prototype pollution |
| **R**epudiation | Non-répudiation | Logs, audit | Logs désactivables, absence de correlation ID |
| **I**nformation Disclosure | Confidentialité | API, logs, erreurs | Stack trace en prod, over-fetching GraphQL, verbose errors |
| **D**enial of Service | Disponibilité | Endpoints, DB, queues | Regex catastrophique, N+1 queries non bornées, XML bomb |
| **E**levation of Privilege | Autorisation | RBAC, ressources | IDOR, JWT `alg:none`, path traversal, SSTI |

**Mnémotechnique** : Spoofing → qui es-tu ? / Tampering → est-ce intact ? / Repudiation → qui a fait quoi ? / Info Disclosure → qui voit quoi ? / DoS → est-ce disponible ? / EoP → que peux-tu faire ?

---

### 3. Scorer avec DREAD (+ CVSS si besoin)

**DREAD** (score 1-10 par critère, moyenne finale) :

| Critère | Question clé | Bas (1-3) | Moyen (4-6) | Élevé (7-10) |
|---------|-------------|-----------|-------------|--------------|
| **D**amage | Quel est l'impact si exploité ? | Log pollué | Données utilisateur | Accès root / fuite PII masse |
| **R**eproducibility | Reproductible à chaque tentative ? | Rare/aléatoire | Conditions spécifiques | Systématique |
| **E**xploitability | Niveau requis pour exploiter ? | Expert + accès physique | Dev moyen | Script kiddie |
| **A**ffected users | Combien d'utilisateurs touchés ? | Un seul | Groupe restreint | Tous les utilisateurs |
| **D**iscoverability | Facilité à trouver la faille ? | Code source requis | Test manuel | Visible sans auth |

Score ≥ 7 → **critique**, corriger avant release. Score 4-6 → **moyen**, sprint suivant. Score < 4 → **faible**, backlog.

**Quand utiliser CVSS plutôt que DREAD** : si tu dois communiquer avec des équipes sécurité externes, CVSSv3.1 est le standard. DREAD reste plus rapide pour les revues internes.

---

### 4. Construire l'arbre d'attaque (optionnel, pour menaces critiques)

```text
Objectif attaquant : Accéder aux données de paiement
├── Via API (STRIDE: I + E)
│   ├── Bypass authentification
│   │   ├── JWT alg:none           [CRITIQUE]
│   │   └── Brute-force refresh token [MOYEN]
│   └── IDOR sur /api/payments/{id} [CRITIQUE]
└── Via base de données
    ├── SQL Injection dans filtre   [CRITIQUE]
    └── Credentials exposés en env  [ÉLEVÉ]
```

---

### 5. Définir les mitigations et les tracker

Pour chaque menace, une mitigation doit être **spécifique, testable et assignée**.

```markdown
### Menace: IDOR sur /api/payments/{id}

- **Type STRIDE**: Elevation of Privilege + Information Disclosure
- **Composant**: Service Paiements — endpoint GET /api/payments/{id}
- **Score DREAD**: D=9, R=9, E=7, A=8, D=8 → **8.2 / CRITIQUE**
- **Scénario**: Un utilisateur authentifié incrémente l'ID pour accéder aux paiements d'un autre compte.
- **Impact**: Fuite de données de paiement (RGPD), fraude potentielle.
- **Mitigation**:
  1. Vérifier `payment.userId == currentUser.id` avant chaque retour.
  2. Utiliser des UUIDs non-séquentiels comme identifiants publics.
  3. Ajouter un test automatisé avec deux comptes distincts.
- **Ticket**: #SEC-42
- **Statut**: Non traité
```

---

## Mitigations par type de composant

### API REST / GraphQL

```text
Spoofing         → JWT RS256 (pas HS256 avec secret partagé), rotation des clés, MFA
Tampering        → Validation stricte (FluentValidation, Zod), parameterized queries
Info Disclosure  → DTO de réponse (jamais d'entité directe), masquer stack traces en prod
EoP              → RBAC + ownership check sur chaque ressource, pas de rôles admin implicites
DoS              → Rate limiting par IP + par user, timeout sur toutes les requêtes externes
```

### Base de données

```sql
-- Moindre privilège : un compte par service, pas de compte DBO en prod
GRANT SELECT, INSERT, UPDATE ON schema.table TO app_user;

-- Toujours des paramètres nommés, jamais de concaténation
-- .NET : new SqlCommand("SELECT * FROM users WHERE id = @id")
-- Python : cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

### File d'attente (RabbitMQ, Azure Service Bus, Kafka)

```text
Spoofing         → Authentification TLS mutuelle, tokens de publication
Tampering        → HMAC sur le payload, validation du schéma à la consommation
Repudiation      → Correlation ID obligatoire, dead-letter queue avec logs
DoS              → Prefetch limité, consumer circuit-breaker, TTL sur les messages
```

### Authentification / Sessions

```text
- Utiliser des bibliothèques éprouvées (OAuth2 + OIDC), jamais de crypto maison
- Tokens : expiry court (15 min access), refresh token rotation + révocation
- Sessions : HttpOnly + Secure + SameSite=Strict, régénération après login
- Mots de passe : Argon2id (préféré), bcrypt (cost ≥ 12), jamais MD5/SHA1
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Correction |
|--------------|--------|-----------|
| "On sécurisera après le MVP" | Surface d'attaque figée dès la conception | Intégrer STRIDE dès la phase de design |
| Confiance implicite au réseau interne | Lateral movement si un service est compromis | Zero Trust : chaque service s'authentifie |
| IDs séquentiels (1, 2, 3…) dans les URLs | IDOR trivial | UUIDs v4 ou IDs opaques signés |
| Logs qui contiennent des tokens/PII | Exfiltration via logs | Masquer automatiquement les champs sensibles |
| Erreurs verboseuses en production | Information disclosure | Messages génériques + correlation ID loggué côté serveur |
| Dépendances non mises à jour | CVEs connues exploitables | `dependabot` ou `renovate` + `npm audit` / `dotnet list package --vulnerable` |
| RBAC sans ownership check | Un utilisateur accède aux ressources d'un autre | Toujours vérifier `resource.ownerId == currentUser.id` |
| Secrets dans le code / .env commité | Fuite GitHub | `git-secrets`, variables d'environnement injectées au runtime |

---

## Bonnes pratiques 2026

- **Shift-left** : intégrer une revue STRIDE à chaque PR qui touche auth, données sensibles ou nouveaux endpoints.
- **Threat modeling continu** : revoir le modèle à chaque changement d'architecture, pas seulement en audit annuel.
- **Automatiser** : intégrer SAST (Semgrep, CodeQL), SCA (Dependabot), et secrets scanning (Gitleaks) dans la CI.
- **Supply chain** : vérifier l'intégrité des dépendances (checksums, SBOM), appliquer le principe de moindre privilège aux packages.
- **LLM/IA** : si le système intègre un LLM, ajouter les menaces spécifiques — prompt injection, data exfiltration via le modèle, model inversion.
- **Documentation vivante** : le threat model doit vivre dans le repo (ex. `docs/threat-model.md`), pas dans un wiki orphelin.

---

## Commandes utiles

```bash
# Détection de secrets dans le dépôt
gitleaks detect --source . --report-format json --report-path gitleaks-report.json

# Audit des dépendances npm
npm audit --audit-level=high

# Audit des dépendances .NET
dotnet list package --vulnerable --include-transitive

# Scan SAST avec Semgrep
semgrep scan --config=auto --error

# Générer un SBOM (Software Bill of Materials)
syft . -o spdx-json > sbom.json
```

> Ce skill est un outil d'analyse de sécurité défensif. Il ne fournit pas de techniques d'exploitation.
