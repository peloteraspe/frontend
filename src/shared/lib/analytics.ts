'use client';

type AnalyticsPayload = Record<string, unknown>;
const ANALYTICS_ENDPOINT = '/api/analytics/events';

function canUseWindow() {
  return typeof window !== 'undefined';
}

function sendAnalytics(eventPayload: Record<string, unknown>) {
  if (!canUseWindow()) return;

  const body = JSON.stringify(eventPayload);

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      const queued = navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
      if (queued) return;
    } catch {
      // fallback to fetch
    }
  }

  void fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body,
  }).catch(() => undefined);
}

export function trackEvent(eventName: string, payload: AnalyticsPayload = {}) {
  if (!canUseWindow() || !eventName) return;

  const eventPayload = {
    ...payload,
    event: eventName,
    event_name: eventName,
    sent_at: new Date().toISOString(),
  };

  const dataLayer = (window as any).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push(eventPayload);
  }

  window.dispatchEvent(
    new CustomEvent('peloteras:analytics', {
      detail: eventPayload,
    })
  );

  sendAnalytics(eventPayload);
}
