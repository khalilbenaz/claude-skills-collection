---
name: database-query-subagent
description: Sous-agent spécialisé dans les requêtes base de données — SQL generation, exécution et analyse de résultats. Se déclenche avec "sous-agent DB", "database agent", "SQL agent", "agent base de données", "query agent", "agent qui requête", "text-to-SQL agent", "NL2SQL". Also triggers on "database query agent", "text to SQL subagent".
---

# Database Query Sub-Agent

## Cas d'usage

Déléguer à ce sous-agent toute interrogation DB depuis un agent parent : NL2SQL (question → SQL), analyse de données complexes, BI assistée par IA, drill-down conversationnel multi-tour. Ne pas utiliser pour des mutations — ce sous-agent est en lecture seule par défaut.

---

## Workflow (10 étapes)

### 1. Validation des inputs

Recevoir et valider **avant** toute génération de SQL :

```python
required = ["question", "connection.db_type", "connection.host", "connection.database"]
# Tester la connexion : ping + SELECT 1
# Si échec → retourner immédiatement errors=[{"type": "connection_error", ...}]
```

Defaults : `read_only=True`, `max_rows=1000`, `timeout_s=30`.

---

### 2. Découverte du schéma

Si `schema` non fourni, l'inférer automatiquement :

```sql
-- PostgreSQL / MySQL
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- SQLite
SELECT name, sql FROM sqlite_master WHERE type='table';

-- SQL Server
SELECT t.name, c.name, tp.name, c.is_nullable
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
JOIN sys.types tp ON c.user_type_id = tp.user_type_id;
```

Construire un DDL simplifié (max ~2 000 tokens) à injecter dans le prompt de génération.

---

### 3. NL → SQL (génération)

Prompt structuré :

```
Schéma DDL :
<DDL des tables pertinentes uniquement>

Question : <question utilisateur>
Dialecte : <db_type>
Contraintes : lecture seule, LIMIT max_rows

Règles :
- Préférer les CTEs aux sous-requêtes imbriquées
- Alias explicites sur toutes les colonnes ambiguës
- Pas de SELECT * sur tables volumineuses
- Exemples few-shot si disponibles en session_context
```

Critères de sélection des tables pertinentes : similarité sémantique entre la question et les noms de tables/colonnes (embedding cosine > 0.7, ou matching de mots-clés en fallback).

---

### 4. Validation avant exécution

```python
import sqlglot

def validate_query(sql: str, db_type: str, schema: dict, read_only: bool) -> list[str]:
    errors = []
    # 1. Parse syntaxique
    try:
        parsed = sqlglot.parse_one(sql, dialect=db_type)
    except sqlglot.errors.ParseError as e:
        errors.append(f"syntax_error: {e}")
        return errors

    # 2. Vérifier colonnes et tables vs schéma
    for table in parsed.find_all(sqlglot.exp.Table):
        if table.name not in schema["tables"]:
            errors.append(f"unknown_table: {table.name}")

    # 3. Bloquer mutations si read_only
    if read_only:
        forbidden = (sqlglot.exp.Drop, sqlglot.exp.Delete,
                     sqlglot.exp.Update, sqlglot.exp.Insert,
                     sqlglot.exp.Create, sqlglot.exp.AlterTable)
        for node in parsed.walk():
            if isinstance(node, forbidden):
                errors.append(f"mutation_blocked: {type(node).__name__}")
    return errors
```

En cas d'erreur de validation : retourner sans exécuter, inclure la requête invalide dans `errors[].query`.

---

### 5. Exécution sécurisée

```python
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

engine = create_engine(conn_url, poolclass=NullPool,
                       connect_args={"connect_timeout": 5})

with engine.connect() as conn:
    # Lecture seule au niveau transaction
    conn.execute(text("SET TRANSACTION READ ONLY"))          # PostgreSQL / MySQL
    # SQL Server : utiliser un login sans droits DML

    # Timeout
    conn.execute(text(f"SET statement_timeout = {timeout_s * 1000}"))  # PostgreSQL ms

    # LIMIT automatique si absent
    if "LIMIT" not in sql.upper() and db_type != "sqlserver":
        sql += f" LIMIT {max_rows}"
    elif db_type == "sqlserver" and "TOP" not in sql.upper():
        sql = sql.replace("SELECT", f"SELECT TOP {max_rows}", 1)

    result = conn.execute(text(sql))
    rows = [dict(r) for r in result.fetchmany(max_rows + 1)]
    truncated = len(rows) > max_rows
    return rows[:max_rows], truncated
```

---

### 6. Traitement des résultats

Sérialisation sûre pour JSON :

```python
import math
from decimal import Decimal
from datetime import date, datetime

def serialize_row(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if v is None:
            out[k] = None
        elif isinstance(v, (datetime, date)):
            out[k] = v.isoformat()
        elif isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, float) and math.isnan(v):
            out[k] = None  # NaN non serializable JSON
        elif isinstance(v, bytes):
            out[k] = v.hex()
        else:
            out[k] = v
    return out
```

Calculer les stats pour colonnes numériques : `{min, max, mean, std, null_count, p25, p50, p75}`.

---

### 7. Analyse du plan d'exécution

Lancer `EXPLAIN` si `row_count > 10 000` ou `execution_time_s > 2` :

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) <votre requête>;  -- PostgreSQL
EXPLAIN FORMAT=JSON <votre requête>;                       -- MySQL
```

Signaux d'alerte à détecter dans le plan :
- `Seq Scan` sur table > 100 000 lignes sans `WHERE` sélectif
- `Nested Loop` avec `cost > 10 000`
- `Hash Join` avec spill sur disque (`"Disk Spills" > 0`)
- Cardinalité estimée / réelle ratio > 10× (statistiques obsolètes)

Inclure dans `optimization_hints` uniquement si gain estimé > 50 %.

---

### 8. Dialectes SQL — différences clés

| Feature | PostgreSQL | MySQL | SQLite | SQL Server | BigQuery |
|---------|-----------|-------|--------|------------|---------|
| Limite | `LIMIT n` | `LIMIT n` | `LIMIT n` | `TOP n` | `LIMIT n` |
| Date now | `NOW()` | `NOW()` | `datetime('now')` | `GETDATE()` | `CURRENT_TIMESTAMP` |
| Regex | `~` / `~*` | `REGEXP` | `LIKE` seulement | `LIKE` / `PATINDEX` | `REGEXP_CONTAINS` |
| JSON | `->` `->>`  | `JSON_EXTRACT` | `json_extract()` | `JSON_VALUE` | `JSON_EXTRACT_SCALAR` |
| ILIKE | oui | non (insensible par défaut) | non | `COLLATE` | `LOWER()` |
| CTE récursive | oui | ≥ 8.0 | ≥ 3.35 | oui | oui |

Pour MongoDB : traduire en pipeline d'agrégation (`$match` → `$group` → `$project`), pas de SQL.

---

### 9. Contexte conversationnel multi-tour

```python
class QuerySession:
    def __init__(self):
        self.history: list[dict] = []  # [{"question", "sql", "row_count", "columns"}]
        self.last_result_columns: list[str] = []
        self.last_filter: dict = {}

    def resolve_anaphora(self, question: str) -> str:
        """Remplacer 'eux', 'les mêmes', 'parmi ceux-là' par le contexte précédent."""
        if self.history and any(p in question.lower() for p in ["eux", "ceux-là", "les mêmes"]):
            last = self.history[-1]
            return f"Parmi les résultats de '{last['question']}' ({last['sql']}), {question}"
        return question
```

Passer `session_context` (sérialisé) dans chaque call et le retourner mis à jour dans l'output.

---

### 10. Génération du rapport

Retourner systématiquement :
- **explanation** : 2–3 phrases, langage métier, pas de jargon SQL
- **visualization_suggestion** : `"bar_chart"` (comparaison catégorielle), `"line_chart"` (série temporelle), `"table"` (> 5 colonnes mixtes), `"pie_chart"` (répartition ≤ 6 catégories), `"scatter"` (corrélation numérique)
- **follow_up_questions** : 2–3 questions de drill-down générées par LLM sur la base des résultats

---

## Interface contractuelle

**Input :**
```python
{
  "question": str,           # Obligatoire — NL ou SQL direct
  "schema": dict | None,     # Optionnel — inféré si absent
  "connection": {
    "db_type": str,          # "postgresql"|"mysql"|"sqlite"|"sqlserver"|"bigquery"|"mongodb"
    "host": str,
    "port": int | None,
    "database": str,
    "username": str,
    "password": str,         # Jamais loggué
    "ssl": bool              # Défaut: True
  },
  "read_only": bool,         # Défaut: True
  "max_rows": int,           # Défaut: 1000
  "timeout_s": int,          # Défaut: 30
  "session_context": dict | None,
  "explain_results": bool    # Défaut: True
}
```

**Output :**
```python
{
  "query": str,
  "results": list[dict],
  "row_count": int,
  "execution_time_s": float,
  "explanation": str,
  "stats": {"col": {"min": float, "max": float, "mean": float, "null_count": int}},
  "optimization_hints": list[str],
  "visualization_suggestion": str,
  "follow_up_questions": list[str],
  "session_context": dict,
  "errors": list[{"type": str, "message": str, "query": str}],
  "truncated": bool
}
```

**Dépendances Python :**
```
sqlalchemy>=2.0
sqlglot>=25.0
psycopg2-binary>=2.9
pymysql>=1.1
pyodbc>=5.0
pandas>=2.2
pydantic>=2.0
```

---

## Garde-fous et anti-patterns

**Ne jamais faire :**
- Concaténer des inputs utilisateur directement dans le SQL → toujours `text(:param)` + `bindparams`
- Retourner des credentials dans `errors` ou `explanation`
- Exécuter sans timeout configuré — les requêtes analytiques peuvent saturer la DB
- Ignorer `truncated=True` dans la réponse — l'agent parent doit en être informé
- Deviner une table/colonne inconnue — demander clarification ou retourner une erreur explicite

**Pièges courants :**
- `EXPLAIN ANALYZE` exécute réellement la requête sur PostgreSQL — ne l'utiliser qu'en lecture
- SQLite ne supporte pas `SET TRANSACTION READ ONLY` — utiliser un fichier en mode `uri=true&mode=ro`
- BigQuery facture à la lecture de données scannées — toujours ajouter `LIMIT` et vérifier les partitions
- Les types `DECIMAL`/`NUMERIC` Python ne sont pas sérialisables JSON nativement — convertir en `float`
- Sur SQL Server, `TOP n` doit précéder les colonnes, pas en fin de requête

**Bonnes pratiques 2026 :**
- Utiliser `sqlglot.transpile(sql, read=source_dialect, write=target_dialect)` pour la portabilité inter-SGBD
- Stocker les schémas inférés en cache (TTL 5 min) — éviter l'introspection à chaque appel
- Pour les embeddings de colonnes (sélection de tables pertinentes), utiliser un modèle léger local (`all-MiniLM-L6-v2`) plutôt qu'un appel LLM externe
- Logger le hash SHA-256 de chaque requête exécutée pour l'audit — jamais les credentials
- Tester la génération NL→SQL avec un jeu de questions de référence (golden set) avant déploiement
