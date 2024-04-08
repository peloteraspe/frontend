'use client';
import { FC, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';
import {  ButtonM, ParagraphM, ParagraphS } from '../../atoms/Typography';
import Link from 'next/link';

interface SidebarProps {
  typeEvents?: any[],
  levels?: any[], 
  events: any[], 
  features: any[]
}

interface Option {
  value: string;
  label: string;
}

const priceRanges: Option[] = [
  { value: '5-10', label: '5-10'},
  { value: '<15', label: '<15'},
  { value: '<20', label: '<20'},
];

const Sidebar:FC<SidebarProps> = ({
  features, 
  events
}) => {

  const searchParams = useSearchParams();
  const router = useRouter()
  const pathname = usePathname();
  const priceRangeParam = searchParams?.get("priceRange")

  

    // Create query string
    const createQueryString = useCallback(
      (params: Record<string, string | number | null>) => {
        const newSearchParams = new URLSearchParams(searchParams?.toString())
  
        for (const [key, value] of Object.entries(params)) {
          if (value === null) {
            newSearchParams.delete(key)
          } else {
            newSearchParams.set(key, String(value))
          }
        }
  
        return newSearchParams.toString()
      },
      [searchParams]
    )

  // priceRange filter
  const [selectedPriceRange, setSelectedPriceRange] = useState<{priceRange: string[]}>({
    priceRange:[]
  });

  useEffect(() => {
    const newQueryString = createQueryString({
      priceRange: selectedPriceRange.priceRange?.length ? selectedPriceRange.priceRange.join(',') : null,
    });

    router.push(`${pathname}?${newQueryString}`, {
      scroll: false,
    });
  }, [selectedPriceRange]);



  // filter location
  const [selectedValue, setSelectedValue] = useState<OptionSelect | null>();
  useEffect(() => {
    const newQueryString = createQueryString({
      location: selectedValue ? selectedValue.value : null,
    })

    router.push(`${pathname}?${newQueryString}`, {
      scroll: false,
    });
  }, [selectedValue, router]);

  
  useEffect(() => {
    const uncheckCheckboxes = () => {
       const urlSearchParams = new URLSearchParams(searchParams.toString());
        const priceRangeParam = urlSearchParams.get('priceRange');
        if (priceRangeParam) {
            const priceRangeValues = priceRangeParam.split(',');
            setSelectedPriceRange({ priceRange: priceRangeValues });
        } else {
          setSelectedPriceRange({ priceRange: [] });
        } 
    };

    window.addEventListener('popstate', uncheckCheckboxes);
    uncheckCheckboxes();

    return () => {
      
      window.removeEventListener('popstate', uncheckCheckboxes);
    };
}, [searchParams, setSelectedPriceRange]);

useEffect(() => {
  const urlSearchParams = new URLSearchParams(searchParams.toString());
  const locationParam = urlSearchParams.get('location');
  if (locationParam) {
      const selected = events.find(event => event.id === Number(locationParam));
      if (selected) {
          if (!selectedValue || selectedValue.value !== selected.id) {
            setSelectedValue({ value: selected.id, label: selected.district });
          }
      }
  } else {
    setSelectedValue(null);
  }

}, [searchParams, events, setSelectedValue]);



  const handlePriceRangeChange = (value: string) => {
    setSelectedPriceRange((prevFilters) => ({
      ...prevFilters,
      priceRange: prevFilters.priceRange.includes(value) 
      ? prevFilters.priceRange.filter((price) => price !== value) 
      : [...prevFilters.priceRange, value],
    }));
  };


  return (
    <aside className="mb-8 md:mb-0 md:w-80 lg:w-92 md:ml-12 lg:ml-20 md:shrink-0 md:order-1">
      <div
        data-sticky=""
        data-margin-top="32"
        data-sticky-for="768"
        data-sticky-wrap=""
      >
        <div className="relative bg-gray-50 rounded-xl border border-gray-200 p-5">
          <div className="absolute top-5 right-5 leading-none">
          <button className="hover:underline text-clear" onClick={() => {router.push(`${pathname}`)}}>
              <ButtonM color='text-clear'>Limpiar filtros</ButtonM>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-6">
            <div>
              <div className="mb-2">
                <ParagraphM fontWeight="bold">
                  Tipo de evento
                </ParagraphM>
              </div>
              <ul className="space-y-2">
                <li>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-clear h-5 w-5 border-2 border-gray-400 rounded"
                    />
                    <span className="font-poppins text-base text-gray-600 ml-2">
                      Pinchanga libre
                    </span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-clear h-5 w-5 border-2 border-gray-400 rounded"
                    />
                    <span className="font-poppins text-base text-gray-600 ml-2">
                       Versus de equipos
                    </span>
                  </label>
                </li>
              </ul>
            </div>

            <div>
              <div className="mb-2">
                <ParagraphM fontWeight="semibold">
                  Nivel
                </ParagraphM>
              </div>
              <ul className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="price"
                    className="form-checkbox text-clear h-5 w-5 border-2 border-gray-400 rounded"
                    />
                      <span className="font-poppins text-base text-gray-600 ml-2">
                        Sin experiencia
                      </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="price"
                    className="form-checkbox text-clear h-5 w-5 border-2 border-gray-400 rounded"
                    />
                      <span className="font-poppins text-base text-gray-600 ml-2">
                        Intermedio
                      </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="price"
                    className="form-checkbox text-clear h-5 w-5 border-2 border-gray-400 rounded"
                    />
                      <span className="font-poppins text-base text-gray-600 ml-2">
                        Avanzado
                      </span>
                </label>
              </ul>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-base font-poppins font-semibold">
                  <label className="w-full">
                    <ParagraphM fontWeight="semibold">
                      Ubicación
                    </ParagraphM>
                  </label>
                </div>
                <div className='px-1 ml-2'>
                  <ParagraphS fontWeight="bold" color="text-mulberry" underline>
                    <Link href={`/partidos/${selectedValue?.value}`}>
                      Mi ubicación
                    </Link>
                  </ParagraphS>
                </div>
              </div>
              <div className="mt-2">
                <SelectComponent
                  options={events.map(event => ({ 
                    value: event.id, 
                    label: event.district
                  }))}
                  value={selectedValue}
                  onChange={(selected: any) => setSelectedValue(selected)}
                />
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <ParagraphM fontWeight="semibold">
                  Costo
                </ParagraphM>
              </div>
              <ul className="space-y-2">
              {priceRanges.map((priceRange) => (
                <li key={priceRange.value}>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="price"
                      className="form-checkbox text-clear h-5 w-5 border-2 border-gray-400 rounded"
                      value={priceRange.value}
                      checked={selectedPriceRange.priceRange.includes(priceRange.value)}
                      onChange={() => handlePriceRangeChange(priceRange.value)}
                    />
                    <span className="font-poppins text-base text-gray-600 ml-2">
                      {priceRange.label}
                    </span>
                  </label>
                </li>
              ))}
              </ul>
            </div>

            <div>
              <div className="mb-4">
                <ParagraphM fontWeight="semibold">
                  Extras
                </ParagraphM>
              </div>
              <ul className="space-y-2">
                {features.map((feature)=>(
                  <li key={feature.id}>
                    <div className="center relative inline-block  rounded-lg bg-[#8a5d94] bg-opacity-20 py-2 px-2 text-mulberry uppercase">
                      <ParagraphM fontWeight="semibold" color="text-[#54086F]">
                        {feature.name}
                      </ParagraphM>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar
