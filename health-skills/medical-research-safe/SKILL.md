---
name: medical-research-safe
description: Résume prudemment des articles, recommandations ou contenus médicaux. À utiliser quand l'utilisateur demande une synthèse scientifique, une revue rapide, ou veut comprendre des informations de santé trouvées en ligne. Se déclenche aussi avec "j'ai lu que…", "est-ce vrai que…", "résume cet article", "cette étude dit que…", ou toute demande d'explication de contenu médical/scientifique.
---

# Medical Research Safe

Skill de synthèse prudente de contenu médical ou scientifique. Objectif : donner du recul critique sur une source, pas jouer au médecin.

---

## Étape 1 — Identifier la nature de la demande

Avant toute synthèse, clarifier mentalement ce que l'utilisateur apporte :

| Type d'entrée | Exemples | Approche adaptée |
|---|---|---|
| Titre seul (sans contenu) | "j'ai vu un article sur la mélatonine et le cancer" | Demander le lien ou le résumé |
| Résumé / abstract | Texte collé, PDF | Analyser directement |
| Claim de réseau social | "j'ai lu que le curcuma guérit le cancer" | Recadrer + vérifier la source primaire |
| Recommandation officielle | HAS, OMS, Cochrane, NICE | Résumer fidèlement + dater la version |

Si le contenu est insuffisant pour une analyse rigoureuse, demander la source primaire avant d'aller plus loin.

---

## Étape 2 — Reformulation en langage accessible

- Résumer l'affirmation principale en une phrase simple.
- Remplacer le jargon médical par des termes compréhensibles, avec le terme technique entre parenthèses si utile.
- Préciser le contexte de publication : qui a produit ce contenu, quand, dans quel cadre.

**Exemple de reformulation :**
> "Cette étude (publiée en 2023 dans une revue à comité de lecture) examine si la molécule X réduit l'inflammation chez des adultes atteints de polyarthrite rhumatoïde."

---

## Étape 3 — Grille de lecture critique

Évaluer la solidité de la source selon ces critères :

### 3a. Type d'étude (du plus faible au plus solide)
1. Témoignage / anecdote
2. Étude sur des cellules ou des animaux
3. Étude observationnelle (cohorte, cas-témoins)
4. Essai clinique randomisé (ECR) — standard or
5. Méta-analyse / revue systématique (ex. Cochrane)

### 3b. Qualité de la preuve
- Taille de l'échantillon : N < 50 = prudence extrême
- Durée de suivi : résultats à court terme ≠ effets chroniques
- Groupe contrôle : y a-t-il un placebo ou un comparateur actif ?
- Conflits d'intérêts déclarés ? (financement industriel = signal d'alerte)
- Réplication : une seule étude ou convergence de plusieurs ?
- Peer-review : revue à comité de lecture ou preprint non relu ?

### 3c. Signaux d'alarme à mentionner explicitement
- Résultats non répliqués
- Échantillon < 100 personnes pour une affirmation forte
- Étude sur des modèles animaux présentée comme applicable aux humains
- Titre ou résumé qui ne correspondent pas aux données brutes
- Source commerciale qui vend le produit testé

---

## Étape 4 — Classement par niveau de certitude

Structurer la réponse en blocs explicites :

**Faits établis**
Ce que le consensus scientifique et les recommandations officielles affirment. Citer les organismes (HAS, OMS, NICE, Cochrane, sociétés savantes).

**Résultats prometteurs mais non confirmés**
Études préliminaires, ECR de petite taille, résultats isolés. Préciser ce qui manque pour valider.

**Points encore débattus**
Désaccords entre experts ou études contradictoires. Décrire les deux camps sans trancher arbitrairement.

**Limites identifiées**
Biais de sélection, financement douteux, absence de réplication, généralisabilité discutable.

---

## Étape 5 — Comparaison multi-sources (si plusieurs entrées)

Si l'utilisateur fournit plusieurs articles ou affirmations :

- Lister les points de convergence (renforcent la fiabilité)
- Lister les divergences (et expliquer pourquoi elles existent si possible : populations différentes, dosages, durées, critères de sélection)
- Attribuer un poids relatif à chaque source selon la grille étape 3

---

## Étape 6 — Conclusion structurée

### Ce qu'on peut retenir avec confiance
Points solidement étayés, utiles à comprendre.

### Ce qu'il ne faut pas surinterpréter
Conclusions hâtives, extrapolations injustifiées, affirmations qui dépassent les données.

### Ce qu'un professionnel devra valider
Toute application à une situation personnelle, tout changement de traitement, tout signe clinique évoqué.

---

## Garde-fous — Anti-patterns stricts

**Ne jamais faire :**
- Donner un diagnostic, même partiel ou conditionnel
- Recommander un arrêt ou une modification de traitement
- Confirmer ou infirmer un symptôme décrit par l'utilisateur
- Présenter une étude préliminaire comme une vérité établie
- Minimiser l'inquiétude de l'utilisateur sans l'orienter vers un professionnel

**Formulations à éviter :**
- "Vous avez probablement…"
- "Cette étude montre que vous devriez…"
- "Ce n'est pas grave, c'est juste…"
- "La plupart des médecins recommandent X" (sans source officielle datée)

**Reformulations sûres :**
- "Cette étude suggère que, dans ce contexte précis, X pourrait être associé à Y."
- "Selon les recommandations de [organisme] datées de [année], …"
- "Ces résultats sont préliminaires et n'ont pas encore été confirmés à grande échelle."

---

## Bonnes pratiques 2026

- Vérifier si une revue Cochrane ou un consensus HAS/OMS plus récent existe avant de s'appuyer sur un article isolé.
- Mentionner la date de publication : les recommandations médicales évoluent rapidement (ex. nutrition, Covid, oncologie).
- Pour les sujets sensibles (cancers, maladies rares, psychiatrie), rediriger systématiquement vers des associations patients reconnues.
- Face à un contenu généré par IA présenté comme médical, le signaler explicitement.
- Sources fiables à citer en priorité : Cochrane Library, PubMed/MEDLINE, HAS (France), OMS, NICE (UK), UpToDate (si accès cité par l'utilisateur).

---

## Rappel obligatoire (à inclure dans chaque réponse)

> Cette synthèse est informative et simplifiée. Elle ne constitue pas un avis médical. Chaque situation personnelle est unique : discutez de ces informations avec votre médecin ou professionnel de santé avant d'en tirer des conclusions ou de modifier vos habitudes.
