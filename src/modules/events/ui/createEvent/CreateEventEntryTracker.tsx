'use client';

import { useEffect } from 'react';
import { trackEvent } from '@shared/lib/analytics';

type CreateEventEntryViewState =
  | 'activation_required'
  | 'dashboard_payment_pending'
  | 'dashboard_ready'
  | 'dashboard_in_progress';

type Props = {
  activated?: boolean;
  entryState: CreateEventEntryViewState;
  paymentMethodsReady?: boolean;
  activePaymentMethodCount?: number;
  hasDraft?: boolean;
  draftCount?: number;
  publishedEventCount?: number;
};

export default function CreateEventEntryTracker({
  activated = false,
  entryState,
  paymentMethodsReady,
  activePaymentMethodCount,
  hasDraft = false,
  draftCount = 0,
  publishedEventCount = 0,
}: Props) {
  useEffect(() => {
    trackEvent('create_event_entry_viewed', {
      channel: 'web',
      entry_state: entryState,
      activated,
      payment_methods_ready: paymentMethodsReady,
      active_payment_method_count: activePaymentMethodCount,
      has_draft: hasDraft,
      draft_count: draftCount,
      published_event_count: publishedEventCount,
    });
  }, [
    activated,
    activePaymentMethodCount,
    draftCount,
    entryState,
    hasDraft,
    paymentMethodsReady,
    publishedEventCount,
  ]);

  return null;
}
