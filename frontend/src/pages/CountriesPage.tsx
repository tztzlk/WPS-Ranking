import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Flag } from 'lucide-react';
import { apiService } from '../services/api';
import { CONTINENTS, CountryRankingResponse } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { RankBadge } from '../components/RankingList';
import { usePageMetadata } from '../hooks/usePageMetadata';

const ALL = 'ALL';
const GRID =
  'grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,14rem)_7rem_6rem] md:gap-4';

export function CountriesPage() {
  const [data, setData] = useState<CountryRankingResponse | null>(null);
  const [error, setError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const continent = (searchParams.get('continent') ?? ALL).toUpperCase();

  const load = () => {
    setError(false);
    apiService.getCountryRanking().then(setData, () => setError(true));
  };
  useEffect(load, []);

  const teamSize = data?.teamSize ?? 10;
  const continentName = CONTINENTS.find((c) => c.code === continent)?.name;
  const filtered = (data?.items ?? []).filter((c) => continent === ALL || c.continent === continent);
  // Within a continent, rank among its countries (equal scores share a rank).
  const items = filtered.map((c, i) => ({
    ...c,
    shownRank: continent === ALL ? c.rank : i > 0 && filtered[i - 1].teamScore === c.teamScore ? -1 : i + 1,
  }));
  for (let i = 1; i < items.length; i++) if (items[i].shownRank === -1) items[i].shownRank = items[i - 1].shownRank;

  usePageMetadata({
    title: 'Country ranking | WPS Ranking',
    description: `Countries ranked by the average WPS of their ${teamSize} best speedcubers.`,
    canonicalPath: '/countries',
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <Flag className="h-7 w-7 shrink-0 text-green-400 sm:h-8 sm:w-8" />
            {continentName ? `Country ranking: ${continentName}` : 'Country ranking'}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            A country&apos;s score is the average WPS of its {teamSize} best cubers. If a country has fewer than{' '}
            {teamSize} ranked cubers, each empty place counts as 0.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="continent-filter" className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Continent
          </label>
          <select
            id="continent-filter"
            value={continent}
            onChange={(e) => setSearchParams(e.target.value === ALL ? {} : { continent: e.target.value })}
            className="input-field w-full md:w-56"
          >
            <option value={ALL}>All continents</option>
            {CONTINENTS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {error ? (
          <div className="py-12 text-center">
            <p className="text-red-400">The country ranking could not be loaded.</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading country ranking">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-gray-700/50" />
            ))}
          </div>
        ) : (
          <div role="table" aria-label="Country ranking" className="text-sm md:text-base">
            <div
              role="row"
              className={`${GRID} border-b border-gray-700 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500`}
            >
              <span role="columnheader">Rank</span>
              <span role="columnheader">Country</span>
              <span role="columnheader" className="hidden md:block">
                Best cuber
              </span>
              <span role="columnheader" className="hidden text-right md:block">
                Ranked cubers
              </span>
              <span role="columnheader" className="text-right">
                Score
              </span>
            </div>
            {items.map((c) => (
              <Link
                key={c.iso2}
                to={`/leaderboard?country=${c.iso2}`}
                role="row"
                className={`${GRID} group border-b border-gray-700/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-700/40 focus-visible:bg-gray-700/40 focus-visible:outline-none`}
              >
                <span role="cell">
                  <RankBadge rank={c.shownRank} />
                </span>
                <span role="cell" className="min-w-0">
                  <span className="flex items-center gap-2">
                    <CountryFlag iso2={c.iso2} name={c.name} />
                    <span className="truncate font-medium text-white group-hover:text-green-300">{c.name}</span>
                  </span>
                  <span className="block text-xs text-gray-500 md:hidden">
                    {c.rankedCount.toLocaleString('en-US')} ranked
                    {c.best ? ` · best: ${c.best.name}` : ''}
                  </span>
                </span>
                <span role="cell" className="hidden min-w-0 text-gray-300 md:block">
                  {c.best ? (
                    <>
                      <span className="block truncate">{c.best.name}</span>
                      <span className="block text-xs tabular-nums text-gray-500">{c.best.wps.toFixed(2)} WPS</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <span role="cell" className="hidden text-right tabular-nums text-gray-400 md:block">
                  {c.rankedCount.toLocaleString('en-US')}
                </span>
                <span role="cell" className="flex items-center justify-end gap-1">
                  <span className="font-semibold tabular-nums text-green-400">{c.teamScore.toFixed(2)}</span>
                  <ChevronRight className="hidden h-4 w-4 text-gray-600 group-hover:text-gray-400 md:block" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      {data && (
        <p className="text-center text-sm text-gray-500">Select a country to open its leaderboard.</p>
      )}
    </div>
  );
}
