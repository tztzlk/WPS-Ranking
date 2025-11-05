import { useState, useEffect } from 'react';
import { Calculator, Target, Award, TrendingUp, Users, Globe } from 'lucide-react';
import { apiService } from '../services/api';
import { AboutData, EVENT_NAMES } from '../types';

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

      {/* Formula */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">WPS Formula</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">How It Works</h3>
            <p className="text-gray-300">{aboutData.formula.description}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-3">Calculation Steps</h4>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start space-x-3">
                <span className="text-green-400 font-bold">1.</span>
                <span>{aboutData.formula.calculation}</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-green-400 font-bold">2.</span>
                <span>{aboutData.formula.normalization}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-3">Example</h4>
            <p className="text-gray-300 mb-3">
              If a cuber ranks #10 in 3x3x3 Cube (weight: 1.0) and #50 in 2x2x2 Cube (weight: 0.8):
            </p>
            <div className="font-mono text-sm text-gray-300 space-y-1">
              <div>3x3x3 Score = 1.0 × (1 / log(10 + 1)) × 10 = 4.17</div>
              <div>2x2x2 Score = 0.8 × (1 / log(50 + 1)) × 10 = 2.13</div>
              <div>Total Score = (4.17 + 2.13) / 12.1 × 100 = 52.1</div>
            </div>
          </div>
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
