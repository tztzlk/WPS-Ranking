import { useEffect, useState } from 'react';
import {
  Award,
  Calculator,
  ExternalLink,
  Globe,
  HeartHandshake,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { FormulaBox } from '../components/FormulaBox';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { captureEvent } from '../lib/analytics';
import { apiService } from '../services/api';
import { AboutData, EVENT_NAMES } from '../types';

const GITHUB_REPO_URL = 'https://github.com/tztzlk/WPS-Ranking';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const GITHUB_NEW_ISSUE_URL = `${GITHUB_REPO_URL}/issues/new`;

const howItWorksSteps = [
  {
    title: 'Official WCA data only',
    description:
      'WPS Ranking uses official WCA results as its source, so the site stays grounded in the same public competition data cubers already trust.',
    icon: Globe,
  },
  {
    title: 'Average rankings, not singles',
    description:
      'The score uses current world average rankings for included events. That keeps the focus on repeatable competitive strength instead of one standout solve.',
    icon: Target,
  },
  {
    title: 'Weighted all-around performance',
    description:
      'Each event has a weight. Strong results across multiple events add up, so WPS rewards depth and breadth at the same time.',
    icon: Award,
  },
  {
    title: 'Regular refreshes',
    description:
      'The site refreshes from the WCA export pipeline, rebuilds leaderboard data, and updates historical snapshots so rankings and movers stay current.',
    icon: RefreshCw,
  },
];

export function AboutPage() {
  const [aboutData, setAboutData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAboutData();
  }, []);

  usePageMetadata({
    title: 'About WPS Ranking | WPS Ranking',
    description:
      'Learn how the Weighted Performance Scale works, where WPS data comes from, how often rankings update, and how to share feedback about the project.',
    canonicalPath: '/about',
  });

  async function loadAboutData() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAbout();
      setAboutData(data);
    } catch (err) {
      setError('We could not load the About page data right now.');
      console.error('Error loading about data:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatWeight(weight: number) {
    return weight.toFixed(2).replace(/\.?0+$/, '');
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-400" />
        <p className="mt-4 text-gray-400">Loading the WPS explainer...</p>
      </div>
    );
  }

  if (error || !aboutData) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400">{error || 'Failed to load data.'}</p>
        <button type="button" onClick={() => void loadAboutData()} className="btn-primary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8 md:p-10">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-green-300">
            How WPS Works
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            About <span className="text-green-400">WPS Ranking</span>
          </h1>
          <p className="text-lg leading-relaxed text-gray-300">{aboutData.description}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="#feedback" className="btn-primary inline-flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Share Feedback</span>
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => captureEvent('about_repo_clicked', { source: 'about_page_hero' })}
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Project Repository</span>
            </a>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-6 text-2xl font-bold text-white">Our Philosophy</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-green-400" />
            <h3 className="mb-2 text-lg font-semibold text-white">Fairness</h3>
            <p className="text-gray-300">{aboutData.philosophy.fairness}</p>
          </div>
          <div className="text-center">
            <Award className="mx-auto mb-4 h-12 w-12 text-green-400" />
            <h3 className="mb-2 text-lg font-semibold text-white">Versatility</h3>
            <p className="text-gray-300">{aboutData.philosophy.versatility}</p>
          </div>
          <div className="text-center">
            <Calculator className="mx-auto mb-4 h-12 w-12 text-green-400" />
            <h3 className="mb-2 text-lg font-semibold text-white">Transparency</h3>
            <p className="text-gray-300">{aboutData.philosophy.transparency}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">How WPS Is Calculated</h2>
            <p className="mt-2 max-w-3xl text-gray-400">
              WPS is designed to reflect current all-around competitive strength, not just one-event specialization.
            </p>
          </div>
          <div className="rounded-full border border-gray-700 bg-gray-800/80 px-4 py-2 text-sm text-gray-300">
            Uses official WCA average rankings
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {howItWorksSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <Icon className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white">{step.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-400">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-6">
            <h3 className="mb-3 text-lg font-semibold text-white">Mathematical Definition</h3>
            <FormulaBox />
            <p className="mt-3 text-center text-sm text-gray-400">ln denotes the natural logarithm.</p>
          </div>

          <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/40 p-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">What the score means</h3>
              <div className="space-y-3 text-sm leading-relaxed text-gray-300">
                <p>
                  Higher WPS means stronger weighted performance across the included WCA events at the current moment.
                </p>
                <p>
                  The logarithmic curve makes top-end improvements matter more, which helps separate elite all-around competitors.
                </p>
                <p>
                  WPS is not a GOAT metric. It is a current-form ranking built around breadth and consistency.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <h4 className="font-semibold text-white">Update rhythm</h4>
              <p className="mt-2 text-sm text-gray-400">
                Rankings refresh from the WCA export pipeline and rebuild leaderboard snapshots so the site stays fast and reasonably current.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-6 text-2xl font-bold text-white">What WPS Measures</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
            <h3 className="mb-3 text-lg font-semibold text-green-400">WPS measures</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Current competitive breadth across multiple WCA events.</li>
              <li>Weighted all-around strength instead of one-event dominance.</li>
              <li>Repeatable performance using official average rankings.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
            <h3 className="mb-3 text-lg font-semibold text-amber-400">WPS does not measure</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Historical legacy or greatest-of-all-time status.</li>
              <li>Past world records or lifetime peak accomplishments.</li>
              <li>Single-result explosiveness without broad event strength.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-6 text-2xl font-bold text-white">Event Weights</h2>
        <p className="mb-6 max-w-3xl text-gray-300">
          Each WCA event is assigned a weight based on the model used by WPS. More influential events contribute more to the final score.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(aboutData.eventWeights)
            .sort(([, a], [, b]) => b - a)
            .map(([eventId, weight]) => (
              <div key={eventId} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{EVENT_NAMES[eventId] || eventId}</h3>
                    <p className="text-sm text-gray-400">Event ID: {eventId}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">{formatWeight(weight)}</div>
                    <div className="text-sm text-gray-400">Weight</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-6 text-2xl font-bold text-white">Platform Features</h2>
          <div className="space-y-4">
            {aboutData.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <TrendingUp className="mt-1 h-5 w-5 shrink-0 text-green-400" />
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-6 text-2xl font-bold text-white">Why WPS?</h2>
          <div className="space-y-4">
            {aboutData.benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <Users className="mt-1 h-5 w-5 shrink-0 text-green-400" />
                <span className="text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card bg-gray-800/50">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-start gap-4">
            <Globe className="mt-1 h-8 w-8 shrink-0 text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Data Source</h3>
              <p className="mt-2 text-gray-300">
                All rankings are calculated from official{' '}
                <a
                  href="https://www.worldcubeassociation.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  World Cube Association
                </a>{' '}
                data. WPS Ranking is an independent project and is not an official WCA product.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <HeartHandshake className="mt-1 h-8 w-8 shrink-0 text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Why I built it</h3>
              <p className="mt-2 text-gray-300">
                WPS Ranking exists to make all-around cubing performance easier to explore, compare, and share in a way that feels transparent and fun.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card bg-gray-800/50">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Support WPS Ranking</h2>
            <p className="mt-2 text-gray-300">
              WPS Ranking is an independent project. Donations help keep hosting, the database, and refresh jobs running smoothly.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <h3 className="font-semibold text-white">Infrastructure</h3>
              <p className="mt-2 text-sm text-gray-400">
                Hosting, database costs, refresh jobs, and faster infrastructure for more reliable leaderboard loads.
              </p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <h3 className="font-semibold text-white">Product quality</h3>
              <p className="mt-2 text-sm text-gray-400">
                Donations give the project room for polish, mobile improvements, and better ranking history over time.
              </p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <h3 className="font-semibold text-white">Public and free</h3>
              <p className="mt-2 text-sm text-gray-400">
                Support helps keep the core experience open and accessible without putting the ranking behind a paywall.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">Help keep WPS Ranking online and improving.</p>
              <p className="text-sm text-gray-400">Support hosting, database costs, and continued development on Ko-fi.</p>
            </div>
            <a
              href="https://ko-fi.com/tonyokoo"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => captureEvent('support_clicked', { source: 'about_page' })}
              className="inline-flex items-center justify-center rounded-lg bg-[#29ABE0] px-4 py-2 font-semibold text-white transition hover:bg-[#1f93c4]"
            >
              Support on Ko-fi
            </a>
          </div>
        </div>
      </section>

      <section id="feedback" className="card">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Feedback and Community</h2>
            <p className="mt-2 max-w-3xl text-gray-400">
              If something looks wrong, feels confusing, or you have an idea that would make the site better, I want to hear it.
            </p>
          </div>
          <div className="rounded-full border border-gray-700 bg-gray-800/80 px-4 py-2 text-sm text-gray-300">
            GitHub Issues is the main feedback channel
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a
            href={GITHUB_NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => captureEvent('feedback_clicked', { type: 'bug', source: 'about_page' })}
            className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 transition hover:border-red-500/40 hover:bg-gray-800"
          >
            <MessageSquare className="mb-3 h-6 w-6 text-red-400" />
            <h3 className="font-semibold text-white">Report a bug</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Broken page, wrong data, unstable loading, layout issue, or anything that feels off.
            </p>
          </a>

          <a
            href={GITHUB_NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => captureEvent('feedback_clicked', { type: 'feature', source: 'about_page' })}
            className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 transition hover:border-green-500/40 hover:bg-gray-800"
          >
            <Lightbulb className="mb-3 h-6 w-6 text-green-400" />
            <h3 className="font-semibold text-white">Suggest a feature</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Ideas for profiles, comparison tools, insights, mobile UX, data trust, or anything else that would help cubers.
            </p>
          </a>

          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => captureEvent('feedback_clicked', { type: 'issues', source: 'about_page' })}
            className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 transition hover:border-sky-500/40 hover:bg-gray-800"
          >
            <ExternalLink className="mb-3 h-6 w-6 text-sky-400" />
            <h3 className="font-semibold text-white">View open issues</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Check what is already reported, what is being improved, and where the project is heading next.
            </p>
          </a>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-6 text-2xl font-bold text-white">Recent Updates</h2>
        <div className="space-y-4">
          {[
            'Added daily rank change indicators to the leaderboard.',
            'Added weekly movers highlights on the homepage.',
            'Added profile history charts with 7D, 30D, 90D, and All ranges.',
            'Improved refresh reliability so history snapshots continue even when the export hash is unchanged.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              <p className="text-gray-300">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
