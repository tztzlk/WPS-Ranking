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

// --------------- TSV helpers ---------------

function getPersonsTsvPath(): string {
  return path.join(getCacheDir(), 'wca_export', 'Persons.tsv');
}

interface PersonTsvRow {
  name: string;
  wcaId: string;
  subId: string;
  countryId: string;
}

function parseRow(cols: string[]): PersonTsvRow | null {
  if (cols.length < 5) return null;
  return { name: cols[0], wcaId: cols[2], subId: cols[3], countryId: cols[4] };
}

// --------------- caches (LRU + 15-min TTL) ---------------

const personCache = new LRUCache<string, PersonLookupResult | null>(500);
const searchCache = new LRUCache<string, PersonLookupResult[]>(200);
const countryCache = new LRUCache<string, CountryPersonEntry[]>(100);

// --------------- public API ---------------

/**
 * Look up a single person by WCA ID. Streams Persons.tsv until found, then stops.
 */
export async function lookupPerson(personId: string): Promise<PersonLookupResult | null> {
  const cached = personCache.get(personId);
  if (cached !== undefined) return cached;

  const results = await scanTsv<PersonLookupResult>(
    getPersonsTsvPath(),
    (cols) => {
      const row = parseRow(cols);
      if (!row || row.wcaId !== personId || row.subId !== '1') return undefined;
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
  personCache.set(personId, found);
  return found;
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

  const results = await scanTsv<PersonLookupResult>(
    getPersonsTsvPath(),
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
      personCache.set(row.wcaId, person);
      return person;
    },
    limit,
  );

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

  const results = await scanTsv<CountryPersonEntry>(
    getPersonsTsvPath(),
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

  results.sort((a, b) => {
    const diff = b.wps - a.wps;
    return diff !== 0 ? diff : a.personId.localeCompare(b.personId);
  });
  countryCache.set(iso2Upper, results);
  return results;
}
