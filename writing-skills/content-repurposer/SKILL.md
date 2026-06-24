---
name: content-repurposer
description: Transforme un contenu existant en plusieurs formats adaptés à différentes plateformes. À utiliser quand l'utilisateur veut recycler un article, une vidéo ou un podcast en posts sociaux, threads, newsletters, etc. Se déclenche aussi avec "transformer en post", "recycler mon contenu", "adapter pour LinkedIn", "thread Twitter", "résumé pour Instagram".
---

# Content Repurposer

## Workflow en étapes

### Étape 1 — Analyser le contenu source

Demander ou identifier :
- **Type** : article, vidéo, podcast, rapport, thread, README…
- **Points clés** : 3 à 7 idées/insights maîtres (liste bulleted)
- **Audience originale** vs audience cible (elles peuvent différer)
- **Objectif** : notoriété, trafic, lead gen, engagement communautaire

Si le contenu est fourni en texte brut, l'extraire automatiquement sans attendre confirmation.

### Étape 2 — Sélectionner les formats cibles

Critères de décision :

| Plateforme | Choisir si… | Format idéal |
|---|---|---|
| LinkedIn | B2B, expertise, recrutement | Storytelling pro 800–1 300 car. |
| Twitter/X | Audience tech/media, viralité | Thread 5–12 tweets numérotés |
| Instagram | Visuel, grand public, brand | Carousel 5–10 slides ou caption |
| Newsletter | Base existante, nurturing | 200–400 mots + CTA unique |
| TikTok/Reels | Démonstration, jeune audience | Script 30–60 s, sous-titres |
| Blog SEO | Trafic organique long terme | 800–1 500 mots, H2/H3, meta |
| Podcast teaser | Audio-first, communauté | Script 90–120 s, crochet oral |

Demander la liste des plateformes si non précisée ; en déduire 2–3 pertinentes selon le contexte si l'utilisateur ne sait pas.

### Étape 3 — Produire chaque format

Générer **un bloc délimité par plateforme**. Chaque bloc est autonome (lisible sans connaître l'original).

#### LinkedIn — template

```
[HOOK : question, stat ou fait surprenant — 1 ligne]

[Corps storytelling : situation → problème → solution → résultat]
— Point 1
— Point 2
— Point 3

[Leçon ou call-to-action]
[3–5 hashtags de niche, pas génériques]
```

Limites : 1 300 caractères (post) / 3 000 (article). Éviter les émojis excessifs en B2B.

#### Twitter/X — template thread

```
🧵 1/ [Hook : affirmation forte ou chiffre]

2/ [Développement point 1]

3/ [Développement point 2]

…

N/ [Conclusion + ressource ou CTA]
→ RT si utile | Follow pour la suite
```

Règle : tweet 1 = meilleur tweet du thread. Numéroter chaque tweet. Max 280 car/tweet.

#### Newsletter — template

```
Objet : [verbe d'action + bénéfice concret]

Bonjour [prénom],

[Accroche contextuelle — 1 phrase]

**Ce que vous devez retenir :**
- Point A
- Point B
- Point C

[Développement 100–200 mots max]

[CTA unique et cliquable]

À bientôt,
[Signature]
```

#### Instagram caption — template

```
[Hook emoji + question ou stat]

[Corps 3–5 lignes, aérées]

.
.
.
[CTA : "Sauvegarde ce post" / "Tague un ami qui…"]
[20–30 hashtags en commentaire, pas dans la caption]
```

#### Script TikTok/Reels

```
[0–3 s] Hook visuel + voix : "Si tu [problème], regarde ça."
[3–20 s] Contexte express (pas plus de 2 phrases)
[20–50 s] Solution en 3 étapes max (texte à l'écran)
[50–60 s] Résultat + CTA : "Suis pour la suite" / "Lien en bio"
```

### Étape 4 — Vérification de cohérence

Avant de livrer, s'assurer que :
- [ ] Chaque format fonctionne seul (indépendance totale)
- [ ] Le message central est identique dans tous les formats
- [ ] Le ton est adapté à chaque plateforme (pro, conversationnel, punchy…)
- [ ] Les limites techniques sont respectées (caractères, durée, slides)
- [ ] Aucun lien brisé ou placeholder [XXX] non rempli

---

## Exemples concrets

### Article → LinkedIn + Thread

**Source :** "5 erreurs courantes en CI/CD qui ralentissent les déploiements"

**LinkedIn :**
> J'ai analysé 40 pipelines en 6 mois. Voici l'erreur n°1 qui coûte le plus de temps…
> — Pas de cache des layers Docker → rebuild complet à chaque commit
> — Tests unitaires lancés en séquentiel → 18 min vs 4 min en parallèle
> …
> Ce que je retiens : 80 % du temps perdu vient de 2 réglages, pas de la complexité du code.
> #DevOps #CI #Engineering

**Thread X :**
> 🧵 1/ 40 pipelines analysés. 5 erreurs reviennent toujours. Voici lesquelles (et comment les corriger) :
> 2/ Erreur n°1 : layers Docker non cachés. Chaque commit = rebuild complet. Fix : `COPY package*.json ./` avant `COPY . .`
> …

---

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Copier-coller le même texte sur toutes les plateformes | Pénalité algorithme, audience décrochée | Adapter ton + format à chaque plateforme |
| Thread Twitter de 20 tweets | Perte d'audience après tweet 5 | Max 10 tweets ; couper si besoin en deux threads |
| Caption Instagram > 150 caractères avant le "…" | Texte tronqué, hook perdu | Hook dans les 2 premières lignes |
| Newsletter sans CTA unique | Taux de clic dilué | 1 seul lien cliquable par email |
| Hashtags génériques (#marketing, #business) | Noyer dans le flux | Hashtags de niche avec 50k–500k posts |
| Ignorer le fuseau horaire de publication | Portée réduite | LinkedIn : mar–jeu 8h–10h ; Twitter : 12h–15h |
| Republier sans adapter l'actualité | Contenu perçu comme vieux | Ajouter un angle "ce que cela change en 2026" |

## Bonnes pratiques 2026

- **Recycler ≠ copier** : chaque format doit apporter une valeur différente (exemples exclusifs, angle complémentaire).
- **Atomic content** : un post = une idée. Ne pas tout mettre.
- **Hook first** : les 3 premières secondes/mots décident de tout. Rédiger le hook en dernier, une fois le corps finalisé.
- **Repurposing vertical** : transformer un long-form (article) en micro-formats est plus efficace que l'inverse.
- **Format natif** : chaque plateforme pénalise les liens sortants dans le feed. Privilégier le contenu natif ; mettre les liens en commentaire ou en bio.
- **Cadence** : espacer les publications de 48 h minimum sur des plateformes différentes pour un même contenu (éviter la perception de spam cross-plateforme par l'audience commune).
