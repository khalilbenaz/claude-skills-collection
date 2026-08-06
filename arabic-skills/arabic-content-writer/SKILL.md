---
name: arabic-content-writer
description: Rédaction de contenu en arabe standard moderne (MSA) avec adaptation culturelle pour le public arabophone. Se déclenche avec "arabe", "العربية", "contenu arabe", "rédaction arabe", "arabic content". Also triggers on "write in Arabic", "Arabic copywriting", "MSA content".
---

# Arabic Content Writer

## Workflow en étapes

### 1. Briefing — collecter les paramètres obligatoires

Avant d'écrire la moindre ligne, obtenir :

| Paramètre | Valeurs possibles |
|---|---|
| Type de contenu | article de blog, page web, post réseaux sociaux, email marketing, doc technique, contrat |
| Public cible (région) | Maghreb (Maroc, Algérie, Tunisie), Machrek (Liban, Syrie, Égypte), Golfe (KSA, UAE, Qatar), Pan-arabe |
| Registre | MSA formelle, MSA web (simplifiée), dialecte (Darija, Égyptien, Khaliji) |
| Objectif | informer, convertir, fidéliser, SEO |
| Contraintes | longueur, mots-clés imposés, charte graphique, ton (institutionnel/décontracté) |

Si un paramètre manque et influence le rendu, poser la question avant de rédiger.

---

### 2. Choix du registre — critères de décision

```
Type de contenu          → Registre recommandé
─────────────────────────────────────────────────
Article de fond / presse → MSA formelle (فصحى)
Page web produit / SaaS  → MSA simplifiée (accessible)
Post Instagram/TikTok    → Dialecte local OU MSA légère + emojis
Email marketing Golfe    → MSA + quelques formules locales (جزاكم الله)
Documentation technique  → MSA + termes EN entre parenthèses
Contrat / juridique      → MSA formelle stricte, zéro dialecte
```

**Règle rapide :** si le contenu sera lu dans plusieurs pays arabes simultanément → MSA obligatoire. Si cible mono-pays et ton conversationnel → dialecte possible.

---

### 3. Rédaction — pratiques concrètes

**Typographie arabe obligatoire**

```
Guillemets       : « » (et non " " ni ' ')
Virgule arabe    : ، (U+060C) — pas la virgule latine ,
Point-virgule    : ؛ (U+061B)
Point            : . ou . selon le style choisi (cohérence obligatoire)
Pourcentage      : ٪ (U+066A) dans contexte formel, % acceptable en web
Chiffres         : arabes-orientaux (١٢٣) pour texte formel ; indo-arabes (123) pour web/tech
```

**Tachkil (voyelles diacritiques)**

Ajouter le tachkil **uniquement** sur :
- Les mots à lecture ambiguë (كَتَبَ vs كُتُب)
- Les titres et accroches importants
- Les textes destinés à l'éducation ou à l'apprentissage

Ne pas tachkil l'intégralité du texte web → charge visuelle inutile.

**Exemples de formules d'ouverture par registre**

```
MSA formelle   : يسعدنا أن نقدّم لكم...
MSA web        : نقدّم لك اليوم...
Golfe informel : نبشّركم بـ...
Maghreb web    : راه عندنا... (Darija — Maroc uniquement)
```

---

### 4. Adaptation culturelle — points d'attention région par région

| Région | À faire | À éviter |
|---|---|---|
| Golfe (KSA/UAE) | Formules islamiques (بسم الله), respect du ramadan | Références à l'alcool, images mixité |
| Égypte | Humour subtil acceptable, dialecte égyptien large compréhension | MSA trop rigide = perçue comme froide |
| Maghreb | Français tolerable entre parenthèses pour termes tech | Dialecte Khaliji mal compris |
| Pan-arabe | Neutralité régionale, pas de références politiques locales | Termes spécifiques à une région |

---

### 5. SEO en arabe — procédure

1. **Recherche mots-clés** : toujours chercher avec et sans voyelles, et avec les variantes orthographiques (`تسويق إلكتروني` vs `التسويق الإلكتروني` vs `تسويق الكتروني`).
2. **Balises HTML RTL** :
```html
<html lang="ar" dir="rtl">
<meta charset="UTF-8">
<title>عنوان الصفحة | اسم الموقع</title>
<meta name="description" content="وصف موجز لا يتجاوز 160 حرفاً">
```
3. **URL slugs** : préférer les slugs en translittération latine (`/seo-arabique/`) plutôt qu'en arabe encodé (évite `%D8%B9%D8%B1%D8%A8%D9%8A`).
4. **Densité mots-clés** : entre 1 et 2 % — le moteur Google Arabic est sensible à la suroptimisation.

---

### 6. Vérification linguistique — checklist

- [ ] Accord genre (masculin/féminin) sur **tous** les adjectifs et verbes
- [ ] Duel (المثنى) utilisé correctement quand quantité = 2
- [ ] Pluriel sain vs pluriel brisé cohérent avec le registre
- [ ] Cohérence des termes techniques (choisir une traduction et s'y tenir)
- [ ] Ponctuation arabe (voir §3) appliquée partout
- [ ] Aucun mot laissé en translittération non justifiée

---

### 7. Mise en forme RTL — validations finales

**Polices recommandées (Google Fonts, 2026)**

```css
/* Priorité 1 — lisibilité web */
font-family: 'Noto Sans Arabic', 'Cairo', sans-serif;

/* Priorité 2 — contenu éditorial / presse */
font-family: 'Lateef', 'Amiri', serif;

/* Toujours ajouter */
direction: rtl;
text-align: right;
```

**Tailles minimales lisibles** : 16 px body, 14 px légendes — l'arabe est moins lisible que le latin à petite taille.

**Tester sur** : Chrome/Android + Safari/iOS + Firefox ; vérifier que les listes (`<ul>`, `<ol>`) et les tableaux inversent bien leur direction.

---

## Garde-fous / Anti-patterns

| Anti-pattern | Problème | Correction |
|---|---|---|
| Traduction automatique brute (DeepL/Google) sans révision | Calques syntaxiques, faux-amis, registre inadapté | Toujours réviser et humaniser |
| Mélange de dialectes dans un même texte | Confusion, perception d'amateurisme | Un seul registre par document |
| Utiliser la virgule latine `,` dans un texte arabe | Bris de style, possible confusion de sens | Remplacer par `،` |
| Ignorer le genre grammatical en arabe | Fautes manifestes perçues immédiatement | Systématiser la vérification genre |
| Slugs URL en arabe encodé | URLs illisibles, partages cassés | Slugs en latin translittéré |
| Texte non testé en mobile RTL | Débordements, troncatures, liste LTR | Test obligatoire sur viewport 375 px |
| Tachkil intégral sur contenu web | Surcharge visuelle, ralentissement lecture | Tachkil sélectif uniquement |

---

## Bonnes pratiques 2026

- **LLM pour brouillon, humain pour finalisation** : les modèles génèrent un MSA correct mais manquent parfois des nuances dialectales. Toujours faire relire par un locuteur natif de la région cible pour les campagnes marketing.
- **Accessibilité** : les lecteurs d'écran arabes (JAWS, NVDA + clavier RTL) nécessitent `lang="ar"` sur chaque bloc de contenu arabophone dans une page bilingue.
- **Contenu mixte AR/FR** : baliser explicitement les parties :
```html
<span lang="ar" dir="rtl">النص العربي</span>
<span lang="fr" dir="ltr">le texte français</span>
```
- **Cohérence terminologique** : tenir un glossaire projet (terme FR → terme AR validé) pour les projets longs ; éviter les synonymes non contrôlés.
