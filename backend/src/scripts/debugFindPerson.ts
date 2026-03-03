import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { getCacheDir } from '../utils/cachePath';
import { parseRow } from '../services/personLookup';

async function main() {
  const targetId =
    (process.argv[2] ?? process.env.WCA_ID ?? '2017AMAN04').trim().toUpperCase();

  const cacheDir = getCacheDir();
  const personsPath = path.join(cacheDir, 'wca_export', 'Persons.tsv');

  console.log('[debugFindPerson] Using Persons.tsv at', personsPath);
  if (!fs.existsSync(personsPath)) {
    console.error('[debugFindPerson] Persons.tsv not found on disk.');
    process.exitCode = 1;
    return;
  }

  // Print detected columns for the first (header) line.
  const headerBuffer = fs.readFileSync(personsPath, 'utf8');
  const headerLine = headerBuffer.split(/\r?\n/, 1)[0] ?? '';
  const headerCols = headerLine.split('\t');
  console.log('[debugFindPerson] Header columns:', headerCols);

  console.log('[debugFindPerson] Searching for WCA ID:', targetId);

  const stream = fs.createReadStream(personsPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let isHeader = true;
  let lineNumber = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    lineNumber += 1;

    if (isHeader) {
      isHeader = false;
      continue;
    }

    const cols = line.split('\t');
    const parsed = parseRow(cols);
    if (!parsed) continue;
    if (parsed.wcaId !== targetId || parsed.subId !== '1') continue;

    console.log(`[debugFindPerson] Match found at data line #${lineNumber}:`);
    console.log('[debugFindPerson] Raw TSV columns:', cols);
    console.log('[debugFindPerson] Parsed object:', parsed);
    rl.close();
    return;
  }

  console.log('[debugFindPerson] No matching person found for ID', targetId);
}

main().catch((err) => {
  console.error('[debugFindPerson] Unexpected error:', err);
  process.exitCode = 1;
});

