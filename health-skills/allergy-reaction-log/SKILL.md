---
name: allergy-reaction-log
description: Suit les réactions allergiques ou suspectées, identifie les déclencheurs et prépare un dossier structuré pour l'allergologue. À utiliser quand l'utilisateur décrit des réactions cutanées, respiratoires ou digestives suspectes. Se déclenche aussi avec "réaction allergique", "urticaire", "j'ai gonflé", "allergie", "éternuements", "yeux qui piquent", "eczéma", ou toute mention de réaction inexpliquée après exposition. Also triggers on "allergy log", "track allergic reactions", "find my allergy triggers".
---

# Allergy Reaction Log

Aide l'utilisateur à documenter rigoureusement ses réactions suspectes afin de dégager des patterns et de préparer une consultation allergologique productive.

> **Important** : Ce journal est un outil d'observation, pas un outil de diagnostic. Seul un allergologue peut confirmer une allergie via des tests adaptés (prick-test, patch-test, IgE spécifiques). En cas de réaction sévère, composez le 15 (SAMU) ou le 18 (pompiers) immédiatement.

---

## Étape 1 — Triage d'urgence immédiat

Avant tout, vérifie si la réaction est en cours ou récente :

- **Signes d'anaphylaxie** (urgence vitale) : gonflement de la bouche / gorge / langue, difficulté à avaler ou à respirer, hypotension, malaise, perte de connaissance, association peau + respiration + circulation.
- **Conduite à tenir** : si l'un de ces signes est présent → interrompre l'entretien, indiquer d'appeler le **15** (SAMU) ou le **112**, utiliser un auto-injecteur d'adrénaline (ex. EpiPen) si prescrit.

Ne passe à l'étape suivante que si la situation n'est pas une urgence active.

---

## Étape 2 — Collecte de l'épisode

Pour chaque réaction, recueille les informations suivantes (pose les questions une par une, pas en rafale) :

### 2a — La réaction elle-même
| Champ | Ce qu'il faut préciser |
|---|---|
| Date et heure | ex. « jeudi 19 juin 2026 vers 14h30 » |
| Symptômes | localisation exacte (dos, paupières, lèvres…), nature (rougeur / plaques / gonflement / démangeaison / essoufflement / vomissements…) |
| Intensité | légère (gêne), modérée (perturbation des activités), sévère (recours aux secours) |
| Durée | minutes, heures, jours |
| Évolution | résolution spontanée / aggravation progressive / amélioration après traitement |
| Traitement pris | antihistaminique, cortisone, adrénaline, rien — préciser dose et heure |

### 2b — L'exposition suspectée
- **Aliments** : tout ce qui a été consommé dans les 4 heures précédentes (lister les ingrédients si possible, y compris sauces et additifs).
- **Médicaments / compléments** : nom, dose, heure de prise.
- **Environnement** : lieu (extérieur, pelouse, appartement avec chat…), activité physique juste avant, saison, taux de pollens si connu.
- **Contact cutané** : cosmétique neuf, bijou (métal), tissu synthétique, latex.
- **Piqûre / morsure** : insecte identifié ?
- **Délai exposition → réaction** : immédiat (< 1 h) ou retardé (1–72 h) — info cruciale pour orienter le bilan.

---

## Étape 3 — Contexte personnel

- Première occurrence ou récurrence (combien de fois ?) ?
- Allergies déjà diagnostiquées (aliment, médicament, environnemental) ?
- Atopie personnelle ou familiale (asthme, rhinite, eczéma, urticaire chronique) ?
- Tests allergologiques antérieurs : date, résultats, laboratoire ?
- Traitements de fond en cours (antidépresseurs, IEC, bêtabloquants — interactions possibles) ?
- État au moment de la réaction : stress, effort physique, alcool, infection récente ?

---

## Étape 4 — Journal structuré (tableau cumulatif)

Génère et complète ce tableau à chaque nouvel épisode. Copie-colle-le dans un document texte ou tableur pour le montrer au médecin.

```
| N° | Date & heure | Exposition principale suspectée | Délai expo→réaction | Symptômes | Intensité (1–3) | Durée | Traitement pris | Résultat |
|----|--------------|--------------------------------|--------------------|-----------|--------------------|-------|----------------|----------|
| 1  |              |                                |                    |           |                    |       |                |          |
```

**Légende intensité** : 1 = légère, 2 = modérée, 3 = sévère/urgence.

---

## Étape 5 — Analyse des patterns

Après au moins 2–3 épisodes documentés, propose une synthèse :

### Corrélations possibles
Formule sous forme d'hypothèses uniquement :
- « À chaque épisode, vous avez consommé [X] dans les 2 heures précédentes — à explorer avec votre allergologue. »
- « Tous les épisodes surviennent en période de pollinisation (mars–juin) — rhinite allergique ou allergie croisée possible. »

### Facteurs aggravants potentiels
- Effort physique post-repas (urticaire cholinergique / allergie alimentaire induite par l'exercice — AIAE).
- Prise concomitante d'AINS ou d'alcool (abaissent le seuil de réaction).
- Stress ou infection intercurrente.

### Absences notables
- Signale si un aliment ou un allergène est **systématiquement absent** lors des épisodes (aide à écarter des pistes).

---

## Étape 6 — Préparation de la consultation allergologique

Génère un résumé d'une page à imprimer / envoyer au médecin, comprenant :

1. **Chronologie des épisodes** (tableau de l'étape 4).
2. **Hypothèses de déclencheurs** classées par fréquence d'apparition.
3. **5 questions personnalisées** adaptées au profil, par exemple :
   - « Faut-il réaliser un prick-test ou des IgE spécifiques pour [allergène X] ? »
   - « Dois-je éviter [aliment] en attendant les tests, ou seulement si les symptômes réapparaissent ? »
   - « Quand et comment utiliser l'auto-injecteur d'adrénaline si prescrit ? »
   - « Y a-t-il des allergies croisées à surveiller avec [allergène identifié] ? »
   - « Mon traitement actuel [médicament] peut-il aggraver les réactions ou masquer les tests ? »

---

## Garde-fous et anti-patterns

| Anti-pattern | Pourquoi c'est problématique | Bonne pratique |
|---|---|---|
| Éviter un aliment entier sur la base d'une seule réaction non confirmée | Restriction nutritionnelle inutile, surtout chez l'enfant | Documenter, consulter avant d'éliminer |
| Conclure « c'est une allergie » à cause d'une réaction cutanée | Intolérance, irritation, urticaire factice ont les mêmes symptômes | Toujours formuler en hypothèse |
| Tester soi-même en se ré-exposant délibérément | Risque d'anaphylaxie | Réintroduction uniquement sous contrôle médical |
| Arrêter un antihistaminique avant un test allergologique sans avis médical | Peut biaiser les résultats | Demander au médecin les délais d'arrêt recommandés |
| Ignorer un épisode « léger » | La sévérité peut s'aggraver aux expositions suivantes | Tout documenter, même les réactions mineures |

---

## Bonnes pratiques 2026

- **Application mobile** : recommander un journal numérique (ex. note horodatée sur smartphone) pris immédiatement après la réaction — la mémoire des détails diminue rapidement.
- **Photo** : encourager à photographier les lésions cutanées (avec heure visible ou métadonnées EXIF).
- **Code QR de la carte d'urgence** : si l'utilisateur a déjà une allergie confirmée grave, rappeler l'intérêt d'une carte d'urgence (disponible via les associations d'allergiques).
- **Partage avec l'allergologue** : le tableau Markdown ci-dessus peut être envoyé par email ou partagé via l'espace patient d'une messagerie sécurisée de santé (ex. Mon Espace Santé en France).

---

> ⚠️ **Rappel professionnel** : Ce journal est un outil d'observation personnel. Il ne remplace ni un diagnostic, ni un bilan allergologique. Pour toute réaction sévère ou récurrente, consultez un allergologue. En cas de réaction sévère en cours, appelez le **15** (SAMU) ou le **112** sans délai.
