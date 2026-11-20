const DEFAULT_FRONTEND_URL = 'https://wps-ranking.vercel.app';
const DEFAULT_API_URL = 'https://wps-ranking-2aqr.vercel.app';

/** Public site address (FRONTEND_URL), e.g. https://wps-ranking.vercel.app. No trailing slash. */
export function getFrontendBaseUrl(): string {
  const configured = process.env.FRONTEND_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .filter((origin) => !origin.includes('localhost'));

  return corsOrigins?.[0] ?? DEFAULT_FRONTEND_URL;
}

/** Public API address (API_PUBLIC_URL), used for share images. No trailing slash. */
export function getApiPublicUrl(): string {
  return (process.env.API_PUBLIC_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, '');
}
