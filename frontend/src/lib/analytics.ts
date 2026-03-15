import posthog from 'posthog-js';

type AnalyticsEventProperties = Record<string, string | number | boolean | null | undefined>;

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim();

export const posthogEnabled = Boolean(posthogKey);

export const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  autocapture: false,
  capture_pageview: false,
};

export function captureEvent(eventName: string, properties?: AnalyticsEventProperties) {
  if (!posthogEnabled) return;
  posthog.capture(eventName, properties);
}
