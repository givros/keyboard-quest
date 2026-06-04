# Configuration Supabase pour Clavier Quest

Projet Supabase utilise :

- Project ID : `xyckwwhcwfsywvmomevb`
- API URL : `https://xyckwwhcwfsywvmomevb.supabase.co`
- Table unique : `keyboard_quest_scores`

Objectif :

- un eleve entre son pseudo ;
- une ligne est creee ou mise a jour dans Supabase avec son score ;
- `scores.html` relit la table automatiquement toutes les 3 secondes ;
- le bouton `Vider les scores` supprime toutes les lignes de la table.

## 1. Creer la table unique

Dans Supabase, ouvre `SQL Editor`, puis colle et execute ce script :

```sql
create extension if not exists pgcrypto;

create table if not exists public.keyboard_quest_scores (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  nickname text not null,
  total integer not null default 0,
  last_game text not null default '',
  cooldowns jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (player_id)
);

alter table public.keyboard_quest_scores enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.keyboard_quest_scores to anon;

drop policy if exists "keyboard quest read scores" on public.keyboard_quest_scores;
drop policy if exists "keyboard quest insert scores" on public.keyboard_quest_scores;
drop policy if exists "keyboard quest update scores" on public.keyboard_quest_scores;
drop policy if exists "keyboard quest delete scores" on public.keyboard_quest_scores;

create policy "keyboard quest read scores"
on public.keyboard_quest_scores
for select
to anon
using (true);

create policy "keyboard quest insert scores"
on public.keyboard_quest_scores
for insert
to anon
with check (true);

create policy "keyboard quest update scores"
on public.keyboard_quest_scores
for update
to anon
using (true)
with check (true);

create policy "keyboard quest delete scores"
on public.keyboard_quest_scores
for delete
to anon
using (true);
```

## 2. Configuration deja pre-remplie

La configuration est dans `src/score-config.js`.

Elle utilise :

```js
provider: "supabase",
url: "https://xyckwwhcwfsywvmomevb.supabase.co",
anonKey: "sb_publishable_7_MeeyNGPOb3WoS5nxPktw_PDjiCYdx",
table: "keyboard_quest_scores",
pollMs: 3000,
```

## 3. Utilisation en classe

- Les eleves ouvrent `index.html`.
- Quand ils valident leur pseudo, une ligne est enregistree dans Supabase.
- Quand ils gagnent ou perdent des points, cette ligne est mise a jour.
- La page score s'ouvre avec `scores.html`.
- `scores.html` relit Supabase toutes les 3 secondes.
- Le bouton `Vider les scores` supprime toutes les donnees de score.

Comme il n'y a pas de connexion enseignant, le bouton de reset n'est pas protege. Ne partage pas `scores.html` aux eleves.
