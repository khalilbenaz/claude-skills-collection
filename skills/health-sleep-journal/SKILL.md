---
name: health-sleep-journal
description: Suit la qualité du sommeil, les habitudes nocturnes et les facteurs perturbateurs pour identifier des schémas et proposer des pistes d'hygiène du sommeil. À utiliser quand l'utilisateur se plaint d'insomnie, de fatigue au réveil, de réveils nocturnes ou de troubles du sommeil. Se déclenche aussi avec "je dors mal", "insomnie", "je me réveille la nuit", "je suis fatigué le matin", "sommeil perturbé", "cauchemars", ou toute mention de difficulté liée au sommeil.
---

# Sleep Journal

Outil d'observation et de suivi du sommeil. Ton bienveillant, sans jugement, sans diagnostic.

---

## Étape 1 — Accueil et contexte

Avant de collecter des données, pose **une seule question ouverte** pour comprendre la situation :

> "Depuis combien de temps dormez-vous mal, et qu'est-ce qui vous perturbe le plus : l'endormissement, les réveils nocturnes, ou la fatigue au réveil ?"

Cela permet de cibler le profil dès le départ sans bombarder l'utilisateur de questions.

---

## Étape 2 — Profil de sommeil (une nuit ou plusieurs)

Collecte les informations suivantes, en posant des questions naturelles au fil de la conversation :

| Variable | Ce qu'on cherche |
|---|---|
| Heure de coucher | Heure à laquelle l'utilisateur se met au lit |
| Heure de réveil | Réveil définitif (pas les réveils intermédiaires) |
| Latence d'endormissement | Temps estimé avant de s'endormir (en minutes) |
| Réveils nocturnes | Nombre et durée estimée ; cause perçue si connue |
| Qualité ressentie | Score 1-10 ou description (reposé / moyen / épuisé) |
| Durée totale estimée | Coucher → réveil, moins les éveils |

**Calcul de la durée effective** (à faire silencieusement) :
```
Durée effective = (Réveil - Coucher) - latence - cumul des réveils nocturnes
```
Exemple : coucher 23h30, réveil 7h00, latence 30 min, 1 réveil de 20 min → durée effective ≈ 6h40.

---

## Étape 3 — Facteurs perturbateurs

Passe en revue ces catégories à partir du récit (ne pose pas toutes les questions d'un coup) :

**Comportements pré-sommeil**
- Écrans (téléphone, ordi, TV) dans l'heure avant le coucher
- Caféine après 14h (café, thé noir, cola, boissons énergisantes)
- Alcool le soir (effet "faux ami" : facilite l'endormissement mais fragmente le sommeil)
- Repas tardif ou copieux (moins de 2h avant le coucher)
- Activité physique intense tard le soir

**Environnement**
- Bruit extérieur ou partenaire qui ronfle
- Lumière (stores insuffisants, veilleuses)
- Température de la chambre (idéal : 18-20°C)
- Matelas ou literie inconfortable

**État interne**
- Stress professionnel, ruminations, anxiété anticipatoire
- Douleurs physiques (dos, migraines, inconfort)
- Médicaments ou compléments (certains bêtabloquants, corticoïdes, diurétiques perturbent le sommeil)
- Pathologies associées (reflux, asthme, douleurs chroniques)

**Rythme de vie**
- Siestes longues ou tardives (après 15h, plus de 20 min)
- Horaires de coucher très variables entre semaine et week-end ("social jet lag")
- Travail posté ou décalé

---

## Étape 4 — Tableau de suivi multi-nuits

Quand l'utilisateur veut suivre son sommeil sur plusieurs jours, génère ce tableau vierge :

```markdown
| Date       | Coucher | Réveil | Latence (min) | Réveils nocturnes | Durée effective | Qualité (1-10) | Facteur principal | Notes libres |
|------------|---------|--------|--------------|-------------------|-----------------|---------------|------------------|--------------|
| 2026-06-24 | 23:30   | 07:00  | 30           | 1 × 20 min        | 6h40            | 5             | Stress travail    |              |
| 2026-06-25 |         |        |              |                   |                 |               |                  |              |
```

Propose-lui de remplir ce tableau chaque matin à la même heure, idéalement dans les 15 minutes après le réveil (les souvenirs s'estompent vite).

---

## Étape 5 — Identification des schémas

Quand au moins 3-5 nuits sont disponibles, analyse :

**Tendances temporelles**
- Semaine vs week-end : un décalage de >1h de l'heure de coucher/réveil suggère un "social jet lag"
- Nuits avant un événement stressant vs nuits neutres

**Corrélations facteur ↔ qualité**
- Nuits avec alcool vs sans alcool → qualité moyenne comparée
- Nuits avec écrans vs sans → latence comparée

**Signaux d'alerte à signaler** (sans diagnostiquer) :
- Durée effective < 6h de façon répétée
- Réveils nocturnes systématiques au même créneau horaire
- Fatigue persistante malgré 8h de temps au lit (peut suggérer un sommeil non réparateur)
- Ronflement signalé ou pauses respiratoires → orienter vers un médecin

---

## Étape 6 — Pistes d'hygiène du sommeil

Propose uniquement les pistes **directement liées aux facteurs identifiés**. Ne pas tout lister en vrac.

**Si latence longue (>30 min) :**
- Ritual de déconnexion : arrêter les écrans 45-60 min avant le coucher
- Lumière tamisée le soir (limiter la lumière bleue)
- Technique 4-7-8 : inspirer 4s, retenir 7s, expirer 8s (aide à calmer le système nerveux)

**Si réveils nocturnes :**
- Éviter l'alcool le soir ; il fragmente le sommeil en 2e partie de nuit
- Température de chambre : essayer de descendre à 18-19°C
- En cas de réveil avec ruminations : noter les pensées sur un carnet pour "vider" l'esprit

**Si fatigue au réveil malgré une durée suffisante :**
- Vérifier la régularité des horaires (même heure de réveil les week-ends)
- Éviter les siestes longues ; privilégier un "power nap" de 15-20 min avant 15h

**Si anxiété ou ruminations :**
- Journal de préoccupations : écrire 5 min avant le coucher tout ce qui "tourne en boucle"
- Ne pas rester au lit éveillé plus de 20 min ; se lever, faire une activité calme, revenir quand le sommeil revient

---

## Étape 7 — Questions à poser à un médecin

Si les troubles persistent (>3 semaines) ou impactent la journée, propose ces questions personnalisées :

1. "Mes symptômes peuvent-ils être liés à un trouble du sommeil comme l'apnée du sommeil ?"
2. "Est-ce qu'un médicament que je prends pourrait perturber mon sommeil ?"
3. "Suis-je candidat à une thérapie cognitivo-comportementale pour l'insomnie (TCC-I) ?"
4. "Vaut-il la peine de faire une polysomnographie dans mon cas ?"
5. (Question personnalisée selon le facteur dominant identifié)

---

## Garde-fous et anti-patterns

**Ne jamais faire :**
- Suggérer ou nommer un somnifère, un anxiolytique ou un complément spécifique (mélatonine incluse, sauf si l'utilisateur évoque déjà son usage)
- Poser un diagnostic : "vous avez une insomnie chronique" / "c'est probablement de l'apnée"
- Minimiser les troubles : "c'est normal de mal dormir parfois"
- Recommander de l'alcool pour s'endormir (piège courant)

**Pièges fréquents :**
- Confondre "temps au lit" et "durée de sommeil effective" — toujours calculer la durée effective
- L'utilisateur qui dit "je dors 8h" mais se réveille épuisé : insister pour connaître la qualité et les réveils, pas juste la durée
- Ne pas supposer que plus de sommeil est toujours mieux : >10h chez l'adulte peut aussi être un signal
- Le week-end "rattrapant" la dette de sommeil est partiellement inefficace — informer sans culpabiliser

---

## Rappel obligatoire

> Ce journal est un outil d'observation personnelle. Si vos troubles du sommeil persistent plus de 3 semaines, affectent votre concentration, votre humeur ou votre santé, ou si vous suspectez un trouble médical (apnée, syndrome des jambes sans repos…), consultez un médecin ou un spécialiste du sommeil. Ce journal ne remplace pas un avis médical.


## Communication Rules

- Clear and concise; skip filler, but never at the cost of warmth.
- Warm, respectful, non-judgmental tone — meet the person where they are.
- Lead with what matters to the user; avoid unnecessary preamble.
- Plain language; explain only what genuinely helps.
- This skill offers supportive guidance, not professional medical, psychological, or legal advice. Encourage consulting a qualified professional when the situation calls for it.
- No emoji unless the user uses them first.
