-- Continent leaderboards and the country ranking. The pipeline fills these
-- columns on the next refresh.
ALTER TABLE "leaderboard_entries" ADD COLUMN     "continent" VARCHAR(2),
ADD COLUMN     "continent_rank" INTEGER;

ALTER TABLE "countries" ADD COLUMN     "continent" VARCHAR(2),
ADD COLUMN     "team_rank" INTEGER,
ADD COLUMN     "team_score" DOUBLE PRECISION;

CREATE INDEX "idx_leaderboard_continent_rank" ON "leaderboard_entries"("continent", "continent_rank");

-- WPS v3: blindfolded events and FMC use the ranking by single, and Multi-Blind
-- is scored. v2 values are not comparable with v3, so the history starts over.
TRUNCATE "wps_history", "rank_distribution";

UPDATE "leaderboard_entries" SET "rank_change_1d" = NULL, "rank_change_7d" = NULL;

-- Forget the published export date so the next refresh republishes the current
-- WCA export with the new formula instead of skipping it as unchanged.
DELETE FROM "meta" WHERE "key" = 'wcaExportDate';
