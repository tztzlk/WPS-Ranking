import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, MapPin, Trophy } from 'lucide-react';
import { apiService } from '../services/api';
import { SearchResult, COUNTRY_FLAGS } from '../types';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await apiService.searchCubers(query.trim());
      if (import.meta.env.DEV) {
        console.log('[Search] response', response);
      }
      setResults(response.results ?? []);
    } catch (err: unknown) {
      const ax = err && typeof err === 'object' && 'response' in err ? (err as { response?: { status: number; data?: { error?: string } } }) : null;
      const status = ax?.response?.status;
      const message = ax?.response?.data?.error;
      if (status === 404) {
        setError('Person not found');
        setResults([]);
      } else if (status === 400 && message) {
        setError(message);
        setResults([]);
      } else {
        setError('Failed to search cubers');
        setResults([]);
        console.error('Error searching cubers:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    return score.toFixed(2);
  };

  const getCountryFlag = (country: string) => {
    return COUNTRY_FLAGS[country] || '🏳️';
  };

  const isValidWCAId = (input: string) => {
    const wcaIdRegex = /^\d{4}[A-Z]{4}\d{2}$/;
    return wcaIdRegex.test(input);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Search <span className="text-green-400">Cubers</span>
        </h1>
        <p className="text-lg text-gray-300">
          Find speedcubers by name, WCA ID, or country
        </p>
      </div>

      {/* Search Form */}
      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {isValidWCAId(query) && (
            <div className="flex items-center space-x-2 text-sm text-green-400">
              <Trophy className="w-4 h-4" />
              <span>Valid WCA ID format detected</span>
            </div>
          )}
        </form>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">
            Search Results {results.length > 0 && `(${results.length})`}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
              <p className="text-gray-400 mt-4">Searching...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button onClick={() => handleSearch({ preventDefault: () => {} } as React.FormEvent)} className="btn-primary mt-4">
                Try Again
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Results Found</h3>
              <p className="text-gray-400">
                Try searching with a different name, WCA ID, or check your spelling.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((cuber) => (
                <div
                  key={cuber.wcaId}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{cuber.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="font-mono">{cuber.wcaId}</span>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{getCountryFlag(cuber.country)} {cuber.country}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        {formatScore(cuber.wpsScore)}
                      </div>
                      <div className="text-sm text-gray-400">WPS Score</div>
                      {cuber.globalRank > 0 && (
                        <div className="text-sm text-gray-300 mt-1">
                          Rank #{cuber.globalRank}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Link
                      to={`/profile/${cuber.wcaId}`}
                      className="btn-primary"
                    >
                      View Profile
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
        <h3 className="text-lg font-semibold text-white mb-4">Search Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <h4 className="font-medium text-white mb-2">By Name</h4>
            <p>Search for any part of a cuber's name (first name, last name, or both)</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">By WCA ID</h4>
            <p>Enter the full WCA ID in format: YYYYAAAA## (e.g., 2019SMIT01)</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">By Country</h4>
            <p>Search by country code (e.g., USA, CHN, JPN) or country name</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Results</h4>
            <p>Results are sorted by WPS score, showing the most complete cubers first</p>
          </div>
        </div>
      </div>
    </div>
  );
}
