import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Globe2, Layers, Share2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { apiService } from '../services/api';
import { WPSProfile, WpsBreakdownResponse, ProfileHistoryItem, SCORED_EVENT_COUNT } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { SingleTag, WpsPotential } from '../components/WpsPotential';
import { Avatar, useWcaAvatar } from '../components/Avatar';
import { usePageMetadata } from '../hooks/usePageMetadata';

// The chart library (recharts) is the largest dependency; load it only on profiles.
const WpsProgressChart = lazy(() =>
  import('../components/WpsProgressChart').then((m) => ({ default: m.WpsProgressChart })),
);

/** "top 0.01%" style share of the field at or above this rank. */
function topPercent(rank: number, total: number): string {
  const pct = (rank / total) * 100;
  if (pct < 0.01) return 'top 0.01%';
  if (pct < 1) return `top ${pct.toFixed(2)}%`;
  if (pct < 10) return `top ${pct.toFixed(1)}%`;
  return `top ${Math.round(pct)}%`;
}

export function ProfilePage() {
  const { wcaId } = useParams<{ wcaId: string }>();
  const [profile, setProfile] = useState<WPSProfile | null>(null);
  const [breakdown, setBreakdown] = useState<WpsBreakdownResponse | null>(null);
  const [history, setHistory] = useState<ProfileHistoryItem[]>([]);
  const [historyLoadError, setHistoryLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const avatarUrl = useWcaAvatar(profile?.wcaId);

  useEffect(() => {
    if (wcaId) loadProfile(wcaId);
    return () => {
      abortRef.current?.abort();
    };
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

        if (!controller.signal.aborted && breakdownRes.status === 'fulfilled') {
          setBreakdown(breakdownRes.value);
        }

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

      const userMsg =
        err && typeof err === 'object' && 'userMessage' in err
          ? (err as { userMessage?: string }).userMessage
          : null;
      const ax =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } })
          : null;

      setError(userMsg ?? ax?.response?.data?.error ?? 'The profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => score.toFixed(2);

  const handleShareProfile = async () => {
    if (!profile) return;

    // Link previews (Telegram, Discord) get a server-rendered page for this URL; see vercel.json.
    const shareUrl = `${window.location.origin}/profile/${encodeURIComponent(profile.wcaId)}`;

    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      setShareCopied(false);
    }
  };

  usePageMetadata({
    title: profile ? `${profile.name} | WPS Ranking` : 'Profile | WPS Ranking',
    description: profile
      ? `${profile.name} ${profile.countryName ? `from ${profile.countryName} ` : ''}has a WPS score of ${profile.wpsScore.toFixed(2)}. View current rank, history, and score breakdown.`
      : 'A speedcuber profile with WPS score, world and country rank, and history.',
    canonicalPath: profile ? `/profile/${encodeURIComponent(profile.wcaId)}` : wcaId ? `/profile/${encodeURIComponent(wcaId)}` : '/profile',
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label="Loading profile">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-800" />
        <div className="h-32 animate-pulse rounded-lg bg-gray-800" />
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-800" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-800" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-400">{error || 'No cuber with this WCA ID.'}</p>
        <Link to="/search" className="btn-primary">
          Search cubers
        </Link>
      </div>
    );
  }

  const total = profile.totalRanked ?? 0;
  const globalRank = profile.globalWpsRank != null && profile.globalWpsRank > 0 ? profile.globalWpsRank : null;
  const countryRank = profile.countryRank != null && profile.countryRank > 0 ? profile.countryRank : null;
  const countryTotal = profile.countryTotal ?? 0;
  const eventsScored = breakdown?.events.length ?? null;
  const maxContribution = Math.max(0.01, ...(breakdown?.events.map((e) => e.eventScore) ?? []));

  const stats = [
    {
      icon: Globe2,
      label: 'World rank',
      value: globalRank ? `#${globalRank.toLocaleString('en-US')}` : '—',
      detail: globalRank && total > 0 ? `${topPercent(globalRank, total)} of ${total.toLocaleString('en-US')}` : 'Not ranked',
    },
    {
      icon: Trophy,
      label: 'Country rank',
      value: countryRank ? `#${countryRank.toLocaleString('en-US')}` : '—',
      detail:
        countryRank && countryTotal > 0
          ? `${profile.countryName ?? 'country'} · of ${countryTotal.toLocaleString('en-US')}`
          : profile.countryName ?? '—',
    },
    {
      icon: Layers,
      label: 'Events scored',
      value: eventsScored != null ? `${eventsScored}/${SCORED_EVENT_COUNT}` : '—',
      detail: 'with a WCA result',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/leaderboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Leaderboard
        </Link>
        <button
          type="button"
          onClick={handleShareProfile}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
          aria-label="Share profile card"
          title="Share profile card"
        >
          <Share2 className="h-4 w-4" />
          {shareCopied ? 'Copied!' : 'Share'}
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Avatar name={profile.name} url={avatarUrl} className="h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{profile.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                {profile.countryIso2 && (
                  <span className="inline-flex items-center gap-1.5">
                    <CountryFlag iso2={profile.countryIso2} name={profile.countryName} />
                    {profile.countryName ?? '—'}
                  </span>
                )}
                <a
                  href={`https://www.worldcubeassociation.org/persons/${encodeURIComponent(profile.wcaId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono hover:text-white"
                  title="Open WCA profile"
                >
                  {profile.wcaId}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2 sm:block sm:text-right">
            <div className="text-4xl font-bold tabular-nums text-green-400 sm:text-5xl">{formatScore(profile.wpsScore)}</div>
            <div className="text-sm text-gray-400">
              WPS
              {profile.lastUpdated && (
                <span className="text-gray-400"> · {new Date(profile.lastUpdated).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-6">
        {stats.map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="card px-2 py-4 text-center sm:p-6">
            <Icon className="mx-auto mb-2 h-5 w-5 text-green-400 sm:h-7 sm:w-7" aria-hidden="true" />
            <div className="text-xl font-bold tabular-nums text-white sm:text-3xl">{value}</div>
            <div className="text-xs font-medium text-gray-300 sm:text-sm">{label}</div>
            <div className="mt-1 text-[11px] leading-tight text-gray-400 sm:text-xs">{detail}</div>
          </div>
        ))}
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-800" aria-hidden="true" />}>
        <WpsProgressChart data={history} loadError={historyLoadError} />
      </Suspense>

      {breakdown && breakdown.events.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50">
          <button
            type="button"
            onClick={() => setShowBreakdown((value) => !value)}
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-white"
          >
            <span className="font-medium">{showBreakdown ? 'Hide WPS breakdown' : 'Show WPS breakdown'}</span>
            {showBreakdown ? (
              <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
            )}
          </button>
          {showBreakdown && (
            <div className="space-y-4 border-t border-gray-700 px-6 py-5">
              <p className="text-sm text-gray-300">
                Each event scores the cuber&apos;s world rank against the number of people in that event&apos;s ranking,
                times the event weight. Events marked single use the ranking by single, the others the ranking by
                average. The contributions of all events add up to WPS.{' '}
                <Link to="/about" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                  How WPS works
                </Link>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th scope="col" className="py-2 pr-4 font-medium text-gray-400">Event</th>
                      <th scope="col" className="whitespace-nowrap py-2 pr-4 font-medium text-gray-400">World rank</th>
                      <th scope="col" className="hidden py-2 pr-4 font-medium text-gray-400 sm:table-cell">Weight</th>
                      <th scope="col" className="py-2 text-right font-medium text-gray-400 sm:text-left">
                        <span className="sm:hidden">WPS</span>
                        <span className="hidden sm:inline">Contribution</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.events.map((row) => (
                      <tr key={row.eventId} className="border-b border-gray-700/50">
                        <td className="py-2 pr-4 text-white">
                          {row.eventName}
                          {row.rankType === 'single' && <SingleTag />}
                        </td>
                        <td className="py-2 pr-4 text-gray-300">
                          <span className="tabular-nums">#{row.worldRank.toLocaleString('en-US')}</span>
                          {row.participants > 0 && (
                            <span className="block whitespace-nowrap text-xs text-gray-400 sm:ml-1 sm:inline">
                              of {row.participants.toLocaleString('en-US')}
                            </span>
                          )}
                        </td>
                        <td className="hidden py-2 pr-4 tabular-nums text-gray-300 sm:table-cell">{row.weight.toFixed(2)}</td>
                        <td className="py-2">
                          <div className="flex items-center justify-end gap-3 sm:justify-start">
                            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-gray-700 sm:block" aria-hidden="true">
                              <div
                                className="h-full rounded-full bg-green-500"
                                style={{ width: `${Math.min(100, (row.eventScore / maxContribution) * 100)}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-green-400">{row.eventScore.toFixed(2)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-600">
                      <th scope="row" className="py-3 pr-4 text-left font-medium text-white sm:hidden" colSpan={2}>
                        Total WPS
                      </th>
                      <th scope="row" className="hidden py-3 pr-4 text-left font-medium text-white sm:table-cell" colSpan={3}>
                        Total WPS
                      </th>
                      <td className="py-3 text-right font-semibold tabular-nums text-green-400 sm:pl-[6.75rem] sm:text-left">{breakdown.wps.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-sm text-gray-400">
                <span>
                  <span className="text-gray-400">Most valuable event:</span>{' '}
                  <span className="text-white">{breakdown.events[0]?.eventName ?? '—'}</span>
                </span>
                <span>
                  <span className="text-gray-400">Best world rank:</span>{' '}
                  <span className="text-white">
                    #{Math.min(...breakdown.events.map((event) => event.worldRank)).toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {breakdown?.potential && breakdown.typicalShare != null && (
        <WpsPotential name={profile.name} typicalShare={breakdown.typicalShare} items={breakdown.potential} />
      )}
    </div>
  );
}
