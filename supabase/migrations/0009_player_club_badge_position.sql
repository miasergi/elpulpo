-- Club badge + granular position (both enriched from TheSportsDB by name).
-- `position` stays the FIFA generic role (Portero/Defensa/...); position_detail
-- holds the specific one (Lateral izquierdo, ...) when available.
alter table public.players add column if not exists club_badge text;
alter table public.players add column if not exists position_detail text;
