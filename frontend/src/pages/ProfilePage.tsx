import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, Calendar, MapPin, Award, Calculator, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/api';
import { WPSProfile, EVENT_NAMES } from '../types';
import { FormulaBox } from '../components/FormulaBox';
import { CountryFlag } from '../components/CountryFlag';

export function ProfilePage() {
  const { wcaId } = useParams<{ wcaId: string }>();
  const [profile, setProfile] = useState<WPSProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (wcaId) {
      setShowCalc(false);
      loadProfile(wcaId);
    }
  }, [wcaId]);

  const loadProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProfile(id, false);
      setProfile(data);
    } catch (err: unknown) {
      const ax = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status: number; data?: { error?: string } } })
        : null;
      const status = ax?.response?.status;
      const message = ax?.response?.data?.error;

      if (status === 404 && message === 'Person not found') {
        setError('Person not found');
      } else if (status === 400 && message) {
        setError(message);
      } else if (!ax?.response) {
        setError('Server unavailable. Check VITE_API_BASE_URL and CORS settings.');
      } else {
        setError(`Server error (${status}). Check VITE_API_BASE_URL and CORS settings.`);
        console.error('Profile error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBreakdownAndShow = async () => {
    if (!wcaId || !profile) return;
    if (profile.calculation != null || (profile.breakdown && profile.breakdown.length > 0)) {
      setShowCalc(true);
      return;
    }
    try {
      setLoadingBreakdown(true);
      const data = await apiService.getProfile(wcaId, true);
      setProfile(data);
      setShowCalc(true);
    } catch (err) {
      console.error('Error loading breakdown:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const formatScore = (score: number) => score.toFixed(2);

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
    if (score >= 80) return 'text-[var(--color-brand)]';
    if (score >= 60) return 'text-[var(--color-accent-gold)]';
    if (score >= 40) return 'text-[var(--color-accent-bronze)]';
    return 'text-[var(--color-error)]';
  };

  const handleShareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-[var(--color-error)]">{error || 'Profile not found'}</p>
        <Link to="/" className="btn-primary text-sm">
          Back to Home
        </Link>
      </div>
    );
  }

  const eventScores = getEventScores();

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <button
          type="button"
          onClick={handleShareProfile}
          className="btn-secondary text-xs"
        >
          <Share2 className="w-3.5 h-3.5" />
          {shareCopied ? 'Copied!' : 'Share profile'}
        </button>
      </div>

      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[var(--color-surface-overlay)] rounded-full flex items-center justify-center ring-2 ring-[var(--color-border)]">
              <Trophy className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">{profile.name}</h1>
              <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)] mt-1">
                <span className="font-mono">{profile.wcaId}</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <CountryFlag iso2={profile.countryIso2} name={profile.countryName ?? profile.country} />
                  <span>{profile.countryName ?? profile.country ?? '--'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1">
            <div className="text-4xl font-bold font-mono text-[var(--color-brand)]">
              {formatScore(profile.wpsScore)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">WPS Score</div>
            {(profile.totalRanked ?? 0) > 0 && (
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Global Rank: {profile.globalWpsRank != null && profile.globalWpsRank > 0
                  ? `#${profile.globalWpsRank.toLocaleString()}`
                  : '--'} of {(profile.totalRanked ?? 0).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card relative z-10">
          <Target className="w-5 h-5 text-[var(--color-brand)] mx-auto mb-2" />
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{profile.totalEvents}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Events Participated</div>
        </div>
        <div className="stat-card relative z-10">
          <Award className="w-5 h-5 text-[var(--color-brand)] mx-auto mb-2" />
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{eventScores.length}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Events Ranked</div>
        </div>
        <div className="stat-card relative z-10">
          <Calendar className="w-5 h-5 text-[var(--color-brand)] mx-auto mb-2" />
          <div className="text-sm font-bold text-[var(--color-text-primary)]">
            {new Date(profile.lastUpdated).toLocaleDateString()}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Last Updated</div>
        </div>
      </div>

      {/* Calculation Toggle */}
      <button
        type="button"
        onClick={() => (showCalc ? setShowCalc(false) : loadBreakdownAndShow())}
        disabled={loadingBreakdown}
        className="btn-secondary self-start disabled:opacity-50"
      >
        <Calculator className="w-4 h-4 text-[var(--color-brand)]" />
        {showCalc ? 'Hide calculation' : 'Show calculation'}
        {loadingBreakdown ? (
          <span className="w-4 h-4 border-2 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin" />
        ) : showCalc ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* WPS Calculation */}
      {showCalc && (
        <div className="card animate-slide-up">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[var(--color-brand)]" />
            WPS Calculation
          </h2>
          <FormulaBox />
          {calculation && (
            <div className="mt-5 p-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Totals</h3>
              <ul className="flex flex-col gap-1 text-xs font-mono text-[var(--color-text-secondary)]">
                <li>Sum EventScore = {calculation.sumEventScores.toFixed(4)}</li>
                <li>MAX = {calculation.maxPossible.toFixed(4)}</li>
                <li>
                  Final WPS = ({calculation.sumEventScores.toFixed(4)} / {calculation.maxPossible.toFixed(4)}) x 100 = {formatScore(profile.wpsScore)}
                </li>
              </ul>
            </div>
          )}
          {hasBreakdown && profile.breakdown && profile.breakdown.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Per-event breakdown</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>World Rank</th>
                    <th>Weight</th>
                    <th>Event Score</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.breakdown
                    .slice()
                    .sort((a, b) => (EVENT_NAMES[a.eventId] || a.eventId).localeCompare(EVENT_NAMES[b.eventId] || b.eventId))
                    .map((row) => (
                      <tr key={row.eventId}>
                        <td className="text-[var(--color-text-primary)]">{EVENT_NAMES[row.eventId] || row.eventId}</td>
                        <td className="text-[var(--color-text-secondary)]">{row.worldRank.toLocaleString()}</td>
                        <td className="text-[var(--color-text-secondary)]">{row.weight}</td>
                        <td className="font-mono text-[var(--color-brand)]">{row.eventScore.toFixed(4)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Event Performance */}
      <div className="card">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-5">Event Performance</h2>

        {eventScores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Target className="w-12 h-12 text-[var(--color-text-muted)]" />
            {profile.breakdown == null && profile.calculation == null ? (
              <>
                <h3 className="font-medium text-[var(--color-text-primary)]">Per-event details</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Click &quot;Show calculation&quot; above to see per-event breakdown and event performance.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-medium text-[var(--color-text-primary)]">No Event Data</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  This cuber doesn&apos;t have any official WCA results yet.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventScores.map((event) => (
              <div
                key={event.eventId}
                className="flex items-center justify-between p-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-colors"
              >
                <div>
                  <h3 className="font-medium text-[var(--color-text-primary)]">{event.eventName}</h3>
                  {event.rank > 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      World Rank #{event.rank.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className={`text-lg font-bold font-mono ${getScoreColor(event.score)}`}>
                  {formatScore(event.score)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About WPS */}
      <div className="card bg-[var(--color-surface-raised)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">About WPS Score</h3>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
          The Weighted Performance Scale (WPS) calculates a fair score based on performance
          across all WCA events. Each event is weighted according to its popularity and difficulty,
          ensuring balanced recognition for versatile cubers.
        </p>
        <Link to="/about" className="text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] transition-colors">
          Learn more about the WPS formula &rarr;
        </Link>
      </div>
    </div>
  );
}
