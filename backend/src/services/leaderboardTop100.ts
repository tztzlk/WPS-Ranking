import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const CACHE_DIR = path.resolve(__dirname, '../../cache');
const WCA_EXPORT_DIR = path.join(CACHE_DIR, 'wca_export');
const PERSONS_PATH = path.join(WCA_EXPORT_DIR, 'Persons.tsv');
const RANKS_AVERAGE_PATH = path.join(WCA_EXPORT_DIR, 'RanksAvarage.tsv');
const OUTPUT_PATH = path.join(CACHE_DIR, 'leaderboard.top100.json');
const PERSONS_INDEX_PATH = path.join(CACHE_DIR, 'persons.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');

/** Event weights for WPS. Only events in this map are included. MVP: weight 1 for standard events. */
const EVENT_WEIGHTS: Readonly<Record<string, number>> = {
  '222': 1, '333': 1, '333bf': 1, '333fm': 1, '333ft': 1, '333mbf': 1, '333mbo': 1,
  '333oh': 1, '444': 1, '444bf': 1, '555': 1, '555bf': 1, '666': 1, '777': 1,
  'clock': 1, 'magic': 1, 'minx': 1, 'mmagic': 1, 'pyram': 1, 'skewb': 1, 'sq1': 1,
};

const LN2 = Math.log(2);
const TOP_N = 100;

export interface PersonInfo {
  name: string;
  countryId?: string;
}

export interface LeaderboardItem {
  rank: number;
  personId: string;
  name: string;
  countryId?: string;
  wps: number;
}

export interface LeaderboardResult {
  source: string;
  generatedAt: string;
  count: number;
  items: LeaderboardItem[];
}

function parseTSVLine(line: string): string[] {
  return line.split('\t');
}

function getHeaderIndices(headerRow: string[]): Record<string, number> {
  const indices: Record<string, number> = {};
  headerRow.forEach((name, i) => {
    indices[name.trim().toLowerCase()] = i;
  });
  return indices;
}

async function buildPersonMap(
  onProgress?: (lineCount: number) => void
): Promise<Map<string, PersonInfo>> {
  const personMap = new Map<string, PersonInfo>();
  const stream = createReadStream(PERSONS_PATH, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let isHeader = true;
  let headerIndices: Record<string, number> = {};
  let lineCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseTSVLine(line);
    if (isHeader) {
      headerIndices = getHeaderIndices(cols);
      isHeader = false;
      continue;
    }
    const wcaIdIdx = headerIndices['wca_id'];
    const nameIdx = headerIndices['name'];
    const countryIdIdx = headerIndices['country_id'];
    if (wcaIdIdx === undefined || nameIdx === undefined) continue;
    const personId = cols[wcaIdIdx]?.trim();
    const name = cols[nameIdx]?.trim();
    if (!personId || !name) continue;
    const countryId = countryIdIdx !== undefined ? cols[countryIdIdx]?.trim() : undefined;
    personMap.set(personId, { name, countryId: countryId || undefined });
    lineCount++;
    if (onProgress && lineCount % 500000 === 0) onProgress(lineCount);
  }
  return personMap;
}

/** MAX_POSSIBLE = sum over included events of weight * (1/ln(2)) * 10 */
function computeMaxPossible(): number {
  let max = 0;
  for (const weight of Object.values(EVENT_WEIGHTS)) {
    max += weight * (1 / LN2) * 10;
  }
  return max;
}

async function streamRanksAndAccumulate(
  scoreByPerson: Map<string, number>,
  onProgress?: (lineCount: number) => void
): Promise<void> {
  const stream = createReadStream(RANKS_AVERAGE_PATH, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let isHeader = true;
  let headerIndices: Record<string, number> = {};
  let lineCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseTSVLine(line);
    if (isHeader) {
      headerIndices = getHeaderIndices(cols);
      isHeader = false;
      continue;
    }
    const personIdIdx = headerIndices['person_id'];
    const eventIdIdx = headerIndices['event_id'];
    const worldRankIdx = headerIndices['world_rank'];
    if (personIdIdx === undefined || eventIdIdx === undefined || worldRankIdx === undefined) continue;

    const personId = cols[personIdIdx]?.trim();
    const eventId = cols[eventIdIdx]?.trim();
    const worldRankRaw = cols[worldRankIdx]?.trim();
    if (!personId || !eventId || worldRankRaw === undefined || worldRankRaw === '') continue;

    const weight = EVENT_WEIGHTS[eventId];
    if (weight === undefined) continue;

    const worldRank = parseInt(worldRankRaw, 10);
    if (!Number.isFinite(worldRank) || worldRank < 1) continue;

    const eventScore = weight * (1 / Math.log(worldRank + 1)) * 10;
    const prev = scoreByPerson.get(personId) ?? 0;
    scoreByPerson.set(personId, prev + eventScore);

    lineCount++;
    if (onProgress && lineCount % 500000 === 0) onProgress(lineCount);
  }
}

export async function generateTop100Leaderboard(
  options?: { onRanksLineProgress?: (lineCount: number) => void }
): Promise<LeaderboardResult> {
  const onRanks = options?.onRanksLineProgress;

  const personMap = await buildPersonMap();

  const scoreByPerson = new Map<string, number>();
  await streamRanksAndAccumulate(scoreByPerson, onRanks);

  const maxPossible = computeMaxPossible();
  if (maxPossible <= 0) {
    throw new Error('MAX_POSSIBLE is 0; check EVENT_WEIGHTS');
  }

  const entries: { personId: string; wps: number }[] = [];
  for (const [personId, sum] of scoreByPerson) {
    const wps = (sum / maxPossible) * 100;
    entries.push({ personId, wps });
  }

  await fs.promises.mkdir(CACHE_DIR, { recursive: true });

  const personsIndex: Record<string, { name: string; countryId?: string }> = {};
  for (const [id, info] of personMap) {
    personsIndex[id] = { name: info.name, countryId: info.countryId };
  }
  await fs.promises.writeFile(
    PERSONS_INDEX_PATH,
    JSON.stringify(personsIndex),
    'utf8'
  );

  const wpsIndex: Record<string, { wps: number }> = {};
  for (const e of entries) {
    wpsIndex[e.personId] = { wps: Math.round(e.wps * 100) / 100 };
  }
  await fs.promises.writeFile(
    WPS_INDEX_PATH,
    JSON.stringify(wpsIndex),
    'utf8'
  );

  entries.sort((a, b) => {
    const diff = b.wps - a.wps;
    if (diff !== 0) return diff;
    return a.personId.localeCompare(b.personId);
  });

  const topEntries = entries.slice(0, TOP_N);
  const items: LeaderboardItem[] = topEntries.map((e, i) => {
    const person = personMap.get(e.personId);
    return {
      rank: i + 1,
      personId: e.personId,
      name: person?.name ?? e.personId,
      countryId: person?.countryId,
      wps: Math.round(e.wps * 100) / 100,
    };
  });

  const result: LeaderboardResult = {
    source: 'WCA Results Export',
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };

  await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  await fs.promises.writeFile(
    OUTPUT_PATH,
    JSON.stringify(result, null, 2),
    'utf8'
  );

  return result;
}
