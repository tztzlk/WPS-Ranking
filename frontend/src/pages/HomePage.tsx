import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Search, TrendingUp, Users, Layers, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheItem, SCORED_EVENT_COUNT } from '../types';
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
        <p className="text-sm text-gray-400">Nobody moved this way in the last 7 days.</p>
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
              <div className="shrink-0 text-xs text-gray-400">{item.personId}</div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
      setError(userMsg ?? ax?.response?.data?.error ?? 'The leaderboard could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (n: number | null) => (n ? n.toLocaleString('en-US') : '—');

  usePageMetadata({
    title: 'WPS Ranking | All-around speedcubing leaderboard',
    description:
      'An all-around ranking of speedcubers. WPS turns official WCA world ranks in 17 events into one score. Find any cuber by name or WCA ID.',
    canonicalPath: '/',
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-6xl">
          All-around rankings for <span className="text-green-400">speedcubers</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-300 md:text-xl">
          WPS turns your official WCA world ranks in 17 events into one score.
        </p>
        <form
          role="search"
          className="mx-auto flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const q = searchQuery.trim();
            navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
          }}
        >
          <label htmlFor="home-search" className="sr-only">
            Find a cuber
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="home-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, surname or WCA ID"
              autoComplete="off"
              className="input-field w-full py-3 pl-10"
            />
          </div>
          <button type="submit" className="btn-primary px-5">
            Find
          </button>
        </form>
        <Link to="/about" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
          How WPS works
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        {[
          { icon: Users, value: formatCount(totalRanked), label: 'Ranked cubers' },
          { icon: Layers, value: String(SCORED_EVENT_COUNT), label: 'Events scored' },
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
            <h2 className="text-2xl font-bold text-white">Top 5 in the world</h2>
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
              Try again
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
                <span>Full leaderboard</span>
              </Link>
            </div>

            {(biggestMoversUp.length > 0 || biggestMoversDown.length > 0) && (
            <div className="mt-8 border-t border-gray-700 pt-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Biggest movers this week</h3>
              </div>
              <p className="mb-4 max-w-3xl text-sm text-gray-400">
                The largest changes in world rank over the last 7 days.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <WeeklyMoversList title="Up" items={biggestMoversUp} direction="up" />
                <WeeklyMoversList title="Down" items={biggestMoversDown} direction="down" />
              </div>
            </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
