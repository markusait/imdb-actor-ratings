# Supabase + TMDB (Tom Hanks Demo) Setup

This config enables a Render-safe backend mode with no Playwright.

## 1) Create Supabase table

Run this SQL in Supabase SQL editor:

```sql
create table if not exists public.ratings (
  tconst text primary key,
  rating real not null,
  votes integer not null
);
```

Optional read policy (if you want anonymous reads later):

```sql
alter table public.ratings enable row level security;

create policy "public read ratings"
on public.ratings
for select
to anon
using (true);
```

## 2) Local one-time seed for Tom Hanks only

Prereqs:
- `TMDB_API_KEY` set
- `SUPABASE_URL` set
- one Supabase key set: `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` or `SUPABASE_KEY`
- local file exists: `imdb/title.ratings.tsv.gz`

Run:

```bash
cd /Users/markus/Code/imdb-actor-ratings
bun run seed:tomhanks-supabase
```

This script:
1. fetches Tom Hanks movie credits from TMDB
2. fetches TMDB external IMDb IDs
3. matches those IDs in local `title.ratings.tsv.gz`
4. upserts matched rows into `public.ratings`

Script file:
- `/Users/markus/Code/imdb-actor-ratings/scripts/seed_tom_hanks_supabase.mjs`

## 3) Render env vars

Set these on your Render service:

- `BACKEND_MODE=tmdb-supabase-tomhanks`
- `TMDB_API_KEY=...`
- `SUPABASE_URL=https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=...` (or `SUPABASE_SECRET_KEY` / `SUPABASE_KEY`)
- `SUPABASE_RATINGS_TABLE=ratings` (optional; default is `ratings`)
- `TMDB_CREDITS_LIMIT=60` (optional)

## 4) Behavior in this mode

- `actor.search` returns only Tom Hanks when query matches `tom`/`hanks`.
- `actor.ratings` accepts only `nm0000158`.
- Ratings are fetched from Supabase by IMDb `tconst`.
- No Playwright path is used in this mode.
