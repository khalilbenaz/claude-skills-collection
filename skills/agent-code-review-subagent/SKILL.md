---
name: agent-code-review-subagent
description: Sous-agent spécialisé dans la revue de code automatisée, déclenchable par un agent parent pour analyser du code. Se déclenche avec "sous-agent review", "code review agent", "automated code review", "PR review agent", "review subagent", "agent qui review", "quality check agent".
---

# Code Review Sub-Agent

## Quand utiliser ce skill

Utiliser ce skill lorsqu'un agent parent doit déléguer l'analyse qualité d'un code source, d'un diff de pull request, ou d'une soumission de patch à un sous-agent spécialisé. Pertinent pour les pipelines CI/CD intégrant une revue automatisée, les workflows de validation avant merge, ou les assistants de développement qui doivent fournir un feedback structuré sur du code soumis par un utilisateur.

## Workflow

1. **Interface et validation des inputs** — Recevoir depuis l'agent parent : `code` (code source brut ou diff), `language` (langage de programmation), `context` (description fonctionnelle optionnelle), `severity_threshold` (niveau minimal à reporter). Valider que le code n'est pas vide, que le langage est supporté, et normaliser le diff si nécessaire (format unified diff).

2. **Analyse statique** — Exécuter les outils d'analyse statique adaptés au langage : `pylint`/`flake8`/`ruff` pour Python, `eslint` pour JavaScript/TypeScript, `checkstyle` pour Java, `staticcheck` pour Go. Détecter les anti-patterns (god object, code mort, duplication excessive via `jscpd`), mesurer la complexité cyclomatique (seuil > 10 = alerte).

3. **Security scan** — Analyser les vulnérabilités de sécurité avec `bandit` (Python), `semgrep` (multi-langage), ou `eslint-plugin-security`. Détecter : injections SQL/NoSQL/command, secrets hardcodés (regex sur API keys, passwords, tokens), désérialisation non sécurisée, dépendances vulnérables (OWASP Top 10). Classifier selon le score CVSS.

4. **Performance analysis** — Identifier les problèmes de performance : complexité algorithmique O(n²) ou pire (boucles imbriquées sur grandes structures), requêtes N+1 en ORM, allocations mémoire inutiles dans les boucles, absence de lazy loading, re-computation de valeurs constantes. Proposer des alternatives plus efficaces avec estimation de gain.

5. **Style et conventions** — Vérifier la conformité aux conventions du langage (PEP 8, Google Style Guide, Airbnb) et aux standards du projet si fournis. Évaluer la cohérence du nommage (variables, fonctions, classes), la longueur des fonctions (> 50 lignes = refactoring suggéré), et la qualité des commentaires (présents, pertinents, à jour).

6. **Logic review** — Analyser la logique métier : conditions aux limites non gérées (off-by-one, valeurs nulles, listes vides), gestion des erreurs (exceptions swallées, erreurs non propagées), race conditions dans le code concurrent, null safety et vérifications de type. Simuler mentalement les cas d'utilisation extrêmes.

7. **Test coverage assessment** — Évaluer si les changements sont couverts par des tests. Identifier les fonctions critiques sans tests unitaires. Suggérer des cas de test manquants (happy path, edge cases, erreurs). Vérifier la qualité des assertions existantes (éviter `assertTrue(result is not None)` seul). Calculer un score de couverture estimé.

8. **Findings prioritization** — Classer tous les findings selon 5 niveaux : `critical` (failles de sécurité exploitables, données corrompues), `high` (bugs fonctionnels, vulnérabilités importantes), `medium` (mauvaises pratiques, performance dégradée), `low` (style, lisibilité), `info` (suggestions d'amélioration). Filtrer selon `severity_threshold`.

9. **Suggestion generation** — Pour chaque finding, générer : une explication claire du problème, un extrait de code corrigé (diff format), une ou plusieurs approches alternatives si pertinentes, des liens vers la documentation ou les best practices. Les suggestions de code doivent être syntaxiquement correctes et directement applicables.

10. **Report formatting** — Produire le rapport final dans le format demandé : JSON structuré pour consommation par l'agent parent (avec `findings`, `score`, `summary`), ou Markdown lisible par un humain avec sections organisées par sévérité. Inclure un score global de 0 à 100 basé sur la densité et sévérité des findings.

## Interface du sous-agent

**Input schema :**
```python
{
  "code": str,                    # Code source brut ou diff unified (obligatoire)
  "language": str,                # "python" | "javascript" | "typescript" | "java" | "go" | "rust" | ...
  "context": str,                 # Description fonctionnelle du code (optionnel)
  "severity_threshold": str,      # "critical" | "high" | "medium" | "low" | "info" (défaut: "low")
  "output_format": str,           # "json" | "markdown" (défaut: "json")
  "check_security": bool,         # Activer le scan sécurité (défaut: True)
  "check_performance": bool,      # Activer l'analyse performance (défaut: True)
  "check_tests": bool,            # Évaluer la couverture de tests (défaut: True)
  "style_guide": str              # "pep8" | "google" | "airbnb" | None (défaut: None)
}
```

**Output schema :**
```python
{
  "findings": list[dict],         # Liste des findings détectés
  # Chaque finding :
  # {
  #   "severity": str,            # "critical" | "high" | "medium" | "low" | "info"
  #   "category": str,            # "security" | "performance" | "style" | "logic" | "test"
  #   "line": int,                # Numéro de ligne (None si global)
  #   "issue": str,               # Description claire du problème
  #   "suggestion": str,          # Correction proposée en prose
  #   "code_fix": str             # Extrait de code corrigé (optionnel)
  # }
  "score": int,                   # Score qualité global 0–100
  "summary": str,                 # Résumé exécutif en 2–3 phrases
  "stats": dict,                  # {"total": int, "critical": int, "high": int, ...}
  "execution_time_s": float       # Durée d'analyse en secondes
}
```

**Librairies Python recommandées :**
```
pylint>=3.0.0
flake8>=6.0.0
ruff>=0.1.0
bandit>=1.7.0
semgrep>=1.50.0
radon>=6.0.0
```

## Règles

1. **Interface contractuelle stricte** — Le sous-agent accepte uniquement le schéma d'entrée défini. Si `code` est vide ou `language` non supporté, retourner immédiatement un output avec `findings: []`, `score: null`, et un message d'erreur clair dans `summary`. Ne jamais lever d'exception non catchée vers l'agent parent.

2. **Objectivité et non-destructivité** — Les findings doivent être factuels, basés sur des règles définies, jamais sur des préférences subjectives non documentées. Toujours justifier chaque finding avec une règle ou standard cité (ex: "PEP 8 E501 - ligne trop longue"). Ne jamais suggérer de réécriture complète sans justification précise.

3. **Priorisation actionnable** — Chaque finding `critical` ou `high` doit obligatoirement inclure un `code_fix`. Les findings `medium` doivent inclure au minimum une `suggestion` textuelle détaillée. Ne jamais rapporter un problème sans au moins une piste de résolution concrète.

4. **Réutilisabilité multi-langage** — Le sous-agent doit supporter au minimum Python, JavaScript, TypeScript, Java et Go. La détection automatique du langage (si `language` non fourni) doit être tentée via analyse heuristique des tokens et extensions. Dégradation gracieuse si l'outil statique spécifique n'est pas disponible.

5. **Code Python fonctionnel fourni** — Fournir une implémentation complète de la classe `CodeReviewSubAgent` avec méthodes `run(input_schema) -> output_schema`, `_run_static_analysis()`, `_run_security_scan()`, `_compute_score()`, et un exemple d'intégration dans un pipeline CI/CD agent-based.


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
