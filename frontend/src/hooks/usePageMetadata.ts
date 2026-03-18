import { useEffect } from 'react';

type PageMetadata = {
  title: string;
  description: string;
  canonicalPath?: string;
};

const DEFAULT_TITLE = 'WPS Ranking - Global Speedcubing Leaderboard';
const DEFAULT_DESCRIPTION =
  'Weighted Performance Scale ranking system for speedcubers worldwide. Track performance across all WCA events.';

function upsertMeta(selector: string, create: () => HTMLMetaElement): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }

  const meta = create();
  document.head.appendChild(meta);
  return meta;
}

function upsertCanonical(): HTMLLinkElement {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (existing) {
    return existing;
  }

  const link = document.createElement('link');
  link.rel = 'canonical';
  document.head.appendChild(link);
  return link;
}

function getSiteOrigin(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  return window.location.origin.replace(/\/+$/, '');
}

export function usePageMetadata({ title, description, canonicalPath }: PageMetadata): void {
  useEffect(() => {
    const safeTitle = title?.trim() || DEFAULT_TITLE;
    const safeDescription = description?.trim() || DEFAULT_DESCRIPTION;
    const canonicalUrl = new URL(canonicalPath ?? window.location.pathname, `${getSiteOrigin()}/`).toString();

    document.title = safeTitle;

    const descriptionMeta = upsertMeta('meta[name="description"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'description';
      return meta;
    });
    descriptionMeta.content = safeDescription;

    const ogTitle = upsertMeta('meta[property="og:title"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      return meta;
    });
    ogTitle.content = safeTitle;

    const ogDescription = upsertMeta('meta[property="og:description"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      return meta;
    });
    ogDescription.content = safeDescription;

    const ogUrl = upsertMeta('meta[property="og:url"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      return meta;
    });
    ogUrl.content = canonicalUrl;

    const twitterTitle = upsertMeta('meta[name="twitter:title"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'twitter:title';
      return meta;
    });
    twitterTitle.content = safeTitle;

    const twitterDescription = upsertMeta('meta[name="twitter:description"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'twitter:description';
      return meta;
    });
    twitterDescription.content = safeDescription;

    const canonical = upsertCanonical();
    canonical.href = canonicalUrl;
  }, [canonicalPath, description, title]);
}
