---
name: make-scenario-builder
description: Scénarios d'automatisation avec Make (ex-Integromat) — modules, routers, iterators, webhooks, data stores et orchestration visuelle. Se déclenche avec "Make", "Integromat", "scénario Make", "automatisation Make". Also triggers on "Make scenario", "Integromat automation", "Make webhook".
---

# Make Scenario Builder

## Étape 1 — Cadrage du scénario

**Questions à poser avant de toucher l'éditeur :**

| Question | Décision |
|---|---|
| Délai acceptable entre événement et action ? | < 1 min → webhook instant ; sinon polling |
| Volume mensuel d'opérations estimé ? | < 10 k → Free ; < 150 k → Core ; au-delà → Pro/Teams |
| Les deux apps sont-elles dans le catalogue Make ? | Oui → module natif ; Non → HTTP / Webhook générique |
| Données à stocker entre exécutions ? | Oui → Data Store ; Non → traitement stateless |

**Estimation rapide des opérations :**
```
opérations = nb_exécutions × nb_modules_actifs × taille_collection_moyenne
Exemple : 500 leads/jour × 6 modules × 1 = 3 000 ops/jour → ~90 k/mois (plan Core suffit)
```

---

## Étape 2 — Trigger

### Polling (Watch)
- Intervalle minimum : 1 min (plan payant), 15 min (Free).
- Configurer **Max results** : commencer à 10, augmenter en production.
- Cocher **Process all cycles** pour ne pas sauter de lots en cas de retard.

### Webhook instant
```
URL générée : https://hook.eu2.make.com/xxxxxxxxxxxx
Header recommandé : X-Secret-Token: <votre_token>
```
- Cliquer **Redéfinir la structure de données** après le premier appel test pour inférer automatiquement le schéma.
- Toujours répondre avec un **Webhook Response** (200 + corps JSON) sinon l'appelant retente.

```json
{ "status": "ok", "received": true }
```

---

## Étape 3 — Mapping et transformations

Fonctions utiles copiables dans le panneau de mapping :

```
# Date ISO → format lisible
{{formatDate(1.created_at; "DD/MM/YYYY HH:mm"; "UTC")}}

# Valeur par défaut si vide
{{ifempty(1.email; "no-reply@example.com")}}

# Extraction de domaine email
{{replace(1.email; "/^.*@/"; "")}}

# Parsing JSON embarqué
{{parseJSON(1.metadata)}}

# Troncature de texte
{{substring(1.description; 0; 255)}}
```

**Règle :** mapper à partir des sorties du module précédent (panneau gauche) plutôt que taper en dur — les valeurs hardcodées cassent silencieusement si le schéma source change.

---

## Étape 4 — Routers et filtres

Structure type à 3 routes :

```
[Trigger]
    └─ [Router]
         ├── Route A  (filtre : 1.status = "new")       → créer dans CRM
         ├── Route B  (filtre : 1.status = "updated")   → mettre à jour CRM
         └── Route C  (fallback — aucun filtre)          → log dans Slack #alertes
```

- **Ordre des routes** : la plus restrictive en premier, fallback en dernier.
- **Opérateurs disponibles** : Equal, Contains, Matches pattern (regex), Exists.
- Activer **Stop processing routes after first match** si les routes sont mutuellement exclusives (économise des opérations).

---

## Étape 5 — Iterator / Aggregator

Pattern standard pour traiter un tableau :

```
[Module qui renvoie un tableau]
    → [Iterator]          ← décompose chaque élément
        → [Traitement par élément]
            → [Array Aggregator]   ← reconstruit le tableau
                → [Suite du scénario]
```

Configuration Array Aggregator :
- **Source module** : pointer sur l'Iterator (pas sur le module de traitement).
- **Aggregated fields** : sélectionner uniquement les champs nécessaires.
- Résultat disponible comme `{{n.array}}` dans le module suivant.

**Attention :** chaque itération consomme autant d'opérations que de modules dans la boucle.

---

## Étape 6 — Data Stores

Cas d'usage : mémoriser un état entre exécutions (IDs déjà traités, compteurs, cache).

```
# Schéma minimal pour déduplication
Champ : record_id  (Text, clé unique)
Champ : processed_at  (Date)

# Logique dans le scénario
[Search a record] → existe ?
    Oui → skip (Router vers rien)
    Non → [traitement] → [Add/Replace a record]
```

Quota : 1 Data Store par scénario sur Free, illimité sur payant. Taille max : 1 MB (Free) / variable (payant).

---

## Étape 7 — Gestion des erreurs

| Handler | Comportement | Quand l'utiliser |
|---|---|---|
| **Ignore** | Continue malgré l'erreur | Données non critiques |
| **Resume** | Continue avec valeur de remplacement | Champ optionnel manquant |
| **Break** | Met en file d'attente pour retry | API tierce instable |
| **Rollback** | Annule toute l'exécution | Transaction multi-apps |
| **Commit** | Valide les opérations précédentes puis arrête | Étape partielle acceptable |

**Notification d'erreur standard (Slack) :**
```
Message : ⚠️ Scénario {{scenarioName}} — erreur module {{moduleName}}
Détail : {{error.message}}
Lien : https://www.make.com/en/dashboard
```

Activer **Incomplete executions** dans les paramètres du scénario → les exécutions échouées sont rejouables manuellement depuis l'onglet dédié.

---

## Étape 8 — Déploiement et monitoring

**Checklist avant activation :**
- [ ] Run once testé avec données réelles
- [ ] Chaque module validé individuellement (icône verte)
- [ ] Error handler posé sur chaque module HTTP / API externe
- [ ] Scénario nommé : `[Domaine] — [Source] → [Destination] — [env]`
- [ ] Notes ajoutées sur les modules complexes (clic droit → Add note)
- [ ] Connexions nommées explicitement (pas "Ma connexion 1")

**Surveillance opérations :**
```
Dashboard → Organization → Usage
Alerte recommandée : poser un scénario de monitoring qui envoie un email
si ops restantes < 20% du quota mensuel.
```

---

## Anti-patterns et pièges fréquents

| Piège | Conséquence | Correction |
|---|---|---|
| Filtrer tard dans le flux | Consommation d'ops inutile | Filtrer dès le module Trigger ou juste après |
| Aucun Error Handler sur HTTP | Scénario bloqué silencieusement | Handler Break + Incomplete executions activé |
| Mapping hardcodé (texte fixe) | Régression si schéma change | Toujours mapper depuis les sorties de module |
| Iterator sans Aggregator | Modules suivants reçoivent un seul élément | Toujours clore la boucle avec un Aggregator |
| Webhook sans réponse immédiate | L'appelant retente → doublons | Webhook Response avant les traitements longs |
| Clé d'API en clair dans un champ texte | Fuite de secret | Utiliser les Connections Make ou un Data Store chiffré |
| Scénario actif sans nom clair | Impossible à maintenir en équipe | Convention de nommage systématique |

---

## Bonnes pratiques 2026

- **Blueprints** : exporter chaque scénario en JSON (trois points → Export Blueprint) et le versionner dans git — Make ne versionne pas nativement.
- **Environnements** : utiliser des équipes séparées (ou des connexions nommées `prod` / `staging`) pour isoler les environnements.
- **Rate limiting API** : ajouter un module **Sleep** (Tools → Sleep, 1-2 s) dans les boucles qui appellent des API avec quotas stricts.
- **Sous-scénarios** : découper les scénarios > 20 modules en sous-scénarios appelés via **Run a scenario** — gain en lisibilité et réutilisabilité.
- **MCP / AI modules** : Make expose désormais des modules OpenAI, Anthropic et HuggingFace natifs — préférer ces modules aux appels HTTP bruts pour les intégrations IA.
