'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EventShareModal from '@modules/admin/ui/events/EventShareModal';

type Props = {
  eventId: string | number;
  eventTitle?: string;
  buttonClassName?: string;
  onOpen?: () => void;
};

const ADMIN_EVENTS_PATH = '/admin/events';

export default function EventShareActionButton({
  eventId,
  eventTitle,
  buttonClassName,
  onOpen,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    setShareUrl(`${window.location.origin}/events/${eventId}`);
  }, [eventId, open]);

  function handleOpen() {
    onOpen?.();
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    router.push(ADMIN_EVENTS_PATH);
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName || 'text-mulberry hover:underline'}
        onClick={handleOpen}
      >
        Compartir
      </button>

      <EventShareModal
        isOpen={open}
        status="success"
        message="Comparte este evento para que nuevas jugadoras se inscriban."
        eventTitle={eventTitle || 'Evento'}
        shareUrl={shareUrl}
        onClose={handleClose}
      />
    </>
  );
}
