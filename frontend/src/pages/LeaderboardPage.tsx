import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { apiService, LeaderboardRegion } from '../services/api';
import { CONTINENTS, LeaderboardCacheResponse, LeaderboardCacheItem, SCORED_EVENT_COUNT } from '../types';
import { RankingList } from '../components/RankingList';
import { usePageMetadata } from '../hooks/usePageMetadata';

/** Select values: 'ALL', 'continent:EU' or 'country:KZ'. */
const ALL = 'ALL';
const PAGE_SIZE = 100;
const MAX_ROWS = 500; // API limit

function regionFromValue(value: string): LeaderboardRegion {
  const [kind, code] = value.split(':');
  if (kind === 'continent' && code) return { continent: code };
  if (kind === 'country' && code) return { country: code };
  return null;
}

function valueFromParams(params: URLSearchParams): string {
  const country = params.get('country');
  if (country) return `country:${country.toUpperCase()}`;
  const continent = params.get('continent');
  if (continent) return `continent:${continent.toUpperCase()}`;
  return ALL;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function loadErrorMessage(err: unknown): string {
  const userMsg =
    err && typeof err === 'object' && 'userMessage' in err
      ? (err as { userMessage?: string }).userMessage
      : null;
  return (
    userMsg ??
    (err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { error?: string }; status?: number } }).response?.data?.error ??
        ((err as { response?: { status?: number } }).response?.status === 503
          ? 'The leaderboard is empty right now. It fills after the next daily update.'
          : 'The leaderboard could not be loaded.')
      : 'The leaderboard could not be loaded.')
  );
}

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardCacheResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL is the only source of the region, so Back/Forward and the nav link
  // ("/leaderboard" with no params) always match what is shown.
  const selected = valueFromParams(searchParams);
  const [countries, setCountries] = useState<{ iso2: string; name: string }[]>([]);

  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Only the latest request may update state: switching region quickly must not let
  // a slower, older response replace the new region's rows.
  const loadData = useCallback(async (value: string, rows: number = PAGE_SIZE) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const isMore = rows > PAGE_SIZE;

    setLoadMoreError(null);
    if (isMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLoadingMore(false);
      setError(null);
    }

    try {
      const result = await apiService.getLeaderboardTop100(rows, regionFromValue(value), controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
      setLimit(rows);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (isMore) {
        // Keep the rows already on screen; only the extra page failed.
        setLoadMoreError(loadErrorMessage(err));
      } else {
        setError(loadErrorMessage(err));
        setData(null);
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(selected);
    return () => requestRef.current?.abort();
  }, [loadData, selected]);

  useEffect(() => {
    apiService.getCountries().then(setCountries, () => {});
  }, []);

  const handleRegionChange = (value: string) => {
    const region = regionFromValue(value);
    setSearchParams(region ?? {}, { preventScrollReset: true });
  };

  const items: LeaderboardCacheItem[] = data?.items ?? [];
  const generatedAt = data?.generatedAt ?? '';
  const region = regionFromValue(selected);
  const isFiltered = region !== null;
  const regionName =
    region && 'continent' in region
      ? CONTINENTS.find((c) => c.code === region.continent)?.name ?? region.continent
      : region
        ? countries.find((c) => c.iso2 === region.country)?.name ?? data?.countryName ?? region.country
        : 'World';
  const pageTitle = `${regionName} leaderboard`;
  // The API's totalRanked is the global count, so it is only shown unfiltered.
  const totalRanked = isFiltered ? undefined : data?.totalRanked;
  const subtitle = [
    generatedAt ? `Updated ${formatGeneratedAt(generatedAt)}` : null,
    totalRanked ? `${totalRanked.toLocaleString('en-US')} ranked cubers` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // rankChange is the change in world rank, so it is only shown on the world list.
  const hasChanges = !isFiltered && items.some((i) => typeof i.rankChange === 'number' && i.rankChange !== 0);
  const canLoadMore = items.length >= limit && limit < MAX_ROWS;

  usePageMetadata({
    title: `${pageTitle} | WPS Ranking`,
    description: isFiltered
      ? `The top speedcubers from ${regionName} by WPS, an all-around score from official WCA ranks.`
      : `The top speedcubers in the world by WPS, an all-around score from official WCA ranks in ${SCORED_EVENT_COUNT} events.`,
    canonicalPath: region ? `/leaderboard?${new URLSearchParams(region).toString()}` : '/leaderboard',
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
          <button type="button" onClick={() => loadData(selected)} className="btn-primary mt-4">
            Try again
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
          <label htmlFor="region-filter" className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Region
          </label>
          <select
            id="region-filter"
            value={selected}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="input-field w-full md:w-64"
          >
            <option value={ALL}>World</option>
            <optgroup label="Continents">
              {CONTINENTS.map((c) => (
                <option key={c.code} value={`continent:${c.code}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Countries">
              {/* Keeps a ?country= selection visible while the list loads. */}
              {region && 'country' in region && !countries.some((c) => c.iso2 === region.country) && (
                <option value={selected}>{regionName}</option>
              )}
              {countries.map((c) => (
                <option key={c.iso2} value={`country:${c.iso2}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {items.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No ranked cubers found{isFiltered ? ` from ${regionName}` : ''}
          </div>
        ) : (
          <RankingList items={items} showChange={hasChanges} />
        )}
      </div>

      {canLoadMore && (
        <div className="flex flex-col items-center gap-2">
          {loadMoreError && (
            <p role="alert" className="text-sm text-red-400">
              {loadMoreError}
            </p>
          )}
          <button
            type="button"
            onClick={() => loadData(selected, Math.min(limit + PAGE_SIZE, MAX_ROWS))}
            disabled={loadingMore}
            className="btn-secondary min-w-[10rem] disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : loadMoreError ? 'Try again' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
}
