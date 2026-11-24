import { useEffect, useState } from 'react';

const WCA_PERSON_URL = 'https://www.worldcubeassociation.org/api/v0/persons';
const cache = new Map<string, Promise<string | null>>();

/** Photo thumbnail straight from the WCA API (allowed cross-origin); null if none. */
export function fetchWcaAvatar(wcaId: string): Promise<string | null> {
  let request = cache.get(wcaId);
  if (!request) {
    request = fetch(`${WCA_PERSON_URL}/${encodeURIComponent(wcaId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { person?: { avatar?: { thumb_url?: string; is_default?: boolean } } } | null) => {
        const avatar = body?.person?.avatar;
        return avatar?.thumb_url && avatar.is_default === false ? avatar.thumb_url : null;
      })
      .catch(() => {
        cache.delete(wcaId);
        return null;
      });
    cache.set(wcaId, request);
  }
  return request;
}

export function useWcaAvatar(wcaId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!wcaId) return;
    let active = true;
    fetchWcaAvatar(wcaId).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [wcaId]);
  return url;
}
