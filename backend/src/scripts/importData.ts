/**
 * Offline script to import precomputed WPS data into PostgreSQL via Prisma.
 * Safe to re-run; it clears target tables and then bulk inserts fresh data.
 * Does not rebuild leaderboard snapshot; use refreshAllData or call rebuildLeaderboardSnapshot separately.
 */
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import dotenv from 'dotenv';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CACHE_DIR = path.join(process.cwd(), 'cache');
const WCA_EXPORT_DIR = path.join(CACHE_DIR, 'wca_export');

const PERSONS_TSV_PATH = path.join(WCA_EXPORT_DIR, 'Persons.tsv');
const COUNTRIES_INDEX_PATH = path.join(CACHE_DIR, 'countries.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');
const WPS_RANK_INDEX_PATH = path.join(CACHE_DIR, 'wpsRank.index.json');
const WPS_BREAKDOWN_NDJSON_PATH = path.join(CACHE_DIR, 'wps.breakdown.ndjson');

const BATCH_SIZE = 2000;
const STREAM_HIGH_WATER_MARK = 64 * 1024;

type CountriesIndex = {
  generatedAt: string;
  countries: Record<
    string,
    {
      name: string;
      iso2: string | null;
    }
  >;
};

type WpsIndex = Record<
  string,
  {
    wps: number;
  }
>;

type WpsRankIndex = {
  generatedAt: string;
  totalRanked: number;
  ranks: Record<string, number>;
};

type BreakdownItem = {
  eventId: string;
  worldRank: number;
  weight: number;
  eventScore: number;
};

type BreakdownRecord = {
  personId?: string;
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
  breakdown: BreakdownItem[];
};

function assertFileExists(filePath: string, label: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required ${label} not found at ${filePath}`);
  }
}

async function readCountriesIndex(): Promise<CountriesIndex> {
  assertFileExists(COUNTRIES_INDEX_PATH, 'countries.index.json');
  const raw = await fs.promises.readFile(COUNTRIES_INDEX_PATH, 'utf8');
  return JSON.parse(raw) as CountriesIndex;
}

async function readWpsIndex(): Promise<WpsIndex> {
  assertFileExists(WPS_INDEX_PATH, 'wps.index.json');
  const raw = await fs.promises.readFile(WPS_INDEX_PATH, 'utf8');
  return JSON.parse(raw) as WpsIndex;
}

async function readWpsRankIndex(): Promise<WpsRankIndex> {
  assertFileExists(WPS_RANK_INDEX_PATH, 'wpsRank.index.json');
  const raw = await fs.promises.readFile(WPS_RANK_INDEX_PATH, 'utf8');
  return JSON.parse(raw) as WpsRankIndex;
}

async function deleteExistingData(): Promise<void> {
  console.log(
    '[importData] Clearing existing data (LeaderboardEntry, WpsBreakdown, WpsScore, WpsRank, Person, Meta) ...',
  );

  await prisma.leaderboardEntry.deleteMany();
  await prisma.wpsBreakdown.deleteMany();
  await prisma.wpsScore.deleteMany();
  await prisma.wpsRank.deleteMany();
  await prisma.person.deleteMany();
  await prisma.meta.deleteMany();

  console.log('[importData] Existing data cleared.');
}

async function importPersonsStreaming(
  countries: CountriesIndex,
): Promise<{ validPersonIds: Set<string>; personsCount: number }> {
  assertFileExists(PERSONS_TSV_PATH, 'Persons.tsv');

  console.log(`[importData] Importing persons from ${PERSONS_TSV_PATH} (streaming) ...`);

  const validPersonIds = new Set<string>();
  let personsCount = 0;
  let batch: Prisma.PersonCreateManyInput[] = [];

  const stream = createReadStream(PERSONS_TSV_PATH, {
    encoding: 'utf8',
    highWaterMark: STREAM_HIGH_WATER_MARK,
  });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let isHeader = true;
  let headerIndices: Record<string, number> = {};

  for await (const line of rl) {
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    if (isHeader) {
      parts.forEach((name, i) => {
        headerIndices[name.trim().toLowerCase()] = i;
      });
      isHeader = false;
      continue;
    }

    const nameIdx = headerIndices['name'];
    const wcaIdIdx = headerIndices['wca_id'];
    const subIdIdx = headerIndices['sub_id'];
    const countryIdIdx = headerIndices['country_id'];
    if (nameIdx === undefined || wcaIdIdx === undefined || subIdIdx === undefined) continue;

    const name = parts[nameIdx]?.trim();
    const wcaId = parts[wcaIdIdx]?.trim();
    const subId = parts[subIdIdx]?.trim();
    let countryIdRaw = countryIdIdx !== undefined ? parts[countryIdIdx]?.trim() : '';

    if (!name || !wcaId || !subId || subId !== '1') continue;

    if (!countryIdRaw || countryIdRaw === '\\N') {
      countryIdRaw = '';
    }

    const countryEntry = countryIdRaw ? countries.countries[countryIdRaw] : undefined;
    const countryName = countryEntry?.name ?? (countryIdRaw || null);
    const countryIso2 = countryEntry?.iso2 ?? null;

    batch.push({
      id: wcaId,
      name,
      nameLower: name.toLowerCase(),
      countryId: countryIdRaw || null,
      countryName,
      countryIso2,
    });
    validPersonIds.add(wcaId);
    personsCount++;

    if (batch.length >= BATCH_SIZE) {
      await prisma.person.createMany({
        data: batch,
        skipDuplicates: true,
      });
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.person.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(`[importData] Imported ${personsCount.toLocaleString()} persons.`);
  return { validPersonIds, personsCount };
}

async function importWpsScores(wpsIndex: WpsIndex, validPersonIds: Set<string>): Promise<number> {
  console.log('[importData] Importing WPS scores ...');

  let imported = 0;
  let batch: Prisma.WpsScoreCreateManyInput[] = [];

  for (const [personId, entry] of Object.entries(wpsIndex)) {
    if (!validPersonIds.has(personId)) continue;
    if (entry == null || typeof entry.wps !== 'number') continue;

    batch.push({
      personId,
      score: entry.wps,
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.wpsScore.createMany({ data: batch, skipDuplicates: true });
      imported += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.wpsScore.createMany({ data: batch, skipDuplicates: true });
    imported += batch.length;
  }

  console.log(`[importData] Imported ${imported.toLocaleString()} WPS scores.`);
  return imported;
}

async function importWpsRanks(rankIndex: WpsRankIndex, validPersonIds: Set<string>): Promise<number> {
  console.log('[importData] Importing WPS ranks ...');

  let imported = 0;
  let batch: Prisma.WpsRankCreateManyInput[] = [];

  for (const [personId, rank] of Object.entries(rankIndex.ranks)) {
    if (!validPersonIds.has(personId)) continue;
    if (typeof rank !== 'number') continue;

    batch.push({
      personId,
      rank,
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.wpsRank.createMany({ data: batch, skipDuplicates: true });
      imported += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.wpsRank.createMany({ data: batch, skipDuplicates: true });
    imported += batch.length;
  }

  console.log(`[importData] Imported ${imported.toLocaleString()} WPS ranks.`);
  return imported;
}

async function importWpsBreakdowns(validPersonIds: Set<string>): Promise<number> {
  assertFileExists(WPS_BREAKDOWN_NDJSON_PATH, 'wps.breakdown.ndjson');
  console.log('[importData] Importing WPS breakdowns from NDJSON ...');

  const stream = createReadStream(WPS_BREAKDOWN_NDJSON_PATH, {
    encoding: 'utf8',
    highWaterMark: STREAM_HIGH_WATER_MARK,
  });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let imported = 0;
  let batch: Prisma.WpsBreakdownCreateManyInput[] = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const record = JSON.parse(trimmed) as BreakdownRecord;
    const personId = record.personId?.trim().toUpperCase();
    if (!personId || !validPersonIds.has(personId)) continue;
    if (!Array.isArray(record.breakdown)) continue;

    batch.push({
      personId,
      sumEventScores: record.sumEventScores,
      maxPossible: record.maxPossible,
      eventsParticipated: record.eventsParticipated,
      breakdown: record.breakdown as Prisma.InputJsonValue,
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.wpsBreakdown.createMany({ data: batch, skipDuplicates: true });
      imported += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.wpsBreakdown.createMany({ data: batch, skipDuplicates: true });
    imported += batch.length;
  }

  console.log(`[importData] Imported ${imported.toLocaleString()} WPS breakdown rows.`);
  return imported;
}

async function importMeta(rankIndex: WpsRankIndex): Promise<void> {
  console.log('[importData] Importing meta info ...');

  const data: Prisma.MetaCreateManyInput[] = [
    {
      key: 'generatedAt',
      value: rankIndex.generatedAt,
    },
    {
      key: 'totalRanked',
      value: String(rankIndex.totalRanked),
    },
  ];

  await prisma.meta.createMany({
    data,
    skipDuplicates: true,
  });

  console.log('[importData] Meta import complete.');
}

export async function runImport(): Promise<void> {
  const countries = await readCountriesIndex();
  const wpsIndex = await readWpsIndex();
  const wpsRankIndex = await readWpsRankIndex();

  await deleteExistingData();

  const { validPersonIds, personsCount } = await importPersonsStreaming(countries);
  const scoresCount = await importWpsScores(wpsIndex, validPersonIds);
  const ranksCount = await importWpsRanks(wpsRankIndex, validPersonIds);
  const breakdownCount = await importWpsBreakdowns(validPersonIds);
  await importMeta(wpsRankIndex);

  console.log(
    `[importData] Summary: persons=${personsCount}, scores=${scoresCount}, ranks=${ranksCount}, breakdowns=${breakdownCount}`,
  );
}
