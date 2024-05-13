import { TitleXL } from '@/components/atoms/Typography';
import CardEventItem from '@/components/cardEvents/CardEventItem';

const fetchEvents = async (userId) => {
  const res = await fetch(`${process.env.BACKEND_URL}/event?userId=${userId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch events');
  }
  return res.json();
};

const Tickets = async ({ params }) => {
  const { userId } = params;
  let events;
  try {
    events = await fetchEvents(userId);
  } catch (error) {
    console.error('Error fetching events:', error);
    events = [];
  }

  const currentDate = new Date();
  const upcomingEvents = events.filter(
    (event) =>
      new Date(event.formattedDateTime.split('|')[1].trim()) > currentDate
  );
  const pastEvents = events.filter(
    (event) =>
      new Date(event.formattedDateTime.split('|')[1].trim()) <= currentDate
  );

  return (
    <div className="md:max-w-screen-md lg:max-w-screen-md xl:max-w-screen-xl mx-auto flex flex-col justify-between w-full p-4 mt-12">
      <div className="">
        <TitleXL>Mis entradas</TitleXL>
        <div className="flex justify-between items-center my-8">
          {upcomingEvents.length > 0 ? (
            <CardEventItem cardEvents={upcomingEvents} />
          ) : (
            <p>No tienes entradas disponibles.</p>
          )}
        </div>
        <TitleXL>Entradas Pasadas</TitleXL>
        <div className="flex justify-between items-center my-8">
          {pastEvents.length > 0 ? (
            <CardEventItem cardEvents={pastEvents} />
          ) : (
            <p>No tienes entradas pasadas.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tickets;
