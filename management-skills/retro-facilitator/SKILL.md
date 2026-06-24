---
name: retro-facilitator
description: Facilite les rétrospectives agile avec différents formats, génère des actions concrètes et assure le suivi des améliorations. Se déclenche avec "rétrospective", "retro", "sprint review", "amélioration continue", "what went well".
---

# Retro Facilitator

## Workflow

### Étape 1 — Choisir le format (avant la session)

| Format | Quand l'utiliser | Durée conseillée |
|---|---|---|
| Start / Stop / Continue | Équipe stable, besoin d'actions rapides | 45 min |
| 4L (Liked / Learned / Lacked / Longed for) | Post-release, bilan complet | 60 min |
| Mad / Sad / Glad | Tension émotionnelle dans l'équipe | 60 min |
| Sailboat (ancres / vents) | Vision long terme, obstacles systémiques | 75 min |
| KALM (Keep / Add / Less / More) | Rétro de calibration fine | 60 min |
| Timeline | Sprint avec beaucoup d'événements | 90 min |

Critère de décision : si la rétro précédente n'a produit aucune action clôturée, choisir un format **Mad/Sad/Glad** pour rouvrir le canal émotionnel avant d'aller aux actions.

### Étape 2 — Préparer le board (J-1)

**Outils digitaux :**
```
Miro        → Template "Sprint Retrospective" intégré
FigJam      → Section Retro → format au choix
Retrium     → Retrium.com, spécialisé retro, export PDF natif
EasyRetro   → easyretro.io, accès invité sans compte
```

**Board physique :**
- Post-its de 3 couleurs (1 couleur / colonne)
- Dots autocollants pour le vote (3 par personne)
- Minuterie visible de tous

### Étape 3 — Ouvrir la session (5 min)

Rappeler les trois règles à chaque rétro :
1. **Règle de Vegas** : ce qui est dit ici reste ici.
2. **Bonne foi assumée** : on part du principe que chacun a fait de son mieux.
3. **Faits, pas jugements** : "le déploiement a échoué 3 fois" et non "tu as mal déployé".

Annoncer le timing à voix haute :
```
Réflexion silencieuse : 7 min
Partage + regroupement : 15 min
Vote                  : 3 min
Discussion top sujets : 20 min
Définition d'actions  : 10 min
Revue actions passées : 5 min
```

### Étape 4 — Collecte individuelle (5-10 min, silencieux)

Chaque membre écrit ses points **seul, sans voir les autres**. Sur Miro : activer "Private mode" pour masquer les notes avant reveal. Sur FigJam : sticky notes cachées jusqu'au partage.

Prompt suggéré à projeter pendant ce temps :
> "Pense aux 2 dernières semaines : qu'est-ce qui t'a aidé à livrer ? qu'est-ce qui t'a ralenti ? qu'aimerais-tu changer ?"

### Étape 5 — Partage et regroupement (15 min)

- Tour de table : chaque personne lit ses notes à voix haute (sans débat).
- Le facilitateur regroupe les doublons en temps réel.
- Règle : si 2 notes se ressemblent, demander aux auteurs si elles sont identiques avant de fusionner.

### Étape 6 — Vote (dot voting, 3 min)

Chaque participant dispose de **3 votes** (peut tous les mettre sur un seul sujet).

```
Comptage manuel   : dots autocollants
Miro              : clic droit → "Voting session"
EasyRetro         : bouton "Start voting" intégré
Retrium           : vote anonyme natif
```

Prendre les **2-3 thèmes les plus votés** pour la discussion.

### Étape 7 — Analyse causes racines (20 min)

Appliquer les **5 Pourquoi** sur chaque sujet retenu :

```
Problème : "Les PRs restent ouvertes > 2 jours"
Pourquoi 1 : Pas de temps dédié aux reviews
Pourquoi 2 : Aucun slot dans l'agenda de l'équipe
Pourquoi 3 : On n'a jamais formalisé de SLA de review
→ Cause racine : pas de convention d'équipe sur le délai de review
```

Ne pas s'arrêter à "manque de communication" — c'est un symptôme, pas une cause.

### Étape 8 — Définition d'actions SMART (10 min)

Format obligatoire pour chaque action :
```
Quoi    : Ajouter un slot "Review PRs" de 15 min chaque matin
Qui     : Dev lead (Alice)
Quand   : Dès lundi prochain
Mesure  : 0 PR > 24h en attente au prochain sprint
```

**Maximum 3 actions par rétro.** Au-delà, rien ne se fait.

Saisir les actions dans l'outil de suivi de l'équipe immédiatement :
```bash
# Exemple Jira CLI (go-jira)
jira issue create --project TEAM --type Task \
  --summary "Retro action: slot review PRs quotidien" \
  --assignee alice --due 2026-07-01

# Exemple GitHub Issues
gh issue create --title "Retro action: slot review PRs" \
  --assignee alice --label "retro-action" \
  --body "Ajouter 15 min matin. Mesure: 0 PR > 24h."
```

### Étape 9 — Revue des actions passées (5 min, en début ou fin)

Pour chaque action de la rétro précédente :
- **Done** : féliciter, archiver.
- **In progress** : laisser ouverte, re-confirmer le responsable.
- **Not started** : comprendre pourquoi en 1 phrase, décider : relancer ou abandonner.

Si plus de 50 % des actions ne sont pas clôturées, la prochaine rétro doit commencer par cette revue en priorité.

---

## Garde-fous et anti-patterns

| Anti-pattern | Symptôme | Correctif |
|---|---|---|
| Retro sans action | "On a parlé, c'était bien" | Finir la session uniquement quand au moins 1 action a un owner |
| Actions trop vagues | "Améliorer la communication" | Reformuler en comportement observable et mesurable |
| Toujours le même format | Taux de participation baisse | Changer de format tous les 2-3 sprints |
| Manager présent non invité | L'équipe autocensure | Retro = équipe only, sauf invitation explicite |
| Discussion globale sans vote | Les mêmes sujets dominent | Vote obligatoire avant toute discussion |
| 5+ actions définies | Rien n'est fait | Hard limit à 3, reporter le reste au backlog de rétro |
| Rétro annulée "faute de temps" | Régression continue | Bloquer le slot en début de sprint, non négociable |

## Bonnes pratiques 2026

- **Rétros asynchrones** pour équipes distribuées : ouvrir le board 24h avant, laisser les membres écrire leurs points, puis session synchrone de 30 min uniquement pour la discussion et les actions.
- **Rétro de santé d'équipe** (tous les 2-3 mois) : utiliser le [Squad Health Check de Spotify](https://engineering.atspotify.com/2014/09/squad-health-check-model/) pour évaluer 11 dimensions (delivery, fun, speed…).
- **Changelog de rétro** : maintenir un fichier `RETRO_LOG.md` dans le repo avec date, format utilisé, actions définies et statut. Visible de tout le monde.
- **Facilitateur tournant** : faire tourner le rôle tous les sprints pour éviter la dépendance à une seule personne et développer la compétence dans l'équipe.
- **FigJam AI (2025+)** : générer automatiquement le regroupement de thèmes via l'assistant IA de FigJam pour gagner 5-10 min sur l'étape de clustering.
