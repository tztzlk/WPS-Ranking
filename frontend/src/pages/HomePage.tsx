import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Search, TrendingUp, Users, Award } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheItem } from '../types';
import { CountryFlag } from '../components/CountryFlag';
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
                  {isUp ? '▲' : '▼'}
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

  const formatScore = (score: number) => score.toFixed(2);

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="card text-center">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-green-400" />
          <h3 className="text-2xl font-bold text-white">1000+</h3>
          <p className="text-gray-400">Ranked Cubers</p>
        </div>
        <div className="card text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-green-400" />
          <h3 className="text-2xl font-bold text-white">17</h3>
          <p className="text-gray-400">WCA Events</p>
        </div>
        <div className="card text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-green-400" />
          <h3 className="text-2xl font-bold text-white">100+</h3>
          <p className="text-gray-400">Countries</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Top 5 Cubers Worldwide</h2>
            <p className="mt-2 max-w-3xl text-gray-400">
              The current top five cubers by weighted all-around performance.
            </p>
          </div>
          <Link to="/leaderboard" className="text-sm font-medium text-green-400 hover:text-green-300 md:text-right">
            View full leaderboard
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-400" />
            <p className="mt-4 text-gray-400">Loading leaderboard...</p>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Rank</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Country</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">WPS</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((cuber, index) => (
                    <tr key={cuber.personId} className="border-b border-gray-700 hover:bg-gray-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          {index < 3 ? (
                            <Trophy
                              className={`h-5 w-5 ${
                                index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'
                              }`}
                            />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center text-sm font-medium text-gray-400">
                              {cuber.rank ?? index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link to={`/profile/${cuber.personId}`} className="font-medium text-white hover:text-green-400">
                          {cuber.name}
                        </Link>
                        <div className="text-sm text-gray-400">{cuber.personId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {cuber.countryIso2 ? (
                            <CountryFlag iso2={cuber.countryIso2} name={cuber.countryName ?? cuber.countryId} />
                          ) : (
                            <span className="text-gray-500">--</span>
                          )}
                          <span className="text-gray-300">{cuber.countryName ?? cuber.countryId ?? '--'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-green-400">{formatScore(cuber.wps)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <Link to="/leaderboard" className="btn-primary flex w-full items-center justify-center space-x-2 sm:w-auto">
                <TrendingUp className="h-5 w-5" />
                <span>View Full Leaderboard</span>
              </Link>
              <p className="text-sm text-gray-500">Showing the current top 5 by weighted all-around performance</p>
            </div>

            <div className="mt-8 border-t border-gray-700 pt-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <h3 className="text-xl font-semibold text-white">Biggest Movers This Week</h3>
              </div>
              <p className="mb-4 max-w-3xl text-sm text-gray-400">
                These are the largest weekly rank changes based on historical snapshots. It helps surface momentum, not just the current order.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <WeeklyMoversList title="▲ Movers Up" items={biggestMoversUp} direction="up" />
                <WeeklyMoversList title="▼ Movers Down" items={biggestMoversDown} direction="down" />
              </div>
            </div>
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
