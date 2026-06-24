---
name: regex-builder
description: Construit, explique et teste des expressions régulières pas à pas. À utiliser quand l'utilisateur a besoin d'une regex ou veut comprendre une regex existante. Se déclenche aussi avec "regex", "expression régulière", "pattern matching", "comment matcher", "valider un email", ou toute demande impliquant du pattern matching.
---

# Regex Builder

## Étape 1 — Cadrage rapide

Avant d'écrire quoi que ce soit, collecter :

| Question | Pourquoi |
|----------|----------|
| Exemples **valides** (≥3) | Définir le périmètre positif |
| Exemples **invalides** (≥3) | Éviter les faux positifs |
| **Langage** cible | Dialecte regex différent (PCRE, RE2, Java…) |
| **Opération** : validation / extraction / remplacement / split | Impact sur les groupes et flags |
| Données **unicode** ? Multilignes ? | Flags `u`, `s`, `m` à activer |

Si le besoin n'est pas précis, poser exactement ces questions — pas plus.

---

## Étape 2 — Choisir le bon dialecte

| Langage | Moteur | Particularités |
|---------|--------|----------------|
| Python `re` | PCRE-like | `(?P<name>…)` pour groupes nommés ; pas de lookbehind variable |
| Python `regex` (tiers) | PCRE2 | Lookbehind variable, Unicode complet |
| JavaScript | RE2-like | Pas de lookbehind avant ES2018 ; flag `v` (ES2024) pour sets |
| PHP `preg_*` | PCRE | `\K` reset match, lookbehind variable |
| Java | `java.util.regex` | `\p{L}` pour lettres Unicode, possessifs `++` |
| Go | RE2 | **Pas** de lookahead/lookbehind, pas de backreferences |
| .NET | .NET Regex | Groupes balancés `(?<n-m>)`, LINQ `Regex.Matches` |

> **Règle** : si le moteur est RE2 (Go, Rust `regex` crate), oublier lookahead et backreferences.

---

## Étape 3 — Construction par blocs

Construire **incrémentalement** : commencer par le cas le plus simple, ajouter la complexité.

### Briques de base

```
# Ancres
^           début de chaîne (ou de ligne avec /m)
$           fin de chaîne
\b          frontière de mot

# Classes
\d          [0-9]
\w          [a-zA-Z0-9_]
\s          espace, tab, newline
[a-z]       classe personnalisée
[^abc]      négation

# Quantificateurs
?           0 ou 1   (greedy)
*           0+       (greedy)
+           1+       (greedy)
{n,m}       entre n et m
?? *? +?    lazy (prend le moins possible)
?+ *+ ++    possessif (jamais backtrack) — PCRE uniquement

# Groupes
(abc)       groupe capturant
(?:abc)     groupe non-capturant  ← préférer si pas besoin de capture
(?<name>…)  groupe nommé
(?=…)       lookahead positif
(?!…)       lookahead négatif
(?<=…)      lookbehind positif
(?<!…)      lookbehind négatif
```

### Exemples concrets copiables

**Email simple (validation formulaire)**
```regex
^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$
```
- `[\w.+-]+` : partie locale (pas de vrai RFC 5321, suffisant pour 99 % des cas)
- Ne valide pas les TLD exotiques `.museum` → utiliser `{2,10}` si besoin

**Numéro de téléphone tunisien**
```regex
^(?:\+?216)?[2-9]\d{7}$
```
- Préfixe `+216` ou `216` optionnel
- 8 chiffres, premier entre 2 et 9

**UUID v4**
```regex
^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

**Extraction d'un montant (ex. `12 345,67 TND`)**
```regex
(\d{1,3}(?:[  ]\d{3})*(?:[,.]\d{2})?)(?:\s*(?:TND|EUR|USD))?
```

**Remplacement de variables `${VAR}` dans un template**
```python
import re
result = re.sub(r'\$\{(\w+)\}', lambda m: env.get(m.group(1), m.group(0)), template)
```

---

## Étape 4 — Table de tests systématique

Toujours présenter avec résultat attendu ET résultat réel :

| Entrée | Attendu | Match ? | Remarque |
|--------|---------|---------|----------|
| cas valide 1 | ✅ | | cas nominal |
| cas valide 2 | ✅ | | variante |
| cas limite | ✅/❌ | | edge case |
| cas invalide 1 | ❌ | | faux positif potentiel |

Commande de test rapide :

```bash
# Python
python3 -c "import re; pattern=r'^…$'; tests=['ok','ko']; [print(t, bool(re.fullmatch(pattern,t))) for t in tests]"

# Node.js
node -e "const r=/^…$/; ['ok','ko'].forEach(t=>console.log(t, r.test(t)))"

# grep (POSIX ERE)
echo "test_string" | grep -E '^…$'
```

---

## Étape 5 — Variantes et alternatives

Proposer systématiquement :

1. **Version stricte** : anchors `^…$`, pas de quantificateurs greedy larges
2. **Version extraction** : groupes nommés, pas d'anchors
3. **Alternative non-regex** : si la logique peut être plus claire avec du code

```python
# Préférer ça plutôt qu'une regex monstrueuse :
def is_valid_iban(s):
    s = s.replace(' ', '').upper()
    return len(s) >= 15 and s[:2].isalpha() and s[2:4].isdigit()
```

---

## Garde-fous et anti-patterns

### Pièges classiques

| Piège | Symptôme | Correction |
|-------|----------|------------|
| Greedy `.*` | Capture trop (jusqu'au dernier match) | Utiliser `.*?` (lazy) ou `[^X]+` |
| Oublier d'échapper `.` | `.` matche n'importe quel caractère | `\.` pour un point littéral |
| Backtracking catastrophique | Timeout / freeze sur longues chaînes | Éviter `(a+)+`, utiliser possessif ou atomic group |
| Négliger les flags | Case-sensitive par défaut | Ajouter `re.IGNORECASE` / `/i` explicitement |
| Backreference dans RE2/Go | Erreur runtime | Réécrire sans backreference |
| Valider un email avec RFC complète | Regex de 6 Ko, maintenable zéro | Valider format basique + vérifier MX côté serveur |
| `^` et `$` en multiline | Comportement différent avec flag `m` | Utiliser `\A` / `\Z` (Python) pour vrai début/fin de chaîne |

### Backtracking catastrophique — détection

```regex
# DANGEREUX — éviter
(a|aa)+$
(\w+\s?)+$

# SÛRS — préférer
\w+(\s\w+)*$
```

### Quand ne PAS utiliser une regex

- Parser du HTML/XML → utiliser un parser DOM (`BeautifulSoup`, `lxml`)
- Valider du JSON → `json.loads()` + schema
- Extraire des données de PDF → lib dédiée (`pdfplumber`)
- Logique avec état (imbrication arbitraire) → PEG parser ou grammaire formelle

---

## Bonnes pratiques 2026

- **Nommer les groupes** : `(?P<year>\d{4})` plutôt que `(\d{4})` — lisibilité et refactoring
- **Commenter** les regex longues avec le flag verbose (`re.VERBOSE` / `/x`) :

```python
pattern = re.compile(r"""
    ^                   # début
    (?P<country>\+?\d{1,3})?  # indicatif pays optionnel
    [\s\-.]?            # séparateur optionnel
    (?P<local>\d{8,10}) # numéro local
    $
""", re.VERBOSE)
```

- **Compiler** les regex réutilisées (`re.compile(...)`) — gain x5 sur boucles
- **Tester avec un outil visuel** : regex101.com (PCRE/JS/Python), regexr.com
- **Versionner** les regex critiques avec leurs cas de test dans le repo
- **Limiter la longueur d'entrée** avant d'appliquer la regex en prod (protection ReDoS)
