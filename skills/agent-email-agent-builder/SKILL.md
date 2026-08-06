---
name: agent-email-agent-builder
description: Construction d'agents de gestion d'emails incluant tri, réponse automatique, extraction et classification. Se déclenche avec "email agent", "agent email", "tri automatique", "réponse automatique email", "classification email. Also triggers on "auto reply agent", "inbox triage agent".
---

# Email Agent Builder

## Critères de décision — Quelle source connecter ?

| Cas | Solution |
|-----|----------|
| Microsoft 365 / Exchange Online | Microsoft Graph API + OAuth2 (Delegated ou App-only) |
| Gmail / Google Workspace | Gmail API + OAuth2 (Service Account pour full-auto) |
| IMAP générique (hébergement, Outlook on-premise) | IMAP4 + STARTTLS, polling toutes les N secondes |
| Temps réel critique (SLA < 30 s) | Graph webhooks (changeNotifications) ou Gmail push (Pub/Sub) |
| Volume > 10 000 emails/jour | Kafka topic + consumer group pour paralléliser |

---

## Workflow en étapes

### 1. Connexion et authentification

```python
# Microsoft Graph — App-only (sans interaction utilisateur)
from msal import ConfidentialClientApplication

app = ConfidentialClientApplication(
    client_id=CLIENT_ID,
    client_credential=CLIENT_SECRET,
    authority=f"https://login.microsoftonline.com/{TENANT_ID}"
)
token = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
# Stocker token["access_token"] dans un vault (Azure Key Vault, HashiCorp Vault)
# Ne jamais logger ce token, ne jamais le committer
```

```python
# Gmail — Service Account
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file(
    "sa.json",
    scopes=["https://www.googleapis.com/auth/gmail.modify"]
).with_subject("inbox@company.com")
service = build("gmail", "v1", credentials=creds)
```

**Checklist connexion :**
- [ ] Refresh token stocké en vault, jamais en `.env` committé
- [ ] Scopes minimaux (lecture seule si l'agent ne répond pas)
- [ ] Webhook/subscription renouvelé avant expiration (Graph : 60 min max)

---

### 2. Parser et normaliser les emails

```python
import email
from email import policy

def parse_raw(raw_bytes: bytes) -> dict:
    msg = email.message_from_bytes(raw_bytes, policy=policy.default)
    body_plain = ""
    body_html  = ""
    attachments = []

    for part in msg.walk():
        ct = part.get_content_type()
        if ct == "text/plain" and not body_plain:
            body_plain = part.get_content()
        elif ct == "text/html" and not body_html:
            body_html = part.get_content()
        elif part.get_filename():
            attachments.append({
                "filename": part.get_filename(),
                "content_type": ct,
                "size": len(part.get_payload(decode=True) or b""),
            })

    return {
        "message_id": msg["Message-ID"],
        "from": msg["From"],
        "to": msg.get_all("To", []),
        "subject": msg["Subject"],
        "date": msg["Date"],
        "body_plain": strip_signature(body_plain),
        "body_html": body_html,
        "attachments": attachments,
    }

def strip_signature(text: str) -> str:
    """Coupe aux marqueurs communs de signature."""
    markers = ["-- \n", "Cordialement,", "Best regards,", "Sent from my"]
    for m in markers:
        if m in text:
            text = text[:text.index(m)]
    return text.strip()
```

---

### 3. Classifier avec un LLM

```python
import anthropic, json

SYSTEM = """Tu es un classificateur d'emails B2B. Réponds UNIQUEMENT en JSON.
Schéma : {"category": "support|commercial|rh|facturation|autre",
           "urgency": "critique|haute|normale|basse",
           "intent": "demande|reclamation|information|confirmation|spam",
           "confidence": 0.0-1.0}"""

def classify(email_data: dict) -> dict:
    client = anthropic.Anthropic()
    prompt = f"Sujet: {email_data['subject']}\n\nCorps:\n{email_data['body_plain'][:1500]}"
    resp = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=200,
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(resp.content[0].text)
```

**Seuils de confiance :**
- `confidence >= 0.85` → action automatique autorisée
- `0.60 <= confidence < 0.85` → draft généré, validation humaine requise
- `confidence < 0.60` → router immédiatement vers un humain, sans draft

---

### 4. Extraire les entités structurées

```python
EXTRACT_SYSTEM = """Extrais les entités de l'email en JSON strict.
Schéma : {"references": [], "amounts": [], "dates": [], "persons": [],
           "companies": [], "action_required": bool, "deadline": null|"ISO8601"}"""

def extract_entities(email_data: dict) -> dict:
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=400,
        system=EXTRACT_SYSTEM,
        messages=[{"role": "user", "content": email_data["body_plain"][:2000]}]
    )
    return json.loads(resp.content[0].text)
```

Mapper ensuite vers votre CRM/ERP via l'API correspondante (Salesforce REST, Jira REST, SAP via RFC).

---

### 5. Générer les réponses automatiques

```python
RESPONSE_SYSTEM = """Tu es l'assistant email de {company}. Rédige une réponse professionnelle
en {lang} sur la base du contexte fourni. Sois concis (< 150 mots). Ne promets pas
de délais sans les avoir vérifiés. Ne divulgue pas d'informations internes."""

def draft_response(email_data: dict, classification: dict, context: str) -> str:
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=500,
        system=RESPONSE_SYSTEM.format(company="Acme", lang="français"),
        messages=[{
            "role": "user",
            "content": f"Email reçu:\n{email_data['body_plain'][:1000]}\n\nContexte CRM:\n{context}"
        }]
    )
    return resp.content[0].text
```

**Règle d'or :** toute réponse générée est un **draft** par défaut. L'envoi automatique n'est activé qu'après validation explicite en configuration, pour des catégories à risque nul (accusé de réception, confirmation de rendez-vous sans engagement).

---

### 6. Routage et orchestration

```python
def route(classification: dict, entities: dict) -> str:
    if classification["intent"] == "spam":
        return "archive"
    if classification["urgency"] == "critique":
        return "escalate_human"  # alerte Slack/PagerDuty immédiate
    if classification["category"] == "facturation" and entities.get("amounts"):
        return "queue:finance"
    if classification["confidence"] < 0.85:
        return "queue:review"
    return "queue:auto_reply"
```

Intégrations courantes :
- **Slack** : `POST /api/chat.postMessage` avec mention `@responsable`
- **Jira** : `POST /rest/api/3/issue` avec champs custom mappés depuis `entities`
- **Salesforce** : upsert sur `Case` via l'objet `sObject`

---

### 7. Anti-boucles et sécurité d'envoi

```python
AUTO_REPLY_HEADERS = {"X-Auto-Reply": "true", "Auto-Submitted": "auto-replied"}

def is_auto_reply(headers: dict) -> bool:
    """Détecte les emails déjà automatiques pour éviter les boucles infinies."""
    return any([
        headers.get("X-Auto-Reply"),
        headers.get("Auto-Submitted", "").startswith("auto"),
        "MAILER-DAEMON" in headers.get("From", "").upper(),
        headers.get("Precedence") in ("bulk", "list", "junk"),
    ])
```

**Rate limiting :** max 1 réponse automatique par expéditeur par heure, stocké en Redis :
```python
key = f"autoreply:{sender_email}"
if redis.incr(key) == 1:
    redis.expire(key, 3600)
elif redis.get(key) > 1:
    raise AutoReplyThrottled(sender_email)
```

---

### 8. Monitoring et feedback loop

Métriques essentielles à exposer (Prometheus/Grafana) :
- `email_classified_total{category, urgency}` — compteur
- `email_classification_confidence_histogram` — distribution
- `email_human_review_rate` — objectif < 15 %
- `email_processing_duration_seconds` — SLO < 5 s P95

Feedback loop :
1. L'opérateur corrige une classification dans l'interface de review
2. La correction est loggée dans un dataset JSONL versionné (Git LFS)
3. Tous les 500 corrections accumulées → fine-tune ou mise à jour du prompt système
4. Ré-évaluer sur le jeu de test avant de déployer en production

---

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Remède |
|---|---|---|
| Envoi auto sans seuil de confiance | Réponses erronées envoyées aux clients | Seuil `>= 0.85` obligatoire |
| Stocker les tokens OAuth en `.env` committé | Compromission du compte email | Vault (Azure KV, AWS Secrets Manager) |
| Pas de détection de boucles | Auto-reply storm entre serveurs | Header `Auto-Submitted` + Redis rate limit |
| Transférer les PJ sans scan | Propagation de malware | ClamAV / API AV avant tout forward |
| Répondre aux emails juridiques/financiers automatiquement | Engagement contractuel non voulu | Whitelist catégories auto-reply ; exclure `facturation`, `legal` |
| Absence d'audit trail | Non-conformité RGPD | Logguer message_id, classification, action, timestamp dans append-only store |
| Prompt LLM sans longueur cap | Injection via corps email long | Tronquer le body à 2 000 caractères avant envoi au LLM |

---

## Bonnes pratiques 2026

- **Model routing** : utiliser `claude-haiku-4-5` pour la classification (faible coût, latence < 1 s) et `claude-sonnet-4-5` pour la génération de réponse.
- **Structured outputs** : préférer `tool_use` ou JSON-mode pour garantir un schéma strict plutôt que parser du texte libre.
- **RGPD** : anonymiser les emails dans les logs (remplacer adresses par hash SHA-256). Définir une politique de rétention (ex. 90 jours) avec purge automatique.
- **Test harness** : maintenir un dataset de 200+ emails labelisés pour régression à chaque changement de prompt ou de modèle.
- **Idempotence** : dédupliquer par `Message-ID` avant traitement pour éviter les doubles réponses lors de retries.


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
