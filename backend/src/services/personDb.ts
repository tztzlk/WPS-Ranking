import fs from 'fs';
import path from 'path';
import type { SearchResultItem, ProfileResponse } from '../types';

const CACHE_DIR = process.env.CACHE_DIR
  ? path.resolve(process.env.CACHE_DIR)
  : path.join(process.cwd(), 'cache');

const PERSONS_INDEX_PATH = path.join(CACHE_DIR, 'persons.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');
const WPS_RANK_INDEX_PATH = path.join(CACHE_DIR, 'wpsRank.index.json');

interface PersonsIndexEntry {
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
}

type PersonsIndex = Record<string, PersonsIndexEntry>;

interface WpsIndexEntry {
  wps: number;
}

type WpsIndex = Record<string, WpsIndexEntry>;

interface WpsRankIndex {
  generatedAt: string;
  totalRanked: number;
  ranks: Record<string, number>;
}

let personsIndexCache: PersonsIndex | null = null;
let wpsIndexCache: WpsIndex | null = null;
let wpsRankIndexCache: WpsRankIndex | null = null;

async function loadJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to load JSON cache at ${filePath}:`, error);
    return null;
  }
}

async function getPersonsIndex(): Promise<PersonsIndex | null> {
  if (!personsIndexCache) {
    personsIndexCache = (await loadJsonIfExists<PersonsIndex>(PERSONS_INDEX_PATH)) ?? null;
  }
  return personsIndexCache;
}

async function getWpsIndex(): Promise<WpsIndex | null> {
  if (!wpsIndexCache) {
    wpsIndexCache = (await loadJsonIfExists<WpsIndex>(WPS_INDEX_PATH)) ?? null;
  }
  return wpsIndexCache;
}

async function getWpsRankIndex(): Promise<WpsRankIndex | null> {
  if (!wpsRankIndexCache) {
    wpsRankIndexCache = (await loadJsonIfExists<WpsRankIndex>(WPS_RANK_INDEX_PATH)) ?? null;
  }
  return wpsRankIndexCache;
}

export interface PersonWithScoreRank {
  id: string;
  name: string;
  countryId: string | null;
  countryName: string | null;
  countryIso2: string | null;
  score: number;
  rank: number | null;
}

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

export function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

export async function findPersonById(personId: string): Promise<PersonWithScoreRank | null> {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const [personsIndex, wpsIndex, wpsRankIndex] = await Promise.all([
    getPersonsIndex(),
    getWpsIndex(),
    getWpsRankIndex(),
  ]);

  if (!personsIndex) return null;

  const person = personsIndex[normalized];
  if (!person) return null;

  const score = wpsIndex?.[normalized]?.wps ?? 0;
  const rank = wpsRankIndex?.ranks?.[normalized] ?? null;

  return {
    id: normalized,
    name: person.name,
    countryId: person.countryId ?? null,
    countryName: person.countryName ?? null,
    countryIso2: person.countryIso2 ?? null,
    score,
    rank,
  };
}

const SEARCH_LIMIT = 20;

export async function searchPersons(
  query: string,
  limit: number = SEARCH_LIMIT,
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  const queryLower = q.toLowerCase();
  const queryUpper = q.toUpperCase();
  const wcaIdExact = isValidWCAId(q) ? queryUpper : null;

  const take = Math.min(Math.max(1, limit), SEARCH_LIMIT);

  const [personsIndex, wpsIndex, wpsRankIndex] = await Promise.all([
    getPersonsIndex(),
    getWpsIndex(),
    getWpsRankIndex(),
  ]);

  if (!personsIndex) return [];

  const results: SearchResultItem[] = [];

  for (const [id, info] of Object.entries(personsIndex)) {
    const nameLower = info.name.toLowerCase();
    const countryName = info.countryName ?? '';
    const countryNameLower = countryName.toLowerCase();

    const matches =
      (wcaIdExact ? id === wcaIdExact : false) ||
      nameLower.includes(queryLower) ||
      id.includes(queryUpper) ||
      countryNameLower.includes(queryLower);

    if (!matches) continue;

    const wpsScore = wpsIndex?.[id]?.wps ?? 0;
    const wpsRank = wpsRankIndex?.ranks?.[id] ?? null;

    results.push({
      wcaId: id,
      name: info.name,
      countryIso2: info.countryIso2,
      wpsScore,
      wpsRank,
    });
  }

  results.sort((a, b) => {
    const scoreDiff = b.wpsScore - a.wpsScore;
    if (scoreDiff !== 0) return scoreDiff;

    const rankA = a.wpsRank ?? Number.POSITIVE_INFINITY;
    const rankB = b.wpsRank ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;

    return a.wcaId.localeCompare(b.wcaId);
  });

  return results.slice(0, take);
}

export async function getMetaValue(key: string): Promise<string | null> {
  const wpsRankIndex = await getWpsRankIndex();
  if (!wpsRankIndex) return null;

  if (key === 'totalRanked') {
    return String(wpsRankIndex.totalRanked);
  }

  if (key === 'generatedAt') {
    return wpsRankIndex.generatedAt;
  }

  return null;
}

export function toProfileResponse(
  person: PersonWithScoreRank,
  extra: {
    totalRanked: number;
    countryRank: number | null;
    countryTotal: number | null;
    lastUpdated: string;
  },
): ProfileResponse {
  return {
    wcaId: person.id,
    name: person.name,
    countryName: person.countryName,
    countryIso2: person.countryIso2,
    wpsScore: person.score,
    globalWpsRank: person.rank,
    totalRanked: extra.totalRanked,
    countryRank: extra.countryRank,
    countryTotal: extra.countryTotal,
    lastUpdated: extra.lastUpdated,
  };
}
