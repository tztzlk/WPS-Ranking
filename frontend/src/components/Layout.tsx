import { useEffect, useState } from 'react';
import { Outlet, Link, ScrollRestoration, useLocation, useNavigation } from 'react-router-dom';
import { clearChunkReloadFlag } from '../lib/chunkReload';
import { useDataDate } from '../hooks/useDataDate';
import { Search, Trophy, Info, Home, GitCompare, Flag } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useFormat } from '../i18n/format';

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // True while the next page's code is loading (pages are separate chunks).
  const pageLoading = useNavigation().state === 'loading';
  const { t } = useTranslation();
  const fmt = useFormat();
  const dataIso = useDataDate();
  const dataDate = dataIso ? fmt.date(dataIso, 'long') : null;
  useEffect(clearChunkReloadFlag, [location.pathname]);
  // Close the mobile menu on any navigation, including browser Back/Forward.
  useEffect(() => setMobileMenuOpen(false), [location.key]);

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
    { path: '/countries', label: t('nav.countries'), icon: Flag },
    { path: '/search', label: t('nav.search'), icon: Search },
    { path: '/compare', label: t('nav.compare'), icon: GitCompare },
    { path: '/about', label: t('nav.about'), icon: Info },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-700/80 bg-gray-900/85 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white sm:text-xl">{t('siteName')}</span>
            </Link>

            <nav className="hidden lg:flex lg:gap-1 xl:gap-2" aria-label={t('nav.main')}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-800 text-white ring-1 ring-gray-700 [&>svg]:text-green-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="hidden w-4 h-4 xl:block" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              className="rounded-lg p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={t('nav.toggleMenu')}
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
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-700">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
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

      {pageLoading && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-green-400" role="progressbar" aria-label={t('nav.loadingPage')} />
      )}
      {/* Full-height main keeps the footer below the fold while page data loads, so it does not jump. */}
      <main className="max-w-7xl mx-auto min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
      {/* New pages open at the top, Back/Forward returns to the old position, and #hash links scroll to their section. */}
      <ScrollRestoration />

      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">{t('siteName')}</h2>
              <p className="text-gray-400">{t('footer.tagline')}</p>
              <div className="mt-6">
                <p className="mb-3 text-sm text-gray-400">{t('footer.donate')}</p>
                <a
                  href="https://ko-fi.com/tonyokoo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-[#13719F] px-4 py-2 font-semibold text-white transition hover:bg-[#0E6A96]"
                >
                  {t('footer.donateButton')}
                </a>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">{t('footer.pages')}</h2>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white">{t('nav.home')}</Link></li>
                <li><Link to="/leaderboard" className="text-gray-400 hover:text-white">{t('nav.leaderboard')}</Link></li>
                <li><Link to="/countries" className="text-gray-400 hover:text-white">{t('footer.countryRanking')}</Link></li>
                <li><Link to="/search" className="text-gray-400 hover:text-white">{t('nav.search')}</Link></li>
                <li><Link to="/compare" className="text-gray-400 hover:text-white">{t('nav.compare')}</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">{t('footer.howWpsWorks')}</Link></li>
                <li><Link to="/about#feedback" className="text-gray-400 hover:text-white">{t('footer.feedback')}</Link></li>
                <li><Link to="/legal" className="text-gray-400 hover:text-white">{t('footer.legal')}</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">{t('footer.data')}</h2>
              <p className="text-gray-400">
                <Trans
                  i18nKey={dataDate ? 'footer.dataNoticeDated' : 'footer.dataNotice'}
                  values={{ date: dataDate }}
                  components={{
                    link: (
                      <a
                        href="https://www.worldcubeassociation.org/results/rankings/333/single"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300"
                      />
                    ),
                  }}
                />
              </p>
              <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/70 p-4">
                <p className="font-semibold text-white">{t('footer.feedback')}</p>
                <p className="mt-2 text-sm text-gray-400">{t('footer.feedbackText')}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <a
                    href="https://github.com/tztzlk/WPS-Ranking/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300"
                  >
                    {t('footer.openIssue')}
                  </a>
                  <a
                    href="https://github.com/tztzlk/WPS-Ranking/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white"
                  >
                    {t('footer.openIssues')}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>
              {t('footer.copyright', { year: new Date().getFullYear() })}{' '}
              <Link to="/legal" className="hover:text-white">{t('footer.legal')}</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
