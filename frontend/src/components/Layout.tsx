import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Search, Trophy, Info, Home, GitCompare, Menu, X } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/about', label: 'About', icon: Info },
];

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-[var(--color-brand)] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-shadow duration-300">
                <Trophy className="w-5 h-5 text-[var(--color-bg)]" />
              </div>
              <span className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">
                WPS Ranking
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--color-brand-muted)] text-[var(--color-brand)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile toggle */}
            <button
              type="button"
              className="md:hidden p-2 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] animate-fade-in">
            <div className="px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--color-brand-muted)] text-[var(--color-brand)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Brand column */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[var(--color-brand)] rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[var(--color-bg)]" />
                </div>
                <span className="text-base font-bold text-[var(--color-text-primary)]">WPS Ranking</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Global speedcubing leaderboard powered by the Weighted Performance Scale system.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                Quick Links
              </h3>
              <ul className="flex flex-col gap-2.5">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Data Source */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                Data Source
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Rankings are calculated using official data from the{' '}
                <a
                  href="https://www.worldcubeassociation.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] transition-colors"
                >
                  World Cube Association
                </a>
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
            <p>&copy; {new Date().getFullYear()} WPS Ranking. All rights reserved.</p>
            <p>Not affiliated with the World Cube Association.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
