---
name: testing-chaos-engineering-guide
description: Principes et outils de chaos engineering pour tester la résilience des systèmes distribués, incluant fault injection, game days, blast radius, et intégration CI/CD. Se déclenche avec "chaos engineering", "Chaos Monkey", "fault injection", "résilience", "Litmus", "game day"
---

# Chaos Engineering Guide

## Workflow

### 1. Définir l'état stable (baseline)

Avant toute expérience, établir les métriques qui définissent le "normal" :

| Métrique | Source | Seuil d'alerte |
|---|---|---|
| p99 latency | Prometheus/Grafana | < 500 ms |
| Error rate | APM (Datadog/New Relic) | < 0.1 % |
| Throughput (req/s) | Load balancer logs | > 1 000 req/s |
| Availability | Healthcheck endpoint | > 99.9 % |

Documenter la baseline avec des captures Grafana datées avant l'expérience.

---

### 2. Formuler une hypothèse testable

Format : **"Si [condition de chaos], alors [comportement attendu] en [délai max], sans [impact inacceptable]."**

Exemples :
- "Si un pod API tombe, Kubernetes le remplace en < 30 s sans erreur 5xx côté client."
- "Si la base de données principale devient indisponible, le failover vers le réplica se fait en < 60 s."
- "Si la latence réseau dépasse 500 ms sur le service de paiement, le circuit breaker s'ouvre et renvoie une réponse dégradée (cache)."

---

### 3. Choisir l'outil adapté

| Contexte | Outil | Installation |
|---|---|---|
| Kubernetes | Litmus Chaos | `helm install litmuschaos litmuschaos/litmus` |
| AWS EC2/ECS | AWS Fault Injection Simulator (FIS) | Console AWS ou CLI |
| Réseau (latence/perte) | Toxiproxy | `docker run -d -p 8474:8474 shopify/toxiproxy` |
| Microservices génériques | Gremlin | SaaS, agent installé sur le host |
| Process kill (Linux) | `kill` / `stress-ng` | Natif |
| Service mesh | Istio fault injection | Config YAML sur VirtualService |

**Critère de choix** : Kubernetes → Litmus ; AWS managed → FIS ; test réseau isolé → Toxiproxy ; budget SaaS → Gremlin.

---

### 4. Concevoir l'expérience

**Composants d'une expérience :**
- **Cible** : pod, nœud, service, dépendance externe
- **Type de fault** : kill, latency, CPU stress, network loss, disk fill
- **Durée** : commencer à 30–60 s, jamais > 10 min en première itération
- **Blast radius** : 1 instance → 25 % des instances → 50 % (montée progressive)
- **Kill switch** : rollback identifié et testé avant l'expérience

Exemple Litmus (pod kill) :
```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-kill-test
  namespace: default
spec:
  appinfo:
    appns: production
    applabel: "app=payment-service"
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "false"
```

Exemple Toxiproxy (latence réseau) :
```bash
# Créer un proxy vers la DB
toxiproxy-cli create --listen 0.0.0.0:5433 --upstream db:5432 db-proxy

# Ajouter 300 ms de latence
toxiproxy-cli toxic add db-proxy -t latency -a latency=300 -a jitter=50

# Supprimer après le test
toxiproxy-cli toxic remove db-proxy -n latency_downstream
```

Exemple Istio (fault injection HTTP) :
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: payment-fault
spec:
  hosts:
    - payment-service
  http:
    - fault:
        delay:
          percentage:
            value: 20
          fixedDelay: 2s
      route:
        - destination:
            host: payment-service
```

---

### 5. Exécuter en environnement contrôlé

**Ordre d'exécution :**
1. Staging d'abord — valider que l'expérience est reproductible
2. Production hors heures de pointe — avec monitoring actif
3. Jamais pendant une release ou un incident actif

**Checklist pré-lancement :**
- [ ] Monitoring ouvert (Grafana, Datadog)
- [ ] Kill switch testé (`kubectl delete chaosengine pod-kill-test -n default`)
- [ ] On-call alerté et disponible
- [ ] Périmètre communiqué à l'équipe Slack/Teams

---

### 6. Organiser des Game Days

Structure d'un game day efficace (3 h) :

| Phase | Durée | Activité |
|---|---|---|
| Brief | 15 min | Hypothèses, règles, rôles |
| Scénario 1 | 45 min | Chaos + observation + correction |
| Scénario 2 | 45 min | Chaos + observation + correction |
| Debriefing | 45 min | Blameless postmortem, actions |
| Rapport | 30 min | Documentation et tickets |

Rôles : **Chaos Master** (pilote les injections), **Observer** (note les métriques), **On-call** (répond comme en production).

---

### 7. Analyser les résultats

Comparer hypothèse vs réalité :

```
Hypothèse : failover DB < 60 s
Observé    : 142 s + 23 erreurs 500 pendant la transition
Delta      : FAIL — circuit breaker non configuré sur le service Orders
Action     : Ajouter Resilience4j circuit breaker + retry avec backoff exponentiel
Owner      : @sre-team | Sprint N+1
```

Métriques à capturer impérativement :
- **MTTR** (Mean Time To Recovery)
- **MTTD** (Mean Time To Detect) — si > 5 min, réviser les alertes
- Nombre d'erreurs utilisateur pendant la panne
- Comportement du circuit breaker / retry

---

### 8. Automatiser dans le pipeline CI/CD

Intégrer les expériences validées en CI (ex. GitHub Actions) :

```yaml
jobs:
  chaos-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - name: Run Litmus chaos experiment
        run: |
          kubectl apply -f chaos/pod-kill-test.yaml
          sleep 60
          kubectl get chaosresult pod-kill-test-pod-delete \
            -o jsonpath='{.status.experimentStatus.verdict}'
      - name: Assert SLO not breached
        run: |
          ERROR_RATE=$(curl -s "http://prometheus/api/v1/query" \
            --data 'query=rate(http_requests_total{status=~"5.."}[1m])' \
            | jq '.data.result[0].value[1]')
          [ $(echo "$ERROR_RATE < 0.01" | bc) -eq 1 ]
```

---

## Garde-fous et anti-patterns

### Ne jamais faire
- **Lancer sans kill switch testé** — le rollback doit prendre < 30 s.
- **Cibler 100 % des instances** pour la première expérience — blast radius 1 instance max.
- **Chaos en production pendant une release** — risque de confusion cause/effet.
- **Injecter sans baseline documentée** — impossible de savoir si le système a régressé.
- **Utiliser le chaos comme punition** ou exercice surprise — blameless culture obligatoire.

### Pièges courants
- **Circuit breaker mal calibré** : timeout trop long → cascade d'erreurs avant ouverture.
- **Healthcheck trop optimiste** : le pod répond 200 mais la DB interne est KO.
- **Retry sans backoff** : amplifie la charge sur un service déjà dégradé (retry storm).
- **Monitoring manquant sur les dépendances externes** : la panne est invisible jusqu'au SLA.
- **Expérience non reproductible** : toujours versionner les manifestes de chaos dans Git.

### Bonnes pratiques 2026
- Adopter **eBPF** (Tetragon, Cilium) pour observer l'impact réseau sans modifier le code.
- Intégrer les résultats de chaos dans le **DORA scorecard** de l'équipe (MTTR notamment).
- Utiliser **OpenTelemetry** pour corréler les traces pendant l'expérience.
- Maintenir un **catalogue d'expériences** (YAML versionnés) avec résultats historiques.
- Préférer les **Steady-State Hypotheses** du standard Chaos Toolkit pour la portabilité entre outils.


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
