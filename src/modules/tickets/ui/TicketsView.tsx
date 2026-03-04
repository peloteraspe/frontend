import { TitleXL } from '@core/ui/Typography';
import CardEventItem from '@modules/events/ui/cardEvents/CardEventItem';
import type { TicketEvent } from '../model/TicketEvent';

function getTicketStatusCopy(status?: string) {
  if (status === 'active') return { label: 'Activa', classes: 'bg-emerald-100 text-emerald-700' };
  if (status === 'used') return { label: 'Usada', classes: 'bg-slate-200 text-slate-700' };
  if (status === 'revoked') return { label: 'Revocada', classes: 'bg-red-100 text-red-700' };
  return { label: 'Pendiente', classes: 'bg-amber-100 text-amber-700' };
}

function TicketAccessCards({ events }: { events: TicketEvent[] }) {
  if (!events.length) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 mt-4">
      {events.map((event) => {
        const ticket = event.ticket;
        const statusCopy = getTicketStatusCopy(ticket?.status);

        return (
          <article
            key={`ticket-access-${event.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{event.title || 'Evento'}</h3>
                <p className="text-xs text-slate-500">{event.formattedDateTime}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusCopy.classes}`}>
                {statusCopy.label}
              </span>
            </div>

            {ticket?.qrImageUrl ? (
              <div className="flex flex-col items-start gap-2">
                <img
                  src={ticket.qrImageUrl}
                  alt={`QR de entrada ${event.title || event.id}`}
                  className="h-36 w-36 rounded-lg border border-slate-200 bg-white p-2"
                  loading="lazy"
                />
                <p className="text-xs text-slate-500">
                  Presenta este QR al ingreso. No compartas tu código.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Tu QR se generará cuando la entrada esté habilitada.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {ticket?.appleWalletUrl ? (
                <a
                  href={ticket.appleWalletUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700"
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
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                >
                  Google Wallet
                </a>
              ) : (
                <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-400">
                  Google Wallet pronto
                </span>
              )}
            </div>
          </article>
        );
      })}
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

        <div className="flex justify-between items-center my-8">
          {upcoming.length > 0 ? (
            <CardEventItem cardEvents={upcoming} />
          ) : (
            <p>No tienes entradas disponibles.</p>
          )}
        </div>
        <TicketAccessCards events={upcoming} />

        <TitleXL>Entradas Pasadas</TitleXL>

        <div className="flex justify-between items-center my-8">
          {past.length > 0 ? (
            <CardEventItem cardEvents={past} />
          ) : (
            <p>No tienes entradas pasadas.</p>
          )}
        </div>
        <TicketAccessCards events={past} />
      </div>
    </div>
  );
}
