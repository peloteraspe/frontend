import { TitleXL } from '@core/ui/Typography';
import CardEventItem from '@modules/events/ui/cardEvents/CardEventItem';
import type { TicketEvent } from '../model/TicketEvent';

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

        <TitleXL>Entradas Pasadas</TitleXL>

        <div className="flex justify-between items-center my-8">
          {past.length > 0 ? (
            <CardEventItem cardEvents={past} />
          ) : (
            <p>No tienes entradas pasadas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
