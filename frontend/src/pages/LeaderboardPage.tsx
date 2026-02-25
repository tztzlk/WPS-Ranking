import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheResponse } from '../types';
import { CountryFlag } from '../components/CountryFlag';

const ALL = 'ALL';

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardCacheResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState<string>(ALL);
  const [countryOptions, setCountryOptions] = useState<{ countryIso2: string; countryName: string }[]>(() => [
    { countryIso2: ALL, countryName: 'All countries' },
  ]);

  const items = data?.items ?? [];
  const scope = data?.scope ?? 'global';
  const isCountryScope = scope === 'country';
  const totalRanked = data?.totalRanked;

  useEffect(() => {
    apiService.getCountries().then(
      (list) =>
        setCountryOptions([
          { countryIso2: ALL, countryName: 'All countries' },
          ...list.map((c) => ({ countryIso2: c.iso2, countryName: c.name })),
        ]),
      () => {}
    );
  }, []);

  useEffect(() => {
    const urlCountry = searchParams.get('country');
    if (urlCountry && urlCountry !== ALL) {
      setSelectedCountry(urlCountry);
      loadLeaderboard(urlCountry);
    } else {
      setSelectedCountry(ALL);
      loadLeaderboard(undefined);
    }
  }, []);

  const loadLeaderboard = async (country: string | undefined) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getLeaderboardTop100(100, country === ALL ? undefined : country);
      setData(result);
      if (country !== undefined) setSelectedCountry(country ?? ALL);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string }; status?: number } }).response?.data?.error ??
            ((err as { response?: { status?: number } }).response?.status === 503
              ? 'Leaderboard cache not generated. Run npm run leaderboard:update on the backend.'
              : 'Failed to load leaderboard')
          : 'Failed to load leaderboard';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    if (value === ALL) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('country');
        return next;
      });
      loadLeaderboard(undefined);
    } else {
      setSearchParams({ country: value });
      loadLeaderboard(value);
    }
  };

  const generatedAt = data?.generatedAt ?? '';
  const count = data?.count ?? 0;
  const selectedCountryName =
    countryOptions.find((c) => c.countryIso2 === selectedCountry)?.countryName ?? data?.countryName ?? selectedCountry;
  const pageTitle = isCountryScope ? `WPS Leaderboard — ${selectedCountryName}` : 'Global WPS Leaderboard';
  const subtitle = isCountryScope
    ? `Top ${count} in ${selectedCountryName} · Updated: ${formatGeneratedAt(generatedAt)}`
    : `Updated: ${formatGeneratedAt(generatedAt)} · ${count} cubers`;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Top 100 WPS Leaderboard</h1>
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto" />
          <p className="text-gray-400 mt-4">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Top 100 WPS Leaderboard</h1>
        <div className="card text-center py-12">
          <p className="text-red-400">{error ?? 'Failed to load data'}</p>
          <button type="button" onClick={loadLeaderboard} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-8 h-8 text-green-400" />
          {pageTitle}
        </h1>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label htmlFor="country-filter" className="text-gray-400 text-sm font-medium shrink-0">
          Filter by country
        </label>
        <select
          id="country-filter"
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {countryOptions.map((opt) => (
            <option key={opt.countryIso2} value={opt.countryIso2}>
              {opt.countryName}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {items.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No ranked cubers from this country
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                  {isCountryScope && (
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Global</th>
                  )}
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Country</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">WPS</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">WCA ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const displayRank = isCountryScope ? (row.countryRank ?? 0) : (row.rank ?? 0);
                  const globalRank = row.globalWpsRank ?? row.rank;
                  const globalLabel = typeof totalRanked === 'number' && totalRanked > 0 && typeof globalRank === 'number'
                    ? `#${globalRank} of ${totalRanked}`
                    : globalRank;
                  return (
                    <tr
                      key={row.personId}
                      className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        {displayRank <= 3 ? (
                          <span className="flex items-center gap-1">
                            <Trophy
                              className={`w-5 h-5 ${
                                displayRank === 1 ? 'text-yellow-400' :
                                displayRank === 2 ? 'text-gray-300' : 'text-amber-600'
                              }`}
                            />
                            {displayRank}
                          </span>
                        ) : (
                          <span className="text-gray-300">{displayRank}</span>
                        )}
                      </td>
                      {isCountryScope && (
                        <td className="py-3 px-4 text-gray-400">{globalLabel}</td>
                      )}
                      <td className="py-3 px-4 font-medium text-white">{row.name}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-2">
                          <CountryFlag iso2={row.countryIso2} name={row.countryName ?? row.countryId} />
                          <span className="text-gray-300">{row.countryName ?? row.countryId ?? '—'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-green-400">
                        {row.wps.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/profile/${row.personId}`}
                          className="text-green-400 hover:text-green-300 text-sm font-medium"
                        >
                          {row.personId}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
