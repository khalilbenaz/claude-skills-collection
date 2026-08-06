---
name: soc-analyst-guide
description: Guide pour analyste SOC — triage d'alertes, investigation, SIEM, indicateurs de compromission et playbooks de réponse. Se déclenche avec "SOC", "analyste SOC", "SIEM", "IoC", "incident de sécurité", "triage sécurité".
---

# Guide Analyste SOC

## 1. Triage initial (< 5 min)

**Critères de priorisation** — Appliquer un score composite :

| Facteur | Poids |
|---|---|
| Sévérité SIEM (critique/haute/moyenne/basse) | 40 % |
| Criticité de l'asset (DC, prod, PII) | 30 % |
| Fiabilité de la règle (% faux positifs historique) | 20 % |
| Contexte horaire (heures ouvrées vs nuit/weekend) | 10 % |

**Commandes rapides de qualification :**

```bash
# Réputation IP en ligne de commande
curl -s "https://api.abuseipdb.com/api/v2/check?ipAddress=<IP>&maxAgeInDays=30" \
  -H "Key: $ABUSEIPDB_KEY" | jq '.data | {score: .abuseConfidenceScore, country: .countryCode}'

# Hash VirusTotal CLI
vt file <sha256_hash>

# Résolution inverse + ASN
whois <IP> | grep -E 'OrgName|CIDR|country'
dig -x <IP> +short
```

**Décision faux positif vs vrai positif :**
- Même alerte sur le même asset > 3 fois en 24 h sans activité suspecte corrélée → tuning, pas escalade
- Asset non-critique, IP privée interne, comportement connu → close/informational
- Asset critique OU IoC confirmé VirusTotal/MISP → ouvrir un ticket incident

---

## 2. Qualification de l'incident

Corréler dans la fenêtre -1 h / +1 h autour de l'alerte :

```spl
# Splunk — corrélation par host
index=security sourcetype=* host="<HOSTNAME>"
  earliest=-1h latest=+1h
| eval _time=strptime(_time, "%Y-%m-%d %H:%M:%S")
| sort _time
| table _time, sourcetype, EventCode, user, src_ip, dest_ip, process, message
```

```kql
// Microsoft Sentinel — timeline host
SecurityEvent
| where Computer == "<HOSTNAME>"
| where TimeGenerated between (ago(1h) .. now())
| project TimeGenerated, EventID, Account, Process, CommandLine, IpAddress
| order by TimeGenerated asc
```

**Mapping MITRE ATT&CK rapide :**

| Observation | Tactique ATT&CK | Technique |
|---|---|---|
| Connexion RDP depuis IP étrangère | Initial Access | T1133 External Remote Services |
| `powershell -enc` ou `cmd /c` | Execution | T1059.001 / T1059.003 |
| `net user /add` en dehors heures bureau | Persistence | T1136.001 |
| Beacon régulier vers IP externe | C2 | T1071 Application Layer Protocol |
| Exfiltration DNS (TXT records longs) | Exfiltration | T1048.003 |

---

## 3. Collecte forensique (ne pas contaminer)

**Ordre de volatilité (RFC 3227) — collecter du plus volatile au moins volatile :**

1. RAM / processus actifs
2. Connexions réseau actives
3. Logs système en mémoire
4. Fichiers temporaires
5. Logs sur disque
6. Images disque

```powershell
# Windows — snapshot processus et connexions réseau
Get-Process | Select-Object Name,Id,CPU,WorkingSet,Path | Export-Csv proc_snapshot.csv
netstat -ano | Out-File netstat_snapshot.txt
Get-NetTCPConnection | Where-Object State -eq 'Established' | Export-Csv tcp_connections.csv

# Dump mémoire processus suspect (PID connu)
& "C:\Program Files\Sysinternals\procdump.exe" -ma <PID> C:\forensics\proc_<PID>.dmp
```

```bash
# Linux — collecte rapide
ss -tnap > /tmp/ir/connections.txt
ps auxf > /tmp/ir/processes.txt
find /tmp /var/tmp /dev/shm -type f -newer /proc/1 2>/dev/null > /tmp/ir/new_files.txt
last -n 50 > /tmp/ir/logins.txt
journalctl --since "2h ago" > /tmp/ir/journal.txt
```

---

## 4. Extraction et partage des IoCs

**Format STIX 2.1 minimal pour partage MISP :**

```json
{
  "type": "indicator",
  "spec_version": "2.1",
  "id": "indicator--<uuid>",
  "created": "2026-06-24T00:00:00Z",
  "name": "C2 domain observé incident IR-2026-042",
  "pattern": "[domain-name:value = 'malicious-domain.example']",
  "pattern_type": "stix",
  "valid_from": "2026-06-24T00:00:00Z",
  "labels": ["malicious-activity"],
  "confidence": 85
}
```

**Push MISP via CLI :**

```bash
# Ajouter un attribut IP à un event MISP existant
misp-modules -m add_attribute --event-id <EVENT_ID> --type ip-dst --value <IP> \
  --comment "C2 identifié IR-2026-042" --to_ids 1
```

---

## 5. Playbooks de réponse type

### Phishing confirmé
1. Isoler la boîte mail concernée (O365 : `Set-Mailbox -Identity user -AccountDisabled $true`)
2. Purger le mail de toutes les boîtes : `Search-UnifiedAuditLog` → Compliance Center purge
3. Bloquer le domaine expéditeur dans le proxy/MTA
4. Rechercher les clics sur le lien dans les logs proxy
5. Réinitialiser MFA de l'utilisateur si clic confirmé

### Ransomware détecté
1. **Isoler immédiatement** (couper le réseau, pas éteindre — préserver la RAM)
2. Identifier le patient zéro via les logs de partage SMB
3. Snapshot VM avant toute action
4. Contacter le CERT si impact > 10 assets ou données sensibles
5. Ne jamais payer sans analyse légale préalable

### Brute force SSH/RDP réussi
1. Vérifier les connexions actives depuis la session suspecte
2. Killer la session : `kill -9 <PID>` ou `logoff <SESSION_ID>`
3. Bloquer l'IP source (firewall + fail2ban / Conditional Access)
4. Analyser les actions post-authentification (sudo, cron, fichiers créés)
5. Forcer rotation credentials du compte ciblé

---

## 6. Documentation et clôture

**Template rapport d'incident (champs minimaux) :**

```
Incident ID : IR-YYYY-NNN
Date/Heure détection :
Date/Heure clôture :
Analyste :
Sévérité finale : [P1/P2/P3/P4]
Assets impactés :
Vecteur initial :
Timeline (UTC) :
  - HH:MM — [action/observation]
IoCs extraits : [IP, hash, domaine, compte]
Actions de remédiation :
Recommandations :
MITRE ATT&CK : [Tactic — Technique ID]
```

---

## 7. Tuning et amélioration continue

```spl
# Splunk — identifier les règles les plus bruyantes (faux positifs)
index=notable | stats count, dc(host) as hosts by search_name
| sort -count | head 20
```

- Règle > 95 % faux positifs sur 30 jours → désactiver ou restreindre le scope
- Règle jamais déclenchée en 90 jours → revalider la pertinence
- Nouvel IoC confirmé → créer une règle de détection dans les 24 h

---

## Garde-fous et anti-patterns

- **Ne jamais triage depuis la mémoire** — documenter dans le SIEM/ticketing, pas dans ta tête
- **Ne pas éteindre un système compromis** avant d'avoir dumpé la RAM (perte d'artefacts volatils)
- **Éviter les faux urgences** — une alerte CRITICAL automatique sans corrélation n'est pas un incident P1
- **Ne pas partager d'IoCs bruts** sans les valider (IP privées, faux positifs = pollution threat intel)
- **Ne jamais investiguer seul un P1** — toujours un binôme, trail d'audit complet
- **Pas d'action corrective sans snapshot/backup** de l'état actuel
- **Méfiance envers les logins "légitimes"** — Living-off-the-land (LOLBins) : `wmic`, `certutil`, `mshta` utilisés à des fins malveillantes
