---
name: agent-sales-agent-builder
description: Construction d'agents de vente IA pour prospection, qualification et suivi commercial. Se déclenche avec "sales agent", "agent commercial", "agent de vente", "prospection IA", "SDR agent", "lead qualification agent", "outreach agent", "follow-up automatique".
---

# Sales Agent Builder

## Quand utiliser ce skill

Utilise ce skill pour concevoir un agent commercial capable de gérer automatiquement tout ou partie du cycle de vente outbound : enrichir des leads, les qualifier selon un framework structuré (BANT, MEDDIC), rédiger des emails d'outreach personnalisés, gérer des séquences multi-touch, mettre à jour le CRM et préparer des argumentaires commerciaux. S'applique aux équipes SDR/BDR, aux startups B2B en phase de croissance et aux équipes sales cherchant à automatiser les tâches répétitives.

## Workflow

1. **Architecture générale** — Définis les cinq modules : (a) enrichissement et recherche de leads, (b) moteur de qualification (scoring), (c) générateur d'outreach personnalisé, (d) gestionnaire de séquences et de follow-ups, (e) intégration CRM et reporting. Choisis entre un agent fully autonomous (déclenche les envois seul) ou human-in-the-loop (propose à valider avant envoi, recommandé pour démarrer).

2. **Lead enrichment automatique** — Pour chaque lead entrant, l'agent collecte automatiquement : informations entreprise (taille, secteur, financement via Crunchbase/PitchBook), profil LinkedIn du contact, actualités récentes (levées de fonds, recrutements, partenariats), stack technologique (BuiltWith, Wappalyzer), et score ICP (Ideal Customer Profile). Utilise les APIs de Clearbit, Apollo, Hunter.io ou LinkedIn Sales Navigator.

   ```python
   # Enrichissement via Apollo API
   import requests
   response = requests.post("https://api.apollo.io/v1/people/match", json={
       "first_name": lead["first_name"],
       "last_name": lead["last_name"],
       "organization_name": lead["company"],
       "api_key": APOLLO_API_KEY
   })
   enriched = response.json()["person"]
   ```

3. **Framework de qualification** — Implémente un ou plusieurs frameworks selon le contexte commercial : BANT (Budget, Authority, Need, Timeline), MEDDIC (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion), SPIN (Situation, Problem, Implication, Need-Payoff). L'agent score chaque lead de 0 à 100 et classe en Hot / Warm / Cold avec un raisonnement explicite par critère.

4. **Génération d'emails d'outreach personnalisés** — Rédige des emails 1er contact ultra-personnalisés en s'appuyant sur les données d'enrichissement : une accroche liée à une actualité récente de l'entreprise, une connexion claire entre la douleur identifiée et la solution proposée, une preuve sociale pertinente (client similaire dans le même secteur), un CTA clair et sans friction. Génère 2-3 variantes pour A/B testing. Respecte les meilleures pratiques (< 150 mots, objet < 50 chars, 1 seul CTA).

   ```python
   email_prompt = f"""Rédige un email de prospection court (< 150 mots) pour :
   Contact : {lead_name}, {lead_title} chez {company}
   Actualité récente : {recent_news}
   Pain point probable : {pain_point}
   Notre solution : {value_prop}
   Client de référence similaire : {case_study}
   Ton : professionnel et direct. 1 seul CTA."""
   ```

5. **Gestion des conversations et objections** — L'agent gère les réponses entrantes : classifie le type de réponse (intéressé / pas intéressé / pas maintenant / question), prépare une réponse adaptée. Pour les objections courantes ("trop cher", "déjà un outil", "pas le bon moment"), utilise une bibliothèque d'objections pré-renseignée avec des réponses validées par l'équipe commerciale. Escalade vers un humain pour les réponses complexes ou les opportunités qualifiées.

6. **Intégration CRM complète** — Connecte l'agent à Salesforce, HubSpot, Pipedrive ou Close via leurs APIs. Actions automatisées : création/mise à jour de contact et de company, logging de chaque activité (email envoyé, réponse reçue, appel loggé), progression du deal dans le pipeline (MQL → SQL → Opportunity), mise à jour du score de qualification, création de tâches de follow-up pour les commerciaux. Utilise des webhooks pour la synchronisation temps réel.

   ```python
   # Mise à jour HubSpot après qualification
   hubspot.crm.contacts.basic_api.update(contact_id, {
       "properties": {
           "hs_lead_status": "QUALIFIED",
           "qualification_score": str(score),
           "qualification_notes": qualification_summary,
           "lifecyclestage": "salesqualifiedlead"
       }
   })
   ```

7. **Scheduling et prise de rendez-vous** — Intègre un module de booking : génère des liens Calendly/Cal.com personnalisés dans les emails, détecte les signaux d'intérêt pour un appel (réponse positive, clic sur un lien), propose des créneaux en tenant compte du fuseau horaire du prospect. Envoie des rappels automatiques J-1 et H-1. Log le meeting dans le CRM et prépare une fiche de préparation de l'appel.

8. **Séquences multi-touch optimisées** — Conçoit et exécute des séquences outbound complètes : email J0 (1er contact), relance email J3 (angle différent), connexion LinkedIn J5, email J8 (value add - partage d'une ressource pertinente), appel J10 (avec script préparé), email de rupture J15. Optimise les timings selon les taux d'ouverture et de réponse observés. Stop automatique dès une réponse (positive ou négative).

9. **Personnalisation à grande échelle** — Maintiens une base de connaissances sectorielle : pain points par industrie, terminologie métier, cas clients par vertical, objections typiques par taille d'entreprise. L'agent enrichit chaque message avec ce contexte pour éviter les messages génériques. Implémente un système de templates avec variables dynamiques (`{{recent_news}}`, `{{mutual_connection}}`, `{{competitor_they_use}}`).

10. **Métriques de performance commerciale** — Instrumente l'agent pour suivre en temps réel : taux d'ouverture des emails (cible > 40%), taux de réponse (cible > 15%), taux de conversion lead → meeting (cible > 5%), pipeline généré par l'agent (en €), ROI vs. SDR humain, meilleurs angles d'accroche par segment. Génère un rapport hebdomadaire automatique pour le manager commercial.

## Règles

- **Human-in-the-loop obligatoire au démarrage** : en phase initiale, toujours faire valider les emails par un commercial avant envoi. Passe en mode autonome uniquement après validation d'au moins 100 emails et un taux de réponse satisfaisant (> 10%).
- **Conformité RGPD et CAN-SPAM** : chaque email doit contenir un lien de désinscription fonctionnel. Respecte les opt-outs dans les 48h. Ne prospecte pas sur des adresses achetées sans consentement explicite. Documente la base légale de traitement pour chaque liste.
- **Personnalisation authentique** : un email généré doit sembler écrit par un humain, pas par un robot. Évite les tournures génériques ("J'espère que ce message vous trouve bien"). L'accroche doit démontrer une vraie connaissance de l'entreprise ou du contact.
- **Limites de volume** : n'envoie jamais plus de 100-200 emails/jour depuis un seul domaine pour préserver la délivrabilité. Réchauffe les nouveaux domaines progressivement (10 → 50 → 100 emails/jour sur 4 semaines). Monitore le taux de bounce (< 2%) et de spam (< 0.1%).
- **Frameworks recommandés** : [Apollo.io](https://apollo.io/) pour l'enrichissement et les séquences, [Clay](https://clay.com/) pour l'enrichissement avancé, [LangChain](https://python.langchain.com/) pour l'orchestration de l'agent, [Instantly](https://instantly.ai/) pour l'envoi d'emails, [HubSpot API](https://developers.hubspot.com/) ou [Salesforce API](https://developer.salesforce.com/) pour le CRM. Modèle recommandé : Claude Sonnet pour la rédaction, Claude Haiku pour la classification.


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
