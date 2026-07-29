'use client';

import { useEffect, useSyncExternalStore } from 'react';

export const TEAM_INVITATIONS_CHANGED_EVENT = 'peloteras:team-invitations-changed';

let currentCount = 0;
let requestInFlight: Promise<void> | null = null;
let refreshQueued = false;
const subscribers = new Set<() => void>();

function publish() {
  subscribers.forEach((subscriber) => subscriber());
}

async function loadCount() {
  if (requestInFlight) return requestInFlight;

  requestInFlight = (async () => {
    try {
      const response = await fetch('/api/team-invitations/pending-count', {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { count?: number };
      const nextCount = Math.max(0, Number(payload.count) || 0);
      if (nextCount !== currentCount) {
        currentCount = nextCount;
        publish();
      }
    } catch {
      // The navigation remains usable if the non-critical badge request fails.
    } finally {
      requestInFlight = null;
      if (refreshQueued) {
        refreshQueued = false;
        void loadCount();
      }
    }
  })();

  return requestInFlight;
}

function refreshCount() {
  if (requestInFlight) {
    refreshQueued = true;
    return;
  }

  void loadCount();
}

function subscribe(callback: () => void) {
  subscribers.add(callback);

  if (subscribers.size === 1) {
    window.addEventListener(TEAM_INVITATIONS_CHANGED_EVENT, refreshCount);
    window.addEventListener('focus', refreshCount);
  }

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      window.removeEventListener(TEAM_INVITATIONS_CHANGED_EVENT, refreshCount);
      window.removeEventListener('focus', refreshCount);
    }
  };
}

function getSnapshot() {
  return currentCount;
}

function getServerSnapshot() {
  return 0;
}

export function notifyTeamInvitationsChanged() {
  window.dispatchEvent(new Event(TEAM_INVITATIONS_CHANGED_EVENT));
}

export function usePendingTeamInvitationCount(enabled: boolean) {
  const count = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (enabled) void loadCount();
  }, [enabled]);

  return enabled ? count : 0;
}
