---
name: secrets-scanner
description: Détecte les secrets, clés API et credentials exposés dans le code. À utiliser pour vérifier qu'aucun secret n'est dans le code. Se déclenche avec "secrets", "clé API exposée", "credential leak", "mot de passe dans le code", "token exposé", ".env", "secret scanner".
---

# Secrets Scanner

## Workflow
1. **Scan des fichiers sources pour patterns de secrets**
   - Rechercher les patterns regex de clés API, tokens et passwords dans le code source
   - Inspecter les fichiers de code (JS, TS, Python, Java, Go, PHP, Ruby, etc.)
   - Détecter les chaînes de caractères de haute entropie (potentiels secrets non étiquetés)
   - Analyser les fichiers de test (souvent négligés mais contenant des credentials de test réels)

2. **Vérification des fichiers de configuration**
   - Auditer les fichiers `.env`, `.env.local`, `.env.production`, `.env.staging`
   - Inspecter `config.json`, `appsettings.json`, `application.properties`, `application.yml`
   - Vérifier `docker-compose.yml`, `Dockerfile` (ARG, ENV avec valeurs en dur)
   - Contrôler les fichiers Kubernetes (secrets non chiffrés en base64 dans les manifests)
   - Analyser les fichiers CI/CD (`.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`)

3. **Analyse de l'historique Git pour secrets commités puis supprimés**
   - Inspecter les commits passés avec `git log --all --full-history`
   - Rechercher dans les diffs les patterns de secrets même dans les fichiers supprimés
   - Vérifier les branches abandonnées et stash
   - Utiliser `truffleHog` ou `gitleaks` en mode historique complet
   - Identifier les commits de "fix: remove secret" qui confirment une exposition passée

4. **Vérification du .gitignore**
   - Contrôler que les fichiers sensibles sont bien exclus : `.env*`, `*.pem`, `*.key`, `secrets/`
   - Vérifier que le `.gitignore` est commité AVANT les fichiers sensibles
   - Tester avec `git check-ignore -v <fichier>` pour chaque fichier sensible
   - Vérifier l'absence de `.gitignore` global qui masquerait des fichiers trackés

5. **Détection des patterns courants par provider**
   - **AWS** : `AKIA[0-9A-Z]{16}` pour les Access Key IDs, secret access keys
   - **Azure** : connection strings, SAS tokens, client secrets AAD
   - **GCP** : service account JSON, API keys (`AIza[0-9A-Za-z-_]{35}`)
   - **JWT secrets** : `secret:`, `jwt_secret`, `JWT_SECRET` avec valeurs faibles
   - **Base de données** : connection strings MySQL, PostgreSQL, MongoDB, Redis avec credentials
   - **Autres** : Stripe keys (`sk_live_`), Slack tokens (`xoxb-`), GitHub PATs (`ghp_`)

6. **Vérification des variables d'environnement vs hardcoded**
   - Identifier les configurations qui devraient utiliser `process.env` / `os.environ` mais n'y recourent pas
   - Vérifier que les variables d'environnement sont documentées dans `.env.example` sans valeurs réelles
   - Contrôler que les valeurs par défaut dans le code ne sont pas des credentials valides
   - Vérifier la cohérence entre les envs (dev/staging/prod utilisent leurs propres secrets)

7. **Recommandation d'outils**
   - **gitleaks** : scan de repo Git complet, intégration CI/CD, règles personnalisables
   - **truffleHog** : détection haute entropie + patterns, analyse de l'historique Git
   - **detect-secrets** : baseline des secrets connus, intégration pre-commit
   - **git-secrets** : hook pre-commit pour bloquer les commits contenant des secrets AWS
   - **Semgrep** : règles SAST pour détecter les patterns de secrets dans le code
   - **SOPS / age** : chiffrement des fichiers de secrets dans le repo

8. **Plan de remédiation : rotation des secrets + vault setup**
   - **Rotation immédiate** : révoquer et régénérer tous les secrets exposés (même dans l'historique)
   - **Réécriture de l'historique Git** : `git filter-branch` ou BFG Repo Cleaner pour supprimer les secrets
   - **Migration vers un vault** :
     - Azure Key Vault : `az keyvault secret set --vault-name <vault> --name <secret> --value <val>`
     - HashiCorp Vault : `vault kv put secret/app key=value`
     - AWS Secrets Manager : `aws secretsmanager create-secret --name <name> --secret-string <val>`
   - **Mise en place de hooks pre-commit** pour bloquer les prochains commits avec secrets

## Règles
- Adapte les patterns de détection au stack technique et aux providers cloud utilisés
- Reste éthique : signale les secrets exposés uniquement au propriétaire légitime du code
- Priorise toujours par criticité — un secret de production expose immédiatement des données réelles
- Fournis des exemples de code concrets pour la migration vers les variables d'environnement et les vaults
- Toujours recommander la rotation des secrets AVANT la suppression de l'historique Git
