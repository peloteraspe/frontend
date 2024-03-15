
import { getAllEvents } from "@/app/_actions/event";
import CardEventItem from "./CardEventItem";


const CardEventList = async() => {
  //let cardEvents;
  const cardEvents = await getAllEvents();
  return (
    <div className="pb-8 md:pb-16">
        <h2 className="text-3xl font-bold font-inter mb-10">Eventos deportivos:</h2>
        <div className="flex flex-col">
            <CardEventItem cardEvents={cardEvents}/>
        </div>
    </div>
  )
}

export default CardEventList
