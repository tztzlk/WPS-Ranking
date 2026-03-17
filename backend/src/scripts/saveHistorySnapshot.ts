import { prisma } from '../lib/prisma';
import { saveHistorySnapshotForToday } from '../services/historySnapshot';

async function main(): Promise<void> {
  console.log('[saveHistorySnapshot] Starting ...');
  await saveHistorySnapshotForToday();
  console.log('[saveHistorySnapshot] Done.');
}

main()
  .catch((err) => {
    console.error('[saveHistorySnapshot] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
