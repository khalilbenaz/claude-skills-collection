---
name: writing-blog-post-writer
description: Structure et rédige un article de blog optimisé et engageant. À utiliser quand l'utilisateur veut écrire un article, un post ou du contenu long format. Se déclenche aussi avec "écrire un article", "blog post", "rédiger un article", "contenu pour mon blog", "article de blog". Also triggers on "write a blog post", "article outline", "blog content".
---

# Blog Post Writer

## Étape 0 — Brief (obligatoire avant de rédiger)

Collecte ces informations avant de produire quoi que ce soit :

| Info | Question directe |
|---|---|
| Sujet | De quoi parle l'article exactement ? |
| Audience | Qui lit ? (dev senior, décideur, débutant, non-tech…) |
| Objectif | Informer / convaincre / générer des leads / fidéliser |
| Ton | Formel, neutre, casual, technique, humoristique |
| Longueur cible | Court (600-900 mots), moyen (1 000-1 800), long (2 000+) |
| Plateforme | Blog perso, Medium, LinkedIn, doc interne, newsletter |
| SEO | Mot-clé principal visé ? Oui/non |

Si l'utilisateur fournit déjà toutes ces infos, passe directement à l'Étape 1.

---

## Étape 1 — Choix d'angle (3 options)

Propose 3 angles distincts avant de rédiger. Exemples pour le sujet "Git rebase" :

1. **Pédagogique** : "Rebase vs Merge : quand utiliser lequel et pourquoi ton équipe se trompe"
2. **Récit** : "J'ai cassé la branche main en production — voilà ce que le rebase m'a appris"
3. **Référence** : "Cheatsheet rebase interactif : 8 commandes que tout dev devrait maîtriser"

Critères de sélection :
- Audience novice → angle pédagogique ou récit
- Audience experte → angle référence ou opinion tranchée
- Objectif SEO fort → angle qui colle exactement à l'intention de recherche (informationnelle, comparaison, how-to)

---

## Étape 2 — Structure standard

```
TITRE (3 options A/B/C)
  → Format : [Chiffre] + [Bénéfice concret] | Question | "Comment [faire X] sans [problème Y]"

INTRODUCTION (150-200 mots)
  → Hook    : stat choc, anecdote, question directe, constat contre-intuitif
  → Contexte : pourquoi ce sujet maintenant
  → Promesse : ce que le lecteur sait/peut faire à la fin

CORPS
  → H2 : Section principale (250-400 mots chacune)
     → H3 : sous-point si besoin
     → Exemples concrets, code, captures, listes

CONCLUSION (100-150 mots)
  → Synthèse en 2-3 phrases
  → CTA unique et clair

META-DESCRIPTION (150-160 caractères)
  → Mot-clé principal en début, bénéfice, verbe d'action
```

---

## Étape 3 — Rédaction

### Règles de rédaction par ton

**Technique/dev** :
- Phrase courte (max 20 mots), voix active
- Code dans des blocs fencés avec langage précisé
- Évite le vocabulaire marketing ("révolutionnaire", "disruptif")
- Exemple concret > définition abstraite

**Professionnel/B2B** :
- Commence par le problème métier, pas la solution
- Données chiffrées avec source entre parenthèses : `(McKinsey, 2025)`
- CTA = démo, téléchargement, prise de RDV

**Casual/grand public** :
- Tutoie si la plateforme le permet (Medium, blog perso)
- Analogies du quotidien pour les concepts abstraits
- Paragraphes courts (3-4 lignes max)

### Longueur recommandée par objectif

| Objectif | Longueur | Format dominant |
|---|---|---|
| SEO organique | 1 500-2 500 mots | H2/H3 + listes |
| Partage réseaux | 600-900 mots | Récit + une idée forte |
| Newsletter | 400-700 mots | Paragraphes denses |
| Documentation | 800-2 000 mots | Blocs de code + tableaux |

---

## Étape 4 — SEO (si demandé)

1. **Mot-clé principal** : présent dans le H1, dans les 100 premiers mots, dans la méta-description.
2. **Mots-clés secondaires** : 3-5 variantes sémantiques réparties naturellement dans le corps.
3. **Slug** : court, tirets, sans stopwords — ex. `/git-rebase-interactif-guide`
4. **Balises alt** : décrire les images avec le mot-clé si pertinent.
5. **Liens internes** : pointer vers 2-3 articles existants du même domaine.

Méta-description type :
```
Découvrez comment [faire X] sans [problème Y]. Guide complet avec exemples et [bonus] — [site name].
```

---

## Étape 5 — Checklist de livraison

Avant de livrer l'article, valider :

- [ ] Titre : accrocheur, pas clickbait vide, mot-clé présent si SEO
- [ ] Hook : les 3 premières lignes donnent envie de continuer
- [ ] Promesse tenue : tout ce qui est annoncé en intro est traité
- [ ] Exemples : au moins un exemple concret par section principale
- [ ] CTA : un seul, clair, en fin d'article
- [ ] Longueur : dans la cible fixée (±10 %)
- [ ] Lisibilité : pas de paragraphe > 5 lignes, listes si > 3 items
- [ ] Méta-description : rédigée et dans les 160 caractères

---

## Anti-patterns à éviter

| Anti-pattern | Correction |
|---|---|
| Introduction de 400 mots avant le sujet | Hook + contexte en 2 paragraphes max |
| Un seul titre proposé | Toujours 3 options testables |
| Conclusion = copie de l'introduction | Synthèse + projection ou CTA concret |
| Remplissage ("Il est important de noter que…") | Supprimer ; aller directement au fait |
| SEO forcé (répétition mécanique du mot-clé) | Synonymes, reformulations naturelles |
| Listes à puces pour tout | Garder les listes pour les énumérations > 3 items |
| CTA multiple ("abonne-toi, partage, commente, achète") | Un seul CTA prioritaire par article |

---

## Bonnes pratiques 2026

- **GEO (Generative Engine Optimization)** : structurer pour que les LLMs citent l'article — définitions claires, réponses directes en début de section, format Q&A pour les points clés.
- **Contenu E-E-A-T** : afficher l'auteur, la date, les sources — les moteurs pénalisent le contenu anonyme sans expertise démontrée.
- **Multiformat natif** : prévoir une adaptation LinkedIn (1 200 caractères) ou newsletter en même temps que l'article principal.
- **Longueur utile > longueur totale** : un article de 800 mots dense surperforme un article de 2 000 mots dilué.


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
