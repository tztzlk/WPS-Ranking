/**
 * CDN caching for API responses.
 *
 * The data changes once a day (pipeline at 02:00 UTC), so the Vercel CDN may
 * keep a response for an hour and then serve the cached copy while it fetches a
 * fresh one in the background (stale-while-revalidate). Each URL reaches the
 * function and the database at most about once an hour; after the nightly update
 * new data shows up within an hour. Browsers keep a copy for 5 minutes.
 */
export const DATA_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
