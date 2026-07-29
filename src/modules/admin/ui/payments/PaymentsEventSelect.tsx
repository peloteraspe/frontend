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
  state: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'reimbursements';
  q: string;
};

export default function PaymentsEventSelect({ options, selectedEventId, state, q }: Props) {
  const router = useRouter();
  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(null);
  const selectOptions = [
    { value: '', label: 'Todos los eventos' },
    ...options.map((option) => ({
      value: option.id,
      label: option.label,
    })),
  ];

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
    <div className="w-full min-w-0 sm:min-w-[280px]">
      <SelectComponent
        options={selectOptions}
        value={selectedEventId}
        onChange={(value) => handleEventChange(String(value || ''))}
        isSearchable
        className="text-sm"
        selectProps={{
          isDisabled: options.length === 0,
          placeholder: options.length === 0 ? 'No hay eventos disponibles' : 'Todos los eventos',
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
