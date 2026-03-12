import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function saveHistorySnapshotForToday(): Promise<void> {
  const now = new Date();
  const utcDateOnly = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const snapshotDateStr = utcDateOnly.toISOString().slice(0, 10);

  console.log(
    '[historySnapshot] Saving history snapshot for',
    snapshotDateStr,
  );

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO history_snapshots (person_id, snapshot_date, wps, global_rank, country_rank)
      SELECT person_id, ${snapshotDateStr}::date, wps, global_rank, country_rank
      FROM leaderboard_entries
      ON CONFLICT (person_id, snapshot_date) DO UPDATE SET
        wps = EXCLUDED.wps,
        global_rank = EXCLUDED.global_rank,
        country_rank = EXCLUDED.country_rank
    `,
  );

  console.log('[historySnapshot] History snapshot saved for', snapshotDateStr);
}
