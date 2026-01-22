import { getAllEvents } from '@modules/events/api/event';
import CardEventItem from './CardEventItem';
import { log } from '@src/core/lib/logger';

const CardEventList = async () => {
  //let cardEvents;
  const cardEvents = await getAllEvents();
  log.debug('Retrieved events for card list', 'CARD_EVENT_LIST', {
    eventCount: cardEvents?.length,
  });
  return (
    <div className="pb-8 md:pb-16">
      <h2 className="text-3xl font-bold font-inter mb-10">Eventos deportivos:</h2>
      <div className="flex flex-col">
        <CardEventItem cardEvents={cardEvents} />
      </div>
    </div>
  );
};

export default CardEventList;
