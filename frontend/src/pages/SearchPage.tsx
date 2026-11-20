import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Loader2, Search, User } from 'lucide-react';
import { apiService } from '../services/api';
import { SearchResult } from '../types';
import { CountryFlag } from '../components/CountryFlag';
import { RankBadge } from '../components/RankingList';
import { usePageMetadata } from '../hooks/usePageMetadata';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // setSearchParams changes identity on every URL change; keep it out of the
  // search effect's deps so updating ?q= does not trigger another search.
  const setParamsRef = useRef(setSearchParams);
  setParamsRef.current = setSearchParams;

  const executeSearch = useCallback(
    async (q: string) => {
      const normalizedQuery = q.trim();
      if (normalizedQuery.length < MIN_QUERY_LENGTH) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setParamsRef.current({ q: normalizedQuery }, { replace: true });
      try {
        const data = await apiService.searchCubers(normalizedQuery, 20, controller.signal);
        setResults(data);
        setSearchedFor(normalizedQuery);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'CanceledError') return;
        const userMsg =
          err && typeof err === 'object' && 'userMessage' in err ? (err as { userMessage?: string }).userMessage : null;
        setError(userMsg ?? 'Search failed. Please try again.');
        setResults([]);
        setSearchedFor(normalizedQuery);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [],
  );

  // Search as you type (debounced); also runs once for a ?q= link.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < MIN_QUERY_LENGTH) return;
    debounceRef.current = setTimeout(() => executeSearch(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, executeSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    executeSearch(query);
  };

  usePageMetadata({
    title: 'Search Cubers | WPS Ranking',
    description: 'Search speedcubers by name, WCA ID, or country and open their WPS ranking profiles.',
    canonicalPath: '/search',
  });

  const tooShort = query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
          Search <span className="text-green-400">cubers</span>
        </h1>
        <p className="text-gray-300">Find a cuber by name, surname, WCA ID, or country code</p>
      </div>

      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="search-input" className="sr-only">
          Search cubers
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            id="search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Garrett, 2017GARR05, KZ"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="input-field w-full py-3 pl-12 pr-12 text-lg"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-green-400" />
          )}
        </div>
        {tooShort && <p className="mt-2 text-sm text-gray-500">Type at least {MIN_QUERY_LENGTH} characters.</p>}
      </form>

      {error ? (
        <div className="card text-center">
          <p className="text-red-400">{error}</p>
          <button type="button" onClick={() => executeSearch(query)} className="btn-primary mt-4">
            Try again
          </button>
        </div>
      ) : searchedFor !== null && results.length === 0 && !loading ? (
        <div className="card py-10 text-center">
          <User className="mx-auto mb-3 h-12 w-12 text-gray-500" />
          <h2 className="mb-1 text-lg font-medium text-white">No cubers found for “{searchedFor}”</h2>
          <p className="text-gray-400">Check the spelling, or try a surname or a WCA ID.</p>
        </div>
      ) : results.length > 0 ? (
        <div className={`card overflow-hidden p-0 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <p className="border-b border-gray-700 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            {results.length === 20 ? 'Top 20 matches by WPS' : `${results.length} match${results.length === 1 ? '' : 'es'}`}
          </p>
          <ul>
            {results.map((cuber) => (
              <li key={cuber.wcaId}>
                <Link
                  to={`/profile/${cuber.wcaId}`}
                  className="group flex items-center gap-3 border-b border-gray-700/60 px-4 py-3 transition-colors hover:bg-gray-700/40 focus-visible:bg-gray-700/40 focus-visible:outline-none"
                >
                  <span className="w-14 shrink-0 text-sm">
                    {cuber.wpsRank ? <RankBadge rank={cuber.wpsRank} /> : <span className="text-gray-600">—</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <CountryFlag iso2={cuber.countryIso2} />
                      <span className="truncate font-medium text-white group-hover:text-green-300">{cuber.name}</span>
                    </span>
                    <span className="block font-mono text-xs text-gray-500">{cuber.wcaId}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums text-green-400">
                      {cuber.wpsRank ? cuber.wpsScore.toFixed(2) : '—'}
                    </span>
                    <span className="block text-xs text-gray-500">WPS</span>
                  </span>
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-gray-600 group-hover:text-gray-400 sm:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-white">Search tips</h2>
          <dl className="grid grid-cols-1 gap-4 text-sm text-gray-300 sm:grid-cols-3">
            <div>
              <dt className="mb-1 font-medium text-white">Name</dt>
              <dd>Start of a first name or surname: “Luke”, “Garrett”.</dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-white">WCA ID</dt>
              <dd>The full ID, e.g. 2017GARR05, finds exactly that cuber.</dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-white">Country</dt>
              <dd>A two-letter code like KZ or US lists that country’s top cubers.</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
