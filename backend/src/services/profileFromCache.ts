import { findPersonById, getMetaValue } from './personDb';

/** Profile result for OG/ogMeta (includes totalRanked for rank text). */
export interface ProfileForOg {
  id: string;
  name: string;
  countryName: string | null;
  countryIso2: string | null;
  wpsScore: number;
  wpsRank: number | null;
  totalRanked: number;
  wps: number;
  globalWpsRank: number | null;
}

export async function getProfileByPersonId(personId: string): Promise<ProfileForOg | null> {
  const normalizedId = personId?.trim().toUpperCase();
  if (!normalizedId) return null;

  const person = await findPersonById(normalizedId);
  if (!person) return null;

  const totalRankedRaw = await getMetaValue('totalRanked');
  const totalRanked =
    totalRankedRaw != null && totalRankedRaw !== ''
      ? Math.max(0, Number.parseInt(String(totalRankedRaw), 10)) || 0
      : 0;

  return {
    id: person.id,
    name: person.name,
    countryName: person.countryName,
    countryIso2: person.countryIso2,
    wpsScore: person.score,
    wpsRank: person.rank,
    totalRanked,
    wps: person.score,
    globalWpsRank: person.rank,
  };
}
