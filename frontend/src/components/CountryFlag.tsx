import { useState } from 'react';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code (e.g. "KZ") for flag display */
  iso2?: string | null;
  /** Fallback text when iso2 is missing (e.g. country name) */
  name?: string | null;
  /** Optional class for the wrapper span */
  className?: string;
}

/**
 * Renders a country flag from ISO2 code, or "—" when iso2 is missing.
 * Parent should show country name next to this. Use for leaderboard, search, profile.
 *
 * Flags are SVG files from flag-icons served from /flags (see scripts/copy-flags.mjs).
 * Emoji flags are not used: Windows has no flag emoji and shows the letters "KZ".
 */
export function CountryFlag({ iso2, name, className = '' }: CountryFlagProps) {
  const [failed, setFailed] = useState(false);

  if (iso2 && iso2.length === 2) {
    const code = iso2.toLowerCase();
    return (
      <span className={`inline-flex items-center ${className}`.trim()} title={name ?? undefined}>
        {failed ? (
          <span className="text-xs font-medium text-gray-400">{iso2.toUpperCase()}</span>
        ) : (
          <img
            src={`/flags/${code}.svg`}
            alt={name ?? iso2.toUpperCase()}
            width={20}
            height={15}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-[15px] w-5 rounded-[2px] object-cover"
          />
        )}
      </span>
    );
  }
  return <span className={`text-gray-400 ${className}`.trim()}>—</span>;
}
