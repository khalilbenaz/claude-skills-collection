---
name: salary-negotiation
description: Prépare une négociation salariale avec arguments, fourchettes et stratégie. À utiliser quand l'utilisateur veut négocier son salaire, une augmentation ou un package. Se déclenche aussi avec "négocier mon salaire", "demander une augmentation", "combien demander", "négociation salariale", "je suis sous-payé".
---

# Salary Negotiation

## Étape 1 — Collecter le contexte

Avant toute stratégie, recueillir les informations clés :

```
Scénario          : [ ] Offre d'emploi   [ ] Augmentation interne   [ ] Contre-offre
Poste/niveau      : …
Secteur           : …
Localisation      : …  (coût de la vie = levier important)
Salaire actuel    : … + variables (bonus, stock, avantages)
Salaire visé      : … (si déjà une idée)
Années XP pertinente : …
Facteurs de levier  : autre offre en main ? demande forte du marché ? promotion imminente ?
```

## Étape 2 — Ancrage marché (benchmarking)

Sources de données fiables à consulter dans l'ordre de priorité :

| Source | Usage | Notes |
|--------|-------|-------|
| Glassdoor / Levels.fyi | Tech & startups | Filtrer par ville + taille entreprise |
| LinkedIn Salary Insights | Généraliste | Nécessite profil complet |
| Michael Page / Robert Half | Europe / MENA | Rapports annuels PDF téléchargeables |
| Offres d'emploi actives | Marché en temps réel | Chercher les postes avec salaire affiché |
| Réseau pair-à-pair | Validation qualitative | Le plus précis si bien ciblé |

**Calcul de la fourchette cible :**
```
plancher = médiane marché × 0.95   ← seuil en dessous duquel refuser
cible    = médiane marché × 1.10   ← ce qu'on annonce en premier
idéal    = médiane marché × 1.20   ← ancrage d'ouverture si contexte favorable
```

Toujours ouvrir sur l'idéal ou la cible, jamais le plancher. Le plancher ne se révèle jamais.

## Étape 3 — Construire le dossier d'argumentation

Chaque argument doit être **chiffré** ou **vérifiable** :

```
[Résultat]   "J'ai réduit le temps de traitement de 40 % sur le module X."
[Compétence] "Je maîtrise Kubernetes depuis 3 ans ; vos 2 DevOps actuels n'ont pas cette stack."
[Impact]     "Le projet Y que j'ai livré représente 15 % du CA Q4."
[Marché]     "Des postes équivalents en télécommunication Tunisie/France tournent entre X et Y."
[Fidélité]   "3 ans sans augmentation ; l'inflation cumulée sur la période est de N %."
```

Anti-argument à éviter absolument : "j'ai besoin de cet argent pour…" (raisons personnelles).

## Étape 4 — Package total (Total Compensation)

Le salaire fixe n'est qu'une ligne. Identifier et valoriser :

| Élément | Valeur annuelle estimée |
|---------|------------------------|
| Bonus annuel (% garanti vs cible) | … |
| Stock / ESOP (vesting, cliff) | … |
| Jours de congé additionnels | … |
| Télétravail (économies transport) | … |
| Formation / certifications payées | … |
| Assurance santé étendue | … |
| Voiture de fonction / indemnités | … |

Si le fixe bloque, trader des éléments : "Si le fixe est plafonné à X, je souhaite 5 jours télétravail et un budget formation de 3 000 €/an."

## Étape 5 — Script de négociation

### Ouverture (offre d'emploi)
```
"Merci pour cette offre. Je suis très intéressé par le poste.
Après avoir comparé avec le marché et évalué mes apports,
je me positionne plutôt autour de [CIBLE]. Est-ce négociable ?"
```

### Demande d'augmentation
```
"Je voulais qu'on prenne le temps de parler de ma rémunération.
Sur les 12 derniers mois, j'ai [RÉSULTAT 1] et [RÉSULTAT 2].
Le marché pour ce profil est entre X et Y.
Je voudrais qu'on aligne mon salaire sur [CIBLE]."
```

### Contre-offre face à une proposition basse
```
"Je comprends vos contraintes. Votre chiffre est à [OFFRE].
Pour avancer, j'aurais besoin d'arriver à [CIBLE].
Qu'est-ce qui serait possible de votre côté ?"
```

### Technique du silence
Après avoir annoncé sa cible → ne pas combler le silence. Laisser l'interlocuteur répondre en premier.

## Étape 6 — Timing et contexte

| Situation | Moment optimal |
|-----------|---------------|
| Augmentation | Après un succès mesurable, avant l'entretien annuel |
| Offre externe | Dès réception, avant acceptation formelle |
| Contre-offre | Jamais sous pression émotionnelle ; prendre 24-48 h |
| Promotion | Simultanément au changement de titre, jamais après |

## Étape 7 — Plan B si refus

```
SI refus ferme :
  → "Je comprends. Peut-on définir ensemble les objectifs qui justifieraient
     cette revalorisation dans 6 mois ?"
  → Mettre par écrit les engagements obtenus

SI refus partiel (fixe ok, bonus bloqué) :
  → Négocier les éléments alternatifs du package
  → Fixer une révision formelle à date précise

SI refus total sans contrepartie :
  → Évaluer le signal (plafond de verre ? tension budget ?)
  → Continuer à interviewer ailleurs ; avoir une offre externe renforce le levier
```

## Anti-patterns / Pièges

- **Annoncer son salaire actuel en premier** : donne le contrôle à l'autre partie. Répondre : "Je préfère m'aligner sur le marché et la valeur du poste."
- **Accepter immédiatement** : toujours demander 24 h minimum, même si l'offre est bonne.
- **Menacer sans alternative réelle** : ne jamais agiter la démission si on ne peut pas l'assumer.
- **Négocier par email uniquement** : préférer l'oral pour la négociation, email pour la confirmation écrite.
- **Oublier l'inflation** : en 2025-2026, intégrer systématiquement l'indice des prix dans le dossier d'augmentation.
- **Isoler le salaire fixe** : comparer le package complet (fixe + variable + avantages).
- **Justifier par les besoins perso** : l'argument doit toujours reposer sur la valeur apportée, pas sur les charges personnelles.

## Bonnes pratiques 2026

- Les offres avec **fourchette affichée** sont de plus en plus courantes (obligation légale en UE) : positionner sa demande dans le tiers supérieur.
- Dans les secteurs tech, Levels.fyi et les communautés Slack sectorielles donnent des données peer-to-peer plus précises que les agrégateurs classiques.
- La **négociation asynchrone** (Slack/email) est normalisée post-pandémie ; adapter le script écrit avec moins de silence et plus de reformulation explicite.
- En contexte MENA (Tunisie, Maroc, EAU) : la première offre est souvent délibérément basse ; contrer est attendu et non perçu comme agressif.

> Ces conseils sont généraux. Chaque situation dépend du secteur, du rapport de force et du contexte culturel spécifique.
