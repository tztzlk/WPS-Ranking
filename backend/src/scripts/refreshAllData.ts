import { runUpdateRawData } from './updateData';
import { runImport } from './importData';
import { prisma } from '../lib/prisma';
import { rebuildLeaderboardSnapshot } from '../services/leaderboardCache';
import { saveHistorySnapshotForToday } from '../services/historySnapshot';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[refresh] Starting data refresh pipeline ...');

  console.log('[refresh] Step 1: Updating raw WCA data');
  const updateResult = await runUpdateRawData();

  if (!updateResult.changed) {
    console.log(
      '[refresh] No changes detected in WCA export. Exiting without import/rebuild/history.',
    );
    console.log('[refresh] Pipeline completed in %d ms.', Date.now() - startedAt);
    return;
  }

  console.log('[refresh] Step 2: Importing data into PostgreSQL');
  await runImport();

  console.log('[refresh] Step 3: Rebuilding leaderboard snapshot');
  await rebuildLeaderboardSnapshot();

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
