---
name: trip-planner
description: Planifie un voyage complet avec itinéraire, activités, logistique et budget. À utiliser quand l'utilisateur veut organiser un voyage. Se déclenche aussi avec "planifier un voyage", "itinéraire", "je pars à", "quoi faire à", "voyage à", ou toute demande de planification de voyage. Also triggers on "plan a trip", "itinerary", "things to do in".
---

# Trip Planner

## Étape 1 — Brief voyage (collecter AVANT de planifier)

Questions obligatoires à poser si non renseignées :

| Variable | Exemples / valeurs attendues |
|---|---|
| Destination | Ville ou région précise (ex. Tokyo, côte amalfitaine) |
| Dates & durée | "15-25 juillet" ou "10 jours en septembre" |
| Voyageurs | Nombre + profil (couple, famille enfants 4 et 8 ans, groupe amis) |
| Budget total | Fourchette en €/$ (vols inclus ou non ?) |
| Style de voyage | Backpacker / confort / luxe / culturel / aventure / gastronomique |
| Contraintes | Régime alimentaire, mobilité réduite, visa difficile, animaux, pass rail déjà acheté |
| Déjà réservé | Vol, hébergement, activités incontournables |

**Critère de décision :** si la destination comporte plusieurs villes ou régions, demander si circuit (déplacement quotidien) ou base fixe (rayonnement en journée). Ce choix impacte toute la logistique.

---

## Étape 2 — Itinéraire jour par jour

Générer un tableau condensé, puis développer chaque jour si demandé.

```
Jour 1 — Arrivée Tokyo (Narita → centre ~60 min Narita Express)
  Matin     : Check-in Shinjuku, orientation quartier
  Après-midi: Parc Shinjuku Gyoen (¥500) → Meiji Jingu (gratuit)
  Soir      : Izakaya rue Omoide Yokocho (~¥2 000/pers)
  Transport : JR Pass activé dès J1 si rentable (calculer seuil ci-dessous)
  Budget J  : ~¥8 000 (hors hébergement)
```

**Règle de rythme :** max 3 sites majeurs/jour ; laisser 1,5 h de marge entre activités pour transport + imprévus. Au-delà de 5 activités listées, l'utilisateur abandonnera le planning.

**Seuil JR Pass (Japon — exemple type) :**
- Tokyo → Kyoto = ¥14 000 aller simple
- Si au moins 2 allers-retours Shinkansen → Pass 7 jours (¥50 000) rentable
- Sinon : IC Card (Suica/Pasmo) suffisante

---

## Étape 3 — Logistique

### Hébergement — grille de décision

| Profil | Option recommandée | Fourchette (nuit/chambre) |
|---|---|---|
| Backpacker | Hostel dortoir (Hostelworld, Booking) | 10–25 € |
| Confort standard | Hôtel 3★ ou appartement Airbnb | 60–120 € |
| Famille | Aparthotel (cuisine équipée) | 80–180 € |
| Luxe | Hôtel 4-5★ ou ryokan (Japon) | 200 €+ |

Toujours vérifier : politique annulation gratuite si dates flexibles, quartier (sécurité, proximité transports), avis récents (< 6 mois).

### Transport — checklist logistique

- [ ] Vols : comparer Google Flights + Skyscanner + site compagnie directe ; activer alerte prix si dates flexibles
- [ ] Aéroport → ville : train express > taxi (coût, fiabilité) ; pré-réserver si heure de pointe
- [ ] Sur place : transport en commun (app officielle locale) > location voiture en ville
- [ ] Location voiture : pertinente uniquement hors ville dense ou zone rurale/campagne
- [ ] Rail pass : calculer coût trajet par trajet avant d'acheter

### Documents & visa

Vérifier sur [IATA Travel Centre](https://www.iatatravelcentre.com/) ou site ambassade :
- Passeport valide 6 mois après retour
- Visa requis ? délai, coût, pièces
- Vaccins conseillés (CDC / Pasteur)
- Permis de conduire international si location voiture

### Assurance voyage

Inclure systématiquement si hors UE ou activités à risque. Comparer sur :
- Chapka, Avi-on, WorldNomads (aventure)
- Carte bancaire premium : vérifier plafonds réels (souvent insuffisants > 90 jours)

---

## Étape 4 — Budget détaillé

```
Destination : Tokyo 10 jours, 2 personnes, confort standard
─────────────────────────────────────────────────────────
Transport aérien        800 € (400/pers Paris-Tokyo A/R)
Hébergement            900 € (90 €/nuit × 10)
Repas                  400 € (20 €/pers/repas × 2 × 10)
Transport local        150 € (JR Pass 7j × 2 + Suica)
Activités & entrées    200 €
Shopping / souvenirs   300 € (variable)
Assurance voyage        80 €
─────────────────────────────────────────────────────────
Sous-total           2 830 €
Marge imprévus (10%)   283 €
TOTAL ESTIMÉ         3 113 € (1 557 €/personne)
─────────────────────────────────────────────────────────
```

**Adapter le niveau de détail au budget fourni.** Si budget serré, proposer d'abord les leviers d'économie (vols décalés, hostel, cuisine locale) avant de construire l'itinéraire.

---

## Étape 5 — Conseils pratiques

### Applications indispensables (2026)

| Usage | App recommandée |
|---|---|
| Navigation offline | Maps.me ou Google Maps (télécharger zone) |
| Traduction | Google Translate (OCR offline) |
| Transport en commun | App locale officielle + Citymapper |
| Météo fiable | Weather Underground (données locales) |
| Gestion dépenses | Tricount (partage groupe) |
| Cartes bancaires | Revolut ou Wise (taux de change, 0 frais) |

### Précautions par type de destination

**Destination "visa on arrival" :** apporter 50 USD cash exact, photos d'identité récentes, preuve hébergement imprimée.

**Zone à risque sanitaire :** eau du robinet non potable → budget eau en bouteille (0,50 €/j à intégrer), éviter glaçons, crudités marchés.

**Zone monétaire cash-first :** retirer localement (DAB aéroport à éviter : frais élevés), prévoir petites coupures pour marchés.

---

## Anti-patterns / pièges fréquents

- **Sur-planifier le J1** : arrivée longue distance = décalage horaire, check-in tardif. Ne mettre qu'une activité légère.
- **Ignorer les jours fériés locaux** : musées fermés, prix multipliés (ex. Golden Week Japon, fête nationale France). Vérifier avec `https://www.timeanddate.com/holidays/`.
- **Réserver trop tôt les activités** : pour certains sites (Machu Picchu, Sagrada Familia), billets s'épuisent 2–3 mois à l'avance → réserver en premier.
- **Sous-estimer les temps de trajet** : Google Maps en mode "transit" en heure de pointe × 1,3 pour être réaliste.
- **Budget sans marge** : prévoir minimum 10 % d'imprévus, 15 % si zone instable (changes, grèves, météo).
- **Oublier le retour aéroport** : durée trajet + 2 h (international) ou 1 h 30 (domestique) avant décollage ; noter le terminal exact.

---

## Output final attendu

Proposer systématiquement :
1. **Résumé exécutif** (3 lignes : destination, durée, budget total)
2. **Itinéraire condensé** (tableau jour par jour)
3. **Checklist logistique** (documents, réservations prioritaires)
4. **Budget estimé** (tableau postes)
5. **Top 3 conseils** spécifiques à la destination

Si l'utilisateur veut un export, proposer le format Markdown, ou un tableau copiable pour Notion/Google Sheets.
