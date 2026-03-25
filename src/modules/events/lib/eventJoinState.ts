type EventJoinStateInput = {
  isPastEvent: boolean;
  isPublished?: boolean;
  isSoldOut: boolean;
  isVersus: boolean;
  viewerHasApprovedRegistration?: boolean;
  viewerHasPendingRegistration?: boolean;
};

export const EVENT_ALREADY_APPROVED_REGISTRATION_MESSAGE = 'Tu pago ya fue aprobado para este evento.';
export const EVENT_ALREADY_APPROVED_REGISTRATION_LABEL = 'Pago aprobado';
export const EVENT_PENDING_REGISTRATION_MESSAGE =
  'Tu pago está pendiente de aprobación o rechazo para este evento.';
export const EVENT_PENDING_REGISTRATION_LABEL = 'Pago pendiente';

export function getEventJoinRestrictionMessage(
  input: Pick<EventJoinStateInput, 'viewerHasApprovedRegistration' | 'viewerHasPendingRegistration'>
) {
  if (input.viewerHasApprovedRegistration) return EVENT_ALREADY_APPROVED_REGISTRATION_MESSAGE;
  if (input.viewerHasPendingRegistration) return EVENT_PENDING_REGISTRATION_MESSAGE;
  return '';
}

export function isEventJoinDisabled(input: EventJoinStateInput) {
  return (
    input.isPastEvent ||
    input.isPublished === false ||
    input.isSoldOut ||
    input.viewerHasApprovedRegistration === true ||
    input.viewerHasPendingRegistration === true
  );
}

export function getEventJoinLabel(input: EventJoinStateInput) {
  if (input.isPastEvent) return 'Evento finalizado';
  if (input.viewerHasApprovedRegistration) return EVENT_ALREADY_APPROVED_REGISTRATION_LABEL;
  if (input.viewerHasPendingRegistration) return EVENT_PENDING_REGISTRATION_LABEL;
  if (input.isSoldOut) return 'Cupos completos';
  if (input.isPublished === false) return 'Próximamente';
  return input.isVersus ? 'Anotar a mi equipo' : 'Anotarme';
}
