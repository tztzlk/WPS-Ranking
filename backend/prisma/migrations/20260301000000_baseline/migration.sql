-- Baseline: the schema that existed before migrations were introduced (it was created with `prisma db push`).
-- Every statement is idempotent, so this is a no-op on the existing production database
-- and creates the original tables on a fresh one.

CREATE TABLE IF NOT EXISTS "persons" (
    "id" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "name_lower" TEXT NOT NULL,
    "country_id" TEXT,
    "country_name" TEXT,
    "country_iso2" VARCHAR(2),
    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wps_scores" (
    "person_id" VARCHAR(10) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "wps_scores_pkey" PRIMARY KEY ("person_id")
);

CREATE TABLE IF NOT EXISTS "wps_ranks" (
    "person_id" VARCHAR(10) NOT NULL,
    "rank" INTEGER NOT NULL,
    CONSTRAINT "wps_ranks_pkey" PRIMARY KEY ("person_id")
);

CREATE TABLE IF NOT EXISTS "meta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "meta_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "leaderboard_entries" (
    "person_id" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "country_iso2" VARCHAR(2),
    "country_name" TEXT,
    "wps" DOUBLE PRECISION NOT NULL,
    "global_rank" INTEGER NOT NULL,
    "country_rank" INTEGER,
    "generated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("person_id")
);

CREATE TABLE IF NOT EXISTS "history_snapshots" (
    "person_id" VARCHAR(10) NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "wps" DOUBLE PRECISION NOT NULL,
    "global_rank" INTEGER NOT NULL,
    "country_rank" INTEGER,
    CONSTRAINT "history_snapshots_pkey" PRIMARY KEY ("person_id", "snapshot_date")
);

CREATE INDEX IF NOT EXISTS "idx_person_name_lower" ON "persons"("name_lower");
CREATE INDEX IF NOT EXISTS "idx_person_country_iso2" ON "persons"("country_iso2");
CREATE INDEX IF NOT EXISTS "idx_wps_score" ON "wps_scores"("score");
CREATE INDEX IF NOT EXISTS "idx_wps_rank" ON "wps_ranks"("rank");
CREATE INDEX IF NOT EXISTS "idx_leaderboard_global_rank" ON "leaderboard_entries"("global_rank");
CREATE INDEX IF NOT EXISTS "idx_leaderboard_country_rank" ON "leaderboard_entries"("country_iso2", "country_rank");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wps_scores_person_id_fkey') THEN
    ALTER TABLE "wps_scores" ADD CONSTRAINT "wps_scores_person_id_fkey"
      FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wps_ranks_person_id_fkey') THEN
    ALTER TABLE "wps_ranks" ADD CONSTRAINT "wps_ranks_person_id_fkey"
      FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
