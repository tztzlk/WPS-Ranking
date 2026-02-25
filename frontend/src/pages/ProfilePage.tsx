import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, Calendar, MapPin, Award, Calculator } from 'lucide-react';
import { apiService } from '../services/api';
import { WPSProfile, EVENT_NAMES, COUNTRY_FLAGS } from '../types';
import { FormulaBox } from '../components/FormulaBox';

export function ProfilePage() {
  const { wcaId } = useParams<{ wcaId: string }>();
  const [profile, setProfile] = useState<WPSProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wcaId) {
      loadProfile(wcaId);
    }
  }, [wcaId]);

  const loadProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProfile(id);
      setProfile(data);
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
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

  const hasBreakdown = Boolean(profile?.breakdown && profile.breakdown.length > 0);
  const calculation = profile?.calculation;

  const getEventScores = () => {
    if (!profile) return [];
    if (hasBreakdown && profile.breakdown) {
      return profile.breakdown
        .slice()
        .sort((a, b) => b.eventScore - a.eventScore)
        .map((b) => ({
          eventId: b.eventId,
          eventName: EVENT_NAMES[b.eventId] || b.eventId,
          score: b.eventScore,
          rank: b.worldRank,
          weight: b.weight,
        }));
    }
    return Object.entries(profile.eventScores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([eventId, score]) => ({
        eventId,
        eventName: EVENT_NAMES[eventId] || eventId,
        score,
        rank: profile.eventRanks[eventId] || 0,
        weight: 0,
      }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Profile not found'}</p>
        <Link to="/" className="btn-primary">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  const eventScores = getEventScores();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center space-x-2 text-gray-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Leaderboard</span>
      </Link>

      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
              <Trophy className="w-10 h-10 text-gray-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
              <div className="flex items-center space-x-4 text-gray-400 mt-2">
                <span className="font-mono">{profile.wcaId}</span>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{getCountryFlag(profile.country)} {profile.country}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-0 text-center md:text-right">
            <div className="text-4xl font-bold text-green-400">
              {formatScore(profile.wpsScore)}
            </div>
            <div className="text-gray-400">WPS Score</div>
            {profile.globalRank > 0 && (
              <div className="text-lg text-gray-300 mt-2">
                Global Rank #{profile.globalRank}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white">{profile.totalEvents}</h3>
          <p className="text-gray-400">Events Participated</p>
        </div>
        <div className="card text-center">
          <Award className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white">{eventScores.length}</h3>
          <p className="text-gray-400">Events Ranked</p>
        </div>
        <div className="card text-center">
          <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">
            {new Date(profile.lastUpdated).toLocaleDateString()}
          </h3>
          <p className="text-gray-400">Last Updated</p>
        </div>
      </div>

      {/* WPS Calculation — formula + breakdown table */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Calculator className="w-7 h-7 text-green-400" />
          WPS Calculation
        </h2>
        <FormulaBox />
        {calculation && (
          <div className="mt-6 p-4 bg-gray-800/70 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Totals</h3>
            <ul className="space-y-1 text-gray-300 font-mono text-sm">
              <li>Σ EventScore = {calculation.sumEventScores.toFixed(4)}</li>
              <li>MAX = {calculation.maxPossible.toFixed(4)}</li>
              <li>Final WPS = ({calculation.sumEventScores.toFixed(4)} / {calculation.maxPossible.toFixed(4)}) × 100 = {formatScore(profile.wpsScore)}</li>
            </ul>
          </div>
        )}
        {hasBreakdown && profile.breakdown && profile.breakdown.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-3">Per-event breakdown</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="py-2 px-3 text-gray-300 font-semibold">Event</th>
                  <th className="py-2 px-3 text-gray-300 font-semibold">World Rank</th>
                  <th className="py-2 px-3 text-gray-300 font-semibold">Weight</th>
                  <th className="py-2 px-3 text-gray-300 font-semibold">Event Score</th>
                </tr>
              </thead>
              <tbody>
                {profile.breakdown
                  .slice()
                  .sort((a, b) => (EVENT_NAMES[a.eventId] || a.eventId).localeCompare(EVENT_NAMES[b.eventId] || b.eventId))
                  .map((row) => (
                    <tr key={row.eventId} className="border-b border-gray-700">
                      <td className="py-2 px-3 text-white">{EVENT_NAMES[row.eventId] || row.eventId}</td>
                      <td className="py-2 px-3 text-gray-300">{row.worldRank.toLocaleString()}</td>
                      <td className="py-2 px-3 text-gray-300">{row.weight}</td>
                      <td className="py-2 px-3 text-green-400 font-mono">{row.eventScore.toFixed(4)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Performance (cards when no breakdown) */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Event Performance</h2>
        
        {eventScores.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Event Data</h3>
            <p className="text-gray-400">
              This cuber doesn&apos;t have any official WCA results yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventScores.map((event) => (
              <div
                key={event.eventId}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{event.eventName}</h3>
                    <p className="text-sm text-gray-400">Event ID: {event.eventId}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getScoreColor(event.score)}`}>
                      {formatScore(event.score)}
                    </div>
                    <div className="text-sm text-gray-400">Event Score</div>
                    {event.rank > 0 && (
                      <div className="text-sm text-gray-300 mt-1">
                        World Rank #{event.rank.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WPS Explanation */}
      <div className="card bg-gray-800/50">
        <h3 className="text-lg font-semibold text-white mb-4">About WPS Score</h3>
        <p className="text-gray-300 mb-4">
          The Weighted Performance Scale (WPS) calculates a fair score based on performance 
          across all WCA events. Each event is weighted according to its popularity and difficulty, 
          ensuring balanced recognition for versatile cubers.
        </p>
        <Link to="/about" className="text-green-400 hover:text-green-300">
          Learn more about the WPS formula →
        </Link>
      </div>
    </div>
  );
}
