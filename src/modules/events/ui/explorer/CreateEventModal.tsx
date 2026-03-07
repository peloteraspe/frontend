'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import Map, { MapRef, Marker, NavigationControl } from 'react-map-gl/mapbox';
import { CatalogOption, CreateEventPayload } from '@modules/events/model/types';

type Props = {
  isOpen: boolean;
  eventTypes: CatalogOption[];
  levels: CatalogOption[];
  onClose: () => void;
  onCreated: (id: string) => void;
};

type Draft = CreateEventPayload;

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

const EMPTY_DRAFT: Draft = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  price: 0,
  minUsers: 10,
  maxUsers: 20,
  district: '',
  locationText: '',
  locationReference: '',
  lat: -12.0464,
  lng: -77.0428,
  eventTypeId: 1,
  levelId: 1,
};

function getDistrictFromContext(context: any[]) {
  if (!Array.isArray(context)) return '';
  const district = context.find((item) => String(item.id || '').startsWith('place'));
  const region = context.find((item) => String(item.id || '').startsWith('region'));
  return [district?.text, region?.text].filter(Boolean).join(', ');
}

export default function CreateEventModal({ isOpen, eventTypes, levels, onClose, onCreated }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    ...EMPTY_DRAFT,
    eventTypeId: eventTypes[0]?.id ?? 1,
    levelId: levels[0]?.id ?? 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pinSelected, setPinSelected] = useState(false);
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
  const mapRef = useRef<MapRef>(null);

  const hasValidTimeRange = useMemo(() => {
    if (!draft.startTime || !draft.endTime) return false;
    const start = new Date(draft.startTime).getTime();
    const end = new Date(draft.endTime).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end > start;
  }, [draft.startTime, draft.endTime]);

  const canContinueStep1 = useMemo(() => {
    return (
      draft.title.trim().length > 2 &&
      draft.description.trim().length > 4 &&
      Boolean(draft.startTime) &&
      Boolean(draft.endTime) &&
      hasValidTimeRange &&
      Boolean(draft.eventTypeId) &&
      Boolean(draft.levelId)
    );
  }, [draft, hasValidTimeRange]);

  const hasMapPoint = Number.isFinite(draft.lat) && Number.isFinite(draft.lng);
  const canContinueStep2 =
    pinSelected && draft.locationText.trim().length > 3 && hasMapPoint && draft.district.trim().length > 0;

  if (!isOpen) return null;

  async function mapboxReverseGeocode(lat: number, lng: number) {
    if (!token) throw new Error('Falta NEXT_PUBLIC_MAPBOX_TOKEN para geocodificación.');
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es&limit=1`;

    const response = await fetch(endpoint, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.message || 'Error de reverse geocoding.');
    return body;
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const result = await mapboxReverseGeocode(lat, lng);
      const feature = result?.features?.[0];
      const nextDistrictOptions = districtOptionsFromFeature(feature);

      setDraft((prev) => ({
        ...prev,
        locationText: feature?.place_name || prev.locationText,
        district:
          nextDistrictOptions.length > 0
            ? nextDistrictOptions[0].value
            : getDistrictFromContext(feature?.context || []) || prev.district,
      }));
      if (nextDistrictOptions.length > 0) {
        setDistrictOptions((prev) => mergeDistrictOptions(prev, nextDistrictOptions));
      }
      setPinSelected(true);

      if (!feature?.place_name) {
        setError('No se encontró dirección exacta. Puedes editarla manualmente.');
      }
    } catch {
      setError('No se pudo obtener dirección automática. Puedes escribirla manualmente.');
      setPinSelected(true);
    }
  }

  async function useMyLocation() {
    setLocating(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        setDraft((prev) => ({ ...prev, lat, lng }));
        setPinSelected(true);
        mapRef.current?.easeTo({ center: [lng, lat], zoom: 14, duration: 500 });
        await reverseGeocode(lat, lng);
        setLocating(false);
      },
      (geoError) => {
        setError(geoError.message || 'No se pudo obtener tu ubicación.');
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!hasValidTimeRange) {
        throw new Error('La fecha y hora de fin debe ser posterior al inicio.');
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'No se pudo crear el evento.');
      }

      const createdId = String(body.id);
      setStep(1);
      setDraft({
        ...EMPTY_DRAFT,
        eventTypeId: eventTypes[0]?.id ?? 1,
        levelId: levels[0]?.id ?? 1,
      });
      setDistrictOptions([]);
      setPinSelected(false);
      onCreated(createdId);
      onClose();
    } catch (submitError: any) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Crear evento</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
            Cerrar
          </button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-3 text-sm">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => n <= step && setStep(n)}
                className={[
                  'h-8 w-8 rounded-full border text-sm font-semibold',
                  step >= n
                    ? 'bg-[#54086F] border-[#54086F] text-white'
                    : 'bg-white border-slate-300 text-slate-500',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Título</span>
                <input
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Descripción</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Inicio</span>
                <input
                  type="datetime-local"
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.startTime}
                  onChange={(e) => setDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Fin</span>
                <input
                  type="datetime-local"
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.endTime}
                  min={draft.startTime || undefined}
                  onChange={(e) => setDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </label>

              {draft.startTime && draft.endTime && !hasValidTimeRange ? (
                <p className="md:col-span-2 text-sm text-red-600">
                  La fecha y hora de fin debe ser posterior al inicio.
                </p>
              ) : null}

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Precio (S/)</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.price}
                  onChange={(e) => setDraft((prev) => ({ ...prev, price: Number(e.target.value) }))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Tipo de evento</span>
                <select
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.eventTypeId}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, eventTypeId: Number(e.target.value) }))
                  }
                >
                  {eventTypes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nivel</span>
                <select
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.levelId}
                  onChange={(e) => setDraft((prev) => ({ ...prev, levelId: Number(e.target.value) }))}
                >
                  {levels.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mínimo de jugadoras</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.minUsers}
                  onChange={(e) => setDraft((prev) => ({ ...prev, minUsers: Number(e.target.value) }))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Máximo de jugadoras</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  value={draft.maxUsers}
                  onChange={(e) => setDraft((prev) => ({ ...prev, maxUsers: Number(e.target.value) }))}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
                  disabled={locating}
                >
                  {locating ? 'Buscando...' : 'Usar mi ubicación'}
                </button>
              </div>

              {token ? (
                <div className="h-[320px] overflow-hidden rounded-xl border border-slate-200">
                  <Map
                    ref={mapRef}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={token}
                    initialViewState={{ latitude: draft.lat, longitude: draft.lng, zoom: 12 }}
                    style={{ width: '100%', height: '100%' }}
                    onClick={(ev) => {
                      const lat = Number(ev.lngLat.lat.toFixed(6));
                      const lng = Number(ev.lngLat.lng.toFixed(6));

                      setDraft((prev) => ({ ...prev, lat, lng }));
                      setPinSelected(true);
                      reverseGeocode(lat, lng);
                    }}
                  >
                    <NavigationControl position="top-right" />
                    <Marker
                      latitude={draft.lat}
                      longitude={draft.lng}
                      draggable
                      onDragEnd={(eventInfo) => {
                        const lat = Number(eventInfo.lngLat.lat.toFixed(6));
                        const lng = Number(eventInfo.lngLat.lng.toFixed(6));
                        setDraft((prev) => ({ ...prev, lat, lng }));
                        setPinSelected(true);
                        reverseGeocode(lat, lng);
                      }}
                    />
                  </Map>
                </div>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Falta configurar <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
                </div>
              )}

              <div className="grid gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Dirección (editable)</span>
                  <input
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                    value={draft.locationText}
                    onChange={(e) => setDraft((prev) => ({ ...prev, locationText: e.target.value }))}
                    placeholder="Primero elige el pin en el mapa, luego ajusta el texto si quieres"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Distrito</span>
                  <select
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                    value={draft.district}
                    onChange={(e) => setDraft((prev) => ({ ...prev, district: e.target.value }))}
                    required
                  >
                    <option value="">
                      {districtOptions.length === 0
                        ? 'Selecciona ubicación en el mapa para cargar distritos'
                        : 'Selecciona un distrito'}
                    </option>
                    {districtOptions.map((district) => (
                      <option key={`${district.id}:${district.value}`} value={district.value}>
                        {district.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Referencia de ubicación</span>
                  <input
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                    value={draft.locationReference || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, locationReference: e.target.value }))
                    }
                    placeholder="Ej: Frente al parque, puerta azul, 2do piso"
                  />
                </label>
              </div>

              <div className="pt-1">
                <p
                  className={[
                    'text-xs font-semibold',
                    pinSelected ? 'text-green-700' : 'text-amber-700',
                  ].join(' ')}
                >
                  {pinSelected
                    ? 'Pin seleccionado. Ajusta dirección y referencia si hace falta.'
                    : 'Selecciona primero un punto en el mapa para completar dirección.'}
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Puedes hacer clic o arrastrar el pin en el mapa para ajustar la ubicación.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="text-lg font-semibold text-slate-900">{draft.title}</h4>
                <p className="mt-2 text-sm text-slate-600">{draft.description || 'Sin descripción'}</p>
                <div className="mt-3 text-sm text-slate-700 space-y-1">
                  <p>Inicio: {draft.startTime}</p>
                  <p>Fin: {draft.endTime}</p>
                  <p>Tipo: {eventTypes.find((item) => item.id === draft.eventTypeId)?.name || '-'}</p>
                  <p>Nivel: {levels.find((item) => item.id === draft.levelId)?.name || '-'}</p>
                  <p>Dirección: {draft.locationText}</p>
                  <p>Referencia: {draft.locationReference || 'Sin referencia'}</p>
                  <p>
                    Coordenadas: {draft.lat}, {draft.lng}
                  </p>
                  <p>
                    Cupos: {draft.minUsers} a {draft.maxUsers}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex justify-between">
            <button
              type="button"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              disabled={step === 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Atrás
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev + 1)}
                disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
                className="rounded-lg bg-[#54086F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continuar
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#54086F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Publicando...' : 'Publicar evento'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
