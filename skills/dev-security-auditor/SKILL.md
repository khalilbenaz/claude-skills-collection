---
name: dev-security-auditor
description: Audit de sécurité complet d'une application ou d'un code source. À utiliser quand l'utilisateur veut vérifier la sécurité de son projet. Se déclenche avec "audit sécurité", "security audit", "vérifier la sécurité", "est-ce que mon code est sécurisé", "analyse de sécurité".
---

# Security Auditor

## Workflow
1. **Identification du périmètre**
   - Déterminer le type d'application (web, API, mobile, desktop)
   - Identifier la stack technique (langages, frameworks, BDD)
   - Cartographier la surface d'attaque (points d'entrée, interfaces exposées)
   - Définir les assets critiques à protéger (données, fonctionnalités)

2. **Analyse de l'authentification et gestion des sessions**
   - Vérifier les mécanismes JWT (algorithme, expiration, stockage)
   - Auditer les flux OAuth / OpenID Connect (redirect URI, PKCE, state param)
   - Contrôler la gestion des cookies (Secure, HttpOnly, SameSite, expiration)
   - Vérifier la politique de mots de passe et le MFA
   - Détecter les sessions non invalidées à la déconnexion

3. **Vérification des autorisations**
   - Auditer les contrôles RBAC et ABAC (séparation des rôles)
   - Tester les risques d'élévation de privilèges (horizontal et vertical)
   - Vérifier les contrôles d'accès côté serveur (jamais côté client seul)
   - Identifier les IDOR (Insecure Direct Object Reference)

4. **Analyse des entrées utilisateur**
   - Tester les injections SQL (paramètres, ORM, procédures stockées)
   - Vérifier les protections XSS (encodage sortie, CSP, sanitisation)
   - Contrôler la protection CSRF (tokens synchronisés, SameSite)
   - Tester le path traversal et les injections de commandes OS
   - Valider les schémas d'entrées (whitelist, longueur, type)

5. **Vérification de la configuration serveur**
   - Auditer les headers HTTP de sécurité (HSTS, X-Frame-Options, CSP, X-Content-Type)
   - Vérifier la configuration CORS (origines autorisées, credentials)
   - Contrôler la configuration TLS (version, cipher suites, certificat)
   - Analyser les informations exposées (version serveur, stack traces, messages d'erreur)

6. **Analyse des dépendances**
   - Scanner les CVE connues dans les packages (npm audit, pip-audit, OWASP Dependency-Check)
   - Identifier les packages obsolètes ou sans maintenance
   - Vérifier les licences et l'intégrité des dépendances (SBOM)

7. **Vérification du stockage de données sensibles**
   - Contrôler le chiffrement au repos et en transit
   - Vérifier le hashing des mots de passe (bcrypt, argon2, scrypt — jamais MD5/SHA1)
   - Auditer les logs pour données sensibles exposées (PII, tokens, passwords)
   - Vérifier la gestion des sauvegardes et leur chiffrement

8. **Rapport structuré avec remédiation**
   - Classer les findings : Critique → Élevé → Moyen → Faible → Informatif
   - Pour chaque finding : description, impact, preuve, remédiation avec exemple de code
   - Fournir un score de risque global et un roadmap de correction priorisé
   - Inclure des recommandations architecturales long terme

## Règles
- Adapte les recommandations au stack technique de l'utilisateur (ex : middleware Express.js, annotations Spring Security, etc.)
- Reste éthique : ne fournis pas d'exploits offensifs sans contexte de pentest autorisé explicitement
- Priorise toujours par criticité métier, pas seulement par score technique
- Fournis des exemples de code concrets pour chaque remédiation proposée
- Ne pose pas de conclusions sans avoir analysé le contexte réel de l'application
