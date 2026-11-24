import { useEffect, useState } from 'react';

function initials(name: string): string {
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
