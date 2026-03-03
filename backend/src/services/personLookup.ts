import fs from 'fs';
import path from 'path';
import { getCacheDir } from '../utils/cachePath';
import { getWpsIndex, getCountriesIndex } from './indexStore';
import { scanTsv } from '../utils/tsvStream';
import { LRUCache } from '../utils/lruCache';

export interface PersonLookupResult {
  personId: string;
  name: string;
  countryId: string;
  countryName: string;
  countryIso2: string;
}

export interface CountryPersonEntry {
  personId: string;
  name: string;
  countryId: string;
  countryName: string;
  countryIso2: string;
  wps: number;
}

// --------------- country info maps (lazy from countries.index.json) ---------------

let countryIdToInfo: Map<string, { name: string; iso2: string }> | null = null;
let iso2ToCountryId: Map<string, string> | null = null;

function ensureCountryMaps(): void {
  if (countryIdToInfo) return;
  countryIdToInfo = new Map();
  iso2ToCountryId = new Map();
  const ci = getCountriesIndex();
  if (!ci?.countries) return;
  for (const [cid, info] of Object.entries(ci.countries)) {
    countryIdToInfo.set(cid, info);
    iso2ToCountryId.set(info.iso2.toUpperCase(), cid);
  }
}

function getCountryInfo(countryId: string): { name: string; iso2: string } | undefined {
  ensureCountryMaps();
  return countryIdToInfo?.get(countryId);
}

// --------------- TSV + JSON helpers ---------------

function getPersonsTsvPath(): string {
  return path.join(getCacheDir(), 'wca_export', 'Persons.tsv');
}

function getPersonsIndexPath(): string {
  return path.join(getCacheDir(), 'persons.index.json');
}

interface PersonTsvRow {
  wcaId: string;
  subId: string;
  name: string;
  countryId: string;
}

interface PersonsIndexEntry {
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
}

let personsIndexCache: Record<string, PersonsIndexEntry> | null = null;
let personsIndexLoaded = false;
let loggedMissingTsv = false;
let loggedSchema = false;

function logSchemaOnce(): void {
  if (loggedSchema) return;
  loggedSchema = true;
  console.log(
    '[personLookup] Persons.tsv schema expected: name, gender, wca_id, sub_id, country_id',
  );
}

function loadPersonsIndex(): Record<string, PersonsIndexEntry> | null {
  if (personsIndexLoaded) return personsIndexCache;
  personsIndexLoaded = true;

  const indexPath = getPersonsIndexPath();
  if (!fs.existsSync(indexPath)) {
    console.warn(
      `[personLookup] persons.index.json not found at ${indexPath} (no JSON fallback available)`,
    );
    personsIndexCache = null;
    return personsIndexCache;
  }

  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, PersonsIndexEntry>;
    const count = Object.keys(parsed).length;
    console.log(
      `[personLookup] Loaded persons.index.json with ${count} entries (fallback source)`,
    );
    personsIndexCache = parsed;
  } catch (err) {
    console.error('[personLookup] Failed to load persons.index.json:', err);
    personsIndexCache = null;
  }

  return personsIndexCache;
}

export function parseRow(cols: string[]): PersonTsvRow | null {
  // Persons.tsv header (confirmed from file):
  // name\tgender\twca_id\tsub_id\tcountry_id
  //  0      1        2       3         4
  logSchemaOnce();

  if (cols.length < 5) return null;

  const name = cols[0].trim();
  const wcaId = cols[2].trim().toUpperCase();
  const subId = cols[3].trim();
  const countryId = cols[4].trim();

  if (!wcaId) return null;

  return { wcaId, subId, name, countryId };
}

// --------------- caches (LRU + 15-min TTL) ---------------

const personCache = new LRUCache<string, PersonLookupResult | null>(500);
const searchCache = new LRUCache<string, PersonLookupResult[]>(200);
const countryCache = new LRUCache<string, CountryPersonEntry[]>(100);

// --------------- public API ---------------

/**
 * Look up a single person by WCA ID.
 * Prefers streaming Persons.tsv; falls back to persons.index.json if TSV is missing.
 */
export async function lookupPerson(personId: string): Promise<PersonLookupResult | null> {
  const normalizedInput = personId.trim().toUpperCase();

  const cached = personCache.get(normalizedInput);
  if (cached !== undefined) return cached;

  const tsvPath = getPersonsTsvPath();

  if (fs.existsSync(tsvPath)) {
    const results = await scanTsv<PersonLookupResult>(
      tsvPath,
      (cols) => {
        const row = parseRow(cols);
        if (!row || row.subId !== '1') return undefined;

        const normalizedRowId = row.wcaId.trim().toUpperCase();
        if (normalizedRowId !== normalizedInput) return undefined;
        const ci = getCountryInfo(row.countryId);
        return {
          personId: row.wcaId,
          name: row.name,
          countryId: row.countryId,
          countryName: ci?.name ?? row.countryId,
          countryIso2: ci?.iso2 ?? '',
        };
      },
      1,
    );

    const found = results[0] ?? null;
    personCache.set(normalizedInput, found);
    return found;
  }

  if (!loggedMissingTsv) {
    loggedMissingTsv = true;
    console.warn(
      `[personLookup] Persons.tsv not found at ${tsvPath}, falling back to persons.index.json`,
    );
  }

  const idx = loadPersonsIndex();
  if (!idx) {
    personCache.set(normalizedInput, null);
    return null;
  }

  const entry = idx[normalizedInput];
  if (!entry) {
    personCache.set(normalizedInput, null);
    return null;
  }

  const ci = entry.countryId ? getCountryInfo(entry.countryId) : undefined;
  const result: PersonLookupResult = {
    personId: normalizedInput,
    name: entry.name,
    countryId: entry.countryId ?? '',
    countryName: entry.countryName ?? ci?.name ?? entry.countryId ?? '',
    countryIso2: entry.countryIso2 ?? ci?.iso2 ?? '',
  };

  personCache.set(normalizedInput, result);
  return result;
}

/**
 * Search persons by name, WCA ID, or country substring.
 * Streams Persons.tsv and stops at limit.
 */
export async function searchPersons(query: string, limit: number): Promise<PersonLookupResult[]> {
  const cacheKey = `${query.toLowerCase()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const qLower = query.toLowerCase();
  const seen = new Set<string>();
  const tsvPath = getPersonsTsvPath();

  let results: PersonLookupResult[] = [];

  if (fs.existsSync(tsvPath)) {
    results = await scanTsv<PersonLookupResult>(
      tsvPath,
      (cols) => {
        const row = parseRow(cols);
        if (!row || row.subId !== '1') return undefined;
        if (seen.has(row.wcaId)) return undefined;

        const nameMatch = row.name.toLowerCase().includes(qLower);
        const idMatch = row.wcaId.toLowerCase().includes(qLower);
        const countryMatch = row.countryId.toLowerCase().includes(qLower);
        if (!nameMatch && !idMatch && !countryMatch) return undefined;

        seen.add(row.wcaId);
        const ci = getCountryInfo(row.countryId);
        const person: PersonLookupResult = {
          personId: row.wcaId,
          name: row.name,
          countryId: row.countryId,
          countryName: ci?.name ?? row.countryId,
          countryIso2: ci?.iso2 ?? '',
        };
        personCache.set(row.wcaId.toUpperCase(), person);
        return person;
      },
      limit,
    );
  } else {
    if (!loggedMissingTsv) {
      loggedMissingTsv = true;
      console.warn(
        `[personLookup] Persons.tsv not found at ${tsvPath}, falling back to persons.index.json`,
      );
    }

    const idx = loadPersonsIndex();
    if (idx) {
      for (const [id, entry] of Object.entries(idx)) {
        if (results.length >= limit) break;
        const idLower = id.toLowerCase();
        const nameLower = entry.name.toLowerCase();
        const countryIdLower = entry.countryId?.toLowerCase() ?? '';
        const countryNameLower = entry.countryName?.toLowerCase() ?? '';

        const nameMatch = nameLower.includes(qLower);
        const idMatch = idLower.includes(qLower);
        const countryMatch =
          countryIdLower.includes(qLower) || countryNameLower.includes(qLower);

        if (!nameMatch && !idMatch && !countryMatch) continue;
        if (seen.has(id)) continue;

        seen.add(id);
        const ci = entry.countryId ? getCountryInfo(entry.countryId) : undefined;
        const person: PersonLookupResult = {
          personId: id,
          name: entry.name,
          countryId: entry.countryId ?? '',
          countryName: entry.countryName ?? ci?.name ?? entry.countryId ?? '',
          countryIso2: entry.countryIso2 ?? ci?.iso2 ?? '',
        };
        personCache.set(id.toUpperCase(), person);
        results.push(person);
      }
    }
  }

  searchCache.set(cacheKey, results);
  return results;
}

/**
 * Get all ranked persons from a country, sorted by WPS descending.
 * Full TSV scan; cached per country.
 */
export async function getPersonsByCountry(countryIso2: string): Promise<CountryPersonEntry[]> {
  const iso2Upper = countryIso2.toUpperCase();
  const cached = countryCache.get(iso2Upper);
  if (cached !== undefined) return cached;

  ensureCountryMaps();
  const targetCountryId = iso2ToCountryId?.get(iso2Upper);
  if (!targetCountryId) return [];

  const wpsIdx = getWpsIndex();
  const seen = new Set<string>();

  const tsvPath = getPersonsTsvPath();

  let results: CountryPersonEntry[] = [];

  if (fs.existsSync(tsvPath)) {
    results = await scanTsv<CountryPersonEntry>(
      tsvPath,
      (cols) => {
        const row = parseRow(cols);
        if (!row || row.subId !== '1') return undefined;
        if (row.countryId !== targetCountryId) return undefined;
        if (seen.has(row.wcaId)) return undefined;
        seen.add(row.wcaId);

        const wpsEntry = wpsIdx[row.wcaId];
        if (!wpsEntry || typeof wpsEntry.wps !== 'number') return undefined;

        const ci = getCountryInfo(row.countryId);
        return {
          personId: row.wcaId,
          name: row.name,
          countryId: row.countryId,
          countryName: ci?.name ?? row.countryId,
          countryIso2: iso2Upper,
          wps: wpsEntry.wps,
        };
      },
    );
  } else {
    if (!loggedMissingTsv) {
      loggedMissingTsv = true;
      console.warn(
        `[personLookup] Persons.tsv not found at ${tsvPath}, falling back to persons.index.json`,
      );
    }

    const idx = loadPersonsIndex();
    if (idx) {
      for (const [id, entry] of Object.entries(idx)) {
        if (seen.has(id)) continue;
        if (entry.countryId !== targetCountryId) continue;
        const wpsEntry = wpsIdx[id];
        if (!wpsEntry || typeof wpsEntry.wps !== 'number') continue;
        seen.add(id);

        const ci = getCountryInfo(entry.countryId);
        results.push({
          personId: id,
          name: entry.name,
          countryId: entry.countryId,
          countryName: entry.countryName ?? ci?.name ?? entry.countryId,
          countryIso2: iso2Upper,
          wps: wpsEntry.wps,
        });
      }
    }
  }

  results.sort((a, b) => {
    const diff = b.wps - a.wps;
    return diff !== 0 ? diff : a.personId.localeCompare(b.personId);
  });
  countryCache.set(iso2Upper, results);
  return results;
}
