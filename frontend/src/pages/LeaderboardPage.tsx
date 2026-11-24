import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { apiService, LeaderboardRegion } from '../services/api';
import { CONTINENTS, LeaderboardCacheResponse, LeaderboardCacheItem, SCORED_EVENT_COUNT } from '../types';
import { RankingList } from '../components/RankingList';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';

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

/** Translated message for a failed load; API error texts are English, so the status picks it. */
function loadErrorMessage(err: unknown, t: (key: 'errors.empty' | 'errors.load') => string): string {
  const userMsg =
    err && typeof err === 'object' && 'userMessage' in err
      ? (err as { userMessage?: string }).userMessage
      : null;
  const status =
    err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { status?: number } }).response?.status
      : undefined;
  return userMsg ?? (status === 503 ? t('errors.empty') : t('errors.load'));
}

export function LeaderboardPage() {
  const { t } = useTranslation(['leaderboard', 'common']);
  const fmt = useFormat();
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
        setLoadMoreError(loadErrorMessage(err, t));
      } else {
        setError(loadErrorMessage(err, t));
        setData(null);
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }
    // t only changes with the language; the latest one is read when a request fails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      ? fmt.continent(region.continent, CONTINENTS.find((c) => c.code === region.continent)?.name)
      : region
        ? fmt.country(region.country, countries.find((c) => c.iso2 === region.country)?.name ?? data?.countryName)
        : t('world');
  const pageTitle = region ? t('title', { region: regionName }) : t('titleWorld');
  // Country options by name in the current language.
  const countryOptions = countries
    .map((c) => ({ iso2: c.iso2, name: fmt.country(c.iso2, c.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, fmt.locale));
  // The API's totalRanked is the global count, so it is only shown unfiltered.
  const totalRanked = isFiltered ? undefined : data?.totalRanked;
  const subtitle = [
    generatedAt ? t('updated', { date: fmt.dateTime(generatedAt) }) : null,
    totalRanked ? t('rankedCount', { count: totalRanked, n: fmt.int(totalRanked) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // rankChange is the change in world rank, so it is only shown on the world list.
  const hasChanges = !isFiltered && items.some((i) => typeof i.rankChange === 'number' && i.rankChange !== 0);
  const canLoadMore = items.length >= limit && limit < MAX_ROWS;

  usePageMetadata({
    title: t('meta.title', { title: pageTitle }),
    description: isFiltered
      ? t('meta.descriptionRegion', { region: regionName })
      : t('meta.description', { count: SCORED_EVENT_COUNT, n: fmt.int(SCORED_EVENT_COUNT) }),
    canonicalPath: region ? `/leaderboard?${new URLSearchParams(region).toString()}` : '/leaderboard',
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">{pageTitle}</h1>
        <div className="card space-y-3 p-4" aria-busy="true" aria-label={t('loading')}>
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
          <p className="text-red-400">{error ?? t('errors.load')}</p>
          <button type="button" onClick={() => loadData(selected)} className="btn-primary mt-4">
            {t('common:actions.tryAgain')}
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
            {t('filter.label')}
          </label>
          <select
            id="region-filter"
            value={selected}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="input-field w-full md:w-64"
          >
            <option value={ALL}>{t('world')}</option>
            <optgroup label={t('filter.continents')}>
              {CONTINENTS.map((c) => (
                <option key={c.code} value={`continent:${c.code}`}>
                  {fmt.continent(c.code, c.name)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('filter.countries')}>
              {/* Keeps a ?country= selection visible while the list loads. */}
              {region && 'country' in region && !countries.some((c) => c.iso2 === region.country) && (
                <option value={selected}>{regionName}</option>
              )}
              {countryOptions.map((c) => (
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
            {isFiltered ? t('emptyRegion', { region: regionName }) : t('empty')}
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
            {loadingMore ? t('common:actions.loading') : loadMoreError ? t('common:actions.tryAgain') : t('common:actions.showMore')}
          </button>
        </div>
      )}
    </div>
  );
}
