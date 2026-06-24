---
name: visa-checker
description: Aide à vérifier les conditions de visa et documents nécessaires pour un voyage. Se déclenche aussi avec "visa", "ai-je besoin d'un visa", "documents voyage", "passeport", ou toute question sur les formalités d'entrée dans un pays.
---

# Visa Checker

## Étape 1 — Collecter les paramètres obligatoires

Avant toute recherche, obtenir :

| Paramètre | Valeurs possibles | Impact |
|---|---|---|
| Nationalité | passeport français, marocain, tunisien… | détermine l'exemption |
| Destination | pays + région si pertinent (ex : Schengen vs UK) | règles différentes |
| Durée | nuitées prévues | visa court/long séjour |
| Motif | tourisme, affaires, transit, études, travail | type de visa |
| Entrées | simple, double, multiple | extension possible ? |

Si l'utilisateur donne seulement "je vais en Thaïlande", demander nationalité + durée + motif avant de répondre.

## Étape 2 — Classifier le régime de visa

Déterminer d'abord la catégorie :

```
Exemption totale    → séjour possible sans visa (ex : France→UE, Maroc→Turquie)
Visa à l'arrivée    → VOA, obtenu au poste-frontière, souvent payant
eVisa               → demande 100 % en ligne avant départ, délai variable
Visa ambassade      → dépôt physique du dossier, délai souvent >10 jours
Visa non requis     → nationalité couvre le pays cible dans la durée demandée
```

**Critères de décision rapide :**
- Moins de 90 jours tourisme + passeport UE → vérifier liste Schengen/bilatéral
- Transit <24 h sans sortie d'aéroport → souvent pas de visa mais vérifier "TWOV"
- Travail/études = visa long séjour systématique, délai 4-12 semaines minimum

## Étape 3 — Résultat structuré à fournir

```
VISA REQUIS : Oui / Non / Visa à l'arrivée / eVisa
Type recommandé : Tourist Visa / Business Visa / eVisa / VOA
Durée maximale autorisée : X jours
Extensions possibles : Oui/Non (conditions)

DOCUMENTS REQUIS
- Passeport : valide encore au moins [X mois] après retour
- Photos : [format précis, ex : 3,5×4,5 cm, fond blanc]
- Formulaire : [lien officiel ou nom exact]
- Justificatif hébergement : réservation hôtel ou invitation
- Preuve financière : relevé bancaire des 3 derniers mois ou ~X €/jour
- Billet retour confirmé : Oui/Non

DÉLAI DE TRAITEMENT : X jours ouvrés (prévoir tampon)
COÛT : ~X € / X USD (+ frais de service si tiers)
OÙ FAIRE LA DEMANDE : [URL officielle ou nom ambassade]
VALIDITÉ : X mois à partir de la date d'émission ou d'entrée
DATE DE RECHERCHE : 2026-06-24
```

## Étape 4 — Checklist pré-dépôt

```
[ ] Passeport valide (vérifier règle des 6 mois : expiration > retour + 6 mois)
[ ] Pages vierges suffisantes (min 2, souvent 4 pour pays exigeants)
[ ] Photos conformes au format exact exigé (ne pas réutiliser d'anciennes)
[ ] Formulaire rempli sans rature, signature en original si requis
[ ] Justificatif hébergement (réservation annulable acceptable ou ferme ?)
[ ] Preuve de fonds (seuil par jour souvent indiqué : ex. 50 USD/jour Thaïlande)
[ ] Billet retour ou circuitaire (pas aller simple)
[ ] Assurance voyage avec montant min (Schengen : 30 000 €, certains pays : 50 000 $)
[ ] Lettre d'invitation employeur si voyage affaires
[ ] Copies de tous les documents (recto/verso)
[ ] Frais exacts en espèces si paiement au poste-frontière (pas de change garanti)
```

## Étape 5 — Sources officielles à citer systématiquement

Toujours orienter vers les sources primaires, pas des agrégateurs tiers :

- **France.diplomatie.gouv.fr** — conseils par pays pour citoyens français
- **Consulat/Ambassade du pays de destination** — seul document faisant foi
- **IATA Travel Centre** — référence compagnies aériennes, fiable pour transit
- **eVisa officiel** : exemples — `evisa.mofa.go.th` (Thaïlande), `evisa.gov.in` (Inde), `esta.cbp.dhs.gov` (USA ESTA)
- **Timatic** (accès via compagnies) — base de données utilisée aux check-in

## Garde-fous / Anti-patterns / Pièges courants

**Ne jamais :**
- Donner une réponse sans préciser la date de consultation (les règles changent en 48 h)
- Confondre visa de transit et visa de séjour (règles distinctes)
- Ignorer la règle des 6 mois de validité passeport (compagnies refusent l'embarquement)
- Supposer que le visa est valide à partir de la date d'émission (souvent : à partir de la première entrée)
- Oublier que certains pays ont des conditions différentes selon l'aéroport ou la frontière terrestre
- Citer des sites non officiels (visahq, iVisa) comme source — pratiques mais pas officiels

**Pièges fréquents par région :**
- **USA ESTA** : refus si antécédent de refus visa US ou visite Iran/Irak/Syrie/Cuba — même transit
- **Royaume-Uni post-Brexit** : ETA obligatoire depuis 2024 pour ressortissants UE, y compris transit
- **Schengen 90/180** : le compteur est glissant (90 jours sur n'importe quelle période de 180 jours, pas par semestre calendaire)
- **Chine** : exemption transit TWOV (72/144 h) limitée à certaines villes — vérifier la liste exacte
- **Inde eVisa** : les catégories "Tourist", "Business", "Medical" ne sont pas interchangeables
- **Canada eTA** : obligatoire même pour séjours de quelques heures en transit

## Bonnes pratiques 2026

- Déposer toute demande ambassade **au moins 6 semaines** avant le départ (délais post-Covid allongés)
- Préférer l'**eVisa officiel** au tiers payant quand disponible (tarif identique, donnée directe)
- Conserver la **confirmation électronique** sur le téléphone ET en version papier
- Vérifier si le pays exige un **visa de retour** depuis la destination (ex : certains cas de double nationalité)
- En cas de doute sur l'éligibilité ESTA, opter pour le visa B1/B2 en amont (pas de recours possible après refus ESTA)

> **Avertissement légal** — Ces informations sont indicatives et datées du moment de la consultation. Les conditions de visa peuvent changer sans préavis. Seule l'ambassade ou le consulat compétent fait foi. Vérifiez systématiquement sur le site officiel avant tout dépôt de dossier ou achat de billet.
