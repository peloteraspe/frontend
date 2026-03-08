'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Input from '@src/core/ui/Input';
import { ButtonWrapper } from '@src/core/ui/Button';
import SelectComponent from '@core/ui/SelectComponent';
import Map, { MapRef, Marker, NavigationControl } from 'react-map-gl/mapbox';
import { CatalogOption } from '@modules/events/model/types';
import { useRouter } from 'next/navigation';
import EventShareModal, { EventShareModalStatus } from '@modules/admin/ui/events/EventShareModal';

type SubmitResult = {
  eventId?: string | number;
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
    locationText: string;
    lat: number;
    lng: number;
    eventTypeId: number;
    levelId: number;
    featureIds: number[];
    isFeatured: boolean;
  }>;
  eventTypes: CatalogOption[];
  levels: CatalogOption[];
  features?: CatalogOption[];
  onSubmit: (form: FormData) => Promise<void | SubmitResult>;
  submitLabel: string;
  canManageFeatured?: boolean;
  successRedirectTo?: string;
};

const DEFAULT_LAT = -12.0464;
const DEFAULT_LNG = -77.0428;
const MIN_PENDING_MS = 450;

function asFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DISTRICT_CONTEXT_TYPES = new Set(['district', 'locality', 'place', 'neighborhood']);
const DISTRICT_TYPE_PRIORITY: Record<string, number> = {
  district: 1,
  locality: 2,
  place: 3,
  neighborhood: 4,
};

type DistrictOption = {
  id: string;
  type: string;
  value: string;
  label: string;
};

function normalizeKey(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function districtOptionsFromFeature(feature: any): DistrictOption[] {
  if (!feature) return [];

  const context = Array.isArray(feature?.context) ? feature.context : [];
  const region = String(
    context.find((item) => String(item?.id || '').startsWith('region'))?.text || ''
  ).trim();
  const country = String(
    context.find((item) => String(item?.id || '').startsWith('country'))?.text || ''
  ).trim();

  const rawItems = [feature, ...context];
  const options: DistrictOption[] = [];
  const seen = new Set<string>();

  for (const item of rawItems) {
    const rawId = String(item?.id || '').trim();
    const type = rawId.split('.')[0] || '';
    if (!DISTRICT_CONTEXT_TYPES.has(type)) continue;

    const districtName = String(item?.text || item?.place_name || '').trim();
    if (!districtName) continue;

    const value = [districtName, region, country].filter(Boolean).join(', ') || districtName;
    const key = normalizeKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    options.push({
      id: rawId || `${type}:${key}`,
      type,
      value,
      label: value,
    });
  }

  return options.sort(
    (a, b) =>
      (DISTRICT_TYPE_PRIORITY[a.type] ?? Number.MAX_SAFE_INTEGER) -
      (DISTRICT_TYPE_PRIORITY[b.type] ?? Number.MAX_SAFE_INTEGER)
  );
}

function mergeDistrictOptions(current: DistrictOption[], next: DistrictOption[]) {
  const merged = [...current];
  const seen = new Set(current.map((item) => normalizeKey(item.value)));

  for (const option of next) {
    const key = normalizeKey(option.value);
    if (!key || seen.has(key)) continue;
    merged.push(option);
    seen.add(key);
  }

  return merged;
}

type LocationSuggestion = {
  id: string;
  label: string;
  districtLabel: string;
  districtOptions: DistrictOption[];
  lat: number;
  lng: number;
};

function normalizeSuggestion(feature: any): LocationSuggestion | null {
  const center = Array.isArray(feature?.center) ? feature.center : [];
  const lng = Number(center[0]);
  const lat = Number(center[1]);
  const label = String(feature?.place_name || '').trim();

  if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const districtOptions = districtOptionsFromFeature(feature);

  return {
    id: String(feature?.id || `${lat},${lng}`),
    label,
    districtLabel: districtOptions[0]?.label || '',
    districtOptions,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

const EventForm = ({
  initial,
  eventTypes,
  levels,
  features = [],
  onSubmit,
  submitLabel,
  canManageFeatured = false,
  successRedirectTo,
}: Props) => {
  const router = useRouter();
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [pending, setPending] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [locationText, setLocationText] = useState(initial?.locationText ?? '');
  const [districtText, setDistrictText] = useState(() => String(initial?.district || '').trim());
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>(() => {
    const base = String(initial?.district || '').trim();
    if (!base) return [];
    return [{ id: `initial:${normalizeKey(base)}`, type: 'manual', value: base, label: base }];
  });
  const [lat, setLat] = useState(() => asFiniteNumber(initial?.lat, DEFAULT_LAT));
  const [lng, setLng] = useState(() => asFiniteNumber(initial?.lng, DEFAULT_LNG));
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>(() => {
    const input = Array.isArray(initial?.featureIds) ? initial.featureIds : [];
    return Array.from(
      new Set(
        input
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    );
  });
  const [pinSelected, setPinSelected] = useState(() =>
    Number.isFinite(Number(initial?.lat)) && Number.isFinite(Number(initial?.lng))
  );
  const [geoError, setGeoError] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const mapRef = useRef<MapRef>(null);

  const timeError = useMemo(() => {
    if (!startTime || !endTime) return '';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Formato de fecha/hora inválido.';
    if (end <= start) return 'La fecha y hora de fin debe ser posterior al inicio.';
    return '';
  }, [startTime, endTime]);

  const selectedEventTypeId = useMemo(() => {
    const initialId = Number(initial?.eventTypeId);
    if (eventTypes.some((option) => option.id === initialId)) return String(initialId);
    return String(eventTypes[0]?.id ?? 1);
  }, [eventTypes, initial?.eventTypeId]);

  const selectedLevelId = useMemo(() => {
    const initialId = Number(initial?.levelId);
    if (levels.some((option) => option.id === initialId)) return String(initialId);
    return String(levels[0]?.id ?? 1);
  }, [levels, initial?.levelId]);

  const featureOptions = useMemo(
    () => features.map((option) => ({ value: option.id, label: option.name })),
    [features]
  );
  const isCreateMode = useMemo(() => submitLabel.trim().toLowerCase() === 'crear', [submitLabel]);
  const pendingLabel = isCreateMode ? 'Creando evento...' : 'Guardando...';
  const modalRedirectTo = successRedirectTo || '/admin/events';

  const locationError = useMemo(() => {
    if (!pinSelected) {
      if (!mapboxToken) return 'Falta configurar NEXT_PUBLIC_MAPBOX_TOKEN para seleccionar ubicación.';
      return 'Selecciona un punto en el mapa para calcular latitud/longitud.';
    }
    return '';
  }, [mapboxToken, pinSelected]);

  async function fetchSuggestions(query: string, options: {
    types: string;
    proximity?: { lat: number; lng: number } | null;
    limit?: number;
  }) {
    if (!mapboxToken) return [] as LocationSuggestion[];

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return [] as LocationSuggestion[];

    const params = new URLSearchParams({
      access_token: mapboxToken,
      language: 'es',
      autocomplete: 'true',
      limit: String(options.limit ?? 6),
      types: options.types,
    });

    if (options.proximity) {
      params.set('proximity', `${options.proximity.lng},${options.proximity.lat}`);
    }

    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedQuery)}.json?${params.toString()}`;
    const response = await fetch(endpoint, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) return [] as LocationSuggestion[];

    return (Array.isArray(body?.features) ? body.features : [])
      .map(normalizeSuggestion)
      .filter(Boolean) as LocationSuggestion[];
  }

  useEffect(() => {
    const query = locationText.trim();
    if (!mapboxToken || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const nextSuggestions = await fetchSuggestions(query, {
          types: 'address,district,place,locality,neighborhood',
          proximity: { lat, lng },
          limit: 5,
        });

        if (!cancelled) {
          setLocationSuggestions(nextSuggestions);
          const nextDistrictOptions = nextSuggestions.flatMap(
            (suggestion) => suggestion.districtOptions
          );
          if (nextDistrictOptions.length > 0) {
            setDistrictOptions((prev) => mergeDistrictOptions(prev, nextDistrictOptions));
          }
        }
      } catch {
        if (!cancelled) {
          setLocationSuggestions([]);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [locationText, mapboxToken, lat, lng]);

  async function reverseGeocode(nextLat: number, nextLng: number) {
    if (!mapboxToken) return;

    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${nextLng},${nextLat}.json?access_token=${mapboxToken}&language=es&limit=1`;

    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || 'No se pudo obtener dirección.');

      const feature = body?.features?.[0];
      const nextDistrictOptions = districtOptionsFromFeature(feature);

      if (feature?.place_name) {
        setLocationText(feature.place_name);
      }
      if (nextDistrictOptions.length > 0) {
        setDistrictOptions((prev) => mergeDistrictOptions(prev, nextDistrictOptions));
        setDistrictText((prev) =>
          prev && nextDistrictOptions.some((option) => option.value === prev)
            ? prev
            : nextDistrictOptions[0].value
        );
      }
      setGeoError('');
    } catch {
      setGeoError('No se pudo autocompletar la dirección. Puedes escribirla manualmente.');
    }
  }

  async function handleMapSelection(nextLat: number, nextLng: number) {
    setLat(nextLat);
    setLng(nextLng);
    setPinSelected(true);
    await reverseGeocode(nextLat, nextLng);
  }

  function handleLocationSuggestionSelect(suggestion: LocationSuggestion) {
    setLocationText(suggestion.label);
    if (suggestion.districtOptions.length > 0) {
      setDistrictOptions((prev) => mergeDistrictOptions(prev, suggestion.districtOptions));
      setDistrictText(suggestion.districtOptions[0].value);
    }
    setLat(suggestion.lat);
    setLng(suggestion.lng);
    setPinSelected(true);
    setGeoError('');
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    mapRef.current?.easeTo({
      center: [suggestion.lng, suggestion.lat],
      zoom: 14,
      duration: 450,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      endMs <= startMs ||
      !districtText
    ) {
      return;
    }
    if (!pinSelected || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    setSubmitStatus('idle');
    setSubmitMessage('');
    setShareUrl('');
    setShareTitle('');
    if (isCreateMode) {
      setShowCreateModal(true);
    }
    setPending(true);
    const pendingStartedAt = Date.now();

    // Let the spinner paint before calling server action.
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    try {
      const result = await onSubmit(fd);
      if (isCreateMode) {
        const createdEventId = String((result && 'eventId' in result ? result.eventId : '') || '').trim();
        setSubmitStatus('success');
        if (createdEventId) {
          const origin = window.location.origin;
          setShareUrl(`${origin}/events/${createdEventId}`);
          setShareTitle(String(fd.get('title') || 'Evento'));
          setSubmitMessage('Evento creado con éxito. Ahora compártelo para que se inscriban.');
        } else {
          setSubmitMessage('Evento creado con éxito.');
        }
      } else {
        setSubmitStatus('success');
        setSubmitMessage('Evento guardado con éxito.');
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

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 max-w-2xl"
        noValidate
      >
        <Input label="Título" name="title" required defaultValue={initial?.title ?? ''} bgColor="bg-white" />

      <label className="w-full">
        <div className="mb-1 text-sm font-semibold text-slate-700">Descripción</div>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ''}
          rows={4}
          className="w-full rounded-lg border-2 border-mulberry bg-white px-4 py-2"
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Inicio"
          name="startTime"
          type="datetime-local"
          required
          value={startTime}
          onChange={(event) => setStartTime(event.currentTarget.value)}
          bgColor="bg-white"
        />

        <Input
          label="Fin"
          name="endTime"
          type="datetime-local"
          required
          value={endTime}
          onChange={(event) => setEndTime(event.currentTarget.value)}
          min={startTime || undefined}
          bgColor="bg-white"
          errorText={timeError || undefined}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Mínimo de jugadoras"
          name="minUsers"
          type="number"
          required
          defaultValue={initial?.minUsers ?? 10}
          bgColor="bg-white"
        />

        <Input
          label="Máximo de jugadoras"
          name="maxUsers"
          type="number"
          required
          defaultValue={initial?.maxUsers ?? 20}
          bgColor="bg-white"
        />
      </div>

      <Input
        label="Dirección"
        name="locationText"
        type="text"
        required
        value={locationText}
        onChange={(event) => {
          setLocationText(event.currentTarget.value);
          setShowLocationSuggestions(true);
        }}
        onFocus={() => setShowLocationSuggestions(true)}
        onBlur={() => {
          window.setTimeout(() => setShowLocationSuggestions(false), 150);
        }}
        autoComplete="off"
        bgColor="bg-white"
      />
      {showLocationSuggestions && locationSuggestions.length > 0 ? (
        <div className="-mt-3 rounded-lg border border-slate-200 bg-white shadow-sm">
          {locationSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleLocationSuggestionSelect(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
            >
              <div className="text-sm text-slate-900">{suggestion.label}</div>
              {suggestion.districtLabel ? (
                <div className="text-xs text-slate-500">{suggestion.districtLabel}</div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">Ubicación en mapa *</div>
        {mapboxToken ? (
          <div className="h-[300px] overflow-hidden rounded-lg border border-mulberry/30">
            <Map
              ref={mapRef}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={mapboxToken}
              initialViewState={{ latitude: lat, longitude: lng, zoom: 12 }}
              style={{ width: '100%', height: '100%' }}
              onClick={async (event) => {
                const nextLat = Number(event.lngLat.lat.toFixed(6));
                const nextLng = Number(event.lngLat.lng.toFixed(6));
                await handleMapSelection(nextLat, nextLng);
              }}
            >
              <NavigationControl position="top-right" />
              <Marker
                latitude={lat}
                longitude={lng}
                draggable
                onDragEnd={async (eventInfo) => {
                  const nextLat = Number(eventInfo.lngLat.lat.toFixed(6));
                  const nextLng = Number(eventInfo.lngLat.lng.toFixed(6));
                  await handleMapSelection(nextLat, nextLng);
                }}
              />
            </Map>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Falta configurar <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
          </div>
        )}
        <p className={`text-xs ${locationError ? 'text-red-600' : 'text-slate-500'}`}>
          {locationError || 'Ubicación lista. Puedes hacer clic o mover el pin para ajustar.'}
        </p>
        {geoError ? <p className="text-xs text-amber-700">{geoError}</p> : null}
        <input type="hidden" name="lat" value={lat} readOnly />
        <input type="hidden" name="lng" value={lng} readOnly />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="w-full">
          <div className="mb-1 text-sm font-semibold text-slate-700">Distrito *</div>
          <select
            name="district"
            value={districtText}
            onChange={(event) => setDistrictText(event.currentTarget.value)}
            className="w-full h-12 rounded-lg border-2 border-mulberry bg-white px-4 focus:outline-none focus:border-mulberry focus:ring-0"
            required
          >
            <option value="">
              {districtOptions.length === 0
                ? 'Selecciona dirección o pin para cargar distritos'
                : 'Selecciona un distrito'}
            </option>
            {districtOptions.map((district) => (
              <option key={`${district.id}:${district.value}`} value={district.value}>
                {district.label}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Precio (S/.)"
          name="price"
          type="number"
          step="0.01"
          required
          defaultValue={initial?.price ?? 0}
          bgColor="bg-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="w-full">
          <div className="mb-1 text-sm font-semibold text-slate-700">Tipo de evento *</div>
          <select
            name="eventTypeId"
            defaultValue={selectedEventTypeId}
            className="w-full h-12 rounded-lg border-2 border-mulberry bg-white px-4 focus:outline-none focus:border-mulberry focus:ring-0"
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
            defaultValue={selectedLevelId}
            className="w-full h-12 rounded-lg border-2 border-mulberry bg-white px-4 focus:outline-none focus:border-mulberry focus:ring-0"
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

      <label className="w-full">
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
        />
        <p className="mt-1 text-xs text-slate-500">
          {selectedFeatureIds.length > 0
            ? `${selectedFeatureIds.length} feature(s) seleccionada(s).`
            : 'Selecciona una o más features para el evento.'}
        </p>
        {selectedFeatureIds.map((featureId) => (
          <input key={featureId} type="hidden" name="featureIds" value={featureId} readOnly />
        ))}
      </label>

      {canManageFeatured ? (
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isFeatured"
            value="true"
            defaultChecked={Boolean(initial?.isFeatured)}
            className="h-4 w-4 accent-mulberry"
          />
          Mostrar como partido destacado en la landing
        </label>
      ) : (
        <p className="text-xs text-slate-500">
          Solo superadmin puede gestionar partidos destacados.
          {initial?.isFeatured ? ' Este evento está marcado como destacado.' : ''}
        </p>
      )}

        <div className="pt-2">
          <ButtonWrapper
            width="fit-content"
            htmlType="submit"
            disabled={pending || Boolean(timeError) || Boolean(locationError) || !districtText}
          >
            {pending ? pendingLabel : submitLabel}
          </ButtonWrapper>
          {!isCreateMode && !pending && submitStatus === 'success' && submitMessage ? (
            <p className="mt-3 text-sm text-emerald-700">{submitMessage}</p>
          ) : null}
          {!isCreateMode && !pending && submitStatus === 'error' && submitMessage ? (
            <p className="mt-3 text-sm text-red-600">{submitMessage}</p>
          ) : null}
        </div>
      </form>

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
    </>
  );
};

export default EventForm;
