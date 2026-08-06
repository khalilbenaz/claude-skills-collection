---
name: interview-prep
description: Prépare un entretien d'embauche avec questions probables, réponses structurées et simulation. À utiliser quand l'utilisateur a un entretien à venir. Se déclenche aussi avec "entretien d'embauche", "préparer mon entretien", "questions d'entretien", "comment répondre à", "simulation entretien". Also triggers on "prepare for an interview", "interview questions", "mock interview".
---

# Interview Prep

## Étape 1 — Collecte du contexte

Demander (toujours en une seule fois) :
- Intitulé du poste + niveau (junior / confirmé / lead / manager)
- Entreprise (taille, secteur, produit)
- Type d'entretien : RH screening | technique (coding / system design / live coding) | manager | panel | cas business
- Stack / domaine technique si applicable
- Point faible à anticiper (gap de compétence, départ précédent, changement de secteur)

## Étape 2 — Cartographie des questions probables

Générer 15-20 questions réparties en 4 catégories :

### 2a. Questions classiques (ouverture/clôture)
- "Présentez-vous en 2 minutes."
- "Pourquoi quittez-vous votre poste actuel ?"
- "Où vous voyez-vous dans 3 ans ?"
- "Quels sont vos points forts / axes de progression ?"

### 2b. Questions comportementales (méthode STAR)
Template STAR à appliquer pour chaque réponse :
```
Situation  : contexte bref (1-2 phrases)
Tâche      : votre rôle / responsabilité
Action     : ce que VOUS avez fait (verbes d'action, pas "on a")
Résultat   : mesurable si possible (%, €, délai, NPS...)
```
Exemples fréquents :
- "Décrivez un conflit avec un collègue et comment vous l'avez résolu."
- "Parlez d'un projet raté et ce que vous en avez tiré."
- "Donnez un exemple où vous avez dû prioriser sous pression."

### 2c. Questions techniques (adapter au poste)

**Dev backend / fullstack :**
```
- Expliquez-moi la différence entre PUT et PATCH.
- Comment gérez-vous la cohérence dans une architecture microservices ?
- Quelle stratégie de retry utilisez-vous côté API ?
```
**System design :**
```
- Concevez un système de notification à 10M d'utilisateurs.
- Comment scaler une API de paiement avec une contrainte d'idempotence ?
```
**Data / BI :**
```
- Différence entre OLAP et OLTP — exemple concret ?
- Comment optimisez-vous une requête SQL lente ?
```

### 2d. Questions pièges (à désamorcer)
- "Quel est votre salaire actuel ?" — répondre par la fourchette attendue, pas l'historique.
- "Vous êtes surqualifié, non ?" — montrer l'alignement projet / long terme.
- "Pourquoi avez-vous mis 8 mois sans travailler ?" — préparer une réponse factuelle, sans sur-justifier.
- "Votre plus grande faiblesse ?" — choisir une vraie faiblesse avec le plan d'amélioration concret.

## Étape 3 — Pitch "Présentez-vous"

Générer 3 versions calibrées :

| Version | Durée | Usage |
|---------|-------|-------|
| Flash   | 30 s  | Screening téléphonique |
| Standard| 90 s  | Premier entretien RH |
| Développée | 3 min | Entretien manager / panel |

Structure recommandée :
```
1. Accroche : compétence-clé ou résultat marquant
2. Parcours : fil conducteur en 2-3 étapes logiques
3. Maintenant : pourquoi ce poste, pourquoi cette entreprise
```

## Étape 4 — Questions à poser au recruteur

Préparer 5-7 questions, classées par priorité :
1. **Critiques** (à poser systématiquement) :
   - "Quel est le principal défi que la personne recrutée devra relever dans les 90 premiers jours ?"
   - "Comment mesurez-vous le succès sur ce poste après 6 mois ?"
2. **Équipe / culture** :
   - "Comment l'équipe gère-t-elle les désaccords techniques ?"
   - "Quelle est la fréquence et le format des code reviews / rétros ?"
3. **Processus** :
   - "Quelles sont les prochaines étapes et le timing de décision ?"

## Étape 5 — Simulation

Proposer un mode simulation : l'utilisateur répond, l'agent évalue sur :
- Clarté et concision (< 2 min par réponse comportementale)
- Présence de métriques chiffrées
- Cohérence STAR
- Absence de critiques non constructives de l'employeur précédent

Feedback structuré :
```
+ Point fort observé
~ À renforcer : [suggestion précise]
! À éviter absolument : [anti-pattern]
```

## Étape 6 — Checklist logistique (J-1 / Jour J)

**J-1 :**
- [ ] Relire la fiche de poste et noter 3 mots-clés à réutiliser
- [ ] Lire les dernières news de l'entreprise (blog, LinkedIn, Glassdoor)
- [ ] Préparer 2 copies du CV + carnet pour prise de notes
- [ ] Confirmer le lieu / lien visio, tester le son et la caméra

**Jour J :**
- [ ] Arriver 10 min en avance (présentiel) ou connecté 5 min avant (visio)
- [ ] Téléphone en mode silencieux
- [ ] Garder un verre d'eau à portée
- [ ] Fermer les onglets inutiles si partage d'écran

---

## Anti-patterns courants

| Anti-pattern | Conséquence | Correctif |
|---|---|---|
| Réponse sans exemple concret | Perçu comme théorique / non crédible | Toujours finir par "par exemple, j'ai…" |
| Critique de l'ex-employeur | Signal de maturité faible | Formuler en opportunité d'apprentissage |
| Réponse > 3 min | Recruteur décroche | Structurer en STAR max 90 s |
| Salaire annoncé trop tôt | Perte de levier | Demander la fourchette du poste d'abord |
| "Je n'ai pas de faiblesse" | Manque de self-awareness | Choisir une faiblesse réelle + plan d'amélioration |
| Silence sur les gaps CV | Suspicion | Anticiper et expliquer proactivement |

## Bonnes pratiques 2026

- **LinkedIn scraping pré-entretien** : regarder le profil du recruteur (parcours, posts récents) pour personnaliser l'échange.
- **Entretiens async vidéo** (HireVue, Willo) : répondre en 2-3 prises max, soigner l'éclairage, éviter les "euh" en début.
- **Coding interviews** : utiliser CoderPad / Replit live — penser à voix haute, tester les edge cases avant de coder.
- **Préparer des contre-questions sur l'IA** : "Comment l'équipe utilise-t-elle les outils IA au quotidien ?" montre une posture proactive en 2026.
- **Glassdoor / Levels.fyi** : calibrer la fourchette salariale avant toute négociation.
