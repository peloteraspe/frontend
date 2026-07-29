'use client';

import { useEffect, useState } from 'react';
import type { TeamSummaryRow } from '@modules/teams/model/types';

export function useFeaturedTeam(enabled: boolean) {
  const [team, setTeam] = useState<TeamSummaryRow | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTeam(null);
      return;
    }
    const controller = new AbortController();
    fetch('/api/teams', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => {
        const membership = Array.isArray(body?.teams)
          ? body.teams.find((item: any) => item?.isFeatured === true)
          : null;
        setTeam(membership?.team ?? null);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setTeam(null);
      });
    return () => controller.abort();
  }, [enabled]);

  return team;
}
