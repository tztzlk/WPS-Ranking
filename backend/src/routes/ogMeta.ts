import { Router, Request, Response, NextFunction } from 'express';
import { getProfileByPersonId } from '../services/profileFromCache';

const router = Router();
const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;
const DEFAULT_FRONTEND_URL = 'https://wps-ranking.vercel.app';

const CRAWLER_AGENTS = [
  'TelegramBot',
  'Discordbot',
  'Discord-Bot',
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'WhatsApp',
  'SkypeUriPreview',
  'Viber',
  'Pinterest',
];

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

function isCrawler(userAgent: string): boolean {
  const ua = userAgent || '';
  return CRAWLER_AGENTS.some((bot) => ua.includes(bot));
}

function getBackendBaseUrl(): string {
  const siteUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return siteUrl.replace(/\/$/, '');
}

function getFrontendBaseUrl(): string {
  const configured = process.env.FRONTEND_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .filter((origin) => !origin.includes('localhost'));

  return corsOrigins?.[0] ?? DEFAULT_FRONTEND_URL;
}

router.get('/profile/:personId', async (req: Request, res: Response, next: NextFunction) => {
  const personId = (req.params.personId ?? '').trim();
  if (!personId || !isValidWCAId(personId)) {
    next();
    return;
  }

  const frontendProfileUrl = `${getFrontendBaseUrl()}/profile/${personId}`;

  if (!isCrawler(req.get('User-Agent') || '')) {
    res.redirect(302, frontendProfileUrl);
    return;
  }

  const profile = await getProfileByPersonId(personId);
  if (!profile) {
    res.redirect(302, frontendProfileUrl);
    return;
  }

  const backendBaseUrl = getBackendBaseUrl();
  const shareUrl = `${backendBaseUrl}/profile/${personId}`;
  const imageUrl = `${backendBaseUrl}/api/og/profile/${personId}`;

  const rankText =
    profile.globalWpsRank != null && profile.globalWpsRank > 0 && profile.totalRanked > 0
      ? `Global Rank #${profile.globalWpsRank.toLocaleString()}`
      : 'Global rank unavailable';
  const countryText = profile.countryName ?? 'Country unavailable';
  const title = `${profile.name} - WPS ${profile.wps.toFixed(2)}`;
  const description = `${rankText} • ${countryText} • Weighted Performance Score profile`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <link rel="canonical" href="${escapeHtml(frontendProfileUrl)}">
  <title>${escapeHtml(title)}</title>
</head>
<body><p>${escapeHtml(description)}</p><a href="${escapeHtml(frontendProfileUrl)}">View profile</a></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { router as ogMetaRoutes };
