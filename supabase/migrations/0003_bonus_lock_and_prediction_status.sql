-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Bonus lock (server-side) + who-has-predicted RPC                  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────
-- Bonus predictions lock once the market closes or resolves.
-- (Match predictions already lock via predictions_lock_check.)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.enforce_bonus_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare m public.bonus_markets;
begin
  select * into m from public.bonus_markets where id = new.market_id;
  if m.resolved or (m.closes_at is not null and m.closes_at <= now()) then
    raise exception 'Bonus market is closed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bonus_predictions_lock_check on public.bonus_predictions;
create trigger bonus_predictions_lock_check
  before insert or update on public.bonus_predictions
  for each row execute function public.enforce_bonus_lock();

-- ─────────────────────────────────────────────────────────────────────
-- Deleting a prediction after lock would erase it from the record;
-- block it too.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.enforce_prediction_delete_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = old.match_id;
  if m.status <> 'scheduled' or m.kickoff_at <= now() then
    raise exception 'Predictions are locked for this match';
  end if;
  return old;
end;
$$;

drop trigger if exists predictions_delete_lock_check on public.predictions;
create trigger predictions_delete_lock_check
  before delete on public.predictions
  for each row execute function public.enforce_prediction_delete_lock();

-- ─────────────────────────────────────────────────────────────────────
-- Who has already predicted these matches? Existence only (no scores),
-- limited to people who share a group with the caller. Lets the UI show
-- "4/6 ya han predicho" before kickoff without leaking the scorelines.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.predicted_user_ids(mids uuid[])
returns table (match_id uuid, user_id uuid)
language sql security definer stable set search_path = public as $$
  select p.match_id, p.user_id
  from public.predictions p
  where p.match_id = any(mids)
    and (p.user_id = auth.uid() or public.shares_group(p.user_id));
$$;
