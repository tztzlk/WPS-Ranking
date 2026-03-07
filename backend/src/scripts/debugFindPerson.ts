import path from 'path';
import dotenv from 'dotenv';
import { findPersonById } from '../services/personDb';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const targetId =
    (process.argv[2] ?? process.env.WCA_ID ?? '2017AMAN04').trim().toUpperCase();

  console.log('[debugFindPerson] Searching for WCA ID:', targetId);

  const person = await findPersonById(targetId);
  if (!person) {
    console.log('[debugFindPerson] No matching person found for ID', targetId);
    process.exitCode = 1;
    return;
  }

  console.log('[debugFindPerson] Match found:');
  console.log(JSON.stringify(person, null, 2));
}

main().catch((err) => {
  console.error('[debugFindPerson] Unexpected error:', err);
  process.exitCode = 1;
});
