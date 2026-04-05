---
name: data-quality-checker
description: Vérification de la qualité des données — complétude, cohérence, unicité, validité et fraîcheur. À utiliser quand l'utilisateur doit valider des données, détecter des anomalies ou mettre en place des contrôles qualité sur des pipelines de données. Se déclenche aussi avec "qualité des données", "data quality", "données manquantes", "doublons", "validation de données", "anomalie données", "contrôle qualité data".
---

# Vérificateur de Qualité des Données

## Workflow

1. **Profiler** : explorer les données pour comprendre la distribution et les patterns.
2. **Définir les règles** : complétude, unicité, validité, cohérence, fraîcheur.
3. **Implémenter les checks** : requêtes SQL ou framework de validation.
4. **Alerter** : notifier quand un seuil de qualité est dépassé.

## Dimensions de la qualité

| Dimension | Question | Exemple de check |
|-----------|----------|-----------------|
| **Complétude** | Y a-t-il des valeurs manquantes ? | `WHERE column IS NULL` |
| **Unicité** | Y a-t-il des doublons ? | `GROUP BY ... HAVING COUNT > 1` |
| **Validité** | Les valeurs respectent-elles le format ? | Regex, plages de valeurs |
| **Cohérence** | Les données sont-elles cohérentes entre tables ? | Jointures orphelines |
| **Fraîcheur** | Les données sont-elles à jour ? | `MAX(updated_at)` vs maintenant |
| **Exactitude** | Les données reflètent-elles la réalité ? | Comparaison avec source de vérité |

## Checks SQL essentiels

### Complétude

```sql
-- Taux de nullité par colonne
SELECT
    'email' AS column_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(100.0 * SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) AS null_pct
FROM customers
UNION ALL
SELECT 'phone', COUNT(*), SUM(CASE WHEN phone IS NULL THEN 1 ELSE 0 END),
    ROUND(100.0 * SUM(CASE WHEN phone IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM customers;
```

### Unicité

```sql
-- Détecter les doublons
SELECT email, COUNT(*) AS occurrences
FROM customers
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;
```

### Validité

```sql
-- Valeurs hors plage
SELECT * FROM orders
WHERE amount <= 0
   OR amount > 1000000
   OR order_date > CURRENT_DATE
   OR status NOT IN ('pending', 'processing', 'completed', 'cancelled');
```

### Cohérence

```sql
-- Orphelins : commandes sans client valide
SELECT o.order_id, o.customer_id
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE c.id IS NULL;
```

### Fraîcheur

```sql
-- Données périmées
SELECT
    'orders' AS table_name,
    MAX(updated_at) AS last_update,
    EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) / 3600 AS hours_since_update
FROM orders
HAVING EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) / 3600 > 24;
```

## Framework de validation (Python / Great Expectations)

```python
import great_expectations as gx

context = gx.get_context()
suite = context.add_expectation_suite("orders_quality")

# Complétude
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToNotBeNull(column="customer_id")
)

# Unicité
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeUnique(column="order_id")
)

# Validité
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeBetween(
        column="amount", min_value=0.01, max_value=999999.99
    )
)

# Volume
suite.add_expectation(
    gx.expectations.ExpectTableRowCountToBeBetween(
        min_value=1000, max_value=10000000
    )
)
```

## Règles
- Chaque pipeline de données doit avoir des **checks de qualité automatisés**.
- Définir des **seuils d'alerte** (warning) et de **blocage** (error) distincts.
- Les checks doivent être **documentés** avec leur justification métier.
- Monitorer l'évolution de la qualité dans le temps (tendances).


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
