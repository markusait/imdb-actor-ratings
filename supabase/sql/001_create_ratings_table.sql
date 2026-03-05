create table if not exists public.ratings (
  tconst text primary key,
  rating real not null,
  votes integer not null,
  created_at timestamptz not null default now()
);

-- Keep read simple for demo mode.
alter table public.ratings enable row level security;

drop policy if exists "public read ratings" on public.ratings;
create policy "public read ratings"
on public.ratings
for select
to anon
using (true);
