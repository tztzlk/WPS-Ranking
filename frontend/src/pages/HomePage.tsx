import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactCountryFlag from 'react-country-flag';
import { Trophy, Search, TrendingUp, Users, Award } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardEntry } from '../types';

export function HomePage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const result = await apiService.getLeaderboardTop100(5);
      setLeaderboard(result.items.map((item) => ({
        rank: item.rank ?? 0,
        wcaId: item.personId,
        name: item.name,
        country: item.countryName ?? item.countryId ?? '',
        countryIso2: item.countryIso2,
        countryName: item.countryName,
        wpsScore: item.wps,
        totalEvents: 0,
      })));
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    return score.toFixed(2);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Global Rankings for{' '}
          <span className="text-green-400">Speedcubers</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Track your performance across all WCA events with the Weighted Performance Scale. 
          See who's the most complete cuber in the world.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/search" className="btn-primary flex items-center justify-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search Your Rank</span>
          </Link>
          <Link to="/about" className="btn-secondary flex items-center justify-center space-x-2">
            <Award className="w-5 h-5" />
            <span>Learn About WPS</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white">1000+</h3>
          <p className="text-gray-400">Ranked Cubers</p>
        </div>
        <div className="card text-center">
          <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white">17</h3>
          <p className="text-gray-400">WCA Events</p>
        </div>
        <div className="card text-center">
          <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white">100+</h3>
          <p className="text-gray-400">Countries</p>
        </div>
      </div>

      {/* Leaderboard — Top 5 only for fast load */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Top 5 Cubers Worldwide</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
            <button onClick={loadLeaderboard} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Country</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">WPS</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((cuber, index) => (
                    <tr key={cuber.wcaId} className="border-b border-gray-700 hover:bg-gray-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {index < 3 ? (
                            <Trophy className={`w-5 h-5 ${
                              index === 0 ? 'text-yellow-400' :
                              index === 1 ? 'text-gray-300' :
                              'text-amber-600'
                            }`} />
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-400">
                              {cuber.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link to={`/profile/${cuber.wcaId}`} className="font-medium text-white hover:text-green-400">
                          {cuber.name}
                        </Link>
                        <div className="text-sm text-gray-400">{cuber.wcaId}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {cuber.countryIso2 ? (
                            <ReactCountryFlag countryCode={cuber.countryIso2} svg className="!w-5 !h-4" />
                          ) : (
                            <span className="text-gray-500">🏳️</span>
                          )}
                          <span className="text-gray-300">{cuber.countryName ?? cuber.country ?? '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-green-400">{formatScore(cuber.wpsScore)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2">
              <Link to="/leaderboard" className="btn-primary flex items-center justify-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>View Full Leaderboard</span>
              </Link>
              <p className="text-gray-500 text-sm">Showing top 5 of all ranked cubers</p>
            </div>
          </>
        )}
      </div>

      {/* Call to Action */}
      <div className="text-center bg-gray-800 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-4">
          Ready to Find Your Rank?
        </h3>
        <p className="text-gray-300 mb-6">
          Search for your WCA ID or name to see your WPS score and global ranking.
        </p>
        <Link to="/search" className="btn-primary">
          Search Now
        </Link>
      </div>
    </div>
  );
}
