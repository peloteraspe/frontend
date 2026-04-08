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
    minUsers: string;
    maxUsers: string;
    price: string;
    eventTypeId: string;
    levelId: string;
    isFeatured: boolean;
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
  };
};

type Props = {
  initial?: Partial<{
    title: string;
    description: string;
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
    isPublished: boolean;
    isFieldReservedConfirmed: boolean;
    isFeatured: boolean;
  }>;
  eventTypes: CatalogOption[];
  levels: CatalogOption[];
  features?: CatalogOption[];
  paymentMethods?: PaymentMethodOption[];
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
const DEFAULT_EVENT_DURATION_MINUTES = 90;
const QUICK_DURATION_OPTIONS = [60, 90, 120, 150] as const;
const DEFAULT_EVENT_START_TIME = '19:00';
const FLOW_SURFACE_CLASS =
  'rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)] sm:p-6';
const FLOW_PANEL_CLASS = 'rounded-2xl border border-slate-200 bg-slate-50/85';
const FLOW_FIELD_CLASS =
  'peloteras-form-control h-12';
const FLOW_TEXTAREA_CLASS =
  'peloteras-form-control peloteras-form-control--textarea';
const FLOW_NATIVE_SELECT_CLASS =
  'peloteras-form-control peloteras-form-control--select h-12';

function asFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  return formatTimeInTimeZoneWithMeridiem(date, DEFAULT_EVENT_TIMEZONE);
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

function normalizeLocationLookupValue(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
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
    title: 'Base del evento',
    description: 'Define nombre, horario y cupos.',
  },
  {
    id: 2,
    label: 'Paso 2',
    title: 'Ubicación',
    description: 'Elige cancha, pin y precio.',
  },
  {
    id: 3,
    label: 'Paso 3',
    title: 'Detalles',
    description: 'Ajusta precio, nivel, features y cobro.',
  },
  {
    id: 4,
    label: 'Paso 4',
    title: 'Final',
    description: 'Decide si lo publicas hoy o si lo guardas para después.',
  },
];
const CREATE_EVENT_DRAFT_STORAGE_PREFIX = 'peloteras:create-event:draft:';
const AUTOSAVE_DELAY_MS = 500;

const EventForm = ({
  initial,
  eventTypes,
  levels,
  features = [],
  paymentMethods = [],
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
  const [pending, setPending] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostEditAnnouncementModal, setShowPostEditAnnouncementModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState('');
  const { trackStepEntered, trackStepCompleted, trackFieldFilled, trackValidationError } =
    useCreateEventWizardTracking(createdEventId || undefined);
  const { templates: eventTemplates, loading: templatesLoading } = useEventTemplates(undefined);
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useGoogleMapsApi();
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [eventTitle, setEventTitle] = useState(initial?.title ?? '');
  const [eventDescription, setEventDescription] = useState(initial?.description ?? '');
  const [minUsersValue, setMinUsersValue] = useState(String(initial?.minUsers ?? 10));
  const [maxUsersValue, setMaxUsersValue] = useState(String(initial?.maxUsers ?? 20));
  const [priceValue, setPriceValue] = useState(String(initial?.price ?? 0));
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(() => {
    const initialId = Number(initial?.eventTypeId);
    if (eventTypes.some((option) => option.id === initialId)) return String(initialId);
    return String(eventTypes[0]?.id ?? 1);
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
  const latRef = useRef(asFiniteNumber(initial?.lat, DEFAULT_LAT));
  const lngRef = useRef(asFiniteNumber(initial?.lng, DEFAULT_LNG));
  const pinSelectedRef = useRef(
    Number.isFinite(Number(initial?.lat)) && Number.isFinite(Number(initial?.lng))
  );
  const addressAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const resolvedAddressTextRef = useRef(
    Number.isFinite(Number(initial?.lat)) && Number.isFinite(Number(initial?.lng))
      ? normalizeLocationLookupValue(initial?.locationText)
      : ''
  );
  const skipNextAddressBlurResolveRef = useRef(false);
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
      return 'Selecciona un punto en el mapa para calcular latitud/longitud.';
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
    return getSuggestionsForEvent({
      district: districtText,
      startTime,
      price: Number(priceValue) || undefined,
      maxUsers: Number(maxUsersValue) || undefined,
      title: eventTitle || undefined,
    });
  }, [districtText, eventTitle, maxUsersValue, priceValue, startTime]);

  const selectedEventType = useMemo(
    () => eventTypes.find((option) => String(option.id) === selectedEventTypeId),
    [eventTypes, selectedEventTypeId]
  );
  const selectedLevel = useMemo(
    () => levels.find((option) => String(option.id) === selectedLevelId),
    [levels, selectedLevelId]
  );

  const featureOptions = useMemo(
    () => features.map((option) => ({ value: option.id, label: option.name })),
    [features]
  );
  const activePaymentMethodCatalog = useMemo(
    () => paymentMethodCatalog.filter((method) => method.isActive),
    [paymentMethodCatalog]
  );
  const selectedActivePaymentMethodIds = useMemo(() => {
    const activeIds = new Set(activePaymentMethodCatalog.map((method) => method.id));
    return selectedPaymentMethodIds.filter((id) => activeIds.has(id));
  }, [activePaymentMethodCatalog, selectedPaymentMethodIds]);
  const paymentMethodOptions = useMemo(
    () =>
      activePaymentMethodCatalog.map((option) => {
        const methodType =
          option.type === 'yape_plin' ? 'Yape/Plin' : option.type === 'plin' ? 'Plin' : 'Yape';
        const numberText = option.number ? ` · ${option.number}` : '';
        const stateText = option.isActive ? '' : ' (Inactivo)';
        return {
          value: option.id,
          label: `${option.name} · ${methodType}${numberText}${stateText}`,
        };
      }),
    [activePaymentMethodCatalog]
  );
  const isCreateMode = useMemo(() => submitLabel.trim().toLowerCase() === 'crear', [submitLabel]);
  const activeCreateStep = CREATE_EVENT_STEPS[createStep - 1];
  const resolvedSubmitLabel = useMemo(() => {
    if (isCreateMode) {
      return isPublished ? 'Crear y publicar' : 'Guardar borrador';
    }
    return isPublished ? 'Guardar y publicar' : 'Guardar borrador';
  }, [isCreateMode, isPublished]);
  const pendingLabel = useMemo(() => {
    if (isCreateMode) {
      return isPublished ? 'Creando evento...' : 'Guardando borrador...';
    }
    return isPublished ? 'Guardando...' : 'Guardando borrador...';
  }, [isCreateMode, isPublished]);
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
  const publishMissingItems = useMemo(
    () => publishReadiness.items.filter((item) => !item.done),
    [publishReadiness]
  );
  const createProgressPercent = Math.round((createStep / CREATE_EVENT_STEPS.length) * 100);

  useEffect(() => {
    setPaymentMethodCatalog(normalizePaymentMethodCatalog(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    const availableIds = new Set(activePaymentMethodCatalog.map((method) => method.id));
    setSelectedPaymentMethodIds((current) => current.filter((id) => availableIds.has(id)));
  }, [activePaymentMethodCatalog]);

  useEffect(() => {
    if (eventTypes.some((option) => String(option.id) === selectedEventTypeId)) return;
    setSelectedEventTypeId(String(eventTypes[0]?.id ?? 1));
  }, [eventTypes, selectedEventTypeId]);

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
    if (!isCreateMode) return;
    setWizardError('');
  }, [createStep, isCreateMode]);

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
    if (!startTime) return;
    const nextEndTime = addMinutesToDateTimeLocal(startTime, durationMinutes);
    if (!nextEndTime) return;
    setPreferredDurationMinutes(durationMinutes);
    setEndTime(nextEndTime);
    setShowExactEndEditor(false);
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
        minUsers: minUsersValue,
        maxUsers: maxUsersValue,
        price: priceValue,
        eventTypeId: selectedEventTypeId,
        levelId: selectedLevelId,
        isFeatured: isFeaturedValue,
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
      },
    };
  }

  function clearAutosave() {
    const storageKey = getDraftStorageKey();
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.removeItem(storageKey);
    setAutosaveMessage('');
  }

  function persistCreateDraft() {
    const storageKey = getDraftStorageKey();
    if (!storageKey || typeof window === 'undefined') return;

    const snapshot = buildCreateDraftSnapshot();
    if (!snapshot) return;

    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    setAutosaveMessage('Progreso guardado automáticamente.');
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
    setMinUsersValue(snapshot.fields.minUsers);
    setMaxUsersValue(snapshot.fields.maxUsers);
    setPriceValue(snapshot.fields.price);
    setSelectedEventTypeId(snapshot.fields.eventTypeId);
    setSelectedLevelId(snapshot.fields.levelId);
    setIsFeaturedValue(snapshot.fields.isFeatured);
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
  }

  function handleResetCreateDraft() {
    trackEvent('create_event_draft_reset', {
      channel: 'web',
      source: 'wizard',
    });
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
    const place = addressAutocompleteRef.current?.getPlace();
    const placeLocation = place?.geometry?.location;

    if (!place || !placeLocation) {
      setGeoError('Selecciona una dirección válida de las sugerencias.');
      return;
    }

    const nextCoords = toFixedLatLng(placeLocation.lat(), placeLocation.lng());
    const formattedAddress = String(place.formatted_address || place.name || '').trim();
    const nextDistrictOptions = extractDistrictOptionsFromAddressComponents(
      place.address_components,
      formattedAddress
    );

    skipNextAddressBlurResolveRef.current = true;
    if (formattedAddress) {
      setResolvedAddressValue(formattedAddress);
      syncDistrictSelection(nextDistrictOptions, districtText);
    }
    syncLocationCoordinates(nextCoords.lat, nextCoords.lng);
    syncPinSelected(true);
    setGeoError('');
    panMapToLocation(nextCoords.lat, nextCoords.lng);

  }

  async function geocodeAddressText(rawAddress: string, options?: { preserveInput?: boolean }) {
    if (!googleMapsApiKeyConfigured || !isGoogleMapsLoaded || typeof google === 'undefined') {
      return false;
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
        options?.preserveInput ? nextAddress : String(result.formatted_address || nextAddress).trim(),
        nextAddress
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
    if (!googleMapsApiKeyConfigured || !isGoogleMapsLoaded || typeof google === 'undefined') return;

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
      setGeoError('No se pudo ajustar el distrito desde el mapa. La dirección escrita se mantiene.');
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
    skipNextAddressBlurResolveRef.current = false;
    setLocationText(nextValue);
    setGeoError('');

    const normalizedValue = normalizeLocationLookupValue(nextValue);
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
    const nextAddress = String(locationText || '').trim();
    if (!nextAddress) return false;
    if (!hasPendingAddressResolution(nextAddress)) return true;
    return geocodeAddressText(nextAddress, { preserveInput: true });
  }

  async function handleAddressBlur() {
    if (skipNextAddressBlurResolveRef.current) {
      skipNextAddressBlurResolveRef.current = false;
      return;
    }

    if (!hasPendingAddressResolution()) return;
    await geocodeAddressText(locationText, { preserveInput: true });
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
      const activeIds = new Set(
        nextCatalog.filter((method) => method.isActive).map((method) => method.id)
      );
      const nextSelection = current.filter((id) => activeIds.has(id));

      if (savedMethod.is_active !== false) {
        nextSelection.push(savedMethod.id);
      }

      return Array.from(new Set(nextSelection));
    });

    if (savedMethod.is_active !== false) {
      setPaymentMethodsError('');
    }
  }

  function resolveCurrentPublishReadiness(fd?: FormData) {
    const paymentMethodIds = fd
      ? fd
          .getAll('paymentMethodIds')
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : selectedActivePaymentMethodIds;

    return getEventPublishReadiness({
      title: fd ? String(fd.get('title') || '') : eventTitle,
      startTime: fd ? String(fd.get('startTime') || '') : startTime,
      endTime: fd ? String(fd.get('endTime') || '') : endTime,
      district: fd ? String(fd.get('district') || '') : districtText,
      locationText: fd ? String(fd.get('locationText') || '') : locationText,
      lat: pinSelectedRef.current ? latRef.current : null,
      lng: pinSelectedRef.current ? lngRef.current : null,
      paymentMethodIds,
      isFieldReservedConfirmed: fd
        ? parseBooleanFormValue(fd.get('isFieldReservedConfirmed'))
        : isFieldReservedConfirmed,
    });
  }

  function syncPublishReadinessErrors(readiness = publishReadiness) {
    if (!isPublished) return '';

    if (readiness.missingIds.includes('payment_methods')) {
      setPaymentMethodsError('Selecciona al menos un método de pago antes de publicar.');
    }

    if (readiness.missingIds.includes('field_reservation')) {
      setFieldReservedError('Confirma que la cancha ya está reservada antes de publicar.');
    }

    return readiness.primaryMessage || '';
  }

  function trackPublishBlocked(
    source: 'step_validation' | 'submit',
    readiness = publishReadiness
  ) {
    trackEvent('create_event_publish_blocked', {
      channel: 'web',
      source,
      step: createStep,
      missing_ids: readiness.missingIds,
    });
  }

  function validateCreateStep(step: CreateStepId) {
    const form = formRef.current;
    if (!form) return '';

    const fd = new FormData(form);
    const currentPublishReadiness = resolveCurrentPublishReadiness(fd);

    if (step === 1) {
      const title = String(fd.get('title') || '').trim();
      const description = String(fd.get('description') || '').trim();
      const minUsers = Number(fd.get('minUsers'));
      const maxUsers = Number(fd.get('maxUsers'));

      if (!title) return 'Agrega un título para que tu evento sea fácil de reconocer.';
      if (!description) return 'Incluye una descripción corta para explicar el plan.';
      if (!startTime || !endTime) return 'Define la fecha y hora de inicio y fin.';
      if (timeError) return timeError;
      if (!Number.isFinite(minUsers) || minUsers <= 0)
        return 'Ingresa un mínimo de jugadoras válido.';
      if (!Number.isFinite(maxUsers) || maxUsers <= 0)
        return 'Ingresa un máximo de jugadoras válido.';
      if (maxUsers < minUsers) return 'El máximo de jugadoras debe ser igual o mayor al mínimo.';
      return '';
    }

    if (step === 2) {
      const nextLocationText = String(fd.get('locationText') || '').trim();
      const price = Number(fd.get('price'));
      const nextLocationError = resolveLocationSelectionError();

      if (!nextLocationText) return 'Escribe la cancha o dirección donde jugarán.';
      if (geoError) return geoError;
      if (nextLocationError) return nextLocationError;
      if (!Number.isFinite(price) || price < 0) return 'Define un precio válido para el evento.';
      return '';
    }

    if (step === 3) {
      if (isPublished && currentPublishReadiness.missingIds.includes('payment_methods')) {
        setPaymentMethodsError('Selecciona al menos un método de pago antes de publicar.');
        return 'Agrega un método de pago o deja el evento como borrador por ahora.';
      }
      return '';
    }

    if (isPublished && currentPublishReadiness.missingIds.includes('field_reservation')) {
      setFieldReservedError('Confirma que la cancha ya está reservada antes de publicar.');
      return 'Antes de publicar debes confirmar que la cancha ya está reservada.';
    }

    return '';
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentMethodsError('');
    setFieldReservedError('');
    if (String(locationText || '').trim()) {
      await ensureAddressResolvedIfNeeded();
    }
    if (isCreateMode) {
      trackEvent(
        isPublished ? 'create_event_publish_attempted' : 'create_event_draft_save_attempted',
        {
          channel: 'web',
          step: createStep,
        }
      );
    }

    if (isCreateMode) {
      const stepError = validateCreateStep(createStep);
      if (stepError) {
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
        setWizardError(stepError);
        return;
      }
    }

    const fd = new FormData(event.currentTarget);
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
      return;
    }
    const nextLocationError = geoError || resolveLocationSelectionError();
    if (nextLocationError) {
      setSubmitStatus('error');
      setSubmitMessage(nextLocationError);
      setWizardError(nextLocationError);
      return;
    }
    fd.set('lat', String(latRef.current));
    fd.set('lng', String(lngRef.current));
    const submitPublishReadiness = resolveCurrentPublishReadiness(fd);

    if (isPublished && !submitPublishReadiness.isReady) {
      trackPublishBlocked('submit', submitPublishReadiness);
      const readinessError = syncPublishReadinessErrors(submitPublishReadiness);
      if (readinessError) {
        setSubmitStatus('error');
        setSubmitMessage(readinessError);
        setWizardError(readinessError);
      }
      return;
    }

    setSubmitStatus('idle');
    setSubmitMessage('');
    setCreatedEventId('');
    setShareUrl('');
    setShareTitle(String(fd.get('title') || 'Evento'));
    setShowPostEditAnnouncementModal(false);
    if (isCreateMode && isPublished) {
      setShowCreateModal(true);
    }
    setPending(true);
    const pendingStartedAt = Date.now();

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    try {
      const result = await onSubmit(fd);
      const serverError = String((result && 'error' in result ? result.error : '') || '').trim();
      if (serverError) {
        setSubmitStatus('error');
        setSubmitMessage(serverError);
        return;
      }

      if (isCreateMode) {
        const createdEventId = String(
          (result && 'eventId' in result ? result.eventId : '') || ''
        ).trim();
        setSubmitStatus('success');
        clearAutosave();
        setCreatedEventId(createdEventId);
        if (!isPublished) {
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
          isPublished ? 'Evento guardado con éxito.' : 'Borrador guardado con éxito.'
        );
        if (postEditAnnouncement && isPublished) {
          setShowPostEditAnnouncementModal(true);
        }
      }
    } catch (error: any) {
      setSubmitStatus('error');
      setSubmitMessage(error?.message || 'No se pudo completar la operación.');
    } finally {
      const elapsed = Date.now() - pendingStartedAt;
      if (elapsed < MIN_PENDING_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_PENDING_MS - elapsed));
      }
      setPending(false);
    }
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
    router.push(modalRedirectTo);
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
      setAutosaveMessage('Recuperamos tu progreso guardado.');
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
    selectedPaymentMethodIds,
    startTime,
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
          isCreateMode ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]' : 'max-w-4xl space-y-5'
        }
        noValidate
      >
        {isCreateMode ? (
          <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)] sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mulberry/75">
                  Crear evento
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-eastman-extrabold text-slate-900">
                    {activeCreateStep.title}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-mulberry/10 px-3 py-1 text-xs font-semibold text-mulberry">
                    Paso {createStep} de {CREATE_EVENT_STEPS.length}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{activeCreateStep.description}</p>
              </div>

              {createStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextCreateStep}
                  className="hidden h-11 items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760] lg:inline-flex"
                >
                  Continuar
                </button>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-3 lg:min-w-[260px]">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>Progreso</span>
                  <span>{createProgressPercent}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-mulberry transition-all duration-300"
                    style={{ width: `${createProgressPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {createStep < 4
                    ? 'Primero define lo esencial. La publicación queda para el final.'
                    : isPublished
                      ? 'Solo publicaremos cuando cobro y reserva estén listos.'
                      : 'Puedes guardarlo como borrador y volver luego.'}
                </p>
              </div>

              {autosaveMessage ? (
                <div className="flex items-center justify-end">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {autosaveMessage}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-4">
              {CREATE_EVENT_STEPS.map((step) => {
                const isActive = step.id === createStep;
                const isCompleted = step.id < createStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (isCompleted) moveToCreateStep(step.id);
                    }}
                    className={[
                      'flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition',
                      isActive
                        ? 'border-mulberry/20 bg-mulberry/[0.05]'
                        : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/80 hover:border-emerald-300'
                          : 'border-slate-200 bg-slate-50/85',
                      isCompleted
                        ? 'cursor-pointer'
                        : isActive
                          ? 'cursor-default'
                          : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        isActive
                          ? 'bg-mulberry text-white'
                          : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-500 ring-1 ring-slate-200',
                      ].join(' ')}
                    >
                      {isCompleted ? '✓' : step.id}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {isCompleted ? 'Listo' : isActive ? 'Ahora' : 'Luego'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                {createStep < 4
                  ? 'Puedes avanzar con calma. El progreso queda guardado mientras completas el flujo.'
                  : isPublished
                    ? 'Revisaremos lo que falte antes de dejarlo visible en la plataforma.'
                    : 'Al guardar como borrador, podrás volver exactamente donde te quedaste.'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetCreateDraft}
                  className="text-xs font-semibold text-mulberry transition hover:underline"
                >
                  Empezar de nuevo
                </button>
              </div>
            </div>

            {wizardError ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Base del evento</h3>
              <p className="mt-1 text-sm text-slate-600">
                Define el plan principal para que las jugadoras entiendan rápido de qué se trata.
              </p>
            </div>

            <div className="grid gap-4">
              <Input
                label="Título"
                name="title"
                required
                value={eventTitle}
                onChange={(event) => setEventTitle(event.currentTarget.value)}
                bgColor="bg-white"
                tone="soft"
              />

              <label className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">Descripción</div>
                <textarea
                  name="description"
                  value={eventDescription}
                  onChange={(event) => setEventDescription(event.currentTarget.value)}
                  rows={4}
                  className={FLOW_TEXTAREA_CLASS}
                  required
                />
              </label>

              <div className="pt-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Horario del partido</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Elige fecha, hora de inicio y duración. El fin se calcula solo y puedes
                      ajustarlo si hace falta.
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    Hora Lima
                  </span>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,1fr,1.1fr]">
                  <label className="w-full">
                    <div className="mb-1 text-sm font-semibold text-slate-700">Fecha *</div>
                    <input
                      type="date"
                      value={startDateValue}
                      onChange={(event) => {
                        syncScheduleStart(event.currentTarget.value, startClockValue);
                      }}
                      className={FLOW_FIELD_CLASS}
                    />
                  </label>

                  <label className="w-full">
                    <div className="mb-1 text-sm font-semibold text-slate-700">
                      Hora de inicio *
                    </div>
                    <input
                      type="time"
                      value={startClockValue}
                      onChange={(event) => {
                        syncScheduleStart(startDateValue, event.currentTarget.value);
                      }}
                      className={FLOW_FIELD_CLASS}
                    />
                  </label>

                  <div className="w-full">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-700">Duración</span>
                      <button
                        type="button"
                        onClick={() => setShowExactEndEditor((current) => !current)}
                        className="text-xs font-semibold text-mulberry transition hover:underline"
                      >
                        {showExactEndEditor ? 'Ocultar fin exacto' : 'Editar fin exacto'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_DURATION_OPTIONS.map((durationOption) => (
                        <button
                          key={durationOption}
                          type="button"
                          onClick={() => applySuggestedEndTime(durationOption)}
                          className={[
                            'inline-flex rounded-full border px-3 py-2 text-xs font-semibold transition',
                            preferredDurationMinutes === durationOption && !showExactEndEditor
                              ? 'border-mulberry bg-mulberry text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-mulberry hover:text-mulberry',
                          ].join(' ')}
                        >
                          {formatDurationLabel(durationOption)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`mt-4 px-4 py-4 ${FLOW_PANEL_CLASS}`}>
                  {schedulePreview.start ? (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Horario calculado
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {schedulePreview.dayLabel} · {schedulePreview.startLabel}
                          {schedulePreview.hasValidRange ? ` - ${schedulePreview.endLabel}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {schedulePreview.hasValidRange
                            ? `Duración estimada: ${schedulePreview.durationLabel}.`
                            : 'Todavía falta definir a qué hora termina.'}
                        </p>
                        {schedulePreview.spansMultipleDays ? (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            El fin cae al día siguiente. Revisa que esa sea la intención.
                          </p>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">
                        Recomendación: los partidos abiertos suelen funcionar mejor entre 90 y 120
                        min.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Define fecha y hora de arranque para ver el horario final del partido.
                    </p>
                  )}
                </div>

                {showExactEndEditor ? (
                  <label className="mt-4 block max-w-md">
                    <div className="mb-1 text-sm font-semibold text-slate-700">Fin exacto *</div>
                    <input
                      name="endTimeEditor"
                      type="datetime-local"
                      value={endTime}
                      onChange={(event) => setEndTime(event.currentTarget.value)}
                      min={startTime || undefined}
                      className={[
                        FLOW_FIELD_CLASS,
                        timeError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '',
                      ].join(' ')}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Úsalo solo si necesitas un cierre distinto al sugerido o un fin al día
                      siguiente.
                    </p>
                    {timeError ? (
                      <p className="mt-2 text-xs font-medium text-red-600">{timeError}</p>
                    ) : null}
                  </label>
                ) : null}

                <input type="hidden" name="startTime" value={startTime} readOnly />
                <input type="hidden" name="endTime" value={endTime} readOnly />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Mínimo de jugadoras"
                  name="minUsers"
                  type="number"
                  required
                  value={minUsersValue}
                  onChange={(event) => setMinUsersValue(event.currentTarget.value)}
                  bgColor="bg-white"
                  tone="soft"
                />

                <Input
                  label="Máximo de jugadoras"
                  name="maxUsers"
                  type="number"
                  required
                  value={maxUsersValue}
                  onChange={(event) => setMaxUsersValue(event.currentTarget.value)}
                  bgColor="bg-white"
                  tone="soft"
                />
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
              <h3 className="text-lg font-semibold text-slate-900">Ubicación y precio</h3>
              <p className="mt-1 text-sm text-slate-600">
                Guarda el nombre del lugar si te sirve como referencia y usa la dirección para
                ubicar el evento en el mapa.
              </p>
            </div>

            <div className="grid gap-4">
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
                <p className="mt-1 text-xs text-slate-500">
                  Se guarda tal como lo escribas. No cambia la dirección ni el mapa.
                </p>
              </label>

              <label className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">Dirección *</div>
                {googleMapsApiKeyConfigured && isGoogleMapsLoaded ? (
                  <Autocomplete
                    onLoad={handleAddressAutocompleteLoad}
                    onPlaceChanged={handleAddressPlaceChanged}
                    options={{
                      componentRestrictions: { country: 'pe' },
                      fields: ['address_components', 'formatted_address', 'geometry', 'name'],
                    }}
                  >
                    <input
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
                  Puedes escribir una dirección o el nombre de un lugar. Si Google lo encuentra,
                  ubicaremos el punto en el mapa.
                </p>
              </label>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">Ajustar ubicación *</div>
                {googleMapsApiKeyConfigured ? (
                  googleMapsLoadError ? (
                    <div className="rounded-[20px] bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200/80">
                      No se pudo cargar Google Maps.
                    </div>
                  ) : !isGoogleMapsLoaded ? (
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
                  <div className="rounded-[20px] bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200/80">
                    Falta configurar <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code>.
                  </div>
                )}
                <p className={`text-xs ${locationError ? 'text-red-600' : 'text-slate-500'}`}>
                  {locationError ||
                    'Puedes hacer clic o mover el pin para ajustar la ubicación exacta sin cambiar la dirección escrita.'}
                </p>
                {geoError ? <p className="text-xs text-amber-700">{geoError}</p> : null}
                <input type="hidden" name="lat" value={lat} readOnly />
                <input type="hidden" name="lng" value={lng} readOnly />
                <input type="hidden" name="district" value={districtText} readOnly />
              </div>

              <div className="max-w-sm">
                <Input
                  label="Precio (S/.)"
                  name="price"
                  type="number"
                  step="0.01"
                  required
                  value={priceValue}
                  onChange={(event) => setPriceValue(event.currentTarget.value)}
                  bgColor="bg-white"
                  tone="soft"
                />
              </div>
            </div>
          </section>

          <section
            className={[
              FLOW_SURFACE_CLASS,
              isCreateMode && createStep !== 3 ? 'hidden' : 'block',
            ].join(' ')}
          >
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Detalles y cobro</h3>
              <p className="mt-1 text-sm text-slate-600">
                Aquí defines el contexto del partido y cómo recibirás los pagos.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="w-full">
                  <div className="mb-1 text-sm font-semibold text-slate-700">Tipo de evento *</div>
                  <select
                    name="eventTypeId"
                    value={selectedEventTypeId}
                    onChange={(event) => setSelectedEventTypeId(event.currentTarget.value)}
                    className={FLOW_NATIVE_SELECT_CLASS}
                    required
                  >
                    {eventTypes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="w-full">
                  <div className="mb-1 text-sm font-semibold text-slate-700">Nivel *</div>
                  <select
                    name="levelId"
                    value={selectedLevelId}
                    onChange={(event) => setSelectedLevelId(event.currentTarget.value)}
                    className={FLOW_NATIVE_SELECT_CLASS}
                    required
                  >
                    {levels.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">
                  Métodos de pago permitidos {isPublished ? '*' : '(opcional por ahora)'}
                </div>
                <SelectComponent
                  options={paymentMethodOptions}
                  value={selectedActivePaymentMethodIds}
                  onChange={(value) => {
                    const nextIds = Array.isArray(value)
                      ? value
                          .map((item) => Number(item))
                          .filter((item) => Number.isInteger(item) && item > 0)
                      : [];
                    setSelectedPaymentMethodIds(nextIds);
                    if (nextIds.length > 0) {
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
                      No hay métodos disponibles todavía.
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
                      ? `${selectedActivePaymentMethodIds.length} método(s) seleccionado(s).`
                      : isPublished
                        ? 'Selecciona uno o más métodos para publicar este evento.'
                        : 'Puedes agregar métodos de pago después, antes de publicar.'}
                  </p>
                )}
                {paymentMethodsError ? (
                  <p className="mt-1 text-xs text-red-600">{paymentMethodsError}</p>
                ) : null}
                {selectedActivePaymentMethodIds.map((paymentMethodId) => (
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

              <div className="w-full">
                <div className="mb-1 text-sm font-semibold text-slate-700">Features</div>
                <SelectComponent
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
                    ? `${selectedFeatureIds.length} feature(s) seleccionada(s).`
                    : 'Selecciona una o más features para el evento.'}
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
              <h3 className="text-lg font-semibold text-slate-900">Final</h3>
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

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
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
                        <p className="mt-2 text-xs text-red-600">{fieldReservedError}</p>
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
                                <Link
                                  href={paymentMethodsHref}
                                  onClick={() => {
                                    trackEvent('create_event_payment_setup_clicked', {
                                      channel: 'web',
                                      source: 'wizard_publish_checklist',
                                      step: createStep,
                                    });
                                  }}
                                  className="mt-2 inline-flex text-xs font-semibold text-mulberry hover:underline"
                                >
                                  Ir a Formas de pago
                                </Link>
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

        {isCreateMode ? (
          <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <EventPreview
              title={eventTitle}
              description={eventDescription}
              endTime={endTime}
              placeText={placeText || initial?.placeText || ''}
              locationText={locationText || initial?.locationText || ''}
              district={districtText}
              startTime={startTime}
              price={Number(priceValue) || undefined}
              minUsers={Number(minUsersValue) || undefined}
              maxUsers={Number(maxUsersValue) || undefined}
              eventType={selectedEventType}
              level={selectedLevel}
              isPublished={isPublished}
            />
          </div>
        ) : null}

        <div
          className={[
            'flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)]',
            isCreateMode ? 'xl:col-span-2' : '',
          ].join(' ')}
        >
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
            <button
              type="button"
              onClick={handleNextCreateStep}
              className="inline-flex h-11 items-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760] lg:hidden"
            >
              Continuar
            </button>
          ) : (
            <ButtonWrapper
              width="fit-content"
              htmlType="submit"
              disabled={pending || Boolean(timeError) || Boolean(locationError)}
            >
              {pending ? pendingLabel : resolvedSubmitLabel}
            </ButtonWrapper>
          )}

          {isCreateMode ? (
            <p className="text-sm text-slate-500">
              {createStep < 4
                ? 'Puedes volver atrás cuando quieras antes de publicar.'
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
      </form>

      {isCreateMode ? (
        <EventShareModal
          isOpen={showCreateModal}
          status={createModalStatus}
          eventTitle={shareTitle || String(initial?.title || 'Evento')}
          message={submitMessage}
          shareUrl={shareUrl}
          managementHref={createdEventId ? `/admin/events/${createdEventId}/edit` : modalRedirectTo}
          managementLabel={createdEventId ? 'Abrir gestión del evento' : 'Ir a mis eventos'}
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
