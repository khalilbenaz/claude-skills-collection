---
name: arabic-darija-translator
description: Traduction et adaptation entre français/anglais et darija marocaine, avec prise en compte du contexte culturel, des variantes régionales et du registre. Se déclenche avec "darija", "الدارجة", "marocain", "traduire en darija", "dialecte marocain".
---

# Darija Translator

## Workflow en étapes

### 1. Identifier la direction et le registre

| Direction | Exemples déclencheurs |
|---|---|
| FR/EN → Darija | "comment dit-on X en darija ?", "traduis en marocain" |
| Darija → FR/EN | "qu'est-ce que ça veut dire X", "c'est quoi X en français" |
| Darija → Darija | normalisation registre, correction |

**Registre à demander ou inférer du contexte :**
- `formel` — courriers admin, prise de parole officielle
- `courant` — conversation quotidienne, WhatsApp famille/collègues
- `familier` — entre amis proches, jeunes, code-switching FR+darija
- `technique` — métier (santé, droit, informatique, finance)

### 2. Conventions de translittération (système numérique marocain)

| Lettre arabe | Code Latin | Exemple |
|---|---|---|
| ع | 3 | 3andek = عندك (tu as) |
| ح | 7 | 7it = حيت (parce que) |
| خ | 5 ou kh | 5obz / khobz = خبز (pain) |
| ق | 9 | 9al = قال (il a dit) |
| غ | 8 ou gh | 8alyan / ghalyan = غالي (cher) |
| ش | ch | chkon = شكون (qui) |
| ج | j | juj = جوج (deux) |

> Les deux conventions (5/kh, 8/gh) coexistent — préciser ou utiliser la plus lisible selon l'audience.

### 3. Format de sortie systématique

Pour chaque traduction, fournir **les trois lignes** :

```
[Écriture arabe]  : كيداير؟
[Translittération]: Ki dayr?
[Prononciation]   : /ki dɛr/   ← si demandé ou ambiguïté
[FR/EN]          : Comment tu vas ? (familier)
```

Exemple complet — "Bonjour, comment allez-vous ?" (formel) :

```
الدارجة (arabe)  : لباس عليكم؟
Translittération : L-bas 3likoum?
Français         : Vous allez bien ? / Bonjour, comment allez-vous ?
Note             : formule polie, variante féminine inchangée
```

### 4. Adaptation culturelle (pas de traduction mot à mot)

Critères de décision :
- L'expression source a-t-elle un **équivalent idiomatique** en darija ? → utiliser cet équivalent, pas une calque littérale.
- Y a-t-il une **connotation religieuse** implicite ? → intégrer naturellement (inchallah, hamdullah, bslama…) si le registre le permet.
- Le contexte est-il **code-switching** FR+darija ? → reproduire le même mélange dans la sortie.

Exemples :

| Source | Mauvais (littéral) | Correct (idiomatique) |
|---|---|---|
| "Il pleut des cordes" | كيتيح الحبال | الله كيصب |
| "Casser les pieds" | كسر الرجلين | دير في الراس |
| "Bonne chance" | شانس مزيان | الله يعاون |

### 5. Signaler les variantes régionales

Mentionner la variante quand elle diffère notablement :

```
Mot : "voiture"
- Standard/Casa : tomobil / ṭomobil (طوموبيل)
- Fès/Meknès   : karossa (كاروصة) [vieilli]
- Commun écrit : سيارة (arabe standard, compris partout)
Recommandation : utiliser "tomobil" sauf contexte formel.
```

Régions à distinguer : **Casa/Rabat** (darija de référence), **Fès/Meknès**, **Marrakech/Sud**, **Nord/Rif** (influence rifaine), **Souss** (influence amazighe forte).

### 6. Gestion du code-switching FR/Darija

La darija urbaine mélange fréquemment français et arabe. Reproduire le registre :

```
Source (FR)     : "On se retrouve au bureau à 9h ?"
Darija familier : "Ntlaqa f-bureau m3ak f-tis3a ?"
                   نتلاقاو فالبيرو معاك فتسعة؟
Note            : "bureau", "neuf" souvent gardés en français à l'oral.
```

### 7. Validation et itération

- Proposer 2 niveaux de registre quand le contexte est ambigu (ex. : courant + familier).
- Signaler explicitement quand une expression n'a pas d'équivalent direct → donner la périphrase la plus naturelle.
- Demander confirmation si le sens est potentiellement sensible (humour, ironie, argot fort).

---

## Garde-fous et anti-patterns

### Ne pas confondre avec
- **Arabe standard (MSA/فصحى)** — darija ≠ MSA ; ne pas produire du MSA quand darija est demandée.
- **Dialectes voisins** — algérien (dz), tunisien, égyptien : similaires mais distincts. Signaler toute confusion possible.
- **Amazigh/Tamazight** — distinct ; certains mots darija en sont empruntés (ex. : "azul" = bonjour en amazigh, parfois utilisé au Maroc mais pas darija native).

### Pièges courants

| Piège | Exemple | Correction |
|---|---|---|
| Translittération incohérente | mélanger 5 et kh dans le même texte | choisir une convention et la tenir |
| Calque syntaxique du français | "je suis allé à" → ana mchit l (correct) vs *"ana kont rayer l"* | vérifier l'ordre VSO/SVO darija |
| Oublier l'accord de genre | "mzyan" (masc.) vs "mzyana" (fém.) | accorder systématiquement |
| Ignorer la négation double | pas de "ne" isolé → "ma-kaydirch" pas "*la kaydير*" | toujours ma-…-ch |
| Écriture arabe sans harakat | ambiguïté de lecture pour les non-natifs | ajouter la translittération latine systématiquement |

### Bonnes pratiques 2026
- Pour un usage **UI/app** : privilégier la translittération latine (meilleure compatibilité clavier), proposer l'arabe en secondaire.
- Pour un usage **contenu social/marketing** : écriture arabe en priorité, translittération en sous-titre.
- Pour **chatbots/NLP** : indiquer que les modèles traitant le darija sont encore limités ; conseiller de normaliser vers l'arabe ou le français avant tout pipeline NLP.
- Toujours mentionner si un terme est **emprunté au français** (très fréquent : "l-fridge", "le portable", "le bureau") vs terme arabe natif — le choix dépend du registre cible.


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
