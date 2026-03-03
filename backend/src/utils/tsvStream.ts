import fs from 'fs';
import readline from 'readline';

/**
 * Stream-scan a TSV file line-by-line with early-exit support.
 *
 * @param filePath  Absolute path to the TSV file.
 * @param onRow     Receives split columns for each data row.
 *                  Return a value to include it in results; return `undefined` to skip.
 * @param limit     Stop after collecting this many results (omit for full scan).
 * @returns         Collected results.
 */
export function scanTsv<T>(
  filePath: string,
  onRow: (cols: string[]) => T | undefined,
  limit?: number,
): Promise<T[]> {
  if (!fs.existsSync(filePath)) return Promise.resolve([]);

  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    const results: T[] = [];
    let isHeader = true;
    let closed = false;
    let linesScanned = 0;
    const t0 = Date.now();

    function finish() {
      if (closed) return;
      closed = true;
      rl.close();
      rl.removeAllListeners();
      stream.destroy();

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[tsvStream] ${linesScanned} lines in ${Date.now() - t0}ms → ${results.length} results`,
        );
      }
      resolve(results);
    }

    rl.on('line', (line) => {
      if (closed) return;
      if (isHeader) { isHeader = false; return; }
      linesScanned++;

      const cols = line.split('\t');
      const item = onRow(cols);
      if (item !== undefined) {
        results.push(item);
        if (limit !== undefined && results.length >= limit) {
          finish();
        }
      }
    });

    rl.on('close', finish);
    rl.on('error', (err) => {
      console.error('[tsvStream] read error:', err.message);
      finish();
    });
  });
}
