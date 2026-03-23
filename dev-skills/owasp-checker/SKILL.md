---
name: owasp-checker
description: Vérifie un projet contre le OWASP Top 10 et propose des remédiations. À utiliser pour vérifier la conformité OWASP. Se déclenche avec "OWASP", "top 10", "failles web", "sécurité web", "A01 broken access", "injection", "vérifier OWASP".
---

# OWASP Checker

## Workflow
1. **Identification du type d'application**
   - Déterminer le contexte : application web, API REST/GraphQL, application mobile, microservices
   - Identifier la stack technique pour adapter les vérifications
   - Recenser les fonctionnalités critiques (authentification, paiement, données personnelles)

2. **Vérification A01 - Broken Access Control**
   - Tester les contrôles d'accès sur chaque endpoint (authentifié vs non authentifié)
   - Identifier les risques IDOR (manipulation d'identifiants dans les URLs ou paramètres)
   - Vérifier l'absence de force browsing (accès direct à des URLs protégées)
   - Contrôler que les règles d'accès sont enforced côté serveur
   - Tester la séparation des privilèges entre rôles (admin, user, guest)

3. **Vérification A02 - Cryptographic Failures**
   - Vérifier que les données sensibles ne transitent pas en clair (HTTP, logs, URLs)
   - Contrôler les algorithmes de hashing (bcrypt/argon2 pour passwords, jamais MD5/SHA1)
   - Auditer la configuration TLS (TLS 1.2+ obligatoire, désactiver TLS 1.0/1.1)
   - Vérifier l'absence de secrets hardcodés dans le code source
   - Contrôler le chiffrement des données au repos (BDD, backups, fichiers)

4. **Vérification A03 - Injection**
   - Tester les injections SQL (requêtes dynamiques, ORM mal utilisés, procédures stockées)
   - Vérifier les injections NoSQL (MongoDB operators, filtres non validés)
   - Contrôler les injections de commandes OS (exec, shell, subprocess)
   - Tester les injections LDAP, XPath, Template (SSTI)
   - Vérifier les protections XSS (stored, reflected, DOM-based)

5. **Vérification A04 - Insecure Design**
   - Évaluer si un threat modeling a été réalisé sur les fonctionnalités critiques
   - Vérifier l'application de patterns sécurisés (defense in depth, fail-safe defaults)
   - Contrôler la présence de rate limiting, anti-brute-force, et anti-automation
   - Identifier les failles logiques métier (contournement de workflow, manipulation de prix)

6. **Vérification A05 à A10**
   - **A05 Security Misconfiguration** : headers de sécurité, permissions, comptes par défaut, erreurs exposées
   - **A06 Vulnerable Components** : dépendances avec CVE connues, packages non maintenus
   - **A07 Auth Failures** : brute force, credential stuffing, tokens prévisibles, session fixation
   - **A08 Data Integrity Failures** : vérification des signatures, intégrité des mises à jour, désérialisation non sécurisée
   - **A09 Logging Failures** : logs insuffisants, absence de monitoring, pas d'alerte sur anomalie
   - **A10 SSRF** : validation des URLs distantes, metadata cloud exposé, rebind DNS

7. **Matrice de conformité par catégorie**
   - Attribuer un statut pour chaque catégorie : Conforme / Partiellement conforme / Non conforme
   - Calculer un score global de conformité OWASP (ex : 7/10 catégories conformes)
   - Mettre en évidence les catégories critiques non conformes
   - Comparer avec les standards industry (PCI-DSS, ISO 27001 si applicable)

8. **Plan de remédiation priorisé avec exemples de code**
   - Prioriser selon l'impact combiné (criticité OWASP × exposition réelle)
   - Fournir des exemples de code correctif pour chaque non-conformité
   - Proposer des bibliothèques et middlewares de sécurité adaptés au stack
   - Définir un calendrier de remédiation (immédiat / court terme / long terme)

## Règles
- Adapte les vérifications au stack technique : les injections SQL ne s'appliquent pas de la même façon en Prisma ORM qu'en raw SQL
- Reste éthique : ne fournis pas d'exploits offensifs sans contexte de pentest autorisé explicitement
- Priorise toujours par criticité — un A01 critique vaut mieux que dix A09 mineurs
- Fournis des exemples de code concrets pour chaque remédiation (avant/après)
- Référence toujours la documentation officielle OWASP pour chaque catégorie
