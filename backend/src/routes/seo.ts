/**
 * Crawler pages, sitemaps and robots.txt. The frontend proxies these URLs here
 * (frontend/vercel.json), so they are served from the site's own address:
 *
 *   /profile/:id, /leaderboard, /countries  (crawlers only)  -> /seo/...
 *   /sitemap.xml, /sitemaps/*.xml, /robots.txt (everyone)    -> /seo/...
 */
import { Router, Request, Response } from 'express';
import { asyncRoute } from '../lib/asyncRoute';
import { getApiPublicUrl, getFrontendBaseUrl } from '../lib/siteUrl';
import { prisma } from '../lib/prisma';
import { escapeHtml, fmtInt, renderPage } from '../seo/html';
import { findPersonById, getMetaValues, isValidWCAId } from '../services/personDb';
import { getWpsBreakdown } from '../services/wpsBreakdown';
import {
  getContinentLeaderboard,
  getCountryLeaderboard,
  getCountryRanking,
  getGlobalLeaderboard,
} from '../services/leaderboard';
import { CONTINENTS, EVENT_WEIGHTS } from '../types';

const router = Router();

/** Pages are rebuilt from the database at most every 10 minutes per URL. */
const PAGE_CACHE_CONTROL = 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600';
const SITEMAP_CACHE_CONTROL = 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400';
/**
 * The sitemap protocol allows 50,000 URLs per file, but 50,000 profile URLs are
 * ~5 MB uncompressed, over Vercel's 4.5 MB function response limit. 25,000 keeps
 * each file near 2.5 MB even for clients that do not accept gzip.
 */
const PROFILES_PER_SITEMAP = 25_000;
const LIST_SIZE = 100;
const EVENT_COUNT = Object.keys(EVENT_WEIGHTS).length;
const CONTINENTS_LIST = Object.values(CONTINENTS);

function sendHtml(res: Response, html: string, status = 200): void {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? PAGE_CACHE_CONTROL : 'public, max-age=60, s-maxage=60');
  res.send(html);
}

function sendXml(res: Response, xml: string): void {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', SITEMAP_CACHE_CONTROL);
  res.send(xml);
}

const link = (path: string, text: string) => `<a href="${escapeHtml(path)}">${escapeHtml(text)}</a>`;

/** Ordered list of cubers, each linked to their profile. */
function cuberList(items: { personId: string; name: string; wps: number; countryName?: string | null }[], rankOf: (i: number) => number): string {
  const rows = items
    .map(
      (item, i) =>
        `<li>#${fmtInt(rankOf(i))} ${link(`/profile/${item.personId}`, item.name)}${
          item.countryName ? `, ${escapeHtml(item.countryName)}` : ''
        }: ${item.wps.toFixed(2)} WPS</li>`,
    )
    .join('');
  return `<ol>${rows}</ol>`;
}

const nav = `<nav>${link('/', 'Home')} · ${link('/leaderboard', 'World leaderboard')} · ${link('/countries', 'Country ranking')} · ${link('/about', 'How WPS works')}</nav>`;

async function notFoundPage(res: Response, path: string): Promise<void> {
  const html = await renderPage({
    title: 'Page not found | WPS Ranking',
    description: 'There is no page at this address.',
    path,
    bodyHtml: `<main><h1>Page not found</h1>${nav}</main>`,
  });
  sendHtml(res, html, 404);
}

// --- Profile ---------------------------------------------------------------

router.get(
  '/profile/:id',
  asyncRoute(async (req: Request, res: Response) => {
    const id = (req.params.id ?? '').trim().toUpperCase();
    const path = `/profile/${id}`;
    if (!isValidWCAId(id)) return notFoundPage(res, path);

    const [person, breakdown, meta] = await Promise.all([
      findPersonById(id),
      getWpsBreakdown(id),
      getMetaValues(['totalRanked']),
    ]);
    if (!person) return notFoundPage(res, path);

    const total = Number(meta.totalRanked) || 0;
    const ranked = person.rank != null && person.rank > 0;
    const country = person.countryName ?? person.countryIso2 ?? null;
    const title = ranked
      ? `${person.name}: WPS ${person.score.toFixed(2)}, #${fmtInt(person.rank!)} in the world | WPS Ranking`
      : `${person.name} | WPS Ranking`;
    const summary = ranked
      ? `${person.name}${country ? ` from ${country}` : ''} has a WPS of ${person.score.toFixed(2)}, ranking #${fmtInt(person.rank!)} of ${fmtInt(total)} speedcubers in the world${
          person.countryRank ? ` and #${fmtInt(person.countryRank)} in ${country}` : ''
        }.`
      : `${person.name}${country ? ` from ${country}` : ''} has no WPS yet: no official WCA result in the scored events.`;
    const events = breakdown?.events ?? [];
    const description = events.length
      ? `${summary} Best events: ${events
          .slice(0, 3)
          .map((e) => `${e.eventName} #${fmtInt(e.worldRank)}`)
          .join(', ')}.`
      : summary;

    const table = events.length
      ? `<h2>WPS by event</h2><table><thead><tr><th>Event</th><th>World rank</th><th>WPS</th></tr></thead><tbody>${events
          .map(
            (e) =>
              `<tr><td>${escapeHtml(e.eventName)}${e.rankType === 'single' ? ' (single)' : ''}</td><td>#${fmtInt(e.worldRank)} of ${fmtInt(
                e.participants,
              )}</td><td>${e.eventScore.toFixed(2)}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : '';
    const countryLink = person.countryIso2
      ? `<p>${link(`/leaderboard?country=${person.countryIso2}`, `${country} leaderboard`)}</p>`
      : '';

    const html = await renderPage({
      title,
      description,
      path,
      ogType: 'profile',
      // TODO: use `${getApiPublicUrl()}/api/og/profile/${id}` again once the
      // generator stops failing on Vercel. Until then the default image is used.
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: person.name,
          identifier: id,
          ...(country ? { nationality: { '@type': 'Country', name: country } } : {}),
          sameAs: [`https://www.worldcubeassociation.org/persons/${id}`],
        },
      },
      bodyHtml: `<main><h1>${escapeHtml(person.name)}</h1><p>WCA ID ${escapeHtml(id)}. ${escapeHtml(summary)}</p>${table}${countryLink}${nav}</main>`,
    });
    sendHtml(res, html);
  }),
);

// --- Leaderboards -----------------------------------------------------------

router.get(
  '/leaderboard',
  asyncRoute(async (req: Request, res: Response) => {
    const country = typeof req.query.country === 'string' ? req.query.country.trim().toUpperCase() : '';
    const continent = typeof req.query.continent === 'string' ? req.query.continent.trim().toUpperCase() : '';

    if (country) {
      const data = await getCountryLeaderboard(country, LIST_SIZE);
      const path = `/leaderboard?country=${encodeURIComponent(country)}`;
      if (!data) return notFoundPage(res, path);
      const html = await renderPage({
        title: `Best speedcubers in ${data.countryName} | WPS Ranking`,
        description: `The top ${data.items.length} all-around speedcubers in ${data.countryName} by WPS, a score from official WCA world ranks in ${EVENT_COUNT} events. #1: ${data.items[0].name}, ${data.items[0].wps.toFixed(2)} WPS.`,
        path,
        bodyHtml: `<main><h1>${escapeHtml(data.countryName)} leaderboard</h1>${cuberList(data.items, (i) => data.items[i].countryRank)}${nav}</main>`,
      });
      return sendHtml(res, html);
    }

    if (continent) {
      const data = await getContinentLeaderboard(continent, LIST_SIZE);
      const path = `/leaderboard?continent=${encodeURIComponent(continent)}`;
      if (!data) return notFoundPage(res, path);
      const html = await renderPage({
        title: `Best speedcubers in ${data.continentName} | WPS Ranking`,
        description: `The top ${data.items.length} all-around speedcubers in ${data.continentName} by WPS, from official WCA world ranks in ${EVENT_COUNT} events.`,
        path,
        bodyHtml: `<main><h1>${escapeHtml(data.continentName)} leaderboard</h1>${cuberList(data.items, (i) => data.items[i].continentRank)}${nav}</main>`,
      });
      return sendHtml(res, html);
    }

    const data = await getGlobalLeaderboard(LIST_SIZE);
    if (!data) return notFoundPage(res, '/leaderboard');
    const continents = CONTINENTS_LIST.map((c) => link(`/leaderboard?continent=${c.code}`, c.name)).join(' · ');
    const html = await renderPage({
      title: 'Best all-around speedcubers in the world | WPS Ranking',
      description: `The top ${LIST_SIZE} all-around speedcubers in the world by WPS, one score from official WCA world ranks in ${EVENT_COUNT} events. ${fmtInt(
        data.totalRanked ?? 0,
      )} cubers ranked.`,
      path: '/leaderboard',
      bodyHtml: `<main><h1>World leaderboard</h1><p>By continent: ${continents}</p>${cuberList(data.items, (i) => data.items[i].rank)}${nav}</main>`,
    });
    sendHtml(res, html);
  }),
);

router.get(
  '/countries',
  asyncRoute(async (_req: Request, res: Response) => {
    const data = await getCountryRanking();
    if (!data) return notFoundPage(res, '/countries');
    const rows = data.items
      .map(
        (c) =>
          `<li>#${c.rank} ${link(`/leaderboard?country=${c.iso2}`, c.name)}: ${c.teamScore.toFixed(2)}${
            c.best ? `, best cuber ${link(`/profile/${c.best.personId}`, c.best.name)}` : ''
          }</li>`,
      )
      .join('');
    const top = data.items
      .slice(0, 3)
      .map((c) => c.name)
      .join(', ');
    const html = await renderPage({
      title: 'Speedcubing country ranking | WPS Ranking',
      description: `Countries ranked by the average WPS of their ${data.teamSize} best speedcubers. Top 3: ${top}.`,
      path: '/countries',
      bodyHtml: `<main><h1>Country ranking</h1><p>A country's score is the average WPS of its ${data.teamSize} best cubers.</p><ol>${rows}</ol>${nav}</main>`,
    });
    sendHtml(res, html);
  }),
);

// --- Sitemaps and robots.txt -----------------------------------------------

async function lastmod(): Promise<string> {
  const meta = await getMetaValues(['generatedAt']);
  return (meta.generatedAt ?? new Date().toISOString()).slice(0, 10);
}

const urlEntry = (loc: string, date: string) => `<url><loc>${escapeHtml(loc)}</loc><lastmod>${date}</lastmod></url>`;

router.get(
  '/sitemap.xml',
  asyncRoute(async (_req: Request, res: Response) => {
    const site = getFrontendBaseUrl();
    const [ranked, date] = await Promise.all([prisma.leaderboardEntry.count(), lastmod()]);
    const files = ['pages', ...Array.from({ length: Math.ceil(ranked / PROFILES_PER_SITEMAP) }, (_, i) => `profiles-${i + 1}`)];
    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files
        .map((f) => `<sitemap><loc>${site}/sitemaps/${f}.xml</loc><lastmod>${date}</lastmod></sitemap>`)
        .join('')}</sitemapindex>`,
    );
  }),
);

router.get(
  '/sitemaps/:file',
  asyncRoute(async (req: Request, res: Response) => {
    const site = getFrontendBaseUrl();
    const date = await lastmod();
    const file = req.params.file ?? '';

    if (file === 'pages.xml') {
      const countries = await prisma.country.findMany({ select: { iso2: true }, orderBy: { iso2: 'asc' } });
      const paths = [
        '/',
        '/leaderboard',
        '/countries',
        '/about',
        '/search',
        '/compare',
        '/legal',
        ...CONTINENTS_LIST.map((c) => `/leaderboard?continent=${c.code}`),
        ...countries.map((c) => `/leaderboard?country=${c.iso2}`),
      ];
      sendXml(
        res,
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
          .map((p) => urlEntry(`${site}${p}`, date))
          .join('')}</urlset>`,
      );
      return;
    }

    const match = /^profiles-(\d+)\.xml$/.exec(file);
    const page = match ? Number(match[1]) : 0;
    if (page < 1) {
      res.status(404).json({ error: 'Sitemap not found' });
      return;
    }
    const rows = await prisma.leaderboardEntry.findMany({
      select: { personId: true },
      orderBy: [{ globalRank: 'asc' }, { personId: 'asc' }],
      skip: (page - 1) * PROFILES_PER_SITEMAP,
      take: PROFILES_PER_SITEMAP,
    });
    if (rows.length === 0) {
      res.status(404).json({ error: 'Sitemap not found' });
      return;
    }
    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows
        .map((r) => urlEntry(`${site}/profile/${r.personId}`, date))
        .join('')}</urlset>`,
    );
  }),
);

router.get('/robots.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', SITEMAP_CACHE_CONTROL);
  res.send(`User-agent: *\nAllow: /\n\nSitemap: ${getFrontendBaseUrl()}/sitemap.xml\n`);
});

export { router as seoRoutes };
