import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { LeaderboardCacheItem } from '../types';
import { CountryFlag } from './CountryFlag';
import { Avatar } from './Avatar';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

export function RankBadge({ rank }: { rank: number }) {
  const fmt = useFormat();
  if (rank >= 1 && rank <= 3) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-white">
        <Trophy className={`h-4 w-4 ${MEDAL_COLORS[rank - 1]}`} aria-hidden="true" />
        {rank}
      </span>
    );
  }
  return <span className="tabular-nums text-gray-400">{fmt.int(rank)}</span>;
}

export function RankChange({ change }: { change: number | null | undefined }) {
  const fmt = useFormat();
  if (typeof change !== 'number' || Number.isNaN(change) || change === 0) {
    return <span className="text-gray-600">—</span>;
  }
  return change > 0 ? (
    <span className="tabular-nums text-green-400">▲ {fmt.int(change)}</span>
  ) : (
    <span className="tabular-nums text-red-400">▼ {fmt.int(Math.abs(change))}</span>
  );
}

const gridClass = (showChange: boolean) =>
  `grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 md:gap-4 ${
    showChange ? 'md:grid-cols-[4rem_minmax(0,1fr)_12rem_5rem_6rem]' : 'md:grid-cols-[4rem_minmax(0,1fr)_12rem_6rem]'
  }`;

/**
 * Ranking rows: each row is a link to the profile. On phones only rank, name
 * (with flag) and WPS are shown, so nothing is cut off; country and rank
 * change appear from md up.
 */
export function RankingList({
  items,
  showChange = true,
  rankOf = (item, index) => item.rank ?? item.countryRank ?? item.continentRank ?? index + 1,
}: {
  items: LeaderboardCacheItem[];
  showChange?: boolean;
  rankOf?: (item: LeaderboardCacheItem, index: number) => number;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const GRID = gridClass(showChange);
  return (
    <div className="text-sm md:text-base">
      <div
        aria-hidden="true"
        className={`${GRID} border-b border-gray-700 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-400`}
      >
        <span>{t('ranking.rank')}</span>
        <span>{t('ranking.cuber')}</span>
        <span className="hidden md:block">
          {t('ranking.country')}
        </span>
        <span className={showChange ? 'hidden md:block' : 'hidden'}>
          {t('ranking.change')}
        </span>
        <span className="text-right">
          {t('ranking.wps')}
        </span>
      </div>
      <ol aria-label={t('ranking.label')}>
        {items.map((item, index) => (
          <li key={item.personId} className="border-b border-gray-700/60 last:border-b-0">
            <Link
              to={`/profile/${item.personId}`}
              className={`${GRID} group px-4 py-3 transition-colors hover:bg-gray-700/40 focus-visible:bg-gray-700/40 focus-visible:outline-none`}
            >
              <span>
                <RankBadge rank={rankOf(item, index)} />
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={item.name} url={item.avatarUrl} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <CountryFlag iso2={item.countryIso2} name={fmt.country(item.countryIso2, item.countryName)} className="md:hidden" />
                    <span className="truncate font-medium text-white group-hover:text-green-300">{fmt.person(item.name)}</span>
                  </span>
                  <span className="block font-mono text-xs text-gray-400">{item.personId}</span>
                </span>
              </span>
              <span className="hidden min-w-0 items-center gap-2 text-gray-300 md:flex">
                <CountryFlag iso2={item.countryIso2} name={fmt.country(item.countryIso2, item.countryName)} />
                <span className="truncate">{fmt.country(item.countryIso2, item.countryName ?? item.countryId) || '—'}</span>
              </span>
              <span className={showChange ? 'hidden text-sm md:block' : 'hidden'}>
                <RankChange change={item.rankChange} />
              </span>
              <span className="flex items-center justify-end gap-1">
                <span className="font-semibold tabular-nums text-green-400">{fmt.num(item.wps)}</span>
                <ChevronRight className="hidden h-4 w-4 text-gray-600 group-hover:text-gray-400 md:block" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
