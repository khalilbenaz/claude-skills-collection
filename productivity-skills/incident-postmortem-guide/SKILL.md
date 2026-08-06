---
name: incident-postmortem-guide
description: Rédaction de post-mortems techniques après un incident — timeline, analyse des causes racines, actions correctives et leçons apprises. À utiliser quand l'utilisateur doit documenter un incident, analyser une panne ou structurer un retour d'expérience. Se déclenche aussi avec "post-mortem", "postmortem", "incident report", "retour d'expérience", "RCA", "root cause analysis", "blameless postmortem", "analyse de panne".
---

# Guide de Post-Mortem d'Incident

## Workflow en 6 étapes

### 1. Déclencher le post-mortem (J+0, pendant ou juste après l'incident)

Critère : rédiger un post-mortem pour tout incident SEV1 ou SEV2, et pour tout SEV3 récurrent (3e occurrence en 30 jours).

Désigner immédiatement :
- **Incident Commander** — coordonne la résolution en direct
- **Scribe** — capture la timeline en temps réel dans un doc partagé (Confluence, Notion, doc Google)
- **Auteur du post-mortem** — rédige l'analyse a posteriori (peut être différent du scribe)

### 2. Collecter les données brutes (J+0 → J+1)

Extraire les logs, métriques et événements **avant** d'interpréter. Sources typiques :

```bash
# Logs applicatifs sur une fenêtre horaire (exemple Loki/logcli)
logcli query '{app="api-gateway"} |= "ERROR"' \
  --from="2026-06-24T14:00:00Z" --to="2026-06-24T15:00:00Z" \
  --output=jsonl > incident_logs.jsonl

# Métriques Prometheus : taux d'erreur 5xx sur 1h
promtool query range \
  'sum(rate(http_requests_total{status=~"5.."}[1m]))' \
  --start=2026-06-24T14:00:00Z --end=2026-06-24T15:00:00Z \
  --step=60s

# Historique des déploiements (exemple kubectl)
kubectl rollout history deployment/api-gateway --namespace=prod

# Historique des commits récents sur la branche main
git log --oneline --since="24 hours ago" origin/main
```

Documenter chaque événement avec timestamp UTC précis. Ne pas reconstituer de mémoire.

### 3. Construire la timeline (J+1)

Règle : une ligne = un fait daté, source citée. Pas d'interprétation dans la timeline.

```markdown
| Heure (UTC)    | Événement                                              | Source            |
|----------------|--------------------------------------------------------|-------------------|
| 14:00:12       | Déploiement v2.3.1 mergé en prod (commit `a3f9c12`)   | CI/CD Argo        |
| 14:14:47       | Alerte Prometheus : error_rate > 5% (seuil configuré) | Alertmanager      |
| 14:16:03       | PagerDuty notifie @on-call                             | PagerDuty log     |
| 14:23:00       | Diagnostic : pool DB à 100% (max_connections=50)      | pg_stat_activity  |
| 14:29:15       | Décision rollback vers v2.3.0                          | Slack #incidents  |
| 14:31:08       | Rollback déclenché (`kubectl rollout undo`)            | kubectl events    |
| 14:34:22       | error_rate < 1%, service restauré                      | Grafana dashboard |
| 14:45:00       | Confirmation client : service nominal                  | Support ticket    |
```

### 4. Analyser les causes racines

**Choisir la méthode selon la complexité :**

| Complexité | Méthode recommandée |
|------------|---------------------|
| Incident simple, cause linéaire | 5 Whys |
| Plusieurs causes interdépendantes | Fishbone (Ishikawa) |
| Incidents systémiques récurrents | STAMP / fault tree |

**Exemple 5 Whys complet :**

```
Symptôme : API de paiement en erreur 503 pendant 34 minutes

1. Pourquoi le service retourne 503 ? → Pool de connexions DB épuisé (50/50 actives)
2. Pourquoi le pool est épuisé ? → Une requête `SELECT * FROM orders` sans WHERE ni LIMIT
3. Pourquoi cette requête existe-t-elle ? → Ajoutée dans v2.3.1 pour l'export CSV, pas testée sur data prod
4. Pourquoi pas testée sur data prod ? → L'env de staging n'a que 1 000 lignes ; prod en a 4,2 millions
5. Pourquoi cette différence n'est pas détectée ? → Pas de test de performance dans la PR checklist

Cause racine systémique : absence de tests de charge représentatifs avant mise en prod
```

**Facteurs contributifs** (ne pas confondre avec la cause racine) :
- `max_connections=50` jamais revisité depuis 2 ans
- Pas de circuit breaker sur les appels DB de longue durée
- Alerte sur la taille du pool absente du monitoring

### 5. Rédiger le document final (J+1 → J+2)

Template complet copiable :

```markdown
# Post-Mortem : [Titre court et factuel]

**Date** : YYYY-MM-DD
**Durée** : HH:MM (détection → résolution complète)
**Sévérité** : SEV1 / SEV2 / SEV3
**Statut** : Brouillon / En revue / Finalisé
**Auteur** : [Nom]
**Réviseurs** : [Noms]

---

## Résumé exécutif (3 phrases max)

Le déploiement v2.3.1 a introduit une requête SQL non paginée qui a saturé le pool de
connexions PostgreSQL en 14 minutes. L'API de paiement a été indisponible 34 minutes
pour 100% des utilisateurs. Un rollback vers v2.3.0 a restauré le service.

## Impact

| Métrique              | Valeur              |
|-----------------------|---------------------|
| Utilisateurs impactés | ~12 000             |
| Durée d'indisponibilité | 00:34             |
| Transactions échouées | 847                 |
| Revenu différé        | ~42 000 €           |
| SLA breached          | Oui (99.9% → 99.1%) |

## Timeline détaillée

[Insérer tableau section 3]

## Analyse des causes racines

### Cause immédiate
Requête `SELECT * FROM orders` sans pagination exécutée en prod au déploiement de v2.3.1.

### 5 Whys
[Insérer analyse section 4]

### Facteurs contributifs
[Liste des facteurs]

## Ce qui a bien fonctionné
- Alerte Prometheus déclenchée en 14 min 47 s (SLO : < 15 min) ✓
- Rollback complet en moins de 3 minutes ✓
- Communication dans #incidents continue et structurée ✓

## Ce qui peut être amélioré
- Délai de 2 min entre l'alerte et la notification PagerDuty (bug de config)
- Aucun runbook pour les incidents "pool DB saturé"
- Staging non représentatif du volume de données prod

## Actions correctives

| # | Action | Priorité | Responsable | Deadline | Ticket |
|---|--------|----------|-------------|----------|--------|
| 1 | Alerte sur `pg_stat_activity` > 80% du pool | P1 | @ops-alice | J+3 | #1234 |
| 2 | Ajouter "test de pagination sur toute requête list" dans PR checklist | P1 | @lead-bob | J+5 | #1235 |
| 3 | Script de seed staging avec 1M lignes anonymisées | P2 | @dev-carol | J+14 | #1236 |
| 4 | Runbook "pool DB saturé" dans le wiki ops | P2 | @ops-alice | J+14 | #1237 |
| 5 | Circuit breaker sur appels DB > 5 s | P2 | @dev-dave | J+21 | #1238 |
| 6 | Load test automatisé dans la CI (k6, seuil 10 rps) | P3 | @devops-eve | J+30 | #1239 |

## Leçons apprises
- Les requêtes SQL sans pagination sont un vecteur d'incident systémique sur des données en croissance.
- L'écart staging/prod en volume de données doit être une exigence explicite, pas un état de fait.
```

### 6. Partager et suivre les actions (J+2 → clôture)

- Envoyer le post-mortem dans le canal #post-mortems et par email à toute l'équipe technique.
- Créer les tickets d'actions correctives **immédiatement** après validation du document.
- Faire un point de suivi 30 jours plus tard : cocher chaque action dans le doc, rouvrir si bloquée.

```bash
# Vérifier l'avancement des tickets (exemple GitHub CLI)
gh issue list --label "postmortem-2026-06-24" --state open
```

---

## Niveaux de sévérité

| Niveau | Critère | Post-mortem obligatoire |
|--------|---------|------------------------|
| **SEV1** | Service principal indisponible, impact revenue direct | Toujours, sous 48 h |
| **SEV2** | Dégradation significative, workaround difficile | Toujours, sous 72 h |
| **SEV3** | Impact mineur, peu d'utilisateurs touchés | Si récurrent (3x/30j) |

---

## Pièges et anti-patterns

**Ne jamais faire :**
- Rédiger la timeline de mémoire 3 jours après — reconstitution biaisée garantie.
- Terminer les 5 Whys à "erreur humaine" ou "manque d'attention" — c'est un symptôme, pas une cause.
- Laisser une action corrective sans ticket, responsable et deadline — elle ne sera jamais faite.
- Identifier une cause racine unique quand l'incident est systémique — les incidents complexes ont plusieurs causes.
- Attendre la réunion de post-mortem pour ouvrir les tickets P1 — ouvrir dès la résolution.
- Publier un post-mortem qui blame implicitement une personne ("Dave a oublié de tester") — rephrase en systémique ("l'absence de test de charge dans la CI n'a pas détecté la régression").

**Signaux d'un mauvais post-mortem :**
- Les actions correctives sont vagues ("améliorer le monitoring", "mieux tester").
- La section "causes racines" ne contient qu'une cause immédiate.
- Aucune mention de ce qui a bien fonctionné.
- Le document est rédigé à la première personne du singulier.

---

## Principes blameless

- Chaque erreur humaine révèle une faiblesse systémique : process, outillage, formation, contexte.
- Un humain n'a jamais "fait une erreur" dans le vide — quelles conditions l'ont rendu possible ?
- L'objectif du post-mortem est d'empêcher le prochain incident, pas de documenter le passé.
- Partagez systématiquement les post-mortems avec les équipes voisines : un incident sur un service peut en prévenir un autre.

---

## Checklist de validation avant publication

- [ ] Timeline basée sur des logs/métriques, pas sur des souvenirs
- [ ] Au moins 3 niveaux de "Pourquoi ?" dans les 5 Whys
- [ ] Causes racines systémiques (process/outil), pas "erreur humaine"
- [ ] Chaque action corrective : ticket créé, responsable nommé, deadline fixée
- [ ] Section "Ce qui a bien fonctionné" renseignée
- [ ] Aucune mise en cause individuelle dans le document
- [ ] Document relu par au moins une personne extérieure à l'incident
