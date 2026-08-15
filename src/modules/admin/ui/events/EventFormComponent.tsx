'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, GoogleMap, MarkerF } from '@react-google-maps/api';
import Input from '@src/core/ui/Input';
import { ButtonWrapper } from '@src/core/ui/Button';
import SelectComponent from '@core/ui/SelectComponent';
import { CatalogOption } from '@modules/events/model/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getEventPublishReadiness } from '@modules/admin/model/eventPublishReadiness';
import { trackEvent } from '@shared/lib/analytics';
import EventShareModal, { EventShareModalStatus } from '@modules/admin/ui/events/EventShareModal';
import EventAnnouncementForm from '@modules/admin/ui/events/EventAnnouncementForm';
import InlinePaymentMethodSetup, {
  getPaymentMethodDisplayName,
  type InlinePaymentMethodSummary,
} from '@modules/admin/ui/paymentMethods/InlinePaymentMethodSetup';
import { useGoogleMapsApi } from '@core/ui/Map/useGoogleMapsApi';
import {
  DistrictOption,
  extractDistrictOptionsFromAddressComponents,
  getPrimaryDistrictValue,
  LIMA_DEFAULT_CENTER,
  mergeDistrictOptions,
  normalizeDistrictKey,
  toFixedLatLng,
  toLatLngLiteral,
} from '@shared/lib/googleMaps';
import {
  DEFAULT_EVENT_TIMEZONE,
  formatTimeInTimeZoneWithMeridiem,
  getIsoDateInTimeZone,
  normalizeDateTimeLocalToLima,
  toDateTimeLocalInTimeZone,
} from '@shared/lib/dateTime';
import EventPreview from '@modules/admin/ui/events/EventPreview';
import EventSmartSuggestionsPanel from '@modules/admin/ui/events/EventSmartSuggestionsPanel';
import EventFormGuidance from '@modules/admin/ui/events/EventFormGuidance';
import EventTemplatesPanel from '@modules/admin/ui/events/EventTemplatesPanel';
import { getSuggestionsForEvent } from '@modules/admin/model/eventSmartSuggestions';
import { useCreateEventWizardTracking } from '@shared/lib/tracking/useCreateEventWizardTracking';
import { useEventTemplates } from '@shared/hooks/useEventTemplates';
import {
  normalizePaymentMethodIds,
  partitionPaymentMethodSelection,
} from '@shared/lib/paymentMethodSelection';
import UsersRichTextEditor from '@modules/admin/ui/users/UsersRichTextEditor';
import type { OrganizerOption } from '@modules/admin/model/organizers';
import { isVersusEventTypeName } from '@modules/events/lib/eventTypeRules';

type SubmitResult = {
  eventId?: string | number;
  error?: string;
};

type CreateStepId = 1 | 2 | 3 | 4;

type EventCreateDraftSnapshot = {
  version: 1;
  step: CreateStepId;
  fields: {
    title: string;
    description: string;
    descriptionHtml: string;
    minUsers: string;
    maxUsers: string;
    price: string;
    eventTypeId: string;
    levelId: string;
    isFeatured: boolean;
    teamCount?: string;
    teamPlayers?: string;
    teamSubstitutes?: string;
    teamRegistrationPriceMode?: 'per_player' | 'fixed_team';
    teamFixedPrice?: string;
  };
  state: {
    startTime: string;
    endTime: string;
    placeText: string;
    locationText: string;
    districtText: string;
    lat: number;
    lng: number;
    pinSelected: boolean;
    isPublished: boolean;
    isFieldReservedConfirmed: boolean;
    selectedFeatureIds: number[];
    selectedPaymentMethodIds: number[];
    organizerId: string | null;
  };
};

type Props = {
  initial?: Partial<{
    title: string;
    description: string;
    descriptionHtml: string;
    startTime: string;
    endTime: string;
    price: number;
    minUsers: number;
    maxUsers: number;
    district: string;
    placeText: string;
    locationText: string;
    lat: number;
    lng: number;
    eventTypeId: number;
    levelId: number;
    featureIds: number[];
    paymentMethodIds: number[];
    organizerId: string | null;
    isPublished: boolean;
    isFieldReservedConfirmed: boolean;
    isFeatured: boolean;
    allowsTeamRegistration: boolean;
    teamRegistrationMaxTeams: number | null;
    teamRegistrationMinPlayers: number | null;
    teamRegistrationMaxPlayers: number | null;
    teamRegistrationPriceMode: 'per_player' | 'fixed_team';
    teamRegistrationFixedPrice: number | null;
  }>;
  eventTypes: CatalogOption[];
  levels: CatalogOption[];
  features?: CatalogOption[];
  paymentMethods?: PaymentMethodOption[];
  organizerOptions?: OrganizerOption[];
  onSubmit: (form: FormData) => Promise<void | SubmitResult>;
  submitLabel: string;
  canManageFeatured?: boolean;
  successRedirectTo?: string;
  postEditAnnouncement?: {
    eventId: string;
    defaultSubject: string;
    defaultBody: string;
    recipientCount: number;
  };
};

const DEFAULT_LAT = LIMA_DEFAULT_CENTER.lat;
const DEFAULT_LNG = LIMA_DEFAULT_CENTER.lng;
const MIN_PENDING_MS = 450;
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};
const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: true,
};
const ADDRESS_BLUR_RESOLVE_DELAY_MS = 150;
const DEFAULT_EVENT_DURATION_MINUTES = 90;
const QUICK_DURATION_OPTIONS = [60, 90, 120, 150] as const;
const DEFAULT_EVENT_START_TIME = '19:00';
const FLOW_SURFACE_CLASS =
  'rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)] sm:p-6';
const FLOW_PANEL_CLASS = 'rounded-2xl border border-slate-200 bg-slate-50/85';
const FLOW_FIELD_CLASS = 'peloteras-form-control h-12';
function asFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function areNumberArraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function parseDateTimeInLima(value: string | null | undefined) {
  const normalized = normalizeDateTimeLocalToLima(value);
  if (!normalized) return null;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferDurationMinutes(
  startValue: string | null | undefined,
  endValue: string | null | undefined
) {
  const start = parseDateTimeInLima(startValue);
  const end = parseDateTimeInLima(endValue);
  if (!start || !end) return DEFAULT_EVENT_DURATION_MINUTES;

  const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return diffMinutes > 0 ? diffMinutes : DEFAULT_EVENT_DURATION_MINUTES;
}

function addMinutesToDateTimeLocal(value: string, minutes: number) {
  const baseDate = parseDateTimeInLima(value);
  if (!baseDate) return '';

  const nextDate = new Date(baseDate.getTime() + minutes * 60 * 1000);
  return toDateTimeLocalInTimeZone(nextDate, DEFAULT_EVENT_TIMEZONE);
}

function formatDurationLabel(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatScheduleDay(date: Date) {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: DEFAULT_EVENT_TIMEZONE,
  }).format(date);
}

function formatScheduleTime(date: Date) {
  return formatTimeInTimeZoneWithMeridiem(date, DEFAULT_EVENT_TIMEZONE)
    .replace(/^0/, '')
    .replace('a.m.', 'a. m.')
    .replace('p.m.', 'p. m.');
}

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseBooleanFormValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
}

function resolveFriendlyCreateErrorMessage(message: string) {
  const cleaned = String(message || '').trim();
  if (!cleaned) return 'Hubo un problema al crear el evento. Inténtalo otra vez.';

  if (
    /(place_text|schema cache|could not find|column of|does not exist|violates|duplicate key|network|fetch|timeout|failed to)/i.test(
      cleaned
    )
  ) {
    return 'Hubo un problema al crear el evento. Inténtalo otra vez.';
  }

  return cleaned;
}

function normalizeLocationLookupValue(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function readLocalDatePart(value: string | null | undefined) {
  return String(value || '').split('T')[0] || '';
}

function readLocalTimePart(value: string | null | undefined) {
  const raw = String(value || '');
  const timePart = raw.split('T')[1] || '';
  return timePart.slice(0, 5);
}

function combineLocalDateAndTime(datePart: string, timePart: string) {
  const safeDate = String(datePart || '').trim();
  const safeTime = String(timePart || '').trim();
  if (!safeDate || !safeTime) return '';
  return `${safeDate}T${safeTime}`;
}

type PaymentMethodOption = {
  id: number;
  name: string;
  type: string;
  number: number | null;
  isActive: boolean;
};

const EMPTY_CATALOG_OPTIONS: CatalogOption[] = [];
const EMPTY_PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [];
const EMPTY_ORGANIZER_OPTIONS: OrganizerOption[] = [];

function normalizePaymentMethodCatalog(methods: PaymentMethodOption[]) {
  return methods
    .map((method) => ({
      id: Number(method.id),
      name: String(method.name || '').trim(),
      type: String(method.type || '').trim(),
      number: method.number == null ? null : Number(method.number),
      isActive: method.isActive !== false,
    }))
    .filter((method) => Number.isInteger(method.id) && method.id > 0);
}

function mapInlinePaymentMethodsToCatalog(
  methods: InlinePaymentMethodSummary[]
): PaymentMethodOption[] {
  return methods
    .map((method) => ({
      id: Number(method.id),
      name: String(method.name || '').trim() || `Método #${method.id}`,
      type: String(method.type || '').trim(),
      number: method.number == null ? null : Number(method.number),
      isActive: method.is_active !== false,
    }))
    .filter((method) => Number.isInteger(method.id) && method.id > 0);
}

const CREATE_EVENT_STEPS: Array<{
  id: CreateStepId;
  label: string;
  title: string;
  description: string;
}> = [
  {
    id: 1,
    label: 'Paso 1',
    title: 'Formato y partido',
    description: 'Elige cómo se inscriben y define los datos principales.',
  },
  {
    id: 2,
    label: 'Paso 2',
    title: 'Ubicación',
    description: 'Elige la cancha y confirma el punto exacto.',
  },
  {
    id: 3,
    label: 'Paso 3',
    title: 'Inscripción y cobro',
    description: 'Configura el precio, el pago y los detalles adicionales.',
  },
  {
    id: 4,
    label: 'Paso 4',
    title: 'Revisar',
    description: 'Comprueba cómo quedará y decide si lo publicas o lo guardas.',
  },
];
const CREATE_EVENT_DRAFT_STORAGE_PREFIX = 'peloteras:create-event:draft:';
const AUTOSAVE_DELAY_MS = 500;

const EventForm = ({
  initial,
  eventTypes,
  levels,
  features = EMPTY_CATALOG_OPTIONS,
  paymentMethods = EMPTY_PAYMENT_METHOD_OPTIONS,
  organizerOptions = EMPTY_ORGANIZER_OPTIONS,
  onSubmit,
  submitLabel,
  canManageFeatured = false,
  successRedirectTo,
  postEditAnnouncement,
}: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const googleMapsApiKeyConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
  const formRef = useRef<HTMLFormElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveStorageKeyRef = useRef<string>('');
  const autosaveReadyRef = useRef(false);
  const hasTrackedWizardViewRef = useRef(false);
  const previousTrackedStepRef = useRef<CreateStepId | null>(null);
  const draftSubmitIntentRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [pendingMode, setPendingMode] = useState<'publish' | 'draft' | null>(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostEditAnnouncementModal, setShowPostEditAnnouncementModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState('');
  const { trackStepEntered, trackStepCompleted, trackFieldFilled, trackValidationError } =
    useCreateEventWizardTracking(createdEventId || undefined);
  const { templates: eventTemplates, loading: templatesLoading } = useEventTemplates(undefined);
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useGoogleMapsApi();
  const [isMapUnavailable, setIsMapUnavailable] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [eventTitle, setEventTitle] = useState(initial?.title ?? '');
  const [eventDescription, setEventDescription] = useState(initial?.description ?? '');
  const [eventDescriptionHtml, setEventDescriptionHtml] = useState(initial?.descriptionHtml ?? '');
  const [descriptionEditorResetKey, setDescriptionEditorResetKey] = useState(0);
  const [minUsersValue, setMinUsersValue] = useState(String(initial?.minUsers ?? 10));
  const [maxUsersValue, setMaxUsersValue] = useState(String(initial?.maxUsers ?? 20));
  const [priceValue, setPriceValue] = useState(String(initial?.price ?? 0));
  const [teamRegistrationPriceMode, setTeamRegistrationPriceMode] = useState<
    'per_player' | 'fixed_team'
  >(initial?.teamRegistrationPriceMode === 'fixed_team' ? 'fixed_team' : 'per_player');
  const [teamFixedPriceValue, setTeamFixedPriceValue] = useState(
    String(initial?.teamRegistrationFixedPrice ?? '')
  );
  const [teamCountValue, setTeamCountValue] = useState(
    String(Math.max(2, Number(initial?.teamRegistrationMaxTeams ?? 2)))
  );
  const [teamPlayersValue, setTeamPlayersValue] = useState(
    String(Math.max(1, Number(initial?.teamRegistrationMinPlayers ?? 7)))
  );
  const [teamSubstitutesValue, setTeamSubstitutesValue] = useState(() => {
    const minimum = Math.max(1, Number(initial?.teamRegistrationMinPlayers ?? 7));
    const maximum = Math.max(minimum, Number(initial?.teamRegistrationMaxPlayers ?? minimum));
    return String(maximum - minimum);
  });
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(() => {
    const initialId = Number(initial?.eventTypeId);
    if (eventTypes.some((option) => option.id === initialId)) return String(initialId);
    return submitLabel.trim().toLowerCase() === 'crear' ? '' : String(eventTypes[0]?.id ?? 1);
  });
  const [selectedLevelId, setSelectedLevelId] = useState(() => {
    const initialId = Number(initial?.levelId);
    if (levels.some((option) => option.id === initialId)) return String(initialId);
    return String(levels[0]?.id ?? 1);
  });
  const [isFeaturedValue, setIsFeaturedValue] = useState(Boolean(initial?.isFeatured));
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [preferredDurationMinutes, setPreferredDurationMinutes] = useState(() =>
    inferDurationMinutes(initial?.startTime, initial?.endTime)
  );
  const [showExactEndEditor, setShowExactEndEditor] = useState(() => {
    const initialDuration = inferDurationMinutes(initial?.startTime, initial?.endTime);
    return !QUICK_DURATION_OPTIONS.includes(
      initialDuration as (typeof QUICK_DURATION_OPTIONS)[number]
    );
  });
  const [placeText, setPlaceText] = useState(initial?.placeText ?? '');
  const [locationText, setLocationText] = useState(initial?.locationText ?? '');
  const [districtText, setDistrictText] = useState(() => String(initial?.district || '').trim());
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>(() => {
    const base = String(initial?.district || '').trim();
    if (!base) return [];
    return [
      { id: `initial:${normalizeDistrictKey(base)}`, type: 'manual', value: base, label: base },
    ];
  });
  const [lat, setLat] = useState(() => asFiniteNumber(initial?.lat, DEFAULT_LAT));
  const [lng, setLng] = useState(() => asFiniteNumber(initial?.lng, DEFAULT_LNG));
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>(() => {
    const input = Array.isArray(initial?.featureIds) ? initial.featureIds : [];
    return Array.from(
      new Set(
        input.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      )
    );
  });
  const [selectedPaymentMethodIds, setSelectedPaymentMethodIds] = useState<number[]>(() => {
    const input = Array.isArray(initial?.paymentMethodIds) ? initial.paymentMethodIds : [];
    return Array.from(
      new Set(
        input.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      )
    );
  });
  const [selectedOrganizerId, setSelectedOrganizerId] = useState(() => {
    const initialId = String(initial?.organizerId || '').trim();
    return organizerOptions.some((option) => option.id === initialId) ? initialId : '';
  });
  const [paymentMethodCatalog, setPaymentMethodCatalog] = useState<PaymentMethodOption[]>(() =>
    normalizePaymentMethodCatalog(paymentMethods)
  );
  const [paymentMethodsError, setPaymentMethodsError] = useState('');
  const [fieldReservedError, setFieldReservedError] = useState('');
  const [isPublished, setIsPublished] = useState(Boolean(initial?.isPublished ?? true));
  const [isFieldReservedConfirmed, setIsFieldReservedConfirmed] = useState(
    Boolean(initial?.isFieldReservedConfirmed)
  );
  const [pinSelected, setPinSelected] = useState(
    () => Number.isFinite(Number(initial?.lat)) && Number.isFinite(Number(initial?.lng))
  );
  const [geoError, setGeoError] = useState('');
  const [createStep, setCreateStep] = useState<CreateStepId>(1);
  const [wizardError, setWizardError] = useState('');
  const [autosaveMessage, setAutosaveMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const latRef = useRef(asFiniteNumber(initial?.lat, DEFAULT_LAT));
  const lngRef = useRef(asFiniteNumber(initial?.lng, DEFAULT_LNG));
  const pinSelectedRef = useRef(
    Number.isFinite(Number(initial?.lat)) && Number.isFinite(Number(initial?.lng))
  );
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const addressAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const resolvedAddressTextRef = useRef(
    Number.isFinite(Number(initial?.lat)) && Number.isFinite(Number(initial?.lng))
      ? normalizeLocationLookupValue(initial?.locationText)
      : ''
  );
  const pendingAutocompleteAddressRef = useRef('');
  const skipNextAddressBlurResolveRef = useRef(false);
  const addressBlurResolveTimerRef = useRef<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const startDateValue = useMemo(() => readLocalDatePart(startTime), [startTime]);
  const startClockValue = useMemo(() => readLocalTimePart(startTime), [startTime]);
  const todayInLima = useMemo(
    () => getIsoDateInTimeZone(new Date(), DEFAULT_EVENT_TIMEZONE) || '',
    []
  );
  const timeError = useMemo(() => {
    if (!startTime || !endTime) return '';
    const start = parseDateTimeInLima(startTime);
    const end = parseDateTimeInLima(endTime);
    if (!start || !end) return 'Formato de fecha/hora inválido.';
    if (end.getTime() <= start.getTime())
      return 'La fecha y hora de fin debe ser posterior al inicio.';
    return '';
  }, [startTime, endTime]);
  function syncLocationCoordinates(nextLat: number, nextLng: number) {
    latRef.current = nextLat;
    lngRef.current = nextLng;
    setLat(nextLat);
    setLng(nextLng);
  }

  function syncPinSelected(nextValue: boolean) {
    pinSelectedRef.current = nextValue;
    setPinSelected(nextValue);
  }

  function resolveLocationSelectionError(next?: {
    pinSelected?: boolean;
    lat?: number;
    lng?: number;
  }) {
    const nextPinSelected = next?.pinSelected ?? pinSelectedRef.current;
    const nextLat = next?.lat ?? latRef.current;
    const nextLng = next?.lng ?? lngRef.current;

    if (!nextPinSelected || !Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      if (!googleMapsApiKeyConfigured) {
        return 'Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_KEY para seleccionar ubicacion.';
      }
      return 'Selecciona un punto en el mapa.';
    }

    return '';
  }

  const schedulePreview = useMemo(() => {
    const start = parseDateTimeInLima(startTime);
    const end = parseDateTimeInLima(endTime);
    const hasValidRange = Boolean(start && end && end.getTime() > start.getTime());

    return {
      start,
      end,
      hasValidRange,
      spansMultipleDays:
        Boolean(start && end) &&
        readLocalDatePart(toDateTimeLocalInTimeZone(start)) !==
          readLocalDatePart(toDateTimeLocalInTimeZone(end)),
      dayLabel: start ? capitalizeFirst(formatScheduleDay(start)) : '',
      startLabel: start ? formatScheduleTime(start) : '',
      endLabel: end ? formatScheduleTime(end) : '',
      durationLabel:
        hasValidRange && start && end
          ? formatDurationLabel(Math.round((end.getTime() - start.getTime()) / 60000))
          : '',
    };
  }, [endTime, startTime]);

  const startDateTime = useMemo(
    () =>
      schedulePreview.start ? `${schedulePreview.dayLabel} · ${schedulePreview.startLabel}` : '',
    [schedulePreview.dayLabel, schedulePreview.startLabel, schedulePreview.start]
  );

  const smartSuggestions = useMemo(() => {
    const suggestionEventType = eventTypes.find(
      (option) => String(option.id) === selectedEventTypeId
    );
    const isTeamFormat = isVersusEventTypeName(suggestionEventType?.name);
    const suggestedTeamCount = Math.max(2, Number(teamCountValue) || 2);
    const suggestedRosterSize =
      Math.max(1, Number(teamPlayersValue) || 1) +
      Math.max(0, Number(teamSubstitutesValue) || 0);
    const suggestedPrice =
      isTeamFormat && teamRegistrationPriceMode === 'fixed_team'
        ? Number(teamFixedPriceValue)
        : Number(priceValue);

    return getSuggestionsForEvent({
      district: districtText,
      startTime,
      price: suggestedPrice || undefined,
      maxUsers: isTeamFormat
        ? suggestedTeamCount * suggestedRosterSize
        : Number(maxUsersValue) || undefined,
      title: eventTitle || undefined,
    });
  }, [
    districtText,
    eventTitle,
    eventTypes,
    maxUsersValue,
    priceValue,
    selectedEventTypeId,
    startTime,
    teamCountValue,
    teamFixedPriceValue,
    teamPlayersValue,
    teamRegistrationPriceMode,
    teamSubstitutesValue,
  ]);

  const selectedEventType = useMemo(
    () => eventTypes.find((option) => String(option.id) === selectedEventTypeId),
    [eventTypes, selectedEventTypeId]
  );
  const isVersusSelected = isVersusEventTypeName(selectedEventType?.name);
  const teamCount = Math.max(2, Number(teamCountValue) || 2);
  const teamPlayers = Math.max(1, Number(teamPlayersValue) || 1);
  const teamSubstitutes = Math.max(0, Number(teamSubstitutesValue) || 0);
  const teamRosterMax = teamPlayers + teamSubstitutes;
  const selectedLevel = useMemo(
    () => levels.find((option) => String(option.id) === selectedLevelId),
    [levels, selectedLevelId]
  );
  const levelSelectOptions = useMemo(
    () => levels.map((option) => ({ value: String(option.id), label: option.name })),
    [levels]
  );

  const featureOptions = useMemo(
    () => features.map((option) => ({ value: option.id, label: option.name })),
    [features]
  );
  const activePaymentMethodCatalog = useMemo(
    () => paymentMethodCatalog.filter((method) => method.isActive),
    [paymentMethodCatalog]
  );
  const paymentMethodSelection = useMemo(
    () => partitionPaymentMethodSelection(selectedPaymentMethodIds, paymentMethodCatalog),
    [paymentMethodCatalog, selectedPaymentMethodIds]
  );
  const selectedVisiblePaymentMethodIds = paymentMethodSelection.selectedVisibleIds;
  const selectedActivePaymentMethodIds = paymentMethodSelection.selectedActiveIds;
  const selectedInactivePaymentMethodIds = paymentMethodSelection.selectedInactiveIds;
  const paymentMethodOptions = useMemo(
    () =>
      paymentMethodCatalog.map((option) => {
        const numberText = option.number ? ` · ${option.number}` : '';
        const stateText = option.isActive ? '' : ' (Inactivo)';
        return {
          value: option.id,
          label: `${getPaymentMethodDisplayName(option)}${numberText}${stateText}`,
        };
      }),
    [paymentMethodCatalog]
  );
  const organizerSelectOptions = useMemo(
    () =>
      organizerOptions.map((option) => {
        const statusText = option.status ? ` · ${option.status}` : '';
        const zoneText = option.zone ? ` · ${option.zone}` : '';
        return {
          value: option.id,
          label: `${option.displayName}${statusText}${zoneText}`,
        };
      }),
    [organizerOptions]
  );
  const isCreateMode = useMemo(() => submitLabel.trim().toLowerCase() === 'crear', [submitLabel]);
  const activeCreateStep = CREATE_EVENT_STEPS[createStep - 1];
  const detailsStepVisibilityKey = isCreateMode
    ? `details-step-${createStep === 3 ? 'visible' : 'hidden'}`
    : 'details-step-edit';
  const resolvedSubmitLabel = useMemo(() => {
    if (isCreateMode) {
      return isPublished ? 'Crear y publicar' : 'Guardar borrador';
    }
    return isPublished ? 'Guardar y publicar' : 'Guardar borrador';
  }, [isCreateMode, isPublished]);
  const pendingLabel = useMemo(() => {
    if (pendingMode === 'draft') return 'Guardando borrador...';
    if (pendingMode === 'publish') return isCreateMode ? 'Creando evento...' : 'Guardando...';
    if (isCreateMode) {
      return isPublished ? 'Creando evento...' : 'Guardando borrador...';
    }
    return isPublished ? 'Guardando...' : 'Guardando borrador...';
  }, [isCreateMode, isPublished, pendingMode]);
  const modalRedirectTo = successRedirectTo || '/admin/events';
  const currentPathWithSearch = useMemo(() => {
    const query = searchParams?.toString() || '';
    if (!pathname) return query ? `/admin/events/new?${query}` : '/admin/events/new';
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const paymentMethodsHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('returnTo', currentPathWithSearch);
    return `/admin/payment-methods?${params.toString()}`;
  }, [currentPathWithSearch]);
  const publishReadiness = useMemo(
    () =>
      getEventPublishReadiness({
        title: eventTitle,
        startTime,
        endTime,
        district: districtText,
        locationText,
        lat: pinSelected ? lat : null,
        lng: pinSelected ? lng : null,
        paymentMethodIds: selectedActivePaymentMethodIds,
        isFieldReservedConfirmed,
      }),
    [
      districtText,
      endTime,
      eventTitle,
      isFieldReservedConfirmed,
      lat,
      lng,
      locationText,
      pinSelected,
      selectedActivePaymentMethodIds,
      startTime,
    ]
  );
  const publishMissingCount = useMemo(() => publishReadiness.missingIds.length, [publishReadiness]);
  const createProgressPercent = Math.round((createStep / CREATE_EVENT_STEPS.length) * 100);
  const publishMissingItems = useMemo(
    () => publishReadiness.items.filter((item) => !item.done),
    [publishReadiness]
  );
  const canUseInteractiveMap = Boolean(
    googleMapsApiKeyConfigured &&
      isGoogleMapsLoaded &&
      !googleMapsLoadError &&
      !isMapUnavailable
  );

  useEffect(() => {
    setPaymentMethodCatalog(normalizePaymentMethodCatalog(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    setSelectedPaymentMethodIds((current) => {
      const nextSelection = partitionPaymentMethodSelection(current, paymentMethodCatalog);
      return areNumberArraysEqual(current, nextSelection.selectedVisibleIds)
        ? current
        : nextSelection.selectedVisibleIds;
    });
  }, [paymentMethodCatalog]);

  useEffect(() => {
    if (eventTypes.some((option) => String(option.id) === selectedEventTypeId)) return;
    if (isCreateMode) {
      setSelectedEventTypeId('');
      return;
    }
    setSelectedEventTypeId(String(eventTypes[0]?.id ?? 1));
  }, [eventTypes, isCreateMode, selectedEventTypeId]);

  useEffect(() => {
    if (levels.some((option) => String(option.id) === selectedLevelId)) return;
    setSelectedLevelId(String(levels[0]?.id ?? 1));
  }, [levels, selectedLevelId]);

  useEffect(() => {
    if (!schedulePreview.hasValidRange || !schedulePreview.start || !schedulePreview.end) return;
    const nextDuration = Math.round(
      (schedulePreview.end.getTime() - schedulePreview.start.getTime()) / 60000
    );
    if (nextDuration > 0) {
      setPreferredDurationMinutes(nextDuration);
    }
  }, [schedulePreview.end, schedulePreview.hasValidRange, schedulePreview.start]);

  const locationError = useMemo(
    () => resolveLocationSelectionError({ pinSelected, lat, lng }),
    [googleMapsApiKeyConfigured, lat, lng, pinSelected]
  );

  useEffect(() => {
    if (googleMapsLoadError || !googleMapsApiKeyConfigured) {
      setIsMapUnavailable(true);
    }
  }, [googleMapsApiKeyConfigured, googleMapsLoadError]);

  useEffect(() => {
    const input = addressInputRef.current;
    if (!input || !canUseInteractiveMap || typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(() => {
      if (!input.disabled) return;
      setIsMapUnavailable(true);
      setGeoError('El mapa no está disponible. Conservaremos la dirección escrita.');
    });

    observer.observe(input, {
      attributes: true,
      attributeFilter: ['disabled'],
    });

    return () => observer.disconnect();
  }, [canUseInteractiveMap]);

  useEffect(() => {
    if (!isCreateMode) return;
    setWizardError('');
  }, [createStep, isCreateMode]);

  useEffect(() => {
    return () => {
      if (addressBlurResolveTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(addressBlurResolveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isCreateMode || previousTrackedStepRef.current === createStep) return;
    previousTrackedStepRef.current = createStep;
    trackStepEntered(
      (createStep === 1
        ? 'basic_info'
        : createStep === 2
          ? 'location'
          : createStep === 3
            ? 'details'
            : 'publish') as any
    );
  }, [createStep, isCreateMode, trackStepEntered]);

  function getDraftStorageKey() {
    if (autosaveStorageKeyRef.current) return autosaveStorageKeyRef.current;
    if (typeof window === 'undefined') return '';

    autosaveStorageKeyRef.current = `${CREATE_EVENT_DRAFT_STORAGE_PREFIX}${currentPathWithSearch}`;
    return autosaveStorageKeyRef.current;
  }

  function readTextField(name: string) {
    const form = formRef.current;
    if (!form) return '';
    const field = form.elements.namedItem(name);
    if (!field) return '';

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      return field.value;
    }

    return '';
  }

  function applySuggestedEndTime(durationMinutes: number) {
    setPreferredDurationMinutes(durationMinutes);
    setShowExactEndEditor(false);
    if (!startTime) return;
    const nextEndTime = addMinutesToDateTimeLocal(startTime, durationMinutes);
    if (!nextEndTime) return;
    setEndTime(nextEndTime);
  }

  function syncScheduleStart(nextDatePart: string, nextTimePart: string) {
    const resolvedDatePart = nextDatePart || startDateValue || todayInLima;
    const resolvedTimePart = nextTimePart || startClockValue || DEFAULT_EVENT_START_TIME;
    const nextStartTime = combineLocalDateAndTime(resolvedDatePart, resolvedTimePart);
    if (!nextStartTime) return;

    setStartTime(nextStartTime);

    const nextEndTime = addMinutesToDateTimeLocal(nextStartTime, preferredDurationMinutes);
    if (nextEndTime) {
      setEndTime(nextEndTime);
    }
  }

  function buildCreateDraftSnapshot(): EventCreateDraftSnapshot | null {
    if (!isCreateMode || !formRef.current) return null;

    return {
      version: 1,
      step: createStep,
      fields: {
        title: eventTitle,
        description: eventDescription,
        descriptionHtml: eventDescriptionHtml,
        minUsers: minUsersValue,
        maxUsers: maxUsersValue,
        price: priceValue,
        eventTypeId: selectedEventTypeId,
        levelId: selectedLevelId,
        isFeatured: isFeaturedValue,
        teamCount: teamCountValue,
        teamPlayers: teamPlayersValue,
        teamSubstitutes: teamSubstitutesValue,
        teamRegistrationPriceMode,
        teamFixedPrice: teamFixedPriceValue,
      },
      state: {
        startTime,
        endTime,
        placeText,
        locationText,
        districtText,
        lat,
        lng,
        pinSelected,
        isPublished,
        isFieldReservedConfirmed,
        selectedFeatureIds,
        selectedPaymentMethodIds,
        organizerId: selectedOrganizerId || null,
      },
    };
  }

  function clearAutosave() {
    if (typeof window === 'undefined') return;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const storageKey = getDraftStorageKey();
    if (!storageKey) return;
    window.localStorage.removeItem(storageKey);
    setAutosaveMessage('');
  }

  function clearAllCreateDraftAutosaves() {
    if (typeof window === 'undefined') return;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const storageKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(CREATE_EVENT_DRAFT_STORAGE_PREFIX)) {
        storageKeys.push(key);
      }
    }

    storageKeys.forEach((key) => window.localStorage.removeItem(key));
    autosaveStorageKeyRef.current = '';
    setAutosaveMessage('');
  }

  function persistCreateDraft() {
    const storageKey = getDraftStorageKey();
    if (!storageKey || typeof window === 'undefined') return;

    const snapshot = buildCreateDraftSnapshot();
    if (!snapshot) return;

    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    setAutosaveMessage('Guardado en este dispositivo.');
  }

  function scheduleAutosave() {
    if (!isCreateMode || !autosaveReadyRef.current || typeof window === 'undefined') return;

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      persistCreateDraft();
      autosaveTimerRef.current = null;
    }, AUTOSAVE_DELAY_MS);
  }

  function restoreCreateDraft(snapshot: EventCreateDraftSnapshot) {
    setCreateStep(snapshot.step);
    setEventTitle(snapshot.fields.title);
    setEventDescription(snapshot.fields.description);
    setEventDescriptionHtml(snapshot.fields.descriptionHtml || '');
    setDescriptionEditorResetKey((current) => current + 1);
    setMinUsersValue(snapshot.fields.minUsers);
    setMaxUsersValue(snapshot.fields.maxUsers);
    setPriceValue(snapshot.fields.price);
    setSelectedEventTypeId(snapshot.fields.eventTypeId);
    setSelectedLevelId(snapshot.fields.levelId);
    setIsFeaturedValue(snapshot.fields.isFeatured);
    setTeamCountValue(snapshot.fields.teamCount || '2');
    setTeamPlayersValue(snapshot.fields.teamPlayers || '7');
    setTeamSubstitutesValue(snapshot.fields.teamSubstitutes || '0');
    setTeamRegistrationPriceMode(snapshot.fields.teamRegistrationPriceMode || 'fixed_team');
    setTeamFixedPriceValue(snapshot.fields.teamFixedPrice || '');
    setStartTime(snapshot.state.startTime);
    setEndTime(snapshot.state.endTime);
    setPlaceText(snapshot.state.placeText);
    setLocationText(snapshot.state.locationText);
    setDistrictText(snapshot.state.districtText);
    if (snapshot.state.districtText) {
      syncDistrictSelection([], snapshot.state.districtText);
    }
    syncLocationCoordinates(
      asFiniteNumber(snapshot.state.lat, DEFAULT_LAT),
      asFiniteNumber(snapshot.state.lng, DEFAULT_LNG)
    );
    syncPinSelected(Boolean(snapshot.state.pinSelected));
    resolvedAddressTextRef.current = snapshot.state.pinSelected
      ? normalizeLocationLookupValue(snapshot.state.locationText)
      : '';
    setIsPublished(Boolean(snapshot.state.isPublished));
    setIsFieldReservedConfirmed(Boolean(snapshot.state.isFieldReservedConfirmed));
    setSelectedFeatureIds(snapshot.state.selectedFeatureIds);
    setSelectedPaymentMethodIds(snapshot.state.selectedPaymentMethodIds);
    setSelectedOrganizerId(snapshot.state.organizerId || '');
  }

  function handleResetCreateDraft() {
    setShowResetConfirm(true);
  }

  function confirmResetCreateDraft() {
    trackEvent('create_event_draft_reset', {
      channel: 'web',
      source: 'wizard',
    });
    setShowResetConfirm(false);
    clearAutosave();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  function syncDistrictSelection(nextDistrictOptions: DistrictOption[], fallbackValue = '') {
    if (nextDistrictOptions.length > 0) {
      setDistrictOptions((prev) => mergeDistrictOptions(prev, nextDistrictOptions));
      setDistrictText((prev) =>
        prev && nextDistrictOptions.some((option) => option.value === prev)
          ? prev
          : getPrimaryDistrictValue(nextDistrictOptions, fallbackValue)
      );
      return;
    }

    const fallback = String(fallbackValue || '').trim();
    if (!fallback) return;

    const fallbackOption: DistrictOption = {
      id: `manual:${normalizeDistrictKey(fallback)}`,
      type: 'manual',
      value: fallback,
      label: fallback,
    };

    setDistrictOptions((prev) => mergeDistrictOptions(prev, [fallbackOption]));
    setDistrictText((prev) => prev || fallbackOption.value);
  }

  function panMapToLocation(nextLat: number, nextLng: number, zoom = 14) {
    const map = mapRef.current;
    if (!map) return;

    map.panTo(toLatLngLiteral(nextLat, nextLng));
    const currentZoom = map.getZoom() ?? 0;
    if (currentZoom < zoom) {
      map.setZoom(zoom);
    }
  }

  function hasPendingAddressResolution(value = locationText) {
    const normalizedValue = normalizeLocationLookupValue(value);
    if (!normalizedValue) return false;
    return normalizedValue !== resolvedAddressTextRef.current;
  }

  function clearPendingAddressBlurResolve() {
    if (addressBlurResolveTimerRef.current === null || typeof window === 'undefined') return;
    window.clearTimeout(addressBlurResolveTimerRef.current);
    addressBlurResolveTimerRef.current = null;
  }

  function syncAddressInputValue(nextValue: string) {
    const input = addressInputRef.current;
    if (!input || input.value === nextValue) return;
    input.value = nextValue;
  }

  function markPendingAutocompleteAddress(nextValue: string) {
    const normalizedValue = normalizeLocationLookupValue(nextValue);
    pendingAutocompleteAddressRef.current = normalizedValue;

    if (!normalizedValue || typeof window === 'undefined') return;

    window.setTimeout(() => {
      if (pendingAutocompleteAddressRef.current === normalizedValue) {
        pendingAutocompleteAddressRef.current = '';
      }
    }, ADDRESS_BLUR_RESOLVE_DELAY_MS);
  }

  function setResolvedAddressValue(displayValue: string, comparisonValue?: string) {
    const nextDisplayValue = String(displayValue || '').trim();
    const nextComparisonValue =
      comparisonValue === undefined ? nextDisplayValue : String(comparisonValue || '').trim();

    setLocationText(nextDisplayValue);
    resolvedAddressTextRef.current = normalizeLocationLookupValue(nextComparisonValue);
  }

  function handleAddressAutocompleteLoad(autocomplete: google.maps.places.Autocomplete) {
    addressAutocompleteRef.current = autocomplete;
  }

  async function handleAddressPlaceChanged() {
    clearPendingAddressBlurResolve();

    const place = addressAutocompleteRef.current?.getPlace();
    const placeLocation = place?.geometry?.location;

    if (!place || !placeLocation) {
      setGeoError('Selecciona una dirección válida de las sugerencias.');
      return;
    }

    const nextCoords = toFixedLatLng(placeLocation.lat(), placeLocation.lng());
    const formattedAddress = String(
      place.formatted_address || addressInputRef.current?.value || place.name || ''
    ).trim();
    const nextDistrictOptions = extractDistrictOptionsFromAddressComponents(
      place.address_components,
      formattedAddress
    );

    skipNextAddressBlurResolveRef.current = true;
    if (formattedAddress) {
      markPendingAutocompleteAddress(formattedAddress);
      syncAddressInputValue(formattedAddress);
      setResolvedAddressValue(formattedAddress);
      syncDistrictSelection(nextDistrictOptions, districtText);
    }
    syncLocationCoordinates(nextCoords.lat, nextCoords.lng);
    syncPinSelected(true);
    setGeoError('');
    panMapToLocation(nextCoords.lat, nextCoords.lng);
  }

  async function geocodeAddressText(rawAddress: string, options?: { preserveInput?: boolean }) {
    clearPendingAddressBlurResolve();

    if (!canUseInteractiveMap || typeof google === 'undefined') {
      return Boolean(String(rawAddress || '').trim());
    }

    const nextAddress = String(rawAddress || '').trim();
    if (!nextAddress) {
      resolvedAddressTextRef.current = '';
      syncPinSelected(false);
      return false;
    }

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        address: nextAddress,
        componentRestrictions: { country: 'PE' },
        region: 'PE',
      });
      const result = response.results?.[0];
      const resultLocation = result?.geometry?.location;

      if (!result || !resultLocation) {
        setGeoError('No encontramos esa dirección. Ajusta el texto o selecciona una sugerencia.');
        syncPinSelected(false);
        return false;
      }

      const nextCoords = toFixedLatLng(resultLocation.lat(), resultLocation.lng());
      const nextDistrictOptions = extractDistrictOptionsFromAddressComponents(
        result.address_components,
        result.formatted_address
      );

      setResolvedAddressValue(
        options?.preserveInput
          ? nextAddress
          : String(result.formatted_address || nextAddress).trim(),
        nextAddress
      );
      syncAddressInputValue(
        options?.preserveInput
          ? nextAddress
          : String(result.formatted_address || nextAddress).trim()
      );
      syncDistrictSelection(nextDistrictOptions, districtText);
      syncLocationCoordinates(nextCoords.lat, nextCoords.lng);
      syncPinSelected(true);
      setGeoError('');
      panMapToLocation(nextCoords.lat, nextCoords.lng);
      return true;
    } catch {
      setGeoError(
        'No se pudo ubicar esa dirección. Selecciona una sugerencia o ajusta el pin manualmente.'
      );
      syncPinSelected(false);
      return false;
    }
  }

  async function reverseGeocodeDistrict(nextLat: number, nextLng: number) {
    if (!canUseInteractiveMap || typeof google === 'undefined') return;

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: toLatLngLiteral(nextLat, nextLng),
        region: 'PE',
      });
      const result = response.results?.[0];
      const nextDistrictOptions = extractDistrictOptionsFromAddressComponents(
        result?.address_components,
        result?.formatted_address
      );

      syncDistrictSelection(nextDistrictOptions, districtText);
      setGeoError('');
    } catch {
      setGeoError(
        'No se pudo ajustar el distrito desde el mapa. La dirección escrita se mantiene.'
      );
    }
  }

  async function handleMapSelection(nextLat: number, nextLng: number) {
    const nextCoords = toFixedLatLng(nextLat, nextLng);
    syncLocationCoordinates(nextCoords.lat, nextCoords.lng);
    syncPinSelected(true);
    setGeoError('');
    panMapToLocation(nextCoords.lat, nextCoords.lng);
    await reverseGeocodeDistrict(nextCoords.lat, nextCoords.lng);
  }

  function handleAddressInputChange(nextValue: string) {
    clearPendingAddressBlurResolve();

    const normalizedValue = normalizeLocationLookupValue(nextValue);
    if (pendingAutocompleteAddressRef.current) {
      if (normalizedValue !== pendingAutocompleteAddressRef.current) return;
      pendingAutocompleteAddressRef.current = '';
      return;
    }

    skipNextAddressBlurResolveRef.current = false;
    setLocationText(nextValue);
    setGeoError('');

    if (!normalizedValue) {
      resolvedAddressTextRef.current = '';
      syncPinSelected(false);
      return;
    }

    if (normalizedValue !== resolvedAddressTextRef.current) {
      syncPinSelected(false);
    }
  }

  async function ensureAddressResolvedIfNeeded() {
    const nextAddress = String(addressInputRef.current?.value || locationText || '').trim();
    if (!nextAddress) return false;
    if (!canUseInteractiveMap) return true;
    if (!hasPendingAddressResolution(nextAddress)) return true;
    return geocodeAddressText(nextAddress, { preserveInput: true });
  }

  function handleAddressBlur() {
    clearPendingAddressBlurResolve();

    if (typeof window === 'undefined' || !canUseInteractiveMap) return;

    addressBlurResolveTimerRef.current = window.setTimeout(() => {
      addressBlurResolveTimerRef.current = null;

      if (skipNextAddressBlurResolveRef.current) {
        skipNextAddressBlurResolveRef.current = false;
        return;
      }

      const currentValue = String(addressInputRef.current?.value || locationText || '').trim();
      if (!hasPendingAddressResolution(currentValue)) return;

      void geocodeAddressText(currentValue, { preserveInput: true });
    }, ADDRESS_BLUR_RESOLVE_DELAY_MS);
  }

  function handleInlinePaymentMethodsChange(methods: InlinePaymentMethodSummary[]) {
    setPaymentMethodCatalog(mapInlinePaymentMethodsToCatalog(methods));
  }

  function handleInlinePaymentMethodSaved(
    savedMethod: InlinePaymentMethodSummary | null,
    methods: InlinePaymentMethodSummary[]
  ) {
    const nextCatalog = mapInlinePaymentMethodsToCatalog(methods);
    setPaymentMethodCatalog(nextCatalog);

    if (!savedMethod) return;

    setSelectedPaymentMethodIds((current) => {
      const currentSelection = partitionPaymentMethodSelection(current, nextCatalog);
      const nextSelection = [...currentSelection.selectedVisibleIds];

      if (savedMethod.is_active !== false) {
        nextSelection.push(savedMethod.id);
      }

      return Array.from(new Set(nextSelection));
    });

    const nextSelectedIds = savedMethod.is_active !== false
      ? Array.from(new Set([...selectedPaymentMethodIds, savedMethod.id]))
      : selectedPaymentMethodIds;
    const nextSelection = partitionPaymentMethodSelection(nextSelectedIds, nextCatalog);

    if (nextSelection.selectedActiveIds.length > 0) {
      setPaymentMethodsError('');
    }
  }

  function resolveCurrentPublishReadiness(fd?: FormData) {
    const selectedIds = fd
      ? normalizePaymentMethodIds(
          fd.getAll('paymentMethodIds').map((value) => Number(value))
        )
      : paymentMethodSelection.selectedIds;
    const nextPaymentMethodSelection = partitionPaymentMethodSelection(selectedIds, paymentMethodCatalog);

    return getEventPublishReadiness({
      title: fd ? String(fd.get('title') || '') : eventTitle,
      startTime: fd ? String(fd.get('startTime') || '') : startTime,
      endTime: fd ? String(fd.get('endTime') || '') : endTime,
      district: fd ? String(fd.get('district') || '') : districtText,
      locationText: fd ? String(fd.get('locationText') || '') : locationText,
      lat: pinSelectedRef.current ? latRef.current : null,
      lng: pinSelectedRef.current ? lngRef.current : null,
      paymentMethodIds: nextPaymentMethodSelection.selectedActiveIds,
      isFieldReservedConfirmed: fd
        ? parseBooleanFormValue(fd.get('isFieldReservedConfirmed'))
        : isFieldReservedConfirmed,
    });
  }

  function syncPublishReadinessErrors(readiness = publishReadiness, publishing = isPublished) {
    if (!publishing) return '';

    if (readiness.missingIds.includes('payment_methods')) {
      setPaymentMethodsError('Selecciona al menos un método de pago activo antes de publicar.');
    }

    if (readiness.missingIds.includes('field_reservation')) {
      setFieldReservedError('Confirma que la cancha ya está reservada antes de publicar.');
    }

    return readiness.primaryMessage || '';
  }

  function trackPublishBlocked(source: 'step_validation' | 'submit', readiness = publishReadiness) {
    trackEvent('create_event_publish_blocked', {
      channel: 'web',
      source,
      step: createStep,
      missing_ids: readiness.missingIds,
    });
  }

  function validateCreateStep(step: CreateStepId, publishing = isPublished) {
    const form = formRef.current;
    if (!form) return '';

    const fd = new FormData(form);
    const currentPublishReadiness = resolveCurrentPublishReadiness(fd);

    if (step === 1) {
      const title = String(fd.get('title') || '').trim();
      const description = String(fd.get('description') || '').trim();
      const minUsers = Number(fd.get('minUsers'));
      const maxUsers = Number(fd.get('maxUsers'));

      if (!String(fd.get('eventTypeId') || '').trim())
        return 'Primero elige qué tipo de partido quieres organizar.';
      if (!title) return 'Agrega un título para que tu evento sea fácil de reconocer.';
      if (!description) return 'Incluye una descripción corta para explicar el plan.';
      if (!startTime || !endTime) return 'Define la fecha y hora de inicio y fin.';
      if (timeError) return timeError;
      if (isVersusSelected) {
        const maxTeams = Number(fd.get('teamRegistrationMaxTeams'));
        const minPlayers = Number(fd.get('teamRegistrationMinPlayers'));
        const maxPlayers = Number(fd.get('teamRegistrationMaxPlayers'));
        if (!Number.isInteger(maxTeams) || maxTeams < 2 || maxTeams > 64)
          return 'Define una cantidad de equipos entre 2 y 64.';
        if (!Number.isInteger(minPlayers) || minPlayers < 1 || minPlayers > 30)
          return 'Define entre 1 y 30 jugadoras en cancha por equipo.';
        if (!Number.isInteger(maxPlayers) || maxPlayers < minPlayers || maxPlayers > 60)
          return 'Revisa la cantidad máxima del plantel por equipo.';
        return '';
      }
      if (!Number.isFinite(minUsers) || minUsers <= 0)
        return 'Ingresa un mínimo de jugadoras válido.';
      if (!Number.isFinite(maxUsers) || maxUsers <= 0)
        return 'Ingresa un máximo de jugadoras válido.';
      if (maxUsers < minUsers) return 'El máximo de jugadoras debe ser igual o mayor al mínimo.';
      return '';
    }

    if (step === 2) {
      const nextLocationText = String(fd.get('locationText') || '').trim();
      const nextLocationError = resolveLocationSelectionError();

      if (!nextLocationText) return 'Escribe la cancha o dirección donde jugarán.';
      if (geoError && !isMapUnavailable) return geoError;
      if (nextLocationError && !isMapUnavailable) return nextLocationError;
      return '';
    }

    if (step === 3) {
      const price = Number(fd.get('price'));
      const fixedTeamPriceRaw = String(fd.get('teamRegistrationFixedPrice') || '').trim();
      const fixedTeamPrice = Number(fixedTeamPriceRaw);
      if (!Number.isFinite(price) || price < 0) return 'Define un precio válido para el evento.';
      if (
        isVersusSelected &&
        teamRegistrationPriceMode === 'fixed_team' &&
        (!fixedTeamPriceRaw || !Number.isFinite(fixedTeamPrice) || fixedTeamPrice < 0)
      ) {
        return 'Define un precio válido por equipo.';
      }
      if (publishing && currentPublishReadiness.missingIds.includes('payment_methods')) {
        setPaymentMethodsError('Selecciona al menos un método de pago activo antes de publicar.');
        return 'Agrega un método de pago activo o deja el evento como borrador por ahora.';
      }
      return '';
    }

    if (publishing && currentPublishReadiness.missingIds.includes('field_reservation')) {
      setFieldReservedError('Confirma que la cancha ya está reservada antes de publicar.');
      return 'Antes de publicar debes confirmar que la cancha ya está reservada.';
    }

    return '';
  }

  function focusFirstInvalidField(step: CreateStepId) {
    const form = formRef.current;
    if (!form || typeof window === 'undefined') return;

    const fd = new FormData(form);
    let selector = '';

    if (step === 1) {
      const minUsers = Number(fd.get('minUsers'));
      const maxUsers = Number(fd.get('maxUsers'));
      selector = !String(fd.get('eventTypeId') || '').trim()
        ? '[data-event-type-card]'
        : !String(fd.get('title') || '').trim()
        ? 'input[name="title"]'
        : !String(fd.get('description') || '').trim()
          ? '#event-description'
          : !startDateValue
            ? 'input[type="date"]'
            : !startClockValue
              ? 'input[type="time"]'
              : timeError
                ? 'input[name="endTimeEditor"], input[type="time"]'
              : isVersusSelected && (
                  Number(fd.get('teamRegistrationMaxTeams')) < 2 ||
                  Number(fd.get('teamRegistrationMaxTeams')) > 64
                )
                ? 'input[name="teamRegistrationMaxTeams"]'
                : isVersusSelected && (
                    Number(fd.get('teamRegistrationMinPlayers')) < 1 ||
                    Number(fd.get('teamRegistrationMinPlayers')) > 30
                  )
                  ? 'input[name="teamRegistrationMinPlayers"]'
              : !Number.isFinite(minUsers) || minUsers <= 0
                ? 'input[name="minUsers"]'
                : !Number.isFinite(maxUsers) || maxUsers <= 0 || maxUsers < minUsers
                  ? 'input[name="maxUsers"]'
                  : '';
    } else if (step === 2) {
      selector = !String(fd.get('locationText') || '').trim() || !pinSelectedRef.current
        ? 'input[name="locationText"]'
        : '';
    } else if (step === 3) {
      const fixedTeamPriceRaw = String(fd.get('teamRegistrationFixedPrice') || '').trim();
      const fixedTeamPrice = Number(fixedTeamPriceRaw);
      const price = Number(fd.get('price'));
      selector = isVersusSelected && teamRegistrationPriceMode === 'fixed_team' && (!fixedTeamPriceRaw || fixedTeamPrice < 0)
        ? 'input[name="teamRegistrationFixedPrice"]'
        : !Number.isFinite(price) || price < 0
          ? 'input[name="price"]'
          : '#event-payment-methods input';
    } else {
      selector = 'input[name="isFieldReservedConfirmed"]';
    }

    if (!selector) return;
    window.requestAnimationFrame(() => {
      const field = form.querySelector<HTMLElement>(selector);
      field?.focus({ preventScroll: true });
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function moveToCreateStep(nextStep: CreateStepId) {
    setCreateStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleNextCreateStep() {
    if (createStep === 2) {
      await ensureAddressResolvedIfNeeded();
    }

    const nextError = validateCreateStep(createStep);
    if (nextError) {
      const currentPublishReadiness = formRef.current
        ? resolveCurrentPublishReadiness(new FormData(formRef.current))
        : resolveCurrentPublishReadiness();
      if (
        isPublished &&
        (currentPublishReadiness.missingIds.includes('payment_methods') ||
          currentPublishReadiness.missingIds.includes('field_reservation'))
      ) {
        trackPublishBlocked('step_validation', currentPublishReadiness);
      }
      setWizardError(nextError);
      focusFirstInvalidField(createStep);
      return;
    }

    trackEvent('create_event_step_completed', {
      channel: 'web',
      step: createStep,
      next_step: createStep + 1,
    });
    setWizardError('');
    if (createStep < 4) {
      moveToCreateStep((createStep + 1) as CreateStepId);
    }
  }

  function handlePreviousCreateStep() {
    setWizardError('');
    if (createStep > 1) {
      moveToCreateStep((createStep - 1) as CreateStepId);
    }
  }

  function handleDraftSaveRequest() {
    if (pending || !formRef.current) return;
    draftSubmitIntentRef.current = true;
    setIsPublished(false);
    formRef.current.requestSubmit();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const forceDraft = draftSubmitIntentRef.current;
    const shouldPublish = forceDraft ? false : isPublished;
    draftSubmitIntentRef.current = false;
    if (isCreateMode && createStep < 4 && !forceDraft) {
      await handleNextCreateStep();
      return;
    }
    setPaymentMethodsError('');
    setFieldReservedError('');
    if (shouldPublish && String(locationText || '').trim()) {
      await ensureAddressResolvedIfNeeded();
    }
    if (isCreateMode) {
      trackEvent(
        shouldPublish ? 'create_event_publish_attempted' : 'create_event_draft_save_attempted',
        {
          channel: 'web',
          step: createStep,
        }
      );
    }

    if (isCreateMode) {
      const validationStep = forceDraft ? 1 : createStep;
      const stepError = validateCreateStep(validationStep, shouldPublish);
      if (stepError) {
        const currentPublishReadiness = formRef.current
          ? resolveCurrentPublishReadiness(new FormData(formRef.current))
          : resolveCurrentPublishReadiness();
        if (
          shouldPublish &&
          (currentPublishReadiness.missingIds.includes('payment_methods') ||
            currentPublishReadiness.missingIds.includes('field_reservation'))
        ) {
          trackPublishBlocked('step_validation', currentPublishReadiness);
        }
        setWizardError(stepError);
        focusFirstInvalidField(validationStep);
        return;
      }
    }

    const fd = new FormData(form);
    const start = String(fd.get('startTime') || '');
    const end = String(fd.get('endTime') || '');
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (
      !start ||
      !end ||
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      endMs <= startMs
    ) {
      const nextTimeError = timeError || 'Define una fecha y hora válidas antes de continuar.';
      setSubmitStatus('error');
      setSubmitMessage(nextTimeError);
      setWizardError(nextTimeError);
      if (isCreateMode) {
        moveToCreateStep(1);
        focusFirstInvalidField(1);
      }
      return;
    }
    const nextLocationError = (isMapUnavailable ? '' : geoError) || resolveLocationSelectionError();
    if (shouldPublish && nextLocationError) {
      setSubmitStatus('error');
      setSubmitMessage(nextLocationError);
      setWizardError(nextLocationError);
      if (isCreateMode) {
        moveToCreateStep(2);
        focusFirstInvalidField(2);
      }
      return;
    }
    fd.set('isPublished', shouldPublish ? 'true' : 'false');
    fd.set('lat', pinSelectedRef.current ? String(latRef.current) : '0');
    fd.set('lng', pinSelectedRef.current ? String(lngRef.current) : '0');
    const submitPublishReadiness = resolveCurrentPublishReadiness(fd);

    if (shouldPublish && !submitPublishReadiness.isReady) {
      trackPublishBlocked('submit', submitPublishReadiness);
      const readinessError = syncPublishReadinessErrors(submitPublishReadiness, shouldPublish);
      if (readinessError) {
        setSubmitStatus('error');
        setSubmitMessage(readinessError);
        setWizardError(readinessError);
      }
      if (isCreateMode && submitPublishReadiness.missingIds.includes('details')) {
        moveToCreateStep(1);
        focusFirstInvalidField(1);
      } else if (isCreateMode && submitPublishReadiness.missingIds.includes('location')) {
        moveToCreateStep(2);
        focusFirstInvalidField(2);
      }
      return;
    }

    setSubmitStatus('idle');
    setSubmitMessage('');
    setCreatedEventId('');
    setShareUrl('');
    setShareTitle(String(fd.get('title') || 'Evento'));
    setShowPostEditAnnouncementModal(false);
    if (isCreateMode && shouldPublish) {
      setShowCreateModal(true);
    }
    setPending(true);
    setPendingMode(shouldPublish ? 'publish' : 'draft');
    const pendingStartedAt = Date.now();

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    try {
      const result = await onSubmit(fd);
      const serverError = String((result && 'error' in result ? result.error : '') || '').trim();
      if (serverError) {
        setSubmitStatus('error');
        setSubmitMessage(
          isCreateMode ? resolveFriendlyCreateErrorMessage(serverError) : serverError
        );
        return;
      }

      if (isCreateMode) {
        const createdEventId = String(
          (result && 'eventId' in result ? result.eventId : '') || ''
        ).trim();
        setSubmitStatus('success');
        setCreatedEventId(createdEventId);
        if (!shouldPublish) {
          clearAutosave();
          trackEvent('create_event_draft_created', {
            channel: 'web',
            event_id: createdEventId || null,
          });
          setSubmitMessage('Borrador guardado con éxito.');
          if (createdEventId) {
            router.push(`/admin/events/${createdEventId}/edit`);
            return;
          }
          router.push(modalRedirectTo);
          return;
        }

        clearAllCreateDraftAutosaves();
        if (createdEventId) {
          trackEvent('create_event_publish_succeeded', {
            channel: 'web',
            event_id: createdEventId,
          });
          const origin = window.location.origin;
          setShareUrl(`${origin}/events/${createdEventId}`);
          setSubmitMessage('Evento creado con éxito. Ahora compártelo para que se inscriban.');
        } else {
          trackEvent('create_event_publish_succeeded', {
            channel: 'web',
            event_id: null,
          });
          setSubmitMessage('Evento creado con éxito.');
        }
      } else {
        setSubmitStatus('success');
        setSubmitMessage(
          shouldPublish ? 'Evento guardado con éxito.' : 'Borrador guardado con éxito.'
        );
        if (postEditAnnouncement && shouldPublish) {
          setShowPostEditAnnouncementModal(true);
        }
      }
    } catch (error: any) {
      setSubmitStatus('error');
      const nextMessage = error?.message || 'No se pudo completar la operación.';
      setSubmitMessage(isCreateMode ? resolveFriendlyCreateErrorMessage(nextMessage) : nextMessage);
    } finally {
      const elapsed = Date.now() - pendingStartedAt;
      if (elapsed < MIN_PENDING_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_PENDING_MS - elapsed));
      }
      setPending(false);
      setPendingMode(null);
    }
  }

  function handleCloseCreateModal() {
    if (pending) return;
    setShowCreateModal(false);
    if (submitStatus === 'error') return;
    clearAllCreateDraftAutosaves();
    router.replace(modalRedirectTo);
  }

  const createModalStatus = useMemo<EventShareModalStatus>(() => {
    if (pending) return 'loading';
    if (submitStatus === 'error') return 'error';
    return 'success';
  }, [pending, submitStatus]);

  useEffect(() => {
    if (!showPostEditAnnouncementModal) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPostEditAnnouncementModal(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPostEditAnnouncementModal]);

  useEffect(() => {
    if (!showResetConfirm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowResetConfirm(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirm]);

  useEffect(() => {
    if (!isCreateMode || hasTrackedWizardViewRef.current) return;
    hasTrackedWizardViewRef.current = true;
    trackEvent('create_event_wizard_viewed', {
      channel: 'web',
    });
  }, [isCreateMode]);

  useEffect(() => {
    if (!isCreateMode || previousTrackedStepRef.current === createStep) return;
    previousTrackedStepRef.current = createStep;
    trackEvent('create_event_step_viewed', {
      channel: 'web',
      step: createStep,
      step_title: activeCreateStep.title,
      is_published: isPublished,
    });
  }, [activeCreateStep.title, createStep, isCreateMode, isPublished]);

  useEffect(() => {
    if (!isCreateMode || typeof window === 'undefined') return;

    const storageKey = getDraftStorageKey();
    if (!storageKey) {
      autosaveReadyRef.current = true;
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        autosaveReadyRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as EventCreateDraftSnapshot;
      if (parsed?.version !== 1) {
        autosaveReadyRef.current = true;
        return;
      }

      restoreCreateDraft(parsed);
      setAutosaveMessage('Recuperamos lo guardado en este dispositivo.');
      trackEvent('create_event_draft_restored', {
        channel: 'web',
        restored_step: parsed.step,
      });
    } catch {
    } finally {
      autosaveReadyRef.current = true;
    }

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [isCreateMode]);

  useEffect(() => {
    if (!isCreateMode) return;
    scheduleAutosave();
  }, [
    createStep,
    districtText,
    endTime,
    eventDescription,
    eventDescriptionHtml,
    eventTitle,
    isFeaturedValue,
    isCreateMode,
    isFieldReservedConfirmed,
    isPublished,
    lat,
    lng,
    placeText,
    locationText,
    maxUsersValue,
    minUsersValue,
    pinSelected,
    priceValue,
    selectedEventTypeId,
    selectedFeatureIds,
    selectedLevelId,
    selectedOrganizerId,
    selectedPaymentMethodIds,
    startTime,
    teamCountValue,
    teamFixedPriceValue,
    teamPlayersValue,
    teamRegistrationPriceMode,
    teamSubstitutesValue,
  ]);

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onInput={() => {
          if (wizardError) setWizardError('');
          scheduleAutosave();
        }}
        className={
          isCreateMode
            ? createStep === 4
              ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]'
              : 'grid w-full min-w-0 gap-5'
            : 'max-w-4xl space-y-5'
        }
        noValidate
      >
        {isCreateMode ? (
          <div
            className={[
              'rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)] sm:px-5 sm:py-4',
              createStep === 4 ? 'xl:col-span-2' : '',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mulberry/75">
                  Paso {createStep} de {CREATE_EVENT_STEPS.length}
                </p>
                <h2 className="mt-1 text-xl font-eastman-extrabold text-slate-900">
                  {activeCreateStep.title}
                </h2>
                <p className="mt-1 hidden text-sm text-slate-600 sm:block">
                  {activeCreateStep.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {autosaveMessage ? (
                  <span
                    title={autosaveMessage}
                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                  >
                    <span className="sm:hidden">
                      {autosaveMessage.startsWith('Guardado') ? 'Guardado' : 'Recuperado'}
                    </span>
                    <span className="hidden sm:inline">{autosaveMessage}</span>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={handleResetCreateDraft}
                  className="text-xs font-semibold text-mulberry transition hover:underline"
                >
                  <span className="sm:hidden">Descartar</span>
                  <span className="hidden sm:inline">Descartar progreso</span>
                </button>
              </div>
            </div>

            <nav
              aria-label="Progreso de creación"
              className="mt-3 hidden grid-cols-4 gap-2 border-t border-slate-100 pt-3 sm:grid"
            >
              {CREATE_EVENT_STEPS.map((step) => {
                const isActive = step.id === createStep;
                const isCompleted = step.id < createStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${step.title}: ${isCompleted ? 'listo' : isActive ? 'paso actual' : 'pendiente'}`}
                    disabled={!isCompleted}
                    onClick={() => {
                      if (isCompleted) moveToCreateStep(step.id);
                    }}
                    className={[
                      'flex min-w-0 items-center justify-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition sm:justify-start sm:px-2',
                      isActive
                        ? 'bg-mulberry/[0.06]'
                        : isCompleted
                          ? 'hover:bg-emerald-50/70'
                          : '',
                      isCompleted
                        ? 'cursor-pointer'
                        : isActive
                          ? 'cursor-default'
                          : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        isActive
                          ? 'bg-mulberry text-white'
                          : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {isCompleted ? '✓' : step.id}
                    </span>
                    <span className="hidden min-w-0 truncate text-xs font-semibold text-slate-700 sm:block">
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-3 sm:hidden" aria-hidden="true">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-mulberry transition-[width] duration-300"
                  style={{ width: `${createProgressPercent}%` }}
                />
              </div>
            </div>

            {wizardError ? (
              <div
                id="create-event-wizard-error"
                role="alert"
                aria-live="polite"
                className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                {wizardError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={isCreateMode ? 'space-y-5' : ''}>
          <section
            className={[
              FLOW_SURFACE_CLASS,
              isCreateMode && createStep !== 1 ? 'hidden' : 'block',
            ].join(' ')}
          >
            <div className="mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mulberry">
                  Primero el formato
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  ¿Qué quieres organizar?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Esta decisión define quién se inscribe, cómo se cuentan los cupos y cómo se cobra.
                </p>
              </div>

              <div role="radiogroup" aria-label="Tipo de partido" className="mt-4 grid gap-3 md:grid-cols-2">
                {eventTypes.map((eventType) => {
                  const isSelected = String(eventType.id) === selectedEventTypeId;
                  const isTeamFormat = isVersusEventTypeName(eventType.name);
                  return (
                    <button
                      key={eventType.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      data-event-type-card
                      onClick={() => {
                        setSelectedEventTypeId(String(eventType.id));
                        if (isTeamFormat && isCreateMode) {
                          setTeamRegistrationPriceMode('fixed_team');
                        }
                      }}
                      className={[
                        'rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15',
                        isSelected
                          ? 'border-mulberry bg-mulberry/[0.055] shadow-sm'
                          : 'border-slate-200 bg-white hover:border-mulberry/30 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <span className="flex items-start justify-between gap-4">
                        <span>
                          <span className="block text-base font-semibold text-slate-950">
                            {eventType.name}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">
                            {isTeamFormat
                              ? 'Se inscriben 2 o más equipos. Cada capitana registra y paga por su plantel.'
                              : 'Las jugadoras se inscriben individualmente hasta completar los cupos.'}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={[
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            isSelected ? 'border-mulberry bg-mulberry text-white' : 'border-slate-300 bg-white',
                          ].join(' ')}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="eventTypeId" value={selectedEventTypeId} readOnly />

              {selectedEventType ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200/80">
                  <span className="font-semibold text-mulberry">{selectedEventType.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isVersusSelected
                      ? `${teamCount} equipos · inscripción gestionada por capitanas`
                      : 'inscripción individual'}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="grid gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_minmax(34rem,0.95fr)]">
              <div className="min-w-0 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Sobre el partido</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Dale un nombre claro y cuenta lo necesario para que las jugadoras sepan qué
                    esperar.
                  </p>
                </div>

                <Input
                  label="Título"
                  name="title"
                  required
                  placeholder="Ej. Pichanga libre en Miraflores"
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.currentTarget.value)}
                  aria-describedby={wizardError ? 'create-event-wizard-error' : undefined}
                  bgColor="bg-white"
                  tone="soft"
                />

                <div className="w-full">
                  <div
                    id="event-description-label"
                    className="mb-1 text-sm font-semibold text-slate-700"
                  >
                    Descripción<span className="text-error"> *</span>
                  </div>
                  <UsersRichTextEditor
                    id="event-description"
                    textName="description"
                    htmlName="descriptionHtml"
                    ariaLabelledBy="event-description-label"
                    defaultValue={eventDescription}
                    defaultHtml={eventDescriptionHtml}
                    resetKey={descriptionEditorResetKey}
                    compact
                    required
                    collapsedToolbar
                    placeholder="Cuenta la dinámica, qué deben llevar y cualquier indicación importante."
                    showCharacterCount
                    helperText="Incluye solo la información que las jugadoras necesitan antes de inscribirse."
                    onChange={(content) => {
                      setEventDescription(content.text);
                      setEventDescriptionHtml(content.html);
                    }}
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-5">
                <div>
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="text-lg font-semibold text-slate-900">Fecha y horario</p>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                        Hora local de Lima
                      </span>
                    </div>
                    <p id="event-schedule-help" className="mt-1 text-sm text-slate-600">
                      Define cuándo empieza y cuánto durará el partido. Calcularemos la hora de
                      fin automáticamente.
                    </p>
                  </div>

                  <div className={`mt-4 p-4 ${FLOW_PANEL_CLASS}`}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="w-full">
                        <div className="mb-1 text-sm font-semibold text-slate-700">
                          Día del partido <span className="text-error">*</span>
                        </div>
                        <input
                          type="date"
                          required
                          min={isCreateMode ? todayInLima : undefined}
                          aria-describedby="event-schedule-help"
                          value={startDateValue}
                          onChange={(event) => {
                            syncScheduleStart(event.currentTarget.value, startClockValue);
                          }}
                          className={FLOW_FIELD_CLASS}
                        />
                      </label>

                      <label className="w-full">
                        <div className="mb-1 text-sm font-semibold text-slate-700">
                          Hora de inicio <span className="text-error">*</span>
                        </div>
                        <input
                          type="time"
                          required
                          aria-describedby="event-schedule-help"
                          value={startClockValue}
                          onChange={(event) => {
                            syncScheduleStart(startDateValue, event.currentTarget.value);
                          }}
                          className={FLOW_FIELD_CLASS}
                        />
                      </label>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Duración del partido
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Selecciona una opción para calcular la hora de fin.
                        </p>
                      </div>

                      <div
                        role="group"
                        aria-label="Duración del partido"
                        className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-200/70 p-1"
                      >
                        {QUICK_DURATION_OPTIONS.map((durationOption) => (
                          <button
                            key={durationOption}
                            type="button"
                            aria-pressed={
                              preferredDurationMinutes === durationOption && !showExactEndEditor
                            }
                            aria-label={`Duración ${formatDurationLabel(durationOption)}`}
                            onClick={() => applySuggestedEndTime(durationOption)}
                            className={[
                              'inline-flex h-10 min-w-0 items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition',
                              preferredDurationMinutes === durationOption && !showExactEndEditor
                                ? 'bg-mulberry text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white/80 hover:text-mulberry',
                            ].join(' ')}
                          >
                            {durationOption % 60 === 0
                              ? `${durationOption / 60} h`
                              : `${Math.floor(durationOption / 60)} h ${durationOption % 60}`}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        aria-expanded={showExactEndEditor}
                        aria-controls="event-exact-end-editor"
                        onClick={() => setShowExactEndEditor((current) => !current)}
                        className="mt-3 inline-flex text-xs font-semibold text-mulberry transition hover:underline"
                      >
                        {showExactEndEditor
                          ? 'Ocultar ajuste manual'
                          : 'Ajustar hora de fin manualmente'}
                      </button>
                    </div>
                  </div>

                  {schedulePreview.start ? (
                    <div
                      aria-live="polite"
                      className="mt-3 rounded-xl border border-mulberry/15 bg-mulberry/[0.04] px-4 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mulberry/75">
                        Horario calculado
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {schedulePreview.dayLabel} · {schedulePreview.startLabel}
                        {schedulePreview.hasValidRange ? ` – ${schedulePreview.endLabel}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {schedulePreview.hasValidRange
                          ? `Duración: ${schedulePreview.durationLabel}.`
                          : 'Todavía falta definir a qué hora termina.'}
                      </p>
                      {schedulePreview.spansMultipleDays ? (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          El partido termina al día siguiente.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {showExactEndEditor ? (
                    <label id="event-exact-end-editor" className="mt-3 block max-w-md">
                      <div className="mb-1 text-sm font-semibold text-slate-700">
                        Fecha y hora de fin <span className="text-error">*</span>
                      </div>
                      <input
                        name="endTimeEditor"
                        type="datetime-local"
                        required
                        value={endTime}
                        onChange={(event) => setEndTime(event.currentTarget.value)}
                        min={startTime || undefined}
                        className={[
                          FLOW_FIELD_CLASS,
                          timeError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '',
                        ].join(' ')}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Este valor reemplaza la duración seleccionada arriba.
                      </p>
                      {timeError ? (
                        <p className="mt-2 text-xs font-medium text-red-600">{timeError}</p>
                      ) : null}
                    </label>
                  ) : null}

                  <input type="hidden" name="startTime" value={startTime} readOnly />
                  <input type="hidden" name="endTime" value={endTime} readOnly />
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {isVersusSelected ? 'Equipos y planteles' : 'Cupos'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {isVersusSelected
                        ? 'Define cuántos equipos pueden participar y el tamaño de cada plantel.'
                        : 'Define cuántas jugadoras necesitas para confirmar y cuántas pueden inscribirse.'}
                    </p>
                  </div>

                  {!selectedEventType ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      Elige primero el formato del evento para configurar sus cupos.
                    </div>
                  ) : isVersusSelected ? (
                    <div className="mt-4 space-y-4 rounded-2xl border border-mulberry/15 bg-mulberry/[0.035] p-4">
                      <Input
                        label="Cantidad de equipos"
                        name="teamRegistrationMaxTeams"
                        type="number"
                        min={2}
                        max={64}
                        step={1}
                        required
                        value={teamCountValue}
                        onChange={(event) => setTeamCountValue(event.currentTarget.value)}
                        bgColor="bg-white"
                        tone="soft"
                      />
                      <p className="-mt-2 text-xs text-slate-500">
                        Mínimo 2. Cada equipo ocupa un lugar y se inscribe mediante su capitana.
                      </p>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">Formato por equipo</p>
                        <div role="group" aria-label="Jugadoras en cancha por equipo" className="mt-2 grid grid-cols-5 gap-2">
                          {[5, 6, 7, 8, 11].map((players) => (
                            <button
                              key={players}
                              type="button"
                              aria-pressed={teamPlayers === players}
                              onClick={() => setTeamPlayersValue(String(players))}
                              className={[
                                'h-10 rounded-xl border text-xs font-semibold transition',
                                teamPlayers === players
                                  ? 'border-mulberry bg-mulberry text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-mulberry/35',
                              ].join(' ')}
                            >
                              {players} vs {players}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Jugadoras en cancha por equipo"
                          name="teamRegistrationMinPlayers"
                          type="number"
                          min={1}
                          max={30}
                          step={1}
                          required
                          value={teamPlayersValue}
                          onChange={(event) => setTeamPlayersValue(event.currentTarget.value)}
                          bgColor="bg-white"
                          tone="soft"
                        />
                        <Input
                          label="Suplentes permitidas por equipo"
                          name="teamSubstitutes"
                          type="number"
                          min={0}
                          max={30}
                          step={1}
                          required
                          value={teamSubstitutesValue}
                          onChange={(event) => setTeamSubstitutesValue(event.currentTarget.value)}
                          bgColor="bg-white"
                          tone="soft"
                        />
                      </div>

                      <div className="rounded-xl border border-mulberry/15 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mulberry/70">
                          Resumen del formato
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {teamCount} equipos · {teamPlayers} titulares
                          {teamSubstitutes > 0 ? ` + hasta ${teamSubstitutes} suplentes` : ' · sin suplentes'} por equipo
                        </p>
                      </div>

                      <input type="hidden" name="allowsTeamRegistration" value="true" readOnly />
                      <input type="hidden" name="teamRegistrationMaxPlayers" value={teamRosterMax} readOnly />
                      <input type="hidden" name="minUsers" value={teamPlayers * 2} readOnly />
                      <input type="hidden" name="maxUsers" value={teamRosterMax * teamCount} readOnly />
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Input
                          label="Mínimo para confirmar"
                          name="minUsers"
                          type="number"
                          min={1}
                          step={1}
                          required
                          value={minUsersValue}
                          onChange={(event) => setMinUsersValue(event.currentTarget.value)}
                          bgColor="bg-white"
                          tone="soft"
                        />

                        <Input
                          label="Cupos disponibles"
                          name="maxUsers"
                          type="number"
                          min={1}
                          step={1}
                          required
                          value={maxUsersValue}
                          onChange={(event) => setMaxUsersValue(event.currentTarget.value)}
                          bgColor="bg-white"
                          tone="soft"
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        El mínimo te ayuda a decidir si el partido continúa; los cupos disponibles
                        marcan el límite de inscripciones.
                      </p>
                      <input type="hidden" name="allowsTeamRegistration" value="false" readOnly />
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section
            className={[
              FLOW_SURFACE_CLASS,
              isCreateMode && createStep !== 2 ? 'hidden' : 'block',
            ].join(' ')}
          >
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Ubicación</h3>
              <p className="mt-1 text-sm text-slate-600">
                Guarda el nombre del lugar si te sirve como referencia y usa la dirección para
                ubicar el evento en el mapa.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">Dirección *</div>
                {canUseInteractiveMap ? (
                  <Autocomplete
                    onLoad={handleAddressAutocompleteLoad}
                    onPlaceChanged={handleAddressPlaceChanged}
                    options={{
                      componentRestrictions: { country: 'pe' },
                      fields: ['address_components', 'formatted_address', 'geometry', 'name'],
                    }}
                  >
                    <input
                      ref={addressInputRef}
                      name="locationText"
                      type="text"
                      required
                      value={locationText}
                      onChange={(event) => handleAddressInputChange(event.currentTarget.value)}
                      onBlur={handleAddressBlur}
                      autoComplete="off"
                      className={FLOW_FIELD_CLASS}
                    />
                  </Autocomplete>
                ) : (
                  <input
                    ref={addressInputRef}
                    name="locationText"
                    type="text"
                    required
                    value={locationText}
                    onChange={(event) => handleAddressInputChange(event.currentTarget.value)}
                    onBlur={handleAddressBlur}
                    autoComplete="off"
                    className={FLOW_FIELD_CLASS}
                  />
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Puedes escribir una dirección o el nombre de un lugar.
                </p>
              </label>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">
                  Pin exacto <span className="font-normal text-slate-500">(para publicar)</span>
                </div>
                {googleMapsApiKeyConfigured && !googleMapsLoadError && !isMapUnavailable ? (
                  !isGoogleMapsLoaded ? (
                    <div className="h-[300px] animate-pulse rounded-[18px] bg-slate-100 ring-1 ring-slate-200/80" />
                  ) : (
                    <div className="h-[300px] overflow-hidden rounded-[18px] ring-1 ring-slate-200/80">
                      <GoogleMap
                        mapContainerStyle={MAP_CONTAINER_STYLE}
                        center={toLatLngLiteral(lat, lng)}
                        zoom={12}
                        options={MAP_OPTIONS}
                        onLoad={(map) => {
                          mapRef.current = map;
                        }}
                        onClick={async (event) => {
                          const clickedLat = event.latLng?.lat();
                          const clickedLng = event.latLng?.lng();
                          if (clickedLat == null || clickedLng == null) return;
                          const nextLat = Number(clickedLat.toFixed(6));
                          const nextLng = Number(clickedLng.toFixed(6));
                          await handleMapSelection(nextLat, nextLng);
                        }}
                      >
                        <MarkerF
                          position={toLatLngLiteral(lat, lng)}
                          draggable
                          onDragEnd={async (eventInfo) => {
                            const draggedLat = eventInfo.latLng?.lat();
                            const draggedLng = eventInfo.latLng?.lng();
                            if (draggedLat == null || draggedLng == null) return;
                            const nextLat = Number(draggedLat.toFixed(6));
                            const nextLng = Number(draggedLng.toFixed(6));
                            await handleMapSelection(nextLat, nextLng);
                          }}
                        />
                      </GoogleMap>
                    </div>
                  )
                ) : (
                  <div className="rounded-[20px] bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200/80">
                    <p className="font-semibold">El mapa no está disponible ahora.</p>
                    <p className="mt-1 text-xs leading-5">
                      Puedes continuar con la dirección escrita y guardar un borrador. Antes de
                      publicar deberás volver para confirmar el pin.
                    </p>
                  </div>
                )}
                <p
                  className={`text-xs ${locationError && !isMapUnavailable ? 'text-red-600' : 'text-slate-500'}`}
                >
                  {isMapUnavailable
                    ? 'La dirección queda guardada aunque el pin esté pendiente.'
                    : locationError ||
                      'Puedes hacer clic o mover el pin para ajustar la ubicación exacta sin cambiar la dirección escrita.'}
                </p>
                {geoError && !isMapUnavailable ? (
                  <p className="text-xs text-amber-700">{geoError}</p>
                ) : null}
                <input type="hidden" name="lat" value={lat} readOnly />
                <input type="hidden" name="lng" value={lng} readOnly />
                <input type="hidden" name="district" value={districtText} readOnly />
              </div>

              <label className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">
                  Nombre del local (opcional)
                </div>
                <input
                  name="placeText"
                  type="text"
                  value={placeText}
                  onChange={(event) => setPlaceText(event.currentTarget.value)}
                  autoComplete="off"
                  className={FLOW_FIELD_CLASS}
                />
              </label>

            </div>
          </section>

          <section
            className={[
              FLOW_SURFACE_CLASS,
              isCreateMode && createStep !== 3 ? 'hidden' : 'block',
            ].join(' ')}
          >
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Inscripción y cobro</h3>
              <p className="mt-1 text-sm text-slate-600">
                Define cuánto se pagará, cómo recibirás el dinero y los detalles adicionales.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="max-w-md">
                <div className="w-full">
                  <SelectComponent
                    labelText="Nivel"
                    required
                    options={levelSelectOptions}
                    value={selectedLevelId}
                    onChange={(value) => setSelectedLevelId(String(value || ''))}
                    isSearchable={false}
                    bgColor="bg-white"
                    tone="soft"
                  />
                  <input type="hidden" name="levelId" value={selectedLevelId} readOnly />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {isVersusSelected ? '¿Cómo definirás el precio?' : 'Precio de inscripción'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {isVersusSelected
                      ? 'La capitana realiza un solo pago por todo el plantel.'
                      : 'Cada jugadora paga este monto al inscribirse.'}
                  </p>
                </div>

                {isVersusSelected ? (
                  <>
                    <div role="radiogroup" aria-label="Forma de calcular el precio" className="mt-4 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={teamRegistrationPriceMode === 'fixed_team'}
                        onClick={() => setTeamRegistrationPriceMode('fixed_team')}
                        className={[
                          'rounded-2xl border px-4 py-4 text-left transition',
                          teamRegistrationPriceMode === 'fixed_team'
                            ? 'border-mulberry bg-white ring-2 ring-mulberry/10'
                            : 'border-slate-200 bg-white hover:border-mulberry/30',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          Precio por equipo
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                            Recomendado
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">
                          Cada capitana paga el mismo monto, sin importar cuántas suplentes lleve.
                        </span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={teamRegistrationPriceMode === 'per_player'}
                        onClick={() => setTeamRegistrationPriceMode('per_player')}
                        className={[
                          'rounded-2xl border px-4 py-4 text-left transition',
                          teamRegistrationPriceMode === 'per_player'
                            ? 'border-mulberry bg-white ring-2 ring-mulberry/10'
                            : 'border-slate-200 bg-white hover:border-mulberry/30',
                        ].join(' ')}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          Precio según el plantel
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">
                          El total se calcula según las jugadoras que la capitana inscriba.
                        </span>
                      </button>
                    </div>

                    <input
                      type="hidden"
                      name="teamRegistrationPriceMode"
                      value={teamRegistrationPriceMode}
                      readOnly
                    />
                    {teamRegistrationPriceMode === 'fixed_team' ? (
                      <div className="mt-4 max-w-sm">
                        <Input
                          label="Precio por equipo (S/.)"
                          name="teamRegistrationFixedPrice"
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={teamFixedPriceValue}
                          onChange={(event) => setTeamFixedPriceValue(event.currentTarget.value)}
                          bgColor="bg-white"
                          tone="soft"
                        />
                        <input type="hidden" name="price" value="0" readOnly />
                        <p className="mt-2 text-xs text-slate-500">
                          Cada uno de los {teamCount} equipos pagará este monto.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 max-w-sm">
                        <Input
                          label="Precio por jugadora (S/.)"
                          name="price"
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={priceValue}
                          onChange={(event) => setPriceValue(event.currentTarget.value)}
                          bgColor="bg-white"
                          tone="soft"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Ejemplo: {teamPlayers} jugadoras × S/ {Number(priceValue || 0).toFixed(2)} = S/{' '}
                          {(teamPlayers * Number(priceValue || 0)).toFixed(2)} por equipo.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-4 max-w-sm">
                    <Input
                      label="Precio por jugadora (S/.)"
                      name="price"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={priceValue}
                      onChange={(event) => setPriceValue(event.currentTarget.value)}
                      bgColor="bg-white"
                      tone="soft"
                    />
                    <input type="hidden" name="teamRegistrationPriceMode" value="per_player" readOnly />
                  </div>
                )}
              </div>

              <div id="event-payment-methods" className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">
                  Métodos de pago para este evento {isPublished ? '*' : '(opcional por ahora)'}
                </div>
                <SelectComponent
                  key={`${detailsStepVisibilityKey}-payment-methods`}
                  options={paymentMethodOptions}
                  value={selectedVisiblePaymentMethodIds}
                  onChange={(value) => {
                    const nextIds = Array.isArray(value) ? normalizePaymentMethodIds(value) : [];
                    const nextSelection = partitionPaymentMethodSelection(nextIds, paymentMethodCatalog);
                    setSelectedPaymentMethodIds(nextIds);
                    if (nextSelection.selectedActiveIds.length > 0) {
                      setPaymentMethodsError('');
                    }
                  }}
                  isMulti
                  isSearchable={false}
                  bgColor="bg-white"
                  tone="soft"
                />
                {activePaymentMethodCatalog.length === 0 ? (
                  <div className="mt-2 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-medium text-amber-800">
                      No hay métodos activos disponibles todavía.
                    </p>
                    <Link
                      href={paymentMethodsHref}
                      onClick={() => {
                        trackEvent('create_event_payment_setup_clicked', {
                          channel: 'web',
                          source: 'wizard_empty_state',
                          step: createStep,
                        });
                      }}
                      className="mt-2 inline-flex text-xs font-semibold text-mulberry hover:underline"
                    >
                      Ir a Formas de pago
                    </Link>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedActivePaymentMethodIds.length > 0
                      ? `${selectedActivePaymentMethodIds.length} ${selectedActivePaymentMethodIds.length === 1 ? 'método seleccionado' : 'métodos seleccionados'} para recibir pagos.`
                      : selectedInactivePaymentMethodIds.length > 0
                        ? `${selectedInactivePaymentMethodIds.length} ${selectedInactivePaymentMethodIds.length === 1 ? 'método seleccionado está inactivo' : 'métodos seleccionados están inactivos'} y no cuentan para publicar.`
                      : isPublished
                        ? 'Selecciona uno o más métodos activos para publicar este evento.'
                        : 'Puedes agregar métodos de pago después, antes de publicar.'}
                  </p>
                )}
                {selectedInactivePaymentMethodIds.length > 0 ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Activa {selectedInactivePaymentMethodIds.length === 1 ? 'ese método' : 'esos métodos'} o
                    elige otros antes de publicar.
                  </p>
                ) : null}
                {paymentMethodsError ? (
                  <p className="mt-1 text-xs text-red-600">{paymentMethodsError}</p>
                ) : null}
                {selectedVisiblePaymentMethodIds.map((paymentMethodId) => (
                  <input
                    key={`payment-method-${paymentMethodId}`}
                    type="hidden"
                    name="paymentMethodIds"
                    value={paymentMethodId}
                    readOnly
                  />
                ))}
              </div>

              <InlinePaymentMethodSetup
                initialMethods={paymentMethodCatalog}
                onMethodsChange={handleInlinePaymentMethodsChange}
                onMethodSaved={handleInlinePaymentMethodSaved}
              />

              {canManageFeatured ? (
                <div className="w-full">
                  {organizerSelectOptions.length > 0 ? (
                    <>
                      <SelectComponent
                        labelText="Asociación interna de organizadora"
                        options={[
                          { value: '', label: 'Sin organizadora asociada' },
                          ...organizerSelectOptions,
                        ]}
                        value={selectedOrganizerId}
                        onChange={(value) => setSelectedOrganizerId(String(value || ''))}
                        isSearchable
                        bgColor="bg-white"
                        tone="soft"
                      />
                      <input
                        type="hidden"
                        name="organizerId"
                        value={selectedOrganizerId}
                        readOnly
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Campo administrativo. No cambia quién creó ni gestiona el evento.
                      </p>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="organizerId" value="" readOnly />
                      <div className="mb-1 text-sm font-semibold text-slate-700">
                        Asociación interna de organizadora
                      </div>
                      <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
                        No hay organizadoras disponibles para asociar.
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <input type="hidden" name="organizerId" value="" readOnly />
              )}

              <div className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">Servicios incluidos</div>
                <SelectComponent
                  key={`${detailsStepVisibilityKey}-features`}
                  options={featureOptions}
                  value={selectedFeatureIds}
                  onChange={(value) =>
                    setSelectedFeatureIds(
                      Array.isArray(value)
                        ? value
                            .map((item) => Number(item))
                            .filter((item) => Number.isInteger(item) && item > 0)
                        : []
                    )
                  }
                  isMulti
                  isSearchable={false}
                  bgColor="bg-white"
                  tone="soft"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {selectedFeatureIds.length > 0
                    ? `${selectedFeatureIds.length} ${selectedFeatureIds.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}.`
                    : 'Selecciona lo que estará disponible durante el evento.'}
                </p>
                {selectedFeatureIds.map((featureId) => (
                  <input
                    key={featureId}
                    type="hidden"
                    name="featureIds"
                    value={featureId}
                    readOnly
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className={[
              FLOW_SURFACE_CLASS,
              isCreateMode && createStep !== 4 ? 'hidden' : 'block',
            ].join(' ')}
          >
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Revisar y publicar</h3>
              <p className="mt-1 text-sm text-slate-600">
                Decide si quieres publicarlo hoy o si prefieres dejarlo para después.
              </p>
            </div>

            <div className="grid gap-4">
              <input
                type="hidden"
                name="isPublished"
                value={isPublished ? 'true' : 'false'}
                readOnly
              />

              <div role="group" aria-label="Estado de publicación" className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={isPublished}
                  onClick={() => setIsPublished(true)}
                  className={[
                    'rounded-[16px] px-4 py-4 text-left ring-1 transition',
                    isPublished
                      ? 'bg-emerald-50/70 ring-emerald-200/90'
                      : 'bg-white ring-slate-200/80 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-slate-900">Publicarlo hoy</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Úsalo si ya está todo listo y quieres que aparezca en el listado público.
                  </p>
                </button>

                <button
                  type="button"
                  aria-pressed={!isPublished}
                  onClick={() => {
                    setIsPublished(false);
                    setPaymentMethodsError('');
                    setFieldReservedError('');
                  }}
                  className={[
                    'rounded-[16px] px-4 py-4 text-left ring-1 transition',
                    !isPublished
                      ? 'bg-slate-100/90 ring-slate-300/90'
                      : 'bg-white ring-slate-200/80 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-slate-900">Guardar para después</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Guarda el avance y vuelve más tarde. Todavía no será visible al público.
                  </p>
                </button>
              </div>

              {isPublished ? (
                <div className="grid gap-4">
                  <div
                    className={[
                      'rounded-[16px] px-4 py-4 ring-1',
                      publishMissingCount === 0
                        ? 'bg-emerald-50/70 ring-emerald-200/80'
                        : 'bg-amber-50/70 ring-amber-200/80',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {publishMissingCount === 0 ? 'Listo para publicar' : 'Antes de publicar'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {publishMissingCount === 0
                        ? 'Cuando guardes, tu evento quedará público y listo para compartir.'
                        : publishReadiness.primaryMessage ||
                          'Termina estos puntos para poder publicarlo hoy.'}
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-[16px] bg-slate-50/80 px-4 py-4 ring-1 ring-slate-200/70">
                    <input
                      type="checkbox"
                      name="isFieldReservedConfirmed"
                      value="true"
                      checked={isFieldReservedConfirmed}
                      aria-describedby={fieldReservedError ? 'field-reserved-error' : undefined}
                      onChange={(event) => {
                        setIsFieldReservedConfirmed(event.currentTarget.checked);
                        if (event.currentTarget.checked) {
                          setFieldReservedError('');
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Confirmo que la cancha ya está reservada
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Este punto solo es obligatorio si hoy vas a publicarlo.
                      </p>
                      {fieldReservedError ? (
                        <p id="field-reserved-error" role="alert" className="mt-2 text-xs text-red-600">
                          {fieldReservedError}
                        </p>
                      ) : null}
                    </div>
                  </label>

                  {publishMissingItems.length > 0 ? (
                    <div className="rounded-[16px] bg-white/88 px-4 py-4 ring-1 ring-slate-200/70">
                      <p className="text-sm font-semibold text-slate-900">Falta resolver</p>
                      <div className="mt-3 grid gap-3">
                        {publishMissingItems.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{item.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                              {!item.done && item.id === 'payment_methods' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    trackEvent('create_event_payment_setup_clicked', {
                                      channel: 'web',
                                      source: 'wizard_publish_checklist',
                                      step: createStep,
                                    });
                                    moveToCreateStep(3);
                                  }}
                                  className="mt-2 inline-flex text-xs font-semibold text-mulberry hover:underline"
                                >
                                  Volver a cobro
                                </button>
                              ) : !item.done && item.id === 'location' ? (
                                <button
                                  type="button"
                                  onClick={() => moveToCreateStep(2)}
                                  className="mt-2 inline-flex text-xs font-semibold text-mulberry hover:underline"
                                >
                                  Volver a ubicación
                                </button>
                              ) : !item.done && item.id === 'details' ? (
                                <button
                                  type="button"
                                  onClick={() => moveToCreateStep(1)}
                                  className="mt-2 inline-flex text-xs font-semibold text-mulberry hover:underline"
                                >
                                  Volver a datos principales
                                </button>
                              ) : !item.done && item.id === 'field_reservation' ? (
                                <p className="mt-2 text-xs font-medium text-slate-600">
                                  Si no quieres confirmarlo hoy, guárdalo para después.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[16px] bg-slate-50/80 px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-sm font-semibold text-slate-900">
                    Se guardará para terminar después
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Guarda lo que ya avanzaste. Luego podrás volver, revisar lo que falta y
                    publicarlo cuando quieras.
                  </p>
                </div>
              )}

              {canManageFeatured ? (
                <div className="rounded-[16px] bg-slate-50/70 px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Opcional
                  </p>
                  <label className="mt-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Mostrar como partido destacado en la landing
                      </p>
                      <p className="text-xs text-slate-500">
                        Visible en la sección de destacados del inicio.
                      </p>
                    </div>

                    <span className="relative inline-flex h-6 w-11 shrink-0">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        value="true"
                        checked={isFeaturedValue}
                        onChange={(event) => setIsFeaturedValue(event.currentTarget.checked)}
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-mulberry" />
                      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {isCreateMode && createStep === 4 ? (
          <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <EventPreview
              title={eventTitle}
              description={eventDescription}
              descriptionHtml={eventDescriptionHtml}
              endTime={endTime}
              placeText={placeText || initial?.placeText || ''}
              locationText={locationText || initial?.locationText || ''}
              district={districtText}
              startTime={startTime}
              price={priceValue.trim() === '' ? undefined : Number(priceValue)}
              minUsers={Number(minUsersValue) || undefined}
              maxUsers={Number(maxUsersValue) || undefined}
              eventType={selectedEventType}
              level={selectedLevel}
              isTeamEvent={isVersusSelected}
              teamCount={teamCount}
              teamPlayers={teamPlayers}
              teamSubstitutes={teamSubstitutes}
              teamPriceMode={teamRegistrationPriceMode}
              fixedTeamPrice={
                teamFixedPriceValue.trim() === '' ? undefined : Number(teamFixedPriceValue)
              }
              wantsToPublish={isPublished}
              isReadyToPublish={publishReadiness.isReady}
            />
          </div>
        ) : null}

        <div
          className={[
            'flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)]',
            isCreateMode && createStep === 4 ? 'xl:col-span-2' : '',
          ].join(' ')}
        >
          <div className="flex flex-wrap items-center gap-3">
            {isCreateMode && createStep > 1 ? (
              <button
                type="button"
                onClick={handlePreviousCreateStep}
                className="inline-flex h-11 items-center rounded-xl border border-slate-300/90 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anterior
              </button>
            ) : null}

            {isCreateMode && createStep < 4 ? (
              <>
                <button
                  type="button"
                  onClick={handleNextCreateStep}
                  className="inline-flex h-11 items-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleDraftSaveRequest}
                  className="inline-flex h-11 items-center rounded-xl border border-slate-300/90 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {pendingMode === 'draft' ? 'Guardando...' : 'Guardar borrador'}
                </button>
              </>
            ) : (
              <ButtonWrapper
                width="fit-content"
                htmlType="submit"
                disabled={pending || Boolean(timeError)}
              >
                {pending ? pendingLabel : resolvedSubmitLabel}
              </ButtonWrapper>
            )}
          </div>

          {isCreateMode ? (
            <p className="text-sm text-slate-500">
              {createStep < 4
                ? 'Guárdalo en tu cuenta para retomarlo desde cualquier dispositivo.'
                : isPublished
                  ? publishMissingCount === 0
                    ? 'Si todo está listo, crearás el evento y saldrá público.'
                    : 'Si falta algo, te lo mostraremos antes de publicarlo.'
                  : 'Si prefieres terminar después, se guardará como borrador.'}
            </p>
          ) : null}
        </div>

        {!isCreateMode && !pending && submitStatus === 'success' && submitMessage ? (
          <p className="text-sm text-emerald-700">{submitMessage}</p>
        ) : null}
        {!isCreateMode && !pending && submitStatus === 'error' && submitMessage ? (
          <p className="text-sm text-red-600">{submitMessage}</p>
        ) : null}
        {isCreateMode && !pending && submitStatus !== 'idle' && submitMessage ? (
          <div
            role={submitStatus === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={[
              'rounded-2xl border px-4 py-3 text-sm font-medium',
              createStep === 4 ? 'xl:col-span-2' : '',
              submitStatus === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {submitMessage}
          </div>
        ) : null}
      </form>

      {isCreateMode && showResetConfirm ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-[2px]"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-create-event-title"
            aria-describedby="reset-create-event-description"
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="reset-create-event-title" className="text-lg font-semibold text-slate-900">
              ¿Descartar el progreso?
            </h3>
            <p id="reset-create-event-description" className="mt-2 text-sm leading-6 text-slate-600">
              Se eliminará lo guardado en este dispositivo y el formulario volverá a empezar.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setShowResetConfirm(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Conservar progreso
              </button>
              <button
                type="button"
                onClick={confirmResetCreateDraft}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-700 px-5 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                Descartar y empezar de nuevo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateMode ? (
        <EventShareModal
          isOpen={showCreateModal}
          status={createModalStatus}
          eventTitle={shareTitle || String(initial?.title || 'Evento')}
          message={submitMessage}
          shareUrl={shareUrl}
          onClose={handleCloseCreateModal}
        />
      ) : null}

      {!isCreateMode && postEditAnnouncement && showPostEditAnnouncementModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur-[2px]"
          onClick={() => setShowPostEditAnnouncementModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-edit-announcement-title"
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-left shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setShowPostEditAnnouncementModal(false)}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="max-h-[88vh] overflow-y-auto p-5 sm:p-6">
              <div className="mb-3 rounded-2xl border border-mulberry/20 bg-mulberry/5 px-4 py-3">
                <p
                  id="post-edit-announcement-title"
                  className="text-sm font-semibold text-mulberry"
                >
                  Comunicado para inscritas
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Puedes usar el mensaje base y ajustar solo los detalles del evento. Todo lo que
                  escribas en el box se enviará con el template de correo de Peloteras.
                </p>
              </div>

              <EventAnnouncementForm
                eventId={postEditAnnouncement.eventId}
                defaultSubject={postEditAnnouncement.defaultSubject}
                defaultBody={postEditAnnouncement.defaultBody}
                recipientCount={postEditAnnouncement.recipientCount}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default EventForm;
