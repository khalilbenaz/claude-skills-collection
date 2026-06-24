---
name: security-incident-response-plan
description: Plan de réponse aux incidents de sécurité — préparation, détection, containment, éradication, recovery et lessons learned. Se déclenche avec "incident response", "plan de réponse", "breach", "compromission", "réponse à incident", "CSIRT".
---

# Plan de Réponse aux Incidents

## Matrice de sévérité (déclencher dès la détection)

| Niveau | Critères | Délai de réponse | Escalade |
|--------|----------|-----------------|----------|
| P1 — Critique | Ransomware actif, exfiltration en cours, infrastructure core compromise | < 15 min | CSIRT complet + direction |
| P2 — Majeur | Accès non autorisé confirmé, backdoor détectée, compromission compte privilégié | < 1 h | CSIRT + responsable sécurité |
| P3 — Modéré | Tentative d'intrusion détectée, malware isolé sur poste | < 4 h | Analyste sécurité |
| P4 — Mineur | Anomalie de log, faux positif probable | < 24 h | Surveillance renforcée |

---

## Workflow — 6 phases PICERL

### 1. Préparation (avant tout incident)

**Équipe CSIRT minimale :**
- Incident Manager — coordonne et décide
- Analyste forensique — collecte preuves, analyse technique
- Responsable communication — messages internes/externes
- Référent juridique/conformité — obligations légales, RGPD

**Kit forensique prêt à l'emploi :**
```bash
# Image disque à chaud (Linux)
dd if=/dev/sda bs=4M conv=sync,noerror | gzip > /secure/evidence/$(hostname)_$(date +%Y%m%d_%H%M%S).img.gz

# Capture mémoire RAM (Linux — LiME)
sudo insmod lime.ko "path=/secure/evidence/ram_$(date +%Y%m%d_%H%M%S).lime format=lime"

# Export logs Windows Event Log
wevtutil epl Security C:\Evidence\Security_%DATE%.evtx
wevtutil epl System   C:\Evidence\System_%DATE%.evtx
wevtutil epl Application C:\Evidence\App_%DATE%.evtx
```

**Contacts d'urgence (à maintenir à jour) :**
```
CSIRT interne : [email] + [téléphone astreinte]
ANSSI / CERT national : cert@ssi.gouv.fr / +33 1 71 75 84 68
Assureur cyber : [référence police + n° sinistres]
Prestataire forensique externe : [NDA signé en place]
Autorité de contrôle RGPD (CNIL FR) : notifications@cnil.fr
```

---

### 2. Identification & Analyse

**Sources de détection à corréler :**
- SIEM (règles Sigma corrélées), EDR/XDR, IDS/IPS
- Threat intelligence feeds (MISP, OpenCTI, VirusTotal)
- Signalement utilisateur, honeypots, canary tokens

**Triage initial — questions clés :**
```
1. Quel est le vecteur d'entrée probable ? (phishing, CVE exploitée, credential stuffing)
2. Quels systèmes/données sont dans le périmètre impacté ?
3. L'attaquant a-t-il encore accès actif ?
4. Y a-t-il exfiltration de données (PII, secrets, données métier) ?
5. L'incident est-il encore en cours ou contenu ?
```

**Préserver les preuves AVANT toute action corrective :**
```bash
# Capture réseau en cours (tcpdump)
tcpdump -i eth0 -w /secure/evidence/capture_$(date +%Y%m%d_%H%M%S).pcap

# Snapshot VM avant isolation (AWS)
aws ec2 create-snapshot --volume-id vol-XXXXXX --description "IR-$(date +%Y%m%d)-pre-containment"

# Export logs CloudTrail (AWS) sur période suspecte
aws cloudtrail lookup-events \
  --start-time 2026-06-01T00:00:00Z \
  --end-time 2026-06-24T23:59:59Z \
  --output json > /secure/evidence/cloudtrail_export.json
```

---

### 3. Containment

**Containment réseau immédiat :**
```bash
# Isoler un hôte Linux du réseau (firewall local)
iptables -I INPUT  1 -j DROP
iptables -I OUTPUT 1 -j DROP
iptables -I INPUT  2 -s <IP_CSIRT> -j ACCEPT   # Garder accès forensique

# Bloquer une IP suspecte sur pfSense/iptables
iptables -A INPUT  -s <IP_ATTAQUANT> -j DROP
iptables -A OUTPUT -d <IP_ATTAQUANT> -j DROP

# Révoquer une session active (Entra ID / Azure AD)
az ad user revoke-signin-sessions --id user@domain.com

# Désactiver un compte AD compromis
Disable-ADAccount -Identity "compromised_user"
Set-ADUser -Identity "compromised_user" -PasswordNeverExpires $false
```

**Critère de décision — isolement total vs partiel :**
- Isolement total (coupure réseau) → attaque active, ransomware en propagation
- Isolement partiel (VLAN de quarantaine) → investigation en cours, impact métier fort

---

### 4. Éradication

**Checklist éradication :**
```
[ ] Tous les malwares/outils attaquant supprimés et vérifiés (hash VirusTotal)
[ ] Backdoors fermées : ports inattendus fermés, tâches planifiées suspectes supprimées
[ ] Credentials compromis révoqués : mots de passe, tokens, clés API, certificats
[ ] CVE exploitée patchée sur TOUS les systèmes du parc (pas seulement le compromis)
[ ] Règles de détection SIEM mises à jour pour détecter les IOC de cet incident
[ ] Scan complet post-éradication (Nessus, OpenVAS) avant réintégration
```

```bash
# Rechercher des tâches planifiées suspectes (Linux)
crontab -l -u root
ls -la /etc/cron* /var/spool/cron/

# Rechercher des services persistants inhabituels (Windows)
Get-ScheduledTask | Where-Object { $_.TaskPath -notlike "\Microsoft\*" } | Select-Object TaskName, TaskPath, State

# Chercher des clés de registre Run suspectes
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
```

---

### 5. Recovery

**Restauration contrôlée :**
```bash
# Vérifier l'intégrité du backup avant restauration
sha256sum backup_2026-06-20.tar.gz  # Comparer avec le hash stocké offline

# Restaurer depuis snapshot validé (AWS)
aws ec2 create-volume --snapshot-id snap-XXXXXX --availability-zone eu-west-1a

# Monitoring renforcé post-restauration (Wazuh/OSSEC)
# Augmenter la fréquence des scans pendant 30 jours
```

**Critères de retour en production :**
- Scan de vulnérabilités validé (0 critique, 0 haute non mitigée)
- Logs centralisés et règles de détection actives
- Confirmation métier du fonctionnement nominal
- Revue de sécurité signée par l'Incident Manager

---

### 6. Lessons Learned (post-mortem J+5 max)

**Template timeline post-mortem :**
```
Date/Heure | Action | Acteur | Résultat
-----------|--------|--------|--------
J0 08:42   | Alerte SIEM déclenchée | Système | IOC détecté
J0 09:00   | Analyse triage initial | Analyste | Confirmation P2
...
```

**Questions structurantes :**
- Comment l'attaquant est-il entré ? (vecteur initial)
- Qu'est-ce qui a permis la détection ? Aurait-on pu détecter plus tôt ?
- Quels contrôles ont fonctionné / ont failli ?
- Quelles actions correctives avec responsable + deadline ?

---

## Obligations légales de notification

| Réglementation | Délai | Destinataire |
|---------------|-------|-------------|
| RGPD (données personnelles) | 72 h | CNIL (FR) / autorité nationale |
| NIS2 (infrastructure critique) | 24 h (early warning) + 72 h | ANSSI / autorité nationale |
| DORA (finance UE) | 4 h (P1) | Autorité compétente (ACPR, AMF) |
| Secteur santé (HDS) | Immédiat | ANS + CNIL |

---

## Anti-patterns / Pièges

- **Ne pas restaurer avant de forensiquer** — toujours snapshotter avant toute action corrective, sinon les preuves disparaissent.
- **Containment précipité sans capture mémoire** — un processus malveillant en RAM tue les IOC dès l'extinction.
- **Patcher uniquement le système compromis** — si une CVE est exploitée, tout le parc est vulnérable.
- **Communication non contrôlée** — un employé qui tweete l'incident avant la communication officielle aggrave la crise.
- **Ne pas changer TOUS les secrets** — après compromission d'un compte, auditer et révoquer tous les secrets qu'il avait accès (clés SSH, tokens CI/CD, vaults).
- **Réutiliser les mêmes playbooks sans les mettre à jour** — chaque incident apporte des IOC et des techniques nouvelles à intégrer.
- **Oublier les systèmes legacy hors supervision SIEM** — les angles morts sont les premiers exploités.


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
