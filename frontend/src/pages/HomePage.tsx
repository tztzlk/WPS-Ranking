import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactCountryFlag from 'react-country-flag';
import { Trophy, Search, TrendingUp, Users, Award, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';
import { LeaderboardEntry } from '../types';

export function HomePage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const result = await apiService.getLeaderboardTop100(5);
      setLeaderboard(result.items.map((item, index) => ({
        rank: item.rank ?? index + 1,
        wcaId: item.personId,
        name: item.name,
        country: item.countryName ?? item.countryId ?? '',
        countryIso2: item.countryIso2,
        countryName: item.countryName,
        wpsScore: item.wps,
        totalEvents: 0,
      })));
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => score.toFixed(2);

  const getRankClass = (index: number) => {
    if (index === 0) return 'rank-gold';
    if (index === 1) return 'rank-silver';
    if (index === 2) return 'rank-bronze';
    return 'text-[var(--color-text-muted)]';
  };

  return (
    <div className="flex flex-col gap-16 animate-fade-in">
      {/* Hero Section */}
      <section className="relative text-center py-16 md:py-24">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.08), transparent)',
          }}
        />

        <div className="relative flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-brand-muted)] border border-[var(--color-brand)]/20 text-xs font-medium text-[var(--color-brand)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] animate-pulse" />
            Live rankings from WCA data
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-[var(--color-text-primary)] tracking-tight text-balance leading-[1.1]">
            Global Rankings for{' '}
            <span className="text-[var(--color-brand)]">Speedcubers</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl leading-relaxed text-pretty">
            Track your performance across all WCA events with the Weighted Performance Scale.
            See who{"'"}s the most complete cuber in the world.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link to="/search" className="btn-primary">
              <Search className="w-4 h-4" />
              <span>Search Your Rank</span>
            </Link>
            <Link to="/about" className="btn-secondary">
              <Award className="w-4 h-4" />
              <span>Learn About WPS</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Trophy, value: '1000+', label: 'Ranked Cubers' },
          { icon: TrendingUp, value: '17', label: 'WCA Events' },
          { icon: Users, value: '100+', label: 'Countries' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card relative z-10">
            <stat.icon className="w-6 h-6 text-[var(--color-brand)] mx-auto mb-3" />
            <div className="text-3xl font-bold text-[var(--color-text-primary)]">{stat.value}</div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Top 5 Leaderboard */}
      <section className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Top 5 Cubers Worldwide</h2>
          <Link
            to="/leaderboard"
            className="text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--color-text-muted)]">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
            <button type="button" onClick={() => loadLeaderboard()} className="btn-primary text-sm">
              Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-20">Rank</th>
                  <th>Name</th>
                  <th>Country</th>
                  <th className="text-right">WPS Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((cuber, index) => (
                  <tr key={cuber.wcaId}>
                    <td>
                      <div className="flex items-center gap-2">
                        {index < 3 ? (
                          <Trophy className={`w-4 h-4 ${getRankClass(index)}`} />
                        ) : null}
                        <span className={`text-sm font-semibold ${getRankClass(index)}`}>
                          {cuber.rank}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/profile/${cuber.wcaId}`}
                        className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand)] transition-colors"
                      >
                        {cuber.name}
                      </Link>
                      <div className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">{cuber.wcaId}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {cuber.countryIso2 ? (
                          <ReactCountryFlag countryCode={cuber.countryIso2} svg className="!w-5 !h-4" />
                        ) : (
                          <span className="text-[var(--color-text-muted)]">--</span>
                        )}
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {cuber.countryName ?? cuber.country ?? '--'}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="font-mono font-semibold text-[var(--color-brand)]">
                        {formatScore(cuber.wpsScore)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] p-8 md:p-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(16,185,129,0.06), transparent)',
          }}
        />
        <div className="relative flex flex-col items-center gap-4">
          <h3 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] text-balance">
            Ready to Find Your Rank?
          </h3>
          <p className="text-[var(--color-text-secondary)] max-w-lg">
            Search for your WCA ID or name to see your WPS score and global ranking.
          </p>
          <Link to="/search" className="btn-primary mt-2">
            <Search className="w-4 h-4" />
            <span>Search Now</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
