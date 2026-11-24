import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Flag } from 'lucide-react';
import { apiService } from '../services/api';
import { CONTINENTS, CountryRankingResponse } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { RankBadge } from '../components/RankingList';
import { Avatar } from '../components/Avatar';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';

const ALL = 'ALL';
const GRID =
  'grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,14rem)_7rem_6rem] md:gap-4';

export function CountriesPage() {
  const [data, setData] = useState<CountryRankingResponse | null>(null);
  const [error, setError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const continent = (searchParams.get('continent') ?? ALL).toUpperCase();
  const { t } = useTranslation(['countries', 'common']);
  const fmt = useFormat();

  const load = () => {
    setError(false);
    apiService.getCountryRanking().then(setData, () => setError(true));
  };
  useEffect(load, []);

  const teamSize = data?.teamSize ?? 10;
  const continentEntry = CONTINENTS.find((c) => c.code === continent);
  const continentName = continentEntry ? fmt.continent(continentEntry.code, continentEntry.name) : undefined;
  const filtered = (data?.items ?? []).filter((c) => continent === ALL || c.continent === continent);
  // Within a continent, rank among its countries (equal scores share a rank).
  const items = filtered.map((c, i) => ({
    ...c,
    shownRank: continent === ALL ? c.rank : i > 0 && filtered[i - 1].teamScore === c.teamScore ? -1 : i + 1,
  }));
  for (let i = 1; i < items.length; i++) if (items[i].shownRank === -1) items[i].shownRank = items[i - 1].shownRank;

  usePageMetadata({
    title: t('meta.title'),
    description: t('meta.description', { count: teamSize, n: fmt.int(teamSize) }),
    canonicalPath: '/countries',
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <Flag className="h-7 w-7 shrink-0 text-green-400 sm:h-8 sm:w-8" />
            {continentName ? t('titleContinent', { continent: continentName }) : t('title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            {t('intro', { count: teamSize, n: fmt.int(teamSize) })}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="continent-filter" className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {t('filter.label')}
          </label>
          <select
            id="continent-filter"
            value={continent}
            onChange={(e) => setSearchParams(e.target.value === ALL ? {} : { continent: e.target.value }, { preventScrollReset: true })}
            className="input-field w-full md:w-56"
          >
            <option value={ALL}>{t('filter.all')}</option>
            {CONTINENTS.map((c) => (
              <option key={c.code} value={c.code}>
                {fmt.continent(c.code, c.name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {error ? (
          <div className="py-12 text-center">
            <p className="text-red-400">{t('errors.load')}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              {t('common:actions.tryAgain')}
            </button>
          </div>
        ) : !data ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label={t('loading')}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-gray-700/50" />
            ))}
          </div>
        ) : (
          <div className="text-sm md:text-base">
            <div
              aria-hidden="true"
              className={`${GRID} border-b border-gray-700 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-400`}
            >
              <span>{t('common:ranking.rank')}</span>
              <span>{t('common:ranking.country')}</span>
              <span className="hidden md:block">
                {t('columns.best')}
              </span>
              <span className="hidden text-right md:block">
                {t('columns.ranked')}
              </span>
              <span className="text-right">
                {t('columns.score')}
              </span>
            </div>
            <ol aria-label={t('title')}>
              {items.map((c) => (
                <li key={c.iso2} className="border-b border-gray-700/60 last:border-b-0">
                  <Link
                    to={`/leaderboard?country=${c.iso2}`}
                    className={`${GRID} group px-4 py-3 transition-colors hover:bg-gray-700/40 focus-visible:bg-gray-700/40 focus-visible:outline-none`}
                  >
                    <span>
                      <RankBadge rank={c.shownRank} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <CountryFlag iso2={c.iso2} name={fmt.country(c.iso2, c.name)} />
                        <span className="truncate font-medium text-white group-hover:text-green-300">{fmt.country(c.iso2, c.name)}</span>
                      </span>
                      <span className="block text-xs text-gray-400 md:hidden">
                        {t('rankedShort', { count: c.rankedCount, n: fmt.int(c.rankedCount) })}
                        {c.best ? ` · ${t('bestShort', { name: fmt.person(c.best.name) })}` : ''}
                      </span>
                    </span>
                    <span className="hidden min-w-0 items-center gap-3 text-gray-300 md:flex">
                      {c.best ? (
                        <>
                          <Avatar name={c.best.name} url={c.best.avatarUrl} />
                          <span className="min-w-0">
                            <span className="block truncate">{fmt.person(c.best.name)}</span>
                            <span className="block text-xs tabular-nums text-gray-400">{fmt.num(c.best.wps)} WPS</span>
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                    <span className="hidden text-right tabular-nums text-gray-400 md:block">
                      {fmt.int(c.rankedCount)}
                    </span>
                    <span className="flex items-center justify-end gap-1">
                      <span className="font-semibold tabular-nums text-green-400">{fmt.num(c.teamScore)}</span>
                      <ChevronRight className="hidden h-4 w-4 text-gray-600 group-hover:text-gray-400 md:block" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      {data && (
        <p className="text-center text-sm text-gray-400">{t('hint')}</p>
      )}
    </div>
  );
}
