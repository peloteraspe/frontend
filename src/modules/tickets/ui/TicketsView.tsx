import { TitleXL } from '@core/ui/Typography';
import Badge from '@core/ui/Badge';
import Calendar from '@core/assets/images/calendar.png';
import Ubication from '@core/assets/images/ubication.png';
import Ball from '@core/assets/images/ball.png';
import Image from 'next/image';
import Link from 'next/link';
import { formattedPrice } from '@shared/lib/utils';
import type { TicketEvent } from '../model/TicketEvent';

function getTicketStatusCopy(status?: string) {
  if (status === 'active') {
    return {
      label: 'Lista para ingreso',
      classes: 'bg-emerald-100 text-emerald-700',
      showQr: true,
      helperText: 'Presenta este QR en el ingreso. No compartas tu código.',
    };
  }
  if (status === 'used') {
    return {
      label: 'Ingreso registrado',
      classes: 'bg-slate-200 text-slate-700',
      showQr: true,
      helperText: 'Esta entrada ya fue validada en puerta.',
    };
  }
  if (status === 'revoked') {
    return {
      label: 'Entrada cancelada',
      classes: 'bg-red-100 text-red-700',
      showQr: false,
      helperText: 'La reserva fue cancelada o rechazada. Si fue un error, contacta soporte.',
    };
  }
  return {
    label: 'Pago en revisión',
    classes: 'bg-amber-100 text-amber-700',
    showQr: false,
    helperText: 'Tu pago está en validación. El QR se habilitará cuando sea aprobado.',
  };
}

function TicketEventCard({ event }: { event: TicketEvent }) {
  const ticket = event.ticket;
  const statusCopy = getTicketStatusCopy(ticket?.status);
  const levelName = event?.level?.name || event?.levelName || 'Sin nivel';
  const features = Array.isArray(event?.featuresData) ? event.featuresData : [];
  const priceValue = Number(event?.price ?? 0);
  const formattedDate = event.formattedDateTime || 'Fecha por confirmar';
  const locationText = event.locationText || 'Ubicación por confirmar';

  return (
    <article className="relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:p-6">
      <span className="pointer-events-none absolute -left-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full border border-slate-200 bg-slate-100 lg:block" />
      <span className="pointer-events-none absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full border border-slate-200 bg-slate-100 lg:block" />

      <div className="mb-4 flex items-center justify-between border-b border-dashed border-slate-200 pb-3 text-xs uppercase tracking-wide text-slate-500">
        <p>Entrada digital</p>
        <p>{ticket?.id ? `Ticket #${ticket.id}` : `Evento #${event.id}`}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr_170px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col items-center gap-3">
          {statusCopy.showQr && ticket?.qrImageUrl ? (
            <img
              src={ticket.qrImageUrl}
              alt={`QR de entrada ${event.title || event.id}`}
              className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-2 sm:h-52 sm:w-52"
              loading="lazy"
            />
          ) : (
            <div className="grid h-44 w-44 place-items-center rounded-xl border border-slate-200 bg-white sm:h-52 sm:w-52">
              <Image src={Ball} alt="ball" width={64} height={64} />
            </div>
          )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCopy.classes}`}>
              {statusCopy.label}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 uppercase lg:pr-4">
          <p className="text-sm font-bold text-btnBg-light">NIVEL: {levelName}</p>
          <p className="text-2xl font-bold text-slate-800 sm:text-4xl">{event.title || 'Evento'}</p>

          <div className="flex items-center gap-1 text-sm font-semibold text-btnBg-light">
            <Image src={Calendar} alt="calendar" width={15} />
            {formattedDate}
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-btnBg-light">
            <Image src={Ubication} alt="location" width={15} />
            {locationText}
          </div>

          <div className="flex justify-start gap-1 max-w-[92vw] overflow-scroll sm:max-w-none sm:overflow-hidden">
            {features.map((feature: any, index: number) => (
              <Badge
                key={`${event.id}-feature-${index}`}
                text={String(feature?.feature?.name || 'Extra').toUpperCase()}
                icon={true}
                badgeType="Primary"
              />
            ))}
          </div>

          <p className="text-xs normal-case text-slate-500">{statusCopy.helperText}</p>

          <div className="flex flex-wrap gap-2 normal-case">
            {ticket?.appleWalletUrl ? (
              <a
                href={ticket.appleWalletUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                Apple Wallet
              </a>
            ) : (
              <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-400">
                Apple Wallet pronto
              </span>
            )}

            {ticket?.googleWalletUrl ? (
              <a
                href={ticket.googleWalletUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                Google Wallet
              </a>
            ) : (
              <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-400">
                Google Wallet pronto
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between gap-3 border-t border-dashed border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="text-4xl font-bold uppercase text-btnBg-light sm:text-[52px]">
            {formattedPrice(priceValue)}
          </p>
          <Link
            href={`/events/${event.id}`}
            className="inline-flex rounded-lg border border-btnBg-light px-3 py-2 text-xs font-semibold normal-case text-btnBg-light hover:bg-btnBg-light hover:text-white"
          >
            Ver evento
          </Link>
        </div>
      </div>
    </article>
  );
}

function TicketCardsList({ events }: { events: TicketEvent[] }) {
  if (!events.length) return null;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {events.map((event) => (
        <TicketEventCard key={`ticket-card-${event.id}`} event={event} />
      ))}
    </div>
  );
}

export default function TicketsView({
  upcoming,
  past,
}: {
  upcoming: TicketEvent[];
  past: TicketEvent[];
}) {
  return (
    <div className="md:max-w-screen-md lg:max-w-screen-md xl:max-w-screen-xl mx-auto flex flex-col justify-between w-full p-4 mt-12">
      <div>
        <TitleXL>Mis entradas</TitleXL>

        <div className="my-8">
          {upcoming.length > 0 ? <TicketCardsList events={upcoming} /> : <p>No tienes entradas disponibles.</p>}
        </div>

        <TitleXL>Entradas Pasadas</TitleXL>

        <div className="my-8">
          {past.length > 0 ? <TicketCardsList events={past} /> : <p>No tienes entradas pasadas.</p>}
        </div>
      </div>
    </div>
  );
}
