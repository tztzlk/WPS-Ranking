-- WPS v2: rank is scored relative to the size of the event's field (last place
-- is worth ~0). v1 values are not comparable with v2, so the
-- history starts over (it held a single day when the formula changed).
TRUNCATE "wps_history", "rank_distribution";

UPDATE "leaderboard_entries" SET "rank_change_1d" = NULL, "rank_change_7d" = NULL;

-- Forget the published export date so the next refresh republishes the current
-- WCA export with the new formula instead of skipping it as unchanged.
DELETE FROM "meta" WHERE "key" = 'wcaExportDate';
