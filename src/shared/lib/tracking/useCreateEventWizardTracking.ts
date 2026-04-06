'use client';

import { useRef, useEffect } from 'react';
import { trackEvent } from '@shared/lib/analytics';

type WizardStep = 'basic_info' | 'location' | 'details' | 'publish';

type CreateEventWizardTracking = {
  trackStepEntered: (step: WizardStep) => void;
  trackStepCompleted: (step: WizardStep, duration: number) => void;
  trackStepAbandoned: (step: WizardStep, duration: number, reason?: string) => void;
  trackFieldFilled: (field: string, value?: unknown) => void;
  trackValidationError: (field: string, error: string) => void;
  trackAutoSaved: (fieldsChanged: string[]) => void;
};

export function useCreateEventWizardTracking(eventId?: string | number): CreateEventWizardTracking {
  const stepStartTimeRef = useRef<Record<WizardStep, number>>({
    basic_info: Date.now(),
    location: 0,
    details: 0,
    publish: 0,
  });

  const trackStepEntered = (step: WizardStep) => {
    stepStartTimeRef.current[step] = Date.now();
    trackEvent('create_event_step_entered', {
      event_id: eventId,
      step,
      channel: 'web',
    });
  };

  const trackStepCompleted = (step: WizardStep, duration: number) => {
    trackEvent('create_event_step_completed', {
      event_id: eventId,
      step,
      duration_ms: duration,
      duration_s: Math.round(duration / 1000),
      channel: 'web',
    });
  };

  const trackStepAbandoned = (step: WizardStep, duration: number, reason?: string) => {
    trackEvent('create_event_step_abandoned', {
      event_id: eventId,
      step,
      duration_ms: duration,
      duration_s: Math.round(duration / 1000),
      reason,
      channel: 'web',
    });
  };

  const trackFieldFilled = (field: string, value?: unknown) => {
    trackEvent('create_event_field_filled', {
      event_id: eventId,
      field,
      value_type: typeof value,
      channel: 'web',
    });
  };

  const trackValidationError = (field: string, error: string) => {
    trackEvent('create_event_validation_error', {
      event_id: eventId,
      field,
      error,
      channel: 'web',
    });
  };

  const trackAutoSaved = (fieldsChanged: string[]) => {
    trackEvent('create_event_auto_saved', {
      event_id: eventId,
      fields_changed_count: fieldsChanged.length,
      fields: fieldsChanged,
      channel: 'web',
    });
  };

  return {
    trackStepEntered,
    trackStepCompleted,
    trackStepAbandoned,
    trackFieldFilled,
    trackValidationError,
    trackAutoSaved,
  };
}
