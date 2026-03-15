CREATE TABLE IF NOT EXISTS "wps_breakdowns" (
  "person_id" VARCHAR(10) PRIMARY KEY,
  "sum_event_scores" DOUBLE PRECISION NOT NULL,
  "max_possible" DOUBLE PRECISION NOT NULL,
  "events_participated" INTEGER NOT NULL,
  "breakdown" JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_history_snapshot_date"
  ON "history_snapshots" ("snapshot_date");

CREATE INDEX IF NOT EXISTS "idx_history_snapshot_date_global_rank"
  ON "history_snapshots" ("snapshot_date", "global_rank");
