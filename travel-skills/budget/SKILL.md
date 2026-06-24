---
name: budget
description: Estime et planifie le budget d'un voyage avec détail par poste de dépense. Se déclenche aussi avec "budget voyage", "combien coûte un voyage à", "estimer les frais", "voyage pas cher", ou toute question de budget voyage.
---

# Travel Budget

## Étape 1 — Collecte des paramètres

Demander (ou déduire du contexte) :

- **Destination** (pays + ville principale)
- **Durée** (ex : 10 jours)
- **Nb personnes** (solo / couple / groupe)
- **Niveau de confort** : `budget` | `moyen` | `confort` | `luxe`
- **Devise de référence** (EUR / USD / MAD…)
- **Période** (haute / basse saison — écart pouvant aller jusqu'à ×2 sur l'hébergement)
- **Flexibilité dates** ? (décalage de 3–7 jours = économie fréquente de 20–40 % sur les vols)

---

## Étape 2 — Benchmarks par niveau de confort

Fourchettes indicatives **par personne/jour** (hors vols, hors visa) :

| Destination type | Budget | Moyen | Confort |
|---|---|---|---|
| Europe Ouest | 60–90 € | 120–180 € | 200–350 € |
| Europe Est / Balkans | 35–55 € | 70–110 € | 140–220 € |
| Asie du Sud-Est | 20–35 € | 50–80 € | 100–160 € |
| Amérique du Nord | 80–120 $ | 160–250 $ | 280–450 $ |
| Afrique du Nord | 25–40 € | 55–90 € | 120–200 € |
| Amérique Latine | 30–55 $ | 70–110 $ | 150–250 $ |

> Ajuster selon la ville (capitale ≈ +30 %) et la saison (haute ≈ +25–40 %).

---

## Étape 3 — Décomposition par poste

Remplir ce tableau pour la destination demandée :

| Poste | €/j/pers | Total (N jours) | Notes |
|---|---|---|---|
| **Hébergement** | | | Diviser par 2 si chambre partagée / couple |
| **Alimentation** | | | Resto local vs tourist trap : écart ×2–3 |
| **Transport local** | | | Métro/bus vs Uber/taxi : préciser |
| **Activités / entrées** | | | Musées, excursions, guides |
| **Shopping / souvenirs** | | | Plafond à fixer explicitement |
| **Communication** (SIM local) | | | Forfait data 10–30 j |
| **Assurance voyage** | | | ~2–5 % du budget total |

**Coûts fixes** (hors budget journalier) :

| Poste | Montant estimé | Source / remarque |
|---|---|---|
| Vol A/R (ou train) | | Chercher via Google Flights / Skyscanner |
| Visa | | Vérifier ambassade officielle |
| Vaccins / médicaments | | Rubrique santé du MAE : [france.diplomatie.fr](https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/) |
| Réservations prépayées | | Hôtels non-remboursables, tours, passes |

---

## Étape 4 — Calcul du budget total

```
Budget journalier × durée (jours) + coûts fixes + marge sécurité

Marge recommandée :
  - Voyage structuré / tout inclus : +10 %
  - Voyage semi-libre               : +15 %
  - Backpacking / aventure          : +20–25 %
```

**Formule rapide (markdown copiable)** :

```
Total = (Hébgt + Alim + Transport + Activités + Shopping + SIM) × N_jours
      + Vol_AR + Visa + Assurance
      + Total × 0.15   ← marge 15 %
```

---

## Étape 5 — Outils de recherche de prix réels (2026)

| Besoin | Outil recommandé |
|---|---|
| Vols flexibles | Google Flights → onglet "Calendrier des prix" |
| Vols low-cost Europe | Ryanair / Vueling / Transavia directs |
| Hébergement | Booking.com (filtre prix), Hostelworld (dortoirs) |
| Hébergement alternatif | Airbnb, Couchsurfing, Workaway |
| Budget communautaire | [budgetyourtrip.com](https://www.budgetyourtrip.com) — données réelles par ville/niveau |
| Taux de change live | `xe.com` ou `revolut.com/currency-exchange` |
| Carte sans frais FX | Revolut, Wise, N26 — évite les frais 1–3 % |

---

## Étape 6 — Astuces d'économie (spécifiques à la destination)

Générer **3 à 5 conseils concrets** adaptés à la destination donnée. Exemples de pattern :

- **Hébergement** : réserver 6–8 semaines à l'avance en haute saison ; choisir quartiers hors-centre (-20–30 %)
- **Vols** : alertes prix Google Flights ; éviter vendredi/dimanche ; mardi/mercredi matin = moins cher
- **Alimentation** : déjeuner au restaurant vs dîner (même adresse, prix souvent -30 %) ; marchés locaux
- **Activités** : city pass si >3 musées/j ; visites libres le dimanche (gratuit dans beaucoup de villes EU)
- **Transport local** : pass semaine vs ticket unitaire ; vélo/trottinette en ville compacte

---

## Étape 7 — Présentation du résultat

Toujours conclure avec :

1. **Tableau récapitulatif** avec totaux par poste
2. **Budget total estimé** (fourchette basse / haute)
3. **Budget/jour moyen** résultant
4. **1 phrase de mise en garde** sur les imprévus (annulation vol, soins médicaux)

---

## Garde-fous & anti-patterns

- **Ne pas oublier le retour à l'aéroport** — coût souvent ignoré (taxi/shuttle = 20–80 €)
- **Assurance sous-estimée** : couvrir annulation + rapatriement médical, pas seulement bagages
- **Taux de change à l'aéroport** : pire taux possible — utiliser carte Wise/Revolut ou retrait DAB local
- **Hébergement non-remboursable** : indiquer le risque si dates incertaines
- **Budget souvenirs réaliste** : poste le plus sous-estimé des voyageurs ; fixer un plafond ferme
- **Visa électronique** : délai de traitement parfois 72 h — ne pas attendre J-2 du départ
- **Haute saison = réservation obligatoire** : Barcelone/Amsterdam/Paris juillet–août — sans réservation préalable le budget explose ×2
- **Conversion mentale approximative** : indiquer le taux du jour pour aider à se repérer localement
