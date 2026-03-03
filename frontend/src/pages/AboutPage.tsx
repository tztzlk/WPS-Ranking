import { useState, useEffect } from 'react';
import { Calculator, Target, Award, TrendingUp, Users, Globe, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { AboutData, EVENT_NAMES } from '../types';
import { FormulaBox } from '../components/FormulaBox';

export function AboutPage() {
  const [aboutData, setAboutData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAboutData();
  }, []);

  const loadAboutData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAbout();
      setAboutData(data);
    } catch (err) {
      setError('Failed to load about data');
      console.error('Error loading about data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatWeight = (weight: number) => weight.toFixed(1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
      </div>
    );
  }

  if (error || !aboutData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-[var(--color-error)]">{error || 'Failed to load data'}</p>
        <button onClick={loadAboutData} className="btn-primary text-sm">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-primary)] mb-4 tracking-tight">
          About <span className="text-[var(--color-brand)]">WPS Ranking</span>
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          {aboutData.description}
        </p>
      </div>

      {/* Philosophy */}
      <div className="card">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">Our Philosophy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: 'Fairness', desc: aboutData.philosophy.fairness },
            { icon: Award, title: 'Versatility', desc: aboutData.philosophy.versatility },
            { icon: Calculator, title: 'Transparency', desc: aboutData.philosophy.transparency },
          ].map((item) => (
            <div key={item.title} className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-[var(--radius)] bg-[var(--color-brand-muted)] flex items-center justify-center">
                <item.icon className="w-6 h-6 text-[var(--color-brand)]" />
              </div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WPS Definition */}
      <div className="card">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">WPS -- World Performance Score</h2>
        <div className="flex flex-col gap-8">
          {/* What is WPS */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">What is WPS</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              WPS measures current all-around competitive strength using official WCA world rankings.
              It uses each cuber&apos;s average (not single) results: for every included event, the current WCA world rank (average) is combined with an event weight and then normalized to a 0-100 scale.
            </p>
          </section>

          {/* Mathematical Definition */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Mathematical Definition</h3>
            <FormulaBox />
            <p className="mt-3 text-xs text-[var(--color-text-muted)] text-center">
              (ln denotes the natural logarithm.)
            </p>
          </section>

          {/* Variable Definitions */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Variable Definitions</h3>
            <dl className="flex flex-col gap-2">
              {[
                { sym: 'R_e', desc: 'current WCA world rank (average) for event e' },
                { sym: 'w_e', desc: 'weight of event e' },
                { sym: 'ln', desc: 'natural logarithm' },
                { sym: 'MAX', desc: 'theoretical maximum score (rank 1 in all included events)' },
              ].map((v) => (
                <div key={v.sym} className="flex flex-wrap gap-2 items-baseline text-sm">
                  <dt className="text-[var(--color-brand)] font-mono shrink-0">{v.sym}</dt>
                  <dd className="text-[var(--color-text-secondary)]">-- {v.desc}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Interpretation */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Interpretation</h3>
            <ul className="flex flex-col gap-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              <li>
                <strong className="text-[var(--color-text-primary)]">Why logarithm?</strong>{' '}
                The natural logarithm is used so that improvements at the top (e.g. rank 5 to 2) have a larger impact than the same jump lower down (e.g. rank 100 to 97). This reflects diminishing returns between ranks and avoids over-rewarding a single dominant event.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Why multiple events?</strong>{' '}
                Event scores are summed. Doing well in more events increases your total raw score, so WPS rewards breadth as well as depth.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Why 0-100?</strong>{' '}
                The sum of event scores is divided by MAX (the score you would get with rank 1 in every included event) and multiplied by 100. This normalizes the scale so that 100 represents the theoretical maximum and scores are comparable across time as the set of events or weights evolves.
              </li>
            </ul>
          </section>

          {/* Measures / Does not measure */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Scope</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--color-brand-muted)] border border-[var(--color-brand)]/10">
                <h4 className="text-xs font-semibold text-[var(--color-brand)] mb-2">WPS measures</h4>
                <ul className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1 list-disc list-inside">
                  <li>current competitive breadth across events</li>
                  <li>performance across multiple events at the time of calculation</li>
                </ul>
              </div>
              <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                <h4 className="text-xs font-semibold text-[var(--color-accent-gold)] mb-2">WPS does not measure</h4>
                <ul className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1 list-disc list-inside">
                  <li>historical dominance or past peaks</li>
                  <li>past world records or single/average PRs over time</li>
                  <li>legacy or GOAT (greatest of all time) status</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Credits */}
          <section className="border-t border-[var(--color-border)] pt-6">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Credits / Inspiration</h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              We thank <strong className="text-[var(--color-text-secondary)]">STUCUBE</strong> for the original inspiration. The base idea of a weighted all-around ranking for speedcubers was inspired by his work. The formula used on this site was adapted and implemented independently using official WCA data; it is not an official WCA metric.
            </p>
          </section>

          {/* Example */}
          <section className="p-5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Example</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              If a cuber ranks #10 in 3x3x3 Cube (weight 1.0) and #50 in 2x2x2 Cube (weight 0.8), with natural logarithm ln:
            </p>
            <div className="font-mono text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">
              <div>{'3x3x3 EventScore = 1.0 x (1 / ln(10 + 1)) x 10 ≈ 4.17'}</div>
              <div>{'2x2x2 EventScore = 0.8 x (1 / ln(50 + 1)) x 10 ≈ 2.13'}</div>
              <div>{'WPS = (4.17 + 2.13) / MAX x 100 (MAX depends on included events)'}</div>
            </div>
          </section>
        </div>
      </div>

      {/* Event Weights */}
      <div className="card">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Event Weights</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Each WCA event is assigned a weight based on its popularity and difficulty.
          More popular and challenging events receive higher weights.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(aboutData.eventWeights)
            .sort(([_, a], [__, b]) => b - a)
            .map(([eventId, weight]) => (
              <div
                key={eventId}
                className="flex items-center justify-between p-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]"
              >
                <div>
                  <h3 className="font-medium text-[var(--color-text-primary)]">
                    {EVENT_NAMES[eventId] || eventId}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">{eventId}</p>
                </div>
                <div className="text-xl font-bold font-mono text-[var(--color-brand)]">
                  {formatWeight(weight)}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Features */}
      <div className="card">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-5">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aboutData.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <TrendingUp className="w-4 h-4 text-[var(--color-brand)] mt-0.5 shrink-0" />
              <span className="text-sm text-[var(--color-text-secondary)]">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="card">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-5">Why WPS?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aboutData.benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <Users className="w-4 h-4 text-[var(--color-brand)] mt-0.5 shrink-0" />
              <span className="text-sm text-[var(--color-text-secondary)]">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Source */}
      <div className="card bg-[var(--color-surface-raised)]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-[var(--radius)] bg-[var(--color-brand-muted)] flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-[var(--color-brand)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Data Source</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mt-1">
              All rankings are calculated using official data from the{' '}
              <a
                href="https://www.worldcubeassociation.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] transition-colors"
              >
                World Cube Association
              </a>
              . Rankings are updated automatically to reflect the latest competition results.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] p-8 md:p-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(16,185,129,0.06), transparent)',
          }}
        />
        <div className="relative flex flex-col items-center gap-4">
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)] text-balance">
            Ready to See Your Rank?
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            Search for your WCA ID or name to discover your WPS score and global ranking.
          </p>
          <Link to="/search" className="btn-primary mt-2">
            <Search className="w-4 h-4" />
            <span>Search Now</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
