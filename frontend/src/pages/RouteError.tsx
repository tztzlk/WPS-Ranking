import { useEffect } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { RELOAD_FLAG } from '../lib/chunkReload';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useTranslation } from 'react-i18next';

/** A lazy page chunk failed to load: usually a new deploy replaced the old files. */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(message);
}

/** Router error page: a 404 for unknown URLs, otherwise a short error message. */
export function RouteError() {
  const { t } = useTranslation();
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
  usePageMetadata({
    title: notFound ? t('errors.metaNotFoundTitle') : t('errors.metaErrorTitle'),
    description: notFound ? t('errors.notFoundText') : t('errors.metaErrorDescription'),
    noindex: true,
  });
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">{notFound ? t('errors.notFoundTitle') : t('errors.errorTitle')}</h1>
      <p className="mb-6 text-gray-400">
        {notFound
          ? t('errors.notFoundText')
          : chunkError
            ? t('errors.chunkText')
            : t('errors.errorText')}
      </p>
      <div className="flex justify-center gap-3">
        {!notFound && (
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            {t('actions.refresh')}
          </button>
        )}
        <Link to="/" className={notFound ? 'btn-primary' : 'btn-secondary'}>
          {t('nav.home')}
        </Link>
      </div>
    </div>
  );
}
