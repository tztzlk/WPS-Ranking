-- Supabase exposes the public schema through its Data API (anon/authenticated roles).
-- This app never uses that API, so deny it everything: RLS on, no policies.
-- The table owner (the role the API and the pipeline connect as) bypasses RLS.
ALTER TABLE "persons"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leaderboard_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wps_breakdowns"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "countries"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meta"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wps_history"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rank_distribution"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations"  ENABLE ROW LEVEL SECURITY;
