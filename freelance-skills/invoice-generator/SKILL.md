---
name: invoice-generator
description: Aide à créer des factures conformes, gérer les mentions légales obligatoires et suivre les relances de paiement. Se déclenche avec "facture", "facturation", "mentions légales", "relance paiement", "devis freelance".
---

# Invoice Generator

## Workflow
1. **Identification du statut** — Déterminer le statut juridique du freelance (micro-entrepreneur, EURL, SASU, auto-entrepreneur Maroc) car les mentions légales obligatoires varient.
2. **Mentions obligatoires** — Vérifier la présence de toutes les mentions légales : numéro de facture (séquentiel), date d'émission, identité du prestataire (nom, adresse, SIRET/RC, APE), identité du client, désignation de la prestation, quantité, prix unitaire HT, taux de TVA ou mention d'exonération, montant total HT et TTC.
3. **Génération de la facture** — Créer la facture avec une mise en page professionnelle incluant : logo, coordonnées bancaires (IBAN/RIB), conditions de paiement, date d'échéance, pénalités de retard et indemnité forfaitaire de recouvrement (40 EUR en France).
4. **Numérotation** — Appliquer une numérotation chronologique continue sans rupture (ex: 2026-001, 2026-002) conforme aux obligations légales.
5. **Envoi et suivi** — Envoyer la facture au format PDF, enregistrer la date d'envoi et programmer les échéances de relance.
6. **Relances** — Mettre en place un processus de relance graduel : relance amiable J+7 après échéance, relance ferme J+15, mise en demeure J+30, recouvrement J+45.
7. **Tableau de bord** — Maintenir un suivi de trésorerie : factures émises, payées, en retard, montant total en attente, délai moyen de paiement par client.

## Règles
- La facture doit être émise dans les 15 jours suivant la réalisation de la prestation (ou selon le contrat).
- Ne jamais modifier une facture émise : émettre un avoir puis une nouvelle facture si correction nécessaire.
- Conserver toutes les factures pendant 10 ans (obligation légale en France, 10 ans au Maroc).
- Toujours envoyer la facture en PDF pour garantir l'intégrité du document.
