---
name: sqlite-guide
description: Guide pour écrire des requêtes SQL et concevoir des schémas SQLite avec les bonnes pratiques. À utiliser quand l'utilisateur travaille avec SQLite, écrit des requêtes SQL ou conçoit des schémas de base de données. Se déclenche aussi avec "requête SQL", "schéma SQLite", "base de données SQLite", "migration SQL", "table SQLite", "query SQL". Also triggers on "SQLite schema", "SQLite query", "embedded database".
---

# Guide SQLite

## Workflow

1. **Identifier le besoin** — conception de schéma, écriture de requête, optimisation, migration ou debug.
2. **Examiner le contexte** — schéma existant, version SQLite (`sqlite3 --version`), volumes de données attendus.
3. **Choisir le pattern adapté** — voir sections ci-dessous selon le cas.
4. **Livrer du code copiable** — requêtes testables, schemas complets, commandes CLI directes.
5. **Signaler les pièges** — typage dynamique, verrouillage de fichier, absence de types natifs date/bool.

---

## Conception de schéma

### Table de référence (template)

```sql
create table users (
  id      text not null primary key default ('u_' || lower(hex(randomblob(16)))),
  created text not null default (strftime('%Y-%m-%dT%H:%M:%fZ')),
  updated text not null default (strftime('%Y-%m-%dT%H:%M:%fZ')),
  email   text not null unique,
  name    text not null,
  active  integer not null default 1   -- bool : 0/1
) strict;

create trigger users_updated
after update on users
begin
  update users set updated = strftime('%Y-%m-%dT%H:%M:%fZ')
  where id = old.id;
end;
```

### Conventions de nommage

| Élément | Convention |
|---------|-----------|
| Clé primaire | `id text` + préfixe table (`u_`, `p_`, `o_`) + `randomblob(16)` |
| Timestamps | `strftime('%Y-%m-%dT%H:%M:%fZ')` — ISO 8601 avec ms, toujours UTC |
| Booléens | `integer not null default 0` (0/1) — pas de type bool natif |
| JSON | `text` + contrainte `check(json_valid(meta))` si nécessaire |
| Clés étrangères | `user_id text not null references users(id)` |

### Activer les foreign keys (obligatoire à chaque connexion)

```sql
pragma foreign_keys = on;
```

> SQLite n'active pas les FK par défaut. À mettre dans l'initialisation de chaque connexion.

### Migrations

Toujours versionner avec une table dédiée :

```sql
create table if not exists migrations (
  version  integer primary key,
  name     text not null,
  applied  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ'))
);
```

Pattern de migration safe :

```sql
begin;
-- modification du schéma
alter table posts add column slug text;
insert into migrations(version, name) values (3, 'add_posts_slug');
commit;
```

---

## Requêtes

### Règles de base
- Écrire en minuscules — plus lisible, standard de facto.
- **Toujours nommer les colonnes** dans les `select` de production — jamais `select *`.
- Préférer les **CTEs** (`with`) aux sous-requêtes imbriquées profondes.

### CTE — lecture claire

```sql
with active_users as (
  select id, name, email
  from users
  where active = 1
),
recent_posts as (
  select author_id, count(*) as cnt
  from posts
  where created > date('now', '-30 days')
  group by author_id
)
select u.name, u.email, coalesce(rp.cnt, 0) as posts_last_30d
from active_users u
left join recent_posts rp on rp.author_id = u.id
order by posts_last_30d desc;
```

### Upsert

```sql
insert into settings (key, value)
values ('theme', 'dark')
on conflict(key) do update set
  value   = excluded.value,
  updated = strftime('%Y-%m-%dT%H:%M:%fZ');
```

### Pagination (keyset > offset pour les grands volumes)

```sql
-- Offset (simple, mais lent sur grands volumes)
select id, title, created from posts
order by created desc
limit 20 offset 40;

-- Keyset (performant, reprend après le dernier élément vu)
select id, title, created from posts
where created < '2026-06-01T12:00:00.000Z'
order by created desc
limit 20;
```

### Recherche — FTS5

```sql
-- Création de l'index virtuel
create virtual table posts_fts using fts5(
  title, body, content=posts, content_rowid=id
);

-- Indexation initiale
insert into posts_fts(posts_fts) values('rebuild');

-- Requête
select p.id, p.title, rank
from posts_fts
join posts p on p.id = posts_fts.rowid
where posts_fts match 'sqlite AND performance'
order by rank;
```

### JSON (SQLite ≥ 3.38)

```sql
-- Extraction de champ
select json_extract(meta, '$.country') as country from users;

-- Filtre sur champ JSON
select * from orders
where json_extract(payload, '$.status') = 'paid';

-- Construction
select json_object('id', id, 'name', name) from users;
```

---

## Optimisation & index

### Analyser une requête

```sql
explain query plan
select * from posts where author_id = 'u_abc' order by created desc;
```

### Créer les bons index

```sql
-- Index simple
create index idx_posts_author on posts(author_id);

-- Index composite (ordre = sélectivité décroissante)
create index idx_posts_author_created on posts(author_id, created desc);

-- Index partiel (réduit la taille de l'index)
create index idx_active_users on users(email) where active = 1;
```

### WAL mode (performances en écriture concurrente)

```sql
pragma journal_mode = wal;
pragma synchronous = normal;  -- sécurité acceptable, perf ++
```

### Statistiques

```sql
pragma table_info(posts);      -- colonnes et types
pragma index_list(posts);      -- index existants
analyze;                       -- mise à jour des stats pour l'optimiseur
```

---

## CLI SQLite — commandes utiles

```bash
# Ouvrir / créer
sqlite3 mydb.db

# Import CSV
sqlite3 mydb.db -cmd ".mode csv" ".import data.csv my_table"

# Export CSV
sqlite3 -header -csv mydb.db "select * from users;" > users.csv

# Dump SQL complet
sqlite3 mydb.db .dump > backup.sql

# Exécuter un fichier SQL
sqlite3 mydb.db < schema.sql
```

---

## Garde-fous & anti-patterns

| Anti-pattern | Problème | Solution |
|---|---|---|
| `select *` en production | Casse si colonnes ajoutées, lisibilité zéro | Nommer explicitement les colonnes |
| Table sans `strict` | SQLite accepte n'importe quel type — bugs silencieux | Toujours `strict` |
| `offset` sur grande table | O(n) — ralentit proportionnellement | Keyset pagination |
| `like '%terme%'` sur gros volumes | Full scan | FTS5 |
| FK sans `pragma foreign_keys = on` | Contraintes ignorées silencieusement | Activer à chaque connexion |
| Timestamps avec `datetime()` | Moins précis que `strftime` (pas de ms) | `strftime('%Y-%m-%dT%H:%M:%fZ')` |
| Connexions multiples en écriture sans WAL | Contention — `SQLITE_BUSY` fréquents | `pragma journal_mode = wal` |
| Migrations manuelles non versionnées | Impossible de rejouer ou auditer | Table `migrations` + transactions |
| Booléens en `text` (`'true'`/`'false'`) | Comparaisons cassées | `integer` 0/1 |

---

## Critères de décision rapides

- **SQLite ou autre SGBD ?** — SQLite est idéal pour : applications embarquées, mobile, desktop, prototypes, fichiers de données locaux, tests. Passer à Postgres/MySQL si : accès concurrent massif en écriture, réseau multi-clients, réplication, extensions spécialisées.
- **FTS5 ou `like` ?** — Dès que la table dépasse ~10k lignes ou que la recherche est fonctionnelle, FTS5.
- **WAL ou DELETE mode ?** — WAL par défaut pour toute app avec lectures et écritures simultanées.
- **Index composite ou multiple ?** — Composite si la requête filtre sur plusieurs colonnes ensemble (respecter l'ordre de la clause `where`).
