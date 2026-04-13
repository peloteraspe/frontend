import { normalizeDateTimeLocalToLima } from '@shared/lib/dateTime';

export type EventPublishReadinessItemId =
  | 'details'
  | 'location'
  | 'payment_methods'
  | 'field_reservation';

export type EventPublishReadinessItem = {
  id: EventPublishReadinessItemId;
  title: string;
  description: string;
  done: boolean;
};

export type EventPublishReadinessInput = {
  title?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  district?: unknown;
  locationText?: unknown;
  lat?: unknown;
  lng?: unknown;
  paymentMethodIds?: number[] | null;
  paymentMethodCount?: number | null;
  isFieldReservedConfirmed?: boolean;
};

export type EventPublishReadiness = {
  isReady: boolean;
  items: EventPublishReadinessItem[];
  missingIds: EventPublishReadinessItemId[];
  primaryMessage: string | null;
};

export function parseStoredBoolean(value: unknown) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
}

function toTimestamp(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const normalized = normalizeDateTimeLocalToLima(raw) ?? raw;
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizePaymentMethodCount(input: EventPublishReadinessInput) {
  if (Array.isArray(input.paymentMethodIds)) {
    return Array.from(
      new Set(
        input.paymentMethodIds
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    ).length;
  }

  const parsed = Number(input.paymentMethodCount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function hasLocationCoordinates(lat: unknown, lng: unknown) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

export function getEventPublishReadiness(
  input: EventPublishReadinessInput
): EventPublishReadiness {
  const startTimestamp = toTimestamp(input.startTime);
  const endTimestamp = toTimestamp(input.endTime);

  const detailsReady = Boolean(
    String(input.title || '').trim() &&
      startTimestamp !== null &&
      endTimestamp !== null &&
      endTimestamp > startTimestamp
  );
  const locationReady = Boolean(
    String(input.locationText || '').trim() && hasLocationCoordinates(input.lat, input.lng)
  );
  const paymentMethodsReady = normalizePaymentMethodCount(input) > 0;
  const fieldReservationReady = Boolean(input.isFieldReservedConfirmed);

  const items: EventPublishReadinessItem[] = [
    {
      id: 'details',
      title: 'Datos principales listos',
      description: 'Título, fecha y horario válidos para publicar.',
      done: detailsReady,
    },
    {
      id: 'location',
      title: 'Ubicación lista',
      description: 'Cancha, dirección y pin listos para llegar.',
      done: locationReady,
    },
    {
      id: 'payment_methods',
      title: 'Método de pago activo elegido',
      description: 'Necesitas al menos uno activo para publicar.',
      done: paymentMethodsReady,
    },
    {
      id: 'field_reservation',
      title: 'Cancha reservada',
      description: 'Confirma la reserva antes de salir al público.',
      done: fieldReservationReady,
    },
  ];

  const missingIds = items.filter((item) => !item.done).map((item) => item.id);

  let primaryMessage: string | null = null;
  if (!detailsReady || !locationReady) {
    primaryMessage = 'Completa los datos principales del evento antes de publicarlo.';
  } else if (!fieldReservationReady) {
    primaryMessage = 'Confirma que la cancha ya está reservada antes de publicar el evento.';
  } else if (!paymentMethodsReady) {
    primaryMessage = 'Agrega al menos un método de pago activo antes de publicar el evento.';
  }

  return {
    isReady: missingIds.length === 0,
    items,
    missingIds,
    primaryMessage,
  };
}
