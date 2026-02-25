import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Search, TrendingUp, Users, Award } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardEntry, COUNTRY_FLAGS } from '../types';

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
      const response = await apiService.getLeaderboard(100, 0);
      if (response.data) {
        setLeaderboard(response.data);
      }
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

  const getCountryFlag = (country: string) => {
    return COUNTRY_FLAGS[country] || '🏳️';
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

      {/* Leaderboard */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Top 100 Global Rankings</h2>
          <Link to="/leaderboard" className="text-green-400 hover:text-green-300 flex items-center space-x-1">
            <span>View Full Leaderboard</span>
            <TrendingUp className="w-4 h-4" />
          </Link>
        </div>

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Country</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">WPS Score</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Events</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
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
                      <div className="font-medium text-white">{cuber.name}</div>
                      <div className="text-sm text-gray-400">{cuber.wcaId}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getCountryFlag(cuber.country)}</span>
                        <span className="text-gray-300">{cuber.country}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-green-400">{formatScore(cuber.wpsScore)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-300">{cuber.totalEvents}</div>
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        to={`/profile/${cuber.wcaId}`}
                        className="text-green-400 hover:text-green-300 text-sm font-medium"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
