---
name: data-analyst-agent
description: Création d'agents d'analyse de données qui explorent, visualisent et expliquent les données. Se déclenche avec "data analyst agent", "agent analyse données", "agent data", "agent qui analyse", "automated analysis", "data exploration agent", "agent SQL", "agent pandas".
---

# Data Analyst Agent

## Quand utiliser ce skill

Utilise ce skill pour construire un agent capable d'analyser des données de manière autonome : se connecter à une source de données (SQL, CSV, API), explorer le schéma, générer des requêtes ou des opérations pandas en langage naturel, produire des visualisations et rédiger un rapport narratif avec les insights clés. Idéal pour des tableaux de bord conversationnels, des assistants BI ou des pipelines d'analyse automatisée.

## Workflow

1. **Architecture générale** — Définis les quatre modules : (a) interface langage naturel (LLM + prompt engineering), (b) data connectors (SQL, fichiers, APIs), (c) code interpreter / kernel d'exécution (pandas, SQL engine), (d) moteur de visualisation et de reporting. Choisis entre architecture event-driven (questions ponctuelles) ou pipeline batch (analyse automatisée récurrente).

2. **Data connectors** — Implémente des connecteurs pour les sources principales : bases SQL (SQLAlchemy pour PostgreSQL, MySQL, SQLite, BigQuery), fichiers CSV/Excel (`pandas.read_csv`, `openpyxl`), APIs REST (avec authentification OAuth/API key), cloud storage (S3, GCS via `boto3`/`google-cloud-storage`). Valide le schéma à la connexion et génère un metadata store.

   ```python
   from sqlalchemy import create_engine, inspect
   engine = create_engine("postgresql://user:pass@host/db")
   inspector = inspect(engine)
   tables = inspector.get_table_names()
   columns = {t: inspector.get_columns(t) for t in tables}
   ```

3. **Exploration automatique (data profiling)** — À la connexion, l'agent exécute automatiquement : comptage de lignes/colonnes, types de données, valeurs manquantes (%), statistiques descriptives (mean, std, min, max, quartiles), distributions, valeurs uniques pour les catégorielles, et corrélations entre variables numériques. Génère un profil de données JSON enrichi.

4. **Query generation (NL → SQL / Pandas)** — Traduit les questions en langage naturel en code exécutable. Pour SQL : utilise un prompt avec le schéma injecté, génère la requête, l'explique en français, l'exécute. Pour pandas : génère des opérations chainées avec commentaires. Implémente une validation syntaxique avant exécution et une limite de lignes retournées (max 10k).

   ```python
   # Exemple de prompt NL→SQL
   prompt = f"""Schéma de la base : {schema_json}
   Question : {user_question}
   Génère une requête SQL PostgreSQL valide et explique-la en une phrase."""
   ```

5. **Visualisation intelligente** — Sélectionne automatiquement le type de graphique selon la nature des données : barplot pour les comparaisons catégorielles, lineplot pour les séries temporelles, scatter pour les corrélations, heatmap pour les matrices de corrélation, histogram pour les distributions. Génère les visualisations avec `matplotlib`/`seaborn` ou `plotly` (interactif). Titre, axes et légendes automatiques en français.

6. **Génération d'insights** — Au-delà des chiffres, l'agent produit une analyse narrative : détection de tendances (régressions linéaires simples, moving averages), détection d'anomalies (z-score, IQR method), tests de significativité statistique (t-test, chi-carré), identification des top/bottom performers. Classe les insights par importance estimée.

   ```python
   import numpy as np
   from scipy import stats
   # Détection d'anomalies par z-score
   z_scores = np.abs(stats.zscore(df[numeric_col]))
   anomalies = df[z_scores > 3]
   ```

7. **Analyse itérative et drill-down** — L'agent maintient un contexte de session : chaque réponse peut être suivie d'une question de suivi ("pourquoi ?", "détaille pour la région X", "compare avec l'année dernière"). Implémente un mécanisme de mémoire de session avec les dernières requêtes exécutées et les résultats. Propose proactivement des questions de suivi pertinentes.

8. **Génération de rapport automatique** — Produit un rapport structuré : (a) executive summary (3-5 bullet points des insights majeurs), (b) méthodologie (données utilisées, période, transformations), (c) findings détaillés avec visualisations intégrées, (d) recommandations actionnables, (e) limites et caveats. Exporte en Markdown, HTML ou PPTX selon le besoin.

9. **Sécurité et gouvernance des données** — Implémente des contrôles : authentification et gestion des droits d'accès par source de données, détection et masquage des PII (emails, téléphones, numéros de carte), sandboxing des requêtes SQL (no DDL/DML, read-only mode), limitation du volume de données extractibles, audit log de toutes les requêtes. Conforme RGPD.

10. **Tools et frameworks recommandés** — Pour l'exécution de code : [E2B Code Interpreter](https://e2b.dev/), OpenAI Code Interpreter, Jupyter kernel via `jupyter_client`. Pour l'orchestration : [LangChain SQL Agent](https://python.langchain.com/), [LlamaIndex](https://llamaindex.ai/). Pour les dashboards : [Streamlit](https://streamlit.io/), [Gradio](https://gradio.app/). Pour le profiling : `ydata-profiling` (ex-pandas-profiling).

## Règles

- **Toujours expliquer le code généré** : chaque requête SQL ou opération pandas produite par l'agent doit être accompagnée d'une explication en français compréhensible par un non-technicien.
- **Valider avant d'exécuter** : toute requête générée doit passer une validation syntaxique et sémantique (vérification que les tables/colonnes référencées existent) avant exécution pour éviter les erreurs inutiles.
- **Limiter l'exposition des données** : en production, n'affiche jamais de données brutes en masse dans les réponses. Agrège, anonymise, ou limite à des échantillons représentatifs (max 50 lignes affichées).
- **Contextualiser les métriques** : ne pas présenter un chiffre isolé sans contexte. Toujours accompagner d'une comparaison (vs. période précédente, vs. moyenne, vs. cible), d'une tendance et d'une interprétation.
- **Fiabilité des insights** : indiquer systématiquement le niveau de confiance statistique des insights générés (taille de l'échantillon, p-value si test statistique, biais potentiels des données source). Évite les conclusions hâtives sur de petits échantillons.
