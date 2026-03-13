import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, MapPin, Award, Calendar, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/api';
import { WPSProfile, WpsBreakdownResponse, ProfileHistoryItem } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { WpsProgressChart } from '../components/WpsProgressChart';

export function ProfilePage() {
  const { wcaId } = useParams<{ wcaId: string }>();
  const [profile, setProfile] = useState<WPSProfile | null>(null);
  const [breakdown, setBreakdown] = useState<WpsBreakdownResponse | null>(null);
  const [history, setHistory] = useState<ProfileHistoryItem[]>([]);
  const [historyLoadError, setHistoryLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (wcaId) loadProfile(wcaId);
    return () => { abortRef.current?.abort(); };
  }, [wcaId]);

  const loadProfile = async (id: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      setBreakdown(null);
      setHistory([]);
      setHistoryLoadError(false);
      const data = await apiService.getProfile(id);
      if (!controller.signal.aborted) setProfile(data);
      if (!controller.signal.aborted && data?.wcaId) {
        const [breakdownRes, historyRes] = await Promise.allSettled([
          apiService.getWpsBreakdown(data.wcaId),
          apiService.getProfileHistory(data.wcaId),
        ]);
        if (!controller.signal.aborted && breakdownRes.status === 'fulfilled') setBreakdown(breakdownRes.value);
        if (!controller.signal.aborted) {
          if (historyRes.status === 'fulfilled') {
            setHistory(historyRes.value);
            setHistoryLoadError(false);
          } else {
            setHistoryLoadError(true);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const userMsg = err && typeof err === 'object' && 'userMessage' in err ? (err as { userMessage?: string }).userMessage : null;
      const ax = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } })
        : null;
      setError(userMsg ?? ax?.response?.data?.error ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => score.toFixed(2);

  const handleShareProfile = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
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

  const globalRankText =
    (profile.totalRanked ?? 0) > 0 && profile.globalWpsRank != null && profile.globalWpsRank > 0
      ? `#${profile.globalWpsRank.toLocaleString()} of ${(profile.totalRanked ?? 0).toLocaleString()}`
      : null;

  const countryRankText =
    profile.countryRank != null && profile.countryTotal != null && profile.countryTotal > 0
      ? `#${profile.countryRank.toLocaleString()} of ${profile.countryTotal.toLocaleString()} in ${profile.countryName ?? 'country'}`
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back + Share */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center space-x-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leaderboard</span>
        </Link>
        <button
          type="button"
          onClick={handleShareProfile}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition"
        >
          <Share2 className="w-4 h-4" />
          {shareCopied ? 'Copied!' : 'Share profile'}
        </button>
      </div>

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
                {profile.countryIso2 && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <CountryFlag iso2={profile.countryIso2} name={profile.countryName} />
                    <span>{profile.countryName ?? '—'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-0 text-center md:text-right">
            <div className="text-4xl font-bold text-green-400">
              {formatScore(profile.wpsScore)}
            </div>
            <div className="text-gray-400">WPS Score</div>
            {globalRankText && (
              <div className="text-lg text-gray-300 mt-2">
                Global Rank: {globalRankText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <Award className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white">
            {globalRankText ?? '—'}
          </h3>
          <p className="text-gray-400">Global WPS Rank</p>
        </div>
        <div className="card text-center">
          <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white">
            {countryRankText ?? '—'}
          </h3>
          <p className="text-gray-400">Country Rank</p>
        </div>
        <div className="card text-center">
          <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">
            {profile.lastUpdated ? new Date(profile.lastUpdated).toLocaleDateString() : '—'}
          </h3>
          <p className="text-gray-400">Last Updated</p>
        </div>
      </div>

      {/* WPS Progress Chart */}
      <WpsProgressChart data={history} loadError={historyLoadError} />

      {/* WPS Calculation (collapsible) */}
      {breakdown && breakdown.events.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
          >
            <span className="font-medium">
              {showBreakdown ? 'Hide WPS calculation' : 'Show WPS calculation'}
            </span>
            {showBreakdown ? (
              <ChevronUp className="w-5 h-5 shrink-0 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 shrink-0 text-gray-400" />
            )}
          </button>
          {showBreakdown && (
            <div className="border-t border-gray-700 px-6 py-5 space-y-4">
              <h3 className="text-lg font-semibold text-white">WPS Calculation Breakdown</h3>
              <p className="text-gray-300 text-sm">
                WPS is calculated from the cuber&apos;s current WCA world rank in each event and the event&apos;s weight.
                Each event contributes to the final score based on the current WPS formula.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="py-2 pr-4 text-gray-400 font-medium">Event</th>
                      <th className="py-2 pr-4 text-gray-400 font-medium">World Rank</th>
                      <th className="py-2 pr-4 text-gray-400 font-medium">Weight</th>
                      <th className="py-2 text-gray-400 font-medium">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.events.map((row) => (
                      <tr key={row.eventId} className="border-b border-gray-700/50">
                        <td className="py-2 pr-4 text-white">{row.eventName}</td>
                        <td className="py-2 pr-4 text-gray-300">#{row.worldRank.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-gray-300">{row.weight.toFixed(2)}</td>
                        <td className="py-2 text-green-400">{row.eventScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-600">
                      <td className="py-3 pr-4 font-medium text-white" colSpan={3}>
                        Total WPS
                      </td>
                      <td className="py-3 text-green-400 font-semibold">
                        {breakdown.wps.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-sm text-gray-400">
                <span>
                  <span className="text-gray-500">Most valuable event:</span>{' '}
                  <span className="text-white">
                    {breakdown.events[0]?.eventName ?? '—'}
                  </span>
                </span>
                <span>
                  <span className="text-gray-500">Best world rank used:</span>{' '}
                  <span className="text-white">
                    #{Math.min(...breakdown.events.map((e) => e.worldRank)).toLocaleString()}
                  </span>
                </span>
                <span>
                  <span className="text-gray-500">Snapshot date:</span>{' '}
                  <span className="text-white">
                    {profile.lastUpdated
                      ? new Date(profile.lastUpdated).toLocaleDateString()
                      : '—'}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
