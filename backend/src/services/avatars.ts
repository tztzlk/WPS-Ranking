import { prisma } from '../lib/prisma';

/**
 * WCA photo thumbnails by WCA ID, for the people that have one stored.
 * Avatars are decoration: if the lookup fails (for example before the
 * person_avatars migration has run), lists are returned without them.
 */
export async function getAvatarUrls(personIds: string[]): Promise<Map<string, string>> {
  if (personIds.length === 0) return new Map();
  try {
    const rows = await prisma.personAvatar.findMany({ where: { personId: { in: personIds } } });
    return new Map(rows.map((r) => [r.personId, r.thumbUrl]));
  } catch (error) {
    console.warn('[avatars] lookup failed, continuing without avatars:', (error as Error).message);
    return new Map();
  }
}

/** Adds `avatarUrl` (or null) to every item, looked up by `personId`. */
export async function withAvatars<T extends { personId: string }>(items: T[]): Promise<(T & { avatarUrl: string | null })[]> {
  const avatars = await getAvatarUrls(items.map((i) => i.personId));
  return items.map((i) => ({ ...i, avatarUrl: avatars.get(i.personId) ?? null }));
}
