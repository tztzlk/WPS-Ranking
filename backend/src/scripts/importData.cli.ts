/**
 * CLI entrypoint for importData. Run via: npm run import:data
 */
import path from 'path';
import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';
import { runImport } from './importData';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main(): Promise<void> {
  console.log('[importData] Starting import ...');
  const started = Date.now();
  await runImport();
  console.log('[importData] Import completed successfully in %d ms.', Date.now() - started);
}

main()
  .catch((err) => {
    console.error('[importData] Import failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
