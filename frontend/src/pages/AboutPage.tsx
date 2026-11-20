import { useEffect, useState } from 'react';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { FormulaBox } from '../components/FormulaBox';
import { SingleTag } from '../components/WpsPotential';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { apiService } from '../services/api';
import { AboutData, EVENT_NAMES } from '../types';

const GITHUB_REPO_URL = 'https://github.com/tztzlk/WPS-Ranking';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const GITHUB_NEW_ISSUE_URL = `${GITHUB_REPO_URL}/issues/new`;
const STUCUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=D9RRDypgBOI';

const formatWeight = (weight: number) => weight.toFixed(2).replace(/\.?0+$/, '');

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

  useEffect(() => {
    apiService.getAbout().then(setAboutData, () => setError(true));
  }, []);

  usePageMetadata({
    title: 'How WPS works | WPS Ranking',
    description:
      'How the WPS score is calculated from official WCA world ranks in 17 events, how event weights are chosen, and where the data comes from.',
    canonicalPath: '/about',
  });

  const maxScore = aboutData ? formatWeight(aboutData.maxScore) : '7.67';
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
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-green-300">About</p>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-5xl">
          How <span className="text-green-400">WPS</span> works
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-gray-300">
          WPS gives every cuber one score from 0 to 100. It is based on their official WCA world ranks in 17 events. A
          high rank in a big event counts more than the same rank in a small one.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a href="#feedback" className="btn-primary inline-flex items-center justify-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Send feedback
          </a>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Source code
          </a>
        </div>
      </section>

      <Section title="The formula">
        <ol className="mb-6 space-y-3 text-gray-300">
          {[
            'For each event, your world rank is compared with the number of people in that event\'s ranking. World #1 gets the full event weight. Last place gets 0.',
            'The scores of all your events are added up.',
            `The total is divided by the maximum possible score, ${maxScore}, and multiplied by 100. A WPS of 100 would mean world #1 in every event.`,
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
          R<sub>e</sub> is your world rank in event e, N<sub>e</sub> is the number of people in that ranking, and
          w<sub>e</sub> is the event weight. ln is the natural logarithm.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gray-300">
          The logarithm makes a climb near the top worth more than the same climb near the bottom. In 3x3, going from #20
          to #10 adds 0.72 WPS. Going from #20,010 to #20,000 adds less than 0.01 WPS.
        </p>
      </Section>

      <Section title="What WPS measures">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
            <h3 className="mb-3 font-semibold text-green-300">It measures</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-300">
              <li>How high you rank across all the events you compete in.</li>
              <li>Consistency. Most events use the ranking by average, so one lucky solve does not count.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h3 className="mb-3 font-semibold text-amber-300">It does not measure</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-300">
              <li>Records or career peaks. WPS uses current ranks.</li>
              <li>
                Strength in one event alone. The world #1 in 3x3 ranks below many all-rounders because they compete in
                fewer events.
              </li>
              <li>Entering events. A result near the bottom of an event adds almost nothing.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Average or single">
        <p className="text-gray-300">
          Most events use the WCA ranking by average. 3x3, 4x4 and 5x5 Blindfolded, Multi-Blind and Fewest Moves use the
          ranking by single. In these events most competitors never get an average. An average takes three
          successful blindfolded solves in one round, and Multi-Blind has no average at all. By single, 3x3 Blindfolded has about
          three times as many ranked people as by average.
        </p>
      </Section>

      <Section title="Event weights">
        <p className="mb-4 text-gray-300">
          A weight follows how many people compete in the event. 3x3 has the most competitors and weight 1. 5x5
          Blindfolded has the fewest and weight 0.1.
        </p>
        {error ? (
          <p className="text-sm text-red-400">The weights could not be loaded. Refresh the page to try again.</p>
        ) : !aboutData ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-gray-700/50" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3 font-medium">Event</th>
                <th className="py-2 pr-3 font-medium">Competitors</th>
                <th className="py-2 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {weights.map(([eventId, weight]) => {
                const n = aboutData.eventParticipants?.[eventId] ?? 0;
                return (
                  <tr key={eventId} className="border-b border-gray-700/50 last:border-b-0">
                    <td className="py-2 pr-3 text-white">
                      {EVENT_NAMES[eventId] || eventId}
                      {aboutData.singleRankedEvents?.includes(eventId) && <SingleTag />}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-gray-700 sm:block" aria-hidden="true">
                          <div className="h-full rounded-full bg-gray-400" style={{ width: `${(n / maxParticipants) * 100}%` }} />
                        </div>
                        <span className="tabular-nums text-gray-400">{n ? n.toLocaleString('en-US') : '—'}</span>
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

      <Section title="Data and updates">
        <div className="space-y-3 text-gray-300">
          <p>
            Rankings come from the official{' '}
            <a
              href="https://www.worldcubeassociation.org/export/results"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300"
            >
              WCA results export
            </a>
            . Every day at 02:00 UTC a job checks for a new export and recalculates all rankings.
            {aboutData?.generatedAt && (
              <>
                {' '}
                The current data is from{' '}
                {new Date(aboutData.generatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}.
              </>
            )}
          </p>
          <p>WPS Ranking is an independent project and is not affiliated with the WCA.</p>
          <p className="text-sm text-gray-400">
            The idea of a weighted all-around ranking comes from STUCUBE&apos;s video{' '}
            <a href={STUCUBE_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
              When You&apos;re The Best In The World But No One Cares
            </a>
            . The formula on this site is a modified version.
          </p>
        </div>
      </Section>

      <Section id="feedback" title="Feedback">
        <p className="mb-4 text-gray-300">Found wrong data or a bug, or have an idea? Open an issue on GitHub.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={GITHUB_NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Open an issue
          </a>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            See open issues
          </a>
        </div>
      </Section>

      <Section title="Support the project">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-gray-300">The site runs on free hosting. Donations on Ko-fi pay for development time.</p>
          <a
            href="https://ko-fi.com/tonyokoo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#29ABE0] px-4 py-2 font-semibold text-white transition hover:bg-[#1f93c4]"
          >
            Support on Ko-fi
          </a>
        </div>
      </Section>
    </div>
  );
}
