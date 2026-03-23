---
name: fintech-compliance-checker
description: Vérification de conformité pour applications fintech — PCI-DSS, KYC/AML, PSD2, RGPD appliqué aux données financières. À utiliser quand l'utilisateur développe une application de paiement, un wallet ou un service financier et doit vérifier la conformité réglementaire. Se déclenche aussi avec "PCI-DSS", "KYC", "AML", "PSD2", "conformité paiement", "compliance fintech", "données bancaires", "carte de crédit sécurité".
---

# Vérificateur de Conformité Fintech

## Workflow

1. **Identifier** : déterminer les réglementations applicables selon le service.
2. **Auditer** : vérifier la conformité technique point par point.
3. **Corriger** : implémenter les contrôles manquants.
4. **Documenter** : maintenir la preuve de conformité.

## Réglementations par type de service

| Service | Réglementations applicables |
|---------|---------------------------|
| **Paiement par carte** | PCI-DSS, PSD2, RGPD |
| **Wallet / compte** | KYC/AML, PSD2, RGPD |
| **Transfert d'argent** | KYC/AML, directive transferts de fonds |
| **Prêt / crédit** | Directive crédit consommation, RGPD |
| **Crypto** | MiCA, KYC/AML, RGPD |

## PCI-DSS — Checklist développeur

### Données de carte

```
❌ NE JAMAIS :
- Stocker le CVV/CVC (même chiffré)
- Logger des numéros de carte complets
- Stocker le contenu de la bande magnétique
- Envoyer des données de carte en clair par email/chat

✅ TOUJOURS :
- Utiliser un prestataire PCI-DSS certifié (Stripe, Adyen)
- Tokeniser les données de carte
- Masquer le PAN : afficher uniquement les 4 derniers chiffres
- Chiffrer les données en transit (TLS 1.2+) et au repos
```

### Niveaux PCI-DSS

| Niveau | Critère | Exigence |
|--------|---------|----------|
| **1** | > 6M transactions/an | Audit sur site par QSA |
| **2** | 1-6M transactions/an | SAQ + scan trimestriel |
| **3** | 20K-1M transactions e-commerce | SAQ |
| **4** | < 20K transactions e-commerce | SAQ |

### Tokenisation (recommandé)

```
Client → Stripe.js/Elements → Token
         ↓
Serveur reçoit le token (tok_xxx), JAMAIS le numéro de carte
         ↓
Appel API Stripe avec le token → Paiement
```

## KYC/AML — Know Your Customer

### Niveaux de vérification

| Niveau | Seuil indicatif | Vérifications |
|--------|----------------|---------------|
| **Simplifié** | < 150 €/mois | Email + téléphone |
| **Standard** | < 2 500 €/mois | Pièce d'identité + preuve d'adresse |
| **Renforcé** | > 2 500 €/mois ou PEP | Identité + source des fonds + screening |

### Checklist AML

- [ ] Screening contre les listes de sanctions (UE, OFAC, ONU)
- [ ] Détection des Personnes Politiquement Exposées (PEP)
- [ ] Monitoring des transactions suspectes
- [ ] Seuil de déclaration de soupçon (Tracfin en France)
- [ ] Conservation des données KYC (5 ans après fin de relation)

### Signaux d'alerte (Red Flags)

- Transactions juste en dessous des seuils de déclaration (structuring)
- Changements fréquents de bénéficiaire
- Transactions sans logique économique apparente
- Utilisation excessive de pays à haut risque

## PSD2 — Directive Services de Paiement

### Authentification Forte (SCA)

```
Règle : Toute transaction > 30 € nécessite 2 facteurs parmi :
- Connaissance (mot de passe, PIN)
- Possession (téléphone, carte)
- Inhérence (biométrie)

Exemptions :
- Transactions < 30 € (jusqu'à 100 € cumulés)
- Bénéficiaires de confiance (whitelist)
- Transactions récurrentes (même montant, même bénéficiaire)
- Transactions à faible risque (TRA)
```

## RGPD — Données financières

### Données sensibles

| Donnée | Durée de conservation | Base légale |
|--------|----------------------|-------------|
| Transactions | 10 ans (obligation comptable) | Obligation légale |
| KYC documents | 5 ans après fin de relation | Obligation légale (AML) |
| Données de carte tokenisées | Durée du mandat + 13 mois | Consentement / Contrat |
| Logs de connexion | 1 an | Intérêt légitime |

### Droits des utilisateurs

- **Portabilité** : export des transactions en format standard
- **Effacement** : impossible pour les données soumises à obligation légale
- **Accès** : fournir l'ensemble des données dans les 30 jours
- **Rectification** : permettre la correction des données personnelles

## Règles
- Ne **jamais** stocker les données de carte sur vos serveurs — utiliser la tokenisation.
- Le KYC doit être **proportionnel** au risque (approche basée sur le risque).
- Les transactions suspectes doivent être **signalées** (Tracfin/autorité compétente).
- La conservation des données doit respecter les durées **légales minimales ET maximales**.
- Documenter chaque décision de conformité pour les **audits**.

> Ce skill fournit des orientations générales. Pour des décisions de conformité spécifiques, consulter un juriste spécialisé en droit financier.
