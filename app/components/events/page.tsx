import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Sidebar from '@/components/layout/sidebar/Sidebar'
import { notFound } from 'next/navigation';
import { getFeatures } from '@/lib/data/getFeatures';
import { getEvents } from '@/lib/data/getEvents';


interface IndexPageProps {
    searchParams: {
      [key: string]: string | string[] | undefined
    }
}

const EventsPage = async ({searchParams}: IndexPageProps) => {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { priceRange, location } = searchParams
    
  const features = await getFeatures();
  const events  = await getEvents();

  const { data: dataPost, error } = await supabase
    .from('event')
    .select('*')
    .eq('id', Number(location));
  

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-8 md:py-16">
            <div className="md:flex md:justify-between" data-sticky-container>
                <Sidebar features={features} events={events}/>
                <div className="md:grow" id="main-content">
                    {priceRange} {' y'}
                    
                    {dataPost?.map((e)=>{
                      return (
                        <div  key={e.id}>
                          {e.id}<br />
                          {e.title}<br />
                          lat: {e.location.lat}<br />
                          long: {e.location.long}
                        </div>
                      )
                    })}
                </div>
            </div>
        </div>
      {/* <Sidebar features={features} events={events}/>
      <h2>
        Events Page
        {priceRange}
      </h2> */}
    </div>
  )
}

export default EventsPage
