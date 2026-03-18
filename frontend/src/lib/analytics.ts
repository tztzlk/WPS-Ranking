type AnalyticsEventProperties = Record<string, string | number | boolean | null | undefined>;

export function captureEvent(_eventName: string, _properties?: AnalyticsEventProperties) {
  return;
}
