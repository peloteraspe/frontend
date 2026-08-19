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
export const TEAM_ALREADY_APPROVED_REGISTRATION_MESSAGE =
  'La inscripción de tu equipo está confirmada para este partido.';
export const TEAM_PENDING_REGISTRATION_MESSAGE =
  'El pago de tu equipo está pendiente de revisión.';

export function getEventJoinRestrictionMessage(
  input: Pick<
    EventJoinStateInput,
    'isVersus' | 'viewerHasApprovedRegistration' | 'viewerHasPendingRegistration'
  >
) {
  if (input.viewerHasApprovedRegistration) {
    return input.isVersus
      ? TEAM_ALREADY_APPROVED_REGISTRATION_MESSAGE
      : EVENT_ALREADY_APPROVED_REGISTRATION_MESSAGE;
  }
  if (input.viewerHasPendingRegistration) {
    return input.isVersus
      ? TEAM_PENDING_REGISTRATION_MESSAGE
      : EVENT_PENDING_REGISTRATION_MESSAGE;
  }
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
  if (input.viewerHasApprovedRegistration) {
    return input.isVersus ? 'Equipo confirmado' : EVENT_ALREADY_APPROVED_REGISTRATION_LABEL;
  }
  if (input.viewerHasPendingRegistration) {
    return input.isVersus ? 'Pago del equipo en revisión' : EVENT_PENDING_REGISTRATION_LABEL;
  }
  if (input.isSoldOut) return input.isVersus ? 'Equipos completos' : 'Cupos completos';
  if (input.isPublished === false) return 'Próximamente';
  return input.isVersus ? 'Inscribir a mi equipo' : 'Anotarme';
}
