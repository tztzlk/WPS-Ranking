import { runUpdateRawData } from './updateData';
import { runImport } from './importData';
import { prisma } from '../lib/prisma';
import { rebuildLeaderboardSnapshot } from '../services/leaderboardCache';
import { saveHistorySnapshotForToday } from '../services/historySnapshot';

async function ensureLeaderboardSnapshotReady(): Promise<void> {
  const leaderboardCount = await prisma.leaderboardEntry.count();

  if (leaderboardCount > 0) {
    console.log('[refresh] Existing leaderboard snapshot found. Skipping DB rebuild.');
    return;
  }

  console.warn(
    '[refresh] leaderboard_entries is empty while raw export is unchanged. Re-importing current indexes to recover DB state.',
  );

  await runImport();
  await rebuildLeaderboardSnapshot();
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[refresh] Starting data refresh pipeline ...');

  console.log('[refresh] Step 1: Updating raw WCA data');
  const updateResult = await runUpdateRawData();

  if (updateResult.changed) {
    console.log('[refresh] Step 2: Importing data into PostgreSQL');
    await runImport();

    console.log('[refresh] Step 3: Rebuilding leaderboard snapshot');
    await rebuildLeaderboardSnapshot();
  } else {
    console.log('[refresh] No changes detected in WCA export. Keeping current DB data for today.');
    console.log('[refresh] Step 2: Verifying current leaderboard snapshot state');
    await ensureLeaderboardSnapshotReady();
  }

  console.log('[refresh] Step 4: Saving history snapshot for today (UTC date)');
  await saveHistorySnapshotForToday();

  console.log(
    '[refresh] Data refresh pipeline completed successfully in %d ms.',
    Date.now() - startedAt,
  );
}

main()
  .catch((err) => {
    console.error('[refresh] Pipeline failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
