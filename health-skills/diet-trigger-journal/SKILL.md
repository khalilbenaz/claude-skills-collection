---
name: diet-trigger-journal
description: Met en relation alimentation et symptômes pour identifier des déclencheurs possibles. À utiliser quand l'utilisateur suspecte qu'un aliment ou un repas aggrave ses symptômes. Se déclenche aussi avec "après avoir mangé", "quand je mange du…", "intolérance", "ballonnements après repas", "diarrhée après…", "journal alimentaire", ou toute mention de lien entre nourriture et gêne.
---

# Diet Trigger Journal

Outil d'observation structuré : met en relation repas et symptômes pour dégager des hypothèses à explorer avec un professionnel de santé. Ne produit jamais de diagnostic.

---

## Étape 1 — Recueil des données brutes

Demande ou structure les informations suivantes. Si l'utilisateur n'en fournit qu'une partie, travaille avec ce qui est disponible et signale ce qui manque.

| Champ | Ce qu'on cherche |
|---|---|
| Aliment / repas | Nom, préparation (cru/cuit/transformé), marque si pertinente |
| Quantité | Petite portion, portion normale, excès |
| Heure de consommation | Matin à jeun, avec d'autres aliments, avant de dormir… |
| Délai symptômes | Immédiat (< 30 min), court (30 min–2 h), long (2–8 h), lendemain |
| Type de symptôme | Digestif, cutané, respiratoire, fatigue, douleur, autre |
| Intensité | Légère / modérée / invalidante (scale 1–10 si l'utilisateur veut) |
| Contexte | Stress, repas rapide, médicament pris ce jour, cycle menstruel |
| Fréquence | Première fois, rare, récurrent, systématique |

**Action concrète** : si l'utilisateur décrit un épisode précis, extrais ces champs directement depuis son texte et affiche un résumé structuré avant de passer à l'analyse.

---

## Étape 2 — Journal des épisodes

Construis (ou aide à construire) un tableau cumulatif au fil des échanges :

```
| Date       | Aliment / Repas          | Qté   | Heure | Symptôme          | Délai  | Contexte notable     | Confiance |
|------------|--------------------------|-------|-------|-------------------|--------|----------------------|-----------|
| 2026-06-10 | Pâtes blé complet + sauce| norm. | 19h30 | Ballonnements ++  | 1 h    | Repas rapide, stress | Modérée   |
| 2026-06-14 | Pâtes blé complet seules | norm. | 12h00 | Ballonnements +   | 45 min | Calme                | Modérée   |
| 2026-06-18 | Riz blanc + légumes      | norm. | 13h00 | Aucun             | —      | —                    | —         |
```

Le tableau s'allonge à chaque nouvel épisode. Propose à l'utilisateur de le copier-coller dans un fichier texte ou une note pour le tenir à jour.

---

## Étape 3 — Évaluation des corrélations

Une fois plusieurs épisodes enregistrés, classe chaque aliment suspect selon :

- **Corrélation forte** : même aliment → même symptôme, reproduit ≥ 3 fois, délai constant, symptôme absent avec aliment de substitution.
- **Corrélation modérée** : 2 occurrences, délai variable, d'autres facteurs présents (stress, quantité, combinaison d'aliments).
- **Corrélation faible / hasard** : 1 seul épisode, contexte très différent entre les fois, d'autres aliments communs au repas.
- **Non concluant** : données insuffisantes — précise ce qu'il faudrait observer pour avancer.

**Exemple de formulation correcte** :
> "Les deux épisodes avec des pâtes au blé complet suggèrent un lien possible à explorer. La présence de sauce la première fois et l'absence d'autres céréales la deuxième rendent l'hypothèse modérément plausible. Un test sans gluten pendant 2 semaines, sous supervision d'un professionnel, pourrait aider à clarifier."

---

## Étape 4 — Facteurs confondants à vérifier

Avant de conclure, explore ces variables qui brouillent souvent le signal :

- **Combinaisons** : l'aliment seul versus avec d'autres (ex. lactose + fibres → effet amplifié).
- **Mode de préparation** : cru versus cuit, frit versus vapeur, fermenté versus frais.
- **Quantité seuil** : symptômes seulement au-delà d'une certaine dose.
- **Stress et rythme** : repas avalé en 5 min, repas sous tension = symptômes plus intenses même sans aliment trigger.
- **Médicaments / compléments** : AINS, antibiotiques, probiotiques introduits récemment.
- **Cycle hormonal** : transit souvent modifié en phase prémenstruelle.
- **Hydratation** : consommation d'alcool ou caféine le même jour.

---

## Étape 5 — Hypothèses et plan d'observation

### Hypothèses prudentes

Liste les aliments suspects par niveau de corrélation. Formule systématiquement avec des modérateurs : "semble", "pourrait", "à vérifier", "lien possible".

### Variables à noter les prochaines fois

Adapte à ce qui manque dans le journal. Exemple :
- Quantité exacte consommée.
- Heure du dernier repas avant celui-ci.
- Niveau de stress (0–10) au moment du repas.
- Qualité du sommeil la nuit précédente.

### Journal simplifié à tenir soi-même

```
DATE :
REPAS (liste tous les aliments) :
HEURE :
SYMPTÔMES (oui/non + description) :
DÉLAI :
CONTEXTE (stress, fatigue, médicament…) :
```

### Questions concrètes pour le professionnel de santé

Génère 4 à 6 questions personnalisées basées sur les données recueillies. Exemples de structure :

- "Est-ce que les symptômes que je décris (ballonnements récurrents après blé complet) peuvent orienter vers une intolérance au gluten non-cœliaque ?"
- "Faut-il faire un test d'éviction ou des examens biologiques en premier ?"
- "Comment distinguer une intolérance aux FODMAPs d'une intolérance au gluten ?"
- "Mon transit est très variable selon le stress — comment séparer la composante alimentaire de la composante fonctionnelle ?"

---

## Garde-fous et anti-patterns

| A éviter | Pourquoi | Alternative |
|---|---|---|
| Diagnostiquer une "intolérance au gluten" ou "allergie" | Sans test médical, c'est une hypothèse | "Lien possible à confirmer avec un médecin" |
| Recommander une éviction longue sans suivi | Peut créer des carences | Suggérer un suivi nutritionnel |
| Conclure sur 1 seul épisode | Trop peu de données | Inviter à tenir le journal 2–4 semaines |
| Ignorer les facteurs de stress | Biais fréquent | Inclure contexte dans chaque entrée |
| Proposer des listes d'aliments "interdits" | Nocif sans bilan complet | Identifier des pistes, pas des règles |

---

## Rappel obligatoire

> Ce journal est un outil d'observation personnelle. Il ne remplace pas une consultation médicale. Seul un médecin, gastro-entérologue ou allergologue peut poser un diagnostic d'intolérance ou d'allergie alimentaire. Si les symptômes sont intenses, s'aggravent, ou s'accompagnent de perte de poids, saignements ou fièvre, consulte sans attendre.
