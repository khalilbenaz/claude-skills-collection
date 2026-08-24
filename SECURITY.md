# Politique de sécurité

## Ce que ce dépôt contient

Des fichiers Markdown. Aucun code exécutable n'est installé sur votre machine par le plugin :
un skill est une consigne lue par Claude, pas un programme.

Deux exceptions à connaître :

- **`install.sh` / `install.ps1`** sont des scripts que vous exécutez vous-même. Lisez-les avant
  de les passer à `sh` ou `iex` — c'est vrai ici comme pour n'importe quel `curl | sh`.
- **Les blocs de commandes contenus dans les skills** sont proposés à Claude, qui peut vous
  demander de les exécuter. Ils s'exécutent sous votre contrôle et vos permissions Claude Code.
  Relisez-les comme vous reliriez une commande copiée d'un blog.

## Signaler une vulnérabilité

Ouvrez un [advisory privé](https://github.com/khalilbenaz/claude-skills-collection/security/advisories/new).
N'ouvrez pas d'issue publique pour :

- une commande destructive ou exfiltrante dans un skill ;
- une consigne conçue pour détourner Claude de son cadre (prompt injection) ;
- une URL de téléchargement compromise dans `install.sh` / `install.ps1`.

Réponse sous 7 jours. Correction et publication coordonnées avec vous.

## Skills sensibles

Les skills d'audit et de test d'intrusion (`dev-pentest-assistant`, `dev-secrets-scanner`,
`dev-vulnerability-analyzer`, `dev-smart-contract-auditor`, `dev-security-auditor`,
`security-security-audit-automation`) portent leur propre cadre d'usage dans leur corps :
autorisation écrite, périmètre défini, divulgation responsable. Toute PR qui affaiblit ces
sections sera refusée.

## Versions supportées

Seul `main` est maintenu. Les tags de version sont des instantanés ; les correctifs vont sur `main`.
