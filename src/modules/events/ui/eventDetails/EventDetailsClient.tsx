'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import SoccerField from '@core/ui/SoccerField';
import Map from '@core/ui/Map';
import Collapse from '@core/ui/Collapse';
import { ButtonWrapper } from '@core/ui/Button';
import { useAuth } from '@core/auth/AuthProvider';

import arrowAnotarse from '@core/assets/images/arrow-anotarse.svg';
import Calendar from '@core/assets/images/calendar.png';

type Props = {
  data: any;
};

function extractExtraNames(post: any, event: any) {
  const candidates = [
    ...(Array.isArray(event?.featuresData) ? event.featuresData : []),
    ...(Array.isArray(post?.featuresData) ? post.featuresData : []),
    ...(Array.isArray(event?.features) ? event.features : []),
    ...(Array.isArray(post?.features) ? post.features : []),
    ...(Array.isArray(event?.extras) ? event.extras : []),
    ...(Array.isArray(post?.extras) ? post.extras : []),
  ];

  const names = candidates
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';
      const value =
        (item as any)?.feature?.name ??
        (item as any)?.name ??
        (item as any)?.label ??
        (item as any)?.title ??
        '';
      return String(value).trim();
    })
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();

  names.forEach((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(name);
  });

  return unique;
}

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  return fallback;
}

function getNameInitials(name: string) {
  const normalized = toText(name);
  if (!normalized) return '??';
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length >= 2) {
    return `${tokens[0][0] || ''}${tokens[1][0] || ''}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
}

export default function EventDetailsClient({ data }: Props) {
  const post = data;
  const router = useRouter();
  const { user } = useAuth();

  if (!post) return <div>No se encuentra el evento</div>;

  const event = post.event ?? post;
  const extras = extractExtraNames(post, event);

  const eventTitle = toText(event?.title ?? event?.description?.title, 'Evento sin título');
  const eventDescription =
    typeof event?.description === 'string'
      ? toText(event.description, 'Sin descripción registrada.')
      : toText(event?.description?.description, 'Sin descripción registrada.');

  const organizer = toText(event?.created_by ?? event?.createdBy, 'Peloteras');
  const locationText = toText(event?.location_text ?? event?.locationText, 'Ubicación por confirmar');

  const startTimeIso = event?.start_time ?? event?.startTime ?? null;
  const startDate = startTimeIso ? new Date(startTimeIso) : null;
  const formattedDate =
    startDate && !Number.isNaN(startDate.getTime())
      ? startDate.toLocaleString('es-PE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'Fecha por confirmar';
  const shortDate =
    startDate && !Number.isNaN(startDate.getTime())
      ? startDate.toLocaleDateString('es-PE', {
          day: 'numeric',
          month: 'short',
        })
      : 'Fecha por confirmar';

  const price = toNumber(event?.price, 0);
  const minUsers = toNumber(event?.min_users ?? event?.minUsers, 0);
  const maxUsers = toNumber(event?.max_users ?? event?.maxUsers, 0);

  const lat = toNumber(event?.location?.lat, 0);
  const lng = toNumber(event?.location?.lng ?? event?.location?.long, 0);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  const assistantsSource = Array.isArray(post?.assistants)
    ? post.assistants
    : Array.isArray(event?.assistants)
    ? event.assistants
    : [];

  const assistants = assistantsSource
    .filter((assistant: any) => {
      const state = toText(assistant?.state).toLowerCase();
      return !state || state === 'approved';
    })
    .map((assistant: any, index: number) => {
      const name = toText(assistant?.username ?? assistant?.name, `Participante ${index + 1}`);
      const id = String(assistant?.id ?? assistant?.user ?? `${name}-${index}`);
      return {
        id,
        name,
        initials: getNameInitials(name),
      };
    });

  const occupancyText = maxUsers > 0 ? `${assistants.length}/${maxUsers}` : `${assistants.length}`;

  const handleJoinClick = () => {
    if (!user) {
      router.push('/login?message=Inicia sesion para inscribirte a un evento');
      return;
    }
    if (!user.email_confirmed_at) {
      toast.error('Verifica tu identidad para poder inscribirte a este evento.');
      return;
    }
    router.push(`/payments/${event.id}`);
  };

  return (
    <div className="py-6 md:py-10">
      <div className="mb-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#54086F]"
          href="/"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
            />
          </svg>
          Todos los partidos
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <main className="order-2 space-y-6 lg:order-1">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{eventTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{eventDescription}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Fecha</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{shortDate}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Precio</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">S/ {price.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Cupos</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{occupancyText}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Alineación</h2>
              <span
                className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
                title="Las posiciones son una referencia visual y cambian en cada ingreso al evento."
              >
                Distribución referencial
              </span>
            </div>
            <SoccerField
              minUsers={minUsers}
              maxUsers={maxUsers}
              participants={assistants}
              onSelect={(position) => console.log('Posición seleccionada:', position)}
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="mb-3 text-xl font-bold text-slate-900">Participantes ({assistants.length})</h3>
            {assistants.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {assistants.map((assistant) => (
                  <li
                    key={assistant.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#54086F] text-xs font-semibold text-white">
                      {assistant.initials}
                    </span>
                    <span className="text-sm text-slate-800">{assistant.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">Aún no hay participantes confirmados.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="space-y-4">
              <Collapse title="Descripción" content={eventDescription} defaultOpen />
              <Collapse
                title="Extras"
                content={
                  extras.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {extras.map((extra) => (
                        <li
                          key={extra}
                          className="rounded-full border border-[#54086F]/20 bg-[#54086F]/5 px-3 py-1 text-xs font-semibold text-[#54086F]"
                        >
                          {extra}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Sin extras registrados.'
                  )
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="mb-3 text-xl font-bold text-slate-900">Ubicación</h3>
            {hasLocation ? (
              <Map lat={lat} lng={lng} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Este evento aún no tiene coordenadas válidas para mostrar el mapa.
              </div>
            )}
          </section>
        </main>

        <aside className="order-1 lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle del evento</p>
              <p className="mt-1 text-base font-semibold text-[#54086F]">Organiza: {organizer}</p>

              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Image className="mt-0.5" src={Calendar} alt="calendar" width={15} />
                  <span>{formattedDate}</span>
                </li>

                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 fill-[#54086F]"
                    viewBox="0 0 14 16"
                    aria-hidden="true"
                  >
                    <circle cx="7" cy="7" r="2" />
                    <path d="M6.3 15.7c-.1-.1-4.2-3.7-4.2-3.8C.7 10.7 0 8.9 0 7c0-3.9 3.1-7 7-7s7 3.1 7 7c0 1.9-.7 3.7-2.1 5-.1.1-4.1 3.7-4.2 3.8-.4.3-1 .3-1.4-.1Zm-2.7-5 3.4 3 3.4-3c1-1 1.6-2.2 1.6-3.6 0-2.8-2.2-5-5-5S2 4.2 2 7c0 1.4.6 2.7 1.6 3.7 0-.1 0-.1 0 0Z" />
                  </svg>
                  <span>{locationText}</span>
                </li>

                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-3.5 w-4 shrink-0 fill-[#54086F]"
                    viewBox="0 0 16 12"
                    aria-hidden="true"
                  >
                    <path d="M15 0H1C.4 0 0 .4 0 1v10c0 .6.4 1 1 1h14c.6 0 1-.4 1-1V1c0-.6-.4-1-1-1Zm-1 10H2V2h12v8Z" />
                    <circle cx="8" cy="6" r="2" />
                  </svg>
                  <span>S/ {price.toFixed(2)}</span>
                </li>
              </ul>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Participantes</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{occupancyText} inscritas</p>
              </div>

              <div className="mt-5">
                <ButtonWrapper
                  onClick={handleJoinClick}
                  icon={<Image src={arrowAnotarse} alt="arrow" width={24} height={24} />}
                  className="!my-0"
                >
                  Anotarme
                </ButtonWrapper>
              </div>
            </div>

          </div>
        </aside>
      </div>
    </div>
  );
}
