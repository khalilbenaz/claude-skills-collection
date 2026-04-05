---
name: security-threat-modeling
description: Modélisation des menaces pour applications et systèmes — identification des surfaces d'attaque, classification STRIDE, arbres d'attaque et stratégies de mitigation. À utiliser quand l'utilisateur veut sécuriser une architecture, identifier des vulnérabilités potentielles ou réaliser une analyse de risques. Se déclenche aussi avec "threat modeling", "modélisation des menaces", "surface d'attaque", "STRIDE", "risques de sécurité", "analyse de menaces", "DREAD".
---

# Modélisation des Menaces

## Workflow

1. **Décomposer** : identifier les composants, flux de données et points d'entrée.
2. **Identifier** : appliquer STRIDE pour trouver les menaces.
3. **Évaluer** : prioriser avec DREAD ou une matrice impact/probabilité.
4. **Atténuer** : définir les contrôles de sécurité pour chaque menace.

## Méthodologie STRIDE

| Menace | Description | Cible | Exemples |
|--------|------------|-------|----------|
| **S**poofing | Usurpation d'identité | Authentification | Faux tokens, session hijacking |
| **T**ampering | Altération de données | Intégrité | Modification de requêtes, SQL injection |
| **R**epudiation | Nier une action | Non-répudiation | Absence de logs, logs modifiables |
| **I**nformation Disclosure | Fuite de données | Confidentialité | API exposant trop de champs, logs sensibles |
| **D**enial of Service | Rendre indisponible | Disponibilité | DDoS, épuisement de ressources |
| **E**levation of Privilege | Escalade de droits | Autorisation | IDOR, bypass d'autorisations |

## Analyse par composant

### API REST

```
Menace: Spoofing
  → Contrôle: JWT avec rotation des clés, MFA

Menace: Tampering
  → Contrôle: Validation d'entrée, parameterized queries

Menace: Information Disclosure
  → Contrôle: DTO de réponse (pas d'entités directes), HTTPS

Menace: Elevation of Privilege
  → Contrôle: RBAC, vérification d'ownership sur chaque ressource
```

### Base de données

```
Menace: Tampering
  → Contrôle: Parameterized queries, principes de moindre privilège

Menace: Information Disclosure
  → Contrôle: Chiffrement au repos (TDE), connexions chiffrées

Menace: Denial of Service
  → Contrôle: Connection pooling, query timeouts, rate limiting
```

### File d'attente (RabbitMQ, Service Bus)

```
Menace: Spoofing
  → Contrôle: Authentification des publishers, signatures de messages

Menace: Tampering
  → Contrôle: Intégrité des messages (HMAC), chiffrement

Menace: Repudiation
  → Contrôle: Message IDs, audit trail, correlation IDs
```

## Évaluation DREAD

| Critère | Description | Score (1-10) |
|---------|------------|--------------|
| **D**amage | Impact si exploité | ? |
| **R**eproducibility | Facilité de reproduction | ? |
| **E**xploitability | Facilité d'exploitation | ? |
| **A**ffected users | Nombre d'utilisateurs impactés | ? |
| **D**iscoverability | Facilité de découverte | ? |

Score total = moyenne → Priorité de correction

## Template de rapport

```markdown
### Menace: [Nom]

- **Type STRIDE**: [S/T/R/I/D/E]
- **Composant affecté**: [...]
- **Score DREAD**: [X/10]
- **Description**: [...]
- **Scénario d'attaque**: [...]
- **Impact**: [...]
- **Mitigation recommandée**: [...]
- **Statut**: [Non traité / En cours / Résolu]
```

## Règles
- Chaque nouvelle fonctionnalité doit passer par une **revue STRIDE**.
- Les menaces identifiées doivent être **trackées** comme des tickets.
- Prioriser les menaces par **impact métier**, pas seulement par score technique.
- Revoir le modèle de menaces à chaque **changement d'architecture**.

> Ce skill est un outil d'analyse de sécurité défensif. Il ne fournit pas de techniques d'exploitation.


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
