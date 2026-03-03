import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { getCacheDir } from '../utils/cachePath';
import { getWpsIndex, getWpsRankIndex, getCountriesIndex } from './indexStore';

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

class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    if (this.map.size >= this.maxSize) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, value);
  }
}

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

function getPersonsTsvPath(): string {
  return path.join(getCacheDir(), 'wca_export', 'Persons.tsv');
}

const personCache = new LRUCache<string, PersonLookupResult | null>(500);
const searchCache = new LRUCache<string, PersonLookupResult[]>(200);
const countryCache = new LRUCache<string, CountryPersonEntry[]>(100);

interface TsvRow {
  name: string;
  wcaId: string;
  subId: string;
  countryId: string;
}

function parseLine(line: string): TsvRow | null {
  const parts = line.split('\t');
  if (parts.length < 5) return null;
  return { name: parts[0], wcaId: parts[2], subId: parts[3], countryId: parts[4] };
}

function tsvExists(): boolean {
  return fs.existsSync(getPersonsTsvPath());
}

/**
 * Look up a single person by WCA ID. Scans Persons.tsv until found, then stops.
 */
export async function lookupPerson(personId: string): Promise<PersonLookupResult | null> {
  const cached = personCache.get(personId);
  if (cached !== undefined) return cached;

  if (!tsvExists()) return null;

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(getPersonsTsvPath(), { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    let found: PersonLookupResult | null = null;
    let header = true;

    rl.on('line', (line) => {
      if (header) { header = false; return; }
      const row = parseLine(line);
      if (!row || row.wcaId !== personId) return;
      if (row.subId !== '1') return;

      const ci = getCountryInfo(row.countryId);
      found = {
        personId: row.wcaId,
        name: row.name,
        countryId: row.countryId,
        countryName: ci?.name ?? row.countryId,
        countryIso2: ci?.iso2 ?? '',
      };
      rl.close();
      rl.removeAllListeners();
    });

    rl.on('close', () => {
      personCache.set(personId, found);
      resolve(found);
    });
    rl.on('error', () => resolve(null));
  });
}

/**
 * Search persons by name or WCA ID substring. Scans Persons.tsv and stops at limit.
 */
export async function searchPersons(query: string, limit: number): Promise<PersonLookupResult[]> {
  const cacheKey = `${query.toLowerCase()}|${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (!tsvExists()) return [];

  const qLower = query.toLowerCase();

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(getPersonsTsvPath(), { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    const results: PersonLookupResult[] = [];
    const seen = new Set<string>();
    let header = true;

    rl.on('line', (line) => {
      if (header) { header = false; return; }
      if (results.length >= limit) { rl.close(); rl.removeAllListeners(); return; }

      const row = parseLine(line);
      if (!row || row.subId !== '1') return;
      if (seen.has(row.wcaId)) return;

      const nameMatch = row.name.toLowerCase().includes(qLower);
      const idMatch = row.wcaId.toLowerCase().includes(qLower);
      if (!nameMatch && !idMatch) return;

      seen.add(row.wcaId);
      const ci = getCountryInfo(row.countryId);
      const person: PersonLookupResult = {
        personId: row.wcaId,
        name: row.name,
        countryId: row.countryId,
        countryName: ci?.name ?? row.countryId,
        countryIso2: ci?.iso2 ?? '',
      };
      results.push(person);
      personCache.set(row.wcaId, person);
    });

    rl.on('close', () => {
      searchCache.set(cacheKey, results);
      resolve(results);
    });
    rl.on('error', () => resolve([]));
  });
}

/**
 * Get all ranked persons from a country, sorted by WPS descending.
 * Full TSV scan; cached per country.
 */
export async function getPersonsByCountry(countryIso2: string): Promise<CountryPersonEntry[]> {
  const iso2Upper = countryIso2.toUpperCase();
  const cached = countryCache.get(iso2Upper);
  if (cached !== undefined) return cached;

  if (!tsvExists()) return [];

  ensureCountryMaps();
  const targetCountryId = iso2ToCountryId?.get(iso2Upper);
  if (!targetCountryId) return [];

  const wpsIdx = getWpsIndex();

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(getPersonsTsvPath(), { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    const results: CountryPersonEntry[] = [];
    const seen = new Set<string>();
    let header = true;

    rl.on('line', (line) => {
      if (header) { header = false; return; }
      const row = parseLine(line);
      if (!row || row.subId !== '1') return;
      if (row.countryId !== targetCountryId) return;
      if (seen.has(row.wcaId)) return;
      seen.add(row.wcaId);

      const wpsEntry = wpsIdx[row.wcaId];
      if (!wpsEntry || typeof wpsEntry.wps !== 'number') return;

      const ci = getCountryInfo(row.countryId);
      results.push({
        personId: row.wcaId,
        name: row.name,
        countryId: row.countryId,
        countryName: ci?.name ?? row.countryId,
        countryIso2: iso2Upper,
        wps: wpsEntry.wps,
      });
    });

    rl.on('close', () => {
      results.sort((a, b) => {
        const diff = b.wps - a.wps;
        if (diff !== 0) return diff;
        return a.personId.localeCompare(b.personId);
      });
      countryCache.set(iso2Upper, results);
      resolve(results);
    });
    rl.on('error', () => resolve([]));
  });
}
