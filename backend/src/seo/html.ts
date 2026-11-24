/**
 * HTML for search engines and link previews.
 *
 * The site is a single-page app: its index.html has no page content, and the
 * text appears only after JavaScript runs. Crawlers that do not run JavaScript
 * (Bing, Yandex, Telegram, Discord) and Google's first pass would see an empty
 * page. For crawlers the frontend proxies selected URLs here (see
 * frontend/vercel.json); we return the real index.html with the page's title,
 * description and main content already in it. The app still starts as usual
 * and replaces that content when JavaScript runs.
 */
import { getFrontendBaseUrl } from '../lib/siteUrl';

const TEMPLATE_TTL_MS = 5 * 60 * 1000;
let template: { html: string; fetchedAt: number } | null = null;

const FALLBACK_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WPS Ranking</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

/** The frontend's current index.html, so the page loads the current JS files. */
async function getTemplate(): Promise<string> {
  if (template && Date.now() - template.fetchedAt < TEMPLATE_TTL_MS) return template.html;
  try {
    // A hanging frontend must not hang the crawler page: fall back after 5 s.
    const res = await fetch(`${getFrontendBaseUrl()}/index.html`, {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`index.html: ${res.status}`);
    const html = await res.text();
    if (!html.includes('<div id="root"></div>')) throw new Error('index.html has no empty #root');
    template = { html, fetchedAt: Date.now() };
    return html;
  } catch (error) {
    console.warn('[seo] using the fallback template:', (error as Error).message);
    return template?.html ?? FALLBACK_TEMPLATE;
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PageMeta {
  title: string;
  description: string;
  /** Path on the site, e.g. /profile/2017GARR05. */
  path: string;
  ogType?: 'website' | 'profile';
  imageUrl?: string;
  /** schema.org object, written as JSON-LD. */
  jsonLd?: Record<string, unknown>;
  /** Visible content placed inside #root. Must be escaped already. */
  bodyHtml: string;
}

/** Removes every tag matching `pattern` from the head. */
function stripTags(html: string, pattern: RegExp): string {
  return html.replace(pattern, '');
}

export async function renderPage(meta: PageMeta): Promise<string> {
  const url = `${getFrontendBaseUrl()}${meta.path}`;
  let html = await getTemplate();

  // Drop the template's generic tags, then add the page's own before </head>.
  html = stripTags(html, /\s*<title>[\s\S]*?<\/title>/i);
  html = stripTags(html, /\s*<meta\s+name="description"[^>]*>/gi);
  html = stripTags(html, /\s*<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>/gi);
  html = stripTags(html, /\s*<link\s+rel="canonical"[^>]*>/gi);

  // Pages without their own picture use the site's default preview image.
  const imageUrl = meta.imageUrl ?? `${getFrontendBaseUrl()}/og-image.png`;
  const image = imageUrl
    ? `
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
    : '';
  // "<" is escaped so a name can never close the script tag.
  const jsonLd = meta.jsonLd
    ? `
    <script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';
  const head = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="${meta.ogType ?? 'website'}" />
    <meta property="og:site_name" content="WPS Ranking" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />${image}${jsonLd}
  </head>`;
  // Function replacers: with a string, "$&", "$'" or "$`" inside a name would be
  // read as replacement patterns and splice parts of the template into the page.
  html = html.replace(/\s*<\/head>/i, () => head);

  return html.replace('<div id="root"></div>', () => `<div id="root">${meta.bodyHtml}</div>`);
}

export const fmtInt = (n: number) => n.toLocaleString('en-US');
