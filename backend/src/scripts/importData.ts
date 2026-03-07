import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_DATABASE_URL must be set');
}

const prisma = new PrismaClient({
  datasources: { db: { url: connectionString } },
});
const CACHE_DIR = path.join(process.cwd(), 'cache');
const BATCH_SIZE = 5000;

interface PersonRow {
  id: string;
  name: string;
  countryId: string;
}

interface CountryInfo {
  name: string;
  iso2: string;
}

async function parseTsv(): Promise<PersonRow[]> {
  const tsvPath = path.join(CACHE_DIR, 'wca_export', 'Persons.tsv');
  if (!fs.existsSync(tsvPath)) {
    throw new Error(`Persons.tsv not found at ${tsvPath}`);
  }

  const stream = fs.createReadStream(tsvPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const persons: PersonRow[] = [];
  const seen = new Set<string>();
  let isHeader = true;

  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }
    const cols = line.split('\t');
    if (cols.length < 5) continue;

    const name = cols[0].trim();
    const wcaId = cols[2].trim().toUpperCase();
    const subId = cols[3].trim();
    const countryId = cols[4].trim();

    if (!wcaId || subId !== '1' || seen.has(wcaId)) continue;
    seen.add(wcaId);
    persons.push({ id: wcaId, name, countryId });
  }

  console.log(`[import] Parsed ${persons.length} persons from TSV`);
  return persons;
}

function loadCountries(): Map<string, CountryInfo> {
  const filePath = path.join(CACHE_DIR, 'countries.index.json');
  if (!fs.existsSync(filePath)) {
    console.warn('[import] countries.index.json not found, country names will use IDs');
    return new Map();
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    countries: Record<string, CountryInfo>;
  };
  return new Map(Object.entries(raw.countries));
}

function loadWpsIndex(): Map<string, number> {
  const filePath = path.join(CACHE_DIR, 'wps.index.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`wps.index.json not found at ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, { wps: number }>;
  const map = new Map<string, number>();
  for (const [id, entry] of Object.entries(raw)) {
    if (typeof entry.wps === 'number') map.set(id, entry.wps);
  }
  console.log(`[import] Loaded ${map.size} WPS scores`);
  return map;
}

function loadWpsRankIndex(): { generatedAt: string; totalRanked: number; ranks: Map<string, number> } {
  const filePath = path.join(CACHE_DIR, 'wpsRank.index.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`wpsRank.index.json not found at ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    generatedAt: string;
    totalRanked: number;
    ranks: Record<string, number>;
  };
  const ranks = new Map(Object.entries(raw.ranks));
  console.log(`[import] Loaded ${ranks.size} WPS ranks (totalRanked: ${raw.totalRanked})`);
  return { generatedAt: raw.generatedAt, totalRanked: raw.totalRanked, ranks };
}

async function batchUpsert<T>(
  label: string,
  items: T[],
  upsertFn: (batch: T[]) => Promise<void>,
): Promise<void> {
  let done = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await upsertFn(batch);
    done += batch.length;
    if (done % 20000 === 0 || done === items.length) {
      console.log(`  [${label}] ${done.toLocaleString()} / ${items.length.toLocaleString()}`);
    }
  }
}

async function main(): Promise<void> {
  const t0 = Date.now();

  const persons = await parseTsv();
  const countries = loadCountries();
  const wpsScores = loadWpsIndex();
  const wpsRanks = loadWpsRankIndex();

  console.log('[import] Inserting persons...');
  const personData = persons.map((p) => {
    const ci = countries.get(p.countryId);
    return {
      id: p.id,
      name: p.name,
      nameLower: p.name.toLowerCase(),
      countryId: p.countryId,
      countryName: ci?.name ?? p.countryId,
      countryIso2: ci?.iso2 ?? null,
    };
  });

  await batchUpsert('persons', personData, async (batch) => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO persons (id, name, name_lower, country_id, country_name, country_iso2)
       VALUES ${batch.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         name_lower = EXCLUDED.name_lower,
         country_id = EXCLUDED.country_id,
         country_name = EXCLUDED.country_name,
         country_iso2 = EXCLUDED.country_iso2`,
      ...batch.flatMap((p) => [p.id, p.name, p.nameLower, p.countryId, p.countryName, p.countryIso2]),
    );
  });

  console.log('[import] Inserting WPS scores...');
  const scoreData = Array.from(wpsScores.entries()).map(([personId, score]) => ({ personId, score }));
  await batchUpsert('wps_scores', scoreData, async (batch) => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO wps_scores (person_id, score)
       VALUES ${batch.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')}
       ON CONFLICT (person_id) DO UPDATE SET score = EXCLUDED.score`,
      ...batch.flatMap((s) => [s.personId, s.score]),
    );
  });

  console.log('[import] Inserting WPS ranks...');
  const rankData = Array.from(wpsRanks.ranks.entries()).map(([personId, rank]) => ({ personId, rank }));
  await batchUpsert('wps_ranks', rankData, async (batch) => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO wps_ranks (person_id, rank)
       VALUES ${batch.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')}
       ON CONFLICT (person_id) DO UPDATE SET rank = EXCLUDED.rank`,
      ...batch.flatMap((r) => [r.personId, r.rank]),
    );
  });

  console.log('[import] Updating metadata...');
  await prisma.$executeRawUnsafe(
    `INSERT INTO meta (key, value) VALUES ('generatedAt', $1), ('totalRanked', $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    wpsRanks.generatedAt,
    String(wpsRanks.totalRanked),
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[import] Done in ${elapsed}s — ${personData.length} persons, ${scoreData.length} scores, ${rankData.length} ranks`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[import] Failed:', err);
  process.exit(1);
});
