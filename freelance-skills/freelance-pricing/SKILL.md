---
name: freelance-pricing
description: Aide à définir sa stratégie de tarification freelance, calculer son TJM et négocier ses tarifs. Se déclenche avec "TJM", "tarif freelance", "combien facturer", "pricing freelance", "taux journalier". Also triggers on "set my freelance rate", "day rate pricing", "how much to charge".
---

# Freelance Pricing

## Étape 1 — Calcul du TJM plancher

Formule de base :

```
TJM_plancher = (Revenu net annuel souhaité + Charges annuelles) / Jours facturables
```

**Charges à inclure (checklist) :**
- Cotisations sociales selon statut : ~22 % micro-entrepreneur, ~45-55 % SASU/EURL TNS, ~20 % portage salarial
- RC Pro : 400–1 500 €/an selon domaine
- Mutuelle : 1 200–2 400 €/an (si non couverte)
- Comptable : 1 200–3 600 €/an (EURL/SASU)
- Outils & licences (IDE, SaaS, cloud) : 1 000–3 000 €/an
- Formation continue : 1 000–2 000 €/an
- Épargne retraite (PER) : 10 % du revenu net cible minimum
- Congés et jours non facturés : 40–60 jours/an

**Jours facturables réalistes :**
- Théorique : 218 jours ouvrés/an
- Réaliste (prospection + vacances + jours creux) : **150–175 jours**
- Pour débuter : commencer à 150 jours pour ne pas se piéger

**Exemple concret :**
```
Cible nette : 70 000 €
Charges annuelles totales : 35 000 €
Jours facturables : 165

TJM plancher = (70 000 + 35 000) / 165 = 636 €/j → arrondir à 650 €/j
TJM annoncé (avec marge 15 %) = 750 €/j
```

---

## Étape 2 — Étude de marché par stack

Sources à croiser :
- **Malt** : profils similaires (même stack, ancienneté), onglet "Tarif indicatif"
- **Comet / Crème de la crème** : baromètres annuels publiés Q1
- **Indie Hackers / communautés Slack** : retours directs freelances
- **Offres de missions** : noter les fourchettes indiquées

Fourchettes 2026 (France, indicatif) :
| Profil | TJM bas | TJM haut |
|---|---|---|
| Dev frontend junior (< 3 ans) | 350 € | 500 € |
| Dev fullstack confirmé (5 ans) | 550 € | 750 € |
| Lead dev / architect (8 ans+) | 750 € | 1 100 € |
| Data engineer / ML | 650 € | 1 000 € |
| DevOps / SRE senior | 700 € | 1 050 € |

---

## Étape 3 — Choisir son modèle de tarification

### TJM classique
Adapté aux missions longues (3 mois+). Facturer à la journée ou demi-journée.
```
Avantage : simple, prévisible
Piège : le client optimise les jours, compression vers le bas
```

### Forfait projet
Adapté si scope bien défini. Calculer en interne : estimation jours × TJM + buffer 20 %.
```
Avantage : vous capturez l'efficacité
Piège : scope creep sans avenant = perte sèche → toujours un avenant signé
```

### Value-based pricing
Pour les missions à fort impact business (migration, lancement produit, audit sécurité).
Raisonnement : si la migration fait économiser 200 k€/an, facturer 15–20 % de la valeur créée est légitime.
```
Avantage : découplé du temps, TJM implicite x2 à x5
Condition : démontrer l'impact en chiffres
```

### Retainer mensuel
Forfait mensuel récurrent (maintenance, astreinte, conseil). Idéal pour sécuriser un revenu de base.
```
Exemple : 3 j/mois × TJM – 10 % fidélité = revenu garanti
```

---

## Étape 4 — Grille tarifaire multi-niveaux

Construire une grille selon ces axes :

| Levier | Majoration | Exemple |
|---|---|---|
| Grand compte (CAC40, banque) | +15 à +25 % | Processus lourd, budget confortable |
| Urgence / démarrage < 2 semaines | +20 % | Disponibilité immédiate |
| Stack rare / expertise niche | +20 à +40 % | Rust, Terraform avancé, K8s prod |
| Mission < 1 mois | +15 % | Pas de visibilité long terme |
| Mission > 6 mois | –5 à –10 % | Sécurité, moins de prospection |
| Startup pré-série A | –10 % max + equity | Négocier BSPCE, pas de ristourne cash |

---

## Étape 5 — Négociation

**Règles d'ancrage :**
1. Toujours annoncer en premier — l'ancre fixe la référence
2. Annoncer le TJM cible + 15 % (marge de négociation)
3. Ne jamais justifier avec "mes charges" — justifier avec la valeur et le marché
4. Si le client pousse : concéder sur la durée, pas sur le tarif

**Réponses aux objections courantes :**

| Objection | Réponse |
|---|---|
| "C'est trop cher" | "Mon positionnement correspond au marché pour ce niveau. Que proposez-vous ?" |
| "On a un budget fixe de X" | "Sur X, je peux couvrir [scope réduit]. Pour le scope complet : X + Y." |
| "Nos freelances habituels sont à 400 €" | "Je comprends. Ma valeur ajoutée est [expertise spécifique]. Si 400 € est votre plafond, nous ne sommes pas alignés." |

---

## Étape 6 — Révision annuelle

Calendrier recommandé :
- **Janvier** : révision inflation (objectif : TJM net réel ≥ inflation + 2 %)
- **Après chaque mission réussie** : +5 à +10 % sur le prochain devis
- **Si taux de conversion > 80 %** : vous êtes sous-tarifé, monter de 10–15 % immédiatement
- **Si taux de conversion < 30 %** : revoir le positionnement ou la communication de valeur

---

## Garde-fous / Anti-patterns

- **Ne jamais descendre sous le TJM plancher** — même pour "se lancer", même pour un client sympa. Chaque exception crée un précédent difficile à corriger.
- **Éviter la facturation à l'heure** — incite le client à comptabiliser chaque minute, génère friction et sous-estimation.
- **Ne pas aligner son tarif sur son ancien salaire brut** — le seuil de départ devrait être salaire brut / 100 (en TJM) comme ordre de grandeur, puis ajuster au marché.
- **Ne pas accepter un retard de paiement sans clause pénale** — inclure systématiquement : pénalité = 3× taux BCE + indemnité forfaitaire 40 € (art. L441-10 code commerce).
- **Ne pas oublier la TVA** — en micro-entreprise sous seuil franchise : pas de TVA mais surveiller les seuils (36 800 € services en 2026). Au-delà : TVA 20 % à ajouter au TJM affiché.
- **Ne pas confondre TJM et revenu net** — un TJM de 600 €/j × 170 jours = 102 000 € brut ≠ revenu net (déduire charges, impôts, non-facturé).
