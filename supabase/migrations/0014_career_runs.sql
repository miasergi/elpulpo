-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Simulador de Carrera: partidas guardadas                          ║
-- ║                                                                    ║
-- ║  El motor es determinista, así que NO se guarda el estado: basta   ║
-- ║  con la semilla, la identidad y la lista de decisiones para        ║
-- ║  reconstruir la carrera entera. `summary` es una copia de los      ║
-- ║  totales para poder ordenar el ranking sin rehacer la simulación.  ║
-- ╚══════════════════════════════════════════════════════════════════╝
create table if not exists public.career_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  seed       bigint not null,
  identity   jsonb not null,                    -- apellido, dorsal, pie, país, posición
  decisions  jsonb not null default '[]'::jsonb, -- lista ordenada de opciones elegidas
  finished   boolean not null default false,
  summary    jsonb,                             -- totales y palmarés, solo al terminar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_runs_user_idx on public.career_runs (user_id, updated_at desc);
-- El ranking solo mira carreras terminadas.
create index if not exists career_runs_finished_idx on public.career_runs (finished, updated_at desc)
  where finished;

-- Una sola carrera a medias por usuario: al empezar otra, se reemplaza.
create unique index if not exists career_runs_one_active_idx on public.career_runs (user_id)
  where not finished;

-- ─────────────────────────────────────────────────────────────────────
-- `updated_at` al día sin depender del cliente.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.touch_career_run()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists career_runs_touch on public.career_runs;
create trigger career_runs_touch
  before update on public.career_runs
  for each row execute function public.touch_career_run();

-- ─────────────────────────────────────────────────────────────────────
-- RLS: cada uno escribe lo suyo; los miembros de tus grupos pueden leer
-- tus carreras terminadas para el ranking.
-- ─────────────────────────────────────────────────────────────────────
alter table public.career_runs enable row level security;

drop policy if exists "career_runs_select_own" on public.career_runs;
create policy "career_runs_select_own" on public.career_runs for select
  using (user_id = auth.uid());

-- Helper con `security definer`, igual que is_group_member: así la política
-- no vuelve a pasar por el RLS de group_members.
create or replace function public.shares_group_with(other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;

drop policy if exists "career_runs_select_group" on public.career_runs;
create policy "career_runs_select_group" on public.career_runs for select
  using (finished and public.shares_group_with(user_id));

drop policy if exists "career_runs_insert_own" on public.career_runs;
create policy "career_runs_insert_own" on public.career_runs for insert
  with check (user_id = auth.uid());

drop policy if exists "career_runs_update_own" on public.career_runs;
create policy "career_runs_update_own" on public.career_runs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "career_runs_delete_own" on public.career_runs;
create policy "career_runs_delete_own" on public.career_runs for delete
  using (user_id = auth.uid());
