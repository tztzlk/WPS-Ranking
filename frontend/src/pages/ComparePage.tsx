import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GitCompare, Share2 } from 'lucide-react';
import { apiService } from '../services/api';
import { WPSProfile, WpsBreakdownResponse } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { CompareEvents } from '../components/CompareEvents';
import { Avatar } from '../components/Avatar';
import { useWcaAvatar } from '../hooks/useWcaAvatar';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { shareLink } from '../lib/shareLink';
import { Trans, useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

const EXAMPLE_ID = '2017GARR05';

function ProfileCard({ profile }: { profile: WPSProfile }) {
  const { t } = useTranslation('compare');
  const fmt = useFormat();
  const avatarUrl = useWcaAvatar(profile.wcaId);
  const formatScore = (n: number) => fmt.num(n);
  const countryName = fmt.country(profile.countryIso2, profile.countryName);
  const globalRankText =
    (profile.totalRanked ?? 0) > 0 && profile.globalWpsRank != null && profile.globalWpsRank > 0
      ? t('card.worldRankValue', { rank: fmt.int(profile.globalWpsRank), total: fmt.int(profile.totalRanked ?? 0) })
      : '—';
  const countryRankText =
    profile.countryRank != null && profile.countryTotal != null
      ? t('card.countryRankValue', { rank: fmt.int(profile.countryRank), country: countryName || t('card.countryFallback') })
      : '—';

  return (
    <div className="card flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={profile.name} url={avatarUrl} className="h-12 w-12 text-base" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{fmt.person(profile.name)}</h2>
          <div className="flex items-center gap-2 text-gray-400 mt-0.5">
            <CountryFlag iso2={profile.countryIso2} name={countryName} />
            <span className="font-mono text-sm">{profile.wcaId}</span>
            {countryName && (
              <span className="text-gray-400 truncate">({countryName})</span>
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
          <span className="text-gray-400">{t('card.worldRank')}</span>
          <span>{globalRankText}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{t('card.countryRank')}</span>
          <span>{countryRankText}</span>
        </div>
      </div>
      <Link
        to={`/profile/${profile.wcaId}`}
        className="inline-flex items-center gap-1 mt-4 text-green-400 hover:text-green-300 text-sm"
      >
        {t('card.openProfile')}
      </Link>
    </div>
  );
}

export function ComparePage() {
  const { t } = useTranslation(['compare', 'common']);
  const fmt = useFormat();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leftId, setLeftId] = useState(() => (searchParams.get('left') ?? '').toUpperCase());
  const [rightId, setRightId] = useState(() => (searchParams.get('right') ?? '').toUpperCase());
  const [data, setData] = useState<{ left: WPSProfile; right: WPSProfile } | null>(null);
  const [breakdowns, setBreakdowns] = useState<{ left: WpsBreakdownResponse; right: WpsBreakdownResponse } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const runCompare = useCallback(async (leftRaw: string, rightRaw: string) => {
    const l = leftRaw.trim().toUpperCase();
    const r = rightRaw.trim().toUpperCase();
    if (!l || !r) {
      setError(t('errors.missing'));
      return;
    }
    if (!isValidWCAId(l)) {
      setError(t('errors.firstInvalid', { example: EXAMPLE_ID }));
      return;
    }
    if (!isValidWCAId(r)) {
      setError(t('errors.secondInvalid', { example: EXAMPLE_ID }));
      return;
    }
    if (l === r) {
      setError(t('errors.same'));
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setBreakdowns(null);
    setSearchParams({ left: l, right: r }, { replace: true, preventScrollReset: true });

    try {
      const [result, lb, rb] = await Promise.all([
        apiService.getCompare(l, r),
        // A missing breakdown only hides the event chart.
        apiService.getWpsBreakdown(l).catch(() => null),
        apiService.getWpsBreakdown(r).catch(() => null),
      ]);
      setData(result);
      if (lb && rb) setBreakdowns({ left: lb, right: rb });
    } catch (err: unknown) {
      const userMsg = err && typeof err === 'object' && 'userMessage' in err ? (err as { userMessage?: string }).userMessage : null;
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      // API error texts are English: map the status to a translated message.
      setError(
        userMsg ??
          (status === 404 ? t('errors.notFound') : status === 400 ? t('errors.invalidId') : t('errors.generic')),
      );
      setData(null);
    } finally {
      setLoading(false);
    }
    // setSearchParams is only used to write the URL; re-creating runCompare on URL change is not wanted.
    // t is read when the comparison runs; a language switch does not need a new callback.
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
    if ((await shareLink(window.location.href)) === 'copied') {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  usePageMetadata({
    title: t('meta.title'),
    description: t('meta.description'),
    canonicalPath: '/compare',
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-2">
          <GitCompare className="w-9 h-9 text-green-400" />
          <span>
            <Trans t={t} i18nKey="title" components={{ accent: <span className="text-green-400" /> }} />
          </span>
        </h1>
        <p className="text-lg text-gray-300">
          {t('subtitle')}
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleCompare} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="left" className="block text-sm font-medium text-gray-400 mb-1">
                {t('form.first')}
              </label>
              <input
                id="left"
                type="text"
                value={leftId}
                onChange={(e) => setLeftId(e.target.value.toUpperCase())}
                placeholder={t('form.placeholder', { id: '2017GARR05' })}
                className="input-field w-full font-mono uppercase"
              />
            </div>
            <div>
              <label htmlFor="right" className="block text-sm font-medium text-gray-400 mb-1">
                {t('form.second')}
              </label>
              <input
                id="right"
                type="text"
                value={rightId}
                onChange={(e) => setRightId(e.target.value.toUpperCase())}
                placeholder={t('form.placeholder', { id: '2019TARA09' })}
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {t('form.submitting')}
              </>
            ) : (
              <>
                <GitCompare className="w-5 h-5" />
                {t('form.submit')}
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
                t('tie')
              ) : (
                <Trans
                  t={t}
                  i18nKey="leads"
                  values={{
                    name: fmt.person((data.left.wpsScore > data.right.wpsScore ? data.left : data.right).name),
                    diff: fmt.num(Math.abs(data.left.wpsScore - data.right.wpsScore)),
                  }}
                  components={{
                    name: <span className="font-semibold text-white" />,
                    diff: <span className="font-semibold tabular-nums text-green-400" />,
                  }}
                />
              )}
            </p>
            <button
              type="button"
              onClick={handleShareCompare}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
            >
              <Share2 className="h-4 w-4" />
              {shareCopied ? t('common:actions.copied') : t('common:actions.copyLink')}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ProfileCard profile={data.left} />
            <ProfileCard profile={data.right} />
          </div>
          {breakdowns && (
            <CompareEvents
              left={{ name: data.left.name, breakdown: breakdowns.left }}
              right={{ name: data.right.name, breakdown: breakdowns.right }}
            />
          )}
        </div>
      )}
    </div>
  );
}
