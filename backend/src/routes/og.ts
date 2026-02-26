import { Router, Request, Response } from 'express';
import React from 'react';
import { getProfileByPersonId } from '../services/profileFromCache';

const router = Router();
const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

/** In-memory cache: personId -> PNG buffer. Max 500 entries, 1h TTL. */
const ogImageCache = new Map<string, { buffer: Buffer; at: number }>();
const CACHE_MAX = 500;
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCached(personId: string): Buffer | null {
  const entry = ogImageCache.get(personId);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    ogImageCache.delete(personId);
    return null;
  }
  return entry.buffer;
}

function setCached(personId: string, buffer: Buffer): void {
  if (ogImageCache.size >= CACHE_MAX) {
    const first = ogImageCache.keys().next().value;
    if (first) ogImageCache.delete(first);
  }
  ogImageCache.set(personId, { buffer, at: Date.now() });
}

/**
 * GET /api/og/profile/:personId
 * Returns 1200x630 PNG for Open Graph preview (Telegram, Discord, etc.).
 */
router.get('/profile/:personId', async (req: Request, res: Response) => {
  const personId = (req.params.personId ?? '').trim();
  if (!personId || !isValidWCAId(personId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }

  const cached = getCached(personId);
  if (cached) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.send(cached);
    return;
  }

  const profile = getProfileByPersonId(personId);
  if (!profile) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }

  const rankText =
    profile.globalWpsRank != null && profile.globalWpsRank > 0 && profile.totalRanked > 0
      ? `#${profile.globalWpsRank.toLocaleString()} of ${profile.totalRanked.toLocaleString()}`
      : '—';
  const wpsText = profile.wps.toFixed(2);
  const flagUrl =
    profile.countryIso2 && profile.countryIso2.length === 2
      ? `https://flagcdn.com/w160/${profile.countryIso2.toLowerCase()}.png`
      : null;

  try {
    const { ImageResponse } = await import('@vercel/og');
    const element = React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          fontFamily: 'system-ui, sans-serif',
          padding: 48,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 24,
          },
        },
        flagUrl
          ? React.createElement('img', {
              src: flagUrl,
              width: 80,
              height: 60,
              style: { borderRadius: 8 },
            })
          : null,
        React.createElement(
          'span',
          {
            style: {
              fontSize: 48,
              fontWeight: 700,
              color: '#f8fafc',
              maxWidth: 800,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          profile.name
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            fontSize: 56,
            fontWeight: 700,
            color: '#4ade80',
            marginBottom: 12,
          },
        },
        `WPS ${wpsText}`
      ),
      React.createElement(
        'div',
        {
          style: {
            fontSize: 32,
            color: '#94a3b8',
          },
        },
        rankText
      ),
      React.createElement(
        'div',
        {
          style: {
            fontSize: 22,
            color: '#64748b',
            marginTop: 24,
          },
        },
        'World Performance Score — WPS Ranking'
      )
    );

    const imageResponse = new ImageResponse(element, {
      width: 1200,
      height: 630,
    });
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    setCached(personId, buffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.send(buffer);
  } catch (err) {
    console.error('OG image generation failed:', err);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

export { router as ogRoutes };
