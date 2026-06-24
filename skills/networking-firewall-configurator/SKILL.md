---
name: networking-firewall-configurator
description: Configuration de firewalls et règles de sécurité réseau pour iptables/nftables, pfSense, Azure NSG, AWS Security Groups et Cisco ACL. Se déclenche avec "firewall", "iptables", "pfSense", "NSG", "Security Group", "règles firewall", "ports"
---

# Firewall Configurator

## Workflow

### 1. Inventaire de l'existant
Recenser les règles actives avant toute modification.

```bash
# iptables — lister les règles avec numéros de ligne et compteurs
iptables -nvL --line-numbers

# nftables (Linux moderne)
nft list ruleset

# pfSense — via CLI
pfctl -sr

# Azure NSG — lister toutes les règles effectives sur une NIC
az network nic list-effective-nsg --name myNIC --resource-group myRG -o table

# AWS Security Group — voir les règles entrantes/sortantes
aws ec2 describe-security-groups --group-ids sg-xxxxx \
  --query 'SecurityGroups[*].{In:IpPermissions,Out:IpPermissionsEgress}'
```

### 2. Matrice de flux

Avant d'écrire une règle, remplir ce tableau pour chaque flux :

| Source | Destination | Port/Proto | Sens | Justification |
|--------|-------------|------------|------|---------------|
| 10.0.1.0/24 | 10.0.2.10 | 443/tcp | IN | API frontend→backend |
| 0.0.0.0/0 | 10.0.5.0/24 | 22/tcp | IN | Accès SSH ops (à restreindre) |

**Critère de décision — quelle plateforme ?**
- Machine Linux bare-metal/VM → `nftables` (iptables en legacy)
- Routeur/appliance BSD → `pfSense` / `pfctl`
- Infra Azure → NSG (attaché subnet ou NIC)
- Infra AWS → Security Group (stateful) + NACL (stateless)
- On-prem Cisco → ACL étendue

### 3. Rédaction des règles

**iptables — politique par défaut DROP + règles minimales**
```bash
# Vider et poser la politique DROP
iptables -F && iptables -X
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Permettre loopback et connexions établies
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# SSH restreint à un bastion
iptables -A INPUT -s 10.0.0.5/32 -p tcp --dport 22 -m comment --comment "SSH depuis bastion" -j ACCEPT

# HTTPS public
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Persister (Debian/Ubuntu)
iptables-save > /etc/iptables/rules.v4
```

**nftables — équivalent moderne**
```nft
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    iif lo accept
    ct state established,related accept
    ip saddr 10.0.0.5 tcp dport 22 comment "SSH bastion" accept
    tcp dport 443 accept
    limit rate 5/second counter log prefix "DROP: " drop
  }
  chain forward { type filter hook forward priority 0; policy drop; }
  chain output  { type filter hook output  priority 0; policy accept; }
}
```

**Azure NSG via CLI**
```bash
# Autoriser HTTPS entrant, priorité 100 (plus petit = priorité haute)
az network nsg rule create \
  --resource-group myRG \
  --nsg-name myNSG \
  --name Allow-HTTPS-In \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --description "HTTPS public"

# Bloquer tout le reste (règle de fin explicite, priorité 4096)
az network nsg rule create \
  --resource-group myRG --nsg-name myNSG \
  --name DenyAll-In --priority 4096 \
  --direction Inbound --access Deny \
  --protocol '*' --destination-port-ranges '*'
```

**AWS Security Group via CLI**
```bash
# Autoriser HTTPS depuis Internet
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Révoquer une règle existante
aws ec2 revoke-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp --port 3389 --cidr 0.0.0.0/0
```

### 4. Validation avant production

```bash
# Tester la connectivité TCP sans établir de session (ncat)
nc -zv 10.0.2.10 443

# Simuler un paquet avec hping3
hping3 -S -p 443 10.0.2.10

# Test de port bloqué (doit timeout)
curl --connect-timeout 3 http://10.0.2.10:8080 || echo "Bloqué OK"

# Azure — tester le routage effectif
az network watcher test-connectivity \
  --resource-group myRG \
  --source-resource myVM \
  --dest-address 10.0.2.10 --dest-port 443
```

### 5. Déploiement avec rollback prêt

```bash
# iptables — sauvegarder AVANT toute modification
iptables-save > /tmp/iptables_backup_$(date +%Y%m%d_%H%M%S).rules

# Appliquer les nouvelles règles (script à rouler)
bash apply_rules.sh

# En cas de coupure : rollback en 1 ligne
iptables-restore < /tmp/iptables_backup_20260624_143000.rules
```

Pour les sessions SSH à risque : utiliser `at` pour un rollback automatique :
```bash
echo "iptables-restore < /tmp/backup.rules" | at now + 5 minutes
# Si tout va bien, annuler le job
atrm <job-id>
```

### 6. Journalisation et monitoring

```bash
# iptables — loguer les paquets DROP avant la règle terminale
iptables -I INPUT -m limit --limit 5/min -j LOG --log-prefix "FW-DROP: " --log-level 4

# nftables — compteur + log
table inet filter {
  chain input {
    ...
    counter log prefix "DROP: " drop
  }
}

# Analyser les logs (systemd)
journalctl -k | grep "FW-DROP" | awk '{print $12}' | sort | uniq -c | sort -rn | head 20
```

Outils de monitoring recommandés :
- **iptraf-ng** — trafic réseau temps réel
- **fail2ban** — ban automatique sur patterns de logs
- **Azure Monitor / NSG Flow Logs** — activez via Azure Network Watcher
- **AWS VPC Flow Logs** — activer sur le VPC ou ENI cible

### 7. Documentation

Chaque règle doit avoir : date, auteur, ticket associé, justification. Versionner avec git.

---

## Garde-fous / Anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| Politique par défaut ACCEPT | Toute règle manquante = ouverture | Toujours `policy drop` en INPUT/FORWARD |
| Règle `0.0.0.0/0` sur port 22 | Exposition SSH au monde | Restreindre au bastion ou VPN |
| Appliquer sans backup | Rollback impossible | `iptables-save` avant chaque modif |
| Priorités NSG toutes à 100 | Conflits silencieux | Espacer de 100 (100, 200, 300…) |
| Security Group sans description | Audit impossible | Toujours renseigner le champ `description` |
| Règles temporaires jamais nettoyées | Surface d'attaque croissante | Revue trimestrielle + TTL documenté |
| Ouvrir un range de ports (1000-9000) | Moindre privilège violé | Ouvrir uniquement les ports nécessaires |
| NACL AWS stateless oublié | Réponses bloquées en sortie | Toujours paire IN+OUT sur NACL |

## Bonnes pratiques 2026

- **Zero-trust perimeter** : ne pas faire confiance au trafic est-ouest interne ; appliquer des NSG/SG aussi entre sous-réseaux internes.
- **Infrastructure as Code** : gérer les règles via Terraform/Bicep, jamais en mode console manuel en prod.
- **Tagging obligatoire** (cloud) : chaque SG/NSG doit avoir les tags `env`, `owner`, `ticket`.
- **Audit régulier** : exécuter un scan de règles inutilisées (`aws ec2 describe-security-groups` + script de comparaison avec les flux réels via VPC Flow Logs).
- **Séparation SSH/RDP** : accès administration uniquement via bastion ou VPN, jamais exposé directement.
- **IPv6** : toujours configurer `ip6tables` ou les règles NSG IPv6 en parallèle ; une règle IPv4 n'affecte pas IPv6.


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
