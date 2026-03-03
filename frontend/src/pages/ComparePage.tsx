import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, Trophy, Share2, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';
import { WPSProfile } from '../types';
import { CountryFlag } from '../components/CountryFlag';

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

function ProfileCard({ profile, label }: { profile: WPSProfile; label: string }) {
  const formatScore = (n: number) => n.toFixed(2);
  const globalRankText =
    (profile.totalRanked ?? 0) > 0 && profile.globalWpsRank != null && profile.globalWpsRank > 0
      ? `#${profile.globalWpsRank.toLocaleString()} of ${(profile.totalRanked ?? 0).toLocaleString()}`
      : '--';
  const countryRankText =
    profile.countryRank != null && profile.countryTotal != null
      ? `#${profile.countryRank.toLocaleString()} in ${profile.countryName ?? profile.country ?? 'country'}`
      : '--';

  return (
    <div className="card flex-1 min-w-0 animate-slide-up">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-5">{label}</div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 bg-[var(--color-surface-overlay)] rounded-full flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-[var(--color-text-muted)]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] truncate">{profile.name}</h2>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mt-0.5">
            <CountryFlag iso2={profile.countryIso2} name={profile.countryName ?? profile.country} />
            <span className="font-mono">{profile.wcaId}</span>
            {(profile.countryName ?? profile.country) && (
              <span className="truncate">({profile.countryName ?? profile.country})</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">WPS Score</span>
          <span className="text-2xl font-bold font-mono text-[var(--color-brand)]">{formatScore(profile.wpsScore)}</span>
        </div>
        <div className="h-px bg-[var(--color-border-subtle)]" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Global Rank</span>
          <span className="text-sm text-[var(--color-text-secondary)]">{globalRankText}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Country Rank</span>
          <span className="text-sm text-[var(--color-text-secondary)]">{countryRankText}</span>
        </div>
      </div>
      <Link
        to={`/profile/${profile.wcaId}`}
        className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] transition-colors"
      >
        View full profile <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export function ComparePage() {
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [data, setData] = useState<{ left: WPSProfile; right: WPSProfile } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    const l = leftId.trim();
    const r = rightId.trim();
    if (!l || !r) { setError('Enter both WCA IDs'); return; }
    if (!isValidWCAId(l)) { setError('Invalid left WCA ID (format: 2019ABCD01)'); return; }
    if (!isValidWCAId(r)) { setError('Invalid right WCA ID (format: 2019ABCD01)'); return; }
    if (l === r) { setError('Enter two different WCA IDs'); return; }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await apiService.getCompare(l, r);
      setData(result);
    } catch (err: unknown) {
      const userMsg = err && typeof err === 'object' && 'userMessage' in err ? (err as { userMessage?: string }).userMessage : null;
      const ax = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { error?: string } } }) : null;
      const msg = userMsg ?? ax?.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to load comparison');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShareCompare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <GitCompare className="w-8 h-8 text-[var(--color-brand)]" />
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
            Compare <span className="text-[var(--color-brand)]">Cubers</span>
          </h1>
        </div>
        <p className="text-[var(--color-text-secondary)]">
          Enter two WCA IDs to compare WPS and ranks side-by-side
        </p>
        <button
          type="button"
          onClick={handleShareCompare}
          className="btn-secondary text-xs mt-4"
        >
          <Share2 className="w-3.5 h-3.5" />
          {shareCopied ? 'Copied!' : 'Share compare link'}
        </button>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleCompare} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="left" className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                First WCA ID
              </label>
              <input
                id="left"
                type="text"
                value={leftId}
                onChange={(e) => setLeftId(e.target.value.toUpperCase())}
                placeholder="e.g. 2019SMIT01"
                className="input-field w-full font-mono"
              />
            </div>
            <div>
              <label htmlFor="right" className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                Second WCA ID
              </label>
              <input
                id="right"
                type="text"
                value={rightId}
                onChange={(e) => setRightId(e.target.value.toUpperCase())}
                placeholder="e.g. 2020KORE02"
                className="input-field w-full font-mono"
              />
            </div>
          </div>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary self-start disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[var(--color-bg)] border-t-transparent rounded-full animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                Compare
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileCard profile={data.left} label="First Cuber" />
          <ProfileCard profile={data.right} label="Second Cuber" />
        </div>
      )}
    </div>
  );
}
