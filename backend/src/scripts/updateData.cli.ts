/**
 * CLI entrypoint for updateData. Run via: npm run update:data
 */
import path from 'path';
import dotenv from 'dotenv';
import { runUpdateRawData } from './updateData';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[updateData] Starting raw data update ...');
  const result = await runUpdateRawData();
  console.log('[updateData] Finished. changed=%s durationMs=%d', result.changed, Date.now() - startedAt);
}

main().catch((err) => {
  console.error('[updateData] Failed:', err);
  process.exit(1);
});
