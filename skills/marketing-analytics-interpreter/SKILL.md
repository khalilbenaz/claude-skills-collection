---
name: marketing-analytics-interpreter
description: Analyse et interprétation de données Google Analytics et Matomo — métriques, segments, conversions et rapports actionnables. Se déclenche avec "Google Analytics", "GA4", "Matomo", "analytics", "taux de conversion", "bounce rate". Also triggers on "Google Analytics report", "interpret my traffic data", "conversion analysis".
---

# Analytics Interpreter

## 1. Vérifier la fiabilité du tracking avant tout

Avant d'analyser quoi que ce soit, valider l'intégrité des données :

**GA4 — Debug View en temps réel :**
```
GA4 Admin → DebugView → déclencher les événements manuellement sur le site
```

**Vérifier la déduplication des pages vues (gtag.js vs GTM doublon fréquent) :**
```js
// Ouvrir la console navigateur sur le site et chercher :
window.dataLayer.filter(e => e.event === 'gtm.pageview')
// Si count > 1 par page → doublon à corriger dans GTM
```

**Filtrer le trafic interne dans GA4 :**
```
Admin → Flux de données → Définir des filtres IP internes
```

**Matomo — vérifier le tracking tag :**
```js
// Console navigateur → Network → filtrer "matomo.php" ou "piwik.php"
// Réponse 204 = OK ; 0 hit = tag absent ou bloqué
```

Critères de validation minimaux avant analyse :
- Taux de rebond GA4 cohérent (< 80 % pour la plupart des sites e-commerce)
- Pas de pics de sessions à heure ronde (signe de bot)
- Les événements de conversion remontent dans les 24 h suivant le déploiement

---

## 2. Définir les conversions et leur valeur

Configurer les événements clés dans GA4 (anciennement "objectifs") :

```
Admin → Événements → Cocher "Marquer comme conversion"
```

Exemples d'événements standards à activer :
| Événement GA4 | Déclencheur recommandé |
|---|---|
| `purchase` | Page de confirmation commande |
| `generate_lead` | Soumission formulaire contact |
| `sign_up` | Création de compte réussie |
| `file_download` | Clic sur lien PDF/ZIP |

**Matomo — objectifs :**
```
Matomo Admin → Objectifs → Ajouter → URL de destination / Événement / Durée
```

Attribuer une valeur monétaire systématiquement pour calculer le ROI canal par canal.

---

## 3. Analyser l'acquisition par canal

Rapport GA4 : **Acquisition → Acquisition de trafic**

Métriques à comparer par canal (Source / Support) :
- Sessions, Utilisateurs
- Taux d'engagement (≠ bounce rate GA4 = sessions avec interaction > 10 s ou 2 pages)
- Taux de conversion par canal
- Revenus / valeur de conversion

**Query Looker Studio pour comparer canaux :**
```sql
-- Dimension : Session default channel group
-- Métriques : Sessions, Conversions, Revenue
-- Filtre : Date range = 30 derniers jours
-- Tri : Revenue DESC
```

Critère de décision : un canal avec un taux de conversion > 2× la moyenne mérite un budget supplémentaire. Un canal < 0,5× la moyenne mérite une analyse de qualité d'audience.

---

## 4. Analyser le comportement et les funnels

**Rapport de chemin GA4 :**
```
Explorer → Exploration de chemin → Point de départ = Page d'entrée
```

**Funnel de conversion GA4 :**
```
Explorer → Exploration d'entonnoir → Définir les étapes (ex. : page produit → panier → checkout → purchase)
```

Métriques comportementales prioritaires :
- **Scroll depth** (événement `scroll` avec paramètre `percent_scrolled`) → indique si le contenu est lu
- **Temps avant conversion** (cohorte J0, J1–J7, J7+) → pilote les séquences de retargeting
- **Exit rate sur pages critiques** → une exit rate > 60 % sur le checkout = friction à corriger

---

## 5. Segmentation avancée

**GA4 — Créer un segment "Acheteurs récurrents" :**
```
Explorer → Segments → Nouveau → Critère : purchase count > 1
```

**Matomo — Segment API :**
```
URL Matomo API :
?module=API&method=SegmentEditor.add
&name=Acheteurs&definition=visitConvertedGoalId==1
&token_auth=VOTRE_TOKEN
```

Segments prioritaires à créer :
1. Nouveaux visiteurs vs. récurrents — comparer les taux de conversion
2. Mobile vs. Desktop — détecter les écarts de performance UI
3. Par géographie — prioriser les marchés à fort taux de conversion
4. Campagne UTM spécifique — isoler une campagne pour mesurer son impact réel

---

## 6. Construire des dashboards actionnables

**Looker Studio — connexion GA4 :**
```
Créer rapport → Ajouter source → Google Analytics 4 → Sélectionner propriété
```

Structure recommandée pour un dashboard e-commerce :
1. **Vue exécutive** : Revenus, Transactions, ROAS — tendance 30 j vs. 30 j précédents
2. **Acquisition** : Top 5 canaux par revenu avec sparklines
3. **Comportement** : Top 10 pages, taux d'engagement, scroll depth moyen
4. **Conversion** : Funnel visuel, taux d'abandon par étape, valeur panier moyen

Automatiser l'envoi hebdomadaire :
```
Looker Studio → Planifier une livraison → Email → Chaque lundi 08h00
```

---

## 7. Interpréter les anomalies

Checklist face à un pic ou une chute de trafic :

- [ ] Vérifier les annotations GA4 (campagnes, déploiements)
- [ ] Comparer avec Google Search Console (pénalité ou gain SEO ?)
- [ ] Contrôler les alertes intelligentes GA4 : **Rapports → Insights**
- [ ] Croiser avec le calendrier promotionnel / saisonnalité
- [ ] Vérifier si le changement touche UN canal spécifique → problème de source vs. problème site

**Détecter une pénalité Google dans Search Console :**
```
Performance → Comparer → Sélectionner date de chute → Filtrer par requête / page
```

---

## 8. Tests A/B et itération

Règle statistique minimale avant de conclure un test :
- **Significativité ≥ 95 %** (p-value < 0,05)
- **Volume minimum** : 500 conversions par variante (règle pratique)
- **Durée minimum** : 2 semaines pour capturer les cycles hebdomadaires

**Outils recommandés :**
- Google Optimize est arrêté — utiliser **VWO**, **AB Tasty**, ou **Statsig**
- Matomo intègre A/B Testing natif (plugin disponible)

Calculateur de significativité rapide (Python) :
```python
from scipy import stats
control = (500, 25)   # (visiteurs, conversions)
variant = (480, 35)
chi2, p, dof, _ = stats.chi2_contingency([
    [control[1], control[0]-control[1]],
    [variant[1], variant[0]-variant[1]]
])
print(f"p-value: {p:.4f} — {'Significatif' if p < 0.05 else 'Non significatif'}")
```

---

## Anti-patterns et pièges fréquents

| Piège | Conséquence | Correction |
|---|---|---|
| Analyser sans filtrer le trafic interne | KPIs gonflés artificiellement | Filtre IP dans GA4 Admin |
| Conclure sur < 100 conversions | Faux positifs en A/B test | Attendre volume suffisant |
| Comparer des périodes avec différents jours fériés | Tendances biaisées | Toujours comparer semaine vs. semaine |
| Ignorer le samplage GA4 sur grandes plages | Données approximatives | Réduire la fenêtre ou utiliser BigQuery Export |
| Fusionner sessions cross-device sans User ID | Parcours fragmentés | Activer le reporting "Identity Space" (User-ID + Device) |
| Oublier le consentement RGPD | Données manquantes + risque légal | Configurer Consent Mode v2 dans GTM |

**GA4 Consent Mode v2 (obligatoire depuis mars 2024) :**
```js
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  wait_for_update: 500
});
// Après acceptation CMP :
gtag('consent', 'update', { analytics_storage: 'granted' });
```

---

## Bonnes pratiques 2026

- **BigQuery Export GA4** : activer l'export gratuit vers BigQuery pour toutes les propriétés — permet les analyses SQL sur données brutes non samplées
- **Server-side tagging** (GTM SS) : contourne les bloqueurs de pubs, améliore la précision des données first-party
- **Modélisation de conversion GA4** : depuis 2024, GA4 modélise les conversions non consenties — vérifier que ce paramètre est cohérent avec votre politique RGPD
- **Matomo Cloud vs. On-premise** : préférer on-premise pour les données sensibles ou les secteurs régulés (santé, finance)
- Documenter chaque changement de tracking avec une annotation dans GA4 et dans un changelog partagé (Notion, Confluence)


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
