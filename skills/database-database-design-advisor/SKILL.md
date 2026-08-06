---
name: database-database-design-advisor
description: Conception et modélisation de schémas de bases de données. Se déclenche avec "schéma base de données", "normalisation", "3NF", "database design", "modélisation relationnelle", "ERD. Also triggers on "design a database schema", "normalize my tables", "ER model".
---

# Database Design Advisor

## Workflow

### 1. Recueillir les exigences

Questions à poser systématiquement :
- Quelles sont les entités métier principales ? (ex. : Commande, Client, Produit)
- Quels sont les volumes estimés ? (lignes/table, croissance annuelle)
- Profil de charge : read-heavy, write-heavy, ou mixte ?
- Contraintes de latence ? (OLTP < 10 ms vs OLAP analytique)
- Multitenancy ? Soft delete ? Audit trail ?

### 2. Construire le modèle conceptuel (ERD)

Notation Crow's Foot recommandée. Identifier :
- Entités fortes vs entités faibles
- Cardinalités : 1:1, 1:N, N:M
- Attributs multivalués → table séparée obligatoire
- Agréger les associations N:M en entité d'association avec ses propres attributs

```
Client (1) ──────< (N) Commande (N) >──────< (N) Produit
                            |
                     LigneCommande (entité d'association)
                       quantite, prix_unitaire
```

### 3. Normalisation — critères de décision

| Forme Normale | Ce qu'elle élimine | S'arrêter ici si… |
|---|---|---|
| 1NF | Groupes répétés, attributs multivalués | Jamais en dessous |
| 2NF | Dépendances partielles (clés composites) | Table sans clé composite |
| 3NF | Dépendances transitives (A→B→C) | **Cible par défaut** |
| BCNF | Déterminants non-clés | Données très structurées |
| 4NF/5NF | Dépendances multi-valuées | Rarement nécessaire |

**Règle pratique** : viser 3NF par défaut ; BCNF si les anomalies persistent avec des clés candidates multiples.

### 4. DDL — squelette opérationnel

```sql
-- Convention : snake_case, PK surrogate, timestamps audit
CREATE TABLE client (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code_client VARCHAR(20)  NOT NULL UNIQUE,
    nom         VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE commande (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id   BIGINT       NOT NULL REFERENCES client(id),
    statut      VARCHAR(20)  NOT NULL CHECK (statut IN ('BROUILLON','VALIDEE','LIVREE','ANNULEE')),
    total_ht    NUMERIC(14,4) NOT NULL CHECK (total_ht >= 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_commande_client ON commande(client_id);
CREATE INDEX idx_commande_statut ON commande(statut) WHERE statut NOT IN ('LIVREE','ANNULEE');
```

### 5. Patterns courants — quand les appliquer

**Héritage** (entité Personne → Employe / Client) :
| Pattern | Avantage | Inconvénient | Choisir si |
|---|---|---|---|
| TPH (Table Per Hierarchy) | 1 seule table | Nombreuses colonnes NULL | Peu de sous-types |
| TPT (Table Per Type) | Pas de NULL | Jointures obligatoires | Attributs très différents |
| TPC (Table Per Concrete) | Requêtes simples | Duplication de colonnes | Pas de requête polymorphe |

**Historisation SCD** :
- Type 1 : écrasement → pas de trace (accepté pour données de référence)
- Type 2 : nouvelle ligne + `date_debut`/`date_fin` + `is_current` → audit complet
- Type 6 : combinaison 1+2+3 → complexe, réserver aux Data Warehouses

**Soft delete** :
```sql
-- Ajouter à chaque table concernée
deleted_at TIMESTAMPTZ,
deleted_by BIGINT REFERENCES utilisateur(id)
-- Index partiel pour exclure les supprimés des requêtes courantes
CREATE INDEX idx_client_actif ON client(code_client) WHERE deleted_at IS NULL;
```

**Multi-tenant** :
```sql
-- Approche shared schema (recommandée pour < 1000 tenants)
tenant_id BIGINT NOT NULL REFERENCES tenant(id)
-- Index composite : (tenant_id, clé_métier)
CREATE INDEX idx_commande_tenant ON commande(tenant_id, id);
-- RLS PostgreSQL
ALTER TABLE commande ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON commande
    USING (tenant_id = current_setting('app.tenant_id')::BIGINT);
```

### 6. Indexation — règles de décision

```
Créer un index si :
  - Colonne dans WHERE fréquent ET cardinalité > 10 valeurs distinctes
  - Clé étrangère non couverte (jointure sans index = seq scan)
  - ORDER BY / GROUP BY sur grande table

Éviter si :
  - Table < 10 000 lignes (seq scan souvent plus rapide)
  - Colonne avec < 5 valeurs distinctes (booléen, statut à 2 états)
  - Table à insert massif (chaque index ralentit les writes)

Index partiel pour tables à soft delete ou statuts actifs :
  CREATE INDEX idx_cmd_en_cours ON commande(client_id)
      WHERE statut IN ('BROUILLON','VALIDEE');
```

### 7. Dénormalisation contrôlée

Toujours documenter via un commentaire ou ADR :

```sql
-- DÉNORM: total_commande stocké en cache dans client.total_commandes_ytd
-- Raison: requête tableau de bord T+500ms → T+5ms
-- Cohérence: trigger AFTER INSERT/UPDATE/DELETE sur commande
-- Revu le: 2026-01-15 — acceptable jusqu'à 5M commandes
ALTER TABLE client ADD COLUMN total_commandes_ytd NUMERIC(16,4) NOT NULL DEFAULT 0;
```

### 8. Validation finale — checklist

- [ ] Chaque table a une PK surrogate (BIGINT ou UUID selon besoin de distribution)
- [ ] Toutes les FK ont un index couvrant
- [ ] Pas de colonnes `valeur1`, `valeur2`, `valeur3` → tableau ou table séparée
- [ ] Pas de stockage de listes CSV dans une colonne TEXT
- [ ] Contraintes CHECK sur les colonnes avec domaine fini (statuts, types)
- [ ] Colonnes `created_at` / `updated_at` présentes sur les tables métier
- [ ] DDL testé sur un jeu de données représentatif (INSERT + requêtes critiques)

---

## Anti-patterns / Pièges

| Anti-pattern | Symptôme | Correction |
|---|---|---|
| EAV (Entity-Attribute-Value) | Table `(id, attribut, valeur)` générique | JSONB ou colonnes typées selon cas |
| Clé naturelle composite | `PRIMARY KEY (pays, code_postal, rue)` | Surrogate key + contrainte UNIQUE |
| NULL ambigus | NULL = "inconnu" ET NULL = "non applicable" | Colonnes séparées ou CHECK explicite |
| Table fourre-tout | >50 colonnes, beaucoup de NULL | Décomposer en sous-entités 3NF |
| Index sur tout | >5 index par table sur OLTP | Profiler d'abord, indexer ensuite |
| ON DELETE CASCADE en cascade profonde | Suppression accidentelle en chaîne | ON DELETE RESTRICT + soft delete |
| UUID v4 comme PK sur MySQL/InnoDB | Fragmentation du B-tree → perf write | UUID v7 (monotone) ou ULID |
| Pas de partitionnement sur tables > 100M lignes | Vacuum/index rebuild trop longs | PARTITION BY RANGE(created_at) |

---

## Bonnes pratiques 2026

- **UUID v7 / ULID** : préférer aux UUID v4 pour les PKs distribuées — ordonnés dans le temps, compatibles B-tree.
- **JSONB avec schéma partiel** : stocker les attributs variables en JSONB + index GIN, mais extraire en colonne les champs interrogés fréquemment.
- **Generated columns** : calculer des colonnes dérivées côté SGBD plutôt qu'en applicatif.
- **Temporal tables** (SQL:2011, supporté PostgreSQL 16+, SQL Server 2016+) : privilégier aux patterns SCD 2 manuels pour l'historisation native.
- **Schema versioning** : versionner les migrations avec Flyway ou Liquibase dès le premier jour — jamais de DDL appliqué manuellement en prod.


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
