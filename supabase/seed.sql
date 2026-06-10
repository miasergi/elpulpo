-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Seed: World Cup 2026 demo data (teams, fixtures, bonus markets).   ║
-- ║  Safe to run once on a fresh DB. Real data comes from API sync.     ║
-- ╚══════════════════════════════════════════════════════════════════╝

insert into public.competitions (slug, name, season, type, start_date, end_date, is_active)
values ('world-cup-2026', 'Mundial 2026', 2026, 'cup', '2026-06-11', '2026-07-19', true)
on conflict (slug) do nothing;

insert into public.teams (name, short_name, code) values
  ('México', 'México', 'MEX'),
  ('Estados Unidos', 'EE. UU.', 'USA'),
  ('Canadá', 'Canadá', 'CAN'),
  ('Argentina', 'Argentina', 'ARG'),
  ('Brasil', 'Brasil', 'BRA'),
  ('España', 'España', 'ESP'),
  ('Francia', 'Francia', 'FRA'),
  ('Inglaterra', 'Inglaterra', 'ENG'),
  ('Alemania', 'Alemania', 'GER'),
  ('Portugal', 'Portugal', 'POR'),
  ('Países Bajos', 'P. Bajos', 'NED'),
  ('Croacia', 'Croacia', 'CRO')
on conflict do nothing;

-- Fixtures
with c as (select id from public.competitions where slug = 'world-cup-2026'),
t as (select code, id from public.teams)
insert into public.matches
  (competition_id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, stage)
select c.id, h.id, a.id, k.kickoff, k.status::match_status, k.hs, k.as_, k.stage
from c,
  (values
    ('MEX','CRO', timestamptz '2026-06-09 19:00+00', 'finished', 2, 1, 'Grupo A'),
    ('ARG','CAN', timestamptz '2026-06-09 22:00+00', 'finished', 3, 0, 'Grupo B'),
    ('ESP','FRA', timestamptz '2026-06-11 18:00+00', 'scheduled', null::int, null::int, 'Grupo C'),
    ('BRA','ENG', timestamptz '2026-06-11 21:00+00', 'scheduled', null::int, null::int, 'Grupo D'),
    ('GER','POR', timestamptz '2026-06-12 18:00+00', 'scheduled', null::int, null::int, 'Grupo E'),
    ('NED','USA', timestamptz '2026-06-12 21:00+00', 'scheduled', null::int, null::int, 'Grupo F')
  ) as k(home, away, kickoff, status, hs, as_, stage)
join t h on h.code = k.home
join t a on a.code = k.away;

-- Bonus markets
with c as (select id from public.competitions where slug = 'world-cup-2026')
insert into public.bonus_markets (competition_id, key, label, kind, points, closes_at)
select c.id, k.key, k.label, k.kind, k.points, timestamptz '2026-06-11 16:00+00'
from c,
  (values
    ('champion', '¿Quién ganará el Mundial?', 'team', 15),
    ('finalist', '¿Quién será subcampeón?', 'team', 8),
    ('top_scorer', 'Máximo goleador (Bota de Oro)', 'text', 10)
  ) as k(key, label, kind, points)
on conflict (competition_id, key) do nothing;
