-- History rework.
--   * history_snapshots (a full 275k-row copy per day) is replaced by
--       wps_history        - WPS changes only
--       rank_distribution  - per day and scope, how many people are above each WPS value
--     Existing snapshots are converted, then the table is dropped.
--   * wps_scores / wps_ranks duplicated leaderboard_entries and are dropped.
--   * wps_breakdowns keeps only per-event world ranks.
--   * countries: list + ranked count per country (was a JSON file / DISTINCT over 275k rows).
-- Written to be idempotent because the production DB was originally created with `db push`.

-- 1. New tables -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "countries" (
    "iso2" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "ranked_count" INTEGER NOT NULL,
    CONSTRAINT "countries_pkey" PRIMARY KEY ("iso2")
);

CREATE TABLE IF NOT EXISTS "wps_history" (
    "person_id" VARCHAR(10) NOT NULL,
    "valid_from" DATE NOT NULL,
    "wps_centi" INTEGER NOT NULL,
    CONSTRAINT "wps_history_pkey" PRIMARY KEY ("person_id", "valid_from")
);

CREATE TABLE IF NOT EXISTS "rank_distribution" (
    "snapshot_date" DATE NOT NULL,
    "scope" VARCHAR(2) NOT NULL,
    "wps_centi" INTEGER[],
    "above" INTEGER[],
    CONSTRAINT "rank_distribution_pkey" PRIMARY KEY ("snapshot_date", "scope")
);

ALTER TABLE "leaderboard_entries" ADD COLUMN IF NOT EXISTS "rank_change_1d" INTEGER;
ALTER TABLE "leaderboard_entries" ADD COLUMN IF NOT EXISTS "rank_change_7d" INTEGER;

-- 2. Convert history_snapshots ---------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.history_snapshots') IS NULL THEN
    RETURN;
  END IF;

  -- WPS changes only.
  INSERT INTO "wps_history" ("person_id", "valid_from", "wps_centi")
  SELECT person_id, snapshot_date, c
  FROM (
    SELECT person_id, snapshot_date, round(wps * 100)::int AS c,
           lag(round(wps * 100)::int) OVER (PARTITION BY person_id ORDER BY snapshot_date) AS prev
    FROM history_snapshots
  ) h
  WHERE prev IS DISTINCT FROM c
  ON CONFLICT DO NOTHING;

  -- World distribution per date.
  INSERT INTO "rank_distribution" ("snapshot_date", "scope", "wps_centi", "above")
  SELECT snapshot_date, '*', array_agg(c ORDER BY c DESC), array_agg(above ORDER BY c DESC)
  FROM (
    SELECT snapshot_date, c,
           (sum(n) OVER (PARTITION BY snapshot_date ORDER BY c DESC) - n)::int AS above
    FROM (
      SELECT snapshot_date, round(wps * 100)::int AS c, count(*) AS n
      FROM history_snapshots GROUP BY 1, 2
    ) g
  ) d
  GROUP BY snapshot_date
  ON CONFLICT DO NOTHING;

  -- Country distribution per date (country = the person's current country).
  INSERT INTO "rank_distribution" ("snapshot_date", "scope", "wps_centi", "above")
  SELECT snapshot_date, iso2, array_agg(c ORDER BY c DESC), array_agg(above ORDER BY c DESC)
  FROM (
    SELECT snapshot_date, iso2, c,
           (sum(n) OVER (PARTITION BY snapshot_date, iso2 ORDER BY c DESC) - n)::int AS above
    FROM (
      SELECT h.snapshot_date, p.country_iso2 AS iso2, round(h.wps * 100)::int AS c, count(*) AS n
      FROM history_snapshots h
      JOIN persons p ON p.id = h.person_id
      WHERE p.country_iso2 IS NOT NULL
      GROUP BY 1, 2, 3
    ) g
  ) d
  GROUP BY snapshot_date, iso2
  ON CONFLICT DO NOTHING;

  DROP TABLE history_snapshots;
END $$;

-- 3. Seed wps_history from the current leaderboard for people without history,
--    so the first pipeline run has a baseline to diff against.
INSERT INTO "wps_history" ("person_id", "valid_from", "wps_centi")
SELECT l.person_id, l.generated_at::date, round(l.wps * 100)::int
FROM leaderboard_entries l
WHERE NOT EXISTS (SELECT 1 FROM wps_history h WHERE h.person_id = l.person_id)
ON CONFLICT DO NOTHING;

-- 4. Breakdown: keep only {eventId: worldRank} ------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wps_breakdowns' AND column_name = 'breakdown'
  ) THEN
    ALTER TABLE wps_breakdowns ADD COLUMN event_ranks JSONB;
    UPDATE wps_breakdowns b
    SET event_ranks = COALESCE((
      SELECT jsonb_object_agg(item->>'eventId', (item->>'worldRank')::int)
      FROM jsonb_array_elements(b.breakdown) item
    ), '{}'::jsonb);
    ALTER TABLE wps_breakdowns
      DROP COLUMN breakdown,
      DROP COLUMN sum_event_scores,
      DROP COLUMN max_possible,
      DROP COLUMN events_participated,
      ALTER COLUMN event_ranks SET NOT NULL;
  END IF;
END $$;

-- 5. Drop tables duplicated by leaderboard_entries --------------------------

DROP TABLE IF EXISTS "wps_scores";
DROP TABLE IF EXISTS "wps_ranks";

-- 6. Foreign keys ----------------------------------------------------------

DELETE FROM leaderboard_entries l WHERE NOT EXISTS (SELECT 1 FROM persons p WHERE p.id = l.person_id);
DELETE FROM wps_breakdowns b WHERE NOT EXISTS (SELECT 1 FROM persons p WHERE p.id = b.person_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leaderboard_entries_person_id_fkey') THEN
    ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_person_id_fkey"
      FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wps_breakdowns_person_id_fkey') THEN
    ALTER TABLE "wps_breakdowns" ADD CONSTRAINT "wps_breakdowns_person_id_fkey"
      FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 7. Prefix search index usable by LIKE 'abc%' under any collation ----------

DROP INDEX IF EXISTS "idx_person_name_lower";
CREATE INDEX "idx_person_name_lower" ON "persons" ("name_lower" text_pattern_ops);

-- 8. Countries from the current leaderboard (the pipeline rewrites it daily) -

INSERT INTO "countries" ("iso2", "name", "ranked_count")
SELECT country_iso2, min(country_name), count(*)
FROM leaderboard_entries
WHERE country_iso2 IS NOT NULL AND country_iso2 <> ''
GROUP BY country_iso2
ON CONFLICT ("iso2") DO NOTHING;

-- 9. Meta keys of the removed precomputed-JSON machinery ---------------------

DELETE FROM "meta" WHERE "key" IN (
  'leaderboardWeeklyMovers', 'leaderboardWeeklyMoversReady',
  'leaderboardGlobalTopSnapshot', 'leaderboardGlobalTopSnapshotReady'
);
