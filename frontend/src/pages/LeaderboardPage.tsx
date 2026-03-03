import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy, Filter } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheResponse, LeaderboardCacheItem } from '../types';
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
  const [selectedCountry, setSelectedCountry] = useState<string>(() => searchParams.get('country') ?? ALL);
  const [countryOptions, setCountryOptions] = useState<{ countryIso2: string; countryName: string }[]>([
    { countryIso2: ALL, countryName: 'All countries' },
  ]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getLeaderboardTop100(100);
      setData(result);
    } catch (err: unknown) {
      const userMsg = err && typeof err === 'object' && 'userMessage' in err ? (err as { userMessage?: string }).userMessage : null;
      const message =
        userMsg ??
        (err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string }; status?: number } }).response?.data?.error ??
            ((err as { response?: { status?: number } }).response?.status === 503
              ? 'Leaderboard cache not generated. Run npm run leaderboard:update on the backend.'
              : 'Failed to load leaderboard')
          : 'Failed to load leaderboard');
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    apiService.getCountries().then(
      (list) =>
        setCountryOptions([
          { countryIso2: ALL, countryName: 'All countries' },
          ...list.map((c) => ({ countryIso2: c.iso2, countryName: c.name })),
        ]),
      () => {}
    );
  }, [loadData]);

  const filteredItems = useMemo<LeaderboardCacheItem[]>(() => {
    if (!data?.items) return [];
    if (selectedCountry === ALL) return data.items;
    return data.items.filter(
      (item) => item.countryIso2?.toUpperCase() === selectedCountry.toUpperCase()
    );
  }, [data, selectedCountry]);

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

  const generatedAt = data?.generatedAt ?? '';
  const isFiltered = selectedCountry !== ALL;
  const selectedCountryName =
    countryOptions.find((c) => c.countryIso2 === selectedCountry)?.countryName ?? selectedCountry;
  const pageTitle = isFiltered ? `WPS Leaderboard -- ${selectedCountryName}` : 'Global WPS Leaderboard';

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'text-[var(--color-text-secondary)]';
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Top 100 WPS Leaderboard</h1>
        <div className="card flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--color-text-muted)]">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Top 100 WPS Leaderboard</h1>
        <div className="card flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-sm text-[var(--color-error)]">{error ?? 'Failed to load data'}</p>
          <button type="button" onClick={loadData} className="btn-primary text-sm">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-[var(--color-brand)]" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">{pageTitle}</h1>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {isFiltered
            ? `${filteredItems.length} cubers from ${selectedCountryName} in global top 100`
            : `${filteredItems.length} cubers`}
          {generatedAt ? ` -- Updated: ${formatGeneratedAt(generatedAt)}` : ''}
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
        <select
          id="country-filter"
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="input-field min-w-[200px] text-sm"
          aria-label="Filter by country"
        >
          {countryOptions.map((opt) => (
            <option key={opt.countryIso2} value={opt.countryIso2}>
              {opt.countryName}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)] text-sm">
            No ranked cubers from this country in the global top 100
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-20">Rank</th>
                  <th>Name</th>
                  <th>Country</th>
                  <th>WPS</th>
                  <th>WCA ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row) => {
                  const displayRank = row.rank ?? 0;
                  return (
                    <tr key={row.personId}>
                      <td>
                        <div className="flex items-center gap-2">
                          {displayRank <= 3 && (
                            <Trophy className={`w-4 h-4 ${getRankClass(displayRank)}`} />
                          )}
                          <span className={`text-sm font-semibold ${getRankClass(displayRank)}`}>
                            {displayRank}
                          </span>
                        </div>
                      </td>
                      <td className="font-medium text-[var(--color-text-primary)]">{row.name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <CountryFlag iso2={row.countryIso2} name={row.countryName ?? row.countryId} />
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            {row.countryName ?? row.countryId ?? '--'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono font-semibold text-[var(--color-brand)]">
                          {row.wps.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/profile/${row.personId}`}
                          className="text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] transition-colors"
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
