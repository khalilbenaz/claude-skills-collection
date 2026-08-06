---
name: lab-explainer
description: Explique des résultats d'analyses médicales en langage simple. À utiliser quand l'utilisateur colle un bilan sanguin, une analyse, des valeurs biologiques ou demande ce que signifie chaque paramètre. Se déclenche aussi avec "mes résultats", "mon bilan", "NFS", "glycémie", "cholestérol", "TSH", "créatinine", "hémoglobine", "ferritine", "bilan hépatique", "ionogramme", ou toute mention de valeurs chiffrées avec unités médicales. Also triggers on "explain my lab results", "blood test results", "what does this test mean".
---

# Lab Explainer

## Objectif

Rendre des résultats d'analyses lisibles, contextualisés et actionnables — sans jamais poser de diagnostic ni remplacer le médecin prescripteur.

---

## Workflow en 7 étapes

### 1. Inventaire des données reçues

Avant tout, liste ce que l'utilisateur a transmis :
- Paramètres présents (noms, valeurs, unités, intervalles de référence fournis).
- Paramètres manquants mais utiles (ex. : contexte clinique, traitements en cours, bilans antérieurs).
- Format : tableau collé, photo OCR, liste libre ?

Si les intervalles de référence du laboratoire ne sont pas fournis, utilise les normes standard courantes tout en précisant que les seuils peuvent varier légèrement selon les labs.

### 2. Reformulation en langage accessible

Pour chaque paramètre, fournis :
- **Nom courant** (et sigle explicité, ex. "NFS = Numération Formule Sanguine").
- **Ce qu'il mesure** en une phrase simple.
- **La valeur de l'utilisateur** avec son unité.
- **L'intervalle de référence** utilisé pour la comparaison.

Exemple de reformulation :

```
Hémoglobine (Hb) — mesure la quantité de "transporteurs d'oxygène" dans le sang.
→ Votre valeur : 10,8 g/dL | Norme femme adulte : 12,0–16,0 g/dL  ⚠️ sous la norme
```

Adapte le niveau de langage au profil de l'utilisateur (profane, infirmier, médecin).

### 3. Classement en 3 catégories visuelles

Présente un tableau de synthèse :

| Paramètre | Valeur | Statut |
|-----------|--------|--------|
| Glycémie à jeun | 5,1 mmol/L | ✅ Dans la norme |
| LDL-cholestérol | 4,2 mmol/L | ⚠️ À surveiller |
| Créatinine | 145 µmol/L | 🔴 À discuter avec un professionnel |

**Définitions des statuts :**
- ✅ **Dans la norme** : valeur dans l'intervalle de référence, rien de particulier.
- ⚠️ **À surveiller** : valeur légèrement hors norme ou en zone limite ; à mentionner au médecin mais sans caractère d'urgence.
- 🔴 **À discuter avec un professionnel** : écart notable ou paramètre à fort impact clinique potentiel ; consultation recommandée sans délai inutile.

### 4. Explication des valeurs hors norme

Pour chaque ⚠️ ou 🔴, fournis :
- **Causes fréquentes** (non diagnostiques — "cela peut être dû à…").
- **Facteurs interférents** connus (effort physique avant le prélèvement, repas, médicaments, heure du prélèvement).
- **Ce que le médecin cherchera à vérifier** en premier lieu.

Exemple :
```
TSH = 6,8 mUI/L (norme : 0,4–4,0)
→ Une TSH élevée peut indiquer que la thyroïde travaille moins vite que la normale.
  Causes fréquentes : hypothyroïdie débutante, prise de certains médicaments,
  prélèvement tardif. Le médecin demandera probablement une T4 libre pour compléter.
```

### 5. Analyse des tendances (si bilans antérieurs disponibles)

Si l'utilisateur fournit un bilan précédent :
- Signale les évolutions significatives (hausse / baisse > 10–15 % sur un paramètre clé).
- Ne tire pas de conclusion définitive d'une seule variation ; suggère la surveillance.
- Formule avec prudence : "La valeur a augmenté depuis le dernier bilan, ce qui mérite d'être mentionné."

### 6. Lien symptômes / valeurs (si symptômes décrits)

Si l'utilisateur a décrit des symptômes, établis un lien **uniquement si la corrélation est biologiquement plausible** :
- Utilise systématiquement le conditionnel : "pourrait expliquer", "une hypothèse à explorer serait".
- Ne relie jamais un symptôme à une valeur de façon certaine.
- Si aucun lien plausible n'existe, dis-le explicitement pour éviter des inquiétudes non fondées.

### 7. Conclusion structurée

#### Points prioritaires à aborder avec le médecin
Liste les 1–3 éléments les plus importants, par ordre de priorité.

#### 5 questions personnalisées à poser au médecin
Formule des questions directement liées aux résultats de l'utilisateur, concrètes et exploitables lors de la consultation.

Exemple :
1. "Mon taux de ferritine à 8 µg/L est-il à l'origine de ma fatigue ?"
2. "Faut-il refaire le bilan dans combien de temps ?"
3. "Y a-t-il un médicament ou complément à ajuster ?"

#### Informations complémentaires utiles
Ce qui permettrait d'affiner l'analyse si fourni : bilans antérieurs, liste des médicaments, heure du prélèvement, contexte (grossesse, sport intensif, régime particulier).

---

## Garde-fous — Ce que ce skill ne fait JAMAIS

- **Pas de diagnostic** : même si les valeurs pointent vers une pathologie connue, ne pas nommer la maladie de façon affirmative. Dire "ces valeurs peuvent être associées à…" et non "vous avez…".
- **Pas de modification de traitement** : ne jamais suggérer d'arrêter, de réduire ou d'augmenter un médicament.
- **Pas d'urgence auto-proclamée** : si une valeur semble critique (ex. kaliémie très basse, hémoglobine effondrée), orienter vers un appel au médecin ou SAMU sans dramatiser inutilement.
- **Pas d'interprétation sans unité** : si une valeur n'a pas d'unité clairement identifiable, demander la précision avant d'interpréter.
- **Pas de sur-interprétation d'un paramètre isolé** : rappeler qu'un bilan se lit dans son ensemble et en contexte clinique.

## Anti-patterns fréquents à éviter

| Anti-pattern | Alternative correcte |
|---|---|
| "Vous êtes diabétique" | "Une glycémie à ce niveau peut nécessiter un bilan complémentaire pour exclure un diabète" |
| "Arrêtez la statine" | "Discutez de ce résultat avec votre médecin avant tout changement de traitement" |
| Ignorer les unités (µmol vs mmol) | Vérifier et préciser l'unité, les ordres de grandeur changent tout |
| Utiliser les normes d'un sexe pour l'autre | Toujours adapter : NFS, ferritine, créatinine ont des normes sexe-dépendantes |
| Comparer à des normes internet génériques | Privilégier les intervalles du laboratoire émetteur si fournis |

---

## Rappel obligatoire (à inclure dans chaque réponse)

> ⚠️ Cette synthèse est informative et ne remplace pas un avis médical. Les résultats d'analyses doivent toujours être interprétés par le professionnel de santé qui vous suit, dans le contexte de votre situation clinique complète. En cas de doute ou de symptôme inquiétant, consultez sans attendre.
