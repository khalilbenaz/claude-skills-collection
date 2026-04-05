---
name: agent-database-query-subagent
description: Sous-agent spécialisé dans les requêtes base de données — SQL generation, exécution et analyse de résultats. Se déclenche avec "sous-agent DB", "database agent", "SQL agent", "agent base de données", "query agent", "agent qui requête", "text-to-SQL agent", "NL2SQL".
---

# Database Query Sub-Agent

## Quand utiliser ce skill

Utiliser ce skill lorsqu'un agent parent doit déléguer l'interrogation d'une base de données à un sous-agent spécialisé, notamment pour convertir des questions en langage naturel en requêtes SQL (NL2SQL/Text-to-SQL), exécuter des analyses de données complexes, ou exposer des données structurées à un agent conversationnel sans que ce dernier ait besoin de connaître SQL. Idéal pour les pipelines analytiques, les dashboards pilotés par IA, et les assistants de BI automatisés.

## Workflow

1. **Interface et validation des inputs** — Recevoir depuis l'agent parent : `question` (question en langage naturel ou requête SQL directe), `schema` (description des tables et relations), `db_type` (type de SGBD), `connection` (paramètres de connexion), `read_only` (forcer le mode lecture). Valider la connexion avant toute génération de requête. Vérifier que `read_only: true` est respecté si configuré.

2. **Schema understanding** — Analyser le schéma fourni : noms de tables et colonnes, types de données, clés primaires et étrangères, index disponibles, contraintes (`NOT NULL`, `UNIQUE`). Si le schéma n'est pas fourni, l'inférer automatiquement via `INFORMATION_SCHEMA` ou `sqlite_master`. Construire une représentation condensée du schéma pour le contexte de génération de requête (DDL simplifié).

3. **Natural language → SQL** — Transformer la question en langage naturel en requête SQL via un LLM avec le schéma en contexte. Utiliser des techniques de prompt engineering : fournir le DDL des tables pertinentes, des exemples de requêtes similaires (few-shot), les valeurs distinctes des colonnes catégorielles. Sélectionner le dialecte SQL correct selon `db_type` (PostgreSQL, MySQL, SQLite, SQL Server, etc.). Préférer les CTEs pour la lisibilité des requêtes complexes.

4. **Query validation** — Valider la requête générée avant exécution : vérification syntaxique (parser SQL comme `sqlglot`), vérification que toutes les tables et colonnes référencées existent dans le schéma, prévention des injections SQL (paramètres bindés, pas de concaténation directe), estimation du coût via `EXPLAIN`/`EXPLAIN ANALYZE`. Rejeter les requêtes `DROP`, `DELETE`, `UPDATE`, `INSERT` si `read_only: true`.

5. **Exécution sécurisée** — Exécuter la requête avec des garde-fous stricts : timeout configurable (défaut : 30s), `LIMIT` automatique si absent (défaut : 1000 lignes), connexion en mode lecture seule (`SET TRANSACTION READ ONLY`), isolation de transaction, sandboxing de l'utilisateur DB (droits `SELECT` uniquement). Utiliser `SQLAlchemy` pour l'abstraction multi-SGBD. Annuler proprement via `statement_timeout` en cas de dépassement.

6. **Result processing** — Transformer les résultats bruts : conversion en liste de dicts, typage correct (dates → ISO string, Decimal → float, bytes → base64), gestion des valeurs NULL (→ `null` JSON), calcul du résumé statistique pour les colonnes numériques (min, max, mean, std, percentiles), détection d'anomalies (valeurs outliers, distribution inattendue). Tronquer les résultats si `row_count > max_records`.

7. **Query optimization** — Analyser le plan d'exécution retourné par `EXPLAIN`. Identifier les `Sequential Scan` sur grandes tables (suggérer des index), les jointures cartésiennes accidentelles, l'absence de `WHERE` sur tables volumineuses, les sous-requêtes corrélées remplaçables par des CTEs. Proposer une requête optimisée en commentaire si des améliorations significatives sont détectées (gain estimé > 50%).

8. **Multi-database support** — Gérer les dialectes SQL spécifiques : PostgreSQL (JSONB, arrays, window functions, `ILIKE`), MySQL/MariaDB (backtick identifiers, `LIMIT x,y`), SQLite (type affinity, pas de RIGHT JOIN natif), SQL Server (TOP n, `GETDATE()`), BigQuery (partitions, `ARRAY_AGG`). Pour MongoDB, traduire la question en pipeline d'agrégation `$match`/`$group`/`$project` au lieu de SQL.

9. **Conversation context** — Maintenir un contexte de session pour les questions enchaînées : mémoriser les requêtes précédentes et leurs résultats, permettre des questions de drill-down ("et parmi ceux-là, combien ont…"), résoudre les références anaphoriques ("et eux ?", "les mêmes mais en 2024"), construire des requêtes incrémentales. Stocker le contexte de session dans un objet `QuerySession` passé entre les appels.

10. **Reporting** — Générer l'explication en langage naturel des résultats : décrire en 2–3 phrases ce que la requête a fait et ce que les résultats signifient, suggérer des visualisations adaptées (bar chart, line chart, pie chart selon le type de données), proposer 2–3 questions de suivi pertinentes. Retourner la requête SQL formatée et commentée pour audit et transparence.

## Interface du sous-agent

**Input schema :**
```python
{
  "question": str,                # Question NL ou requête SQL directe (obligatoire)
  "schema": dict,                 # Description du schéma DB (optionnel, inféré si absent)
  # Format schema :
  # {
  #   "tables": [
  #     {"name": str, "columns": [{"name": str, "type": str, "nullable": bool}],
  #      "primary_key": str, "foreign_keys": [{"column": str, "references": str}]}
  #   ]
  # }
  "connection": {                 # Paramètres de connexion (obligatoire)
    "db_type": str,               # "postgresql" | "mysql" | "sqlite" | "sqlserver" | "bigquery" | "mongodb"
    "host": str,                  # Hôte (ou chemin pour SQLite)
    "port": int,                  # Port (optionnel, défaut selon db_type)
    "database": str,              # Nom de la base de données
    "username": str,              # Utilisateur DB
    "password": str,              # Mot de passe (masqué dans les logs)
    "ssl": bool                   # Activer SSL/TLS (défaut: True)
  },
  "read_only": bool,              # Forcer mode lecture seule (défaut: True)
  "max_rows": int,                # Limite de lignes retournées (défaut: 1000)
  "timeout_s": int,               # Timeout d'exécution en secondes (défaut: 30)
  "session_context": dict,        # Contexte de session pour questions enchaînées (optionnel)
  "explain_results": bool         # Générer l'explication NL des résultats (défaut: True)
}
```

**Output schema :**
```python
{
  "query": str,                   # Requête SQL générée et exécutée
  "results": list[dict],          # Résultats sous forme de liste de dicts
  "row_count": int,               # Nombre de lignes retournées
  "execution_time_s": float,      # Durée d'exécution de la requête
  "explanation": str,             # Explication NL des résultats (si explain_results: True)
  "stats": {                      # Résumé statistique des colonnes numériques
    "column_name": {"min": float, "max": float, "mean": float, "null_count": int}
  },
  "optimization_hints": list[str],# Suggestions d'optimisation si pertinentes
  "visualization_suggestion": str,# Type de visualisation recommandé
  "follow_up_questions": list[str],# 2–3 questions de suivi suggérées
  "session_context": dict,        # Contexte mis à jour pour la prochaine question
  "errors": list[dict],           # [{"type": str, "message": str, "query": str}]
  "truncated": bool               # True si résultats tronqués à max_rows
}
```

**Librairies Python recommandées :**
```
sqlalchemy>=2.0.0
sqlglot>=20.0.0
psycopg2-binary>=2.9.0
pymysql>=1.1.0
pyodbc>=5.0.0
pandas>=2.0.0
pydantic>=2.0.0
```

## Règles

1. **Interface contractuelle stricte** — Valider la connexion DB et le schéma avant toute génération de requête. Si la connexion échoue, retourner immédiatement un output d'erreur avec `results: []` et un message explicite. Ne jamais exposer les credentials dans les messages d'erreur ou les logs. L'agent parent reçoit toujours un output conforme au schéma de sortie.

2. **Sécurité absolue en mode read_only** — Lorsque `read_only: true`, utiliser des mécanismes de sécurité à plusieurs niveaux : parser SQL pour détecter les statements mutatives, connexion avec utilisateur DB ayant uniquement des droits `SELECT`, `SET TRANSACTION READ ONLY` avant exécution. Rejeter systématiquement toute requête contenant `DROP`, `DELETE`, `UPDATE`, `INSERT`, `CREATE`, `ALTER`, `TRUNCATE`, même si l'injection est subtile.

3. **Transparence et auditabilité** — Toujours retourner la requête SQL générée dans l'output (`query` field), même en cas d'échec. Loguer chaque exécution avec timestamp, durée, `row_count`, et hash de la requête. Ne jamais exécuter une requête SQL sans pouvoir la tracer. L'agent parent doit pouvoir auditer toutes les requêtes effectuées.

4. **Graceful degradation** — Si la génération NL → SQL échoue, demander une clarification plutôt que de générer une requête incorrecte. Si le schéma est incomplet, indiquer les tables/colonnes inconnues dans `errors` plutôt que de deviner. En cas de timeout, retourner les lignes déjà fetchées avec `truncated: true`. Ne jamais retourner des résultats silencieusement incomplets.

5. **Code Python fonctionnel fourni** — Fournir une implémentation complète de la classe `DatabaseQuerySubAgent` avec méthodes `run(input_schema) -> output_schema`, `_infer_schema()`, `_generate_sql()`, `_validate_query()`, `_execute_safe()`, `_process_results()`, gestion de `QuerySession` pour le contexte conversationnel, et un exemple d'intégration dans un agent analytique piloté par questions utilisateur.


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
