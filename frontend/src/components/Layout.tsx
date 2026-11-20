import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Search, Trophy, Info, Home, GitCompare } from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/compare', label: 'Compare', icon: GitCompare },
    { path: '/about', label: 'About', icon: Info },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-700/80 bg-gray-900/85 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white sm:text-xl">WPS Ranking</span>
            </Link>

            <nav className="hidden md:flex md:gap-1 lg:gap-2" aria-label="Main">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-800 text-white ring-1 ring-gray-700 [&>svg]:text-green-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              className="rounded-lg p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white md:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-800 text-white ring-1 ring-gray-700 [&>svg]:text-green-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
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

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">WPS Ranking</h3>
              <p className="text-gray-400">
                An all-around ranking of speedcubers, updated daily from official WCA data.
              </p>
              <div className="mt-6">
                <p className="mb-3 text-sm text-gray-400">Donations on Ko-fi pay for development time.</p>
                <a
                  href="https://ko-fi.com/tonyokoo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-[#29ABE0] px-4 py-2 font-semibold text-white transition hover:bg-[#1f93c4]"
                >
                  Support on Ko-fi
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Pages</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
                <li><Link to="/leaderboard" className="text-gray-400 hover:text-white">Leaderboard</Link></li>
                <li><Link to="/search" className="text-gray-400 hover:text-white">Search</Link></li>
                <li><Link to="/compare" className="text-gray-400 hover:text-white">Compare</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">How WPS works</Link></li>
                <li><Link to="/about#feedback" className="text-gray-400 hover:text-white">Feedback</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Data</h3>
              <p className="text-gray-400">
                Rankings use the official results export of the{' '}
                <a
                  href="https://www.worldcubeassociation.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  World Cube Association
                </a>
                . This site is not affiliated with the WCA.
              </p>
              <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/70 p-4">
                <p className="font-semibold text-white">Feedback</p>
                <p className="mt-2 text-sm text-gray-400">Report a bug or suggest a feature on GitHub.</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <a
                    href="https://github.com/tztzlk/WPS-Ranking/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300"
                  >
                    Open an issue
                  </a>
                  <a
                    href="https://github.com/tztzlk/WPS-Ranking/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white"
                  >
                    Open issues
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} WPS Ranking. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
