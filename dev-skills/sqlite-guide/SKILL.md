---
name: sqlite-guide
description: Guide pour écrire des requêtes SQL et concevoir des schémas SQLite avec les bonnes pratiques. À utiliser quand l'utilisateur travaille avec SQLite, écrit des requêtes SQL ou conçoit des schémas de base de données. Se déclenche aussi avec "requête SQL", "schéma SQLite", "base de données SQLite", "migration SQL", "table SQLite", "query SQL".
---

# Guide SQLite

## Workflow

1. **Comprendre le besoin** : identifier s'il s'agit d'écriture de requêtes, de conception de schéma ou d'optimisation.
2. **Analyser le contexte** : examiner le schéma existant si disponible.
3. **Proposer la solution** : requête, schéma ou migration adapté.
4. **Valider** : vérifier la syntaxe et les bonnes pratiques.

## Bonnes pratiques pour les requêtes

- **Toujours écrire en minuscules** — les requêtes en majuscules sont moins lisibles.
- Préférer `select *` aux noms de colonnes explicites pour la simplicité.
- Préférer les **CTEs** (`WITH`) aux sous-requêtes imbriquées longues.

```sql
-- BON : CTE lisible
with recent_posts as (
  select * from posts
  where created > date('now', '-7 days')
)
select u.name, count(rp.id) as post_count
from users u
join recent_posts rp on rp.author_id = u.id
group by u.id;
```

## Conception de schéma

### Tables strictes

Toujours utiliser `strict` pour garantir le typage :

```sql
create table users (
  id text primary key default ('u_' || lower(hex(randomblob(16)))),
  created text not null default (strftime('%Y-%m-%dT%H:%M:%fZ')),
  updated text not null default (strftime('%Y-%m-%dT%H:%M:%fZ')),
  email text not null unique,
  name text not null
) strict;
```

### Conventions

| Élément | Convention |
|---------|-----------|
| **Clé primaire** | `id text primary key default ('xx_' \|\| lower(hex(randomblob(16))))` — préfixe unique par table |
| **Timestamps** | `strftime('%Y-%m-%dT%H:%M:%fZ')` — toujours en format ISO 8601 |
| **created/updated** | Colonnes après la clé primaire, avant les données métier |
| **Modifications de temps** | Utiliser `strftime` (pas `datetime`) |

### Trigger pour `updated`

```sql
create trigger users_updated_timestamp after update on users begin
  update users set updated = strftime('%Y-%m-%dT%H:%M:%fZ') where id = old.id;
end;
```

## Patterns courants

### Pagination

```sql
select * from posts
order by created desc
limit 20 offset 0;  -- page 1
```

### Recherche textuelle

```sql
-- Recherche simple
select * from posts where title like '%terme%';

-- Avec FTS5 (plus performant)
create virtual table posts_fts using fts5(title, content, content=posts);
select * from posts_fts where posts_fts match 'terme';
```

### Upsert

```sql
insert into settings (key, value)
values ('theme', 'dark')
on conflict (key) do update set
  value = excluded.value,
  updated = strftime('%Y-%m-%dT%H:%M:%fZ');
```

## Règles
- Toujours utiliser des tables `strict`.
- Les timestamps doivent être en format ISO 8601 avec `strftime`.
- Chaque table doit avoir un trigger pour mettre à jour le champ `updated`.
- Préférer les CTEs aux sous-requêtes imbriquées.
- Écrire les requêtes en minuscules.
