import { findPersonById, toProfileResponse, getMetaValue } from './personDb';

/** Profile result for OG/ogMeta (includes totalRanked for rank text). */
export interface ProfileForOg {
  id: string;
  name: string;
  countryName: string | null;
  countryIso2: string | null;
  wpsScore: number;
  wpsRank: number | null;
  totalRanked: number;
  /** Alias for OG compatibility */
  wps: number;
  /** Alias for OG compatibility */
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
  const profile = toProfileResponse(person);

  return {
    ...profile,
    totalRanked,
    wps: person.score,
    globalWpsRank: person.rank,
  };
}
