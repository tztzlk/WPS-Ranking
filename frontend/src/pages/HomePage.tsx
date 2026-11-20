import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Search, TrendingUp, Users, Award, Layers } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheItem } from '../types';
import { RankingList } from '../components/RankingList';
import { usePageMetadata } from '../hooks/usePageMetadata';

function WeeklyMoversList({
  title,
  items,
  direction,
}: {
  title: string;
  items: LeaderboardCacheItem[];
  direction: 'up' | 'down';
}) {
  const isUp = direction === 'up';

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
      <h3 className={`mb-4 text-sm font-semibold uppercase tracking-wide ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No weekly movement data available.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={`${direction}-${item.personId}`}
              to={`/profile/${item.personId}`}
              className="flex items-center justify-between gap-4 text-sm transition-colors hover:text-white"
            >
              <div className="min-w-0">
                <div className={`font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? '+' : '-'}
                  {Math.abs(item.rankChange ?? 0)}
                </div>
                <div className="truncate font-medium text-gray-200">{item.name}</div>
              </div>
              <div className="shrink-0 text-xs text-gray-500">{item.personId}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardCacheItem[]>([]);
  const [biggestMoversUp, setBiggestMoversUp] = useState<LeaderboardCacheItem[]>([]);
  const [biggestMoversDown, setBiggestMoversDown] = useState<LeaderboardCacheItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRanked, setTotalRanked] = useState<number | null>(null);
  const [totalCountries, setTotalCountries] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const result = await apiService.getLeaderboardTop100(5);
      setLeaderboard(result.items);
      setBiggestMoversUp(result.biggestMoversUp ?? []);
      setBiggestMoversDown(result.biggestMoversDown ?? []);
      setTotalRanked(result.totalRanked ?? null);
      setTotalCountries(result.totalCountries ?? null);
    } catch (err: unknown) {
      const userMsg =
        err && typeof err === 'object' && 'userMessage' in err
          ? (err as { userMessage?: string }).userMessage
          : null;
      const ax =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } })
          : null;
      setError(userMsg ?? ax?.response?.data?.error ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (n: number | null) => (n ? n.toLocaleString('en-US') : '—');

  usePageMetadata({
    title: 'WPS Ranking | Global Speedcubing Leaderboard',
    description:
      'Track the Weighted Performance Scale leaderboard for speedcubers worldwide, explore weekly movers, and search for your WCA ranking.',
    canonicalPath: '/',
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-6xl">
          Global Rankings for <span className="text-green-400">Speedcubers</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-300 md:text-xl">
          WPS Ranking measures all-around speedcubing strength using weighted WCA event rankings, not just a single specialty.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link to="/search" className="btn-primary flex items-center justify-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Your Rank</span>
          </Link>
          <Link to="/about" className="btn-secondary flex items-center justify-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Why WPS Is Different</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        {[
          { icon: Users, value: formatCount(totalRanked), label: 'Ranked cubers' },
          { icon: Layers, value: '16', label: 'Events scored' },
          { icon: Trophy, value: formatCount(totalCountries), label: 'Countries' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="card flex flex-col items-center px-2 py-4 text-center sm:p-6">
            <Icon className="mb-2 h-6 w-6 text-green-400 sm:h-8 sm:w-8" aria-hidden="true" />
            <div className="text-lg font-bold tabular-nums text-white sm:text-2xl">{value}</div>
            <div className="text-xs text-gray-400 sm:text-base">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Top 5 Cubers Worldwide</h2>
            <p className="mt-2 max-w-3xl text-gray-400">
              The current top five cubers by weighted all-around performance.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading leaderboard">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-700/50" />
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-400">{error}</p>
            <button type="button" onClick={() => loadLeaderboard()} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="-mx-6">
              <RankingList items={leaderboard} showChange={false} />
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <Link to="/leaderboard" className="btn-primary flex w-full items-center justify-center space-x-2 sm:w-auto">
                <TrendingUp className="h-5 w-5" />
                <span>View Full Leaderboard</span>
              </Link>
            </div>

            {(biggestMoversUp.length > 0 || biggestMoversDown.length > 0) && (
            <div className="mt-8 border-t border-gray-700 pt-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Biggest Movers This Week</h3>
              </div>
              <p className="mb-4 max-w-3xl text-sm text-gray-400">
                These are the largest weekly rank changes based on historical snapshots. It helps surface momentum, not just the current order.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <WeeklyMoversList title="Movers Up" items={biggestMoversUp} direction="up" />
                <WeeklyMoversList title="Movers Down" items={biggestMoversDown} direction="down" />
              </div>
            </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-lg bg-gray-800 p-8 text-center">
        <h3 className="mb-4 text-2xl font-bold text-white">Ready to Find Your Rank?</h3>
        <p className="mb-6 text-gray-300">
          Search for your WCA ID or name to see your WPS score, global standing, and profile history over time.
        </p>
        <Link to="/search" className="btn-primary inline-flex w-full items-center justify-center sm:w-auto">
          Search Now
        </Link>
      </div>
    </div>
  );
}
