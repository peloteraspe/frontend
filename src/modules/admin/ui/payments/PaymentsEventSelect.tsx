'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SelectComponent from '@core/ui/SelectComponent';

type EventOption = {
  id: string;
  label: string;
};

type Props = {
  options: EventOption[];
  selectedEventId: string;
  state: 'pending' | 'approved' | 'rejected';
  q: string;
};

export default function PaymentsEventSelect({ options, selectedEventId, state, q }: Props) {
  const router = useRouter();
  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMenuPortalTarget(document.body);
  }, []);

  function handleEventChange(nextEventId: string) {
    const params = new URLSearchParams();
    if (nextEventId) params.set('event', nextEventId);
    if (state) params.set('state', state);

    const search = String(q || '').trim();
    if (search) params.set('q', search);

    const query = params.toString();
    router.push(query ? `/admin/payments?${query}` : '/admin/payments');
  }

  return (
    <div className="min-w-[280px]">
      <SelectComponent
        options={options.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        value={selectedEventId}
        onChange={(value) => handleEventChange(String(value || ''))}
        isSearchable={false}
        className="text-sm"
        selectProps={{
          isDisabled: options.length === 0,
          placeholder: options.length === 0 ? 'No hay eventos disponibles' : 'Selecciona un evento',
          instanceId: 'payments-event-select',
          inputId: 'payments-event-select',
          menuPortalTarget: menuPortalTarget || undefined,
          menuPosition: 'fixed',
          menuShouldScrollIntoView: false,
        }}
      />
    </div>
  );
}
