import { Router, Request, Response } from 'express';
import React from 'react';
import { getProfileByPersonId } from '../services/profileFromCache';

const router = Router();
const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;
const ogImageCache = new Map<string, { buffer: Buffer; at: number }>();
const CACHE_MAX = 500;
const CACHE_TTL_MS = 60 * 60 * 1000;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

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

router.get('/profile/:personId', async (req: Request, res: Response) => {
  const personId = (req.params.personId ?? '').trim();
  if (!personId || !isValidWCAId(personId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }

  const cached = getCached(personId);
  if (cached) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', String(cached.length));
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.send(cached);
    return;
  }

  const profile = await getProfileByPersonId(personId);
  if (!profile) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }

  const rankText =
    profile.globalWpsRank != null && profile.globalWpsRank > 0 && profile.totalRanked > 0
      ? `Global Rank #${profile.globalWpsRank.toLocaleString()}`
      : 'Global rank unavailable';
  const countryText = profile.countryName ?? 'Country unavailable';
  const countryBadgeText =
    profile.countryIso2 && profile.countryIso2.length === 2 ? profile.countryIso2.toUpperCase() : countryText;
  const wpsText = profile.wps.toFixed(2);

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
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #0a0f1f 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: 56,
          color: '#f8fafc',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
              },
            },
            'W'
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: 26,
                  fontWeight: 700,
                },
              },
              'WPS Ranking'
            ),
            React.createElement(
              'div',
              {
                style: {
                  fontSize: 18,
                  color: '#94a3b8',
                },
              },
              'Shareable speedcubing profile card'
            )
          )
        ),
        React.createElement(
          'div',
          {
            style: {
              minWidth: 88,
              minHeight: 66,
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.3)',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 18px',
              fontSize: 18,
              fontWeight: 700,
              color: '#e2e8f0',
            },
          },
          countryBadgeText
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 900,
            },
          },
          profile.name
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 24,
              color: '#94a3b8',
            },
          },
          React.createElement('span', null, personId),
          React.createElement('span', null, '•'),
          React.createElement('span', null, countryText)
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'flex-end',
              gap: 18,
              marginTop: 8,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 84,
                fontWeight: 800,
                color: '#4ade80',
                lineHeight: 1,
              },
            },
            wpsText
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 26,
                color: '#cbd5e1',
                paddingBottom: 10,
              },
            },
            'WPS'
          )
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(148, 163, 184, 0.22)',
            paddingTop: 24,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 18,
                color: '#94a3b8',
              },
            },
            'Current all-around standing'
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 32,
                fontWeight: 700,
              },
            },
            rankText
          )
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: 18,
              color: '#94a3b8',
            },
          },
          'Weighted Performance Score'
        )
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
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.send(buffer);
  } catch (err) {
    console.error('OG image generation failed:', err);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

export { router as ogRoutes };
