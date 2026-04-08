'use client';

import { startTransition, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerActivationModal from '@modules/events/ui/explorer/OrganizerActivationModal';
import { trackEvent } from '@shared/lib/analytics';

type Props = {
  initialPhone?: string;
  profileName?: string;
};

export default function CreateEventActivationGateway({
  initialPhone,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(true);
    trackEvent('create_event_entry_viewed', {
      channel: 'web',
      entry_state: 'activation_required',
      activated: false,
    });
  }, []);

  function handleClose() {
    setIsOpen(false);
    startTransition(() => {
      router.replace('/events');
    });
  }

  function handleActivated() {
    setIsOpen(false);
    startTransition(() => {
      router.replace('/admin/events/new');
    });
  }

  return (
    <>
      <div className="min-h-screen bg-white" aria-hidden="true" />
      <OrganizerActivationModal
        isOpen={isOpen}
        source="create_event_entry"
        initialPhone={initialPhone}
        onClose={handleClose}
        onActivated={handleActivated}
      />
    </>
  );
}
