---
name: local-phrase-book
description: Génère un mini guide de phrases essentielles dans la langue locale d'une destination. Se déclenche aussi avec "phrases utiles en", "comment dire en", "vocabulaire voyage", "expressions locales", ou toute demande de vocabulaire de voyage. Also triggers on "useful phrases", "basic local language", "phrasebook for my trip".
---

# Local Phrase Book

## Workflow

### Étape 1 — Collecter le contexte

Demander (ou inférer du message) :

- **Destination** : pays + ville si pertinent (ex : Japon / Tokyo vs Osaka = même langue, mais dialecte différent)
- **Langue cible** : si plusieurs langues coexistent (ex : Maroc → darija, français, amazigh), préciser laquelle est utile en pratique
- **Niveau actuel** : zéro / quelques mots / conversationnel → calibre la densité du guide
- **Durée et type de voyage** : backpacker solo, famille, voyage d'affaires → adapte les catégories prioritaires
- **Contraintes spéciales** : régime alimentaire, handicap, voyage avec enfants → phrases ciblées

Critère de décision — si la destination est anglophone (UK, Australie, etc.) : proposer des expressions d'argot local plutôt qu'une traduction.

---

### Étape 2 — Sélectionner les catégories pertinentes

| Catégorie | Toujours incluse | Conditionnelle |
|-----------|-----------------|----------------|
| Bases (salutation, politesse) | ✅ | |
| Se déplacer (transports, directions) | ✅ | |
| Restauration & alimentation | ✅ | |
| Urgences & santé | ✅ | |
| Shopping & prix | | voyage loisir / backpacker |
| Hébergement | | séjour > 3 jours |
| Affaires & réunions | | voyage pro |
| Enfants & familles | | voyage en famille |
| Régimes alimentaires | | si contrainte détectée |

Ne pas surcharger : **max 8-10 phrases par catégorie**, les plus actionnables en priorité.

---

### Étape 3 — Générer le guide en tableau

Format standard — une ligne par phrase :

```
| Français | Langue locale | Prononciation approx. | Niveau urgence |
|----------|--------------|----------------------|----------------|
| Où sont les toilettes ? | 어디에 화장실이 있어요? | Eodi-e hwajangshil-i isseoyo? | 🔴 Critique |
| L'addition, s'il vous plaît | 계산서 주세요 | Gyesan-seo juseyo | 🟡 Important |
| Merci | 감사합니다 | Gamsahamnida | 🟢 Utile |
```

Niveaux d'urgence :
- 🔴 **Critique** : urgences, santé, se perdre
- 🟡 **Important** : paiement, transport, commande
- 🟢 **Utile** : politesse, social, confort

Règles de prononciation :
- Simplifier au maximum pour un locuteur francophone : `th` anglais → `d` ou `z`, tons mandarin notés avec accent (mā, má, mǎ, mà)
- Pour les langues à tons ou script non-latin : ajouter une colonne translittération + la phrase en script natif (pour montrer à un local)
- Pour l'arabe/hébreu : toujours inclure l'écriture native, essentielle pour pointer du doigt

---

### Étape 4 — Ajouter les notes culturelles critiques

Structurer en trois sous-sections :

**Gestes et coutumes**
- Ex : en Thaïlande, toucher la tête d'un inconnu est offensant ; pointer du doigt est impoli au Moyen-Orient
- Ex : en Japon, parler fort dans les transports est mal vu, souffler le nez en public aussi

**Faux-amis et pièges linguistiques**
- Ex : "embarazada" en espagnol = enceinte (pas "embarrassée")
- Ex : "gift" en allemand = poison
- Mentionner si le "non" peut être exprimé par silence ou détournement du regard (Japon, Corée)

**Registres et politesse**
- Signaler si la langue a un registre formel obligatoire avec inconnus (coréen, japonais, thaï, javanais)
- Indiquer si le vouvoiement change la conjugaison (espagnol usted, arabe, allemand Sie)
- Tipping culture : commun / rare / offensant selon pays

---

### Étape 5 — Bonus situationnel (si niveau zéro ou voyage imminent)

Générer une **carte de survie imprimable** : 5-7 phrases absolument critiques, police grande, avec script natif — destinée à être montrée à un local.

Exemple pour le Japon :

```
🆘 CARTE DE SURVIE — Japon

Hôpital → 病院 (Byōin)
Police → 警察 (Keisatsu)
Je suis perdu → 迷子になりました (Maigo ni narimashita)
Appelez une ambulance → 救急車を呼んでください (Kyūkyūsha o yonde kudasai)
Je suis allergique à [X] → [X]アレルギーがあります ([X] arerugī ga arimasu)
```

---

## Anti-patterns — Ce qu'il ne faut pas faire

- **Ne pas translittérer phonétiquement sans le script natif** : le voyageur ne pourra pas montrer le mot à un local qui ne lit pas le latin
- **Ne pas surcharger avec 50 phrases** : au-delà de 40-50 phrases, le guide n'est plus utilisable en situation réelle
- **Ne pas ignorer le registre** : donner la forme trop familière pour une langue à niveaux (japonais, coréen) peut être perçu comme irrespectueux
- **Ne pas inventer la prononciation** : si incertain, indiquer "à vérifier" plutôt que de donner une approximation trompeuse
- **Ne pas oublier les phrases d'incompréhension** : "Je ne comprends pas", "Pouvez-vous répéter lentement ?" sont souvent les plus utiles

---

## Bonnes pratiques 2026

- Recommander **Google Translate mode appareil photo** (scan de menus) et **mode hors-ligne** (télécharger la langue avant départ)
- Signaler si **Duolingo / Pimsleur** a un cours court adapté (langues populaires)
- Pour les pays à faible connectivité : suggérer l'app **iTranslate** ou **SayHi** en cache local
- Mentionner **Papago** pour coréen/japonais/chinois (meilleure que Google Translate sur ces langues en 2026)
- Si le voyage inclut des zones rurales : les phrases en script natif sont encore plus critiques que la translittération latine
