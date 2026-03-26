---
name: dev-load-test-planner
description: Planifie et exécute des tests de charge et performance. Se déclenche avec "test de charge", "load test", "stress test", "performance test", "k6", "JMeter", "Gatling", "benchmark", "combien d'utilisateurs".
---

# Load Test Planner

## Workflow
1. **Définir les objectifs de performance**
   - Nombre d'utilisateurs simultanés cibles (concurrent users)
   - Requêtes par seconde attendues (RPS / TPS)
   - Objectifs de latence : p50, p95, p99 en millisecondes
   - SLA et seuils d'erreur acceptables (ex : < 1% d'erreurs, p95 < 500ms)

2. **Identifier les scénarios critiques**
   - User journeys les plus fréquents selon les analytics de production
   - Opérations les plus coûteuses en ressources (requêtes lourdes, uploads)
   - Points chauds identifiés par le monitoring existant
   - Scénarios de pic prévisibles (soldes, lancement de produit, horaires de pointe)

3. **Choix de l'outil adapté**
   - **k6** : scripts en JavaScript, idéal pour les développeurs, CI/CD-friendly
   - **JMeter** : interface graphique, adapté aux équipes QA non-développeurs
   - **Gatling** : DSL Scala/Kotlin, excellents rapports HTML, haute performance
   - **Artillery** : YAML/JavaScript, orienté Node.js, bonne intégration AWS

4. **Écriture des scripts de test**
   - Modéliser les scénarios réels (navigation, login, panier, checkout)
   - Configurer le ramp-up progressif (montée en charge graduelle)
   - Ajouter du think time pour simuler le comportement humain
   - Paramétrer les données (users différents, produits variés, tokens rotatifs)

5. **Types de tests à exécuter**
   - **Smoke test** : 1-2 users, valider que le script fonctionne sans erreur
   - **Load test** : charge nominale attendue, vérifier les SLA
   - **Stress test** : dépasser la capacité pour trouver le point de rupture
   - **Spike test** : montée brutale et soudaine de charge
   - **Soak/Endurance test** : charge normale sur longue durée (memory leaks, dégradation)

6. **Exécution et monitoring en temps réel**
   - Observer CPU, RAM, et I/O des serveurs pendant le test
   - Surveiller les connexions actives à la base de données
   - Monitorer les error rates et les timeouts en direct
   - Utiliser Grafana + InfluxDB ou k6 Cloud pour la visualisation temps réel

7. **Analyse des résultats**
   - Comparer p50 (médiane), p95 et p99 aux objectifs définis
   - Calculer le throughput réel (requêtes réussies par seconde)
   - Identifier les bottlenecks (CPU saturé, DB lente, pool de connexions épuisé)
   - Corréler les pics de latence avec les métriques infrastructure

8. **Rapport et recommandations**
   - Synthèse des résultats par scénario avec graphiques de tendance
   - Identification claire des goulets d'étranglement et de leurs causes
   - Recommandations d'optimisation priorisées (caching, indexation, scaling)
   - Plan de capacity planning : estimer les ressources nécessaires pour X users

## Règles
- Commence toujours par un smoke test avant tout test de charge réel.
- Ne teste jamais en production sans accord préalable et fenêtre de maintenance.
- Paramètre les données pour éviter les biais de cache et les résultats non représentatifs.
- Documente le contexte exact du test (version, infrastructure, heure) pour reproductibilité.
- Fournis des scripts complets et exécutables adaptés à l'outil choisi par l'utilisateur.
