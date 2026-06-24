---
name: marketing-email-marketing-designer
description: Conception de campagnes email marketing — séquences automatisées, segmentation, A/B testing et délivrabilité. Se déclenche avec "email marketing", "newsletter", "mailing", "séquence email", "Mailchimp", "SendGrid".
---

# Email Marketing Designer

## Workflow

### 1. Cadrage stratégique
Avant tout, définir l'objectif principal de la campagne :

| Objectif | Type de séquence | Métrique cible |
|---|---|---|
| Acquisition | Welcome series (3-5 emails) | Taux de clic J7 |
| Nurturing | Drip éducatif (7-14 jours) | Engagement score |
| Conversion | Abandon panier (3 relances) | Taux de conversion |
| Fidélisation | Post-achat + upsell | Revenue par email |
| Réactivation | Win-back (inactifs 90j+) | Réactivation rate |

Choix de la plateforme selon le volume et le besoin :
- **Brevo (Sendinblue)** — RGPD natif, API REST, bon rapport qualité/prix EU
- **SendGrid** — API robuste, volume élevé, webhooks granulaires
- **Mailchimp** — Interfaces marketing, idéal PME non-technique
- **ConvertKit** — Créateurs de contenu, séquences visuelles simples

### 2. Collecte et segmentation de la liste

Double opt-in obligatoire (RGPD). Exemple de formulaire HTML minimal conforme :

```html
<form action="/api/subscribe" method="POST">
  <input type="email" name="email" required placeholder="votre@email.com">
  <input type="hidden" name="source" value="footer-newsletter">
  <!-- Confirmation envoyée par email, activation requise -->
  <button type="submit">S'inscrire</button>
</form>
```

Segmentation prioritaire à mettre en place dès le départ :
- **Lifecycle** : prospect / client actif / client inactif / churné
- **Engagement** : ouvreur actif (< 30j) / tiède (30-90j) / inactif (> 90j)
- **Source d'acquisition** : organique / paid / parrainage
- **Valeur client** : RFM (Recency, Frequency, Monetary)

### 3. Séquences automatisées clés

**Welcome series (5 emails, jours 0-7-14-21-30) :**
- J0 : Confirmation + promesse de valeur (livraison instantanée)
- J2 : Contenu éducatif sans vente
- J5 : Preuve sociale (témoignages, chiffres)
- J10 : Offre d'entrée (première conversion)
- J14 : Approfondissement ou segmentation comportementale

**Abandon panier (3 emails) :**
- +1h : Rappel neutre + photo produit
- +24h : Objection-busting + FAQ
- +72h : Urgence / offre limitée (10% discount ou shipping offert)

**Réactivation win-back :**
- Email 1 : "Vous nous manquez" + contenu utile
- Email 2 : Offre exclusive inactifs
- Email 3 : Dernière chance + opt-out ou changement de fréquence
- Si pas de réponse : supprimer ou archiver → protège la délivrabilité

### 4. Rédaction du contenu

Objet : formule à tester avec le template `[Bénéfice concret] + [Urgence/Curiosité]`

Exemples performants :
```
"Votre commande est prête à être envoyée 🚀"          # transactionnel
"3 erreurs que font 90% des débutants en SEO"          # éducatif
"[Prénom], votre accès expire dans 48h"                # urgence personnalisée
"On a quelque chose pour vous (limité à 48h)"          # curiosité + urgence
```

Règles de structure corps :
- **1 email = 1 message = 1 CTA** — jamais deux objectifs concurrents
- Paragraphes courts (2-3 lignes max), ton conversationnel
- CTA : bouton + lien texte de repli pour clients bloquant les images
- Merge tags courants : `{{first_name}}`, `{{order_id}}`, `{{product_name}}`

### 5. Template HTML responsive

Squelette minimal compatible Outlook/Gmail (tables obligatoires) :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-hide { display: none !important; }
    }
  </style>
</head>
<body style="margin:0; background:#f4f4f4;">
  <table width="600" class="container" align="center"
         style="background:#ffffff; font-family:Arial,sans-serif;">
    <tr><td style="padding:24px;">
      <!-- Contenu ici -->
      <a href="{{cta_url}}"
         style="background:#0066cc; color:#fff; padding:12px 24px;
                text-decoration:none; border-radius:4px; display:inline-block;">
        {{cta_label}}
      </a>
    </td></tr>
    <tr><td style="padding:12px; font-size:11px; color:#999; text-align:center;">
      <a href="{{unsubscribe_url}}">Se désinscrire</a> |
      123 rue de la Paix, 75001 Paris
    </td></tr>
  </table>
</body>
</html>
```

Ratio texte/image : minimum 60/40. Images avec `alt` rempli, poids < 200 Ko.
Outils de test rendu : **Litmus**, **Email on Acid**, ou preview native Brevo/Mailchimp.

### 6. Délivrabilité — configuration DNS

Indispensable avant tout envoi en volume :

```dns
; SPF — autoriser le serveur d'envoi
v=spf1 include:sendgrid.net include:_spf.brevo.com ~all

; DKIM — clé fournie par la plateforme, à placer en TXT
; Exemple SendGrid :
s1._domainkey.votredomaine.com  TXT  "v=DKIM1; k=rsa; p=MIGf..."

; DMARC — politique de base
_dmarc.votredomaine.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@votredomaine.com; pct=100"
```

Seuils à surveiller en continu :
- Taux de plainte (spam) : < **0,1%** (seuil Gmail/Yahoo 2024+)
- Hard bounce : < **2%** — supprimer immédiatement
- Soft bounce : 3 échecs consécutifs → archiver le contact

Outils de monitoring : **Google Postmaster Tools**, **MXToolbox**, **Mail-tester.com** (score avant envoi).

### 7. A/B Testing — protocole

Variable à tester **une à la fois**. Taille d'échantillon minimum : 1 000 contacts par variant.

Priorité de test recommandée :
1. Objet (impact direct sur open rate)
2. Heure/jour d'envoi
3. CTA (texte + couleur + position)
4. Longueur du corps (court vs. long)
5. Expéditeur (marque vs. prénom humain)

Durée de test : 4h minimum avant de déclarer un gagnant, puis envoi du winner au reste.

### 8. KPIs et benchmarks 2026

| Métrique | Bon | Excellent |
|---|---|---|
| Taux d'ouverture | > 25% | > 40% |
| Taux de clic (CTOR) | > 3% | > 8% |
| Taux de conversion | > 1% | > 3% |
| Taux de désabo | < 0,5% | < 0,2% |
| Revenue per email | > 0,10€ | > 0,50€ |

Attention : l'open rate est biaisé depuis iOS 15 (Apple Mail Privacy Protection). Prioriser **CTOR** (Click-to-Open Rate) et **revenue par email** comme métriques fiables.

## Garde-fous / Anti-patterns

- **Envoyer à toute la base sans segmentation** → taux de plainte élevé, réputation IP dégradée durablement
- **Un seul envoi sans séquence** → 80% des conversions se font après le 4e contact
- **Image seule sans texte** → bloqué par filtres anti-spam, rendu cassé si images désactivées
- **CTA vague ("Cliquez ici", "En savoir plus")** → remplacer par le bénéfice ("Obtenir mon guide gratuit")
- **Objet clickbait trompeur** → taux de plainte explose, réputation détruite
- **Ne pas nettoyer la liste** → coûts qui gonflent + délivrabilité qui chute ; nettoyer tous les 90 jours
- **Désabonnement difficile** → illégal RGPD + accélère les plaintes spam ; lien visible dans CHAQUE email
- **Tester sans groupe contrôle** → résultats inexploitables ; toujours un variant A vs. B pur


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
