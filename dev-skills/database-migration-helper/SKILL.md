---
name: database-migration-helper
description: Gestion des migrations de bases de données et changements de schéma avec stratégies zero-downtime, rollback et data migration. Se déclenche avec "migration", "database migration", "changer le schéma", "EF migrations", "Flyway", "Liquibase", "ALTER TABLE", "zero downtime migration". Also triggers on "schema change", "zero-downtime migration".
---

# Database Migration Helper

## 1. Qualifier le changement

Avant tout, caractériser l'opération :

| Type | Risque | Stratégie recommandée |
|---|---|---|
| Ajout colonne nullable | Faible | Migration directe |
| Ajout colonne NOT NULL sans default | Élevé | Expand-contract obligatoire |
| Renommage colonne/table | Élevé | Alias + expand-contract |
| Suppression colonne/table | Élevé | Phase contract après code nettoyé |
| Changement de type | Élevé | Colonne intermédiaire + backfill |
| Ajout index (grande table) | Moyen | Index CONCURRENTLY / online |
| Data migration (backfill) | Variable | Batches, jamais full-table en une passe |

---

## 2. Choisir la stratégie

### Expand-Contract (zero-downtime, recommandé pour prod)
Trois phases déployées séparément :
1. **Expand** — ajouter la nouvelle colonne/table, sans toucher à l'ancienne.
2. **Migrate** — double-écriture dans le code, backfill des données existantes.
3. **Contract** — supprimer l'ancienne colonne/table une fois le code nettoyé déployé.

### Migration avec fenêtre de maintenance
Acceptable uniquement si : trafic < 100 rps OU table < 100k lignes OU downtime explicitement accepté par le métier.

### Blue-Green
Maintenir deux environnements avec bascule DNS/load-balancer. Adapté aux changements majeurs de schéma impossibles à rendre backward-compatible.

---

## 3. Écrire la migration selon l'outil

### EF Core (C#)
```bash
dotnet ef migrations add AddUserEmailIndex --project src/Infrastructure
dotnet ef database update --connection "Server=...;Database=...;"
# Rollback vers migration précédente
dotnet ef database update NomMigrationPrecedente
```
```csharp
// Migration générée — toujours vérifier le SQL produit
protected override void Up(MigrationBuilder mb)
{
    mb.AddColumn<string>("email_verified", "users", nullable: true);
    mb.CreateIndex("IX_users_email", "users", "email", unique: true);
}
protected override void Down(MigrationBuilder mb)
{
    mb.DropIndex("IX_users_email", "users");
    mb.DropColumn("email_verified", "users");
}
```

### Flyway (SQL versionné)
```
db/migration/
  V1__create_users.sql
  V2__add_email_verified.sql
  V20260624_001__backfill_email.sql   # préfixe date pour éviter conflits
```
```bash
flyway -url=jdbc:postgresql://host/db -user=x -password=y migrate
flyway info        # état des migrations
flyway repair      # si checksum corrompu
```

### Liquibase
```yaml
# changelog-v3.yaml
databaseChangeLog:
  - changeSet:
      id: add-email-verified
      author: k.benazzouz
      changes:
        - addColumn:
            tableName: users
            columns:
              - column:
                  name: email_verified
                  type: boolean
                  defaultValueBoolean: false
      rollback:
        - dropColumn:
            tableName: users
            columnName: email_verified
```

### Alembic (Python)
```bash
alembic revision --autogenerate -m "add_email_verified"
alembic upgrade head
alembic downgrade -1   # rollback d'une révision
```

### SQL brut versionné
Nommage : `V<YYYYMMDD>_<NNN>__<description>.sql` + script `rollback/R<YYYYMMDD>_<NNN>__<description>.sql` obligatoire.

---

## 4. Backfill de données existantes (batches)

Ne jamais backfiller une grande table en une seule transaction — risque de lock prolongé et timeout.

```sql
-- PostgreSQL / SQL Server : backfill par batch de 10 000 lignes
DO $$
DECLARE
  last_id BIGINT := 0;
  batch   BIGINT := 10000;
BEGIN
  LOOP
    UPDATE users
    SET email_verified = false
    WHERE id > last_id AND id <= last_id + batch
      AND email_verified IS NULL;
    EXIT WHEN NOT FOUND;
    last_id := last_id + batch;
    PERFORM pg_sleep(0.1);  -- respiration entre batches
  END LOOP;
END $$;
```

```sql
-- SQL Server : même principe avec TOP
DECLARE @batch INT = 10000;
WHILE 1=1
BEGIN
  UPDATE TOP (@batch) users
  SET email_verified = 0
  WHERE email_verified IS NULL;
  IF @@ROWCOUNT = 0 BREAK;
  WAITFOR DELAY '00:00:00.100';
END
```

---

## 5. Grandes tables — opérations online

### PostgreSQL
```sql
-- Index sans lock table (peut prendre du temps, c'est voulu)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
-- Contrainte NOT NULL sans réécriture complète (PG 12+)
ALTER TABLE users ALTER COLUMN email SET NOT NULL; -- rapide si CHECK déjà validé
ALTER TABLE users ADD CONSTRAINT chk_email_notnull CHECK (email IS NOT NULL) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT chk_email_notnull; -- scan en arrière-plan
```

### MySQL
```bash
# pt-online-schema-change (Percona Toolkit) — pas de lock table
pt-online-schema-change --alter "ADD COLUMN email_verified TINYINT(1) DEFAULT 0" \
  D=mydb,t=users --execute
# gh-ost (GitHub) — alternative sans triggers
gh-ost --database mydb --table users \
  --alter "ADD COLUMN email_verified TINYINT(1) DEFAULT 0" \
  --execute
```

---

## 6. Tester avant production

```bash
# Dump anonymisé de prod vers staging
pg_dump prod_db | psql staging_db
# Mesurer la durée réelle
\timing on   -- psql
# Détecter les locks
-- PostgreSQL
SELECT pid, query, wait_event_type, wait_event FROM pg_stat_activity WHERE wait_event IS NOT NULL;
-- SQL Server
SELECT * FROM sys.dm_exec_requests WHERE blocking_session_id <> 0;
# Valider le plan post-migration
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'test@test.com';
```

Checklist staging :
- [ ] Durée d'exécution mesurée sur volume réaliste
- [ ] Aucun lock bloquant > 5 s
- [ ] Rollback testé et fonctionnel
- [ ] Contraintes et index vérifiés (`\d+ tablename` en psql, `sp_help` en SQL Server)
- [ ] Application validée fonctionnellement après migration

---

## 7. Rollback strategy

- **EF Core** : `dotnet ef database update <PreviousMigration>`
- **Flyway** : écrire `U2__undo_add_email_verified.sql` (Flyway Pro) ou script manuel
- **Liquibase** : `liquibase rollbackCount 1` ou `rollbackToDate`
- **SQL brut** : script `R_<version>__rollback.sql` toujours en binôme avec le script Up
- Snapshot DB avant migration sur prod (RDS automated backup, Azure point-in-time restore)

---

## 8. Garde-fous et anti-patterns

**Ne jamais faire :**
- `ALTER TABLE` bloquant sur table > 500k lignes en heures de pointe.
- Supprimer une colonne/table sans vérifier que TOUT le code ne l'utilise plus (y compris BI, jobs, legacy services).
- Écrire des migrations non idempotentes (`IF NOT EXISTS` manquant → crash à la re-exécution).
- Modifier une migration déjà appliquée en prod (casse les checksums Flyway/EF).
- Backfill en une seule transaction sur millions de lignes.
- Déployer code et migration dans le même release sans ordre défini.

**Toujours faire :**
- Ordonner : migration d'abord (backward compatible), code ensuite ; puis nettoyage contract.
- Versionner les migrations avec le code source dans le même repo, même PR.
- Logger la durée et l'issue de chaque migration en prod (table `migration_log` ou outil dédié).
- Prévoir une alerte monitoring post-migration (latence, erreurs applicatives).
