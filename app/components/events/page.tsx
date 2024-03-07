import Sidebar from '@/components/layout/sidebar/Sidebar'
import { getAllEvents } from '@/lib/data/getAllEvents';
import { getAllFeatures } from '@/lib/data/getAllFeatures';


interface IndexPageProps {
    searchParams: {
      [key: string]: string | string[] | undefined
    }
}

const EventsPage = async ({searchParams}: IndexPageProps) => {

  const { priceRange, location } = searchParams
    
  const features = await getAllFeatures();
  const events  = await getAllEvents();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-8 md:py-16">
            <div className="md:flex md:justify-between" data-sticky-container>
                <Sidebar features={features} events={events}/>
                <div className="md:grow" id="main-content">
                    {priceRange} {', '}
                    {location}
              
                </div>
            </div>
        </div>
    </div>
  )
}

export default EventsPage
