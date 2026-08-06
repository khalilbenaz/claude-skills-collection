---
name: agent-sales-agent-builder
description: Construction d'agents de vente IA pour prospection, qualification et suivi commercial. Se déclenche avec "sales agent", "agent commercial", "agent de vente", "prospection IA", "SDR agent", "lead qualification agent", "outreach agent", "follow-up automatique". Also triggers on "outbound prospecting agent".
---

# Sales Agent Builder

## Quand utiliser ce skill

Conçois un agent commercial automatisant tout ou partie du cycle outbound : enrichissement de leads, qualification structurée (BANT/MEDDIC), rédaction d'emails personnalisés, séquences multi-touch, mise à jour CRM, prise de rendez-vous. S'applique aux équipes SDR/BDR, startups B2B en croissance et toute équipe cherchant à industrialiser les tâches répétitives sans sacrifier la personnalisation.

---

## Workflow en étapes

### 1. Choix du mode d'autonomie

Avant de coder : décide du niveau d'autonomie selon la maturité de l'équipe.

| Mode | Comportement | Quand l'utiliser |
|---|---|---|
| **Human-in-the-loop** | Propose les emails, attend validation avant envoi | Phase initiale (< 100 emails validés) |
| **Semi-autonome** | Envoie automatiquement les templates approuvés, escalade les cas ambigus | Taux de réponse > 10% confirmé |
| **Fully autonomous** | Gère l'intégralité du cycle sans intervention | Après 3+ mois de données, superviseur actif |

**Toujours démarrer en human-in-the-loop.** Passer en semi-autonome uniquement après validation de 100 emails minimum et taux de réponse > 10%.

---

### 2. Architecture des cinq modules

```
┌─────────────────────────────────────────────────────┐
│  Lead entrant (CSV / webhook CRM / formulaire)      │
└────────────────────┬────────────────────────────────┘
                     ▼
         ┌─────────────────────┐
         │ A. Enrichissement   │  Apollo, Clay, Hunter.io
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │ B. Qualification     │  BANT / MEDDIC → score 0-100
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │ C. Génération       │  Email + variantes A/B
         │    d'outreach       │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │ D. Séquences        │  Multi-touch J0/J3/J5/J8/J10/J15
         │    & follow-ups     │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │ E. CRM + Reporting  │  HubSpot / Salesforce / Pipedrive
         └─────────────────────┘
```

---

### 3. Enrichissement automatique des leads

Pour chaque lead entrant, collecter : taille/secteur/financement (Crunchbase, Apollo), profil LinkedIn, actualités récentes (levées, recrutements, partenariats), stack technique (BuiltWith), et score ICP.

```python
# Enrichissement via Apollo API
import requests

def enrich_lead(lead: dict, api_key: str) -> dict:
    resp = requests.post(
        "https://api.apollo.io/v1/people/match",
        json={
            "first_name": lead["first_name"],
            "last_name": lead["last_name"],
            "organization_name": lead["company"],
            "api_key": api_key,
        },
        timeout=10,
    )
    resp.raise_for_status()
    person = resp.json().get("person", {})
    return {
        "title": person.get("title"),
        "linkedin_url": person.get("linkedin_url"),
        "seniority": person.get("seniority"),
        "company_size": person.get("employment_history", [{}])[0].get("organization", {}).get("estimated_num_employees"),
        "technologies": person.get("organization", {}).get("current_technologies", []),
    }
```

**Critère de décision :** si l'enrichissement retourne < 3 champs fiables, marquer le lead `enrichment_incomplete` et ne pas l'inclure dans les séquences automatiques avant revue manuelle.

---

### 4. Framework de qualification — scoring structuré

Implémente un score composite 0-100 basé sur le framework choisi.

**BANT simplifié :**

```python
def bant_score(lead: dict) -> dict:
    score = 0
    reasons = []

    # Budget (0-25)
    if lead.get("company_size", 0) > 200:
        score += 25; reasons.append("Budget probable (>200 employés)")
    elif lead.get("company_size", 0) > 50:
        score += 15; reasons.append("Budget estimé moyen")

    # Authority (0-25)
    senior_titles = ["VP", "Director", "Head", "Chief", "CXO", "Founder"]
    if any(t in (lead.get("title") or "") for t in senior_titles):
        score += 25; reasons.append("Décisionnaire identifié")

    # Need (0-25) — basé sur stack / industrie
    pain_industries = ["fintech", "ecommerce", "saas"]
    if lead.get("industry", "").lower() in pain_industries:
        score += 20; reasons.append("Industrie cible prioritaire")

    # Timeline (0-25) — basé sur signaux (recrutement SDR, levée récente)
    if lead.get("recent_funding") or lead.get("hiring_sales"):
        score += 25; reasons.append("Signal de croissance détecté")

    tier = "Hot" if score >= 70 else "Warm" if score >= 40 else "Cold"
    return {"score": score, "tier": tier, "reasons": reasons}
```

**Règle :** ne faire entrer dans les séquences automatiques que les leads `Warm` (≥ 40) et `Hot` (≥ 70). Les `Cold` vont dans une nurture séparée.

---

### 5. Génération d'emails d'outreach personnalisés

Contraintes non négociables : < 150 mots, objet < 50 caractères, 1 seul CTA, accroche liée à une donnée concrète du lead.

```python
EMAIL_PROMPT = """Rédige un email de prospection outbound court (< 150 mots) en {language}.

Contact : {lead_name}, {lead_title} chez {company}
Taille entreprise : {company_size} employés
Actualité récente : {recent_news}
Pain point probable : {pain_point}
Notre solution : {value_prop}
Preuve sociale secteur : {case_study}

Règles strictes :
- Objet < 50 caractères, sans point d'exclamation
- Première phrase = accroche sur l'actualité récente (pas "J'espère que...")
- 1 seul CTA à la fin (question fermée ou lien calendrier)
- Ton direct et professionnel
- Génère 2 variantes (A et B) avec angles différents"""
```

Génère systématiquement 2-3 variantes pour A/B testing dès le départ.

---

### 6. Séquences multi-touch

```
J0  — Email 1er contact (accroche actualité)
J3  — Relance email (angle valeur différent)
J5  — Connexion LinkedIn (message court, pas de pitch)
J8  — Email "value add" (ressource pertinente, pas de vente)
J10 — Appel sortant (script court préparé par l'agent)
J15 — Email de rupture ("Dois-je vous retirer de ma liste ?")
```

**Stop automatique** dès toute réponse reçue (positive, négative ou hors-sujet). Ne jamais continuer une séquence après une réponse humaine sans analyse du contenu.

**Script d'appel J10 généré par l'agent :**

```python
CALL_SCRIPT_PROMPT = """Génère un script d'appel de 60 secondes pour :
- Lead : {lead_name}, {lead_title}
- Contexte : a ouvert l'email J0 mais pas répondu
- Pain point : {pain_point}
Structure : accroche (10s) → raison de l'appel (15s) → question ouverte (10s) → CTA booking (10s)"""
```

---

### 7. Gestion des réponses et objections

L'agent classifie chaque réponse entrante :

```python
CLASSIFY_PROMPT = """Classifie cette réponse email en une catégorie :
- INTERESTED : ouvert à un échange
- NOT_NOW : pas le bon moment (> 3 mois)
- NOT_RELEVANT : hors cible, mauvaise personne
- OBJECTION_PRICE : problème de budget
- OBJECTION_TOOL : déjà un outil concurrent
- NEGATIVE : refus définitif
- QUESTION : demande d'information

Réponse : {email_body}
Réponds avec le code catégorie uniquement."""
```

Pour `OBJECTION_PRICE` et `OBJECTION_TOOL` : utilise une bibliothèque d'objections validée par l'équipe commerciale. Pour `INTERESTED` : escalade immédiate vers un humain avec contexte complet du lead.

---

### 8. Intégration CRM

```python
# Mise à jour HubSpot après qualification (SDK officiel)
from hubspot import HubSpot

client = HubSpot(access_token=HUBSPOT_TOKEN)

def update_lead_hubspot(contact_id: str, score: int, summary: str):
    client.crm.contacts.basic_api.update(
        contact_id=contact_id,
        simple_public_object_input={
            "properties": {
                "hs_lead_status": "QUALIFIED" if score >= 70 else "IN_PROGRESS",
                "qualification_score": str(score),
                "qualification_notes": summary,
                "lifecyclestage": "salesqualifiedlead" if score >= 70 else "lead",
            }
        },
    )
```

Actions minimales à logger dans le CRM pour chaque lead : email envoyé, email ouvert, réponse reçue, classification de la réponse, score de qualification, meeting booké.

---

### 9. Métriques à monitorer

| Métrique | Cible | Alarme si |
|---|---|---|
| Taux d'ouverture emails | > 40% | < 25% |
| Taux de réponse | > 15% | < 8% |
| Lead → meeting | > 5% | < 2% |
| Bounce rate | < 2% | > 3% |
| Spam rate | < 0.1% | > 0.08% |
| Pipeline généré (€) | Dépend du deal size | — |

Génère un rapport hebdomadaire automatique (Slack/email) pour le manager avec ces indicateurs et les top 3 emails par taux de réponse.

---

## Garde-fous et conformité

- **RGPD / CAN-SPAM** : lien de désinscription fonctionnel dans chaque email. Respecter les opt-outs sous 48h. Ne jamais prospecter sur des listes achetées sans consentement documenté.
- **Délivrabilité** : maximum 100-200 emails/jour par domaine. Réchauffage progressif sur 4 semaines (10 → 30 → 80 → 150/jour). Surveiller bounce (< 2%) et spam (< 0.1%) en continu.
- **Escalade humaine obligatoire** : toute réponse `INTERESTED` ou réponse ambiguë → transfer immédiat à un commercial avec contexte complet. L'agent ne négocie jamais seul.
- **Audit trail** : chaque email envoyé par l'agent doit être loggé avec timestamp, version du template, données d'enrichissement utilisées. Conserve 12 mois minimum pour conformité.

---

## Anti-patterns à éviter

- **Générer des emails sans accroche contextualisée** : "J'espère que vous allez bien" = taux de réponse < 3%. L'accroche doit citer une donnée concrète.
- **Lancer la séquence complète avant validation** : envoyer J0 à J15 sans analyser les réponses intermédiaires brûle les leads et risque le blacklistage.
- **Score de qualification sans justification** : un score sans `reasons` est inexploitable par le commercial. Toujours fournir les critères.
- **Pas de limite de volume au démarrage** : un nouveau domaine qui envoie 500 emails J1 sera blacklisté sous 48h. Respecter le réchauffage.
- **CRM non synchronisé** : un agent qui envoie des emails sans logger dans le CRM crée des doublons de prospection et détruit la relation client.
- **Objections gérées par l'agent sans validation humaine** : les réponses aux objections complexes doivent être validées par l'équipe commerciale avant d'être intégrées à la bibliothèque.

---

## Stack recommandée (2026)

| Besoin | Outils |
|---|---|
| Enrichissement | Apollo.io, Clay, Hunter.io, LinkedIn Sales Navigator |
| Séquences email | Instantly.ai, Lemlist, Outreach |
| Orchestration agent | LangChain, LangGraph, Anthropic SDK |
| CRM | HubSpot API, Salesforce API, Pipedrive API |
| Booking | Calendly API, Cal.com (open source) |
| Monitoring | Datadog, Grafana, PostHog |
| Modèle LLM | Claude Sonnet (rédaction), Claude Haiku (classification) |


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
