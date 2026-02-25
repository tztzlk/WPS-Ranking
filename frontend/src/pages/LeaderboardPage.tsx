import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardCacheResponse, COUNTRY_FLAGS } from '../types';

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

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getLeaderboardTop100();
      setData(result);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string }; status?: number } }).response?.data?.error
          ?? (err as { response?: { status?: number } }).response?.status === 503
            ? 'Leaderboard cache not generated. Run npm run leaderboard:update on the backend.'
            : 'Failed to load leaderboard'
        : 'Failed to load leaderboard';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Top 100 WPS Leaderboard</h1>
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto" />
          <p className="text-gray-400 mt-4">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Top 100 WPS Leaderboard</h1>
        <div className="card text-center py-12">
          <p className="text-red-400">{error ?? 'Failed to load data'}</p>
          <button type="button" onClick={loadLeaderboard} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { generatedAt, count, items } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-8 h-8 text-green-400" />
          Top 100 WPS Leaderboard
        </h1>
        <p className="text-gray-400 text-sm">
          Updated: {formatGeneratedAt(generatedAt)} · {count} cubers
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Country</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">WPS</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">WCA ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.personId}
                  className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    {row.rank <= 3 ? (
                      <span className="flex items-center gap-1">
                        <Trophy
                          className={`w-5 h-5 ${
                            row.rank === 1 ? 'text-yellow-400' :
                            row.rank === 2 ? 'text-gray-300' : 'text-amber-600'
                          }`}
                        />
                        {row.rank}
                      </span>
                    ) : (
                      <span className="text-gray-300">{row.rank}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">{row.name}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-2">
                      <span>{COUNTRY_FLAGS[row.countryId ?? ''] ?? '🏳️'}</span>
                      <span className="text-gray-300">{row.countryId ?? '—'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-green-400">
                    {row.wps.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      to={`/profile/${row.personId}`}
                      className="text-green-400 hover:text-green-300 text-sm font-medium"
                    >
                      {row.personId}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
