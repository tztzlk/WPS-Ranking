import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GitCompare, Trophy, Share2 } from 'lucide-react';
import { apiService } from '../services/api';
import { WPSProfile } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { usePageMetadata } from '../hooks/usePageMetadata';

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

function ProfileCard({ profile, label }: { profile: WPSProfile; label: string }) {
  const formatScore = (n: number) => n.toFixed(2);
  const globalRankText =
    (profile.totalRanked ?? 0) > 0 && profile.globalWpsRank != null && profile.globalWpsRank > 0
      ? `#${profile.globalWpsRank.toLocaleString()} of ${(profile.totalRanked ?? 0).toLocaleString()}`
      : '—';
  const countryRankText =
    profile.countryRank != null && profile.countryTotal != null
      ? `#${profile.countryRank.toLocaleString()} in ${profile.countryName ?? 'country'}`
      : '—';

  return (
    <div className="card flex-1 min-w-0">
      <div className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">{label}</div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6 text-gray-300" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{profile.name}</h2>
          <div className="flex items-center gap-2 text-gray-400 mt-0.5">
            <CountryFlag iso2={profile.countryIso2} name={profile.countryName} />
            <span className="font-mono text-sm">{profile.wcaId}</span>
            {profile.countryName && (
              <span className="text-gray-400 truncate">({profile.countryName})</span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2 text-gray-300">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">WPS</span>
          <span className="text-2xl font-bold text-green-400">{formatScore(profile.wpsScore)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Global Rank</span>
          <span>{globalRankText}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Country Rank</span>
          <span>{countryRankText}</span>
        </div>
      </div>
      <Link
        to={`/profile/${profile.wcaId}`}
        className="inline-flex items-center gap-1 mt-4 text-green-400 hover:text-green-300 text-sm"
      >
        View full profile →
      </Link>
    </div>
  );
}

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leftId, setLeftId] = useState(() => (searchParams.get('left') ?? '').toUpperCase());
  const [rightId, setRightId] = useState(() => (searchParams.get('right') ?? '').toUpperCase());
  const [data, setData] = useState<{ left: WPSProfile; right: WPSProfile } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const runCompare = useCallback(async (leftRaw: string, rightRaw: string) => {
    const l = leftRaw.trim().toUpperCase();
    const r = rightRaw.trim().toUpperCase();
    if (!l || !r) {
      setError('Enter both WCA IDs');
      return;
    }
    if (!isValidWCAId(l)) {
      setError('Invalid left WCA ID (format: 2019ABCD01)');
      return;
    }
    if (!isValidWCAId(r)) {
      setError('Invalid right WCA ID (format: 2019ABCD01)');
      return;
    }
    if (l === r) {
      setError('Enter two different WCA IDs');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setSearchParams({ left: l, right: r }, { replace: true });

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
    // setSearchParams is only used to write the URL; re-creating runCompare on URL change is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    void runCompare(leftId, rightId);
  };

  // A shared /compare?left=…&right=… link compares right away.
  useEffect(() => {
    const l = searchParams.get('left');
    const r = searchParams.get('right');
    if (l && r) void runCompare(l, r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShareCompare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  };

  usePageMetadata({
    title: 'Compare Cubers | WPS Ranking',
    description: 'Compare two speedcubers side by side using WPS scores, global rank, and country rank.',
    canonicalPath: '/compare',
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-2">
          <GitCompare className="w-9 h-9 text-green-400" />
          Compare <span className="text-green-400">Cubers</span>
        </h1>
        <p className="text-lg text-gray-300">
          Enter two WCA IDs to compare WPS and ranks side-by-side
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleCompare} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="left" className="block text-sm font-medium text-gray-400 mb-1">
                Left WCA ID
              </label>
              <input
                id="left"
                type="text"
                value={leftId}
                onChange={(e) => setLeftId(e.target.value.toUpperCase())}
                placeholder="e.g. 2017GARR05"
                className="input-field w-full font-mono uppercase"
              />
            </div>
            <div>
              <label htmlFor="right" className="block text-sm font-medium text-gray-400 mb-1">
                Right WCA ID
              </label>
              <input
                id="right"
                type="text"
                value={rightId}
                onChange={(e) => setRightId(e.target.value.toUpperCase())}
                placeholder="e.g. 2019TARA09"
                className="input-field w-full font-mono uppercase"
              />
            </div>
          </div>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompare className="w-5 h-5" />
                Compare
              </>
            )}
          </button>
        </form>
      </div>

      {data && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 sm:flex-row">
            <p className="text-center text-gray-200 sm:text-left">
              {data.left.wpsScore === data.right.wpsScore ? (
                'Both cubers have the same WPS.'
              ) : (
                <>
                  <span className="font-semibold text-white">
                    {(data.left.wpsScore > data.right.wpsScore ? data.left : data.right).name}
                  </span>{' '}
                  leads by{' '}
                  <span className="font-semibold tabular-nums text-green-400">
                    {Math.abs(data.left.wpsScore - data.right.wpsScore).toFixed(2)} WPS
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={handleShareCompare}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
            >
              <Share2 className="h-4 w-4" />
              {shareCopied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ProfileCard profile={data.left} label="Left" />
            <ProfileCard profile={data.right} label="Right" />
          </div>
        </div>
      )}
    </div>
  );
}
