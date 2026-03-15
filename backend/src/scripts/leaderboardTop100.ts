/**
 * Offline script only. Not used by runtime API.
 * Pipeline: reads WCA TSVs, computes WPS, writes JSON indexes (persons, countries, wps, wpsRank, leaderboard.top100).
 * Uses streaming + line-by-line parsing to avoid loading large TSVs into memory.
 */
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { EVENT_WEIGHTS, MAX_WPS_SCORE } from '../types';

const CACHE_DIR = process.env.CACHE_DIR ? path.resolve(process.env.CACHE_DIR) : path.join(process.cwd(), 'cache');
const WCA_EXPORT_DIR = path.join(CACHE_DIR, 'wca_export');
const PERSONS_PATH = path.join(WCA_EXPORT_DIR, 'Persons.tsv');
const COUNTRIES_PATH = path.join(WCA_EXPORT_DIR, 'Countries.tsv');
const RANKS_AVERAGE_PATH = path.join(WCA_EXPORT_DIR, 'RanksAverage.tsv');
const OUTPUT_PATH = path.join(CACHE_DIR, 'leaderboard.top100.json');
const WPS_RANK_INDEX_PATH = path.join(CACHE_DIR, 'wpsRank.index.json');
const PERSONS_INDEX_PATH = path.join(CACHE_DIR, 'persons.index.json');
const COUNTRIES_INDEX_PATH = path.join(CACHE_DIR, 'countries.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');
const WPS_BREAKDOWN_PATH = path.join(CACHE_DIR, 'wps.breakdown.json');
const WPS_BREAKDOWN_NDJSON_PATH = path.join(CACHE_DIR, 'wps.breakdown.ndjson');

const TOP_N = 100;
const STREAM_HIGH_WATER_MARK = 64 * 1024;

export interface CountryInfo {
  name: string;
  iso2: string;
}

export interface PersonInfo {
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
}

export interface LeaderboardItem {
  rank: number;
  personId: string;
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
  wps: number;
}

export interface LeaderboardResult {
  source: string;
  generatedAt: string;
  count: number;
  items: LeaderboardItem[];
}

/** Extract specific columns by index without splitting the entire line. Reduces allocations for large TSVs. */
function extractColumns(line: string, indices: number[]): string[] {
  const result: string[] = [];
  let colIndex = 0;
  let start = 0;
  const maxIdx = Math.max(...indices);
  for (let i = 0; i <= line.length && colIndex <= maxIdx; i++) {
    if (i === line.length || line[i] === '\t') {
      if (indices.includes(colIndex)) {
        result.push(line.slice(start, i).trim());
      }
      colIndex++;
      start = i + 1;
    }
  }
  return result;
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

/** Stream Countries.tsv and build countries.index.json: { "<wcaCountryId>": { name, iso2 } }. */
async function buildCountriesIndex(): Promise<Record<string, CountryInfo>> {
  const index: Record<string, CountryInfo> = {};
  if (!fs.existsSync(COUNTRIES_PATH)) return index;
  const stream = createReadStream(COUNTRIES_PATH, {
    encoding: 'utf8',
    highWaterMark: STREAM_HIGH_WATER_MARK,
  });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let isHeader = true;
  let headerIndices: Record<string, number> = {};

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseTSVLine(line);
    if (isHeader) {
      headerIndices = getHeaderIndices(cols);
      isHeader = false;
      continue;
    }
    const idIdx = headerIndices['id'] ?? 0;
    const iso2Idx = headerIndices['iso2'] ?? 1;
    const nameIdx = headerIndices['name'] ?? 2;
    const wcaId = cols[idIdx]?.trim();
    const iso2 = cols[iso2Idx]?.trim();
    const name = cols[nameIdx]?.trim();
    if (!wcaId) continue;
    index[wcaId] = { name: name || wcaId, iso2: iso2 || '' };
  }

  const generatedAt = new Date().toISOString();
  await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  await fs.promises.writeFile(
    COUNTRIES_INDEX_PATH,
    JSON.stringify({ generatedAt, countries: index }, null, 0),
    'utf8'
  );
  return index;
}

async function buildPersonMap(
  countriesIndex: Record<string, CountryInfo>,
  onProgress?: (lineCount: number) => void
): Promise<Map<string, PersonInfo>> {
  const personMap = new Map<string, PersonInfo>();
  const stream = createReadStream(PERSONS_PATH, {
    encoding: 'utf8',
    highWaterMark: STREAM_HIGH_WATER_MARK,
  });
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
    const country = countryId ? countriesIndex[countryId] : undefined;
    personMap.set(personId, {
      name,
      countryId: countryId || undefined,
      countryName: country?.name,
      countryIso2: country?.iso2 || undefined,
    });
    lineCount++;
    if (onProgress && lineCount % 500000 === 0) onProgress(lineCount);
  }
  return personMap;
}

export interface BreakdownItem {
  eventId: string;
  worldRank: number;
  weight: number;
  eventScore: number;
}

export interface PersonWPSBreakdown {
  personId?: string;
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
  breakdown: BreakdownItem[];
}

/** Streams RanksAverage.tsv line-by-line; never loads the full file into memory.
 * Uses createReadStream + readline for streaming; extractColumns for minimal parsing per line.
 * Accumulates sum and per-event breakdown per person. */
async function streamRanksAndAccumulate(
  scoreAndBreakdownByPerson: Map<string, { sum: number; breakdown: BreakdownItem[] }>,
  onProgress?: (lineCount: number) => void
): Promise<void> {
  const stream = createReadStream(RANKS_AVERAGE_PATH, {
    encoding: 'utf8',
    highWaterMark: STREAM_HIGH_WATER_MARK,
  });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let isHeader = true;
  let headerIndices: Record<string, number> = {};
  let lineCount = 0;
  const neededIndices: number[] = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      const cols = parseTSVLine(line);
      headerIndices = getHeaderIndices(cols);
      const personIdIdx = headerIndices['person_id'];
      const eventIdIdx = headerIndices['event_id'];
      const worldRankIdx = headerIndices['world_rank'];
      if (personIdIdx === undefined || eventIdIdx === undefined || worldRankIdx === undefined) {
        throw new Error('RanksAverage.tsv missing required columns: person_id, event_id, world_rank');
      }
      neededIndices.length = 0;
      neededIndices.push(personIdIdx, eventIdIdx, worldRankIdx);
      neededIndices.sort((a, b) => a - b);
      isHeader = false;
      continue;
    }
    const extracted = extractColumns(line, neededIndices);
    const personIdIdx = headerIndices['person_id'];
    const eventIdIdx = headerIndices['event_id'];
    const worldRankIdx = headerIndices['world_rank'];
    const personId = extracted[neededIndices.indexOf(personIdIdx)] ?? '';
    const eventId = extracted[neededIndices.indexOf(eventIdIdx)] ?? '';
    const worldRankRaw = extracted[neededIndices.indexOf(worldRankIdx)] ?? '';
    if (!personId || !eventId || worldRankRaw === '') continue;

    const weight = EVENT_WEIGHTS[eventId];
    if (weight === undefined) continue;

    const worldRank = parseInt(worldRankRaw, 10);
    if (!Number.isFinite(worldRank) || worldRank < 1) continue;

    const eventScore = weight * (1 / Math.log(worldRank + 1)) * 10;
    const prev = scoreAndBreakdownByPerson.get(personId) ?? { sum: 0, breakdown: [] };
    prev.sum += eventScore;
    prev.breakdown.push({ eventId, worldRank, weight, eventScore });
    scoreAndBreakdownByPerson.set(personId, prev);

    lineCount++;
    if (onProgress && lineCount % 500000 === 0) onProgress(lineCount);
  }
}

export async function generateTop100Leaderboard(
  options?: { onRanksLineProgress?: (lineCount: number) => void }
): Promise<LeaderboardResult> {
  const onRanks = options?.onRanksLineProgress;

  const countriesIndex = await buildCountriesIndex();
  const personMap = await buildPersonMap(countriesIndex);

  const scoreAndBreakdownByPerson = new Map<string, { sum: number; breakdown: BreakdownItem[] }>();
  await streamRanksAndAccumulate(scoreAndBreakdownByPerson, onRanks);

  if (MAX_WPS_SCORE <= 0) {
    throw new Error('MAX_WPS_SCORE is 0; check EVENT_WEIGHTS');
  }

  const entries: { personId: string; wps: number; sumEventScores: number; breakdown: BreakdownItem[] }[] = [];
  for (const [personId, { sum, breakdown }] of scoreAndBreakdownByPerson) {
    const wps = (sum / MAX_WPS_SCORE) * 100;
    entries.push({ personId, wps, sumEventScores: sum, breakdown });
  }

  await fs.promises.mkdir(CACHE_DIR, { recursive: true });

  const personsIndex: Record<string, { name: string; countryId?: string; countryName?: string; countryIso2?: string }> = {};
  for (const [id, info] of personMap) {
    personsIndex[id] = {
      name: info.name,
      countryId: info.countryId,
      countryName: info.countryName,
      countryIso2: info.countryIso2,
    };
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

  // Stream-write wps.breakdown.json to avoid building a huge JSON string in memory
  const breakdownStream = fs.createWriteStream(WPS_BREAKDOWN_PATH, {
    encoding: 'utf8',
    highWaterMark: STREAM_HIGH_WATER_MARK,
  });
  const breakdownNdjsonStream = fs.createWriteStream(WPS_BREAKDOWN_NDJSON_PATH, {
    encoding: 'utf8',
    highWaterMark: STREAM_HIGH_WATER_MARK,
  });
  breakdownStream.write('{');
  let first = true;
  for (const e of entries) {
    if (!first) breakdownStream.write(',');
    const entry: PersonWPSBreakdown = {
      personId: e.personId,
      sumEventScores: e.sumEventScores,
      maxPossible: MAX_WPS_SCORE,
      eventsParticipated: e.breakdown.length,
      breakdown: e.breakdown,
    };
    breakdownStream.write(`"${e.personId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}":${JSON.stringify(entry)}`);
    breakdownNdjsonStream.write(`${JSON.stringify(entry)}\n`);
    first = false;
  }
  breakdownStream.write('}');
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      breakdownStream.on('finish', resolve);
      breakdownStream.on('error', reject);
      breakdownStream.end();
    }),
    new Promise<void>((resolve, reject) => {
      breakdownNdjsonStream.on('finish', resolve);
      breakdownNdjsonStream.on('error', reject);
      breakdownNdjsonStream.end();
    }),
  ]);

  entries.sort((a, b) => {
    const diff = b.wps - a.wps;
    if (diff !== 0) return diff;
    return a.personId.localeCompare(b.personId);
  });

  const generatedAt = new Date().toISOString();
  const totalRanked = entries.length;
  const ranks: Record<string, number> = {};
  entries.forEach((e, i) => {
    ranks[e.personId] = i + 1;
  });
  await fs.promises.writeFile(
    WPS_RANK_INDEX_PATH,
    JSON.stringify({ generatedAt, totalRanked, ranks }),
    'utf8'
  );

  const topEntries = entries.slice(0, TOP_N);
  const items: LeaderboardItem[] = topEntries.map((e, i) => {
    const person = personMap.get(e.personId);
    return {
      rank: i + 1,
      personId: e.personId,
      name: person?.name ?? e.personId,
      countryId: person?.countryId,
      countryName: person?.countryName,
      countryIso2: person?.countryIso2,
      wps: Math.round(e.wps * 100) / 100,
    };
  });

  const result: LeaderboardResult = {
    source: 'WCA Results Export',
    generatedAt,
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
