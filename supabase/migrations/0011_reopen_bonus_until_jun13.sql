-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Reabrir los bonus del torneo hasta el 13-jun-2026 18:00 Madrid     ║
-- ║                                                                    ║
-- ║  Varios grupos arrancaron con el bonus ya cerrado (closes_at se    ║
-- ║  había alineado al primer partido real) y hay jugadores que aún    ║
-- ║  no han configurado sus apuestas. Damos una prórroga común hasta   ║
-- ║  mañana a las 18:00 (Europe/Madrid = 16:00 UTC en junio, CEST).    ║
-- ║  Solo afecta a los markets NO resueltos.                           ║
-- ╚══════════════════════════════════════════════════════════════════╝
update public.bonus_markets
set closes_at = timestamptz '2026-06-13 18:00:00+02'
where resolved = false;
