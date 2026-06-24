---
name: marketing-growth-hacking-strategist
description: Stratégies de growth hacking — acquisition, activation, rétention, referral et revenue selon le framework AARRR. Se déclenche avec "growth hacking", "AARRR", "acquisition", "rétention", "viral loop", "growth".
---

# Growth Hacking Strategist

## Workflow

### 1. Cartographier le funnel AARRR actuel

Collecter les métriques réelles pour chaque étape avant toute action :

| Étape | Métrique clé | Outil de mesure |
|-------|-------------|-----------------|
| Acquisition | Visiteurs uniques, CAC par canal | GA4, Mixpanel |
| Activation | Taux "Aha moment" (ex: premier post, premier achat) | Amplitude, Heap |
| Rétention | Courbe J1/J7/J30, churn mensuel | Mixpanel cohort |
| Referral | K-factor, taux de partage | Viral Loops, custom |
| Revenue | MRR, LTV, LTV/CAC | Stripe, ChartMogul |

Exemple de calcul K-factor :
```
K = invitations_envoyées_par_user × taux_conversion_invitation
# K > 1 = croissance virale, K < 1 = croissance linéaire
# Ex : 3 invitations × 0,25 de conversion = K 0,75
```

### 2. Identifier le goulot d'étranglement prioritaire

Utiliser le framework ICE pour prioriser les expériences :

```
Score ICE = (Impact × Confiance × Facilité) / 3
# Impact  : 1-10 (combien ça déplace la métrique nord ?)
# Confiance : 1-10 (données probantes ?)
# Facilité : 1-10 (effort d'implémentation inversé)
```

Critères de décision :
- **Rétention J7 < 25 %** → priorité #1 avant toute acquisition
- **Taux d'activation < 40 %** → optimiser l'onboarding avant le referral
- **LTV/CAC < 3** → revoir le pricing ou réduire le CAC avant de scaler
- **K-factor > 0,5** → investir dans la boucle virale

### 3. Acquisition — trouver les canaux rentables

Tester 3 à 5 canaux en parallèle avec un budget fixe, mesurer le CAC réel :

```bash
# Template de suivi CAC par canal (CSV / Google Sheets)
Canal,Dépense,Inscriptions,Activations,CAC_brut,CAC_activé
SEO,0,450,180,0,0
Paid_Google,1200,95,62,12.6,19.4
LinkedIn_Ads,800,40,28,20,28.6
Referral,150,220,195,0.7,0.8
Cold_email,200,38,22,5.3,9.1
```

Règle de coupure : si CAC_activé > LTV/3 après 2 semaines → stopper le canal.

Canaux PLG (Product-Led Growth) à privilégier en 2026 :
- Freemium avec limite qui crée la friction au bon moment
- Intégrations (embed dans Slack, Notion, etc.)
- Templates publics/communauté (SEO + activation)
- API publique pour les développeurs

### 4. Activation — réduire le time-to-value

Identifier l'Aha moment avec une analyse de corrélation :
```python
# Pseudocode : trouver les actions corrélées à la rétention J30
actions = ['created_first_project', 'invited_teammate', 'exported_report']
for action in actions:
    users_who_did = cohort[cohort[action] == True]['retained_d30'].mean()
    users_who_not = cohort[cohort[action] == False]['retained_d30'].mean()
    lift = users_who_did / users_who_not
    print(f"{action}: lift rétention J30 = {lift:.2f}x")
```

Checklist onboarding haute conversion :
- [ ] Inscription en < 60 secondes (SSO obligatoire)
- [ ] Valeur perçue en < 5 minutes (demo data ou template pré-rempli)
- [ ] Séquence email J0/J1/J3/J7 déclenchée par comportement (pas par temps)
- [ ] Progress bar ou checklist de démarrage visible
- [ ] Supprimer tout champ de formulaire non-indispensable à l'étape 1

### 5. Rétention — analyser par cohorte

```sql
-- Courbe de rétention par semaine d'inscription (BigQuery / Redshift)
SELECT
  DATE_TRUNC(first_seen, WEEK) AS cohort_week,
  DATE_DIFF(activity_date, first_seen, DAY) AS day_number,
  COUNT(DISTINCT user_id) AS active_users
FROM user_activity
GROUP BY 1, 2
ORDER BY 1, 2;
```

Leviers rétention selon le day_number critique :
- **Churn J1-J3** → problème d'activation, revoir l'onboarding
- **Churn J7-J14** → manque d'habitude, ajouter triggers comportementaux
- **Churn J30+** → problème de valeur core, revoir le product-market fit

### 6. Referral — construire la boucle virale

Structure d'un programme de referral efficace :
```
Incitation bilatérale :  parrain +X  /  filleul +Y
Déclencheur timing :     juste après l'Aha moment (pas à l'inscription)
Friction minimale :      lien unique, pas de création de compte pour partager
Tracking :               UTM + referral_code dans l'URL
```

Exemple de calcul de ROI referral :
```
Coût referral = reward_parrain + reward_filleul = 10€ + 10€ = 20€
LTV filleul moyen = 180€
ROI = (180 - 20) / 20 = 800%
vs CAC paid ads = 45€ → referral 2,25x moins cher
```

### 7. Revenue — optimiser le pricing

Tests A/B pricing à prioriser :
- **Ancrage** : afficher le plan le plus cher en premier
- **Plan recommandé** : badge visuel sur le plan milieu de gamme
- **Facturation annuelle** : proposer -20 % pour réduire le churn
- **Grandfathering** : protéger les anciens clients lors d'une hausse de prix

Métriques de santé revenue (seuils 2026) :
```
LTV/CAC   > 3x      → viable
CAC payback < 12 mois → sain pour SaaS B2B
Net Revenue Retention (NRR) > 110 % → expansion > churn
Logo churn mensuel  < 2 %   → rétention correcte
```

### 8. Itérer — processus de growth sprint

Template d'une expérience documentée :
```markdown
## Expérience #42 — [Titre court]
**Hypothèse** : Si [action], alors [métrique] augmentera de [X]% car [raison].
**Critère de succès** : +15% taux d'activation J7 (stat sig 95%, n=500)
**Durée** : 2 semaines
**Résultat** : +8% (non significatif, p=0.12)
**Apprentissage** : Le segment mobile ne répond pas à ce trigger — à retester desktop.
**Prochaine étape** : segmenter par device dans l'expérience suivante.
```

Cadence recommandée :
- Lundi : revue métriques + priorisation ICE
- Mardi-Jeudi : implémentation + lancement
- Vendredi : analyse résultats + documentation

## Anti-patterns et pièges

- **Scaler avant product-market fit** : dépenser en paid ads quand la rétention J30 < 20 % = argent brûlé.
- **Dark patterns** : faux comptes à rebours, abonnements cachés, désinscription difficile — détruisent la confiance et exposent aux régulations (RGPD, DSA 2026).
- **Optimiser une étape isolée** : améliorer le taux d'inscription sans regarder le taux d'activation fausse les métriques.
- **Tests A/B trop courts** : conclure avant la taille d'échantillon requise → faux positifs. Utiliser un calculateur de puissance statistique.
- **Ignorer les cohortes** : les métriques agrégées cachent la dégradation de rétention sur les nouvelles cohortes.
- **Copier les tactiques hors contexte** : le growth loop Dropbox (stockage bonus) ne fonctionne que si le produit est naturellement collaboratif.

## Bonnes pratiques 2026

- **AI-powered personalization** : utiliser les LLMs pour personnaliser les séquences d'onboarding en temps réel selon le comportement (ex: contenu de l'email J1 adapté au job title détecté).
- **Zero-party data** : collecter les préférences explicitement (quiz d'onboarding) plutôt que d'inférer — conformité RGPD + meilleure personnalisation.
- **Community-Led Growth** : Discord/Slack communautaire comme canal d'acquisition et de rétention — coût d'acquisition proche de zéro à maturité.
- **Micro-conversions tracking** : instrumenter les étapes intermédiaires (scroll depth, feature hover) pour diagnostiquer les frictions avant que les utilisateurs quittent.
- **PLG + Sales motion** : déclencher un contact Sales automatiquement quand un utilisateur freemium atteint les limites du plan (PQL = Product Qualified Lead).


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
