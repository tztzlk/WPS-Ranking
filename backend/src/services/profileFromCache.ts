import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve(__dirname, '../../cache');
const PERSONS_INDEX_PATH = path.join(CACHE_DIR, 'persons.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');
const LEADERBOARD_CACHE_PATH = path.join(CACHE_DIR, 'leaderboard.top100.json');

export interface ProfileCacheResult {
  personId: string;
  name: string;
  countryId?: string;
  wps: number;
  generatedAt: string;
}

function getGeneratedAt(): string {
  try {
    if (fs.existsSync(LEADERBOARD_CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(LEADERBOARD_CACHE_PATH, 'utf8'));
      if (data.generatedAt) return data.generatedAt;
    }
  } catch {
    // ignore
  }
  return new Date().toISOString();
}

/**
 * Look up profile by WCA ID from cache files. Returns null if person not found.
 */
export function getProfileByPersonId(personId: string): ProfileCacheResult | null {
  const normalizedId = personId?.trim();
  if (!normalizedId) return null;

  if (!fs.existsSync(PERSONS_INDEX_PATH)) return null;
  const personsIndex: Record<string, { name: string; countryId?: string }> = JSON.parse(
    fs.readFileSync(PERSONS_INDEX_PATH, 'utf8')
  );
  const person = personsIndex[normalizedId];
  if (!person) return null;

  let wps = 0;
  if (fs.existsSync(WPS_INDEX_PATH)) {
    const wpsIndex: Record<string, { wps: number }> = JSON.parse(
      fs.readFileSync(WPS_INDEX_PATH, 'utf8')
    );
    const wpsEntry = wpsIndex[normalizedId];
    if (wpsEntry != null && typeof wpsEntry.wps === 'number') wps = wpsEntry.wps;
  }

  return {
    personId: normalizedId,
    name: person.name,
    countryId: person.countryId,
    wps,
    generatedAt: getGeneratedAt(),
  };
}
