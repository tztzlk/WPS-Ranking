/**
 * Offline script to import precomputed WPS data into PostgreSQL via Prisma.
 * Safe to re-run; it clears target tables and then bulk inserts fresh data.
 * Does not rebuild leaderboard snapshot; use refreshAllData or call rebuildLeaderboardSnapshot separately.
 */
import fs from 'fs';
import path from 'path';
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

const BATCH_SIZE = 2000;

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

function assertFileExists(filePath: string, label: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required ${label} not found at ${filePath}`);
  }
}

async function readPersonsTsv(): Promise<
  Array<Pick<Prisma.PersonCreateManyInput, 'id' | 'name' | 'nameLower' | 'countryId' | 'countryName' | 'countryIso2'>>
> {
  assertFileExists(PERSONS_TSV_PATH, 'Persons.tsv');

  console.log(`[importData] Reading Persons TSV from ${PERSONS_TSV_PATH} ...`);
  const raw = await fs.promises.readFile(PERSONS_TSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  const persons: Array<Pick<
    Prisma.PersonCreateManyInput,
    'id' | 'name' | 'nameLower' | 'countryId' | 'countryName' | 'countryIso2'
  >> = [];

  // Load countries index eagerly so we can enrich persons while parsing.
  const countries = await readCountriesIndex();

  let headerIndices: Record<string, number> = {};
  const getHeaderIndices = (cols: string[]) => {
    const idx: Record<string, number> = {};
    cols.forEach((name, i) => {
      idx[name.trim().toLowerCase()] = i;
    });
    return idx;
  };

  lines.forEach((line, idx) => {
    if (!line.trim()) return;

    const parts = line.split('\t');
    if (parts.length < 3) return;

    if (idx === 0) {
      headerIndices = getHeaderIndices(parts);
      return;
    }

    const nameIdx = headerIndices['name'];
    const wcaIdIdx = headerIndices['wca_id'];
    const subIdIdx = headerIndices['sub_id'];
    const countryIdIdx = headerIndices['country_id'];
    if (nameIdx === undefined || wcaIdIdx === undefined || subIdIdx === undefined) return;

    const name = parts[nameIdx]?.trim();
    const wcaId = parts[wcaIdIdx]?.trim();
    const subId = parts[subIdIdx]?.trim();
    let countryIdRaw = countryIdIdx !== undefined ? parts[countryIdIdx]?.trim() : '';

    if (!name || !wcaId || !subId) return;
    if (subId !== '1') return;

    if (!countryIdRaw || countryIdRaw === '\\N') {
      countryIdRaw = '';
    }

    const countryEntry = countryIdRaw ? countries.countries[countryIdRaw] : undefined;
    const countryName = countryEntry?.name ?? (countryIdRaw || null);
    const countryIso2 = countryEntry?.iso2 ?? null;

    persons.push({
      id: wcaId,
      name,
      nameLower: name.toLowerCase(),
      countryId: countryIdRaw || null,
      countryName,
      countryIso2,
    });
  });

  console.log(`[importData] Parsed ${persons.length.toLocaleString()} persons with subId === "1".`);
  return persons;
}

async function readCountriesIndex(): Promise<CountriesIndex> {
  assertFileExists(COUNTRIES_INDEX_PATH, 'countries.index.json');
  const raw = await fs.promises.readFile(COUNTRIES_INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw) as CountriesIndex;
  return parsed;
}

async function readWpsIndex(): Promise<WpsIndex> {
  assertFileExists(WPS_INDEX_PATH, 'wps.index.json');
  const raw = await fs.promises.readFile(WPS_INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw) as WpsIndex;
  return parsed;
}

async function readWpsRankIndex(): Promise<WpsRankIndex> {
  assertFileExists(WPS_RANK_INDEX_PATH, 'wpsRank.index.json');
  const raw = await fs.promises.readFile(WPS_RANK_INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw) as WpsRankIndex;
  return parsed;
}

async function deleteExistingData(): Promise<void> {
  console.log('[importData] Clearing existing data (LeaderboardEntry, WpsScore, WpsRank, Person, Meta) ...');

  await prisma.leaderboardEntry.deleteMany();
  await prisma.wpsScore.deleteMany();
  await prisma.wpsRank.deleteMany();
  await prisma.person.deleteMany();
  await prisma.meta.deleteMany();

  console.log('[importData] Existing data cleared.');
}

async function importPersons(
  persons: Array<Pick<Prisma.PersonCreateManyInput, 'id' | 'name' | 'nameLower' | 'countryId' | 'countryName' | 'countryIso2'>>
): Promise<void> {
  console.log('[importData] Importing persons ...');

  for (let i = 0; i < persons.length; i += BATCH_SIZE) {
    const batch = persons.slice(i, i + BATCH_SIZE);
    await prisma.person.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(`[importData] Imported ${persons.length.toLocaleString()} persons.`);
}

async function importWpsScores(
  wpsIndex: WpsIndex,
  validPersonIds: Set<string>
): Promise<number> {
  console.log('[importData] Importing WPS scores ...');

  const scores: Prisma.WpsScoreCreateManyInput[] = [];

  for (const [personId, entry] of Object.entries(wpsIndex)) {
    if (!validPersonIds.has(personId)) continue;
    if (entry == null || typeof entry.wps !== 'number') continue;

    scores.push({
      personId,
      score: entry.wps,
    });
  }

  for (let i = 0; i < scores.length; i += BATCH_SIZE) {
    const batch = scores.slice(i, i + BATCH_SIZE);
    await prisma.wpsScore.createMany({ data: batch, skipDuplicates: true });
  }

  console.log(`[importData] Imported ${scores.length.toLocaleString()} WPS scores.`);
  return scores.length;
}

async function importWpsRanks(
  rankIndex: WpsRankIndex,
  validPersonIds: Set<string>
): Promise<number> {
  console.log('[importData] Importing WPS ranks ...');

  const ranks: Prisma.WpsRankCreateManyInput[] = [];

  for (const [personId, rank] of Object.entries(rankIndex.ranks)) {
    if (!validPersonIds.has(personId)) continue;
    if (typeof rank !== 'number') continue;

    ranks.push({
      personId,
      rank,
    });
  }

  for (let i = 0; i < ranks.length; i += BATCH_SIZE) {
    const batch = ranks.slice(i, i + BATCH_SIZE);
    await prisma.wpsRank.createMany({ data: batch, skipDuplicates: true });
  }

  console.log(`[importData] Imported ${ranks.length.toLocaleString()} WPS ranks.`);
  return ranks.length;
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
  const persons = await readPersonsTsv();
  const wpsIndex = await readWpsIndex();
  const wpsRankIndex = await readWpsRankIndex();

  const validPersonIds = new Set(persons.map((p) => p.id));

  await deleteExistingData();

  await importPersons(persons);
  const scoresCount = await importWpsScores(wpsIndex, validPersonIds);
  const ranksCount = await importWpsRanks(wpsRankIndex, validPersonIds);
  await importMeta(wpsRankIndex);

  console.log(`[importData] Summary: persons=${persons.length}, scores=${scoresCount}, ranks=${ranksCount}`);
}

