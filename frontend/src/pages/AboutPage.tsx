import { useEffect, useState } from 'react';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { FormulaBox } from '../components/FormulaBox';
import { SingleTag } from '../components/WpsPotential';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { apiService } from '../services/api';
import { AboutData, SCORED_EVENT_COUNT } from '../types';
import { Trans, useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';

const GITHUB_REPO_URL = 'https://github.com/tztzlk/WPS-Ranking';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const GITHUB_NEW_ISSUE_URL = `${GITHUB_REPO_URL}/issues/new`;
const STUCUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=D9RRDypgBOI';

const linkClass = 'text-green-400 underline underline-offset-2 hover:text-green-300';

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24">
      <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export function AboutPage() {
  const [aboutData, setAboutData] = useState<AboutData | null>(null);
  const [error, setError] = useState(false);
  const { t } = useTranslation('about');
  const { t: tc } = useTranslation('common');
  const fmt = useFormat();
  // Up to two decimals, trailing zeros dropped: 1, 0.1, 7.67 (0,1 and 7,67 in Russian).
  const formatWeight = (weight: number) =>
    new Intl.NumberFormat(fmt.locale, { maximumFractionDigits: 2 }).format(weight);
  const eventCount = { count: SCORED_EVENT_COUNT, n: fmt.int(SCORED_EVENT_COUNT) };

  useEffect(() => {
    apiService.getAbout().then(setAboutData, () => setError(true));
  }, []);

  usePageMetadata({
    title: t('meta.title'),
    description: t('meta.description', eventCount),
    canonicalPath: '/about',
  });

  const maxScore = formatWeight(aboutData ? aboutData.maxScore : 7.67);
  // By weight, then by field size, so equal weights still read top-down by popularity.
  const weights = aboutData
    ? Object.entries(aboutData.eventWeights).sort(
        ([ea, a], [eb, b]) =>
          b - a || (aboutData.eventParticipants?.[eb] ?? 0) - (aboutData.eventParticipants?.[ea] ?? 0),
      )
    : [];
  const maxParticipants = Math.max(1, ...Object.values(aboutData?.eventParticipants ?? {}));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-6 sm:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-green-300">{t('hero.eyebrow')}</p>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-5xl">
          <Trans t={t} i18nKey="hero.title" components={{ hl: <span className="text-green-400" /> }} />
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-gray-300">
          {t('hero.text', eventCount)}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a href="#feedback" className="btn-primary inline-flex items-center justify-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t('hero.feedback')}
          </a>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t('hero.source')}
          </a>
        </div>
      </section>

      <Section title={t('formula.title')}>
        <ol className="mb-6 space-y-3 text-gray-300">
          {[
            t('formula.step1'),
            t('formula.step2'),
            t('formula.step3', { max: maxScore }),
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-sm font-semibold text-green-300">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <FormulaBox />
        <p className="mt-3 text-sm text-gray-400">
          <Trans t={t} i18nKey="formula.legend" components={{ sub: <sub /> }} />
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gray-300">
          {t('formula.log')}
        </p>
      </Section>

      <Section title={t('measures.title')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
            <h3 className="mb-3 font-semibold text-green-300">{t('measures.does')}</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-300">
              <li>{t('measures.does1')}</li>
              <li>{t('measures.does2')}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h3 className="mb-3 font-semibold text-amber-300">{t('measures.doesNot')}</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-300">
              <li>{t('measures.not1')}</li>
              <li>{t('measures.not2')}</li>
              <li>{t('measures.not3')}</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title={t('others.title')}>
        <p className="mb-4 text-gray-300">{t('others.intro')}</p>
        <dl className="space-y-4 text-sm text-gray-300">
          <div>
            <dt className="mb-1 font-semibold text-white">{t('others.sorTerm')}</dt>
            <dd>{t('others.sorText')}</dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-white">{t('others.kinchTerm')}</dt>
            <dd>{t('others.kinchText')}</dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-white">{t('others.wpsTerm')}</dt>
            <dd>{t('others.wpsText')}</dd>
          </div>
        </dl>
      </Section>

      <Section title={t('single.title')}>
        <p className="text-gray-300">{t('single.text')}</p>
      </Section>

      <Section title={t('weights.title')}>
        <p className="mb-4 text-gray-300">{t('weights.intro')}</p>
        {error ? (
          <p className="text-sm text-red-400">{t('weights.error')}</p>
        ) : !aboutData ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-gray-700/50" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-3 font-medium">{t('weights.event')}</th>
                <th className="py-2 pr-3 font-medium">{t('weights.competitors')}</th>
                <th className="py-2 text-right font-medium">{t('weights.weight')}</th>
              </tr>
            </thead>
            <tbody>
              {weights.map(([eventId, weight]) => {
                const n = aboutData.eventParticipants?.[eventId] ?? 0;
                return (
                  <tr key={eventId} className="border-b border-gray-700/50 last:border-b-0">
                    <td className="py-2 pr-3 text-white">
                      {fmt.event(eventId)}
                      {aboutData.singleRankedEvents?.includes(eventId) && <SingleTag />}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-gray-700 sm:block" aria-hidden="true">
                          <div className="h-full rounded-full bg-gray-400" style={{ width: `${(n / maxParticipants) * 100}%` }} />
                        </div>
                        <span className="tabular-nums text-gray-400">{n ? fmt.int(n) : '—'}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums text-green-400">{formatWeight(weight)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={t('data.title')}>
        <div className="space-y-3 text-gray-300">
          <p>
            <Trans
              t={t}
              i18nKey="data.source"
              components={{
                link: (
                  <a
                    href="https://www.worldcubeassociation.org/export/results"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  />
                ),
              }}
            />
            {aboutData?.generatedAt && <> {t('data.current', { date: fmt.date(aboutData.generatedAt) })}</>}
          </p>
          <p>{t('data.independent')}</p>
          {/* Wording required by the WCA export license. */}
          <p className="text-sm text-gray-400">
            <Trans
              t={t}
              i18nKey={aboutData?.generatedAt ? 'data.noticeDated' : 'data.notice'}
              values={{ date: aboutData?.generatedAt ? fmt.date(aboutData.generatedAt, 'long') : undefined }}
              components={{
                link: (
                  <a
                    href="https://www.worldcubeassociation.org/results/rankings/333/single"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  />
                ),
              }}
            />
          </p>
          <p className="text-sm text-gray-400">
            <Trans
              t={t}
              i18nKey="data.idea"
              components={{ link: <a href={STUCUBE_VIDEO_URL} target="_blank" rel="noopener noreferrer" className={linkClass} /> }}
            />
          </p>
        </div>
      </Section>

      <Section id="feedback" title={t('feedback.title')}>
        <p className="mb-4 text-gray-300">{t('feedback.text')}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={GITHUB_NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {tc('footer.openIssue')}
          </a>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t('feedback.seeIssues')}
          </a>
        </div>
      </Section>

      <Section title={t('support.title')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-gray-300">{t('support.text')}</p>
          <a
            href="https://ko-fi.com/tonyokoo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#13719F] px-4 py-2 font-semibold text-white transition hover:bg-[#0E6A96]"
          >
            {tc('footer.donateButton')}
          </a>
        </div>
      </Section>
    </div>
  );
}
