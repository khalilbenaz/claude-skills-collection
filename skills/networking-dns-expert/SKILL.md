---
name: networking-dns-expert
description: Configuration et dépannage DNS incluant zones, records, DNSSEC, résolution et intégration CDN. Se déclenche avec "DNS", "zone DNS", "enregistrement DNS", "CNAME", "A record", "DNSSEC", "résolution DNS"
---

# DNS Expert

## Workflow

### 1. Analyse de l'architecture existante

Inventorier avant toute modification :

```bash
# Identifier les serveurs DNS autoritaires d'un domaine
dig NS exemple.com +short

# Lister les serveurs récursifs configurés localement
cat /etc/resolv.conf
resolvectl status          # systemd-resolved
nmcli dev show | grep DNS  # NetworkManager
```

Critères de décision :
- **Hébergé chez registrar** → modifier via interface web (Cloudflare, OVH, Gandi…)
- **BIND/PowerDNS auto-hébergé** → éditer fichiers de zone + reload
- **DNS interne (Active Directory)** → utiliser DNSMGMT ou `dnscmd` PowerShell

---

### 2. Diagnostic de résolution

Protocole de tri rapide :

```bash
# Résolution de base
dig A app.exemple.com @8.8.8.8 +short          # Via Google (externe)
dig A app.exemple.com @ns1.exemple.com +short   # Via serveur autoritaire

# Voir le chemin complet de délégation
dig +trace app.exemple.com

# Vérifier si NXDOMAIN ou SERVFAIL
dig app.exemple.com +noall +comments | grep -E "status|flags"

# TTL restant dans le cache d'un résolveur
dig app.exemple.com @votre-dns-interne +ttlunits

# Reverse DNS
dig -x 203.0.113.10 +short
```

| Symptôme | Cause probable | Action |
|---|---|---|
| NXDOMAIN | Enregistrement absent ou typo | Vérifier zone autoritaire |
| SERVFAIL | Zone corrompue / DNSSEC KO | Vérifier logs + `dnssec-verify` |
| Réponse différente selon résolveur | Cache obsolète ou split-horizon | Vider cache + vérifier TTL |
| Timeout | Firewall UDP/53 ou serveur down | Tester TCP : `dig +tcp` |

---

### 3. Configuration des zones

Structure minimale d'un fichier de zone BIND :

```zone
$ORIGIN exemple.com.
$TTL 3600

@   IN  SOA  ns1.exemple.com. admin.exemple.com. (
        2026062401 ; numéro de série YYYYMMDDnn
        3600       ; refresh
        900        ; retry
        604800     ; expire
        300 )      ; negative TTL

; Serveurs de noms
@       IN  NS   ns1.exemple.com.
@       IN  NS   ns2.exemple.com.

; Enregistrements A / AAAA
ns1     IN  A    203.0.113.1
ns2     IN  A    203.0.113.2
@       IN  A    203.0.113.10
www     IN  A    203.0.113.10
app     IN  A    203.0.113.20
@       IN  AAAA 2001:db8::1

; CNAME — jamais à l'apex !
ftp     IN  CNAME  app.exemple.com.

; MX
@       IN  MX  10  mail.exemple.com.
mail    IN  A   203.0.113.30

; SPF / DKIM / DMARC
@       IN  TXT  "v=spf1 mx -all"
_dmarc  IN  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@exemple.com"

; SRV (exemple SIP)
_sip._tcp  IN  SRV  10 20 5060 sip.exemple.com.
```

Validation avant reload :

```bash
named-checkzone exemple.com /etc/bind/db.exemple.com
named-checkconf /etc/bind/named.conf
rndc reload exemple.com          # BIND
pdnsutil check-zone exemple.com  # PowerDNS
```

---

### 4. DNSSEC — mise en place

```bash
# Générer KSK (Key Signing Key) et ZSK (Zone Signing Key)
dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE exemple.com
dnssec-keygen -a ECDSAP256SHA256 -n ZONE exemple.com

# Signer la zone
dnssec-signzone -A -3 $(head -c 16 /dev/urandom | xxd -p) \
  -N INCREMENT -o exemple.com -t db.exemple.com

# Publier le DS chez le registrar (hash de la KSK)
dnssec-dsfromkey Kexemple.com.+013+XXXXX.key
```

Validation de la chaîne de confiance :

```bash
dig DS exemple.com @8.8.8.8 +short
dig DNSKEY exemple.com +short
# Outil en ligne : https://dnssec-debugger.verisignlabs.com/
# ou : https://dnsviz.net/
```

Rotation des clés ZSK (tous les 3 mois recommandé) :
1. Générer nouvelle ZSK
2. Publier dans la zone (pre-publish)
3. Attendre TTL de propagation
4. Signer avec nouvelle ZSK
5. Retirer l'ancienne ZSK après le TTL

---

### 5. Optimisation TTL et CDN

| Type d'enregistrement | TTL recommandé | Raison |
|---|---|---|
| A / AAAA stable | 3600–86400 s | Réduit charge DNS |
| A / AAAA migrant bientôt | 300 s | Changer 48 h avant migration |
| MX | 3600 s | Email tolérant aux délais |
| TXT (SPF, DKIM) | 3600 s | Changements rares |
| CNAME vers CDN | 300 s | Failover rapide |

Intégration CDN — points d'attention :
- **Cloudflare orange-cloud** : le CNAME est résolu en IP Cloudflare — le `dig` ne retourne pas votre IP origine
- **Akamai / Fastly** : utiliser le CNAME fourni par le CDN, ne pas hardcoder les IP Anycast
- **Apex + CDN** : utiliser ALIAS (Route53), ANAME (PowerDNS) ou activer le "CNAME flattening" (Cloudflare)

---

### 6. Haute disponibilité et transferts de zone

```bash
# named.conf — autoriser les transferts vers secondaires
zone "exemple.com" {
    type master;
    file "db.exemple.com";
    allow-transfer { 203.0.113.2; };     // IP ns2
    notify yes;
    also-notify { 203.0.113.2; };
};

# Tester le transfert AXFR
dig AXFR exemple.com @ns1.exemple.com

# Vérifier la synchronisation
dig SOA exemple.com @ns1.exemple.com +short
dig SOA exemple.com @ns2.exemple.com +short
# Les numéros de série doivent être identiques
```

---

### 7. Monitoring et alertes

Métriques à surveiller :
- Expiration de zone (EXPIRE dans SOA)
- Validité des signatures DNSSEC (`RRSIG` — vérifier la date d'expiration)
- Taux de SERVFAIL / NXDOMAIN sur le résolveur
- Latence de réponse > 100 ms

```bash
# Vérifier expiration RRSIG
dig RRSIG A exemple.com +short | awk '{print $5}'  # date expiration

# Script de vérification rapide
for ns in ns1.exemple.com ns2.exemple.com; do
  echo -n "$ns série: "
  dig SOA exemple.com @$ns +short | awk '{print $3}'
done
```

---

## Anti-patterns et pièges

| Piège | Conséquence | Remède |
|---|---|---|
| CNAME à l'apex (@) | Violation RFC 1034 — certains résolveurs rejettent | Utiliser A/AAAA ou ALIAS |
| Oublier d'incrémenter le SOA serial | Secondaires ne propagent pas | Utiliser format `YYYYMMDDnn` |
| TTL trop long avant migration | Downtime prolongé | Baisser à 300 s 48 h avant |
| DNSSEC sans monitoring de RRSIG | Expiration silencieuse → SERVFAIL | Alerter 30 j avant expiration |
| Wildcard `*` + DNSSEC | Enregistrements NSEC exposent la structure | Utiliser NSEC3 avec opt-out |
| Split-horizon sans cohérence | Comportement imprévisible en VPN | Documenter et tester les deux vues |
| `allow-transfer { any; }` | Transfert de zone public (fuite d'info) | Restreindre aux IPs secondaires |

## Bonnes pratiques 2026

- Privilégier **ECDSAP256SHA256** (algo 13) pour DNSSEC plutôt que RSA — plus rapide et sûr
- Activer **DNS-over-HTTPS (DoH)** ou **DNS-over-TLS (DoT)** sur les résolveurs internes pour chiffrer les requêtes
- Utiliser **RPZ (Response Policy Zones)** pour filtrer les domaines malveillants en entreprise
- Exporter les zones vers Git (versionning) — traiter le DNS comme du code (DNS-as-Code avec OctoDNS ou dnscontrol)
- Tester les changements en staging avec `dig` et des outils comme [DNSViz](https://dnsviz.net/) avant déploiement production


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
