type AnalyticsEventProperties = Record<string, string | number | boolean | null | undefined>;
export const posthogEnabled = false;
export const posthogOptions = {};

export function captureEvent(_eventName: string, _properties?: AnalyticsEventProperties) {
  return;
}
