import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheResponse, LeaderboardCacheItem, CountryListItem } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { captureEvent } from '../lib/analytics';

const ALL = 'ALL';

function RankChange({ change }: { change: number | null }) {
  if (typeof change !== 'number' || Number.isNaN(change) || change === 0) {
    return <span className="text-gray-500">&mdash;</span>;
  }

  if (change > 0) {
    return <span className="text-green-400">▲{change}</span>;
  }

  return <span className="text-red-400">▼{Math.abs(change)}</span>;
}

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
  const [selectedCountry, setSelectedCountry] = useState<string>(() => searchParams.get('country') ?? ALL);
  const [countryOptions, setCountryOptions] = useState<{ countryIso2: string; countryName: string }[]>([
    { countryIso2: ALL, countryName: 'All countries' },
  ]);

  const loadData = useCallback(async (country: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getLeaderboardPageData(100, country === ALL ? undefined : country);
      setData(result.leaderboard);
      setCountryOptions([
        { countryIso2: ALL, countryName: 'All countries' },
        ...result.countries.map((c: CountryListItem) => ({ countryIso2: c.iso2, countryName: c.name })),
      ]);
    } catch (err: unknown) {
      const userMsg =
        err && typeof err === 'object' && 'userMessage' in err
          ? (err as { userMessage?: string }).userMessage
          : null;
      const message =
        userMsg ??
        (err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string }; status?: number } }).response?.data?.error ??
            ((err as { response?: { status?: number } }).response?.status === 503
              ? 'Leaderboard data unavailable. Run the data pipeline on the backend.'
              : 'Failed to load leaderboard')
          : 'Failed to load leaderboard');
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedCountry);
  }, [loadData, selectedCountry]);

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    if (value === ALL) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('country');
        return next;
      });
    } else {
      setSearchParams({ country: value });
    }
  };

  const items: LeaderboardCacheItem[] = data?.items ?? [];
  const generatedAt = data?.generatedAt ?? '';
  const isFiltered = selectedCountry !== ALL;
  const selectedCountryName =
    countryOptions.find((c) => c.countryIso2 === selectedCountry)?.countryName ?? selectedCountry;
  const pageTitle = isFiltered ? `WPS Leaderboard - ${selectedCountryName}` : 'Global WPS Leaderboard';
  const subtitle = generatedAt
    ? `Updated: ${formatGeneratedAt(generatedAt)} · ${items.length} cubers`
    : `${items.length} cubers`;

  useEffect(() => {
    if (loading || error || !data) return;

    captureEvent('leaderboard_viewed', {
      country_filter: isFiltered ? selectedCountry : ALL,
      country_name: isFiltered ? selectedCountryName : 'All countries',
      cuber_count: items.length,
    });
  }, [data, error, isFiltered, items.length, loading, selectedCountry, selectedCountryName]);

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
          <button type="button" onClick={() => loadData(selectedCountry)} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
          <Trophy className="h-8 w-8 text-green-400" />
          {pageTitle}
        </h1>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label htmlFor="country-filter" className="shrink-0 text-sm font-medium text-gray-400">
          Filter by country
        </label>
        <select
          id="country-filter"
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="min-w-[200px] rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
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
            No ranked cubers found{isFiltered ? ` from ${selectedCountryName}` : ''}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Δ</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Country</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">WPS</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">WCA ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => {
                  const displayRank = row.rank ?? row.countryRank ?? index + 1;

                  return (
                    <tr
                      key={row.personId}
                      className="border-b border-gray-700 transition-colors hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3">
                        {displayRank <= 3 ? (
                          <span className="flex items-center gap-1">
                            <Trophy
                              className={`h-5 w-5 ${
                                displayRank === 1
                                  ? 'text-yellow-400'
                                  : displayRank === 2
                                    ? 'text-gray-300'
                                    : 'text-amber-600'
                              }`}
                            />
                            {displayRank}
                          </span>
                        ) : (
                          <span className="text-gray-300">{displayRank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <RankChange change={row.rankChange} />
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <CountryFlag iso2={row.countryIso2} name={row.countryName ?? row.countryId} />
                          <span className="text-gray-300">{row.countryName ?? row.countryId ?? '—'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-green-400">{row.wps.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/profile/${row.personId}`}
                          onClick={() =>
                            captureEvent('cuber_profile_opened', { wca_id: row.personId, source: 'leaderboard' })
                          }
                          className="text-sm font-medium text-green-400 hover:text-green-300"
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
