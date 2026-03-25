---
name: email-agent-builder
description: Construction d'agents de gestion d'emails incluant tri, réponse automatique, extraction et classification. Se déclenche avec "email agent", "agent email", "tri automatique", "réponse automatique email", "classification email"
---

# Email Agent Builder

## Workflow
1. **Connecter les sources email** — Configurer l'accès aux boîtes mail via IMAP, Microsoft Graph API (Outlook/Exchange) ou Gmail API. Implémenter l'authentification OAuth 2.0 pour un accès sécurisé. Gérer les webhooks ou le polling pour la détection de nouveaux messages en temps réel.
2. **Parser et normaliser les emails** — Extraire les métadonnées (expéditeur, destinataires, sujet, date, pièces jointes). Parser le contenu HTML et texte brut. Gérer les encodages (UTF-8, ISO-8859). Nettoyer les signatures, disclaimers et historique de conversation pour isoler le contenu pertinent.
3. **Classifier les emails** — Implémenter un pipeline de classification multi-labels : catégorie (support, commercial, RH, facturation), urgence (critique, haute, normale, basse), intention (demande, réclamation, information, confirmation). Utiliser un LLM ou un modèle fine-tuné sur les données historiques.
4. **Extraire les informations structurées** — Identifier et extraire les entités clés : noms, dates, montants, numéros de référence, adresses. Détecter les pièces jointes importantes (factures, contrats, documents). Structurer les données extraites en JSON pour l'intégration avec les systèmes métier (CRM, ERP).
5. **Générer les réponses automatiques** — Concevoir des templates de réponse par catégorie. Utiliser un LLM pour personnaliser les réponses en fonction du contexte et du ton de l'email original. Implémenter un système de validation humaine (draft review) avant l'envoi pour les réponses critiques.
6. **Orchestrer les workflows de traitement** — Définir les règles de routage : assignation à un agent humain, transfert vers un département, escalade automatique sur les urgences. Déclencher des actions dans les outils tiers (créer un ticket Jira, mettre à jour Salesforce, notifier sur Slack).
7. **Implémenter les garde-fous** — Configurer les limites de confiance : en dessous d'un seuil, router vers un humain. Bloquer l'envoi automatique pour les emails sensibles (juridique, financier). Implémenter un système de feedback loop pour améliorer la classification continuellement.
8. **Monitorer et optimiser** — Suivre les métriques clés : taux de classification correcte, temps de traitement moyen, taux d'intervention humaine. Analyser les erreurs de classification pour enrichir les données d'entraînement. Générer des rapports hebdomadaires de performance de l'agent.

## Règles
- Toujours implémenter une validation humaine pour les réponses automatiques sur les emails sensibles (juridique, financier, réclamation) avant tout envoi.
- Ne jamais stocker les credentials email en clair ; utiliser OAuth 2.0 avec refresh tokens et un vault sécurisé pour le stockage des tokens.
- Toujours conserver l'email original et les métadonnées de classification dans un audit trail pour la traçabilité et la conformité RGPD.
- Implémenter un mécanisme de rate limiting sur les réponses automatiques pour éviter les boucles d'emails (auto-reply storm) entre agents.
- Ne jamais transférer automatiquement des pièces jointes sans les scanner préalablement pour les malwares et vérifier leur conformité.
