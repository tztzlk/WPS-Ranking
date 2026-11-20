import { useEffect, useState } from 'react';

export function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

/**
 * WCA profile photo, or the cuber's initials when there is no photo or it
 * fails to load. `className` sets the size and text size.
 */
export function Avatar({
  name,
  url,
  className = 'h-8 w-8 text-xs',
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  const base = `shrink-0 rounded-full ${className}`;
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${base} bg-gray-700 object-cover ring-1 ring-gray-600`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${base} flex items-center justify-center bg-green-500/15 font-semibold text-green-300 ring-1 ring-green-500/30`}
    >
      {initials(name)}
    </span>
  );
}

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
