import { useEffect } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { RELOAD_FLAG } from '../lib/chunkReload';

/** A lazy page chunk failed to load: usually a new deploy replaced the old files. */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(message);
}

/** Router error page: a 404 for unknown URLs, otherwise a short error message. */
export function RouteError() {
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);

  // Reload once to pick up the new deploy; the flag stops a reload loop.
  useEffect(() => {
    if (!chunkError) return;
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [chunkError]);

  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">{notFound ? 'Page not found' : 'This page could not be shown'}</h1>
      <p className="mb-6 text-gray-400">
        {notFound
          ? 'There is no page at this address.'
          : chunkError
            ? 'The site was updated while this tab was open. Refresh the page.'
            : 'Something went wrong. Refresh the page to try again.'}
      </p>
      <div className="flex justify-center gap-3">
        {!notFound && (
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            Refresh
          </button>
        )}
        <Link to="/" className={notFound ? 'btn-primary' : 'btn-secondary'}>
          Home
        </Link>
      </div>
    </div>
  );
}
