---
name: data-analyst-agent
description: Création d'agents d'analyse de données qui explorent, visualisent et expliquent les données. Se déclenche avec "data analyst agent", "agent analyse données", "agent data", "agent qui analyse", "automated analysis", "data exploration agent", "agent SQL", "agent pandas".
---

# Data Analyst Agent

## Quand utiliser ce skill

Pour construire un agent capable d'analyser des données de manière autonome :
connexion à une source (SQL, CSV, API), exploration du schéma, génération de requêtes en langage naturel, visualisations, rapport narratif avec insights actionnables.

**Cas d'usage typiques** : tableaux de bord conversationnels, assistants BI no-code, pipelines d'analyse automatisée, audit qualité de données.

**Critères de choix d'architecture** :

| Besoin | Architecture |
|---|---|
| Questions ponctuelles en temps réel | Event-driven (question → réponse) |
| Analyse récurrente planifiée | Pipeline batch avec scheduler |
| Dataset > 10 GB | Pousser le compute vers la DB (SQL-first) |
| Dataset < 500 MB | Pandas in-memory |

---

## Workflow

### 1. Définir les modules de l'agent

Quatre modules obligatoires :
- **NL Interface** : LLM + prompt engineering (question → intent → code)
- **Data Connectors** : SQL, fichiers, APIs, cloud storage
- **Code Kernel** : exécution sécurisée pandas/SQL
- **Reporting** : visualisation + rapport narratif

### 2. Implémenter les connecteurs de données

```python
# SQL — SQLAlchemy (PostgreSQL, MySQL, SQLite, BigQuery, MSSQL)
from sqlalchemy import create_engine, inspect, text

engine = create_engine("postgresql://user:pass@host/db")
inspector = inspect(engine)

# Générer le metadata store à la connexion
schema = {
    table: {
        "columns": inspector.get_columns(table),
        "pk": inspector.get_pk_constraint(table),
        "fk": inspector.get_foreign_keys(table),
    }
    for table in inspector.get_table_names()
}

# Read-only : toujours ouvrir en mode lecture
with engine.connect() as conn:
    conn.execute(text("SET TRANSACTION READ ONLY"))
```

```python
# Fichiers
import pandas as pd
df = pd.read_csv("data.csv", parse_dates=True, low_memory=False)
df = pd.read_excel("data.xlsx", sheet_name=0)

# API REST
import httpx
resp = httpx.get("https://api.example.com/data", headers={"Authorization": f"Bearer {token}"})
df = pd.DataFrame(resp.json()["data"])
```

### 3. Data profiling automatique à la connexion

Exécuter immédiatement après la connexion — sortie JSON, jamais de données brutes.

```python
def profile_dataframe(df: pd.DataFrame) -> dict:
    return {
        "shape": df.shape,
        "dtypes": df.dtypes.astype(str).to_dict(),
        "missing_pct": (df.isnull().mean() * 100).round(2).to_dict(),
        "nunique": df.nunique().to_dict(),
        "stats": df.describe(include="all").round(3).to_dict(),
        "sample": df.head(5).to_dict(orient="records"),
    }
```

Seuils d'alerte automatiques :
- Colonnes avec > 20 % de valeurs manquantes → signaler
- Colonnes avec une seule valeur unique → inutiles, mentionner
- Lignes dupliquées > 1 % → avertir avant toute agrégation

### 4. Génération NL → SQL / Pandas

**SQL** : injecter le schéma complet dans le prompt, jamais de schéma partiel.

```python
system_prompt = f"""
Tu es un analyste SQL expert. Schéma de la base :
{json.dumps(schema, ensure_ascii=False, indent=2)}

Règles :
- Génère UNIQUEMENT des SELECT (pas de DML/DDL)
- Limite toujours à LIMIT 10000
- Explique la requête en une phrase simple en français
- Si la question est ambiguë, demande une clarification avant de générer
"""
```

**Pandas** : fournir df.dtypes et df.head(3) dans le prompt.

```python
pandas_prompt = f"""
DataFrame disponible (df) :
Colonnes : {df.dtypes.to_dict()}
Aperçu :
{df.head(3).to_string()}

Génère le code pandas pour : {user_question}
Utilise uniquement les colonnes existantes. Termine par print(result).
"""
```

**Validation avant exécution** :
1. Parse syntaxique (sqlparse pour SQL, ast.parse() pour Python)
2. Vérification des noms de tables/colonnes contre le schéma
3. Blocage des mots-clés DDL/DML (DROP, INSERT, UPDATE, DELETE, ALTER)

### 5. Choix automatique du type de visualisation

```python
def select_chart_type(df: pd.DataFrame, x: str, y: str) -> str:
    if pd.api.types.is_datetime64_any_dtype(df[x]):
        return "lineplot"      # série temporelle
    if df[x].nunique() <= 15:
        return "barplot"       # catégorielle basse cardinalité
    if pd.api.types.is_numeric_dtype(df[x]) and pd.api.types.is_numeric_dtype(df[y]):
        return "scatter"       # corrélation numérique
    return "histogram"         # distribution par défaut
```

Librairies recommandées :
- **Plotly Express** (interactif, web) — préféré en 2026
- **Seaborn / Matplotlib** (statique, rapports PDF)
- **Altair** (déclaratif, idéal pour petits datasets)

```python
import plotly.express as px
fig = px.bar(df, x="categorie", y="ventes", title="Ventes par catégorie",
             labels={"ventes": "Ventes (€)", "categorie": "Catégorie"})
fig.write_html("chart.html")
```

### 6. Génération d'insights statistiques

```python
import numpy as np
from scipy import stats

# Détection d'anomalies — z-score
def detect_anomalies_zscore(df, col, threshold=3.0):
    z = np.abs(stats.zscore(df[col].dropna()))
    return df[z > threshold]

# Tendance sur série temporelle — régression linéaire
from sklearn.linear_model import LinearRegression
def compute_trend(df, date_col, value_col):
    df = df.sort_values(date_col)
    X = np.arange(len(df)).reshape(-1, 1)
    y = df[value_col].values
    model = LinearRegression().fit(X, y)
    return {"slope": model.coef_[0], "r2": model.score(X, y)}

# Corrélation avec significativité
def correlate(df, col_a, col_b):
    r, p = stats.pearsonr(df[col_a].dropna(), df[col_b].dropna())
    return {"r": round(r, 3), "p_value": round(p, 4), "significant": p < 0.05}
```

Tout insight doit mentionner : taille de l'échantillon, p-value si test statistique, biais potentiel.

### 7. Mémoire de session et drill-down

```python
session = {
    "history": [],       # [(question, sql_or_code, result_summary)]
    "last_df": None,     # dernier DataFrame résultat
    "filters_active": {},# filtres appliqués
}

# Après chaque réponse, proposer 2-3 questions de suivi pertinentes
followup_prompt = f"""
L'utilisateur vient de demander : {question}
Résultat : {summary}
Propose 3 questions de suivi pertinentes, courtes, en français.
"""
```

### 8. Rapport final structuré

Structure obligatoire :

```
1. Executive Summary (3-5 bullets, chiffres clés)
2. Méthodologie (source, période, transformations appliquées, exclusions)
3. Findings (insights classés par impact estimé, graphiques intégrés)
4. Recommandations actionnables (formulées en verbes d'action)
5. Limites et caveats (qualité des données, biais, lacunes)
```

Export :
```python
# Markdown
report.to_markdown("report.md")
# HTML standalone avec graphiques Plotly intégrés
report.to_html("report.html", include_plotlyjs="cdn")
```

### 9. Sécurité et gouvernance

- **Read-only strict** : engine sans droits DML, transactions READ ONLY
- **Masquage PII** : regex sur emails, téléphones, IBAN avant tout affichage
- **Sandboxing** : exécuter le code généré dans E2B ou un subprocess limité (`timeout=30s`, `max_memory=512MB`)
- **Audit log** : chaque requête horodatée avec user_id, requête, nb lignes retournées
- **Limite d'extraction** : jamais plus de 10 000 lignes retournées à l'agent ; agrégation côté DB

```python
import re
def mask_pii(text: str) -> str:
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL]', text)
    text = re.sub(r'\b(\+?216|0)[0-9]{8}\b', '[PHONE]', text)
    return text
```

### 10. Stack recommandée (2026)

| Couche | Outils recommandés |
|---|---|
| Orchestration agent | LangChain SQL Agent, LlamaIndex, Pydantic AI |
| Exécution code sécurisée | E2B Code Interpreter, Daytona sandboxes |
| Profiling automatique | `ydata-profiling`, `great_expectations` |
| Visualisation | Plotly Express, Evidence.dev |
| Dashboard conversationnel | Streamlit, Gradio, Chainlit |
| Monitoring qualité données | Great Expectations, Soda Core |

---

## Anti-patterns et pièges

- **Injecter trop de données dans le prompt** : passer uniquement le schéma et un aperçu (head 3), jamais le DataFrame complet.
- **Exécuter sans validation** : toujours parser et vérifier les noms de colonnes/tables avant d'exécuter — une erreur d'exécution coupe la session.
- **Présenter un chiffre sans contexte** : tout KPI doit avoir une comparaison (période précédente, benchmark, cible).
- **Confondre corrélation et causalité** : signaler explicitement quand une corrélation est détectée sans relation causale établie.
- **Ignorer la cardinalité des clés de jointure** : toujours vérifier les doublons avant un JOIN — explosion silencieuse de lignes possible.
- **Conclusions sur petits échantillons** : bloquer les tests statistiques si n < 30, avertir si n < 100.
- **Oublier les fuseaux horaires** : normaliser toutes les dates en UTC dès le chargement.

```python
# Normalisation UTC obligatoire
df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
```

---

## Bonnes pratiques 2026

- Utiliser **Pydantic** pour valider la sortie structurée de l'agent (schéma JSON de l'insight) avant de l'afficher.
- Implémenter un **fallback gracieux** : si la requête générée échoue, retourner l'erreur et demander une reformulation, ne pas planter.
- **Versionner le schéma de données** : stocker le metadata store daté — permet de détecter les breaking changes de schéma.
- Pour les LLMs en 2026 : préférer des modèles avec **function calling natif** pour la génération SQL/Pandas (moins d'hallucinations de colonnes).
- Monitorer le **token usage** par session : les schémas lourds peuvent saturer la context window — compresser le schéma si > 100 tables.
