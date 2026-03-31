'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, GoogleMap, MarkerF } from '@react-google-maps/api';
import Input from '@src/core/ui/Input';
import { ButtonWrapper } from '@src/core/ui/Button';
import SelectComponent from '@core/ui/SelectComponent';
import { CatalogOption } from '@modules/events/model/types';
import { useRouter } from 'next/navigation';
import EventShareModal, { EventShareModalStatus } from '@modules/admin/ui/events/EventShareModal';
import EventAnnouncementForm from '@modules/admin/ui/events/EventAnnouncementForm';
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

type SubmitResult = {
  eventId?: string | number;
  error?: string;
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

function asFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type PaymentMethodOption = {
  id: number;
  name: string;
  type: string;
  number: number | null;
  isActive: boolean;
};

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
  const googleMapsApiKeyConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useGoogleMapsApi();
  const [pending, setPending] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostEditAnnouncementModal, setShowPostEditAnnouncementModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [locationText, setLocationText] = useState(initial?.locationText ?? '');
  const [districtText, setDistrictText] = useState(() => String(initial?.district || '').trim());
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>(() => {
    const base = String(initial?.district || '').trim();
    if (!base) return [];
    return [{ id: `initial:${normalizeDistrictKey(base)}`, type: 'manual', value: base, label: base }];
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
  const [selectedPaymentMethodIds, setSelectedPaymentMethodIds] = useState<number[]>(() => {
    const input = Array.isArray(initial?.paymentMethodIds) ? initial.paymentMethodIds : [];
    return Array.from(
      new Set(
        input
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    );
  });
  const [paymentMethodsError, setPaymentMethodsError] = useState('');
  const [fieldReservedError, setFieldReservedError] = useState('');
  const [isPublished, setIsPublished] = useState(Boolean(initial?.isPublished ?? true));
  const [isFieldReservedConfirmed, setIsFieldReservedConfirmed] = useState(
    Boolean(initial?.isFieldReservedConfirmed)
  );
  const [pinSelected, setPinSelected] = useState(() =>
    Number.isFinite(Number(initial?.lat)) && Number.isFinite(Number(initial?.lng))
  );
  const [geoError, setGeoError] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

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
  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods.map((option) => {
        const methodType =
          option.type === 'yape_plin'
            ? 'Yape/Plin'
            : option.type === 'plin'
              ? 'Plin'
              : 'Yape';
        const numberText = option.number ? ` · ${option.number}` : '';
        const stateText = option.isActive ? '' : ' (Inactivo)';
        return {
          value: option.id,
          label: `${option.name} · ${methodType}${numberText}${stateText}`,
        };
      }),
    [paymentMethods]
  );
  const isCreateMode = useMemo(() => submitLabel.trim().toLowerCase() === 'crear', [submitLabel]);
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

  const locationError = useMemo(() => {
    if (!pinSelected) {
      if (!googleMapsApiKeyConfigured) {
        return 'Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_KEY para seleccionar ubicacion.';
      }
      return 'Selecciona un punto en el mapa para calcular latitud/longitud.';
    }
    return '';
  }, [googleMapsApiKeyConfigured, pinSelected]);

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

  function handleAutocompleteLoad(autocomplete: google.maps.places.Autocomplete) {
    autocompleteRef.current = autocomplete;
  }

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    const placeLocation = place?.geometry?.location;

    if (!place || !placeLocation) {
      setGeoError('Selecciona una ubicacion valida de las sugerencias.');
      return;
    }

    const nextCoords = toFixedLatLng(placeLocation.lat(), placeLocation.lng());
    const formattedAddress = String(place.formatted_address || place.name || '').trim();
    const nextDistrictOptions = extractDistrictOptionsFromAddressComponents(
      place.address_components,
      formattedAddress
    );

    setLocationText(formattedAddress || locationText);
    syncDistrictSelection(nextDistrictOptions, districtText);
    setLat(nextCoords.lat);
    setLng(nextCoords.lng);
    setPinSelected(true);
    setGeoError('');
    panMapToLocation(nextCoords.lat, nextCoords.lng);
  }

  async function reverseGeocode(nextLat: number, nextLng: number) {
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

      if (result?.formatted_address) {
        setLocationText(result.formatted_address);
      }
      syncDistrictSelection(nextDistrictOptions, districtText);
      setGeoError('');
    } catch {
      setGeoError('No se pudo autocompletar la dirección. Puedes escribirla manualmente.');
    }
  }

  async function handleMapSelection(nextLat: number, nextLng: number) {
    const nextCoords = toFixedLatLng(nextLat, nextLng);
    setLat(nextCoords.lat);
    setLng(nextCoords.lng);
    setPinSelected(true);
    setGeoError('');
    panMapToLocation(nextCoords.lat, nextCoords.lng);
    await reverseGeocode(nextCoords.lat, nextCoords.lng);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentMethodsError('');
    setFieldReservedError('');

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

    if (isPublished && selectedPaymentMethodIds.length === 0) {
      setPaymentMethodsError('Selecciona al menos un método de pago antes de publicar.');
      return;
    }

    if (isPublished && !isFieldReservedConfirmed) {
      setFieldReservedError('Confirma que la cancha ya está reservada antes de publicar.');
      return;
    }

    setSubmitStatus('idle');
    setSubmitMessage('');
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
        const createdEventId = String((result && 'eventId' in result ? result.eventId : '') || '').trim();
        setSubmitStatus('success');
        if (!isPublished) {
          setSubmitMessage('Borrador guardado con éxito.');
          if (createdEventId) {
            router.push(`/admin/events/${createdEventId}/edit`);
            return;
          }
          router.push(modalRedirectTo);
          return;
        }

        if (createdEventId) {
          const origin = window.location.origin;
          setShareUrl(`${origin}/events/${createdEventId}`);
          setSubmitMessage('Evento creado con éxito. Ahora compártelo para que se inscriban.');
        } else {
          setSubmitMessage('Evento creado con éxito.');
        }
      } else {
        setSubmitStatus('success');
        setSubmitMessage(isPublished ? 'Evento guardado con éxito.' : 'Borrador guardado con éxito.');
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
          className="w-full rounded-lg border-2 border-mulberry bg-white px-4 py-3 text-slate-900 focus:outline-none focus:border-mulberry focus:ring-0"
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

      <label className="w-full">
        <div className="mb-1 text-sm font-semibold text-slate-700">Direccion *</div>
        {googleMapsApiKeyConfigured && isGoogleMapsLoaded ? (
          <Autocomplete
            onLoad={handleAutocompleteLoad}
            onPlaceChanged={handlePlaceChanged}
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
              onChange={(event) => setLocationText(event.currentTarget.value)}
              autoComplete="off"
              className="h-12 w-full rounded-lg border-2 border-mulberry bg-white px-4 text-slate-900 focus:border-mulberry focus:outline-none focus:ring-0"
            />
          </Autocomplete>
        ) : (
          <input
            name="locationText"
            type="text"
            required
            value={locationText}
            onChange={(event) => setLocationText(event.currentTarget.value)}
            autoComplete="off"
            className="h-12 w-full rounded-lg border-2 border-mulberry bg-white px-4 text-slate-900 focus:border-mulberry focus:outline-none focus:ring-0"
          />
        )}
        <p className="mt-1 text-xs text-slate-500">
          Busca una direccion o cancha y selecciona una sugerencia para actualizar el pin.
        </p>
      </label>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">Ubicacion en mapa *</div>
        {googleMapsApiKeyConfigured ? (
          googleMapsLoadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              No se pudo cargar Google Maps.
            </div>
          ) : !isGoogleMapsLoaded ? (
            <div className="h-[300px] animate-pulse rounded-lg border border-mulberry/30 bg-slate-100" />
          ) : (
          <div className="h-[300px] overflow-hidden rounded-lg border border-mulberry/30">
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Falta configurar <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code>.
          </div>
        )}
        <p className={`text-xs ${locationError ? 'text-red-600' : 'text-slate-500'}`}>
          {locationError || 'Ubicacion lista. Puedes hacer clic o mover el pin para ajustar.'}
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
        <div className="mb-1 text-sm font-semibold text-slate-700">
          Métodos de pago permitidos {isPublished ? '*' : '(opcional por ahora)'}
        </div>
        <SelectComponent
          options={paymentMethodOptions}
          value={selectedPaymentMethodIds}
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
        />
        {paymentMethods.length === 0 ? (
          <p className="mt-1 text-xs text-amber-700">
            No hay métodos disponibles. Crea al menos uno en Admin {'>'} Formas de pago.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            {selectedPaymentMethodIds.length > 0
              ? `${selectedPaymentMethodIds.length} método(s) seleccionado(s).`
              : isPublished
                ? 'Selecciona uno o más métodos para publicar este evento.'
                : 'Puedes agregar métodos de pago después, antes de publicar.'}
          </p>
        )}
        {paymentMethodsError ? <p className="mt-1 text-xs text-red-600">{paymentMethodsError}</p> : null}
        {selectedPaymentMethodIds.map((paymentMethodId) => (
          <input
            key={`payment-method-${paymentMethodId}`}
            type="hidden"
            name="paymentMethodIds"
            value={paymentMethodId}
            readOnly
          />
        ))}
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
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
          <p className="text-sm font-semibold text-slate-800">Confirmo que el espacio de juego ya está reservado</p>
          <p className="mt-1 text-xs text-slate-500">
            Solo es obligatorio al publicar. Para guardar borrador puedes dejarlo pendiente.
          </p>
          {fieldReservedError ? <p className="mt-2 text-xs text-red-600">{fieldReservedError}</p> : null}
        </div>
      </label>

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
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Visible al público</p>
            <p className="text-xs text-slate-500">
              Si lo desactivas, el evento sale del listado público y se bloquean nuevas inscripciones.
            </p>
          </div>

          <span className="relative inline-flex h-6 w-11 shrink-0">
            <input
              type="checkbox"
              name="isPublished"
              value="true"
              checked={isPublished}
              onChange={(event) => {
                const nextIsPublished = event.currentTarget.checked;
                setIsPublished(nextIsPublished);
                if (!nextIsPublished) {
                  setPaymentMethodsError('');
                  setFieldReservedError('');
                }
              }}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      ) : (
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Visible al público</p>
            <p className="text-xs text-slate-500">
              Si lo desactivas, el evento sale del listado público y se bloquean nuevas inscripciones.
            </p>
          </div>

          <span className="relative inline-flex h-6 w-11 shrink-0">
            <input
              type="checkbox"
              name="isPublished"
              value="true"
              checked={isPublished}
              onChange={(event) => {
                const nextIsPublished = event.currentTarget.checked;
                setIsPublished(nextIsPublished);
                if (!nextIsPublished) {
                  setPaymentMethodsError('');
                  setFieldReservedError('');
                }
              }}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      )}

      {canManageFeatured ? (
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Mostrar como partido destacado en la landing
            </p>
            <p className="text-xs text-slate-500">Visible en la sección de destacados del inicio.</p>
          </div>

          <span className="relative inline-flex h-6 w-11 shrink-0">
            <input
              type="checkbox"
              name="isFeatured"
              value="true"
              defaultChecked={Boolean(initial?.isFeatured)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-mulberry" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      ) : null}

        <div className="pt-2">
          <ButtonWrapper
            width="fit-content"
            htmlType="submit"
            disabled={
              pending ||
              Boolean(timeError) ||
              Boolean(locationError) ||
              !districtText
            }
          >
            {pending ? pendingLabel : resolvedSubmitLabel}
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
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="max-h-[88vh] overflow-y-auto p-5 sm:p-6">
              <div className="mb-3 rounded-2xl border border-mulberry/20 bg-mulberry/5 px-4 py-3">
                <p id="post-edit-announcement-title" className="text-sm font-semibold text-mulberry">
                  Comunicado para inscritas
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Puedes usar el mensaje base y ajustar solo los detalles del evento. Todo lo que escribas en el box
                  se enviará con el template de correo de Peloteras.
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
