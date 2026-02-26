import ReactCountryFlag from 'react-country-flag';

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
 */
export function CountryFlag({ iso2, name, className = '' }: CountryFlagProps) {
  if (iso2 && iso2.length === 2) {
    return (
      <span className={`inline-flex items-center ${className}`.trim()} title={name ?? undefined}>
        <ReactCountryFlag countryCode={iso2} svg className="!w-5 !h-4" />
      </span>
    );
  }
  return <span className={`text-gray-500 ${className}`.trim()}>—</span>;
}
