import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, MapPin, Trophy } from 'lucide-react';
import { apiService } from '../services/api';
import { SearchResult } from '../types';
import { CountryFlag } from '../components/CountryFlag';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSearch = useCallback(async (q: string) => {
    if (q.trim().length < MIN_QUERY_LENGTH) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await apiService.searchCubers(q.trim());
      if (import.meta.env.DEV) {
        console.log('[Search] response', response);
      }
      setResults(response.results ?? []);
    } catch (err: unknown) {
      const ax = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status: number; data?: { error?: string } } })
        : null;
      const status = ax?.response?.status;
      const message = ax?.response?.data?.error;

      if (status === 404 && message === 'Person not found') {
        setError('Person not found');
      } else if (status === 400 && message) {
        setError(message);
      } else if (!ax?.response) {
        setError('Server unavailable. Check VITE_API_BASE_URL and CORS settings.');
      } else {
        setError(`Server error (${status}). Check VITE_API_BASE_URL and CORS settings.`);
        console.error('Search error:', err);
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < MIN_QUERY_LENGTH) return;
    debounceRef.current = setTimeout(() => executeSearch(query), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, executeSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    executeSearch(query);
  };

  const formatScore = (score: number) => score.toFixed(2);

  const isValidWCAId = (input: string) => /^\d{4}[A-Z]{4}\d{2}$/.test(input);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
          Search <span className="text-[var(--color-brand)]">Cubers</span>
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Find speedcubers by name, WCA ID, or country
        </p>
      </div>

      {/* Search Form */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-4 h-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter name, WCA ID (e.g., 2019SMIT01), or country..."
                className="input-field pl-10 w-full"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {isValidWCAId(query) && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-brand)]">
              <Trophy className="w-3.5 h-3.5" />
              <span>Valid WCA ID format detected</span>
            </div>
          )}
        </form>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="card">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
            Search Results {results.length > 0 && (
              <span className="text-sm font-normal text-[var(--color-text-muted)]">({results.length})</span>
            )}
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-text-muted)]">Searching...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-[var(--color-error)]">{error}</p>
              <button onClick={() => handleSearch({ preventDefault: () => {} } as React.FormEvent)} className="btn-primary text-sm">
                Try Again
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <User className="w-12 h-12 text-[var(--color-text-muted)]" />
              <h3 className="font-medium text-[var(--color-text-primary)]">No Results Found</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Try searching with a different name, WCA ID, or check your spelling.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((cuber) => (
                <div
                  key={cuber.wcaId}
                  className="flex items-center justify-between gap-4 p-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-[var(--color-surface-overlay)] rounded-full flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{cuber.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-0.5">
                        <span className="font-mono">{cuber.wcaId}</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <CountryFlag iso2={cuber.countryIso2} name={cuber.countryName ?? cuber.country} />
                          <span>{cuber.countryName ?? cuber.country ?? '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-[var(--color-brand)]">
                        {formatScore(cuber.wpsScore)}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">WPS</div>
                      {(cuber.totalRanked ?? 0) > 0 && (
                        <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {cuber.globalWpsRank != null && cuber.globalWpsRank > 0
                            ? `#${cuber.globalWpsRank.toLocaleString()}`
                            : '--'} / {(cuber.totalRanked ?? 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/profile/${cuber.wcaId}`}
                      className="btn-primary text-sm py-2 px-3"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Tips */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Search Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {[
            { title: 'By Name', desc: 'Search for any part of a cuber\'s name (first name, last name, or both)' },
            { title: 'By WCA ID', desc: 'Enter the full WCA ID in format: YYYYAAAA## (e.g., 2019SMIT01)' },
            { title: 'By Country', desc: 'Search by country code (e.g., USA, CHN, JPN) or country name' },
            { title: 'Results', desc: 'Results are sorted by WPS score, showing the most complete cubers first' },
          ].map((tip) => (
            <div key={tip.title}>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-1">{tip.title}</h4>
              <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
