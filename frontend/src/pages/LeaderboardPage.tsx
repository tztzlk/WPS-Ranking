import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheResponse, LeaderboardCacheItem } from '../types';
import { RankingList } from '../components/RankingList';
import { usePageMetadata } from '../hooks/usePageMetadata';

const ALL = 'ALL';
const PAGE_SIZE = 100;
const MAX_ROWS = 500; // API limit

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

  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = useCallback(async (country: string, rows: number = PAGE_SIZE) => {
    try {
      if (rows === PAGE_SIZE) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const result = await apiService.getLeaderboardTop100(rows, country === ALL ? undefined : country);
      setData(result);
      setLimit(rows);
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
              ? 'Leaderboard data is temporarily unavailable. Please refresh after the next data update.'
              : 'Failed to load leaderboard')
          : 'Failed to load leaderboard');
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedCountry);
  }, [loadData, selectedCountry]);

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
  // The API's totalRanked is the global count, so it is only shown unfiltered.
  const totalRanked = isFiltered ? undefined : data?.totalRanked;
  const subtitle = [
    generatedAt ? `Updated ${formatGeneratedAt(generatedAt)}` : null,
    totalRanked ? `${totalRanked.toLocaleString('en-US')} ranked cubers` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const hasChanges = items.some((i) => typeof i.rankChange === 'number' && i.rankChange !== 0);
  const canLoadMore = items.length >= limit && limit < MAX_ROWS;

  usePageMetadata({
    title: `${pageTitle} | WPS Ranking`,
    description: isFiltered
      ? `Top WPS-ranked speedcubers from ${selectedCountryName}. Browse ranks, countries, and weighted performance scores.`
      : 'Browse the global WPS leaderboard for speedcubers, including ranks, countries, WCA IDs, and weighted performance scores.',
    canonicalPath: isFiltered ? `/leaderboard?country=${encodeURIComponent(selectedCountry)}` : '/leaderboard',
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">{pageTitle}</h1>
        <div className="card space-y-3 p-4" aria-busy="true" aria-label="Loading leaderboard">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-700/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">{pageTitle}</h1>
        <div className="card py-12 text-center">
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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <Trophy className="h-7 w-7 shrink-0 text-green-400 sm:h-8 sm:w-8" />
            {pageTitle}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="country-filter" className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Country
          </label>
          <select
            id="country-filter"
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="input-field w-full md:w-64"
          >
            {countryOptions.map((opt) => (
              <option key={opt.countryIso2} value={opt.countryIso2}>
                {opt.countryName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {items.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No ranked cubers found{isFiltered ? ` from ${selectedCountryName}` : ''}
          </div>
        ) : (
          <RankingList items={items} showChange={hasChanges} />
        )}
      </div>

      {canLoadMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadData(selectedCountry, Math.min(limit + PAGE_SIZE, MAX_ROWS))}
            disabled={loadingMore}
            className="btn-secondary min-w-[10rem] disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
}
