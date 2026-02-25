import { useState, useEffect } from 'react';
import { Calculator, Target, Award, TrendingUp, Users, Globe } from 'lucide-react';
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

  const formatWeight = (weight: number) => {
    return weight.toFixed(1);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading...</p>
      </div>
    );
  }

  if (error || !aboutData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Failed to load data'}</p>
        <button onClick={loadAboutData} className="btn-primary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          About <span className="text-green-400">WPS Ranking</span>
        </h1>
        <p className="text-xl text-gray-300">
          {aboutData.description}
        </p>
      </div>

      {/* Philosophy */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Our Philosophy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <Target className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Fairness</h3>
            <p className="text-gray-300">{aboutData.philosophy.fairness}</p>
          </div>
          <div className="text-center">
            <Award className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Versatility</h3>
            <p className="text-gray-300">{aboutData.philosophy.versatility}</p>
          </div>
          <div className="text-center">
            <Calculator className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Transparency</h3>
            <p className="text-gray-300">{aboutData.philosophy.transparency}</p>
          </div>
        </div>
      </div>

      {/* WPS: What it is, formula, variables, interpretation, scope, credits */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">WPS — World Performance Score</h2>
        <div className="space-y-8">
          {/* Section 1 — What is WPS */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">What is WPS</h3>
            <p className="text-gray-300 leading-relaxed">
              WPS measures current all-around competitive strength using official WCA world rankings.
              It uses each cuber&apos;s average (not single) results: for every included event, the current WCA world rank (average) is combined with an event weight and then normalized to a 0–100 scale.
            </p>
          </section>

          {/* Section 2 — Mathematical Definition */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Mathematical Definition</h3>
            <FormulaBox />
            <p className="mt-3 text-gray-400 text-sm text-center">
              (ln denotes the natural logarithm.)
            </p>
          </section>

          {/* Section 3 — Variable Definitions */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Variable Definitions</h3>
            <dl className="space-y-2 text-gray-300">
              <div className="flex flex-wrap gap-2 items-baseline">
                <dt className="text-green-400 font-mono shrink-0">R_e</dt>
                <dd>— current WCA world rank (average) for event e</dd>
              </div>
              <div className="flex flex-wrap gap-2 items-baseline">
                <dt className="text-green-400 font-mono shrink-0">w_e</dt>
                <dd>— weight of event e</dd>
              </div>
              <div className="flex flex-wrap gap-2 items-baseline">
                <dt className="text-green-400 font-mono shrink-0">ln</dt>
                <dd>— natural logarithm</dd>
              </div>
              <div className="flex flex-wrap gap-2 items-baseline">
                <dt className="text-green-400 font-mono shrink-0">MAX</dt>
                <dd>— theoretical maximum score (rank 1 in all included events)</dd>
              </div>
            </dl>
          </section>

          {/* Section 4 — Interpretation */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Interpretation</h3>
            <ul className="space-y-2 text-gray-300 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-gray-200">Why logarithm?</strong> The natural logarithm is used so that improvements at the top (e.g. rank 5 → 2) have a larger impact than the same jump lower down (e.g. rank 100 → 97). This reflects diminishing returns between ranks and avoids over-rewarding a single dominant event.
              </li>
              <li>
                <strong className="text-gray-200">Why multiple events?</strong> Event scores are summed. Doing well in more events increases your total raw score, so WPS rewards breadth as well as depth.
              </li>
              <li>
                <strong className="text-gray-200">Why 0–100?</strong> The sum of event scores is divided by MAX (the score you would get with rank 1 in every included event) and multiplied by 100. This normalizes the scale so that 100 represents the theoretical maximum and scores are comparable across time as the set of events or weights evolves.
              </li>
            </ul>
          </section>

          {/* Section 5 — What WPS Measures / Does NOT Measure */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">What WPS Measures / What It Does Not Measure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/70 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">WPS measures</h4>
                <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                  <li>current competitive breadth across events</li>
                  <li>performance across multiple events at the time of calculation</li>
                </ul>
              </div>
              <div className="bg-gray-800/70 rounded-lg p-4">
                <h4 className="text-amber-400/90 font-semibold mb-2">WPS does not measure</h4>
                <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                  <li>historical dominance or past peaks</li>
                  <li>past world records or single/average PRs over time</li>
                  <li>legacy or GOAT (greatest of all time) status</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6 — Credits / Inspiration */}
          <section className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-2">Credits / Inspiration</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              We thank <strong className="text-gray-300">STUCUBE</strong> for the original inspiration. The base idea of a weighted all-around ranking for speedcubers was inspired by his work. The formula used on this site was adapted and implemented independently using official WCA data; it is not an official WCA metric.
            </p>
          </section>

          {/* Example (kept for concreteness) */}
          <section className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Example</h3>
            <p className="text-gray-300 mb-3">
              If a cuber ranks #10 in 3x3x3 Cube (weight 1.0) and #50 in 2x2x2 Cube (weight 0.8), with natural logarithm ln:
            </p>
            <div className="font-mono text-sm text-gray-300 space-y-1">
              <div>3x3x3 EventScore = 1.0 × (1 / ln(10 + 1)) × 10 ≈ 4.17</div>
              <div>2x2x2 EventScore = 0.8 × (1 / ln(50 + 1)) × 10 ≈ 2.13</div>
              <div>WPS = (4.17 + 2.13) / MAX × 100 (MAX depends on included events)</div>
            </div>
          </section>
        </div>
      </div>

      {/* Event Weights */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Event Weights</h2>
        <p className="text-gray-300 mb-6">
          Each WCA event is assigned a weight based on its popularity and difficulty. 
          More popular and challenging events receive higher weights.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(aboutData.eventWeights)
            .sort(([_, a], [__, b]) => b - a)
            .map(([eventId, weight]) => (
              <div
                key={eventId}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {EVENT_NAMES[eventId] || eventId}
                    </h3>
                    <p className="text-sm text-gray-400">Event ID: {eventId}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">
                      {formatWeight(weight)}
                    </div>
                    <div className="text-sm text-gray-400">Weight</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Features */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aboutData.features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
              <span className="text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Why WPS?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aboutData.benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
              <span className="text-gray-300">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Source */}
      <div className="card bg-gray-800/50">
        <div className="flex items-center space-x-4">
          <Globe className="w-8 h-8 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Data Source</h3>
            <p className="text-gray-300">
              All rankings are calculated using official data from the{' '}
              <a 
                href="https://www.worldcubeassociation.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                World Cube Association
              </a>
              . Rankings are updated automatically to reflect the latest competition results.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center bg-gray-800 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-4">
          Ready to See Your Rank?
        </h3>
        <p className="text-gray-300 mb-6">
          Search for your WCA ID or name to discover your WPS score and global ranking.
        </p>
        <a href="/search" className="btn-primary">
          Search Now
        </a>
      </div>
    </div>
  );
}
