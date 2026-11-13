-- Clothet: Cloud-Speicher. Einmal im Supabase-Projekt unter "SQL Editor" einfügen und ausführen.
-- Jede Zeile gehört genau einem Konto, niemand sonst kann sie lesen oder ändern.

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  value jsonb,
  deleted boolean not null default false,
  ts bigint not null,
  primary key (user_id, key)
);
alter table public.records enable row level security;
drop policy if exists "eigene Daten" on public.records;
create policy "eigene Daten" on public.records for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bilder: privater Ablageort, je Konto ein eigener Ordner
insert into storage.buckets (id, name, public) values ('clothet', 'clothet', false) on conflict (id) do nothing;
drop policy if exists "eigene Bilder" on storage.objects;
create policy "eigene Bilder" on storage.objects for all to authenticated
  using (bucket_id = 'clothet' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'clothet' and (storage.foldername(name))[1] = auth.uid()::text);
